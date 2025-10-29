// Shared helpers for SkillSwap frontend
function ge(id){ return document.getElementById(id); }
function token(){ return localStorage.getItem('token'); }
function guard(){ if(!token()) location.href='/'; }
function hdr(){ return { 'Authorization': 'Bearer '+token(), 'Content-Type': 'application/json' }; }
function toast(t){ const el=ge('toast'); if(!el) return; el.textContent=t; el.style.display='block'; setTimeout(()=>el.style.display='none',3500); }

// AUTH
async function register(){
  const name = ge('name')?.value || 'Visitante';
  const email= ge('email')?.value;
  const password = ge('pass')?.value;
  const r = await fetch('/auth/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name,email,password}) });
  const j = await r.json();
  if(j.token){ localStorage.setItem('token', j.token); toast('Conta criada!'); }
  const out = ge('auth_msg'); if(out) out.textContent = JSON.stringify(j,null,2);
}
async function login(){
  const email= ge('email')?.value;
  const password = ge('pass')?.value;
  const r = await fetch('/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email,password}) });
  const j = await r.json();
  if(j.token){ localStorage.setItem('token', j.token); location.href = '/dashboard'; }
  const out = ge('auth_msg'); if(out) out.textContent = JSON.stringify(j,null,2);
}
function logout(){ localStorage.removeItem('token'); location.href='/'; }
async function me(){
  const r = await fetch('/me', { headers: { 'Authorization': 'Bearer '+token() }});
  const j = await r.json();
  if(ge('me')) ge('me').textContent = j.user?.email + (j.user?.is_premium ? ' • ⭐ Premium' : '');
}

// SEARCH (public)
async function search(){
  const q = ge('q')?.value || '';
  const r = await fetch('/skills/search?q='+encodeURIComponent(q));
  const list = await r.json();
  const out = ge('results');
  if(!out) return;
  out.innerHTML='';
  list.forEach(s => {
    const a = document.createElement('a');
    a.href = '#';
    a.innerHTML = `<b>${s.name}</b> ${s.is_featured?'<span class="badge">⭐ Destaque</span>':''}<br><span class="muted small">${s.description||''} — por ${s.user_name}</span>`;
    out.appendChild(a);
  });
}

// SKILLS CRUD
async function addOffered(){
  const name = ge('oname')?.value, description = ge('odesc')?.value;
  await fetch('/skills/offered', { method:'POST', headers: hdr(), body: JSON.stringify({name,description}) });
  loadOffered();
}
async function loadOffered(){
  const r = await fetch('/skills/offered', { headers:{ 'Authorization':'Bearer '+token() }});
  const list = await r.json();
  const tb = document.querySelector('#offered tbody');
  if(!tb) return;
  tb.innerHTML='';
  list.forEach(s=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${s.name}</td><td>${s.description||''}</td><td>${s.is_featured?'⭐':''}</td>
      <td><button onclick="delOff(${s.id})">Excluir</button></td>`;
    tb.appendChild(tr);
  });
}
async function delOff(id){
  await fetch('/skills/offered/'+id, { method:'DELETE', headers:{ 'Authorization':'Bearer '+token() }});
  loadOffered();
}

async function addWanted(){
  const name = ge('wname')?.value, description = ge('wdesc')?.value;
  await fetch('/skills/wanted', { method:'POST', headers: hdr(), body: JSON.stringify({name,description}) });
  loadWanted();
}
async function loadWanted(){
  const r = await fetch('/skills/wanted', { headers:{ 'Authorization':'Bearer '+token() }});
  const list = await r.json();
  const tb = document.querySelector('#wanted tbody');
  if(!tb) return;
  tb.innerHTML='';
  list.forEach(s=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${s.name}</td><td>${s.description||''}</td><td></td>`;
    tb.appendChild(tr);
  });
}

// CHATS & MATCHES
async function loadChats(){
  const r = await fetch('/chat/list', { headers:{ 'Authorization':'Bearer '+token() }});
  const list = await r.json();
  const div = ge('chats'); if(!div) return;
  div.innerHTML='';
  list.forEach(c=>{
    const a = document.createElement('a');
    a.href = '/chat?user='+c.id;
    a.textContent = `#${c.id} • ${c.name} — ${c.last_message||''}`;
    div.appendChild(a);
  });
}
async function loadMatches(){
  const r = await fetch('/admin/stats', { headers:{ 'Authorization':'Bearer '+token() }});
  const j = await r.json();
  const el = ge('matches'); if(el) el.textContent = 'Matches totais: ' + (j.matches || 0);
}

// CHAT PAGE HELPERS
async function openChat(){
  const other = Number(ge('other')?.value);
  if(!other) return;
  const r = await fetch('/chat/history/'+other, { headers:{ 'Authorization':'Bearer '+token() }});
  const list = await r.json();
  const box = ge('chat');
  if(!box) return;
  box.innerHTML='';
  list.forEach(m => appendBubble(m.conteudo, m.remetente_id !== other));
}
function appendBubble(text, isMe){
  const d = document.createElement('div');
  d.className = 'bubble ' + (isMe ? 'me':'them');
  d.textContent = text;
  ge('chat').appendChild(d);
  ge('chat').scrollTop = ge('chat').scrollHeight;
}
async function sendMsg(){
  const to = Number(ge('other')?.value);
  const content = ge('msg')?.value;
  if(!to || !content) return;
  await fetch('/chat/send', { method:'POST', headers: hdr(), body: JSON.stringify({to,content}) });
  appendBubble(content, true);
  ge('msg').value='';
}

// PIX
async function buyPremium(){
  const r = await fetch('/payments/pix', { method:'POST', headers: hdr(), body: JSON.stringify({ tipo_pagamento:'premium', valor: 9.90 }) });
  const p = await r.json();
  showQR(p);
}
async function donateSite(){
  const r = await fetch('/payments/pix', { method:'POST', headers: hdr(), body: JSON.stringify({ tipo_pagamento:'doacao_site', valor: 5.00 }) });
  const p = await r.json();
  showQR(p);
}
function showQR(p){
  const div = ge('pix'); if(!div) return;
  div.innerHTML='';
  if(p.qr_code_base64){
    const img = new Image();
    img.src = 'data:image/png;base64,'+p.qr_code_base64;
    img.style.maxWidth='260px';
    div.appendChild(img);
  }else if(p.ticket_url){
    const a = document.createElement('a');
    a.href = p.ticket_url; a.target='_blank';
    a.textContent='Abrir pagamento PIX';
    div.appendChild(a);
  }else{
    div.textContent='Não foi possível gerar QR (verifique token sandbox).';
  }
}

// ADMIN
let adminToken=null;
async function adminLogin(){
  const email = ge('email')?.value, password = ge('pass')?.value;
  const r = await fetch('/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email,password}) });
  const j = await r.json();
  adminToken = j.token; if(!adminToken){ alert('Falha no login'); return; }
  await loadStats(); await loadUsers();
}
async function loadStats(){
  const r = await fetch('/admin/stats', { headers:{ 'Authorization':'Bearer '+(adminToken || token()) }});
  const j = await r.json();
  if(ge('stats')) ge('stats').textContent = JSON.stringify(j,null,2);
}
async function loadUsers(){
  const r = await fetch('/admin/users', { headers:{ 'Authorization':'Bearer '+(adminToken || token()) }});
  const list = await r.json();
  const tb = document.querySelector('#users tbody'); if(!tb) return;
  tb.innerHTML='';
  list.forEach(u=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${u.id}</td><td>${u.name||''}</td><td>${u.email}</td><td>${u.is_premium?'⭐':''}</td><td>${u.is_admin?'✔':''}</td><td>${new Date(u.data_criacao).toLocaleString()}</td>`;
    tb.appendChild(tr);
  });
}
