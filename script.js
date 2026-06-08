import { todoFarmDb } from './db.js';

const state = {
  tasks: [],
  day: 1,
  xp: 0,
  coins: 6,
  selectedBuilding: null,
  character: '🛡️',
  characterName: 'Brave Knight',
};

const timeSlots = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'];
const buildingIcons = {
  Farm: '🌾',
  Greenhouse: '🌱',
  Workshop: '🔧',
  Market: '🛒',
  'Town Hall': '🏛️',
};

const elements = {
  todoColumn: document.getElementById('todoColumn'),
  progressColumn: document.getElementById('progressColumn'),
  doneColumn: document.getElementById('doneColumn'),
  timeBlocks: document.getElementById('timeBlocks'),
  farmHealth: document.getElementById('farmHealth'),
  townHappiness: document.getElementById('townHappiness'),
  toolCount: document.getElementById('toolCount'),
  equipmentCount: document.getElementById('equipmentCount'),
  questSummary: document.getElementById('questSummary'),
  xpCount: document.getElementById('xpCount'),
  goldCount: document.getElementById('goldCount'),
  dayCount: document.getElementById('dayCount'),
  levelCount: document.getElementById('levelCount'),
  questBars: document.getElementById('questBars'),
  taskModal: document.getElementById('taskModal'),
  taskForm: document.getElementById('taskForm'),
  newTaskBtn: document.getElementById('newTaskBtn'),
  closeModal: document.getElementById('closeModal'),
  cancelModal: document.getElementById('cancelModal'),
  dayAdvanceBtn: document.getElementById('dayAdvanceBtn'),
  changeCharBtn: document.getElementById('changeCharBtn'),
  characterModal: document.getElementById('characterModal'),
  closeCharModal: document.getElementById('closeCharModal'),
  charNameInput: document.getElementById('charNameInput'),
  confirmCharBtn: document.getElementById('confirmCharBtn'),
  playerAvatar: document.getElementById('playerAvatar'),
  playerName: document.getElementById('playerName'),
  mapCards: {
    Farm: document.getElementById('buildingFarm'),
    Greenhouse: document.getElementById('buildingGreenhouse'),
    Workshop: document.getElementById('buildingWorkshop'),
    Market: document.getElementById('buildingMarket'),
    'Town Hall': document.getElementById('buildingTownHall'),
  },
};

async function loadState() {
  await todoFarmDb.open();
  state.tasks = await todoFarmDb.getAllTasks();
  
  const savedMeta = await todoFarmDb.getMeta('appState');
  if (savedMeta) {
    state.day = savedMeta.day || state.day;
    state.xp = savedMeta.xp || state.xp;
    state.coins = savedMeta.coins || state.coins;
    state.selectedBuilding = savedMeta.selectedBuilding || null;
  }
  
  const savedCharacter = await todoFarmDb.getMeta('character');
  if (savedCharacter) {
    state.character = savedCharacter;
  }
  
  const savedCharacterName = await todoFarmDb.getMeta('characterName');
  if (savedCharacterName) {
    state.characterName = savedCharacterName;
  }
}

async function saveState() {
  await todoFarmDb.saveTasks(state.tasks);
  await todoFarmDb.saveMeta('appState', {
    day: state.day,
    xp: state.xp,
    coins: state.coins,
    selectedBuilding: state.selectedBuilding,
  });
  await todoFarmDb.saveMeta('character', state.character);
  await todoFarmDb.saveMeta('characterName', state.characterName);
}

