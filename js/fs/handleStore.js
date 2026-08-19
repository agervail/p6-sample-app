const DATABASE_NAME = 'p6-sample-manager';
const STORE_NAME = 'handles';
const DESTINATION_KEY = 'destination';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runTransaction(database, mode, operation) {
  return new Promise((resolve, reject) => {
    const store = database.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
    const request = operation(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDestinationHandle(handle) {
  const database = await openDatabase();
  await runTransaction(database, 'readwrite', (store) => store.put(handle, DESTINATION_KEY));
  database.close();
}

export async function loadDestinationHandle() {
  const database = await openDatabase();
  const handle = await runTransaction(database, 'readonly', (store) => store.get(DESTINATION_KEY));
  database.close();
  return handle ?? null;
}
