import {initDB,getAll,put,del} from "./db.js";
import {searchDocs} from "./search.js";

let docs=[];
let current=null;

await initDB();
docs = await getAll();
render();

fileInput.onchange = async e=>{
  for(const f of e.target.files){

    await put({
      id:crypto.randomUUID(),
      title:f.name,
      file:f,

      category:"",
      tags:[],
      summary:"",
      notes:"",
      due:null,

      favorite:false,
      archived:false
    });

  }

  docs = await getAll();
  render();
};

function render(list=docs){

  const q = search.value;

  let d = searchDocs(list,q);

  listEl.innerHTML="";

  d.forEach(x=>{

    const el = document.createElement("div");
    el.className="card";

    el.innerHTML=`
      <b>${x.title}</b><br>
      <small>${x.category||"—"}</small>
    `;

    el.onclick=()=>open(x);

    listEl.appendChild(el);

  });

}

function open(doc){
  current=doc;

  mTitle.textContent=doc.title;
  mCategory.value=doc.category;
  mTags.value=(doc.tags||[]).join(",");
  mSummary.value=doc.summary;
  mNotes.value=doc.notes;
  mFav.checked=doc.favorite;
  mArch.checked=doc.archived;

  modal.showModal();
}

save.onclick=async()=>{

  current.category=mCategory.value;
  current.tags=mTags.value.split(",").map(t=>t.trim());
  current.summary=mSummary.value;
  current.notes=mNotes.value;
  current.favorite=mFav.checked;
  current.archived=mArch.checked;

  await put(current);

  modal.close();
  docs = await getAll();
  render();
};
