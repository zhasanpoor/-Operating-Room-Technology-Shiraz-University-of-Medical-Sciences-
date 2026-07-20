const API_BASE = '/api';

const app = {
    categories: [],
    currentCategory: null,
    currentOperation: null,
    user: null,
    token: null,

    async init() {
        this.token = localStorage.getItem('auth_token');
        if (this.token) {
            await this.checkAuth();
            if (this.token) this.loadNotifications();
        }
        this.updateAuthUI();
        await this.loadStats();
        await this.loadCategories();
        this.bindEvents();
    },

    async checkAuth() {
        try {
            const res = await fetch(`${API_BASE}/auth/me`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (res.ok) {
                this.user = await res.json();
            } else {
                this.token = null;
                this.user = null;
                localStorage.removeItem('auth_token');
            }
        } catch (err) {
            this.token = null;
            this.user = null;
            localStorage.removeItem('auth_token');
        }
    },

    async login(username, password, captcha) {
        const body = { username, password };
        if (captcha) { body.captchaToken = captcha.token; body.captchaAnswer = captcha.answer; }
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) { const e = new Error(data.error); e.data = data; throw e; }
        this.token = data.token;
        this.user = data.user;
        localStorage.setItem('auth_token', data.token);
        this.updateAuthUI();
        this.loadNotifications();
        return data;
    },

    async signup(payload) {
        const res = await fetch(`${API_BASE}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) { const e = new Error(data.error); e.data = data; throw e; }
        this.token = data.token;
        this.user = data.user;
        localStorage.setItem('auth_token', data.token);
        this.updateAuthUI();
        this.loadNotifications();
        return data;
    },

    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('auth_token');
        this.updateAuthUI();
    },

    roleLabel(role) {
        return role === 'admin' ? 'مدیر سیستم'
             : role === 'editor' ? 'نویسنده' : 'کاربر';
    },

    updateAuthUI() {
        const authBtn = document.getElementById('authBtn');
        const userInfo = document.getElementById('userInfo');

        if (this.user) {
            authBtn.classList.add('hidden');
            userInfo.classList.remove('hidden');
            const name = this.user.full_name || this.user.username;
            document.getElementById('userName').textContent = name;
            document.getElementById('userRole').textContent = this.roleLabel(this.user.role);
            const av = document.getElementById('userChipAvatar');
            if (this.user.avatar) {
                av.style.backgroundImage = `url(${this.user.avatar})`;
                av.textContent = '';
                av.classList.add('has-img');
            } else {
                av.textContent = (name || '؟').charAt(0);
                av.style.backgroundImage = '';
                av.classList.remove('has-img');
            }
            // پنل فقط برای مدیر و نویسنده
            const panel = document.getElementById('panelLink');
            if (this.user.role === 'admin' || this.user.role === 'editor') {
                panel.classList.remove('hidden');
            } else {
                panel.classList.add('hidden');
            }
        } else {
            authBtn.classList.remove('hidden');
            userInfo.classList.add('hidden');
        }
    },

    // ── اعلان‌ها ────────────────────────────────────────────────
    async loadNotifications() {
        if (!this.token) return;
        try {
            const res = await fetch(`${API_BASE}/notifications`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (!res.ok) return;
            const data = await res.json();
            const count = document.getElementById('notifCount');
            if (data.unread > 0) {
                count.textContent = data.unread > 9 ? '۹+' : this.faNum(data.unread);
                count.classList.remove('hidden');
            } else {
                count.classList.add('hidden');
            }
            const list = document.getElementById('notifList');
            list.innerHTML = data.notifications.length
                ? data.notifications.map(n => `
                    <div class="notif-item ${n.is_read ? '' : 'unread'}">
                        <span class="notif-ico">${n.icon || '🔔'}</span>
                        <div class="notif-body">
                            <div class="notif-title">${this.esc(n.title)}</div>
                            <div class="notif-text">${this.esc(n.body || '')}</div>
                            <div class="notif-time">${window.Jalali ? Jalali.relative(n.created_at) : ''}</div>
                        </div>
                    </div>`).join('')
                : '<p class="notif-empty">اعلانی نداری</p>';
        } catch (err) { /* بی‌صدا */ }
    },

    async markNotificationsRead() {
        if (!this.token) return;
        await fetch(`${API_BASE}/notifications/read-all`, {
            method: 'POST', headers: { 'Authorization': `Bearer ${this.token}` }
        });
        this.loadNotifications();
    },

    faNum(n) { return String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]); },
    esc(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; },

    async loadStats() {
        try {
            const res = await fetch(`${API_BASE}/stats`);
            const stats = await res.json();
            document.getElementById('totalCategories').textContent = stats.total_categories;
            document.getElementById('totalOperations').textContent = stats.total_operations;
            document.getElementById('totalContent').textContent = stats.content_count;
        } catch (err) {
            console.error('Error loading stats:', err);
        }
    },

    async loadCategories() {
        try {
            const res = await fetch(`${API_BASE}/categories`);
            this.categories = await res.json();
            this.renderCategories();
        } catch (err) {
            console.error('Error loading categories:', err);
        }
    },

    renderCategories() {
        const grid = document.getElementById('categoriesGrid');
        grid.innerHTML = '';

        this.categories.forEach(cat => {
            const card = document.createElement('div');
            card.className = 'category-card';
            card.setAttribute('data-cat', cat.key);
            card.style.setProperty('--card-color', cat.color);

            const style = document.createElement('style');
            style.textContent = `
                .category-card[data-cat="${cat.key}"]::before { background: ${cat.color}; }
                .category-card[data-cat="${cat.key}"]:hover::before { background: ${cat.color}; }
            `;
            document.head.appendChild(style);

            card.innerHTML = `
                <span class="category-icon">${cat.icon}</span>
                <div class="category-name-fa">${cat.name_fa}</div>
                <div class="category-name-en">${cat.name_en}</div>
                <div class="category-count">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                    ${cat.operation_count} عمل جراحی
                </div>
            `;

            card.addEventListener('click', () => this.openCategory(cat.key));
            grid.appendChild(card);
        });
    },

    async openCategory(key) {
        try {
            const res = await fetch(`${API_BASE}/categories/${key}`);
            const data = await res.json();
            this.currentCategory = data;

            document.getElementById('categoriesSection').classList.add('hidden');
            document.getElementById('operationsSection').classList.remove('hidden');

            document.getElementById('operationsHeader').innerHTML = `
                <h2>${data.icon} ${data.name_fa}</h2>
                <p>${data.name_en} — ${data.operations.length} عمل جراحی</p>
            `;

            this.renderOperations(data.operations, data.color);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            console.error('Error loading category:', err);
        }
    },

    renderOperations(operations, color) {
        const grid = document.getElementById('operationsGrid');
        grid.innerHTML = '';

        operations.forEach(op => {
            const card = document.createElement('div');
            card.className = 'operation-card';
            card.innerHTML = `
                <div class="operation-id" style="background: ${color}22; color: ${color};">${op.op_number}</div>
                <div class="operation-name">${op.name}</div>
                <div class="operation-arrow">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </div>
            `;
            card.addEventListener('click', () => this.openModal(op));
            grid.appendChild(card);
        });
    },

    async openModal(op) {
        this.currentOperation = op;

        document.getElementById('modalHeader').innerHTML = `
            <h2>${op.name}</h2>
            <p>${this.currentCategory.icon} ${this.currentCategory.name_fa} — شماره ${op.op_number}</p>
        `;

        this.renderDescription(op.description);
        this.renderInstruments(op.instruments);
        this.renderVideos(op);
        this.renderSlides(op);

        document.getElementById('modalOverlay').classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(t => t.classList.remove('active'));
        tabs[0].classList.add('active');
        const contents = document.querySelectorAll('.tab-content');
        contents.forEach(c => c.classList.remove('active'));
        document.getElementById('tabDescription').classList.add('active');
    },

    renderDescription(text) {
        const el = document.getElementById('descContent');
        if (!text || text.trim() === '') {
            el.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <h3>شرح عمل جراحی</h3>
                    <p>محتوای شرح عمل هنوز وارد نشده است.</p>
                    <p class="hint">از پنل مدیریت محتوا برای اضافه کردن شرح عمل استفاده کنید.</p>
                </div>
            `;
        } else {
            el.innerHTML = this.formatText(text);
        }
    },

    renderInstruments(text) {
        const el = document.getElementById('instrumentsContent');
        if (!text || text.trim() === '') {
            el.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔧</div>
                    <h3>ابزارهای مورد نیاز</h3>
                    <p>لیست ابزارها هنوز وارد نشده است.</p>
                    <p class="hint">از پنل مدیریت محتوا برای اضافه کردن ابزارها استفاده کنید.</p>
                </div>
            `;
        } else {
            el.innerHTML = this.formatText(text);
        }
    },

    renderVideos(op) {
        const el = document.getElementById('videosContent');
        const hasVideos = (op.video_url_1 && op.video_url_1.trim()) || (op.video_url_2 && op.video_url_2.trim());

        if (!hasVideos) {
            el.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🎬</div>
                    <h3>فیلم عمل جراحی</h3>
                    <p>ویدیوی آموزشی هنوز اضافه نشده است.</p>
                    <p class="hint">از پنل مدیریت محتوا لینک YouTube را اضافه کنید.</p>
                </div>
            `;
            return;
        }

        el.innerHTML = '';

        if (op.video_url_1 && op.video_url_1.trim()) {
            const card = document.createElement('div');
            card.className = 'video-card';
            const embedUrl = this.getYouTubeEmbed(op.video_url_1);
            if (embedUrl) {
                card.innerHTML = `
                    <h4>${op.video_title_1 || 'ویدیوی اول'}</h4>
                    <iframe class="video-embed" src="${embedUrl}" allowfullscreen></iframe>
                `;
            } else {
                card.innerHTML = `
                    <h4>${op.video_title_1 || 'ویدیوی اول'}</h4>
                    <a href="${op.video_url_1}" target="_blank" class="video-link">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="23 7 16 12 23 17 23 7"></polygon>
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                        </svg>
                        مشاهده در YouTube
                    </a>
                `;
            }
            el.appendChild(card);
        }

        if (op.video_url_2 && op.video_url_2.trim()) {
            const card = document.createElement('div');
            card.className = 'video-card';
            const embedUrl = this.getYouTubeEmbed(op.video_url_2);
            if (embedUrl) {
                card.innerHTML = `
                    <h4>${op.video_title_2 || 'ویدیوی دوم'}</h4>
                    <iframe class="video-embed" src="${embedUrl}" allowfullscreen></iframe>
                `;
            } else {
                card.innerHTML = `
                    <h4>${op.video_title_2 || 'ویدیوی دوم'}</h4>
                    <a href="${op.video_url_2}" target="_blank" class="video-link">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="23 7 16 12 23 17 23 7"></polygon>
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                        </svg>
                        مشاهده در YouTube
                    </a>
                `;
            }
            el.appendChild(card);
        }
    },

    renderSlides(op) {
        const el = document.getElementById('slidesContent');
        if (!op.slides_url || op.slides_url.trim() === '') {
            el.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📊</div>
                    <h3>فایل ارائه (اسلاید)</h3>
                    <p>اسلایدهای آموزشی هنوز اضافه نشده است.</p>
                    <p class="hint">از پنل مدیریت محتوا لینک Google Slides را اضافه کنید.</p>
                </div>
            `;
            return;
        }

        const embedUrl = this.getGoogleSlidesEmbed(op.slides_url);
        if (embedUrl) {
            el.innerHTML = `
                <div class="slides-card">
                    <h4>${op.slides_title || 'اسلایدهای آموزشی'}</h4>
                    <iframe class="slides-embed" src="${embedUrl}" allowfullscreen></iframe>
                </div>
            `;
        } else {
            el.innerHTML = `
                <div class="slides-card">
                    <h4>${op.slides_title || 'اسلایدهای آموزشی'}</h4>
                    <a href="${op.slides_url}" target="_blank" class="slides-link">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                            <line x1="8" y1="21" x2="16" y2="21"></line>
                            <line x1="12" y1="17" x2="12" y2="21"></line>
                        </svg>
                        مشاهده اسلایدها
                    </a>
                </div>
            `;
        }
    },

    // ویدیو را به نشانی embed تبدیل می‌کند — یوتیوب، آپارات و ویمئو.
    // باید با سفیدفهرست سرور در lib/sanitize.js هماهنگ بماند.
    getYouTubeEmbed(url) { return this.getVideoEmbed(url); },

    getVideoEmbed(url) {
        if (!url) return null;
        let parsed;
        try { parsed = new URL(url.trim()); } catch (e) { return null; }
        const host = parsed.hostname.toLowerCase();

        // یوتیوب — نسخهٔ nocookie برای حریم خصوصی بهتر
        const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/)
                 || url.match(/youtube\.com\/shorts\/([\w-]{11})/);
        if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;

        // آپارات
        if (host.endsWith('aparat.com')) {
            const m = parsed.pathname.match(/\/v\/([\w-]+)/);
            if (m) return `https://www.aparat.com/video/video/embed/videohash/${m[1]}/vt/frame`;
        }

        // ویمئو
        if (host.endsWith('vimeo.com')) {
            const m = parsed.pathname.match(/(\d{6,})/);
            if (m) return `https://player.vimeo.com/video/${m[1]}`;
        }

        return null;
    },

    getGoogleSlidesEmbed(url) {
        if (!url) return null;
        if (url.includes('/pub?')) return url.replace('/pub?', '/embed?');
        if (url.includes('/edit')) return url.replace('/edit', '/embed');
        if (!url.includes('/embed')) return url + '/embed';
        return url;
    },

    formatText(text) {
        if (!text) return '';

        // محتوای تولیدشده با ویرایشگر جدید از قبل HTML است و همان‌طور
        // نمایش داده می‌شود. محتوای قدیمی (۱۴۳ عمل seed شده) متن ساده با
        // خط جدید است و باید مثل قبل قالب‌بندی شود.
        //
        // ایمنی: درج مستقیم فقط به این دلیل مجاز است که سرور هنگام ذخیره
        // محتوا را با lib/sanitize.js پاک می‌کند. اگر روزی آن پاک‌سازی
        // برداشته شود، این خط تبدیل به آسیب‌پذیری XSS می‌شود.
        if (/<(p|h[1-6]|ul|ol|li|div|br|strong|em|b|i|u|blockquote|pre|table|img|span)\b/i.test(text)) {
            return text;
        }

        const lines = text.split('\n');
        let html = '';
        let inList = false;
        let inNumberedList = false;

        for (const line of lines) {
            const trimmed = line.trim();

            if (!trimmed) {
                if (inList || inNumberedList) {
                    html += '</ul>';
                    inList = false;
                    inNumberedList = false;
                }
                continue;
            }

            // Numbered section heading: ۱. ۲. ۳. or 1. 2. 3.
            if (/^[۰-۹0-9]+[\.\)]\s/.test(trimmed)) {
                if (inList || inNumberedList) {
                    html += '</ul>';
                    inList = false;
                    inNumberedList = false;
                }
                const num = trimmed.match(/^([۰-۹0-9]+)[\.\)]/)[1];
                const rest = trimmed.replace(/^[۰-۹0-9]+[\.\)]\s*/, '');
                html += `<h3 class="content-section-title"><span class="section-number">${num}</span> ${rest}</h3>`;
            }
            // Bullet with - or •
            else if (/^[-•]\s/.test(trimmed) || /^•/.test(trimmed)) {
                if (!inList && !inNumberedList) {
                    html += '<ul class="content-list">';
                    inList = true;
                }
                const bulletText = trimmed.replace(/^[-•]\s*/, '');
                html += `<li>${bulletText}</li>`;
            }
            // Sub-heading (short line ending with :)
            else if (/^.+:$/.test(trimmed) && trimmed.length < 60 && !trimmed.startsWith('http')) {
                if (inList || inNumberedList) {
                    html += '</ul>';
                    inList = false;
                    inNumberedList = false;
                }
                html += `<h4 class="content-subtitle">${trimmed}</h4>`;
            }
            // Regular text
            else {
                if (inList || inNumberedList) {
                    html += '</ul>';
                    inList = false;
                    inNumberedList = false;
                }
                html += `<p>${trimmed}</p>`;
            }
        }

        if (inList || inNumberedList) html += '</ul>';
        return html;
    },

    closeModal() {
        document.getElementById('modalOverlay').classList.add('hidden');
        document.body.style.overflow = '';
    },

    bindEvents() {
        document.getElementById('backBtn').addEventListener('click', () => {
            document.getElementById('categoriesSection').classList.remove('hidden');
            document.getElementById('operationsSection').classList.add('hidden');
            this.currentCategory = null;
        });

        document.getElementById('modalClose').addEventListener('click', () => this.closeModal());
        document.getElementById('modalOverlay').addEventListener('click', (e) => {
            if (e.target === document.getElementById('modalOverlay')) this.closeModal();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                const tabId = 'tab' + btn.dataset.tab.charAt(0).toUpperCase() + btn.dataset.tab.slice(1);
                document.getElementById(tabId).classList.add('active');
            });
        });

        let searchTimeout;
        document.getElementById('searchInput').addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => this.handleSearch(e.target.value), 300);
        });

        this.bindAuthEvents();
    },

    authMode: 'login',
    currentCaptcha: null,

    setAuthMode(mode) {
        this.authMode = mode;
        const isSignup = mode === 'signup';
        document.querySelectorAll('.auth-tab').forEach(t =>
            t.classList.toggle('active', t.dataset.mode === mode));
        document.querySelectorAll('.signup-only').forEach(el =>
            el.classList.toggle('hidden', !isSignup));
        document.getElementById('authModalTitle').textContent = isSignup ? 'ساخت حساب جدید' : 'ورود به حساب';
        document.getElementById('authModalSub').textContent = isSignup
            ? 'به جمع دانشجوهای اتاق عمل بپیوند' : 'خوش برگشتی! وارد شو و ادامه بده';
        document.getElementById('authSubmitText').textContent = isSignup ? 'ثبت‌نام' : 'ورود';
        document.getElementById('authSwitchHint').innerHTML = isSignup
            ? 'قبلاً ثبت‌نام کردی؟ <a href="#" id="authSwitchLink">وارد شو</a>'
            : 'حساب نداری؟ <a href="#" id="authSwitchLink">همین حالا ثبت‌نام کن</a>';
        document.getElementById('loginPassword').setAttribute('autocomplete', isSignup ? 'new-password' : 'current-password');
        document.getElementById('loginError').classList.add('hidden');
        // کپچا فقط در حالت ورود و بعد از چند خطا معنی دارد
        if (isSignup) this.hideCaptcha();
        this.rebindSwitchLink();
    },

    rebindSwitchLink() {
        const link = document.getElementById('authSwitchLink');
        if (link) link.onclick = (e) => { e.preventDefault(); this.setAuthMode(this.authMode === 'login' ? 'signup' : 'login'); };
    },

    showCaptcha(captcha) {
        this.currentCaptcha = captcha;
        document.getElementById('captchaQuestion').textContent = captcha.question;
        document.getElementById('captchaAnswer').value = '';
        document.getElementById('captchaRow').classList.remove('hidden');
    },
    hideCaptcha() {
        this.currentCaptcha = null;
        document.getElementById('captchaRow').classList.add('hidden');
    },

    openAuthModal(mode = 'login') {
        this.setAuthMode(mode);
        document.getElementById('authForm').reset();
        this.hideCaptcha();
        document.getElementById('loginError').classList.add('hidden');
        document.getElementById('loginModalOverlay').classList.remove('hidden');
    },

    bindAuthEvents() {
        const overlay = document.getElementById('loginModalOverlay');
        document.getElementById('authBtn').addEventListener('click', () => this.openAuthModal('login'));
        document.getElementById('loginModalClose').addEventListener('click', () => overlay.classList.add('hidden'));
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.add('hidden'); });

        document.querySelectorAll('.auth-tab').forEach(tab =>
            tab.addEventListener('click', () => this.setAuthMode(tab.dataset.mode)));
        this.rebindSwitchLink();

        document.getElementById('authForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const error = document.getElementById('loginError');
            const btn = document.getElementById('authSubmitBtn');
            error.classList.add('hidden');
            btn.disabled = true;

            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value;

            try {
                if (this.authMode === 'signup') {
                    await this.signup({
                        username,
                        password,
                        full_name: document.getElementById('authFullName').value.trim(),
                        email: document.getElementById('authEmail').value.trim() || undefined
                    });
                    this.toast('خوش اومدی! ثبت‌نامت انجام شد 🎉');
                } else {
                    let captcha = null;
                    if (this.currentCaptcha) {
                        captcha = { token: this.currentCaptcha.token,
                                    answer: document.getElementById('captchaAnswer').value.trim() };
                    }
                    await this.login(username, password, captcha);
                    this.toast('خوش برگشتی!');
                }
                overlay.classList.add('hidden');
                document.getElementById('authForm').reset();
                this.hideCaptcha();
            } catch (err) {
                error.textContent = err.message || 'مشکلی پیش آمد';
                error.classList.remove('hidden');
                // اگر سرور کپچا خواست، نشانش بده
                if (err.data && err.data.captcha) this.showCaptcha(err.data.captcha);
                else if (err.data && err.data.needsCaptcha) {
                    const g = await (await fetch(`${API_BASE}/auth/gate?username=${encodeURIComponent(username)}`)).json();
                    if (g.captcha) this.showCaptcha(g.captcha);
                }
            } finally {
                btn.disabled = false;
            }
        });

        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
            this.toast('خارج شدی. به امید دیدار!');
        });

        // اعلان‌ها
        const bell = document.getElementById('notifBell');
        const panel = document.getElementById('notifPanel');
        bell.addEventListener('click', (e) => {
            e.stopPropagation();
            const showing = !panel.classList.contains('hidden');
            panel.classList.toggle('hidden');
            if (!showing) this.markNotificationsRead();
        });
        document.addEventListener('click', (e) => {
            if (!panel.contains(e.target) && e.target !== bell) panel.classList.add('hidden');
        });
        document.getElementById('notifReadAll').addEventListener('click', () => this.markNotificationsRead());

        // پروفایل
        document.getElementById('userChip').addEventListener('click', () => this.openProfile());
        this.bindProfileEvents();
    },

    // ── نوتیفیکیشن toast ────────────────────────────────────────
    toast(msg, type = 'success') {
        let c = document.getElementById('toastContainer');
        if (!c) {
            c = document.createElement('div');
            c.id = 'toastContainer';
            c.className = 'toast-container';
            document.body.appendChild(c);
        }
        const t = document.createElement('div');
        t.className = `toast toast-${type}`;
        t.textContent = msg;
        c.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(10px)';
            setTimeout(() => t.remove(), 300); }, 3200);
    },

    // ── پروفایل ─────────────────────────────────────────────────
    async openProfile() {
        const overlay = document.getElementById('profileModalOverlay');
        overlay.classList.remove('hidden');
        this.switchProfileTab('info');
        try {
            const res = await fetch(`${API_BASE}/profile`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const p = await res.json();
            this.profileData = p;
            document.getElementById('profileName').textContent = p.full_name || p.username;
            document.getElementById('profileRoleBadge').textContent = this.roleLabel(p.role);
            const av = document.getElementById('profileAvatar');
            if (p.avatar) { av.style.backgroundImage = `url(${p.avatar})`; av.textContent = ''; av.classList.add('has-img'); }
            else { av.textContent = (p.full_name || p.username || '؟').charAt(0); av.classList.remove('has-img'); }
            document.getElementById('pfName').value = p.full_name || '';
            document.getElementById('pfEmail').value = p.email || '';
            document.getElementById('pfBio').value = p.bio || '';
            this.renderAuthorTab(p);
        } catch (err) {
            this.toast('خواندن پروفایل ناموفق بود', 'error');
        }
    },

    renderAuthorTab(p) {
        const area = document.getElementById('authorRequestArea');
        const tabBtn = document.getElementById('authorTabBtn');
        if (p.role === 'editor' || p.role === 'admin') {
            tabBtn.classList.add('hidden');
            area.innerHTML = '';
            return;
        }
        tabBtn.classList.remove('hidden');
        if (p.author_request_status === 'pending') {
            area.innerHTML = `<div class="author-status pending">
                <div class="author-status-ico">⏳</div>
                <h3>درخواستت در حال بررسیه</h3>
                <p>مدیر سایت درخواست نویسندگی‌ات رو بررسی می‌کنه و خبرت می‌کنیم.</p></div>`;
        } else if (p.author_request_status === 'rejected') {
            area.innerHTML = `<div class="author-status">
                <div class="author-status-ico">📋</div>
                <h3>درخواست قبلی تأیید نشد</h3>
                <p>می‌تونی دوباره درخواست بدی.</p>
                ${this.authorRequestForm()}</div>`;
            this.bindAuthorRequestForm();
        } else {
            area.innerHTML = `<div class="author-status">
                <div class="author-status-ico">✍️</div>
                <h3>دوست داری نویسنده بشی؟</h3>
                <p>نویسنده‌ها می‌تونن شرح عمل‌ها رو بنویسن و بعد از تأیید مدیر، روی سایت منتشر بشه.</p>
                ${this.authorRequestForm()}</div>`;
            this.bindAuthorRequestForm();
        }
    },

    authorRequestForm() {
        return `<textarea id="authorNote" rows="3" placeholder="اگه دوست داری بنویس چرا می‌خوای نویسنده بشی (اختیاری)"></textarea>
            <button class="login-submit-btn" id="sendAuthorReq">ارسال درخواست نویسندگی</button>`;
    },

    bindAuthorRequestForm() {
        const btn = document.getElementById('sendAuthorReq');
        if (!btn) return;
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            try {
                const res = await fetch(`${API_BASE}/profile/request-author`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
                    body: JSON.stringify({ note: document.getElementById('authorNote').value.trim() })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                this.toast(data.message || 'درخواستت ثبت شد');
                this.openProfile();
            } catch (err) {
                this.toast(err.message || 'خطا', 'error');
                btn.disabled = false;
            }
        });
    },

    switchProfileTab(tab) {
        document.querySelectorAll('.profile-tab').forEach(t =>
            t.classList.toggle('active', t.dataset.ptab === tab));
        document.querySelectorAll('.profile-panel').forEach(p =>
            p.classList.toggle('active', p.id === `ppanel-${tab}`));
    },

    bindProfileEvents() {
        const overlay = document.getElementById('profileModalOverlay');
        document.getElementById('profileModalClose').addEventListener('click', () => overlay.classList.add('hidden'));
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.add('hidden'); });
        document.querySelectorAll('.profile-tab').forEach(tab =>
            tab.addEventListener('click', () => this.switchProfileTab(tab.dataset.ptab)));

        // ذخیرهٔ اطلاعات پروفایل
        document.getElementById('profileInfoForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const err = document.getElementById('profileError');
            const ok = document.getElementById('profileSuccess');
            err.classList.add('hidden'); ok.classList.add('hidden');
            try {
                const res = await fetch(`${API_BASE}/profile`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
                    body: JSON.stringify({
                        full_name: document.getElementById('pfName').value.trim(),
                        email: document.getElementById('pfEmail').value.trim(),
                        bio: document.getElementById('pfBio').value.trim()
                    })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                ok.textContent = data.message; ok.classList.remove('hidden');
                this.user.full_name = document.getElementById('pfName').value.trim();
                this.updateAuthUI();
            } catch (e2) { err.textContent = e2.message; err.classList.remove('hidden'); }
        });

        // تغییر رمز
        document.getElementById('passwordForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const err = document.getElementById('pwError');
            const ok = document.getElementById('pwSuccess');
            err.classList.add('hidden'); ok.classList.add('hidden');
            try {
                const res = await fetch(`${API_BASE}/profile/password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
                    body: JSON.stringify({
                        current_password: document.getElementById('pfCurrentPw').value,
                        new_password: document.getElementById('pfNewPw').value
                    })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                ok.textContent = data.message; ok.classList.remove('hidden');
                document.getElementById('passwordForm').reset();
            } catch (e2) { err.textContent = e2.message; err.classList.remove('hidden'); }
        });

        // آپلود آواتار
        document.getElementById('avatarEditBtn').addEventListener('click', () =>
            document.getElementById('avatarInput').click());
        document.getElementById('avatarInput').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const fd = new FormData();
            fd.append('avatar', file);
            try {
                const res = await fetch(`${API_BASE}/profile/avatar`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${this.token}` },
                    body: fd
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                this.user.avatar = data.url;
                const av = document.getElementById('profileAvatar');
                av.style.backgroundImage = `url(${data.url})`; av.textContent = ''; av.classList.add('has-img');
                this.updateAuthUI();
                this.toast('عکس پروفایلت عوض شد');
            } catch (e2) { this.toast(e2.message || 'آپلود ناموفق بود', 'error'); }
            e.target.value = '';
        });
    },

    async handleSearch(query) {
        query = query.trim();

        if (!query) {
            document.getElementById('categoriesSection').classList.remove('hidden');
            document.getElementById('operationsSection').classList.add('hidden');
            this.renderCategories();
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/operations?search=${encodeURIComponent(query)}`);
            const operations = await res.json();

            document.getElementById('categoriesSection').classList.remove('hidden');
            document.getElementById('operationsSection').classList.add('hidden');

            const grid = document.getElementById('categoriesGrid');
            grid.innerHTML = '';

            if (operations.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                        <div style="font-size: 48px; margin-bottom: 16px;">🔍</div>
                        <h3 style="font-size: 18px; margin-bottom: 8px;">نتیجه‌ای یافت نشد</h3>
                        <p style="color: var(--text-secondary);">عبارت جستجو را تغییر دهید.</p>
                    </div>
                `;
                return;
            }

            const grouped = {};
            operations.forEach(op => {
                if (!grouped[op.category_key]) {
                    grouped[op.category_key] = {
                        ...op,
                        ops: []
                    };
                }
                grouped[op.category_key].ops.push(op);
            });

            Object.entries(grouped).forEach(([key, data]) => {
                const card = document.createElement('div');
                card.className = 'category-card';
                card.setAttribute('data-cat', key);
                card.innerHTML = `
                    <span class="category-icon">${data.category_icon}</span>
                    <div class="category-name-fa">${data.category_name_fa}</div>
                    <div class="category-name-en">${data.category_name_en}</div>
                    <div class="category-count">
                        ${data.ops.length} نتیجه جستجو
                    </div>
                `;
                const style = document.createElement('style');
                style.textContent = `
                    .category-card[data-cat="${key}"]::before { background: ${data.category_color}; }
                    .category-card[data-cat="${key}"]:hover::before { background: ${data.category_color}; }
                `;
                document.head.appendChild(style);

                card.addEventListener('click', async () => {
                    await this.openCategory(key);
                    const filtered = this.currentCategory.operations.filter(op =>
                        data.ops.some(s => s.id === op.id)
                    );
                    this.renderOperations(filtered, data.category_color);
                });
                grid.appendChild(card);
            });
        } catch (err) {
            console.error('Search error:', err);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