function createTaskCard(task) {
  const card = document.createElement('div');
  card.className = 'task-card';
  card.dataset.id = task.id;
  card.draggable = true;

  card.addEventListener('dragstart', (event) => {
    card.classList.add('dragging');
    event.dataTransfer.setData('text/plain', task.id);
    event.dataTransfer.effectAllowed = 'move';
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
  });

  const badge = document.createElement('div');
  badge.className = 'task-badge';
  badge.textContent = task.building;

  const title = document.createElement('h3');
  title.className = 'task-title';
  title.textContent = task.title;

  const meta = document.createElement('div');
  meta.className = 'task-meta';
  const overdue = task.daysOverdue > 0 ? ` • ${task.daysOverdue}d late` : '';
  meta.innerHTML = `<span>${buildingIcons[task.building] || '📍'} ${task.building}${overdue}</span><span>${task.time}</span>`;

  const desc = document.createElement('p');
  desc.style.margin = '0.5rem 0 0';
  desc.style.color = '#c9b89a';
  desc.textContent = task.description || 'No description yet.';

  const actions = document.createElement('div');
  actions.className = 'task-actions';

  const primaryButton = document.createElement('button');
  primaryButton.className = 'task-button';
  const secondaryButton = document.createElement('button');
  secondaryButton.className = 'task-button secondary';

  if (task.status === 'todo') {
    primaryButton.textContent = 'Start';
    primaryButton.addEventListener('click', () => updateTaskStatus(task.id, 'in-progress'));
    secondaryButton.textContent = 'Delete';
    secondaryButton.addEventListener('click', () => deleteTask(task.id));
  } else if (task.status === 'in-progress') {
    primaryButton.textContent = 'Complete';
    primaryButton.addEventListener('click', () => updateTaskStatus(task.id, 'done'));
    secondaryButton.textContent = 'Back';
    secondaryButton.addEventListener('click', () => updateTaskStatus(task.id, 'todo'));
  } else {
    primaryButton.textContent = 'Reopen';
    primaryButton.addEventListener('click', () => updateTaskStatus(task.id, 'in-progress'));
    secondaryButton.textContent = 'Delete';
    secondaryButton.addEventListener('click', () => deleteTask(task.id));
  }

  actions.append(primaryButton, secondaryButton);
  card.append(badge, title, meta, desc, actions);
  return card;
}

async function updateTaskStatus(id, status) {
  const task = state.tasks.find((entry) => entry.id === id);
  if (!task) return;
  const prevStatus = task.status;
  task.status = status;
  if (prevStatus === 'in-progress' && status === 'done') {
    state.xp += 12;
    state.coins += 3;
  }
  if (status === 'todo') {
    task.daysOverdue = 0;
  }
  renderBoard();
  renderStats();
  renderQuestBars();
  renderTimeBlocks();
  saveState();
}

function deleteTask(id) {
  if (confirm('Delete this quest?')) {
    state.tasks = state.tasks.filter((t) => t.id !== id);
    renderBoard();
    renderQuestBars();
    renderTimeBlocks();
    saveState();
  }
}

function renderBoard() {
  elements.todoColumn.innerHTML = '';
  elements.progressColumn.innerHTML = '';
  elements.doneColumn.innerHTML = '';
  state.tasks
    .filter(
      (task) => !state.selectedBuilding || task.building === state.selectedBuilding
    )
    .forEach((task) => {
      const card = createTaskCard(task);
      if (task.status === 'todo') {
        elements.todoColumn.appendChild(card);
      } else if (task.status === 'in-progress') {
        elements.progressColumn.appendChild(card);
      } else {
        elements.doneColumn.appendChild(card);
      }
    });
  bindDragAndDrop();
}

function renderTimeBlocks() {
  elements.timeBlocks.innerHTML = '';
  timeSlots.forEach((time) => {
    const block = document.createElement('div');
    block.className = 'time-block';
    block.innerHTML = `<h4>${time}</h4>`;
    const tasksInSlot = state.tasks.filter((t) => t.time === time);
    const completed = tasksInSlot.filter((t) => t.status === 'done').length;
    const inProgress = tasksInSlot.filter((t) => t.status === 'in-progress').length;
    const total = tasksInSlot.length || 1;
    const completedPercent = (completed / total) * 100;
    const inProgressPercent = ((completed + inProgress) / total) * 100;
    
    const progressDiv = document.createElement('div');
    progressDiv.className = 'time-progress';
    
    // Create span for completed tasks
    const completedSpan = document.createElement('span');
    completedSpan.style.width = completedPercent + '%';
    completedSpan.style.background = 'linear-gradient(90deg, #10b981 0%, #34d399 100%)';
    
    // Create span for in-progress tasks
    const inProgressSpan = document.createElement('span');
    inProgressSpan.style.width = (inProgressPercent - completedPercent) + '%';
    inProgressSpan.style.background = 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)';
    inProgressSpan.style.opacity = '0.7';
    
    progressDiv.appendChild(completedSpan);
    progressDiv.appendChild(inProgressSpan);
    
    // Add task list below progress
    if (tasksInSlot.length > 0) {
      const taskList = document.createElement('div');
      taskList.style.fontSize = '0.7rem';
      taskList.style.marginTop = '6px';
      taskList.style.lineHeight = '1.2';
      taskList.style.maxHeight = '40px';
      taskList.style.overflow = 'hidden';
      taskList.style.color = '#a68b6e';
      
      tasksInSlot.forEach((task) => {
        const taskItem = document.createElement('div');
        taskItem.style.padding = '2px 4px';
        taskItem.style.borderRadius = '3px';
        taskItem.style.marginBottom = '2px';
        
        const statusIcon = task.status === 'done' ? '✓' : task.status === 'in-progress' ? '→' : '○';
        const statusColor = task.status === 'done' ? '#10b981' : task.status === 'in-progress' ? '#3b82f6' : '#8b7355';
        
        taskItem.innerHTML = `<span style="color: ${statusColor}">${statusIcon}</span> ${task.title.substring(0, 12)}`;
        taskList.appendChild(taskItem);
      });
      
      block.appendChild(progressDiv);
      block.appendChild(taskList);
    } else {
      block.appendChild(progressDiv);
    }
    
    elements.timeBlocks.appendChild(block);
  });
}

