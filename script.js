import { todoFarmDb } from './db.js';

const state = {
  tasks: [],
  day: 1,
  xp: 0,
  coins: 6,
  selectedBuilding: null,
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
  farmCount: document.getElementById('farmCount'),
  greenhouseCount: document.getElementById('greenhouseCount'),
  workshopCount: document.getElementById('workshopCount'),
  marketCount: document.getElementById('marketCount'),
  townHallCount: document.getElementById('townHallCount'),
  xpCount: document.getElementById('xpCount'),
  goldCount: document.getElementById('goldCount'),
  dayCount: document.getElementById('dayCount'),
  levelCount: document.getElementById('levelCount'),
  taskModal: document.getElementById('taskModal'),
  taskForm: document.getElementById('taskForm'),
  newTaskBtn: document.getElementById('newTaskBtn'),
  closeModal: document.getElementById('closeModal'),
  cancelModal: document.getElementById('cancelModal'),
  dayAdvanceBtn: document.getElementById('dayAdvanceBtn'),
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
}

async function saveState() {
  await todoFarmDb.saveTasks(state.tasks);
  await todoFarmDb.saveMeta('appState', {
    day: state.day,
    xp: state.xp,
    coins: state.coins,
    selectedBuilding: state.selectedBuilding,
  });
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

  const title = document.createElement('h3');
  title.className = 'task-title';
  title.textContent = task.title;

  const badge = document.createElement('div');
  badge.className = 'task-badge';
  badge.textContent = task.building;

  const meta = document.createElement('div');
  meta.className = 'task-meta';
  meta.innerHTML = `<span>${buildingIcons[task.building] || '📍'} ${task.building}</span><span>${task.time}</span>`;

  const desc = document.createElement('p');
  desc.style.margin = '0.5rem 0 0';
  desc.style.color = '#4b5563';
  desc.textContent = task.description || 'No description yet.';

  const actions = document.createElement('div');
  actions.className = 'task-actions';

  const nextButton = document.createElement('button');
  nextButton.className = 'task-button';
  nextButton.textContent = task.status === 'todo' ? 'Start' : task.status === 'in-progress' ? 'Complete' : 'Archive';
  nextButton.addEventListener('click', () => moveTaskForward(task.id));

  const resetButton = document.createElement('button');
  resetButton.className = 'task-button secondary';
  resetButton.textContent = 'Reset';
  resetButton.addEventListener('click', () => resetTask(task.id));

  actions.append(nextButton, resetButton);
  card.append(badge, title, meta, desc, actions);
  return card;
}

function taskFilter(task) {
  return !state.selectedBuilding || task.building === state.selectedBuilding;
}

function renderBoard() {
  elements.todoColumn.innerHTML = '';
  elements.progressColumn.innerHTML = '';
  elements.doneColumn.innerHTML = '';

  const stacks = {
    todo: elements.todoColumn,
    'in-progress': elements.progressColumn,
    done: elements.doneColumn,
  };

  state.tasks.filter(taskFilter).forEach((task) => {
    const card = createTaskCard(task);
    stacks[task.status].appendChild(card);
  });
}

function renderTimeBlocks() {
  elements.timeBlocks.innerHTML = '';
  timeSlots.forEach((slot) => {
    const block = document.createElement('div');
    block.className = 'time-block';
    const title = document.createElement('h4');
    title.textContent = slot;
    const owner = document.createElement('small');
    const scheduled = state.tasks.filter((task) => task.time === slot && task.status !== 'done');
    owner.textContent = scheduled.length ? `${scheduled.length} tasks` : 'Free block';
    const list = document.createElement('div');
    list.className = 'time-block-list';

    scheduled.slice(0, 3).forEach((task) => {
      const item = document.createElement('div');
      item.className = 'block-item';
      item.textContent = `${buildingIcons[task.building] || '📍'} ${task.title}`;
      list.appendChild(item);
    });

    if (!scheduled.length) {
      const empty = document.createElement('div');
      empty.className = 'block-item';
      empty.textContent = 'Relax, no focus needed.';
      list.appendChild(empty);
    }

    block.append(title, owner, list);
    elements.timeBlocks.appendChild(block);
  });
}

function renderMap() {
  const counts = {
    Farm: 0,
    Greenhouse: 0,
    Workshop: 0,
    Market: 0,
    'Town Hall': 0,
  };

  state.tasks.forEach((task) => {
    if (task.status !== 'done') counts[task.building] = (counts[task.building] || 0) + 1;
  });

  elements.farmCount.textContent = `${counts.Farm} tasks`;
  elements.greenhouseCount.textContent = `${counts.Greenhouse} tasks`;
  elements.workshopCount.textContent = `${counts.Workshop} tasks`;
  elements.marketCount.textContent = `${counts.Market} tasks`;
  elements.townHallCount.textContent = `${counts['Town Hall']} tasks`;

  Object.entries(elements.mapCards).forEach(([building, card]) => {
    card.classList.toggle('active-map-card', state.selectedBuilding === building);
    card.querySelector('strong').textContent = building;
    card.querySelector('small').textContent = `${counts[building]} tasks`;
  });
}

