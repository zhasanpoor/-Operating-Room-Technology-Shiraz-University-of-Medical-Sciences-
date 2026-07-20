const API='/api';
let token=localStorage.getItem('admin_token');
let currentUser=null;
let currentContentOp=null;
let imageInsertTarget=null;
let allCategories=[];

async function api(url,options={}){const headers={'Content-Type':'application/json',...options.headers};if(token)headers['Authorization']=`Bearer ${token}`;const res=await fetch(API+url,{...options,headers});if(res.status===401){logout();throw new Error('Unauthorized')}return res.json()}
function showPage(page){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));document.getElementById(`page-${page}`)?.classList.add('active');document.querySelectorAll('.nav-item[data-page]').forEach(n=>n.classList.remove('active'));document.querySelector(`[data-page="${page}"]`)?.classList.add('active');document.getElementById('breadcrumb').textContent={dashboard:'داشبورد',content:'مدیریت محتوا',users:'مدیریت کاربران',files:'مدیریت فایل‌ها'}[page]||page;closeSidebar()}
function closeModal(id){document.getElementById(id)?.classList.add('hidden')}
function openModal(id){document.getElementById(id)?.classList.remove('hidden')}
function closeSidebar(){document.getElementById('sidebar')?.classList.remove('open');document.getElementById('sidebarOverlay')?.classList.remove('active')}
function toast(msg,type='success'){const c=document.getElementById('toastContainer');const t=document.createElement('div');t.className=`toast toast-${type}`;t.textContent=msg;c.appendChild(t);setTimeout(()=>{t.style.opacity='0';t.style.transform='translateY(10px)';setTimeout(()=>t.remove(),300)},3000)}
function getYouTubeId(url){if(!url)return null;const p=[/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,/youtube\.com\/shorts\/([^&\s?]+)/];for(const r of p){const m=url.match(r);if(m)return m[1]}return null}

