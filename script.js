// State management
const state = {
    categories: [],
    tasks: [],
    lists: [],
    nextTaskId: 1,
    nextCategoryId: 1,
    activeFilters: new Set()
};

// DOM Elements
const kanbanBoard = document.getElementById('kanbanBoard');
const taskModal = document.getElementById('taskModal');
const categoryModal = document.getElementById('categoryModal');
const taskTemplate = document.getElementById('taskTemplate');
const categoryTemplate = document.getElementById('categoryTemplate');

// Move all event listeners to a function
function setupEventListeners() {
    // Category and Filter Management
    document.getElementById('categoryManagerBtn')?.addEventListener('click', showCategoryManager);
    document.getElementById('filterBtn')?.addEventListener('click', showFilterModal);

    // Task Modal
    document.getElementById('saveTaskBtn')?.addEventListener('click', saveTask);
    document.getElementById('cancelTaskBtn')?.addEventListener('click', closeTaskModal);

    // Category Management
    document.getElementById('addRootCategoryBtn')?.addEventListener('click', () => showCategoryForm(null));
    document.getElementById('saveCategoryBtn')?.addEventListener('click', saveNewCategory);
    document.getElementById('cancelCategoryBtn')?.addEventListener('click', hideCategoryForm);

    // Filter Modal
    document.getElementById('applyFiltersBtn')?.addEventListener('click', applyFilters);
    document.getElementById('clearFiltersBtn')?.addEventListener('click', clearFilters);
    document.getElementById('closeFiltersBtn')?.addEventListener('click', closeFilterModal);

    // Add task buttons
    document.querySelectorAll('.add-task-btn').forEach(btn => {
        btn.addEventListener('click', (e) => showTaskModal(e.target.closest('.list').dataset.listId));
    });
}
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
function createTask(title, description, listId, categories = []) {
    const task = {
        id: state.nextTaskId++,
        title,
        description,
        listId,
        categories,
        createdAt: new Date().toISOString()
    };

    state.tasks.push(task);
    renderTask(task);
    saveToLocalStorage();
}

