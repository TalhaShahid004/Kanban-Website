// State management
const state = {
    categories: [],
    tasks: [],
    nextTaskId: 1,
    nextCategoryId: 1
};

// DOM Elements
const kanbanBoard = document.getElementById('kanbanBoard');
const taskModal = document.getElementById('taskModal');
const categoryModal = document.getElementById('categoryModal');
const taskTemplate = document.getElementById('taskTemplate');
const categoryTemplate = document.getElementById('categoryTemplate');

// Event Listeners
document.getElementById('addListBtn').addEventListener('click', addNewList);
document.getElementById('addCategoryBtn').addEventListener('click', showCategoryModal);
document.getElementById('saveTaskBtn').addEventListener('click', saveTask);
document.getElementById('cancelTaskBtn').addEventListener('click', () => taskModal.classList.remove('active'));
document.getElementById('saveCategoryBtn').addEventListener('click', saveCategory);
document.getElementById('cancelCategoryBtn').addEventListener('click', () => categoryModal.classList.remove('active'));

document.querySelectorAll('.add-task-btn').forEach(btn => {
    btn.addEventListener('click', (e) => showTaskModal(e.target.closest('.list').dataset.listId));
});

// Drag and Drop Functions
function allowDrop(e) {
    e.preventDefault();
    e.target.closest('.list-content').classList.add('drag-over');
}

function drag(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
    e.target.classList.add('dragging');
}

function dragLeave(e) {
    e.target.closest('.list-content').classList.remove('drag-over');
}

function dragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.list-content').forEach(list => {
        list.classList.remove('drag-over');
    });
}

function drop(e) {
    e.preventDefault();
    const listContent = e.target.closest('.list-content');
    listContent.classList.remove('drag-over');
    
    const taskId = e.dataTransfer.getData('text/plain');
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    const newList = listContent.closest('.list').dataset.listId;
    
    // Update task's list in state
    const task = state.tasks.find(t => t.id === parseInt(taskId));
    if (task) {
        task.listId = newList;
        listContent.appendChild(taskElement);
        saveToLocalStorage();
    }
}

// Task Functions
function createTask(title, listId, categories = []) {
    const task = {
        id: state.nextTaskId++,
        title,
        listId,
        categories
    };
    
    state.tasks.push(task);
    renderTask(task);
    saveToLocalStorage();
}

function renderTask(task) {
    const clone = taskTemplate.content.cloneNode(true);
    const taskElement = clone.querySelector('.task');
    
    taskElement.dataset.taskId = task.id;
    taskElement.querySelector('.task-title').textContent = task.title;
    
    // Add drag and drop listeners
    taskElement.addEventListener('dragstart', drag);
    taskElement.addEventListener('dragend', dragEnd);
    
    // Add edit and delete listeners
    taskElement.querySelector('.edit-task-btn').addEventListener('click', () => editTask(task.id));
    taskElement.querySelector('.delete-task-btn').addEventListener('click', () => deleteTask(task.id));
    
    // Render categories
    const categoriesContainer = taskElement.querySelector('.task-categories');
    task.categories.forEach(catId => {
        const category = findCategory(catId);
        if (category) {
            renderCategoryChip(category, categoriesContainer);
        }
    });
    
    const listContent = document.querySelector(`[data-list-id="${task.listId}"] .list-content`);
    listContent.appendChild(taskElement);
}

function editTask(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
        document.getElementById('taskTitle').value = task.title;
        showTaskModal(task.listId, taskId);
    }
}

function deleteTask(taskId) {
    const index = state.tasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
        state.tasks.splice(index, 1);
        document.querySelector(`[data-task-id="${taskId}"]`).remove();
        saveToLocalStorage();
    }
}

// Category Functions
function createCategory(name, color, parentId = null) {
    const category = {
        id: state.nextCategoryId++,
        name,
        color,
        parentId
    };
    
    state.categories.push(category);
    updateCategorySelector();
    saveToLocalStorage();
    return category;
}

function findCategory(id) {
    return state.categories.find(c => c.id === id);
}

function renderCategoryChip(category, container) {
    const chip = document.createElement('div');
    chip.className = 'category';
    chip.style.backgroundColor = category.color + '20'; // Add transparency
    chip.style.borderColor = category.color;
    chip.style.color = category.color;
    
    const name = document.createElement('span');
    name.className = 'category-name';
    name.textContent = category.name;
    chip.appendChild(name);
    
    container.appendChild(chip);
}

function getCategoryPath(category) {
    const path = [category];
    let current = category;
    
    while (current.parentId) {
        const parent = findCategory(current.parentId);
        if (parent) {
            path.unshift(parent);
            current = parent;
        } else {
            break;
        }
    }
    
    return path;
}

