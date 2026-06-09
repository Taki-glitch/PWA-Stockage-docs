import {initDB,getAll,put,del,clearDocs} from "./db.js";
import {searchDocs} from "./search.js";

const els = {
  fileInput: document.querySelector("#fileInput"),
  importInput: document.querySelector("#importInput"),
  exportBtn: document.querySelector("#exportBtn"),
  themeToggle: document.querySelector("#themeToggle"),
  search: document.querySelector("#search"),
  list: document.querySelector("#list"),
  stats: document.querySelector("#stats"),
  dueSoon: document.querySelector("#dueSoon"),
  viewTitle: document.querySelector("#viewTitle"),
  categoryList: document.querySelector("#categoryList"),
  tagList: document.querySelector("#tagList"),
  modal: document.querySelector("#modal"),
  mTitle: document.querySelector("#mTitle"),
  mCategory: document.querySelector("#mCategory"),
  mTags: document.querySelector("#mTags"),
  mSummary: document.querySelector("#mSummary"),
  mNotes: document.querySelector("#mNotes"),
  mDue: document.querySelector("#mDue"),
  mFav: document.querySelector("#mFav"),
  mArch: document.querySelector("#mArch"),
  mLinks: document.querySelector("#mLinks"),
  blocks: document.querySelector("#blocks"),
  addBlock: document.querySelector("#addBlock"),
  save: document.querySelector("#save"),
  openFile: document.querySelector("#openFile"),
  deleteDoc: document.querySelector("#deleteDoc")
};

const state = {
  docs: [],
  current: null,
  view: "all",
  filter: null
};

await initDB();
await refresh();
registerServiceWorker();
restoreTheme();

els.fileInput.addEventListener("change",async event=>{
  for(const file of event.target.files){
    await put(createDocument(file));
  }

  event.target.value = "";
  await refresh();
});

els.search.addEventListener("input",()=>render());

els.themeToggle.addEventListener("click",()=>{
  document.body.classList.toggle("dark");
  localStorage.setItem("docvault-theme",document.body.classList.contains("dark") ? "dark" : "light");
});

els.exportBtn.addEventListener("click",()=>{
  const metadataOnly = state.docs.map(({file,...doc})=>doc);
  downloadBlob(new Blob([JSON.stringify(metadataOnly,null,2)],{type:"application/json"}),"docvault-export.json");
});

els.importInput.addEventListener("change",async event=>{
  const [file] = event.target.files;
  if(!file){
    return;
  }

  const importedDocs = JSON.parse(await file.text());
  await clearDocs();

  for(const doc of importedDocs){
    await put({
      ...doc,
      file: doc.file || new Blob(["Document importé sans fichier binaire"],{type:"text/plain"})
    });
  }

  event.target.value = "";
  await refresh();
});

for(const button of document.querySelectorAll(".nav")){
  button.addEventListener("click",()=>{
    state.view = button.dataset.view;
    state.filter = null;
    document.querySelectorAll(".nav").forEach(nav=>nav.classList.toggle("active",nav === button));
    render();
  });
}

els.addBlock.addEventListener("click",()=>addBlock());
els.save.addEventListener("click",saveCurrent);
els.openFile.addEventListener("click",openCurrentFile);
els.deleteDoc.addEventListener("click",deleteCurrent);

async function refresh(){
  state.docs = (await getAll()).map(normalizeDoc).sort((a,b)=>new Date(b.updatedAt) - new Date(a.updatedAt));
  render();
}

function render(){
  renderDashboard();
  renderFacets();

  const filtered = searchDocs(applyView(state.docs),els.search.value);
  els.list.innerHTML = "";
  els.viewTitle.textContent = viewTitle();

  if(!filtered.length){
    els.list.innerHTML = `<article class="empty">Aucun document trouvé. Importez un PDF, une image ou un fichier pour commencer.</article>`;
    return;
  }

  filtered.forEach(doc=>els.list.appendChild(card(doc)));
}

