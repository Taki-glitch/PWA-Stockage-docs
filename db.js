const DB_NAME = "docvault";
const STORE = "docs";

let db;

export function initDB(){
  return new Promise(res=>{
    const req = indexedDB.open(DB_NAME,1);

    req.onupgradeneeded = e=>{
      const d = e.target.result;
      d.createObjectStore(STORE,{keyPath:"id"});
    };

    req.onsuccess = e=>{
      db = e.target.result;
      res();
    };
  });
}

export function getAll(){
  return tx("readonly").getAll();
}

export function put(doc){
  return tx("readwrite").put(doc);
}

export function del(id){
  return tx("readwrite").delete(id);
}

function tx(mode){
  return db.transaction(STORE,mode).objectStore(STORE);
}
