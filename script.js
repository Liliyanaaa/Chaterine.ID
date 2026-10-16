/* SETUP SUPABASE: jalankan sekali di SQL Editor
create table if not exists profiles(id uuid primary key default gen_random_uuid(),username text unique,password text,name text,email text,is_developer bool default false,avatar_url text,banner_url text,bio text);
create table if not exists follows(id uuid primary key default gen_random_uuid(),follower_id uuid references profiles(id) on delete cascade,following_id uuid references profiles(id) on delete cascade,created_at timestamp default now(),unique(follower_id,following_id));
create table if not exists messages(id uuid primary key default gen_random_uuid(),sender_id uuid,receiver_id uuid,content text,created_at timestamp default now());
alter table profiles disable row level security;alter table follows disable row level security;alter table messages disable row level security;
insert into storage.buckets(id,name,public) values('media','media',true) on conflict do nothing;
create policy "media all" on storage.objects for all to anon using(bucket_id='media') with check(bucket_id='media');
*/
const SB_URL='https://tqpdleuwxehpvyatyfun.supabase.co',SB_KEY='sb_publishable_kMUvvyf3amxgefhiBWT5NA_STVQSp-5';
const AI_URL='https://nexus-sealyn-ai-deve-m9l5.bolt.host/';
const SAMPLE='https://www.tiktok.com/@scout2015/video/6718335390845095173';
const sb=supabase.createClient(SB_URL,SB_KEY);
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
let me=null,peer=null,poll=null,lastSig='';const cache={};

/* ikon SVG inline */
const IC={home:'M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z',search:'M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-4.3-4.3',download:'M12 3v12m0 0l-4-4m4 4l4-4M4 20h16',ai:'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',chat:'M21 12a8 8 0 01-11.6 7.1L3 21l1.9-5.4A8 8 0 1121 12z',user:'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',lock:'M6 11h12v9H6zM8 11V8a4 4 0 018 0v3',send:'M21 3L10 14M21 3l-7 18-4-7-7-4z',back:'M15 5l-7 7 7 7',close:'M6 6l12 12M18 6L6 18',edit:'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',check:'M5 12l5 5 9-10'};
const FILL={play:'M8 5v14l11-7z',google:'M21.8 10.2H12v3.9h5.6c-.5 2.5-2.6 4-5.6 4a6.2 6.2 0 010-12.4c1.6 0 3 .6 4.1 1.5l2.8-2.8A10.2 10.2 0 0012 1.8a10.2 10.2 0 100 20.4c5.9 0 10.2-4.1 10.2-10.1 0-.7-.1-1.3-.4-1.9z',tiktok:'M12.5 2h3.2c.2 1.9 1.3 3.5 3.3 3.8v3.3c-1.2 0-2.4-.4-3.4-1v6.3a5.9 5.9 0 11-5.9-5.9c.3 0 .6 0 .9.1v3.4a2.6 2.6 0 102 2.5V2z'};
const ic=n=>FILL[n]?`<svg viewBox="0 0 24 24" fill="currentColor"><path d="${FILL[n]}"/></svg>`:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${IC[n]}"/></svg>`;
const paint=(r=document)=>$$('i[data-i]',r).forEach(e=>e.innerHTML=ic(e.dataset.i));
const html=(el,h)=>{el.innerHTML=h;paint(el)};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let tt;const toast=t=>{const e=$('#toast');e.textContent=t;e.hidden=false;clearTimeout(tt);tt=setTimeout(()=>e.hidden=true,2600)};

/* media: foto atau video (video auto-play loop) */
const isVid=u=>/\.(mp4|webm|mov|m4v)(\?|$)/i.test(u||'');
const media=(u,n)=>u?(isVid(u)?`<video src="${esc(u)}" autoplay loop muted playsinline></video>`:`<img src="${esc(u)}" alt="">`):`<b>${esc((n||'?')[0].toUpperCase())}</b>`;
const av=p=>`<span class="av">${media(p.avatar_url,p.name||p.username)}</span>`;
const dev=()=>`<span class="badge"><i data-i="check"></i>Developer</span>`;
const rowU=u=>`<div class="row" data-c="${u.id}">${av(u)}<div class="grow"><b>${esc(u.name||u.username)}</b><small>@${esc(u.username)}</small></div></div>`;

