const DB_NAME = "DocVaultDB";
const DB_VERSION = 1;
const STORE_NAME = "documents";

let db;

function openDB() {
  return new Promise((resolve, reject) => {

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {

      const database = event.target.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {

        const store = database.createObjectStore(
          STORE_NAME,
          { keyPath: "id" }
        );

        store.createIndex("title", "title");
      }
    };
  });
}

function getStore(mode = "readonly") {
  const transaction = db.transaction(STORE_NAME, mode);
  return transaction.objectStore(STORE_NAME);
}

async function addDocument(doc) {

  return new Promise((resolve, reject) => {

    const request = getStore("readwrite").add(doc);

    request.onsuccess = () => resolve();

    request.onerror = () => reject(request.error);

  });
}

async function deleteDocument(id) {

  return new Promise((resolve, reject) => {

    const request =
      getStore("readwrite").delete(id);

    request.onsuccess = () => resolve();

    request.onerror = () => reject(request.error);

  });
}

async function getDocument(id) {

  return new Promise((resolve, reject) => {

    const request =
      getStore().get(id);

    request.onsuccess =
      () => resolve(request.result);

    request.onerror =
      () => reject(request.error);

  });
}

async function getAllDocuments() {

  return new Promise((resolve, reject) => {

    const request =
      getStore().getAll();

    request.onsuccess =
      () => resolve(request.result || []);

    request.onerror =
      () => reject(request.error);

  });
}