function updateCategorySelector() {
    const selector = document.getElementById('categorySelector');
    selector.innerHTML = '';
    
    function addCategoryToSelector(category, level = 0) {
        const div = document.createElement('div');
        div.className = 'category-option';
        div.style.marginLeft = `${level * 20}px`;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = category.id;
        checkbox.id = `cat-${category.id}`;
        
        const label = document.createElement('label');
        label.htmlFor = `cat-${category.id}`;
        label.textContent = category.name;
        label.style.color = category.color;
        
        div.appendChild(checkbox);
        div.appendChild(label);
        selector.appendChild(div);
        
        // Add subcategories
        const subcategories = state.categories.filter(c => c.parentId === category.id);
        subcategories.forEach(sub => addCategoryToSelector(sub, level + 1));
    }
    
    // Add root categories first
    const rootCategories = state.categories.filter(c => !c.parentId);
    rootCategories.forEach(cat => addCategoryToSelector(cat));
}

// Modal Functions
function showTaskModal(listId, taskId = null) {
    const modal = document.getElementById('taskModal');
    modal.classList.add('active');
    modal.dataset.listId = listId;
    if (taskId) {
        modal.dataset.taskId = taskId;
        // Pre-select categories if editing
        const task = state.tasks.find(t => t.id === parseInt(taskId));
        if (task) {
            task.categories.forEach(catId => {
                const checkbox = document.querySelector(`#cat-${catId}`);
                if (checkbox) checkbox.checked = true;
            });
        }
    } else {
        delete modal.dataset.taskId;
    }
}

function showCategoryModal(parentId = null) {
    const modal = document.getElementById('categoryModal');
    modal.classList.add('active');
    if (parentId) {
        modal.dataset.parentId = parentId;
    } else {
        delete modal.dataset.parentId;
    }
    
    // Reset color picker to a random color
    document.getElementById('categoryColor').value = '#' + Math.floor(Math.random()*16777215).toString(16);
}

function saveTask() {
    const modal = document.getElementById('taskModal');
    const title = document.getElementById('taskTitle').value.trim();
    const listId = modal.dataset.listId;
    const taskId = modal.dataset.taskId;
    
    if (!title) return;
    
    // Get selected categories
    const selectedCategories = Array.from(document.querySelectorAll('#categorySelector input:checked'))
        .map(checkbox => parseInt(checkbox.value));
    
    if (taskId) {
        // Edit existing task
        const task = state.tasks.find(t => t.id === parseInt(taskId));
        if (task) {
            task.title = title;
            task.categories = selectedCategories;
            const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
            taskElement.querySelector('.task-title').textContent = title;
            taskElement.querySelector('.task-categories').innerHTML = '';
            selectedCategories.forEach(catId => {
                const category = findCategory(catId);
                if (category) {
                    renderCategoryChip(category, taskElement.querySelector('.task-categories'));
                }
            });
        }
    } else {
        // Create new task
        createTask(title, listId, selectedCategories);
    }
    
    closeTaskModal();
    saveToLocalStorage();
}

function saveCategory() {
    const name = document.getElementById('categoryName').value.trim();
    const color = document.getElementById('categoryColor').value;
    const modal = document.getElementById('categoryModal');
    const parentId = modal.dataset.parentId ? parseInt(modal.dataset.parentId) : null;
    
    if (!name) return;
    
    createCategory(name, color, parentId);
    closeCategoryModal();
}

function closeTaskModal() {
    const modal = document.getElementById('taskModal');
    modal.classList.remove('active');
    document.getElementById('taskTitle').value = '';
    document.querySelectorAll('#categorySelector input:checked').forEach(checkbox => {
        checkbox.checked = false;
    });
}

function closeCategoryModal() {
    const modal = document.getElementById('categoryModal');
    modal.classList.remove('active');
    document.getElementById('categoryName').value = '';
}

// List Functions
function addNewList() {
    const listId = 'list-' + Date.now();
    const listHtml = `
        <div class="list" data-list-id="${listId}">
            <div class="list-header">
                <h2>New List</h2>
                <button class="add-task-btn">+</button>
            </div>
            <div class="list-content" ondrop="drop(event)" ondragover="allowDrop(event)"></div>
        </div>
    `;
    
    kanbanBoard.insertAdjacentHTML('beforeend', listHtml);
    const newList = kanbanBoard.lastElementChild;
    newList.querySelector('.add-task-btn').addEventListener('click', (e) => {
        showTaskModal(listId);
    });
}

// Storage Functions
function saveToLocalStorage() {
    localStorage.setItem('kanbanState', JSON.stringify(state));
}

function loadFromLocalStorage() {
    const savedState = localStorage.getItem('kanbanState');
    if (savedState) {
        Object.assign(state, JSON.parse(savedState));
        
        // Render existing tasks
        state.tasks.forEach(task => renderTask(task));
        
        // Update category selector
        updateCategorySelector();
    }
}

// Initialize
loadFromLocalStorage();