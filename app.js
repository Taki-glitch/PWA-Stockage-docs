const fileInput =
  document.getElementById("fileInput");

const documentsList =
  document.getElementById("documentsList");

const searchInput =
  document.getElementById("searchInput");

const modal =
  document.getElementById("documentModal");

const modalTitle =
  document.getElementById("modalTitle");

const modalType =
  document.getElementById("modalType");

const closeModal =
  document.getElementById("closeModal");

const openDocumentBtn =
  document.getElementById("openDocumentBtn");

const deleteDocumentBtn =
  document.getElementById("deleteDocumentBtn");

const themeToggle =
  document.getElementById("themeToggle");

let documents = [];

let selectedDocument = null;

/* -------------------- */
/* INIT */
/* -------------------- */

window.addEventListener("load", async () => {

  await openDB();

  await loadDocuments();

  initTheme();

  registerServiceWorker();

});

/* -------------------- */
/* THEME */
/* -------------------- */

function initTheme() {

  const savedTheme =
    localStorage.getItem("theme");

  if (savedTheme === "dark") {

    document.body.classList.add("dark");

    themeToggle.textContent = "☀️";

  }

}

themeToggle.addEventListener("click", () => {

  document.body.classList.toggle("dark");

  const isDark =
    document.body.classList.contains("dark");

  localStorage.setItem(
    "theme",
    isDark ? "dark" : "light"
  );

  themeToggle.textContent =
    isDark ? "☀️" : "🌙";

});

/* -------------------- */
/* IMPORT */
/* -------------------- */

fileInput.addEventListener("change", async (e) => {

  const file = e.target.files[0];

  if (!file) return;

  const doc = {

    id: crypto.randomUUID(),

    title: file.name,

    type: file.type,

    createdAt: Date.now(),

    file

  };

  await addDocument(doc);

  await loadDocuments();

  fileInput.value = "";

});

/* -------------------- */
/* LOAD */
/* -------------------- */

async function loadDocuments() {

  documents =
    await getAllDocuments();

  renderDocuments(documents);

}

/* -------------------- */
/* SEARCH */
/* -------------------- */

searchInput.addEventListener("input", () => {

  const query =
    searchInput.value.toLowerCase();

  const filtered =
    documents.filter(doc =>
      doc.title
        .toLowerCase()
        .includes(query)
    );

  renderDocuments(filtered);

});

/* -------------------- */
/* RENDER */
/* -------------------- */

function renderDocuments(list) {

  if (!list.length) {

    documentsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📂</div>
        <h2>Aucun document</h2>
        <p>Ajoutez votre premier PDF ou image.</p>
      </div>
    `;

    return;
  }

  documentsList.innerHTML = "";

  list.sort(
    (a, b) => b.createdAt - a.createdAt
  );

  list.forEach(doc => {

    const card =
      document.createElement("div");

    card.className =
      "document-card";

    card.innerHTML = `
      <div class="document-title">
        ${doc.title}
      </div>

      <div class="document-meta">
        ${formatType(doc.type)}
      </div>
    `;

    card.addEventListener(
      "click",
      () => showDocument(doc)
    );

    documentsList.appendChild(card);

  });

}

/* -------------------- */
/* DOCUMENT MODAL */
/* -------------------- */

function showDocument(doc) {

  selectedDocument = doc;

  modalTitle.textContent =
    doc.title;

  modalType.textContent =
    formatType(doc.type);

  modal.showModal();

}

closeModal.addEventListener(
  "click",
  () => modal.close()
);

/* -------------------- */
/* OPEN */
/* -------------------- */

openDocumentBtn.addEventListener(
  "click",
  () => {

    if (!selectedDocument) return;

    const url =
      URL.createObjectURL(
        selectedDocument.file
      );

    window.open(url, "_blank");

  }
);

/* -------------------- */
/* DELETE */
/* -------------------- */

deleteDocumentBtn.addEventListener(
  "click",
  async () => {

    if (!selectedDocument) return;

    const confirmed =
      confirm(
        "Supprimer ce document ?"
      );

    if (!confirmed) return;

    await deleteDocument(
      selectedDocument.id
    );

    modal.close();

    await loadDocuments();

  }
);

/* -------------------- */
/* HELPERS */
/* -------------------- */

function formatType(type) {

  if (
    type.includes("pdf")
  ) {
    return "📄 PDF";
  }

  if (
    type.includes("image")
  ) {
    return "🖼 Image";
  }

  return type;

}

/* -------------------- */
/* SERVICE WORKER */
/* -------------------- */

function registerServiceWorker() {

  if (
    "serviceWorker" in navigator
  ) {

    navigator.serviceWorker
      .register(
        "./service-worker.js"
      )
      .catch(console.error);

  }

}