/* enkripsi pesan: AES-GCM 256 (Web Crypto), kunci per pasangan user */
const enc=new TextEncoder(),dec=new TextDecoder(),keys={};
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b))),unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const sha=async t=>b64(await crypto.subtle.digest('SHA-256',enc.encode(t)));
const key=(a,b)=>keys[[a,b].sort().join()]??=(async()=>{const m=await crypto.subtle.importKey('raw',enc.encode([a,b].sort().join(':')),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt:enc.encode('chaterine-e2e'),iterations:100000,hash:'SHA-256'},m,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])})();
async function seal(t,other){const iv=crypto.getRandomValues(new Uint8Array(12)),c=await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(me.id,other),enc.encode(t)),o=new Uint8Array(12+c.byteLength);o.set(iv);o.set(new Uint8Array(c),12);return b64(o)}
async function unseal(s,other){try{const o=unb64(s);return dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:o.slice(0,12)},await key(me.id,other),o.slice(12)))}catch{return '[pesan tidak bisa dibuka]'}}

/* auth */
const msg=(t,ok)=>{const e=$('#auth-msg');e.textContent=t||'';e.className='msg'+(ok?' ok':'')};
const clean=u=>String(u).trim().toLowerCase().replace(/^@/,'');
$$('.seg button').forEach(b=>b.onclick=()=>{$$('.seg button').forEach(x=>x.classList.toggle('on',x===b));$('#f-login').hidden=b.dataset.tab!=='login';$('#f-reg').hidden=b.dataset.tab!=='reg';msg('');if(b.dataset.tab==='reg')$('#reg-vid').play().catch(()=>{})});
$('#f-reg').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),u=clean(f.get('username')),pw=f.get('password'),name=f.get('name').trim();
 if(!/^[a-z0-9_.]{3,20}$/.test(u))return msg('Username 3-20 karakter: huruf, angka, titik, atau garis bawah.');
 if(pw.length<6)return msg('Password minimal 6 karakter.');
 const{data,error}=await sb.from('profiles').insert({username:u,password:await sha(u+':'+pw),name}).select().single();
 if(error)return msg(error.code==='23505'?'Username sudah dipakai.':'Gagal daftar: '+error.message);
 start(data)};
$('#f-login').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),u=clean(f.get('username'));
 const{data}=await sb.from('profiles').select('*').eq('username',u).maybeSingle();
 if(!data||data.password!==await sha(u+':'+f.get('password')))return msg('Username atau password salah.');
 start(data)};
$('#b-google').onclick=()=>sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.href.split('#')[0]}});
$('#b-tiktok').onclick=()=>toast('Fitur ini segera hadir.');
function start(p){me=p;localStorage.setItem('chaterine_uid',p.id);$('#auth').hidden=true;$('#app').hidden=false;home();go('home')}
async function logout(){await sb.auth.signOut();localStorage.removeItem('chaterine_uid');location.reload()}
(async()=>{paint();
 const{data:{session}}=await sb.auth.getSession();
 if(session){const u=session.user,m=u.user_metadata||{};let{data:p}=await sb.from('profiles').select('*').eq('id',u.id).maybeSingle();
  if(!p){const base=(u.email||'user').split('@')[0].toLowerCase().replace(/[^a-z0-9_.]/g,'').slice(0,14)||'user';
   ({data:p}=await sb.from('profiles').insert({id:u.id,username:base+Math.floor(Math.random()*900+100),name:m.full_name||base,email:u.email,avatar_url:m.avatar_url}).select().single())}
  if(p)return start(p)}
 const id=localStorage.getItem('chaterine_uid');
 if(id){const{data:p}=await sb.from('profiles').select('*').eq('id',id).maybeSingle();if(p)start(p)}})();