function getStats() {
  const completed = state.tasks.filter((task) => task.status === 'done').length;
  const overdue = state.tasks.filter((task) => task.status !== 'done' && task.daysOverdue > 0).length;
  const total = state.tasks.length;
  const farmHealth = Math.max(20, Math.min(100, 90 + completed * 2 - overdue * 8));
  const townHappiness = Math.max(20, Math.min(100, 55 + completed * 3 - overdue * 5));
  const tools = Math.max(1, Math.floor(townHappiness / 20));
  const equipment = Math.max(1, Math.floor(completed / 2) + tools);
  const nextLevel = Math.max(1, Math.floor((completed * 15 + state.xp) / 100) + 1);
  return { farmHealth, townHappiness, tools, equipment, completed, overdue, total, nextLevel };
}

function renderStats() {
  const stats = getStats();
  elements.farmHealth.textContent = `${stats.farmHealth}%`;
  elements.townHappiness.textContent = `${stats.townHappiness}%`;
  elements.toolCount.textContent = `${stats.tools}`;
  elements.equipmentCount.textContent = `${stats.equipment}`;
  elements.xpCount.textContent = state.xp;
  elements.goldCount.textContent = state.coins;
  elements.dayCount.textContent = state.day;
  elements.levelCount.textContent = stats.nextLevel;

  const summary = [];
  summary.push(`Day ${state.day}: Harvest health is ${stats.farmHealth}%.`);
  summary.push(`Town morale is ${stats.townHappiness}%.`);
  summary.push(`Current level: ${stats.nextLevel}.`);
  summary.push(`${stats.completed}/${stats.total} tasks completed, ${stats.overdue} overdue quests.`);
  elements.questSummary.textContent = summary.join(' ');
}

async function moveTaskForward(id) {
  const task = state.tasks.find((entry) => entry.id === id);
  if (!task) return;

  if (task.status === 'todo') task.status = 'in-progress';
  else if (task.status === 'in-progress') {
    task.status = 'done';
    state.xp += 10;
    state.coins += 2;
  } else if (task.status === 'done') {
    task.status = 'done';
  }

  await saveState();
  renderApp();
}

async function resetTask(id) {
  const task = state.tasks.find((entry) => entry.id === id);
  if (!task) return;
  task.status = 'todo';
  task.daysOverdue = 0;
  await saveState();
  renderApp();
}

function showModal() {
  elements.taskModal.classList.remove('hidden');
}

function hideModal() {
  elements.taskModal.classList.add('hidden');
  elements.taskForm.reset();
}

async function addTaskFromForm(event) {
  event.preventDefault();
  const title = document.getElementById('taskTitle').value.trim();
  const building = document.getElementById('taskBuilding').value;
  const time = document.getElementById('taskTime').value;
  const description = document.getElementById('taskDesc').value.trim();

  if (!title) return;
  const newTask = {
    id: crypto.randomUUID(),
    title,
    building,
    time,
    description,
    status: 'todo',
    createdDay: state.day,
    daysOverdue: 0,
  };

  state.tasks.push(newTask);
  await saveState();
  renderApp();
  hideModal();
}

async function advanceDay() {
  state.day += 1;
  state.tasks.forEach((task) => {
    if (task.status !== 'done') {
      task.daysOverdue += 1;
    }
  });
  await saveState();
  renderApp();
}

function setSelectedBuilding(building) {
  state.selectedBuilding = state.selectedBuilding === building ? null : building;
  saveState();
  renderApp();
}

function bindMapInteractions() {
  Object.entries(elements.mapCards).forEach(([building, card]) => {
    card.addEventListener('click', () => setSelectedBuilding(building));
  });
}

function bindDragAndDrop() {
  const columns = document.querySelectorAll('.kanban-column');
  columns.forEach((column) => {
    column.addEventListener('dragover', (event) => {
      event.preventDefault();
      column.classList.add('drag-over');
    });
    column.addEventListener('dragleave', () => {
      column.classList.remove('drag-over');
    });
    column.addEventListener('drop', async (event) => {
      event.preventDefault();
      column.classList.remove('drag-over');
      const taskId = event.dataTransfer.getData('text/plain');
      const targetStatus = column.dataset.status;
      const task = state.tasks.find((entry) => entry.id === taskId);
      if (task && task.status !== targetStatus) {
        task.status = targetStatus;
        if (targetStatus === 'done') {
          state.xp += 10;
          state.coins += 2;
        }
        await saveState();
        renderApp();
      }
    });
  });
}

async function renderApp() {
  renderBoard();
  renderTimeBlocks();
  renderMap();
  renderStats();
}

async function initialize() {
  await loadState();
  renderApp();
  bindMapInteractions();
  bindDragAndDrop();

  elements.newTaskBtn.addEventListener('click', showModal);
  elements.closeModal.addEventListener('click', hideModal);
  elements.cancelModal.addEventListener('click', hideModal);
  elements.taskForm.addEventListener('submit', addTaskFromForm);
  elements.dayAdvanceBtn.addEventListener('click', advanceDay);
}

initialize();
