import {initDB,getAll,put,del,clearDocs} from "./db.js";
import {searchDocs} from "./search.js";

const TRASH_RETENTION_DAYS = 30;

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
  restoreDoc: document.querySelector("#restoreDoc"),
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
els.restoreDoc.addEventListener("click",restoreCurrent);
els.deleteDoc.addEventListener("click",deleteCurrent);

async function refresh(){
  const loadedDocs = (await getAll()).map(normalizeDoc);
  const expiredTrash = loadedDocs.filter(isExpiredTrash);

  for(const doc of expiredTrash){
    await del(doc.id);
  }

  state.docs = loadedDocs
    .filter(doc=>!expiredTrash.some(expired=>expired.id === doc.id))
    .sort((a,b)=>new Date(b.updatedAt) - new Date(a.updatedAt));

  render();
}

function render(){
  renderDashboard();
  renderFacets();

  const filtered = searchDocs(applyView(state.docs),els.search.value);
  els.list.innerHTML = "";
  els.viewTitle.textContent = viewTitle();

  if(state.view === "folders"){
    renderFolders(filtered);
    return;
  }

  if(state.view === "timeline"){
    renderTimeline(filtered);
    return;
  }

  els.list.className = "document-grid";

  if(!filtered.length){
    els.list.innerHTML = `<article class="empty">Aucun document trouvé. Importez un PDF, une image ou un fichier pour commencer.</article>`;
    return;
  }

  filtered.forEach(doc=>els.list.appendChild(card(doc)));
}

function renderDashboard(){
  const activeDocs = activeDocuments();
  const dueSoon = upcomingDocs(activeDocs,14);
  const weekDocs = modifiedWithin(activeDocs,7);
  const favorites = activeDocs.filter(doc=>doc.favorite);
  const topCategory = countBy(activeDocs,"category")[0]?.[0] || "Aucune";
  const trashCount = state.docs.filter(doc=>doc.deleted).length;

  els.stats.innerHTML = [
    stat("Échéances proches",dueSoon.length,"⚠️"),
    stat("Modifiés cette semaine",weekDocs.length,"📄"),
    stat("Favoris",favorites.length,"⭐"),
    stat("Catégorie principale",topCategory,"📁"),
    stat("Corbeille",trashCount,"🗑")
  ].join("");

  const recent = recentDocs(activeDocs,5);
  els.dueSoon.innerHTML = `
    <div class="section-title"><h3>À traiter maintenant</h3><span>${dueSoon.length} échéance(s), ${recent.length} récent(s)</span></div>
    <div class="insight-grid">
      <section>
        <h4>⚠️ Échéances proches</h4>
        ${dueSoon.length ? dueSoon.map(doc=>quickDocButton(doc,`📅 ${formatDate(doc.dueDate)}`)).join("") : "<p>Aucune échéance proche.</p>"}
      </section>
      <section>
        <h4>📄 Derniers documents</h4>
        ${recent.length ? recent.map(doc=>quickDocButton(doc,relativeDate(doc.updatedAt))).join("") : "<p>Aucun document récent.</p>"}
      </section>
    </div>
  `;

  els.dueSoon.querySelectorAll(".due-item").forEach(button=>{
    button.addEventListener("click",()=>openDoc(state.docs.find(doc=>doc.id === button.dataset.id)));
  });
}

