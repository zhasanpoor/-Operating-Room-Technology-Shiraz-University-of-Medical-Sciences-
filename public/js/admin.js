const API='/api';
let token=localStorage.getItem('admin_token');
let currentUser=null;
let currentContentOp=null;
let imageInsertTarget=null;
let allCategories=[];
// نمونه‌های ویرایشگر متن غنی — در initEditors ساخته می‌شوند
let descEditor=null;
let instrEditor=null;

async function api(url,options={}){const headers={'Content-Type':'application/json',...options.headers};if(token)headers['Authorization']=`Bearer ${token}`;const res=await fetch(API+url,{...options,headers});if(res.status===401){logout();throw new Error('Unauthorized')}return res.json()}
function showPage(page){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));document.getElementById(`page-${page}`)?.classList.add('active');document.querySelectorAll('.nav-item[data-page]').forEach(n=>n.classList.remove('active'));document.querySelector(`[data-page="${page}"]`)?.classList.add('active');document.getElementById('breadcrumb').textContent={dashboard:'داشبورد',content:'مدیریت محتوا',review:'صف بررسی',users:'مدیریت کاربران',files:'مدیریت فایل‌ها'}[page]||page;closeSidebar()}
function closeModal(id){document.getElementById(id)?.classList.add('hidden')}
function openModal(id){document.getElementById(id)?.classList.remove('hidden')}
function closeSidebar(){document.getElementById('sidebar')?.classList.remove('open');document.getElementById('sidebarOverlay')?.classList.remove('active')}
function toast(msg,type='success'){const c=document.getElementById('toastContainer');const t=document.createElement('div');t.className=`toast toast-${type}`;t.textContent=msg;c.appendChild(t);setTimeout(()=>{t.style.opacity='0';t.style.transform='translateY(10px)';setTimeout(()=>t.remove(),300)},3000)}
function getYouTubeId(url){if(!url)return null;const p=[/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,/youtube\.com\/shorts\/([^&\s?]+)/];for(const r of p){const m=url.match(r);if(m)return m[1]}return null}