function renderDashboard(){
  const activeDocs = state.docs.filter(doc=>!doc.archived);
  const categories = new Set(activeDocs.map(doc=>doc.category).filter(Boolean));
  const tags = new Set(activeDocs.flatMap(doc=>doc.tags || []));
  const dueSoon = upcomingDocs(state.docs,14);

  els.stats.innerHTML = [
    stat("Documents",state.docs.length),
    stat("Favoris",state.docs.filter(doc=>doc.favorite).length),
    stat("Archives",state.docs.filter(doc=>doc.archived).length),
    stat("Échéances",dueSoon.length),
    stat("Catégories",categories.size),
    stat("Tags",tags.size)
  ].join("");

  els.dueSoon.innerHTML = `
    <div class="section-title"><h3>Urgences à 14 jours</h3><span>${dueSoon.length} document(s)</span></div>
    ${dueSoon.length ? dueSoon.map(doc=>`<button class="due-item" data-id="${doc.id}">📅 ${escapeHtml(doc.title)} · ${formatDate(doc.dueDate)}</button>`).join("") : "<p>Aucune échéance proche.</p>"}
  `;

  els.dueSoon.querySelectorAll(".due-item").forEach(button=>{
    button.addEventListener("click",()=>openDoc(state.docs.find(doc=>doc.id === button.dataset.id)));
  });
}

function renderFacets(){
  renderFacet(els.categoryList,countBy(state.docs,"category"),"category");
  renderFacet(els.tagList,countTags(state.docs),"tag");
}

function renderFacet(container,items,type){
  container.innerHTML = items.length ? items.map(([name,count])=>`<button class="chip" data-type="${type}" data-name="${escapeHtml(name)}">${escapeHtml(name)} <span>${count}</span></button>`).join("") : '<p class="muted">—</p>';

  container.querySelectorAll(".chip").forEach(chip=>{
    chip.addEventListener("click",()=>{
      state.view = "all";
      state.filter = {type:chip.dataset.type,name:chip.dataset.name};
      document.querySelectorAll(".nav").forEach(nav=>nav.classList.remove("active"));
      render();
    });
  });
}