function renderFacets(){
  const docs = activeDocuments();
  renderFacet(els.categoryList,countBy(docs,"category"),"category");
  renderFacet(els.tagList,countTags(docs),"tag");
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

function renderFolders(docs){
  const folders = groupByCategory(docs);
  els.list.className = "folder-view";

  if(!folders.length){
    els.list.innerHTML = `<article class="empty">Aucun dossier. Ajoutez une catégorie à vos documents pour créer une structure.</article>`;
    return;
  }

  els.list.innerHTML = folders.map(([category,folderDocs])=>`
    <article class="folder-card">
      <button class="folder-title" data-category="${escapeHtml(category)}">📁 ${escapeHtml(category)} <span>${folderDocs.length}</span></button>
      <ul>
        ${folderDocs.slice(0,8).map(doc=>`<li><button class="link-button" data-id="${doc.id}">${escapeHtml(doc.title)}</button></li>`).join("")}
      </ul>
    </article>
  `).join("");

  els.list.querySelectorAll(".folder-title").forEach(button=>{
    button.addEventListener("click",()=>{
      state.view = "all";
      state.filter = {type:"category",name:button.dataset.category};
      render();
    });
  });

  els.list.querySelectorAll(".link-button").forEach(button=>{
    button.addEventListener("click",()=>openDoc(state.docs.find(doc=>doc.id === button.dataset.id)));
  });
}

function renderTimeline(docs){
  const groups = groupByTimeline(docs);
  els.list.className = "timeline-view";

  if(!groups.length){
    els.list.innerHTML = `<article class="empty">Aucun document dans la timeline.</article>`;
    return;
  }

  els.list.innerHTML = groups.map(([year,months])=>`
    <section class="timeline-year">
      <h3>${year}</h3>
      ${months.map(([month,monthDocs])=>`
        <article class="timeline-month">
          <h4>${month}</h4>
          <ul>
            ${monthDocs.map(doc=>`<li><button class="link-button" data-id="${doc.id}">${escapeHtml(doc.title)}</button><span>${formatDate(doc.createdAt)}</span></li>`).join("")}
          </ul>
        </article>
      `).join("")}
    </section>
  `).join("");

  els.list.querySelectorAll(".link-button").forEach(button=>{
    button.addEventListener("click",()=>openDoc(state.docs.find(doc=>doc.id === button.dataset.id)));
  });
}

function card(doc){
  els.list.className = "document-grid";
  const element = document.createElement("article");
  element.className = `card${doc.deleted ? " deleted-card" : ""}`;
  element.innerHTML = `
    <div class="card-top">
      <strong>${escapeHtml(doc.title)}</strong>
      <span>${doc.deleted ? "🗑" : ""}${doc.favorite ? "⭐" : ""}${doc.archived ? "📦" : ""}</span>
    </div>
    <p>${escapeHtml(doc.summary || doc.notes || "Aucune note pour le moment.")}</p>
    <div class="meta">
      <span>${escapeHtml(doc.category || "Sans catégorie")}</span>
      ${doc.dueDate ? `<span>📅 ${formatDate(doc.dueDate)}</span>` : ""}
      ${doc.deletedAt ? `<span>Supprimé ${relativeDate(doc.deletedAt)}</span>` : ""}
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
  updateModalActions();
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
  const candidates = activeDocuments().filter(doc=>doc.id !== state.current.id);
  const backlinks = backlinksFor(state.current.id);
  const relationIds = new Set(state.current.relations || []);

  els.mLinks.innerHTML = `
    <div class="backlink-box">
      <strong>Mentionné par</strong>
      ${backlinks.length ? backlinks.map(doc=>`<button type="button" class="link-button backlink" data-id="${doc.id}">← ${escapeHtml(doc.title)}</button>`).join("") : "<p>Aucun backlink automatique.</p>"}
    </div>
    <div class="relation-picker">
      ${candidates.length ? candidates.map(doc=>`
        <label class="relation-item">
          <input type="checkbox" value="${doc.id}" ${relationIds.has(doc.id) ? "checked" : ""} />
          <span>${escapeHtml(doc.title)}</span>
        </label>
      `).join("") : "<p>Aucun autre document à lier.</p>"}
    </div>
  `;

  els.mLinks.querySelectorAll(".backlink").forEach(button=>{
    button.addEventListener("click",()=>openDoc(state.docs.find(doc=>doc.id === button.dataset.id)));
  });
}

async function saveCurrent(){
  if(!state.current){
    return;
  }

  const relationIds = [...els.mLinks.querySelectorAll(".relation-picker input:checked")].map(input=>input.value);
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

async function restoreCurrent(){
  if(!state.current){
    return;
  }

  await put({
    ...state.current,
    deleted: false,
    deletedAt: null
  });

  els.modal.close();
  state.view = "all";
  await refresh();
}

async function deleteCurrent(){
  if(!state.current){
    return;
  }

  if(state.current.deleted){
    if(!confirm(`Purger définitivement « ${state.current.title} » ?`)){
      return;
    }

    await del(state.current.id);
  }else{
    if(!confirm(`Mettre « ${state.current.title} » dans la corbeille ?`)){
      return;
    }

    await put({
      ...state.current,
      deleted: true,
      deletedAt: new Date().toISOString(),
      archived: false,
      favorite: false
    });
  }

  els.modal.close();
  await refresh();
}

function updateModalActions(){
  const isDeleted = Boolean(state.current?.deleted);
  els.restoreDoc.hidden = !isDeleted;
  els.save.hidden = isDeleted;
  els.deleteDoc.textContent = isDeleted ? "Purger définitivement" : "Mettre à la corbeille";
}

function applyView(docs){
  let result = docs;

  if(state.view === "trash"){
    result = result.filter(doc=>doc.deleted);
  }else{
    result = result.filter(doc=>!doc.deleted);
  }

  if(state.view === "folders" || state.view === "timeline"){
    result = result.filter(doc=>!doc.archived);
  }else if(state.view === "recent"){
    result = recentDocs(result.filter(doc=>!doc.archived),20);
  }else if(state.view === "favorites"){
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
    deleted: false,
    deletedAt: null,
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
    deleted: false,
    deletedAt: null,
    dueDate: doc.dueDate || doc.due || null,
    relations: [],
    blocks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...doc
  };
}

function activeDocuments(){
  return state.docs.filter(doc=>!doc.deleted);
}

function stat(label,value,icon=""){
  return `<article class="stat"><strong>${icon} ${escapeHtml(value)}</strong><span>${label}</span></article>`;
}

function quickDocButton(doc,detail){
  return `<button class="due-item" data-id="${doc.id}"><span>${escapeHtml(doc.title)}</span><small>${escapeHtml(detail)}</small></button>`;
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

function groupByCategory(docs){
  const groups = new Map();
  docs.forEach(doc=>{
    const category = doc.category || "Sans catégorie";
    if(!groups.has(category)){
      groups.set(category,[]);
    }
    groups.get(category).push(doc);
  });

  return [...groups.entries()]
    .map(([category,folderDocs])=>[category,folderDocs.sort(byTitle)])
    .sort((a,b)=>b[1].length - a[1].length || a[0].localeCompare(b[0],"fr"));
}

function groupByTimeline(docs){
  const years = new Map();
  const formatter = new Intl.DateTimeFormat("fr-FR",{month:"long"});

  docs.forEach(doc=>{
    const date = new Date(doc.createdAt || doc.updatedAt);
    const year = date.getFullYear();
    const monthKey = `${date.getMonth() + 1}`.padStart(2,"0");
    const monthLabel = capitalize(formatter.format(date));

    if(!years.has(year)){
      years.set(year,new Map());
    }

    const months = years.get(year);
    if(!months.has(monthKey)){
      months.set(monthKey,{label:monthLabel,docs:[]});
    }

    months.get(monthKey).docs.push(doc);
  });

  return [...years.entries()]
    .sort((a,b)=>b[0] - a[0])
    .map(([year,months])=>[
      year,
      [...months.entries()]
        .sort((a,b)=>Number(b[0]) - Number(a[0]))
        .map(([,month])=>[month.label,month.docs.sort((a,b)=>new Date(b.createdAt) - new Date(a.createdAt))])
    ]);
}

function backlinksFor(id){
  return activeDocuments().filter(doc=>(doc.relations || []).includes(id));
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

function modifiedWithin(docs,days){
  const limit = new Date();
  limit.setDate(limit.getDate() - days);
  return docs.filter(doc=>new Date(doc.updatedAt) >= limit);
}

function recentDocs(docs,limit){
  return [...docs]
    .sort((a,b)=>new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0,limit);
}

function isExpiredTrash(doc){
  if(!doc.deleted || !doc.deletedAt){
    return false;
  }

  const purgeAfter = new Date(doc.deletedAt);
  purgeAfter.setDate(purgeAfter.getDate() + TRASH_RETENTION_DAYS);
  return purgeAfter < new Date();
}

function byTitle(a,b){
  return a.title.localeCompare(b.title,"fr");
}

function viewTitle(){
  if(state.filter){
    return `${state.filter.type === "tag" ? "Tag" : "Catégorie"} : ${state.filter.name}`;
  }

  return {
    all: "Accueil",
    folders: "Dossiers",
    timeline: "Timeline",
    recent: "Documents récents",
    favorites: "Favoris",
    archives: "Archives",
    due: "Échéances",
    trash: "Corbeille"
  }[state.view];
}

function formatDate(date){
  return new Intl.DateTimeFormat("fr-FR",{dateStyle:"medium"}).format(new Date(date.length === 10 ? `${date}T00:00:00` : date));
}

function relativeDate(date){
  const days = Math.max(0,Math.round((Date.now() - new Date(date).getTime()) / 86_400_000));
  if(days === 0){
    return "Aujourd'hui";
  }
  if(days === 1){
    return "Hier";
  }
  return `Il y a ${days} jours`;
}

function capitalize(value){
  return value.charAt(0).toUpperCase() + value.slice(1);
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
