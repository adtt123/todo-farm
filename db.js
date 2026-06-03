const DB_NAME = 'todoFarmDatabase';
const DB_VERSION = 1;
const TASK_STORE = 'tasks';
const META_STORE = 'meta';

let dbPromise = null;

function openDB() {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(TASK_STORE)) {
        database.createObjectStore(TASK_STORE, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

function withStore(storeName, mode, callback) {
  return openDB().then((database) => {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      callback(store, resolve, reject);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  });
}

export const todoFarmDb = {
  open: openDB,
  getAllTasks() {
    return openDB().then((database) => {
      return new Promise((resolve, reject) => {
        const transaction = database.transaction(TASK_STORE, 'readonly');
        const store = transaction.objectStore(TASK_STORE);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });
  },
  saveTasks(tasks) {
    return openDB().then((database) => {
      return new Promise((resolve, reject) => {
        const transaction = database.transaction(TASK_STORE, 'readwrite');
        const store = transaction.objectStore(TASK_STORE);
        const clearRequest = store.clear();

        clearRequest.onsuccess = () => {
          tasks.forEach((task) => store.put(task));
        };

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    });
  },
  getMeta(key) {
    return openDB().then((database) => {
      return new Promise((resolve, reject) => {
        const transaction = database.transaction(META_STORE, 'readonly');
        const store = transaction.objectStore(META_STORE);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result ? request.result.value : null);
        request.onerror = () => reject(request.error);
      });
    });
  },
  saveMeta(key, value) {
    return openDB().then((database) => {
      return new Promise((resolve, reject) => {
        const transaction = database.transaction(META_STORE, 'readwrite');
        const store = transaction.objectStore(META_STORE);
        const request = store.put({ key, value });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  },
};