function renderTask(task) {
    const clone = taskTemplate.content.cloneNode(true);
    const taskElement = clone.querySelector('.task');

    taskElement.dataset.taskId = task.id;
    taskElement.innerHTML = `
        <div class="task-header">
            <span class="task-title">${task.title}</span>
            <div class="task-actions">
                <button class="btn icon edit-task-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <button class="btn icon delete-task-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M6 6l12 12M6 18L18 6" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
        </div>
        <div class="task-description">${task.description || ''}</div>
        <div class="task-categories"></div>
    `;

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

function saveTask() {
    const modal = document.getElementById('taskModal');
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const listId = modal.dataset.listId;
    const taskId = modal.dataset.taskId;

    if (!title) return;

    const selectedCategories = Array.from(document.querySelectorAll('#categorySelector input:checked'))
        .map(checkbox => parseInt(checkbox.value));

    if (taskId) {
        // Edit existing task
        const task = state.tasks.find(t => t.id === parseInt(taskId));
        if (task) {
            task.title = title;
            task.description = description;
            task.categories = selectedCategories;
            
            const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
            taskElement.querySelector('.task-title').textContent = title;
            taskElement.querySelector('.task-description').textContent = description;
            
            const categoriesContainer = taskElement.querySelector('.task-categories');
            categoriesContainer.innerHTML = '';
            selectedCategories.forEach(catId => {
                const category = findCategory(catId);
                if (category) {
                    renderCategoryChip(category, categoriesContainer);
                }
            });
        }
    } else {
        // Create new task
        createTask(title, description, listId, selectedCategories);
    }

    closeTaskModal();
    saveToLocalStorage();
}

// Core Category Functions (move these to the top of the file, after state management)
function findCategory(id) {
    return state.categories.find(c => c.id === parseInt(id));
}

function renderCategoryChip(category, container) {
    const chip = document.createElement('div');
    chip.className = 'category';
    chip.style.backgroundColor = `${category.color}20`;
    chip.style.color = category.color;
    chip.style.borderColor = category.color;

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


function showCategoryManager() {
    const modal = document.getElementById('categoryModal');
    modal.classList.add('active');
    renderCategoryTree();
}

function showCategoryForm(parentId = null) {
    const form = document.getElementById('categoryForm');
    form.style.display = 'block';
    form.dataset.parentId = parentId || '';
    document.getElementById('categoryName').value = '';
    document.getElementById('categoryColor').value = '#' + Math.floor(Math.random()*16777215).toString(16);
}

function hideCategoryForm() {
    const form = document.getElementById('categoryForm');
    form.style.display = 'none';
    form.dataset.parentId = '';
}

function saveNewCategory() {
    const name = document.getElementById('categoryName').value.trim();
    const color = document.getElementById('categoryColor').value;
    const form = document.getElementById('categoryForm');
    const parentId = form.dataset.parentId ? parseInt(form.dataset.parentId) : null;

    if (!name) return;

    createCategory(name, color, parentId);
    hideCategoryForm();
}

function deleteCategory(categoryId) {
    const category = findCategory(categoryId);
    if (!category) return;

    // Recursively delete all subcategories
    if (category.children) {
        category.children.forEach(childId => deleteCategory(childId));
    }

    // Remove from parent's children array
    if (category.parentId) {
        const parent = findCategory(category.parentId);
        if (parent && parent.children) {
            parent.children = parent.children.filter(id => id !== categoryId);
        }
    }

    // Remove from state
    state.categories = state.categories.filter(c => c.id !== categoryId);
    
    // Update UI
    renderCategoryTree();
    saveToLocalStorage();
}

function showFilterModal() {
    const modal = document.getElementById('filterModal');
    modal.classList.add('active');
    renderFilterTree();
}

function renderFilterTree() {
    const filterTree = document.getElementById('filterTree');
    filterTree.innerHTML = '';

    function buildFilterNode(category) {
        const node = document.createElement('div');
        node.className = 'category-tree-item';
        node.style.paddingLeft = `${category.level * 20}px`;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = state.activeFilters.has(category.id);
        checkbox.className = 'category-filter-checkbox';
        checkbox.dataset.categoryId = category.id;

        const label = document.createElement('label');
        label.textContent = category.name;
        label.style.color = category.color;

        node.appendChild(checkbox);
        node.appendChild(label);

        if (category.children && category.children.length > 0) {
            const childContainer = document.createElement('div');
            childContainer.className = 'category-children';
            category.children.forEach(childId => {
                const child = findCategory(childId);
                if (child) {
                    childContainer.appendChild(buildFilterNode(child));
                }
            });
            node.appendChild(childContainer);
        }

        return node;
    }

    const rootCategories = state.categories.filter(c => !c.parentId);
    rootCategories.forEach(category => {
        filterTree.appendChild(buildFilterNode(category));
    });
}

function applyFilters() {
    state.activeFilters.clear();
    document.querySelectorAll('.category-filter-checkbox:checked').forEach(checkbox => {
        state.activeFilters.add(parseInt(checkbox.dataset.categoryId));
    });
    filterTasks();
    closeFilterModal();
}

function clearFilters() {
    state.activeFilters.clear();
    document.querySelectorAll('.category-filter-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    filterTasks();
}

function closeFilterModal() {
    document.getElementById('filterModal').classList.remove('active');
}

function filterTasks() {
    document.querySelectorAll('.task').forEach(taskEl => {
        const taskId = parseInt(taskEl.dataset.taskId);
        const task = state.tasks.find(t => t.id === taskId);
        
        if (state.activeFilters.size === 0 || 
            task.categories.some(catId => state.activeFilters.has(catId))) {
            taskEl.style.display = '';
        } else {
            taskEl.style.display = 'none';
        }
    });
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
// Updated Category Functions
function createCategory(name, color, parentId = null) {
    const category = {
        id: state.nextCategoryId++,
        name,
        color,
        parentId,
        children: [],
        level: 0
    };

    if (parentId) {
        const parent = findCategory(parentId);
        if (parent) {
            category.level = parent.level + 1;
            if (!parent.children) parent.children = [];
            parent.children.push(category.id);
        }
    }

    state.categories.push(category);
    renderCategoryTree();
    saveToLocalStorage();
    return category;
}

function renderCategoryTree() {
    const categoryTree = document.getElementById('categoryTree');
    if (!categoryTree) return;
    categoryTree.innerHTML = '';

    function buildCategoryNode(category) {
        const node = document.createElement('div');
        node.className = 'category-tree-item';
        node.style.paddingLeft = `${category.level * 20}px`;

        const content = document.createElement('div');
        content.className = 'category-content';
        content.innerHTML = `
            <span class="category-name" style="color: ${category.color}">${category.name}</span>
            <div class="category-actions">
                <button class="btn icon add-subcategory-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
                <button class="btn icon delete-category-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M6 6l12 12M6 18L18 6" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
        `;

        node.appendChild(content);
        
        const childContainer = document.createElement('div');
        childContainer.className = 'category-children';
        
        if (category.children && category.children.length > 0) {
            category.children.forEach(childId => {
                const child = findCategory(childId);
                if (child) {
                    childContainer.appendChild(buildCategoryNode(child));
                }
            });
            node.appendChild(childContainer);
        }

        // Event listeners
        node.querySelector('.add-subcategory-btn').addEventListener('click', () => {
            showCategoryForm(category.id);
        });
        
        node.querySelector('.delete-category-btn').addEventListener('click', () => {
            deleteCategory(category.id);
        });

        return node;
    }

    const rootCategories = state.categories.filter(c => !c.parentId);
    rootCategories.forEach(category => {
        categoryTree.appendChild(buildCategoryNode(category));
    });
}

function updateCategorySelector() {
    const selector = document.getElementById('categorySelector');
    selector.innerHTML = '';

    function renderCategoryTree(category, level = 0) {
        if (!category) return null;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'category-tree-item';
        wrapper.style.paddingLeft = `${level * 20}px`;
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `cat-${category.id}`;
        checkbox.value = category.id;

        const label = document.createElement('label');
        label.htmlFor = `cat-${category.id}`;
        label.textContent = category.name;
        label.style.color = category.color;

        const addSubCatBtn = document.createElement('button');
        addSubCatBtn.className = 'btn icon';
        addSubCatBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round"/></svg>';
        addSubCatBtn.addEventListener('click', () => showCategoryModal(category.id));

        categoryItem.appendChild(checkbox);
        categoryItem.appendChild(label);
        categoryItem.appendChild(addSubCatBtn);
        wrapper.appendChild(categoryItem);

        // Render children
        if (category.children.length > 0) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'category-children';
            category.children.forEach(childId => {
                const child = findCategory(childId);
                if (child) {
                    childrenContainer.appendChild(renderCategoryTree(child, level + 1));
                }
            });
            wrapper.appendChild(childrenContainer);
        }

        return wrapper;
    }

    // Render root categories
    const rootCategories = state.categories.filter(c => !c.parentId);
    rootCategories.forEach(category => {
        selector.appendChild(renderCategoryTree(category));
    });
}

function updateCategoryFilters() {
    const filtersContainer = document.getElementById('categoryFilters');
    filtersContainer.innerHTML = '';

    state.categories.forEach(category => {
        const chip = document.createElement('div');
        chip.className = 'category-filter';
        chip.style.backgroundColor = category.color + '20';
        chip.style.borderColor = category.color;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `filter-${category.id}`;
        checkbox.addEventListener('change', filterTasks);

        const label = document.createElement('label');
        label.htmlFor = `filter-${category.id}`;
        label.textContent = category.name;

        chip.appendChild(checkbox);
        chip.appendChild(label);
        filtersContainer.appendChild(chip);
    });
}

function filterTasks() {
    const selectedFilters = Array.from(document.querySelectorAll('.category-filter input:checked'))
        .map(cb => parseInt(cb.id.replace('filter-', '')));

    document.querySelectorAll('.task').forEach(taskEl => {
        const taskId = parseInt(taskEl.dataset.taskId);
        const task = state.tasks.find(t => t.id === taskId);

        if (selectedFilters.length === 0 ||
            selectedFilters.some(filterId => task.categories.includes(filterId))) {
            taskEl.style.display = '';
        } else {
            taskEl.style.display = 'none';
        }
    });
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
    document.getElementById('categoryColor').value = '#' + Math.floor(Math.random() * 16777215).toString(16);
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
    const title = 'New List';
    createList(title);
    addNewListButton(); // Re-add the "+" button
}

function addNewListButton() {
    // Remove existing add button if present
    const existingButton = document.querySelector('.add-list-button');
    if (existingButton) existingButton.remove();

    const addButton = document.createElement('div');
    addButton.className = 'add-list-button';
    addButton.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round"/>
        </svg>
    `;
    addButton.addEventListener('click', addNewList);
    kanbanBoard.appendChild(addButton);
}

// Storage Functions
function saveToLocalStorage() {
    localStorage.setItem('kanbanState', JSON.stringify(state));
}
function loadFromLocalStorage() {
    const savedState = localStorage.getItem('kanbanState');
    if (savedState) {
        const parsedState = JSON.parse(savedState);
        
        // Ensure all categories have a children array
        if (parsedState.categories) {
            parsedState.categories.forEach(cat => {
                if (!cat.children) {
                    cat.children = [];
                }
            });
        }
        
        Object.assign(state, parsedState);
        
        // Clear existing lists
        kanbanBoard.innerHTML = '';
        
        // Render lists
        state.lists.forEach(list => renderList(list));
        
        // Render existing tasks
        state.tasks.forEach(task => renderTask(task));
        
        // Update category selector and filters
        updateCategorySelector();
        updateCategoryFilters();
    }
}


function createList(title = 'New List') {
    const listId = 'list-' + Date.now();
    const list = {
        id: listId,
        title: title
    };

    state.lists.push(list);
    renderList(list);
    saveToLocalStorage();
    return list;
}

function renderList(list) {
    // Remove the add button if it exists
    const existingButton = document.querySelector('.add-list-button');
    if (existingButton) existingButton.remove();

    const listElement = document.createElement('div');
    listElement.className = 'list';
    listElement.dataset.listId = list.id;
    listElement.innerHTML = `
        <div class="list-header">
            <div class="list-title">
                <h2 contenteditable="true">${list.title}</h2>
                <div class="list-actions">
                    <button class="btn icon delete-list-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            </div>
            <button class="btn icon add-task-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </button>
        </div>
        <div class="list-content" ondrop="drop(event)" ondragover="allowDrop(event)" ondragleave="dragLeave(event)"></div>
    `;

    // Add event listeners
    const titleElement = listElement.querySelector('h2[contenteditable]');
    titleElement.addEventListener('blur', () => updateListTitle(list.id, titleElement.textContent));
    titleElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            titleElement.blur();
        }
    });

    listElement.querySelector('.delete-list-btn').addEventListener('click', () => deleteList(list.id));
    listElement.querySelector('.add-task-btn').addEventListener('click', () => showTaskModal(list.id));

    kanbanBoard.appendChild(listElement);
    addNewListButton(); // Add the "+" button after the new list
}


function updateListTitle(listId, newTitle) {
    const list = state.lists.find(l => l.id === listId);
    if (list) {
        list.title = newTitle.trim();
        saveToLocalStorage();
    }
}

function deleteList(listId) {
    const confirmDelete = confirm('Are you sure you want to delete this list and all its tasks?');
    if (!confirmDelete) return;

    // Remove tasks in this list
    state.tasks = state.tasks.filter(task => task.listId !== listId);

    // Remove list from state
    const listIndex = state.lists.findIndex(l => l.id === listId);
    if (listIndex !== -1) {
        state.lists.splice(listIndex, 1);
    }

    // Remove from DOM
    document.querySelector(`[data-list-id="${listId}"]`).remove();
    saveToLocalStorage();
}

// Initialize board function
function initializeBoard() {
    loadFromLocalStorage();

    // Create default lists if no lists exist
    if (state.lists.length === 0) {
        ['Todo', 'Doing', 'Done'].forEach(title => createList(title));
    }

    // Add the new list button
    addNewListButton();

    // Update UI
    updateCategorySelector();
    updateCategoryFilters();
    
    // Setup event listeners after DOM is ready
    setupEventListeners();
}



// Add clear filters button handler
document.getElementById('clearFilters').addEventListener('click', () => {
    document.querySelectorAll('.category-filter input').forEach(cb => cb.checked = false);
    filterTasks();
});

// Start the application
initializeBoard();