function renderStats() {
  const level = Math.floor(state.xp / 100) + 1;
  const taskTotal = state.tasks.length || 1;
  const taskDone = state.tasks.filter((t) => t.status === 'done').length;
  const farmTasks = state.tasks.filter((t) => t.building === 'Farm');
  const farmDone = farmTasks.filter((t) => t.status === 'done').length;
  const farmHealth = ((farmDone / (farmTasks.length || 1)) * 100).toFixed(0);
  const townHappiness = ((taskDone / taskTotal) * 100).toFixed(0);
  elements.xpCount.textContent = state.xp;
  elements.goldCount.textContent = state.coins;
  elements.dayCount.textContent = state.day;
  elements.levelCount.textContent = level;
  elements.farmHealth.textContent = `${farmHealth}%`;
  elements.townHappiness.textContent = `${townHappiness}%`;
  elements.toolCount.textContent = Math.floor(state.coins / 5);
  elements.equipmentCount.textContent = Math.floor(state.xp / 50);
}

function getQuestGroups() {
  const groups = {};
  state.tasks.forEach((task) => {
    if (!groups[task.building]) {
      groups[task.building] = { total: 0, done: 0 };
    }
    groups[task.building].total++;
    if (task.status === 'done') {
      groups[task.building].done++;
    }
  });
  return groups;
}

function renderQuestBars() {
  elements.questBars.innerHTML = '';
  const groups = getQuestGroups();
  Object.entries(groups).forEach(([building, counts]) => {
    const bar = document.createElement('div');
    bar.className = `quest-bar ${state.selectedBuilding === building ? 'active' : ''}`;
    bar.addEventListener('click', () => setSelectedBuilding(building));
    const progress = (counts.done / (counts.total || 1)) * 100;
    bar.innerHTML = `
      <strong>${buildingIcons[building] || ''} ${building} <span>${counts.done}/${counts.total}</span></strong>
      <div class="quest-progress"><span style="width: ${progress}%"></span></div>
    `;
    elements.questBars.appendChild(bar);
  });
  updateQuestSummary();
}

function updateQuestSummary() {
  if (state.selectedBuilding) {
    const building = state.selectedBuilding;
    const tasks = state.tasks.filter((t) => t.building === building);
    const done = tasks.filter((t) => t.status === 'done').length;
    const total = tasks.length;
    elements.questSummary.textContent = `${building}: ${done}/${total} complete`;
  } else {
    elements.questSummary.textContent = '';
  }
}

function renderMap() {
  const groups = getQuestGroups();
  Object.entries(elements.mapCards).forEach(([building, element]) => {
    if (element) {
      const count = groups[building] ? groups[building].total : 0;
      element.classList.toggle('active-map-card', state.selectedBuilding === building);
      
      // Update status indicator based on completion percentage
      const buildingData = groups[building];
      if (buildingData && buildingData.total > 0) {
        const completionPercent = (buildingData.done / buildingData.total) * 100;
        
        // Remove all status classes
        element.classList.remove('status-good', 'status-normal', 'status-bad');
        
        // Add appropriate status class
        if (completionPercent === 100) {
          element.classList.add('status-good');
        } else if (completionPercent >= 50) {
          element.classList.add('status-normal');
        } else if (completionPercent > 0) {
          element.classList.add('status-normal');
        } else {
          element.classList.add('status-bad');
        }
      }
    }
  });
}

function setSelectedBuilding(building) {
  if (state.selectedBuilding === building) {
    state.selectedBuilding = null;
  } else {
    state.selectedBuilding = building;
  }
  renderBoard();
  renderQuestBars();
  renderMap();
  saveState();
}