// Auth
async function login(username,password){const res=await fetch(`${API}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});const data=await res.json();if(!res.ok)throw new Error(data.error);token=data.token;localStorage.setItem('admin_token',token);currentUser=data.user;return data}
function logout(){token=null;currentUser=null;localStorage.removeItem('admin_token');document.getElementById('loginPage').classList.remove('hidden');document.getElementById('adminLayout').classList.add('hidden')}
async function checkAuth(){if(!token)return false;try{currentUser=await api('/auth/me');return true}catch{return false}}

// Dashboard
async function loadDashboard(){
  const stats=await api('/stats');
  document.getElementById('dashStats').innerHTML=`
    <div class="stat-card"><div class="stat-card-value">${stats.total_categories}</div><div class="stat-card-label">دسته‌بندی</div></div>
    <div class="stat-card"><div class="stat-card-value">${stats.total_operations}</div><div class="stat-card-label">عمل جراحی</div></div>
    <div class="stat-card"><div class="stat-card-value">${stats.content_count}</div><div class="stat-card-label">محتوای آماده</div></div>
    <div class="stat-card"><div class="stat-card-value">${stats.total_users}</div><div class="stat-card-label">کاربران</div></div>`;
  document.getElementById('contentBadge').textContent=stats.total_operations;
  const cats=await api('/categories');
  document.getElementById('dashCategories').innerHTML=cats.map(c=>`<div class="dash-cat-chip" style="border-color:${c.color}33;background:${c.color}0d">${c.icon} ${c.name_fa} <span style="opacity:.5">(${c.operation_count})</span></div>`).join('');
}

// Content
async function loadContentPanel(){
  allCategories=await api('/categories');
  const sel=document.getElementById('contentCategory');
  sel.innerHTML='<option value="">-- انتخاب کنید --</option>';
  allCategories.forEach(c=>{sel.innerHTML+=`<option value="${c.key}">${c.icon} ${c.name_fa} (${c.operation_count} عمل)</option>`});
}
async function loadCategoryOperations(key){
  if(!key){document.getElementById('contentOperation').innerHTML='<option value="">-- ابتدا دسته‌بندی را انتخاب کنید --</option>';document.getElementById('contentOperation').disabled=true;document.getElementById('contentEditor').classList.add('hidden');setSteps(1);return}
  setSteps(2);
  const data=await api(`/categories/${key}`);
  const ops=data.operations;
  const sel=document.getElementById('contentOperation');
  sel.disabled=false;
  sel.innerHTML='<option value="">-- انتخاب عمل جراحی --</option>';
  ops.forEach(op=>{const has=op.description?'✅':'⚪';sel.innerHTML+=`<option value="${op.id}">${op.op_number} — ${op.name} ${has}</option>`});
}
async function loadOperationContent(opId){
  if(!opId){document.getElementById('contentEditor').classList.add('hidden');setSteps(2);return}
  setSteps(3);
  const op=await api(`/operations/${opId}`);
  currentContentOp=op;
  const cat=allCategories.find(c=>c.key===document.getElementById('contentCategory').value);
  document.getElementById('editorHeader').innerHTML=`<h3>${op.name}</h3><p>${cat?.icon||''} ${cat?.name_fa||''} — شماره ${op.op_number}</p>`;
  document.getElementById('contentEditor').classList.remove('hidden');
  document.getElementById('editDescription').value=op.description||'';
  document.getElementById('editInstruments').value=op.instruments||'';
  document.getElementById('editVideoTitle1').value=op.video_title_1||'';
  document.getElementById('editVideoUrl1').value=op.video_url_1||'';
  document.getElementById('editVideoTitle2').value=op.video_title_2||'';
  document.getElementById('editVideoUrl2').value=op.video_url_2||'';
  document.getElementById('editSlidesTitle').value=op.slides_title||'';
  document.getElementById('editSlidesUrl').value=op.slides_url||'';
  updateVideoPreview('editVideoUrl1','videoPreview1');
  updateVideoPreview('editVideoUrl2','videoPreview2');
  updateSlidesPreview();
  updateCharCounts();
  updateTabStatuses();
}
function setSteps(active){[1,2,3].forEach(i=>{const el=document.getElementById(`step${i}`);el.classList.remove('active','done');if(i<active)el.classList.add('done');else if(i===active)el.classList.add('active')})}
function updateCharCounts(){
  const d=document.getElementById('editDescription').value.length;
  const i=document.getElementById('editInstruments').value.length;
  document.getElementById('descCharCount').textContent=`${d.toLocaleString('fa-IR')} کاراکتر`;
  document.getElementById('instrCharCount').textContent=`${i.toLocaleString('fa-IR')} کاراکتر`;
}
function updateTabStatuses(){
  const d=document.getElementById('editDescription').value.trim();
  const i=document.getElementById('editInstruments').value.trim();
  const v1=document.getElementById('editVideoUrl1').value.trim();
  const v2=document.getElementById('editVideoUrl2').value.trim();
  const s=document.getElementById('editSlidesUrl').value.trim();
  setStatus('descStatus',d);setStatus('instrStatus',i);setStatus('videoStatus',v1||v2);setStatus('slidesStatus',s);
}
function setStatus(id,val){const el=document.getElementById(id);if(el){el.className='tab-status '+(val?'filled':'empty')}}
function updateVideoPreview(inputId,previewId){
  const url=document.getElementById(inputId).value;
  const el=document.getElementById(previewId);
  const ytId=getYouTubeId(url);
  if(ytId)el.innerHTML=`<iframe src="https://www.youtube.com/embed/${ytId}" allowfullscreen></iframe>`;
  else if(url)el.innerHTML='<p style="color:var(--red);font-size:12px;margin-top:4px">⚠️ لینک نامعتبر — فقط YouTube پشتیبانی می‌شود</p>';
  else el.innerHTML='';
}
function updateSlidesPreview(){
  const url=document.getElementById('editSlidesUrl').value;
  const el=document.getElementById('slidesPreview');
  if(!url){el.innerHTML='';return}
  let embed=url;
  if(url.includes('/pub?'))embed=url.replace('/pub?','/embed?');
  else if(url.includes('/edit'))embed=url.replace('/edit','/embed');
  else if(!url.includes('/embed'))embed=url+'/embed';
  el.innerHTML=`<iframe src="${embed}" allowfullscreen></iframe>`;
}
async function saveContent(){
  if(!currentContentOp)return;
  const btn=document.getElementById('saveContentBtn');
  btn.disabled=true;btn.innerHTML='<span class="spinner-sm"></span>در حال ذخیره...';
  const body={description:document.getElementById('editDescription').value,instruments:document.getElementById('editInstruments').value,video_url_1:document.getElementById('editVideoUrl1').value,video_title_1:document.getElementById('editVideoTitle1').value,video_url_2:document.getElementById('editVideoUrl2').value,video_title_2:document.getElementById('editVideoTitle2').value,slides_url:document.getElementById('editSlidesUrl').value,slides_title:document.getElementById('editSlidesTitle').value};
  try{await api(`/operations/${currentContentOp.id}/content`,{method:'PUT',body:JSON.stringify(body)});toast('محتوا با موفقیت ذخیره شد');updateTabStatuses()}catch(e){toast('خطا در ذخیره: '+e.message,'error')}
  btn.disabled=false;btn.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> ذخیره تغییرات';
}

// Users
async function loadUsers(){
  const users=await api('/auth/users');
  document.getElementById('usersTableBody').innerHTML=users.map(u=>`<tr>
    <td><div style="display:flex;align-items:center;gap:8px"><div class="user-avatar" style="width:30px;height:30px;font-size:12px;background:${u.role==='admin'?'var(--accent)':u.role==='editor'?'var(--green)':'var(--bg-5)'}">${u.full_name.charAt(0)}</div><span style="font-weight:500">${u.full_name}</span></div></td>
    <td style="color:var(--text-2)">${u.username}</td>
    <td><span class="badge badge-${u.role}">${u.role==='admin'?'مدیر':u.role==='editor'?'ویرایشگر':'کاربر'}</span></td>
    <td style="color:var(--text-3);font-size:12px">${new Date(u.created_at).toLocaleDateString('fa-IR')}</td>
    <td>${u.id!==currentUser?.id?`<button class="btn btn-sm" style="color:var(--red);border-color:var(--red-border)" onclick="deleteUser(${u.id})">حذف</button>`:'<span style="color:var(--text-3);font-size:12px">—</span>'}</td>
  </tr>`).join('');
}
async function addUser(e){
  e.preventDefault();
  try{await api('/auth/register',{method:'POST',body:JSON.stringify({full_name:document.getElementById('newUserFullName').value,username:document.getElementById('newUserUsername').value,password:document.getElementById('newUserPassword').value,role:document.getElementById('newUserRole').value})});closeModal('addUserModal');document.getElementById('addUserForm').reset();loadUsers();toast('کاربر جدید اضافه شد')}catch(err){toast(err.message,'error')}
}
async function deleteUser(id){if(!confirm('آیا از حذف این کاربر مطمئن هستید؟'))return;await api(`/auth/users/${id}`,{method:'DELETE'});loadUsers();toast('کاربر حذف شد')}

// Files
async function loadFiles(){
  const files=await api('/files');
  document.getElementById('filesGrid').innerHTML=files.map(f=>{
    const isImg=f.file_type?.startsWith('image/');
    return`<div class="file-card">${isImg?`<img src="/uploads/${f.stored_name}" alt="${f.original_name}">`:`<div class="file-icon-lg">${f.file_type?.includes('pdf')?'📄':f.file_type?.includes('video')?'🎬':'📎'}</div>`}<div class="file-name" title="${f.original_name}">${f.original_name}</div><button class="btn btn-sm" style="margin-top:8px;color:var(--red);border-color:var(--red-border)" onclick="deleteFile(${f.id})">حذف</button></div>`}).join('');
}
async function uploadFile(file){const fd=new FormData();fd.append('file',file);try{await fetch(`${API}/upload`,{method:'POST',headers:{'Authorization':`Bearer ${token}`},body:fd});loadFiles();toast('فایل آپلود شد')}catch(e){toast('خطا در آپلود','error')}}
async function deleteFile(id){if(!confirm('حذف فایل؟'))return;await api(`/files/${id}`,{method:'DELETE'});loadFiles();toast('فایل حذف شد')}

// Image insertion
function insertImage(target){imageInsertTarget=target;openModal('imageUploadModal');loadImageLibrary()}
async function loadImageLibrary(){const files=await api('/files');const images=files.filter(f=>f.file_type?.startsWith('image/'));document.getElementById('imageLibrary').innerHTML=images.map(f=>`<img src="/uploads/${f.stored_name}" class="file-thumb" onclick="selectImage('/uploads/${f.stored_name}')" alt="">`).join('')||'<p style="color:var(--text-3);text-align:center;padding:30px;grid-column:1/-1">هنوز عکسی آپلود نشده</p>'}
function selectImage(url){const ta=imageInsertTarget==='desc'?document.getElementById('editDescription'):document.getElementById('editInstruments');ta.value+='\n[تصویر: '+url+']\n';closeModal('imageUploadModal');updateCharCounts();toast('تصویر درج شد')}

// Init
document.addEventListener('DOMContentLoaded',async()=>{
  document.getElementById('loginForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const errEl=document.getElementById('loginError');errEl.classList.add('hidden');
    const btn=document.getElementById('loginBtn');btn.disabled=true;
    try{await login(document.getElementById('loginUsername').value,document.getElementById('loginPassword').value);initAdmin()}
    catch(err){errEl.textContent=err.message;errEl.classList.remove('hidden')}
    btn.disabled=false;
  });

  if(await checkAuth())initAdmin();

  document.querySelectorAll('.nav-item[data-page]').forEach(item=>{
    item.addEventListener('click',e=>{e.preventDefault();showPage(item.dataset.page);
      if(item.dataset.page==='dashboard')loadDashboard();
      if(item.dataset.page==='content')loadContentPanel();
      if(item.dataset.page==='users')loadUsers();
      if(item.dataset.page==='files')loadFiles()});
  });

  document.querySelectorAll('.link-btn[data-page]').forEach(link=>{
    link.addEventListener('click',e=>{e.preventDefault();showPage(link.dataset.page);if(link.dataset.page==='content')loadContentPanel()});
  });

  document.getElementById('contentCategory').addEventListener('change',e=>loadCategoryOperations(e.target.value));
  document.getElementById('contentOperation').addEventListener('change',e=>loadOperationContent(e.target.value));

  document.querySelectorAll('.editor-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{document.querySelectorAll('.editor-tab').forEach(t=>t.classList.remove('active'));document.querySelectorAll('.editor-panel').forEach(p=>p.classList.remove('active'));tab.classList.add('active');document.getElementById(`panel-${tab.dataset.tab}`)?.classList.add('active')});
  });

  document.getElementById('editVideoUrl1').addEventListener('input',()=>{updateVideoPreview('editVideoUrl1','videoPreview1');updateTabStatuses()});
  document.getElementById('editVideoUrl2').addEventListener('input',()=>{updateVideoPreview('editVideoUrl2','videoPreview2');updateTabStatuses()});
  document.getElementById('editSlidesUrl').addEventListener('input',()=>{updateSlidesPreview();updateTabStatuses()});
  document.getElementById('editDescription').addEventListener('input',()=>{updateCharCounts();updateTabStatuses()});
  document.getElementById('editInstruments').addEventListener('input',()=>{updateCharCounts();updateTabStatuses()});

  document.getElementById('saveContentBtn').addEventListener('click',saveContent);
  document.getElementById('addUserBtn').addEventListener('click',()=>openModal('addUserModal'));
  document.getElementById('addUserForm').addEventListener('submit',addUser);
  document.getElementById('logoutBtn').addEventListener('click',e=>{e.preventDefault();logout()});
  document.getElementById('fileInput').addEventListener('change',e=>{Array.from(e.target.files).forEach(f=>uploadFile(f));e.target.value=''});
  document.getElementById('uploadDropzone').addEventListener('click',()=>document.getElementById('imageFileInput').click());
  document.getElementById('imageFileInput').addEventListener('change',async e=>{if(!e.target.files[0])return;const fd=new FormData();fd.append('file',e.target.files[0]);const res=await fetch(`${API}/upload`,{method:'POST',headers:{'Authorization':`Bearer ${token}`},body:fd});const data=await res.json();if(data.url)selectImage(data.url)});

  document.querySelectorAll('.tab-sm').forEach(tab=>{
    tab.addEventListener('click',()=>{document.querySelectorAll('.tab-sm').forEach(t=>t.classList.remove('active'));document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));tab.classList.add('active');document.getElementById(tab.dataset.target)?.classList.add('active')});
  });

  document.getElementById('menuToggle')?.addEventListener('click',()=>{document.getElementById('sidebar').classList.toggle('open');document.getElementById('sidebarOverlay').classList.toggle('active')});
  document.getElementById('sidebarOverlay')?.addEventListener('click',closeSidebar);
});

function initAdmin(){
  document.getElementById('loginPage').classList.add('hidden');
  document.getElementById('adminLayout').classList.remove('hidden');
  if(currentUser){
    document.getElementById('userName').textContent=currentUser.full_name;
    document.getElementById('userRole').textContent=currentUser.role;
    document.getElementById('userAvatar').textContent=currentUser.full_name.charAt(0);
  }
  loadDashboard();
}
