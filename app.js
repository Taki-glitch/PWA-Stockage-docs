let documents = [];
let selectedDocument = null;

const fileInput = document.getElementById("fileInput");
const searchInput = document.getElementById("searchInput");

const modal = document.getElementById("documentModal");

const editTitle = document.getElementById("editTitle");
const editCategory = document.getElementById("editCategory");
const editTags = document.getElementById("editTags");
const editSummary = document.getElementById("editSummary");
const editNotes = document.getElementById("editNotes");

const editFavorite = document.getElementById("editFavorite");
const editArchived = document.getElementById("editArchived");

const documentsList = document.getElementById("documentsList");

const documentsCount = document.getElementById("documentsCount");
const favoritesCount = document.getElementById("favoritesCount");
const archivesCount = document.getElementById("archivesCount");

const categoryFilter = document.getElementById("categoryFilter");

const saveBtn = document.getElementById("saveDocumentBtn");
const openBtn = document.getElementById("openDocumentBtn");
const deleteBtn = document.getElementById("deleteDocumentBtn");

const closeModal = document.getElementById("closeModal");

let currentFilter = {
  search: "",
  favorites: false,
  archives: false,
  category: ""
};

/* ---------------- INIT ---------------- */

window.addEventListener("load", async () => {
  await openDB();
  await loadDocuments();
  initTheme();
  registerSW();
});

/* ---------------- LOAD ---------------- */

async function loadDocuments() {
  documents = await getAllDocuments();
  render();
  updateStats();
  updateCategories();
}

/* ---------------- ADD FILE ---------------- */

fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const doc = {
    id: crypto.randomUUID(),
    title: file.name,
    type: file.type,
    createdAt: Date.now(),
    file,

    category: "",
    tags: [],
    summary: "",
    notes: "",
    favorite: false,
    archived: false
  };

  await addDocument(doc);
  await loadDocuments();

  fileInput.value = "";
});

/* ---------------- SEARCH ---------------- */

searchInput.addEventListener("input", (e) => {
  currentFilter.search = e.target.value;
  render();
});

/* ---------------- FILTER BUTTONS ---------------- */

document.getElementById("showFavorites")
  .addEventListener("click", () => {
    currentFilter.favorites = !currentFilter.favorites;
    render();
  });

document.getElementById("showArchives")
  .addEventListener("click", () => {
    currentFilter.archives = !currentFilter.archives;
    render();
  });

categoryFilter.addEventListener("change", (e) => {
  currentFilter.category = e.target.value;
  render();
});

/* ---------------- RENDER ---------------- */

function render() {

  let list = [...documents];

  if (currentFilter.favorites) {
    list = list.filter(d => d.favorite);
  }

  if (currentFilter.archives) {
    list = list.filter(d => d.archived);
  } else {
    list = list.filter(d => !d.archived);
  }

  if (currentFilter.category) {
    list = list.filter(d =>
      d.category === currentFilter.category
    );
  }

  if (currentFilter.search) {
    list = list.filter(d => matchesSearch(d, currentFilter.search));
  }

  list.sort((a, b) => b.createdAt - a.createdAt);

  if (!list.length) {
    documentsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📂</div>
        <h2>Aucun document</h2>
      </div>
    `;
    return;
  }

  documentsList.innerHTML = "";

  list.forEach(doc => {
    const el = document.createElement("div");
    el.className = "document-card";

    el.innerHTML = `
      <div class="document-title">${doc.title}</div>
      <div class="document-meta">
        ${doc.category || "Sans catégorie"}
      </div>
      <div class="document-tags">
        ${(doc.tags || []).map(t => `<span class="tag">#${t}</span>`).join("")}
      </div>
    `;

    el.onclick = () => openEditor(doc);

    documentsList.appendChild(el);
  });
}

/* ---------------- SEARCH ENGINE ---------------- */

function matchesSearch(doc, q) {
  const text = [
    doc.title,
    doc.category,
    doc.summary,
    doc.notes,
    ...(doc.tags || [])
  ].join(" ").toLowerCase();

  return text.includes(q.toLowerCase());
}

/* ---------------- EDITOR ---------------- */

function openEditor(doc) {
  selectedDocument = doc;

  editTitle.value = doc.title || "";
  editCategory.value = doc.category || "";
  editTags.value = (doc.tags || []).join(", ");
  editSummary.value = doc.summary || "";
  editNotes.value = doc.notes || "";
  editFavorite.checked = doc.favorite || false;
  editArchived.checked = doc.archived || false;

  modal.showModal();
}

/* ---------------- SAVE ---------------- */

saveBtn.onclick = async () => {

  if (!selectedDocument) return;

  selectedDocument.title = editTitle.value;
  selectedDocument.category = editCategory.value;

  selectedDocument.tags = editTags.value
    .split(",")
    .map(t => t.trim())
    .filter(Boolean);

  selectedDocument.summary = editSummary.value;
  selectedDocument.notes = editNotes.value;

  selectedDocument.favorite = editFavorite.checked;
  selectedDocument.archived = editArchived.checked;

  await updateDocument(selectedDocument);

  modal.close();
  await loadDocuments();
};

/* ---------------- DELETE ---------------- */

deleteBtn.onclick = async () => {
  if (!selectedDocument) return;

  await deleteDocument(selectedDocument.id);

  modal.close();
  await loadDocuments();
};

/* ---------------- OPEN FILE ---------------- */

openBtn.onclick = () => {
  if (!selectedDocument) return;

  const url = URL.createObjectURL(selectedDocument.file);
  window.open(url, "_blank");
};

/* ---------------- STATS ---------------- */

function updateStats() {
  documentsCount.textContent = documents.length;
  favoritesCount.textContent =
    documents.filter(d => d.favorite).length;
  archivesCount.textContent =
    documents.filter(d => d.archived).length;
}

/* ---------------- CATEGORIES ---------------- */

function updateCategories() {
  const categories = [...new Set(
    documents.map(d => d.category).filter(Boolean)
  )];

  categoryFilter.innerHTML = `
    <option value="">Toutes les catégories</option>
    ${categories.map(c =>
      `<option value="${c}">${c}</option>`
    ).join("")}
  `;
}

/* ---------------- THEME ---------------- */

function initTheme() {
  const t = localStorage.getItem("theme");

  if (t === "dark") {
    document.body.classList.add("dark");
  }
}

document.getElementById("themeToggle")
  .onclick = () => {
    document.body.classList.toggle("dark");

    localStorage.setItem(
      "theme",
      document.body.classList.contains("dark")
        ? "dark"
        : "light"
    );
  };

/* ---------------- SW ---------------- */

function registerSW() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js");
  }
}

/* ---------------- MODAL CLOSE ---------------- */

closeModal.onclick = () => modal.close();
