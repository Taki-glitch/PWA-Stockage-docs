const DB_NAME = "DocVaultDB";
const DB_VERSION = 2;
const STORE_NAME = "documents";

let db;

/* ------------------ */
/* OPEN DATABASE */
/* ------------------ */

function openDB() {
  return new Promise((resolve, reject) => {

    const request =
      indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror =
      () => reject(request.error);

    request.onsuccess = () => {

      db = request.result;

      resolve(db);

    };

    request.onupgradeneeded = (event) => {

      const database =
        event.target.result;

      let store;

      if (
        !database.objectStoreNames.contains(
          STORE_NAME
        )
      ) {

        store =
          database.createObjectStore(
            STORE_NAME,
            {
              keyPath: "id"
            }
          );

      } else {

        store =
          event.target.transaction.objectStore(
            STORE_NAME
          );

      }

      if (
        !store.indexNames.contains("title")
      ) {
        store.createIndex(
          "title",
          "title"
        );
      }

    };

  });
}

/* ------------------ */

function getStore(
  mode = "readonly"
) {

  return db
    .transaction(
      STORE_NAME,
      mode
    )
    .objectStore(STORE_NAME);

}

/* ------------------ */
/* CREATE */
/* ------------------ */

function addDocument(doc) {

  return new Promise(
    (resolve, reject) => {

      const request =
        getStore("readwrite")
          .add(doc);

      request.onsuccess =
        () => resolve();

      request.onerror =
        () => reject(request.error);

    }
  );

}

/* ------------------ */
/* UPDATE */
/* ------------------ */

function updateDocument(doc) {

  return new Promise(
    (resolve, reject) => {

      const request =
        getStore("readwrite")
          .put(doc);

      request.onsuccess =
        () => resolve();

      request.onerror =
        () => reject(request.error);

    }
  );

}

/* ------------------ */
/* DELETE */
/* ------------------ */

function deleteDocument(id) {

  return new Promise(
    (resolve, reject) => {

      const request =
        getStore("readwrite")
          .delete(id);

      request.onsuccess =
        () => resolve();

      request.onerror =
        () => reject(request.error);

    }
  );

}

/* ------------------ */
/* GET */
/* ------------------ */

function getDocument(id) {

  return new Promise(
    (resolve, reject) => {

      const request =
        getStore()
          .get(id);

      request.onsuccess =
        () => resolve(request.result);

      request.onerror =
        () => reject(request.error);

    }
  );

}

/* ------------------ */
/* GET ALL */
/* ------------------ */

function getAllDocuments() {

  return new Promise(
    (resolve, reject) => {

      const request =
        getStore()
          .getAll();

      request.onsuccess =
        () => resolve(
          request.result || []
        );

      request.onerror =
        () => reject(request.error);

    }
  );

}
