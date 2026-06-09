export function searchDocs(docs,q){

  q = q.toLowerCase();

  return docs.filter(d=>{

    const text = [
      d.title,
      d.category,
      d.summary,
      d.notes,
      ...(d.tags||[])
    ].join(" ").toLowerCase();

    return text.includes(q);

  });

}
