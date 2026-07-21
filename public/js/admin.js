const API='/api';
let token=localStorage.getItem('admin_token');
let currentUser=null;
let currentContentOp=null;
let imageInsertTarget=null;
let allCategories=[];
// نمونه‌های ویرایشگر متن غنی — در initEditors ساخته می‌شوند
let descEditor=null;
let instrEditor=null;

/**
 * فراخوانی API.
 *
 * روی پاسخ ناموفق **خطا پرتاب می‌کند** تا بلوک‌های try/catch واقعاً کار
 * کنند. نسخهٔ قبلی فقط روی ۴۰۱ خطا می‌داد و بقیهٔ خطاها (۴۰۰، ۴۰۳، ۴۰۹…)
 * را بی‌صدا برمی‌گرداند؛ نتیجه‌اش این بود که کد فراخوان فکر می‌کرد
 * عملیات موفق بوده و پیام «undefined» به کاربر نشان می‌داد.
 */
async function api(url,options={}){
  const headers={'Content-Type':'application/json',...options.headers};
  if(token)headers['Authorization']=`Bearer ${token}`;
  const res=await fetch(API+url,{...options,headers});
  if(res.status===401){logout();throw new Error('نشستت منقضی شده. دوباره وارد شو.')}
  let data=null;
  try{data=await res.json()}catch(e){data=null}
  if(!res.ok){
    const err=new Error((data&&data.error)||'درخواست ناموفق بود.');
    err.status=res.status;
    err.data=data;
    throw err;
  }
  return data;
}
function showPage(page){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));document.getElementById(`page-${page}`)?.classList.add('active');document.querySelectorAll('.nav-item[data-page]').forEach(n=>n.classList.remove('active'));document.querySelector(`[data-page="${page}"]`)?.classList.add('active');document.getElementById('breadcrumb').textContent={dashboard:'داشبورد',content:'مدیریت محتوا',review:'صف بررسی',settings:'تنظیمات سایت',reports:'گزارش‌ها',categories:'دسته‌بندی‌ها',users:'مدیریت کاربران',files:'مدیریت فایل‌ها'}[page]||page;closeSidebar()}
function closeModal(id){document.getElementById(id)?.classList.add('hidden')}
function openModal(id){document.getElementById(id)?.classList.remove('hidden')}
function closeSidebar(){document.getElementById('sidebar')?.classList.remove('open');document.getElementById('sidebarOverlay')?.classList.remove('active')}
function toast(msg,type='success'){const c=document.getElementById('toastContainer');const t=document.createElement('div');t.className=`toast toast-${type}`;t.textContent=msg;c.appendChild(t);setTimeout(()=>{t.style.opacity='0';t.style.transform='translateY(10px)';setTimeout(()=>t.remove(),300)},3000)}
function getYouTubeId(url){if(!url)return null;const p=[/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,/youtube\.com\/shorts\/([^&\s?]+)/];for(const r of p){const m=url.match(r);if(m)return m[1]}return null}