// Auth
async function login(username,password){const res=await fetch(`${API}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});const data=await res.json();if(!res.ok)throw new Error(data.error);token=data.token;localStorage.setItem('admin_token',token);currentUser=data.user;return data}
function logout(){token=null;currentUser=null;localStorage.removeItem('admin_token');document.getElementById('loginPage').classList.remove('hidden');document.getElementById('adminLayout').classList.add('hidden')}
async function checkAuth(){if(!token)return false;try{currentUser=await api('/auth/me');return true}catch{return false}}

// ── ابزارهای کوچک ──────────────────────────────────────────────────
const fa=n=>Number(n||0).toLocaleString('fa-IR');
function esc(s){const d=document.createElement('div');d.textContent=s==null?'':String(s);return d.innerHTML}
// یک عدد را با انیمیشن از صفر تا مقدار نهایی بالا می‌برد
function animateCount(el,target){
  target=Number(target)||0;const dur=700,start=performance.now();
  function tick(now){const p=Math.min((now-start)/dur,1);const eased=1-Math.pow(1-p,3);
    el.textContent=fa(Math.round(eased*target));if(p<1)requestAnimationFrame(tick)}
  requestAnimationFrame(tick);
}
const STATUS_FA={draft:'پیش‌نویس',pending:'در انتظار تأیید',approved:'تأییدشده',rejected:'ردشده',changes_requested:'نیازمند اصلاح'};
const ACTION_FA={review_approve:'تأیید پست',review_reject:'رد پست',review_changes:'درخواست اصلاح',unlock:'باز کردن قفل'};

// ── داشبورد ────────────────────────────────────────────────────────
async function loadDashboard(){
  const data=await api('/dashboard-stats');
  if(data.role==='admin')renderAdminDashboard(data);
  else renderAuthorDashboard(data);
  refreshReviewBadge();
  loadLeaderboard();
}

// جدول رتبه‌بندی نویسندگان — انگیزهٔ رقابت
async function loadLeaderboard(){
  const el=document.getElementById('dashLeaderboard');
  if(!el)return;
  try{
    const data=await api('/leaderboard');
    if(!data.board.length){
      el.innerHTML='<p class="muted">هنوز نویسنده‌ای پست تأییدشده نداره. اولین نفر باش!</p>';
      return;
    }
    const medals=['🥇','🥈','🥉'];
    el.innerHTML=data.board.map(b=>`
      <div class="lb-row ${b.isMe?'lb-me':''}">
        <span class="lb-rank">${medals[b.rank-1]||fa(b.rank)}</span>
        <span class="lb-avatar" ${b.avatar?`style="background-image:url(${b.avatar})"`:''}>${b.avatar?'':esc(b.full_name.charAt(0))}</span>
        <span class="lb-name">${esc(b.full_name)}${b.isMe?' <span class="lb-you">(شما)</span>':''}</span>
        <span class="lb-level" title="${b.level.name}">${b.level.icon}</span>
        <span class="lb-count">${fa(b.approved_count)} پست</span>
      </div>`).join('');
    if(data.myRank){
      el.innerHTML+=`<div class="lb-myrank">رتبهٔ شما: ${fa(data.myRank.rank)} — ${fa(data.myRank.approved_count)} پست تأییدشده</div>`;
    }
  }catch(e){el.innerHTML='<p class="muted">بارگذاری جدول ناموفق بود.</p>'}
}

function renderAdminDashboard(data){
  const s=data.stats;
  document.getElementById('dashGreeting').textContent=`سلام ${currentUser?.full_name||'مدیر'} 👋`;
  document.getElementById('dashSubtitle').textContent='نمای کلی سیستم مدیریت محتوا';

  const cards=[
    {v:s.operations,l:'عمل جراحی',icon:'🏥',c:'#3b82f6'},
    {v:s.with_content,l:'محتوای آماده',icon:'📝',c:'#10b981'},
    {v:s.users,l:'کاربر',icon:'👥',c:'#8b5cf6'},
    {v:s.authors,l:'نویسنده',icon:'✍️',c:'#f59e0b'},
    {v:s.pending,l:'در انتظار بررسی',icon:'⏳',c:'#ef4444',alert:s.pending>0,page:'review'},
    {v:s.open_security_events,l:'هشدار امنیتی',icon:'🛡️',c:'#f43f5e',alert:s.open_security_events>0}
  ];
  document.getElementById('dashStats').innerHTML=cards.map((c,i)=>`
    <div class="stat-card ${c.alert?'stat-alert':''}" ${c.page?`data-goto="${c.page}" style="cursor:pointer"`:''}>
      <div class="stat-ico" style="background:${c.c}1a;color:${c.c}">${c.icon}</div>
      <div class="stat-body">
        <div class="stat-card-value" data-count="${c.v}">۰</div>
        <div class="stat-card-label">${c.l}</div>
      </div>
    </div>`).join('');
  document.querySelectorAll('#dashStats [data-count]').forEach(el=>animateCount(el,el.dataset.count));
  document.querySelectorAll('#dashStats [data-goto]').forEach(el=>el.addEventListener('click',()=>{showPage(el.dataset.goto);loadReviewQueue()}));
  document.getElementById('contentBadge').textContent=fa(s.operations);

  // نمودار میله‌ای افقی پراکندگی دسته‌ها
  const max=Math.max(1,...data.perCategory.map(c=>c.count));
  document.getElementById('dashChart').innerHTML=data.perCategory.map(c=>`
    <div class="bar-row">
      <div class="bar-label">${c.icon} ${esc(c.name)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:0;background:${c.color}" data-w="${(c.count/max*100).toFixed(1)}"></div></div>
      <div class="bar-value">${fa(c.count)}</div>
    </div>`).join('');
  requestAnimationFrame(()=>document.querySelectorAll('#dashChart .bar-fill').forEach(b=>b.style.width=b.dataset.w+'%'));

  // فعالیت‌های اخیر
  const act=data.recent||[];
  document.getElementById('dashActivity').innerHTML=act.length?act.map(a=>`
    <div class="activity-row">
      <div class="activity-dot"></div>
      <div class="activity-text">
        <span class="activity-action">${ACTION_FA[a.action]||esc(a.action)}</span>
        <span class="activity-detail">${esc(a.detail||'')}</span>
      </div>
      <div class="activity-time">${Jalali.relative(a.created_at)}</div>
    </div>`).join(''):'<p class="muted">هنوز فعالیتی ثبت نشده.</p>';
}

function renderAuthorDashboard(data){
  const s=data.stats;
  document.getElementById('dashGreeting').textContent=`سلام ${currentUser?.full_name||''} 👋`;
  document.getElementById('dashSubtitle').textContent='داشبورد نویسنده — گزارش فعالیت شما';
  const cards=[
    {v:s.total,l:'کل پست‌ها',icon:'📚',c:'#3b82f6'},
    {v:s.approved,l:'تأییدشده',icon:'✅',c:'#10b981'},
    {v:s.pending,l:'در انتظار',icon:'⏳',c:'#f59e0b'},
    {v:s.needs_changes,l:'نیازمند اصلاح',icon:'✏️',c:'#ef4444',alert:s.needs_changes>0},
    {v:s.drafts,l:'پیش‌نویس',icon:'📄',c:'#6b7280'},
    {v:s.views,l:'بازدید',icon:'👁️',c:'#8b5cf6'}
  ];
  document.getElementById('dashStats').innerHTML=cards.map(c=>`
    <div class="stat-card ${c.alert?'stat-alert':''}">
      <div class="stat-ico" style="background:${c.c}1a;color:${c.c}">${c.icon}</div>
      <div class="stat-body">
        <div class="stat-card-value" data-count="${c.v}">۰</div>
        <div class="stat-card-label">${c.l}</div>
      </div>
    </div>`).join('');
  document.querySelectorAll('#dashStats [data-count]').forEach(el=>animateCount(el,el.dataset.count));

  // پیام تشویقی
  renderEncouragement(s);
  document.getElementById('dashActivityCard').style.display='none';
}

// پیام‌های تشویقی و سطح‌بندی نویسنده
function renderEncouragement(s){
  const approved=Number(s.approved)||0;
  const levels=[
    {min:0,name:'تازه‌کار',icon:'🌱',color:'#6b7280'},
    {min:1,name:'برنزی',icon:'🥉',color:'#cd7f32'},
    {min:5,name:'نقره‌ای',icon:'🥈',color:'#9ca3af'},
    {min:15,name:'طلایی',icon:'🥇',color:'#f59e0b'},
    {min:30,name:'الماسی',icon:'💎',color:'#38bdf8'}
  ];
  let lvl=levels[0],next=null;
  for(let i=0;i<levels.length;i++){if(approved>=levels[i].min)lvl=levels[i];else{next=levels[i];break}}
  const el=document.getElementById('dashChart');
  const card=document.getElementById('dashChartCard');
  card.querySelector('.dash-card-header h3').textContent='سطح شما';
  let html=`<div class="level-badge" style="background:${lvl.color}1a;border-color:${lvl.color}55">
      <div class="level-icon">${lvl.icon}</div>
      <div><div class="level-name" style="color:${lvl.color}">نویسندهٔ ${lvl.name}</div>`;
  if(next){const need=next.min-approved;
    html+=`<div class="level-next">${fa(need)} پست دیگه تا سطح ${next.name} ${next.icon}</div>`;
  }else{html+=`<div class="level-next">به بالاترین سطح رسیدی! 🎉</div>`}
  html+=`</div></div>`;
  if(approved===0)html+=`<p class="encourage">اولین پستت رو بنویس و بفرست تا ماجرا شروع بشه! 🚀</p>`;
  else html+=`<p class="encourage">آفرین! ${fa(approved)} پست تأییدشده داری. همینطور ادامه بده 💪</p>`;
  el.innerHTML=html;
}

// ── صف بررسی (مدیر) ─────────────────────────────────────────────────
async function refreshReviewBadge(){
  if(currentUser?.role!=='admin')return;
  try{
    const q=await api('/review-queue');
    const badge=document.getElementById('reviewBadge');
    if(q.length>0){badge.textContent=fa(q.length);badge.classList.remove('hidden')}
    else badge.classList.add('hidden');
  }catch{}
}

async function loadReviewQueue(){
  const list=document.getElementById('reviewQueueList');
  list.innerHTML='<div class="loading-row"><div class="spinner"></div></div>';
  const queue=await api('/review-queue');
  if(!queue.length){
    list.innerHTML=`<div class="empty-box"><div class="empty-emoji">🎉</div>
      <h3>صف خالیه!</h3><p class="muted">هیچ پستی منتظر بررسی نیست.</p></div>`;
    return;
  }
  list.innerHTML=queue.map(q=>`
    <div class="review-card" data-id="${q.id}">
      <div class="review-head">
        <div class="review-title">${q.category_icon||'🏥'} ${esc(q.name)}</div>
        <span class="review-badge-pending">در انتظار تأیید</span>
      </div>
      <div class="review-meta">
        <span>✍️ ${esc(q.author_name||q.author_username||'نامشخص')}</span>
        <span>📁 ${esc(q.category_name||'')}</span>
        <span>🕐 ${Jalali.relative(q.submitted_at)}</span>
      </div>
      <div class="review-actions">
        <button class="btn btn-view" data-act="view" data-id="${q.id}">👁️ مشاهده محتوا</button>
        <button class="btn btn-approve" data-act="approve" data-id="${q.id}">✅ تأیید و انتشار</button>
        <button class="btn btn-changes" data-act="changes" data-id="${q.id}">✏️ نیاز به اصلاح</button>
        <button class="btn btn-reject" data-act="reject" data-id="${q.id}">❌ رد</button>
      </div>
    </div>`).join('');
  list.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('click',()=>reviewAction(b.dataset.act,parseInt(b.dataset.id))));
}

async function reviewAction(act,id){
  if(act==='view'){
    // محتوای پست را در یک پنجره نشان می‌دهد
    const op=await api(`/operations/${id}`);
    openReviewPreview(op);
    return;
  }
  let comment='';
  if(act==='changes'){comment=prompt('چه تغییری لازم است؟ (برای نویسنده ارسال می‌شود)');if(comment===null)return}
  if(act==='reject'){comment=prompt('دلیل رد پست؟ (اختیاری، برای نویسنده ارسال می‌شود)')||''}
  if(act==='approve'&&!confirm('این پست تأیید و منتشر شود؟ بعد از تأیید قفل می‌شود.'))return;
  try{
    const res=await api(`/operations/${id}/review`,{method:'POST',body:JSON.stringify({decision:act,comment})});
    toast(res.message||'انجام شد');
    loadReviewQueue();refreshReviewBadge();
  }catch(e){toast(e.message||'خطا','error')}
}

function openReviewPreview(op){
  const m=document.getElementById('reviewPreviewModal');
  document.getElementById('reviewPreviewTitle').textContent=op.name;
  document.getElementById('reviewPreviewBody').innerHTML=`
    <div class="preview-section"><h4>شرح عمل</h4><div class="preview-content">${op.description||'<span class="muted">خالی</span>'}</div></div>
    <div class="preview-section"><h4>ابزارها</h4><div class="preview-content">${op.instruments||'<span class="muted">خالی</span>'}</div></div>`;
  openModal('reviewPreviewModal');
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
  descEditor.setHtml(op.description||'');
  instrEditor.setHtml(op.instruments||'');
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
  const d=descEditor?descEditor.length():0;
  const i=instrEditor?instrEditor.length():0;
  document.getElementById('descCharCount').textContent=`${d.toLocaleString('fa-IR')} کاراکتر`;
  document.getElementById('instrCharCount').textContent=`${i.toLocaleString('fa-IR')} کاراکتر`;
}
function updateTabStatuses(){
  const d=descEditor?descEditor.getText():'';
  const i=instrEditor?instrEditor.getText():'';
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
  const body={description:descEditor.getHtml(),instruments:instrEditor.getHtml(),video_url_1:document.getElementById('editVideoUrl1').value,video_title_1:document.getElementById('editVideoTitle1').value,video_url_2:document.getElementById('editVideoUrl2').value,video_title_2:document.getElementById('editVideoTitle2').value,slides_url:document.getElementById('editSlidesUrl').value,slides_title:document.getElementById('editSlidesTitle').value};
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
// انتخاب عکس از کتابخانه و درج واقعی داخل ویرایشگر.
// نسخهٔ قبلی متن «[تصویر: ...]» می‌گذاشت که تصویر نبود، فقط یک نشانهٔ متنی.
function selectImage(url){
  const editor=imageInsertTarget==='desc'?descEditor:instrEditor;
  if(!editor){toast('ویرایشگر آماده نیست','error');return}
  const q=editor.quill;
  const range=q.getSelection(true);
  q.insertEmbed(range?range.index:q.getLength(),'image',url,'user');
  closeModal('imageUploadModal');
  updateCharCounts();
  toast('تصویر درج شد');
}

/** آپلود تصویر از داخل ویرایشگر؛ نشانی فایل ذخیره‌شده را برمی‌گرداند. */
async function uploadEditorImage(file){
  if(file.size>8*1024*1024)throw new Error('حجم تصویر نباید بیشتر از ۸ مگابایت باشد.');
  const fd=new FormData();
  fd.append('file',file);
  const res=await fetch(`${API}/upload`,{method:'POST',headers:{'Authorization':`Bearer ${token}`},body:fd});
  if(!res.ok){
    const err=await res.json().catch(()=>({}));
    throw new Error(err.error||'آپلود تصویر انجام نشد.');
  }
  const data=await res.json();
  return data.url;
}

/** ویرایشگرهای متن غنی را می‌سازد (یک بار، هنگام بارگذاری صفحه). */
function initEditors(){
  const onEdit=()=>{updateCharCounts();updateTabStatuses()};
  descEditor=RichEditor.create('#editDescription',{
    placeholder:'شرح کامل عمل جراحی را اینجا بنویسید…',
    onUpload:uploadEditorImage,
    onChange:onEdit
  });
  instrEditor=RichEditor.create('#editInstruments',{
    placeholder:'لیست ابزارهای مورد نیاز عمل…',
    onUpload:uploadEditorImage,
    onChange:onEdit
  });
}

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
      if(item.dataset.page==='review')loadReviewQueue();
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
  // ویرایشگرهای غنی خودشان از طریق onChange تغییرات را گزارش می‌دهند
  initEditors();

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

  // هندلرهای واگذارشده — جایگزین onclick درون‌خطی تا CSP سخت‌گیرانه اجازه دهد
  document.addEventListener('click',e=>{
    const closeBtn=e.target.closest('[data-close]');
    if(closeBtn){closeModal(closeBtn.dataset.close);return}
    const fileBtn=e.target.closest('[data-trigger-file]');
    if(fileBtn){document.getElementById(fileBtn.dataset.triggerFile)?.click()}
  });
});

function initAdmin(){
  document.getElementById('loginPage').classList.add('hidden');
  document.getElementById('adminLayout').classList.remove('hidden');
  if(currentUser){
    document.getElementById('userName').textContent=currentUser.full_name;
    const roleFa={admin:'مدیر سیستم',editor:'نویسنده',user:'کاربر'}[currentUser.role]||currentUser.role;
    document.getElementById('userRole').textContent=roleFa;
    document.getElementById('userAvatar').textContent=currentUser.full_name.charAt(0);
    // بخش‌های مخصوص مدیر برای نویسنده پنهان می‌شوند
    const isAdmin=currentUser.role==='admin';
    document.querySelectorAll('.admin-only').forEach(el=>{el.style.display=isAdmin?'':'none'});
  }
  loadDashboard();
}
