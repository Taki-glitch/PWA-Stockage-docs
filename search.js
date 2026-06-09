export function searchDocs(docs,query){
  const normalized = query.trim().toLowerCase();

  if(!normalized){
    return docs;
  }

  return docs.filter(doc=>matches(doc,normalized));
}

export function matches(doc,query){
  const blocksText = (doc.blocks || [])
    .map(block=>block.content)
    .join(" ");

  const text = [
    doc.title,
    doc.category,
    doc.summary,
    doc.notes,
    blocksText,
    ...(doc.tags || [])
  ].join(" ").toLowerCase();

  return text.includes(query.toLowerCase());
}