// Auth
async function login(username,password){const res=await fetch(`${API}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});const data=await res.json();if(!res.ok)throw new Error(data.error);token=data.token;localStorage.setItem('admin_token',token);currentUser=data.user;return data}
function logout(){token=null;currentUser=null;localStorage.removeItem('admin_token');document.getElementById('loginPage').classList.remove('hidden');document.getElementById('adminLayout').classList.add('hidden')}
async function checkAuth(){if(!token)return false;try{currentUser=await api('/auth/me');return true}catch{return false}}

// ── حالت روشن / تاریک ──────────────────────────────────────────────
// کلید ذخیره با سایت اصلی یکی است تا انتخاب کاربر در هر دو اعمال شود.
function initTheme(){
  const saved=localStorage.getItem('theme');
  const prefersLight=window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches;
  applyTheme(saved||(prefersLight?'light':'dark'));
}
function applyTheme(theme){
  document.documentElement.setAttribute('data-theme',theme);
  const btn=document.getElementById('adminThemeToggle');
  if(btn){
    btn.textContent=theme==='light'?'🌙':'☀️';
    btn.title=theme==='light'?'رفتن به حالت تاریک':'رفتن به حالت روشن';
  }
  window.__theme=theme;
}
function toggleTheme(){
  const next=window.__theme==='light'?'dark':'light';
  localStorage.setItem('theme',next);
  applyTheme(next);
}

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

  renderQueues(data);
  renderLatest(data.latestPosts||[]);
  renderEngagement(data.engagement||{});

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

// ── گزارش‌ها و آمار ────────────────────────────────────────────────
let reportDays=30;

async function loadReports(days){
  if(days)reportDays=days;
  document.querySelectorAll('.range-btn').forEach(b=>
    b.classList.toggle('active',Number(b.dataset.days)===reportDays));

  try{
    const r=await api(`/reports?days=${reportDays}`);

    // کارت‌های خلاصه
    const t=r.totals||{};
    document.getElementById('reportTotals').innerHTML=[
      {v:t.views,l:'بازدید',icon:'👁️',c:'#3b82f6'},
      {v:t.visitors,l:'بازدیدکنندهٔ یکتا',icon:'🧑‍💻',c:'#10b981'},
      {v:t.logged_in_users,l:'کاربر واردشده',icon:'🔑',c:'#8b5cf6'}
    ].map(c=>`
      <div class="stat-card">
        <div class="stat-ico" style="background:${c.c}1a;color:${c.c}">${c.icon}</div>
        <div class="stat-body">
          <div class="stat-card-value" data-count="${c.v||0}">۰</div>
          <div class="stat-card-label">${c.l}</div>
        </div>
      </div>`).join('');
    document.querySelectorAll('#reportTotals [data-count]').forEach(el=>animateCount(el,el.dataset.count));

    renderLineChart('reportDaily',r.daily||[],'day','views');
    renderHourChart('reportHourly',r.hourly||[]);
    renderBars('reportDevices',(r.byDevice||[]).map(d=>({
      label:{mobile:'📱 موبایل',tablet:'📲 تبلت',desktop:'💻 دسکتاپ'}[d.device]||d.device,
      count:d.count})));
    renderBars('reportBrowsers',(r.byBrowser||[]).map(b=>({label:b.browser,count:b.count})));

    const top=r.topOperations||[];
    document.getElementById('reportTopOps').innerHTML=top.length?top.map((o,i)=>`
      <div class="q-row">
        <span class="q-rank">${fa(i+1)}</span>
        <span class="q-body"><span class="q-name">${esc(o.name)}</span></span>
        <span class="q-count">👁️ ${fa(o.views)}</span>
      </div>`).join(''):'<p class="muted">هنوز بازدیدی ثبت نشده.</p>';

    loadSecurityEvents();
    loadAuditLog();
  }catch(e){
    document.getElementById('reportTotals').innerHTML='<p class="muted">خواندن گزارش ناموفق بود.</p>';
  }
}

// نمودار خطی ساده با SVG — بدون کتابخانهٔ خارجی
function renderLineChart(elId,rows,xKey,yKey){
  const el=document.getElementById(elId);
  if(!rows.length){el.innerHTML='<p class="muted">داده‌ای نیست.</p>';return}
  const vals=rows.map(r=>r[yKey]);
  const max=Math.max(1,...vals);
  const W=100,H=40;
  const pts=rows.map((r,i)=>{
    const x=rows.length===1?W/2:(i/(rows.length-1))*W;
    const y=H-(r[yKey]/max)*H;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
  const area=`0,${H} ${pts} ${W},${H}`;
  el.innerHTML=`
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="line-chart">
      <polygon points="${area}" fill="url(#g1)" opacity=".25"></polygon>
      <polyline points="${pts}" fill="none" stroke="#6366f1" stroke-width="1.2"
                vector-effect="non-scaling-stroke"></polyline>
      <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="transparent"/>
      </linearGradient></defs>
    </svg>
    <div class="chart-legend">
      <span>${Jalali.format(rows[0][xKey],'short')}</span>
      <span>بیشترین: ${fa(max)}</span>
      <span>${Jalali.format(rows[rows.length-1][xKey],'short')}</span>
    </div>`;
}

// نمودار ۲۴ ساعته
function renderHourChart(elId,rows){
  const el=document.getElementById(elId);
  const byHour=new Array(24).fill(0);
  rows.forEach(r=>{byHour[r.hour]=r.count});
  const max=Math.max(1,...byHour);
  el.innerHTML=`<div class="hour-chart">${byHour.map((c,h)=>`
    <div class="hour-col" title="ساعت ${h}: ${c} بازدید">
      <div class="hour-bar" style="height:${(c/max*100).toFixed(1)}%"></div>
      ${h%6===0?`<span class="hour-label">${fa(h)}</span>`:''}
    </div>`).join('')}</div>`;
}

function renderBars(elId,items){
  const el=document.getElementById(elId);
  if(!items.length){el.innerHTML='<p class="muted">داده‌ای نیست.</p>';return}
  const max=Math.max(...items.map(i=>i.count));
  el.innerHTML=items.map(i=>`
    <div class="bar-row">
      <div class="bar-label">${esc(i.label)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:0;background:#6366f1" data-w="${(i.count/max*100).toFixed(1)}"></div></div>
      <div class="bar-value">${fa(i.count)}</div>
    </div>`).join('');
  requestAnimationFrame(()=>el.querySelectorAll('.bar-fill').forEach(b=>b.style.width=b.dataset.w+'%'));
}

const SEVERITY_FA={high:'بحرانی',medium:'متوسط',low:'کم'};
const EVENT_FA={xss:'تلاش XSS',sqli:'تلاش تزریق SQL',path_traversal:'پیمایش مسیر',
  command_injection:'تزریق فرمان',template_injection:'تزریق قالب',
  prototype_pollution:'آلودگی prototype',bad_upload:'آپلود مشکوک'};

async function loadSecurityEvents(){
  const el=document.getElementById('reportSecurity');
  try{
    const events=await api('/security-events');
    el.innerHTML=events.length?events.map(e=>`
      <div class="q-row ${e.resolved?'q-dim':''}">
        <span class="sev sev-${e.severity}">${SEVERITY_FA[e.severity]||e.severity}</span>
        <span class="q-body">
          <span class="q-name">${EVENT_FA[e.event_type]||esc(e.event_type)}</span>
          <span class="q-meta">${esc(e.detail||'')} · ${esc(e.user_name||'مهمان')} · ${Jalali.relative(e.created_at)}</span>
        </span>
        ${e.resolved?'<span class="q-status q-muted">بسته</span>'
          :`<button class="q-go" data-resolve="${e.id}">بستن</button>`}
      </div>`).join(''):'<p class="muted">هیچ رویداد امنیتی ثبت نشده 👍</p>';
    el.querySelectorAll('[data-resolve]').forEach(b=>
      b.addEventListener('click',async()=>{
        await api(`/security-events/${b.dataset.resolve}/resolve`,{method:'POST'});
        toast('رویداد بسته شد');loadSecurityEvents();
      }));
  }catch(e){el.innerHTML='<p class="muted">خواندن ناموفق بود.</p>'}
}

const AUDIT_FA={...ACTION_FA,user_delete:'حذف کاربر',user_activate:'فعال‌سازی کاربر',
  user_deactivate:'غیرفعال‌سازی کاربر',user_role_change:'تغییر سطح دسترسی',
  password_change:'تغییر رمز',author_approve:'تأیید نویسندگی',author_reject:'رد نویسندگی',
  settings_update:'تغییر تنظیمات',security_resolve:'بستن رویداد امنیتی'};

async function loadAuditLog(){
  const el=document.getElementById('reportAudit');
  try{
    const rows=await api('/audit-log');
    el.innerHTML=rows.length?rows.slice(0,40).map(a=>`
      <div class="q-row">
        <span class="q-body">
          <span class="q-name">${AUDIT_FA[a.action]||esc(a.action)}</span>
          <span class="q-meta">${esc(a.user_name||'سیستم')} · ${esc(a.detail||'')}</span>
        </span>
        <span class="q-count">${Jalali.relative(a.created_at)}</span>
      </div>`).join(''):'<p class="muted">لاگی ثبت نشده.</p>';
  }catch(e){el.innerHTML='<p class="muted">خواندن ناموفق بود.</p>'}
}

// ── تنظیمات سایت ───────────────────────────────────────────────────
async function loadSettings(){
  const wrap=document.getElementById('settingsGroups');
  wrap.innerHTML='<div class="loading-row"><div class="spinner"></div></div>';
  try{
    const groups=await api('/settings');
    wrap.innerHTML=Object.entries(groups).map(([cat,g])=>`
      <div class="settings-card">
        <div class="settings-card-head"><h3>${esc(g.label)}</h3></div>
        <div class="settings-card-body">
          ${g.items.map(it=>renderSettingField(it)).join('')}
        </div>
      </div>`).join('');
  }catch(e){
    wrap.innerHTML='<p class="muted">خواندن تنظیمات ناموفق بود.</p>';
  }
}

function renderSettingField(it){
  const id='set_'+it.key;
  if(it.type==='bool'){
    const on=it.value==='1';
    return `<label class="set-toggle" for="${id}">
      <input type="checkbox" id="${id}" data-key="${it.key}" data-type="bool" ${on?'checked':''}>
      <span class="set-switch"></span>
      <span class="set-toggle-label">${esc(it.label)}</span>
    </label>`;
  }
  if(it.type==='long'){
    return `<div class="set-field">
      <label for="${id}">${esc(it.label)}</label>
      <textarea id="${id}" data-key="${it.key}" data-type="long" rows="5">${esc(it.value)}</textarea>
    </div>`;
  }
  const inputType=it.type==='number'?'number':(it.type==='email'?'email':'text');
  const limits=it.type==='number'?`min="${it.min??0}" max="${it.max??999999}"`:'';
  return `<div class="set-field">
    <label for="${id}">${esc(it.label)}</label>
    <input type="${inputType}" id="${id}" data-key="${it.key}" data-type="${it.type}"
           value="${esc(it.value)}" ${limits}>
  </div>`;
}

async function saveSettings(e){
  e.preventDefault();
  const btn=document.getElementById('saveSettingsBtn');
  btn.disabled=true;
  const payload={};
  document.querySelectorAll('#settingsGroups [data-key]').forEach(el=>{
    payload[el.dataset.key]=el.dataset.type==='bool'?(el.checked?'1':'0'):el.value;
  });
  try{
    const res=await api('/settings',{method:'PUT',body:JSON.stringify(payload)});
    toast(res.message||'ذخیره شد');
  }catch(err){
    toast(err.message||'ذخیره نشد','error');
  }
  btn.disabled=false;
}

// صف تأیید مطالب و درخواست‌های نویسندگی روی داشبورد
function renderQueues(data){
  const rq=document.getElementById('dashReviewQueue');
  const queue=data.reviewQueue||[];
  rq.innerHTML=queue.length?queue.map(q=>`
    <div class="q-row">
      <span class="q-ico">${q.category_icon||'🏥'}</span>
      <span class="q-body">
        <span class="q-name">${esc(q.name)}</span>
        <span class="q-meta">${esc(q.author_name||'نامشخص')} · ${Jalali.relative(q.submitted_at)}</span>
      </span>
      <button class="q-go" data-goto-review="${q.id}">بررسی</button>
    </div>`).join(''):'<p class="muted">صف خالیه 🎉</p>';
  rq.querySelectorAll('[data-goto-review]').forEach(b=>
    b.addEventListener('click',()=>{showPage('review');loadReviewQueue()}));

  const aq=document.getElementById('dashAuthorQueue');
  const reqs=data.authorQueue||[];
  aq.innerHTML=reqs.length?reqs.map(r=>`
    <div class="q-row">
      <span class="q-ico">✍️</span>
      <span class="q-body">
        <span class="q-name">${esc(r.full_name)}</span>
        <span class="q-meta">${esc(r.author_request_note||'بدون توضیح')} · ${Jalali.relative(r.author_requested_at)}</span>
      </span>
      <span class="q-actions">
        <button class="q-ok" data-req-ok="${r.id}">تأیید</button>
        <button class="q-no" data-req-no="${r.id}">رد</button>
      </span>
    </div>`).join(''):'<p class="muted">درخواستی در انتظار نیست.</p>';

  aq.querySelectorAll('[data-req-ok]').forEach(b=>
    b.addEventListener('click',()=>decideAuthorRequest(b.dataset.reqOk,'approve')));
  aq.querySelectorAll('[data-req-no]').forEach(b=>
    b.addEventListener('click',()=>decideAuthorRequest(b.dataset.reqNo,'reject')));
}

async function decideAuthorRequest(id,decision){
  let note='';
  if(decision==='reject'){
    note=prompt('دلیل رد درخواست؟ (اختیاری، برای کاربر ارسال می‌شود)')||'';
  }else if(!confirm('این کاربر نویسنده شود؟')){return}
  try{
    const res=await api(`/author-requests/${id}`,{method:'POST',body:JSON.stringify({decision,note})});
    toast(res.message||'انجام شد');
    loadDashboard();
  }catch(e){toast(e.message||'خطا','error')}
}

// آخرین مطالب افزوده‌شده
function renderLatest(posts){
  const el=document.getElementById('dashLatest');
  const STATUS_STYLE={approved:'ok',pending:'warn',draft:'muted',rejected:'bad',changes_requested:'warn'};
  el.innerHTML=posts.length?posts.map(p=>`
    <div class="q-row">
      <span class="q-ico">${p.category_icon||'🏥'}</span>
      <span class="q-body">
        <span class="q-name">${esc(p.name)}</span>
        <span class="q-meta">${esc(p.author_name||'مدیر')} · ${esc(p.category_name)} · ${Jalali.relative(p.created_at)}</span>
      </span>
      <span class="q-status q-${STATUS_STYLE[p.status]||'muted'}">${STATUS_FA[p.status]||p.status}</span>
    </div>`).join(''):'<p class="muted">هنوز مطلبی اضافه نشده.</p>';
}

// گزارش اشتراک‌گذاری و علاقه‌مندی
function renderEngagement(e){
  const CHANNEL_FA={telegram:'تلگرام',whatsapp:'واتساپ',eitaa:'ایتا',bale:'بله',
    rubika:'روبیکا',twitter:'ایکس',linkedin:'لینکدین',email:'ایمیل',
    copy:'کپی لینک',native:'اشتراک گوشی'};
  const CHANNEL_COLOR={telegram:'#29b6f6',whatsapp:'#25d366',eitaa:'#ff7a00',
    bale:'#1e88e5',rubika:'#8e24aa',twitter:'#9ca3af',linkedin:'#0a66c2',
    email:'#f59e0b',copy:'#6366f1',native:'#10b981'};

  const el=document.getElementById('dashShares');
  const rows=e.sharesByChannel||[];
  const total=e.totalShares||0;
  if(!rows.length){
    el.innerHTML='<p class="muted">هنوز مطلبی اشتراک‌گذاری نشده.</p>';
  }else{
    const max=Math.max(...rows.map(r=>r.count));
    el.innerHTML=`<div class="eng-total">مجموع: <strong>${fa(total)}</strong> اشتراک‌گذاری</div>`+
      rows.map(r=>`
      <div class="bar-row">
        <div class="bar-label">${CHANNEL_FA[r.channel]||esc(r.channel)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:0;background:${CHANNEL_COLOR[r.channel]||'#6366f1'}" data-w="${(r.count/max*100).toFixed(1)}"></div></div>
        <div class="bar-value">${fa(r.count)}</div>
      </div>`).join('');
    requestAnimationFrame(()=>el.querySelectorAll('.bar-fill').forEach(b=>b.style.width=b.dataset.w+'%'));
  }

  const fv=document.getElementById('dashTopFav');
  const top=e.topFavorites||[];
  fv.innerHTML=`<div class="eng-total">❤️ ${fa(e.favorites||0)} علاقه‌مندی · 🔖 ${fa(e.bookmarks||0)} نشان</div>`+
    (top.length?top.map((t,i)=>`
      <div class="q-row">
        <span class="q-rank">${fa(i+1)}</span>
        <span class="q-body"><span class="q-name">${esc(t.name)}</span></span>
        <span class="q-count">❤️ ${fa(t.count)}</span>
      </div>`).join('')
     :'<p class="muted">هنوز کسی مطلبی را نپسندیده.</p>');
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
  renderPostStatus(op);
  loadComments(op.id);
}

// ── وضعیت پست و گفتگو با مدیر ──────────────────────────────────────
function renderPostStatus(op){
  const bar=document.getElementById('postStatusBar');
  const isAdmin=currentUser?.role==='admin';
  const locked=op.is_locked===1;

  const styles={draft:'muted',pending:'warn',approved:'ok',
    rejected:'bad',changes_requested:'warn'};
  const hints={
    draft:'این پست هنوز ارسال نشده. وقتی آماده شد برای بررسی بفرست.',
    pending:'در صف بررسی مدیره. تا وقتی بررسی نشده می‌تونی ویرایشش کنی.',
    approved:'تأیید و منتشر شده. برای ویرایش باید مدیر قفلش رو باز کنه.',
    rejected:'تأیید نشد. نظر مدیر رو در گفتگو ببین.',
    changes_requested:'مدیر خواسته اصلاحش کنی. توضیحات در گفتگوست.'
  };

  bar.classList.remove('hidden');
  bar.innerHTML=`
    <span class="q-status q-${styles[op.status]||'muted'}">${STATUS_FA[op.status]||op.status}</span>
    <span class="status-hint">${hints[op.status]||''}</span>
    <span class="status-actions">
      ${!locked&&op.status!=='pending'
        ? `<button class="btn btn-primary btn-sm" id="submitPostBtn">📤 ارسال برای بررسی</button>`:''}
      ${locked&&isAdmin
        ? `<button class="btn btn-sm" id="unlockPostBtn">🔓 باز کردن قفل</button>`:''}
    </span>`;

  document.getElementById('submitPostBtn')?.addEventListener('click',()=>submitPost(op.id));
  document.getElementById('unlockPostBtn')?.addEventListener('click',()=>unlockPost(op.id));

  // پست قفل‌شده نباید ویرایش‌پذیر به نظر برسد
  descEditor?.enable(!locked);
  instrEditor?.enable(!locked);
  document.getElementById('saveContentBtn').disabled=locked;
}

async function submitPost(id){
  if(!confirm('این پست برای بررسی مدیر ارسال شود؟'))return;
  try{
    const res=await api(`/operations/${id}/submit`,{method:'POST'});
    toast(res.message||'ارسال شد');
    loadOperationContent(id);
  }catch(e){toast(e.message||'ارسال نشد','error')}
}

async function unlockPost(id){
  if(!confirm('قفل این پست باز شود تا قابل ویرایش شود؟'))return;
  try{
    const res=await api(`/operations/${id}/unlock`,{method:'POST'});
    toast(res.message||'قفل باز شد');
    loadOperationContent(id);
  }catch(e){toast(e.message||'انجام نشد','error')}
}

async function loadComments(opId){
  const box=document.getElementById('commentBox');
  const list=document.getElementById('commentList');
  box.classList.remove('hidden');
  try{
    const comments=await api(`/operations/${opId}/comments`);
    const btn=document.getElementById('toggleComments');
    btn.textContent=comments.length?`نمایش (${fa(comments.length)})`:'نمایش';

    list.innerHTML=comments.length?comments.map(c=>`
      <div class="comment ${c.kind==='review'?'from-admin':'from-author'}">
        <div class="comment-meta">
          <span class="comment-author">${c.user_role==='admin'?'👨‍💼':'✍️'} ${esc(c.user_name)}</span>
          <span class="comment-time">${Jalali.relative(c.created_at)}</span>
        </div>
        <div class="comment-body">${esc(c.body)}</div>
      </div>`).join('')
      :'<p class="muted" style="padding:12px">هنوز پیامی رد و بدل نشده.</p>';
  }catch(e){
    list.innerHTML='<p class="muted" style="padding:12px">خواندن گفتگو ناموفق بود.</p>';
  }
}

async function sendComment(){
  const input=document.getElementById('commentInput');
  const body=input.value.trim();
  if(!body){toast('پیام خالیه','error');return}
  if(!currentContentOp)return;
  const btn=document.getElementById('sendCommentBtn');
  btn.disabled=true;
  try{
    await api(`/operations/${currentContentOp.id}/comments`,{method:'POST',
      body:JSON.stringify({body})});
    input.value='';
    toast('پیامت ثبت شد');
    loadComments(currentContentOp.id);
  }catch(e){toast(e.message||'ارسال نشد','error')}
  btn.disabled=false;
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
// ── مدیریت دسته‌بندی‌ها ─────────────────────────────────────────────
async function loadCategories(){
  const el=document.getElementById('categoriesList');
  el.innerHTML='<div class="loading-row"><div class="spinner"></div></div>';
  try{
    const cats=await api('/categories');
    allCategories=cats;
    el.innerHTML=cats.map(c=>`
      <div class="cat-row" data-cat="${c.id}">
        <span class="cat-ico" style="background:${esc(c.color)}22;border-color:${esc(c.color)}55">${c.icon||'🏥'}</span>
        <span class="cat-body">
          <span class="cat-name">${esc(c.name_fa)}</span>
          <span class="cat-sub">${esc(c.name_en||'')} · کلید: ${esc(c.key)} · ${fa(c.operation_count)} عمل</span>
        </span>
        <span class="cat-order">ترتیب: ${fa(c.sort_order)}</span>
        <span class="row-actions">
          <button class="btn-icon" data-cat-up="${c.id}" title="بالا">▲</button>
          <button class="btn-icon" data-cat-down="${c.id}" title="پایین">▼</button>
          <button class="btn-icon" data-cat-edit="${c.id}" title="ویرایش">✏️</button>
          <button class="btn-icon btn-icon-danger" data-cat-del="${c.id}" title="حذف">🗑️</button>
        </span>
      </div>`).join('')||'<p class="muted">هنوز دسته‌بندی‌ای ساخته نشده.</p>';

    el.querySelectorAll('[data-cat-edit]').forEach(b=>
      b.addEventListener('click',()=>openCategoryModal(b.dataset.catEdit)));
    el.querySelectorAll('[data-cat-del]').forEach(b=>
      b.addEventListener('click',()=>deleteCategory(b.dataset.catDel)));
    el.querySelectorAll('[data-cat-up]').forEach(b=>
      b.addEventListener('click',()=>moveCategory(b.dataset.catUp,-1)));
    el.querySelectorAll('[data-cat-down]').forEach(b=>
      b.addEventListener('click',()=>moveCategory(b.dataset.catDown,1)));
  }catch(e){
    el.innerHTML='<p class="muted">خواندن دسته‌بندی‌ها ناموفق بود.</p>';
  }
}

function openCategoryModal(id){
  const c=id?allCategories.find(x=>String(x.id)===String(id)):null;
  document.getElementById('categoryModalTitle').textContent=c?'ویرایش دسته‌بندی':'دسته‌بندی جدید';
  document.getElementById('catId').value=c?c.id:'';
  document.getElementById('catNameFa').value=c?c.name_fa:'';
  document.getElementById('catNameEn').value=c?(c.name_en||''):'';
  document.getElementById('catIcon').value=c?(c.icon||'🏥'):'🏥';
  document.getElementById('catColor').value=c?(c.color||'#3b82f6'):'#3b82f6';
  document.getElementById('catOrder').value=c?c.sort_order:'';
  openModal('categoryModal');
}

async function saveCategory(e){
  e.preventDefault();
  const id=document.getElementById('catId').value;
  const body={
    name_fa:document.getElementById('catNameFa').value.trim(),
    name_en:document.getElementById('catNameEn').value.trim(),
    icon:document.getElementById('catIcon').value.trim(),
    color:document.getElementById('catColor').value,
    sort_order:document.getElementById('catOrder').value===''
      ?undefined:Number(document.getElementById('catOrder').value)
  };
  try{
    const res=id
      ? await api(`/categories/${id}`,{method:'PUT',body:JSON.stringify(body)})
      : await api('/categories',{method:'POST',body:JSON.stringify(body)});
    toast(res.message||'ذخیره شد');
    closeModal('categoryModal');
    loadCategories();
  }catch(err){toast(err.message||'ذخیره نشد','error')}
}

async function moveCategory(id,delta){
  const idx=allCategories.findIndex(c=>String(c.id)===String(id));
  const swapWith=allCategories[idx+delta];
  if(!swapWith)return;   // اول یا آخر فهرست
  const me=allCategories[idx];
  try{
    await api(`/categories/${me.id}`,{method:'PUT',body:JSON.stringify({sort_order:swapWith.sort_order})});
    await api(`/categories/${swapWith.id}`,{method:'PUT',body:JSON.stringify({sort_order:me.sort_order})});
    loadCategories();
  }catch(e){toast('جابه‌جایی انجام نشد','error')}
}

async function deleteCategory(id){
  const c=allCategories.find(x=>String(x.id)===String(id));
  if(!confirm(`دسته‌بندی «${c?.name_fa||''}» حذف شود؟`))return;
  try{
    const res=await api(`/categories/${id}`,{method:'DELETE'});
    toast(res.message||'حذف شد');
    loadCategories();
  }catch(err){
    // سرور وقتی دسته‌بندی عمل دارد، تأیید صریح می‌خواهد
    const msg=err.message||'';
    if(/عمل جراحی دارد/.test(msg)){
      if(confirm(msg+'\n\nمطمئنی؟ این کار برگشت‌ناپذیر است.')){
        try{
          const res=await api(`/categories/${id}?force=1`,{method:'DELETE'});
          toast(res.message||'حذف شد');
          loadCategories();
        }catch(e2){toast(e2.message||'حذف نشد','error')}
      }
    }else toast(msg||'حذف نشد','error');
  }
}

const ROLE_FA={admin:'مدیر',editor:'نویسنده',user:'کاربر'};
let allUsers=[];

async function loadUsers(){
  allUsers=await api('/auth/users');
  renderUsers();
}

function renderUsers(){
  const filter=document.getElementById('userFilter')?.value||'all';
  const search=(document.getElementById('userSearch')?.value||'').trim().toLowerCase();

  let list=allUsers;
  if(filter==='admin'||filter==='editor'||filter==='user')list=list.filter(u=>u.role===filter);
  else if(filter==='inactive')list=list.filter(u=>u.is_active===0);
  else if(filter==='pending')list=list.filter(u=>u.author_request_status==='pending');
  if(search)list=list.filter(u=>
    (u.full_name||'').toLowerCase().includes(search)||
    (u.username||'').toLowerCase().includes(search)||
    (u.email||'').toLowerCase().includes(search));

  const body=document.getElementById('usersTableBody');
  if(!list.length){
    body.innerHTML='<tr><td colspan="6"><p class="muted" style="text-align:center;padding:24px">کاربری با این فیلتر پیدا نشد.</p></td></tr>';
    return;
  }

  body.innerHTML=list.map(u=>{
    const isSelf=u.id===currentUser?.id;
    const inactive=u.is_active===0;
    const avatarBg=u.role==='admin'?'var(--accent)':u.role==='editor'?'#10b981':'var(--bg-5)';
    return `<tr class="${inactive?'row-inactive':''}">
      <td>
        <div class="user-cell">
          <div class="user-avatar-sm" style="background:${u.avatar?`center/cover url(${esc(u.avatar)})`:avatarBg}">${u.avatar?'':esc((u.full_name||'?').charAt(0))}</div>
          <div class="user-cell-body">
            <span class="user-cell-name">${esc(u.full_name)}${isSelf?' <span class="you-tag">(شما)</span>':''}</span>
            <span class="user-cell-sub">${esc(u.username)}${u.email?' · '+esc(u.email):''}</span>
          </div>
        </div>
      </td>
      <td>
        <select class="role-select" data-role-for="${u.id}" ${isSelf?'disabled':''}>
          ${['admin','editor','user'].map(r=>
            `<option value="${r}" ${u.role===r?'selected':''}>${ROLE_FA[r]}</option>`).join('')}
        </select>
      </td>
      <td>
        ${u.author_request_status==='pending'
          ? '<span class="q-status q-warn">درخواست نویسندگی</span>'
          : inactive ? '<span class="q-status q-bad">غیرفعال</span>'
          : '<span class="q-status q-ok">فعال</span>'}
      </td>
      <td class="cell-num">${fa(u.post_count||0)}</td>
      <td class="cell-date">
        ${Jalali.format(u.created_at,'short')}
        ${u.last_login_at?`<span class="cell-sub">آخرین ورود: ${Jalali.relative(u.last_login_at)}</span>`:''}
      </td>
      <td>
        <div class="row-actions">
          <button class="btn-icon" data-detail="${u.id}" title="جزئیات">👁️</button>
          ${isSelf?'':`
            <button class="btn-icon" data-toggle-active="${u.id}" data-active="${u.is_active}"
                    title="${inactive?'فعال کردن':'غیرفعال کردن'}">${inactive?'✅':'🚫'}</button>
            <button class="btn-icon btn-icon-danger" data-del="${u.id}" title="حذف">🗑️</button>`}
        </div>
      </td>
    </tr>`;
  }).join('');

  body.querySelectorAll('[data-role-for]').forEach(sel=>
    sel.addEventListener('change',()=>changeUserRole(sel.dataset.roleFor,sel.value)));
  body.querySelectorAll('[data-toggle-active]').forEach(b=>
    b.addEventListener('click',()=>toggleUserActive(b.dataset.toggleActive,b.dataset.active==='1')));
  body.querySelectorAll('[data-del]').forEach(b=>
    b.addEventListener('click',()=>deleteUser(b.dataset.del)));
  body.querySelectorAll('[data-detail]').forEach(b=>
    b.addEventListener('click',()=>showUserDetail(b.dataset.detail)));
}

async function changeUserRole(id,role){
  try{
    const res=await api(`/auth/users/${id}/role`,{method:'POST',body:JSON.stringify({role})});
    toast(res.message||'تغییر کرد');
    loadUsers();
  }catch(e){
    toast(e.message||'تغییر انجام نشد','error');
    loadUsers();  // برگرداندن مقدار قبلی در select
  }
}

async function toggleUserActive(id,isActive){
  let reason='';
  if(isActive){
    reason=prompt('دلیل غیرفعال کردن؟ (به کاربر نشان داده می‌شود، اختیاری)')||'';
    if(reason===null)return;
  }
  try{
    const res=await api(`/auth/users/${id}/active`,{method:'POST',
      body:JSON.stringify({is_active:!isActive,reason})});
    toast(res.message||'انجام شد');
    loadUsers();
  }catch(e){toast(e.message||'انجام نشد','error')}
}

function showUserDetail(id){
  const u=allUsers.find(x=>String(x.id)===String(id));
  if(!u)return;
  const rows=[
    ['نام کامل',u.full_name],['نام کاربری',u.username],['ایمیل',u.email||'—'],
    ['سطح دسترسی',ROLE_FA[u.role]],
    ['وضعیت',u.is_active===0?'غیرفعال':'فعال'],
    ['تعداد پست',fa(u.post_count||0)],
    ['تاریخ عضویت',Jalali.format(u.created_at,'full')],
    ['آخرین ورود',u.last_login_at?Jalali.format(u.last_login_at,'datetime'):'هرگز'],
    ['درخواست نویسندگی',{pending:'در انتظار بررسی',approved:'تأییدشده',
      rejected:'ردشده',none:'—'}[u.author_request_status]||'—']
  ];
  if(u.author_request_note)rows.push(['توضیح درخواست',u.author_request_note]);
  document.getElementById('userDetailTitle').textContent=u.full_name;
  document.getElementById('userDetailBody').innerHTML=rows.map(([k,v])=>
    `<div class="detail-row"><span class="detail-key">${k}</span><span class="detail-val">${esc(v)}</span></div>`).join('');
  openModal('userDetailModal');
}

async function deleteUser(id){
  const u=allUsers.find(x=>String(x.id)===String(id));
  if(!confirm(`حساب «${u?.full_name||''}» حذف شود؟\n\nپست‌هایش حذف نمی‌شوند، فقط بی‌صاحب می‌مانند.`))return;
  try{
    const res=await api(`/auth/users/${id}`,{method:'DELETE'});
    toast(res.message||'حذف شد');
    loadUsers();
  }catch(e){toast(e.message||'حذف انجام نشد','error')}
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
  initTheme();
  document.getElementById('adminThemeToggle')?.addEventListener('click',toggleTheme);
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
      if(item.dataset.page==='settings')loadSettings();
      if(item.dataset.page==='reports')loadReports();
      if(item.dataset.page==='categories')loadCategories();
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
  document.getElementById('settingsForm')?.addEventListener('submit',saveSettings);
  document.getElementById('sendCommentBtn')?.addEventListener('click',sendComment);
  document.getElementById('toggleComments')?.addEventListener('click',()=>{
    const l=document.getElementById('commentList'),c=document.getElementById('commentCompose');
    const hidden=l.classList.contains('hidden');
    l.classList.toggle('hidden',!hidden);c.classList.toggle('hidden',!hidden);
    document.getElementById('toggleComments').textContent=hidden?'بستن':'نمایش';
  });
  document.querySelectorAll('.range-btn').forEach(b=>b.addEventListener('click',()=>loadReports(Number(b.dataset.days))));
  document.getElementById('addUserBtn').addEventListener('click',()=>openModal('addUserModal'));
  document.getElementById('userSearch')?.addEventListener('input',renderUsers);
  document.getElementById('userFilter')?.addEventListener('change',renderUsers);
  document.getElementById('addCategoryBtn')?.addEventListener('click',()=>openCategoryModal(null));
  document.getElementById('categoryForm')?.addEventListener('submit',saveCategory);
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
