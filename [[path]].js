const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function bad(message, status = 400) {
  return json({ error: message }, status);
}

function idFrom(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function requireAdmin(request, env) {
  if (!env.ADMIN_TOKEN) return null;
  const auth = request.headers.get('authorization') || '';
  if (auth !== `Bearer ${env.ADMIN_TOKEN}`) return bad('Unauthorised', 401);
  return null;
}

async function body(request) {
  try { return await request.json(); }
  catch { throw new Error('Request body must be valid JSON.'); }
}

async function getDocuments(db, includeDrafts = false) {
  const where = includeDrafts ? '' : 'WHERE d.published = 1';
  const docs = await db.prepare(`
    SELECT d.*,
      (SELECT COUNT(*) FROM votes v WHERE v.document_id = d.id) AS vote_count
    FROM documents d ${where}
    ORDER BY COALESCE(NULLIF(d.date_concluded,''), d.date_introduced) DESC, d.id DESC
  `).all();
  return docs.results || [];
}

async function getDocument(db, id, includeDrafts = false) {
  const doc = await db.prepare(`SELECT * FROM documents WHERE id = ? ${includeDrafts ? '' : 'AND published = 1'}`).bind(id).first();
  if (!doc) return null;
  const [stages, related, votes] = await Promise.all([
    db.prepare('SELECT * FROM document_stages WHERE document_id = ? ORDER BY sort_order, id').bind(id).all(),
    db.prepare(`SELECT d.id,d.ref,d.title,d.type,d.status FROM related_documents r JOIN documents d ON d.id=r.related_document_id WHERE r.document_id=? ORDER BY d.title`).bind(id).all(),
    db.prepare(`
      SELECT v.*, d.title AS document_title,
        SUM(CASE WHEN vc.choice='For' THEN 1 ELSE 0 END) AS votes_for,
        SUM(CASE WHEN vc.choice='Against' THEN 1 ELSE 0 END) AS votes_against,
        SUM(CASE WHEN vc.choice='Abstain' THEN 1 ELSE 0 END) AS abstain,
        SUM(CASE WHEN vc.choice='Absent' THEN 1 ELSE 0 END) AS absent
      FROM votes v JOIN documents d ON d.id=v.document_id
      LEFT JOIN vote_choices vc ON vc.vote_id=v.id
      WHERE v.document_id=? GROUP BY v.id ORDER BY v.vote_date DESC,v.id DESC
    `).bind(id).all()
  ]);
  doc.stages = stages.results || [];
  doc.related = related.results || [];
  doc.votes = votes.results || [];
  return doc;
}

async function getMembers(db, includeInactive = false) {
  const where = includeInactive ? '' : 'WHERE m.active = 1';
  const rows = await db.prepare(`
    SELECT m.*, COUNT(vc.vote_id) AS votes_recorded
    FROM members m LEFT JOIN vote_choices vc ON vc.member_id=m.id
    ${where} GROUP BY m.id ORDER BY m.name
  `).all();
  return rows.results || [];
}

async function getMember(db, id, includeInactive = false) {
  const member = await db.prepare(`SELECT * FROM members WHERE id=? ${includeInactive ? '' : 'AND active=1'}`).bind(id).first();
  if (!member) return null;
  const history = await db.prepare(`
    SELECT v.id AS vote_id,v.vote_date,v.vote_type,v.majority_rule,v.result_override,v.notes,
      vc.choice,d.id AS document_id,d.ref,d.title,d.type,d.status
    FROM vote_choices vc
    JOIN votes v ON v.id=vc.vote_id
    JOIN documents d ON d.id=v.document_id
    WHERE vc.member_id=? AND d.published=1
    ORDER BY v.vote_date DESC,v.id DESC
  `).bind(id).all();
  member.votes = history.results || [];
  member.votes_recorded = member.votes.length;
  return member;
}

async function getVotes(db, includeDrafts = false) {
  const published = includeDrafts ? '' : 'WHERE d.published=1';
  const rows = await db.prepare(`
    SELECT v.*,d.ref,d.title,d.type,d.status,
      SUM(CASE WHEN vc.choice='For' THEN 1 ELSE 0 END) AS votes_for,
      SUM(CASE WHEN vc.choice='Against' THEN 1 ELSE 0 END) AS votes_against,
      SUM(CASE WHEN vc.choice='Abstain' THEN 1 ELSE 0 END) AS abstain,
      SUM(CASE WHEN vc.choice='Absent' THEN 1 ELSE 0 END) AS absent
    FROM votes v JOIN documents d ON d.id=v.document_id
    LEFT JOIN vote_choices vc ON vc.vote_id=v.id
    ${published} GROUP BY v.id ORDER BY v.vote_date DESC,v.id DESC
  `).all();
  return rows.results || [];
}

async function getVote(db, id) {
  const vote = await db.prepare('SELECT v.*,d.title AS document_title,d.ref FROM votes v JOIN documents d ON d.id=v.document_id WHERE v.id=?').bind(id).first();
  if (!vote) return null;
  const choices = await db.prepare(`
    SELECT vc.member_id,vc.choice,m.name,m.title,m.constituency,m.party,m.affiliation
    FROM vote_choices vc JOIN members m ON m.id=vc.member_id
    WHERE vc.vote_id=? ORDER BY m.name
  `).bind(id).all();
  vote.choices = choices.results || [];
  return vote;
}

async function upsertDocument(db, data, id = null) {
  const fields = {
    ref: String(data.ref || '').trim(), citation: String(data.citation || '').trim(),
    title: String(data.title || '').trim(), type: String(data.type || '').trim(),
    status: String(data.status || '').trim(), date_introduced: String(data.date_introduced || ''),
    date_concluded: String(data.date_concluded || ''), sponsor: String(data.sponsor || '').trim(),
    ministry: String(data.ministry || '').trim(), session: String(data.session || '').trim(),
    summary: String(data.summary || '').trim(), content: String(data.content || ''),
    pdf_url: String(data.pdf_url || '').trim(), published: data.published ? 1 : 0
  };
  if (!fields.ref || !fields.title || !fields.type || !fields.status) throw new Error('Reference, title, type and status are required.');
  let documentId = id;
  if (id) {
    await db.prepare(`UPDATE documents SET ref=?,citation=?,title=?,type=?,status=?,date_introduced=?,date_concluded=?,sponsor=?,ministry=?,session=?,summary=?,content=?,pdf_url=?,published=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .bind(fields.ref,fields.citation,fields.title,fields.type,fields.status,fields.date_introduced,fields.date_concluded,fields.sponsor,fields.ministry,fields.session,fields.summary,fields.content,fields.pdf_url,fields.published,id).run();
  } else {
    const result = await db.prepare(`INSERT INTO documents (ref,citation,title,type,status,date_introduced,date_concluded,sponsor,ministry,session,summary,content,pdf_url,published) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(fields.ref,fields.citation,fields.title,fields.type,fields.status,fields.date_introduced,fields.date_concluded,fields.sponsor,fields.ministry,fields.session,fields.summary,fields.content,fields.pdf_url,fields.published).run();
    documentId = result.meta.last_row_id;
  }
  await db.prepare('DELETE FROM document_stages WHERE document_id=?').bind(documentId).run();
  const stages = Array.isArray(data.stages) ? data.stages : [];
  if (stages.length) await db.batch(stages.map((s,i)=>db.prepare('INSERT INTO document_stages (document_id,label,stage_date,completed,sort_order) VALUES (?,?,?,?,?)').bind(documentId,String(s.label||'').trim(),String(s.stage_date||''),s.completed?1:0,i)));
  await db.prepare('DELETE FROM related_documents WHERE document_id=?').bind(documentId).run();
  const related = [...new Set((Array.isArray(data.related_ids)?data.related_ids:[]).map(idFrom).filter(x=>x&&x!==documentId))];
  if (related.length) await db.batch(related.map(r=>db.prepare('INSERT OR IGNORE INTO related_documents (document_id,related_document_id) VALUES (?,?)').bind(documentId,r)));
  return documentId;
}

async function upsertMember(db, data, id = null) {
  const f = { name:String(data.name||'').trim(), title:String(data.title||'').trim(), constituency:String(data.constituency||'').trim(), party:String(data.party||'').trim(), affiliation:String(data.affiliation||'').trim(), biography:String(data.biography||'').trim(), active:data.active?1:0 };
  if (!f.name) throw new Error('Member name is required.');
  if (id) {
    await db.prepare('UPDATE members SET name=?,title=?,constituency=?,party=?,affiliation=?,biography=?,active=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(f.name,f.title,f.constituency,f.party,f.affiliation,f.biography,f.active,id).run();
    return id;
  }
  const result = await db.prepare('INSERT INTO members (name,title,constituency,party,affiliation,biography,active) VALUES (?,?,?,?,?,?,?)').bind(f.name,f.title,f.constituency,f.party,f.affiliation,f.biography,f.active).run();
  return result.meta.last_row_id;
}

async function upsertVote(db, data, id = null) {
  const documentId=idFrom(data.document_id);
  if (!documentId || !data.vote_date || !data.vote_type) throw new Error('Document, vote date and vote type are required.');
  let voteId=id;
  if(id){
    await db.prepare('UPDATE votes SET document_id=?,vote_date=?,vote_type=?,majority_rule=?,result_override=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(documentId,String(data.vote_date),String(data.vote_type),String(data.majority_rule||'simple'),String(data.result_override||''),String(data.notes||''),id).run();
  }else{
    const result=await db.prepare('INSERT INTO votes (document_id,vote_date,vote_type,majority_rule,result_override,notes) VALUES (?,?,?,?,?,?)').bind(documentId,String(data.vote_date),String(data.vote_type),String(data.majority_rule||'simple'),String(data.result_override||''),String(data.notes||'')).run();
    voteId=result.meta.last_row_id;
  }
  await db.prepare('DELETE FROM vote_choices WHERE vote_id=?').bind(voteId).run();
  const valid=new Set(['For','Against','Abstain','Absent']);
  const choices=Array.isArray(data.choices)?data.choices.filter(c=>idFrom(c.member_id)&&valid.has(c.choice)):[];
  if(choices.length) await db.batch(choices.map(c=>db.prepare('INSERT INTO vote_choices (vote_id,member_id,choice) VALUES (?,?,?)').bind(voteId,idFrom(c.member_id),c.choice)));
  return voteId;
}

export async function onRequest(context) {
  const { request, env, params } = context;
  if (!env.DB) return bad('D1 binding DB is missing.', 500);
  const method=request.method.toUpperCase();
  const path=(Array.isArray(params.path) ? params.path : String(params.path || '').split('/')).filter(Boolean);
  const [resource, rawId, sub] = path;
  const id=idFrom(rawId);
  const url=new URL(request.url);
  const admin=url.searchParams.get('admin')==='1';

  try {
    if (admin) { const denied=requireAdmin(request,env); if(denied) return denied; }
    if (method==='GET' && resource==='health') return json({ok:true});
    if (method==='GET' && resource==='documents' && !id) return json(await getDocuments(env.DB, admin));
    if (method==='GET' && resource==='documents' && id) { const x=await getDocument(env.DB,id,admin); return x?json(x):bad('Document not found.',404); }
    if (method==='GET' && resource==='members' && !id) return json(await getMembers(env.DB, admin));
    if (method==='GET' && resource==='members' && id) { const x=await getMember(env.DB,id,admin); return x?json(x):bad('Member not found.',404); }
    if (method==='GET' && resource==='votes' && !id) return json(await getVotes(env.DB, admin));
    if (method==='GET' && resource==='votes' && id) { const x=await getVote(env.DB,id); return x?json(x):bad('Vote not found.',404); }
    if (method==='GET' && resource==='bootstrap') {
      const [documents,members,votes]=await Promise.all([getDocuments(env.DB,admin),getMembers(env.DB,admin),getVotes(env.DB,admin)]);
      return json({documents,members,votes});
    }

    const denied=requireAdmin(request,env); if(denied) return denied;
    if (method==='POST' && resource==='documents') { const data=await body(request); const newId=await upsertDocument(env.DB,data); return json(await getDocument(env.DB,newId,true),201); }
    if (method==='PUT' && resource==='documents' && id) { const data=await body(request); await upsertDocument(env.DB,data,id); return json(await getDocument(env.DB,id,true)); }
    if (method==='DELETE' && resource==='documents' && id) { await env.DB.prepare('DELETE FROM documents WHERE id=?').bind(id).run(); return json({ok:true}); }
    if (method==='POST' && resource==='members') { const data=await body(request); const newId=await upsertMember(env.DB,data); return json(await getMember(env.DB,newId,true),201); }
    if (method==='PUT' && resource==='members' && id) { const data=await body(request); await upsertMember(env.DB,data,id); return json(await getMember(env.DB,id,true)); }
    if (method==='DELETE' && resource==='members' && id) { await env.DB.prepare('DELETE FROM members WHERE id=?').bind(id).run(); return json({ok:true}); }
    if (method==='POST' && resource==='votes') { const data=await body(request); const newId=await upsertVote(env.DB,data); return json(await getVote(env.DB,newId),201); }
    if (method==='PUT' && resource==='votes' && id) { const data=await body(request); await upsertVote(env.DB,data,id); return json(await getVote(env.DB,id)); }
    if (method==='DELETE' && resource==='votes' && id) { await env.DB.prepare('DELETE FROM votes WHERE id=?').bind(id).run(); return json({ok:true}); }
    return bad('Route not found.',404);
  } catch (error) {
    console.error(error);
    return bad(error.message || 'Unexpected server error.', 500);
  }
}