function bindDragAndDrop() {
  const columns = document.querySelectorAll('.task-list');
  columns.forEach((col) => {
    col.addEventListener('dragover', (event) => {
      event.preventDefault();
      col.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
    });
    col.addEventListener('dragleave', () => {
      col.style.backgroundColor = '';
    });
    col.addEventListener('drop', (event) => {
      event.preventDefault();
      col.style.backgroundColor = '';
      const taskId = event.dataTransfer.getData('text/plain');
      const newStatus = col.parentElement.dataset.status;
      updateTaskStatus(taskId, newStatus);
    });
  });
}

function openCharacterModal() {
  elements.characterModal.classList.remove('hidden');
  elements.charNameInput.value = state.characterName;
}

function closeCharacterModal() {
  elements.characterModal.classList.add('hidden');
}

function selectCharacter(char, name) {
  const selected = document.querySelector('.char-option[data-char="' + char + '"]');
  if (selected) {
    selected.style.borderColor = '#ffd700';
    selected.style.boxShadow = '0 0 12px rgba(255, 215, 0, 0.5)';
  }
}

async function confirmCharacter() {
  const charOptions = document.querySelectorAll('.char-option');
  let selectedChar = null;
  let selectedName = null;
  
  for (const option of charOptions) {
    const style = window.getComputedStyle(option);
    if (style.borderColor.includes('rgb(255, 215, 0)')) {
      selectedChar = option.dataset.char;
      selectedName = option.dataset.name;
      break;
    }
  }
  
  if (!selectedChar) {
    alert('Please select a character');
    return;
  }
  
  const customName = elements.charNameInput.value.trim();
  if (!customName) {
    alert('Please enter your name');
    return;
  }
  
  state.character = selectedChar;
  state.characterName = customName;
  
  elements.playerAvatar.textContent = selectedChar;
  elements.playerName.textContent = customName;
  
  await saveState();
  closeCharacterModal();
}

async function initialize() {
  await loadState();
  
  elements.playerAvatar.textContent = state.character;
  elements.playerName.textContent = state.characterName;
  
  renderBoard();
  renderTimeBlocks();
  renderStats();
  renderQuestBars();
  renderMap();
  
  // Character modal handlers
  elements.changeCharBtn.addEventListener('click', openCharacterModal);
  elements.closeCharModal.addEventListener('click', closeCharacterModal);
  
  const charOptions = document.querySelectorAll('.char-option');
  charOptions.forEach((option) => {
    option.addEventListener('click', () => {
      charOptions.forEach((o) => o.style.borderColor = '#8d6e63');
      charOptions.forEach((o) => o.style.boxShadow = 'none');
      selectCharacter(option.dataset.char, option.dataset.name);
    });
  });
  
  elements.confirmCharBtn.addEventListener('click', confirmCharacter);
  
  // Modal handlers
  elements.newTaskBtn.addEventListener('click', () => {
    elements.taskModal.classList.remove('hidden');
  });
  elements.closeModal.addEventListener('click', () => {
    elements.taskModal.classList.add('hidden');
  });
  elements.cancelModal.addEventListener('click', () => {
    elements.taskModal.classList.add('hidden');
  });
  
  elements.taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('taskTitle').value;
    const building = document.getElementById('taskBuilding').value;
    const time = document.getElementById('taskTime').value;
    const description = document.getElementById('taskDesc').value;
    
    const task = {
      id: Date.now().toString(),
      title,
      building,
      time,
      description,
      status: 'todo',
      createdDay: state.day,
      daysOverdue: 0,
    };
    
    state.tasks.push(task);
    await saveState();
    renderBoard();
    renderQuestBars();
    renderTimeBlocks();
    elements.taskForm.reset();
    elements.taskModal.classList.add('hidden');
  });
  
  elements.dayAdvanceBtn.addEventListener('click', async () => {
    state.day++;
    state.tasks.forEach((task) => {
      if (task.status !== 'done') {
        task.daysOverdue++;
      } else {
        task.daysOverdue = 0;
      }
    });
    await saveState();
    renderBoard();
    renderStats();
  });
  
  Object.values(elements.mapCards).forEach((building) => {
    if (building) {
      building.addEventListener('click', (e) => {
        const buildingName = e.currentTarget.dataset.building;
        setSelectedBuilding(buildingName);
      });
    }
  });
}

initialize();
