const DB_NAME = "docvault";
const DB_VERSION = 2;
const STORE = "docs";

let db;

export function initDB(){
  return new Promise((resolve,reject)=>{
    const req = indexedDB.open(DB_NAME,DB_VERSION);

    req.onupgradeneeded = e=>{
      const database = e.target.result;

      if(!database.objectStoreNames.contains(STORE)){
        database.createObjectStore(STORE,{keyPath:"id"});
      }
    };

    req.onsuccess = e=>{
      db = e.target.result;
      resolve(db);
    };

    req.onerror = ()=>reject(req.error);
  });
}

export function getAll(){
  return request("readonly",store=>store.getAll());
}

export function get(id){
  return request("readonly",store=>store.get(id));
}

export function put(doc){
  const now = new Date().toISOString();

  return request("readwrite",store=>store.put({
    ...doc,
    tags: normalizeTags(doc.tags),
    relations: Array.isArray(doc.relations) ? doc.relations : [],
    blocks: Array.isArray(doc.blocks) ? doc.blocks : [],
    dueDate: doc.dueDate || null,
    createdAt: doc.createdAt || now,
    updatedAt: now
  }));
}

export function del(id){
  return request("readwrite",store=>store.delete(id));
}

export function clearDocs(){
  return request("readwrite",store=>store.clear());
}

function request(mode,operation){
  return new Promise((resolve,reject)=>{
    if(!db){
      reject(new Error("IndexedDB is not initialized"));
      return;
    }

    const transaction = db.transaction(STORE,mode);
    const store = transaction.objectStore(STORE);
    const req = operation(store);

    req.onsuccess = ()=>resolve(req.result);
    req.onerror = ()=>reject(req.error);
    transaction.onerror = ()=>reject(transaction.error);
  });
}

function normalizeTags(tags){
  if(Array.isArray(tags)){
    return tags.map(tag=>String(tag).trim()).filter(Boolean);
  }

  if(typeof tags === "string"){
    return tags.split(",").map(tag=>tag.trim()).filter(Boolean);
  }

  return [];
}