/* navigasi */
function go(n){$$('.page').forEach(p=>p.hidden=p.id!=='p-'+n);$$('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.go===n));
 if(n==='ai'&&!$('#ai-frame').getAttribute('src'))$('#ai-frame').src=AI_URL;
 if(n==='chat')loadChats();if(n==='me')loadProfile();scrollTo(0,0)}
document.addEventListener('click',e=>{const t=e.target;let x;
 if(x=t.closest('[data-go]'))go(x.dataset.go);
 else if(x=t.closest('[data-c]'))openChat(cache[x.dataset.c]);
 else if(x=t.closest('[data-f]'))follow(x.dataset.f,x);
 else if(x=t.closest('[data-l]'))list(x.dataset.l)});
const home=()=>html($('#hello'),`Halo, ${esc(me.name||me.username)}${me.is_developer?dev():''}`);
$('#save-trend').onclick=()=>{go('dl');$('#dl-url').value=SAMPLE};

/* cari */
let st;$('#q').oninput=e=>{clearTimeout(st);st=setTimeout(()=>search(e.target.value),300)};
async function search(v){v=clean(v).replace(/[%_]/g,'');const box=$('#res');
 if(!v)return box.innerHTML='<p class="empty">Ketik username untuk mulai mencari.</p>';
 const{data}=await sb.from('profiles').select('id,username,name,avatar_url').ilike('username','%'+v+'%').neq('id',me.id).limit(20);
 const{data:fl}=await sb.from('follows').select('following_id').eq('follower_id',me.id),fs=new Set((fl||[]).map(x=>x.following_id));
 html(box,data?.length?data.map(u=>{cache[u.id]=u;const on=fs.has(u.id);return`<div class="row">${av(u)}<div class="grow"><b>${esc(u.name||'')}</b><small>@${esc(u.username)}</small></div><button class="chip${on?' on':''}" data-f="${u.id}">${on?'Mengikuti':'Ikuti'}</button><button class="chip pink" data-c="${u.id}">Chat</button></div>`}).join(''):`<p class="empty">Username @${esc(v)} tidak ditemukan.</p>`)}
async function follow(id,b){const on=b.classList.contains('on');
 if(on)await sb.from('follows').delete().eq('follower_id',me.id).eq('following_id',id);else await sb.from('follows').insert({follower_id:me.id,following_id:id});
 b.classList.toggle('on',!on);b.textContent=on?'Ikuti':'Mengikuti'}

/* download (TikTok lewat API publik tikwm) */
const abs=s=>s&&s.startsWith('/')?'https://www.tikwm.com'+s:s;
$('#f-dl').onsubmit=async e=>{e.preventDefault();const url=$('#dl-url').value.trim(),o=$('#dl-out');
 if(!/^https?:\/\//i.test(url))return o.innerHTML='<p class="msg">Tempel link yang diawali https://</p>';
 if(!/tiktok\.com/i.test(url))return o.innerHTML='<p class="msg">Saat ini hanya link TikTok yang bisa diunduh. Reels dan Shorts butuh server sendiri.</p>';
 o.innerHTML='<p class="empty">Mengambil video...</p>';
 try{const r=await(await fetch('https://www.tikwm.com/api/?url='+encodeURIComponent(url))).json();if(r.code!==0)throw 0;const d=r.data;
  html(o,`<div class="row dlcard"><img src="${esc(abs(d.cover))}" alt=""><div class="grow"><b>${esc(d.title||'Video TikTok')}</b><a class="chip pink" href="${esc(abs(d.hdplay||d.play))}" target="_blank" rel="noopener" download>Simpan video</a></div></div>`)}
 catch{o.innerHTML='<p class="msg">Video tidak bisa diambil. Pastikan link publik, lalu coba lagi.</p>'}};

/* chat */
async function loadChats(){const box=$('#chats');
 const{data}=await sb.from('messages').select('sender_id,receiver_id').or(`sender_id.eq.${me.id},receiver_id.eq.${me.id}`).order('created_at',{ascending:false}).limit(300);
 const ids=[...new Set((data||[]).map(m=>m.sender_id===me.id?m.receiver_id:m.sender_id))];
 if(!ids.length)return box.innerHTML='<p class="empty">Belum ada percakapan. Cari teman dulu, lalu tekan Chat.</p>';
 const{data:us}=await sb.from('profiles').select('id,username,name,avatar_url').in('id',ids),by=Object.fromEntries((us||[]).map(u=>[u.id,u]));
 html(box,ids.filter(i=>by[i]).map(i=>{cache[i]=by[i];return rowU(by[i])}).join(''))}
async function openChat(u){if(!u)return;peer=u;sheet(false);$('#chat').hidden=false;$('#cp-name').textContent=u.name||u.username;$('#cp-av').innerHTML=media(u.avatar_url,u.name||u.username);$('#msgs').innerHTML='';lastSig='';clearInterval(poll);await refresh();poll=setInterval(refresh,3000)}
async function refresh(){if(!peer)return;const a=me.id,b=peer.id;
 const{data}=await sb.from('messages').select('*').or(`and(sender_id.eq.${a},receiver_id.eq.${b}),and(sender_id.eq.${b},receiver_id.eq.${a})`).order('created_at').limit(200);
 const sig=(data||[]).map(m=>m.id).join();if(sig===lastSig)return;lastSig=sig;
 const rows=await Promise.all((data||[]).map(async m=>`<div class="bub ${m.sender_id===a?'out':'in'}">${esc(await unseal(m.content,b))}</div>`));
 if(!peer||peer.id!==b)return;const box=$('#msgs');
 box.innerHTML=rows.join('')||'<p class="empty">Mulai percakapan. Pesan dienkripsi sebelum dikirim.</p>';box.scrollTop=box.scrollHeight}
$('#f-msg').onsubmit=async e=>{e.preventDefault();const i=$('#msg-in'),t=i.value.trim();if(!t||!peer)return;i.value='';
 const{error}=await sb.from('messages').insert({sender_id:me.id,receiver_id:peer.id,content:await seal(t,peer.id)});
 if(error){i.value=t;return toast('Pesan gagal terkirim.')}refresh()};
$('#ch-back').onclick=()=>{clearInterval(poll);peer=null;$('#chat').hidden=true;if(!$('#p-chat').hidden)loadChats()};

/* profil */
async function loadProfile(){const cnt=c=>sb.from('follows').select('*',{count:'exact',head:true}).eq(c,me.id);
 const[a,b]=await Promise.all([cnt('follower_id'),cnt('following_id')]);
 html($('#prof'),`<div class="banner">${me.banner_url?media(me.banner_url):''}<button class="x" id="ed2" aria-label="Edit banner"><i data-i="edit"></i></button></div>
 <div class="ph"><span class="av xl">${media(me.avatar_url,me.name||me.username)}</span></div>
 <h2>${esc(me.name||me.username)}${me.is_developer?dev():''}</h2><p class="sub">@${esc(me.username)}</p><p class="bio">${esc(me.bio||'Belum ada bio.')}</p>
 <div class="stats"><button data-l="following"><b>${a.count||0}</b><span>Mengikuti</span></button><button data-l="followers"><b>${b.count||0}</b><span>Pengikut</span></button></div>
 <div class="acts"><button class="btn pink" id="ed">Edit Profil</button><button class="btn ghost" id="out">Keluar</button></div>`);
 $('#ed').onclick=$('#ed2').onclick=editSheet;$('#out').onclick=logout}
async function list(k){const c=k==='following'?['follower_id','following_id']:['following_id','follower_id'];
 const{data}=await sb.from('follows').select(c[1]).eq(c[0],me.id),ids=(data||[]).map(x=>x[c[1]]);let us=[];
 if(ids.length){const r=await sb.from('profiles').select('id,username,name,avatar_url').in('id',ids);us=r.data||[]}
 us.forEach(u=>cache[u.id]=u);
 sheet(true,k==='following'?'Mengikuti':'Pengikut',us.length?us.map(rowU).join(''):'<p class="empty">Belum ada siapa pun di sini.</p>')}
function sheet(open,title,body){$('#sheet').hidden=!open;if(open){$('#sh-title').textContent=title;html($('#sh-body'),body)}}
$('#sh-x').onclick=()=>sheet(false);$('#sheet').onclick=e=>{if(e.target.id==='sheet')sheet(false)};
function editSheet(){sheet(true,'Edit Profil',`<form id="f-edit"><label>Nama</label><input name="name" value="${esc(me.name)}" maxlength="40"><label>Bio</label><textarea name="bio" rows="3" maxlength="160">${esc(me.bio)}</textarea><label>Avatar (foto atau video)</label><input type="file" name="avatar" accept="image/*,video/*"><label>Banner (foto atau video)</label><input type="file" name="banner" accept="image/*,video/*"><button class="btn pink">Simpan perubahan</button></form>`);$('#f-edit').onsubmit=saveEdit}
async function up(f,tag){if(!f||!f.size)return null;if(f.size>50*1024*1024)throw new Error('File maksimal 50 MB.');
 const path=`${me.id}/${tag}-${Date.now()}.${(f.name.split('.').pop()||'bin').toLowerCase()}`,{error}=await sb.storage.from('media').upload(path,f,{upsert:true,contentType:f.type});
 if(error)throw error;return sb.storage.from('media').getPublicUrl(path).data.publicUrl}
async function saveEdit(e){e.preventDefault();const f=new FormData(e.target),btn=e.submitter;btn.disabled=true;btn.textContent='Menyimpan...';
 try{const u={name:f.get('name').trim()||me.name,bio:f.get('bio').trim()},a=await up(f.get('avatar'),'avatar'),b=await up(f.get('banner'),'banner');
  if(a)u.avatar_url=a;if(b)u.banner_url=b;
  const{data,error}=await sb.from('profiles').update(u).eq('id',me.id).select().single();if(error)throw error;
  me=data;sheet(false);loadProfile();home();toast('Profil diperbarui.')}
 catch(err){toast(err.message||'Gagal menyimpan.');btn.disabled=false;btn.textContent='Simpan perubahan'}}