function card(doc){
  const element = document.createElement("article");
  element.className = "card";
  element.innerHTML = `
    <div class="card-top">
      <strong>${escapeHtml(doc.title)}</strong>
      <span>${doc.favorite ? "⭐" : ""}${doc.archived ? "📦" : ""}</span>
    </div>
    <p>${escapeHtml(doc.summary || doc.notes || "Aucune note pour le moment.")}</p>
    <div class="meta">
      <span>${escapeHtml(doc.category || "Sans catégorie")}</span>
      ${doc.dueDate ? `<span>📅 ${formatDate(doc.dueDate)}</span>` : ""}
    </div>
    <div class="tags">${(doc.tags || []).map(tag=>`<span>#${escapeHtml(tag)}</span>`).join("")}</div>
  `;
  element.addEventListener("click",()=>openDoc(doc));
  return element;
}

function openDoc(doc){
  state.current = normalizeDoc(doc);
  els.mTitle.textContent = state.current.title;
  els.mCategory.value = state.current.category || "";
  els.mTags.value = (state.current.tags || []).join(", ");
  els.mSummary.value = state.current.summary || "";
  els.mNotes.value = state.current.notes || "";
  els.mDue.value = state.current.dueDate || "";
  els.mFav.checked = Boolean(state.current.favorite);
  els.mArch.checked = Boolean(state.current.archived);
  renderBlocks(state.current.blocks);
  renderRelations();
  els.modal.showModal();
}

function renderBlocks(blocks){
  els.blocks.innerHTML = "";
  const safeBlocks = blocks.length ? blocks : [{id:crypto.randomUUID(),type:"paragraph",content:""}];
  safeBlocks.forEach(block=>addBlock(block));
}

function addBlock(block={id:crypto.randomUUID(),type:"paragraph",content:""}){
  const row = document.createElement("div");
  row.className = "block-row";
  row.dataset.id = block.id;
  row.innerHTML = `
    <select class="block-type">
      <option value="paragraph">Texte</option>
      <option value="heading">Titre</option>
      <option value="todo">Todo</option>
    </select>
    <textarea class="block-content" placeholder="Écrire un bloc..."></textarea>
    <button type="button" class="icon-button remove-block" aria-label="Supprimer le bloc">✕</button>
  `;
  row.querySelector(".block-type").value = block.type;
  row.querySelector(".block-content").value = block.content;
  row.querySelector(".remove-block").addEventListener("click",()=>row.remove());
  els.blocks.appendChild(row);
}

function renderRelations(){
  const candidates = state.docs.filter(doc=>doc.id !== state.current.id);
  els.mLinks.innerHTML = candidates.length ? candidates.map(doc=>`
    <label class="relation-item">
      <input type="checkbox" value="${doc.id}" ${state.current.relations.includes(doc.id) ? "checked" : ""} />
      <span>${escapeHtml(doc.title)}</span>
    </label>
  `).join("") : "<p>Aucun autre document à lier.</p>";
}

async function saveCurrent(){
  if(!state.current){
    return;
  }

  const relationIds = [...els.mLinks.querySelectorAll("input:checked")].map(input=>input.value);
  const blocks = [...els.blocks.querySelectorAll(".block-row")].map(row=>({
    id: row.dataset.id,
    type: row.querySelector(".block-type").value,
    content: row.querySelector(".block-content").value.trim()
  })).filter(block=>block.content);

  await put({
    ...state.current,
    category: els.mCategory.value.trim(),
    tags: els.mTags.value,
    summary: els.mSummary.value.trim(),
    notes: els.mNotes.value.trim(),
    dueDate: els.mDue.value || null,
    favorite: els.mFav.checked,
    archived: els.mArch.checked,
    relations: relationIds,
    blocks
  });

  els.modal.close();
  await refresh();
}

function openCurrentFile(){
  if(!state.current?.file){
    return;
  }

  const url = URL.createObjectURL(state.current.file);
  window.open(url,"_blank","noopener");
  setTimeout(()=>URL.revokeObjectURL(url),60_000);
}

async function deleteCurrent(){
  if(!state.current || !confirm(`Supprimer « ${state.current.title} » ?`)){
    return;
  }

  await del(state.current.id);

  for(const doc of state.docs){
    if(doc.relations?.includes(state.current.id)){
      await put({...doc,relations:doc.relations.filter(id=>id !== state.current.id)});
    }
  }

  els.modal.close();
  await refresh();
}

function applyView(docs){
  let result = docs;

  if(state.view === "favorites"){
    result = result.filter(doc=>doc.favorite);
  }else if(state.view === "archives"){
    result = result.filter(doc=>doc.archived);
  }else if(state.view === "due"){
    result = result.filter(doc=>doc.dueDate);
  }else if(state.view === "all"){
    result = result.filter(doc=>!doc.archived);
  }

  if(state.filter?.type === "category"){
    result = result.filter(doc=>doc.category === state.filter.name);
  }

  if(state.filter?.type === "tag"){
    result = result.filter(doc=>doc.tags?.includes(state.filter.name));
  }

  return result;
}

function createDocument(file){
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    title: file.name,
    file,
    category: "",
    tags: [],
    summary: "",
    notes: "",
    favorite: false,
    archived: false,
    dueDate: null,
    relations: [],
    blocks: [],
    createdAt: now,
    updatedAt: now
  };
}

function normalizeDoc(doc){
  return {
    category: "",
    tags: [],
    summary: "",
    notes: "",
    favorite: false,
    archived: false,
    dueDate: doc.dueDate || doc.due || null,
    relations: [],
    blocks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...doc
  };
}

function stat(label,value){
  return `<article class="stat"><strong>${value}</strong><span>${label}</span></article>`;
}

function countBy(docs,key){
  const counts = new Map();
  docs.forEach(doc=>{
    if(doc[key]){
      counts.set(doc[key],(counts.get(doc[key]) || 0) + 1);
    }
  });
  return [...counts.entries()].sort((a,b)=>b[1] - a[1]);
}

function countTags(docs){
  const counts = new Map();
  docs.flatMap(doc=>doc.tags || []).forEach(tag=>counts.set(tag,(counts.get(tag) || 0) + 1));
  return [...counts.entries()].sort((a,b)=>b[1] - a[1]);
}

function upcomingDocs(docs,days){
  const now = new Date();
  const limit = new Date(now);
  limit.setDate(limit.getDate() + days);

  return docs
    .filter(doc=>doc.dueDate)
    .filter(doc=>{
      const due = new Date(`${doc.dueDate}T00:00:00`);
      return due >= new Date(now.toDateString()) && due <= limit;
    })
    .sort((a,b)=>new Date(a.dueDate) - new Date(b.dueDate));
}

function viewTitle(){
  if(state.filter){
    return `${state.filter.type === "tag" ? "Tag" : "Catégorie"} : ${state.filter.name}`;
  }

  return {
    all: "Tous les documents",
    favorites: "Favoris",
    archives: "Archives",
    due: "Échéances"
  }[state.view];
}

function formatDate(date){
  return new Intl.DateTimeFormat("fr-FR",{dateStyle:"medium"}).format(new Date(`${date}T00:00:00`));
}

function escapeHtml(value=""){
  return String(value).replace(/[&<>'"]/g,char=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    "'":"&#39;",
    "\"":"&quot;"
  }[char]));
}

function downloadBlob(blob,filename){
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function restoreTheme(){
  if(localStorage.getItem("docvault-theme") === "dark"){
    document.body.classList.add("dark");
  }
}

function registerServiceWorker(){
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("./service-worker.js");
  }
}
