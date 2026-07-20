const API_BASE = '/api';

const app = {
    categories: [],
    currentCategory: null,
    currentOperation: null,

    async init() {
        await this.loadStats();
        await this.loadCategories();
        this.bindEvents();
    },

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

    getYouTubeEmbed(url) {
        if (!url) return null;
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
            /youtube\.com\/shorts\/([^&\s?]+)/
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return `https://www.youtube.com/embed/${match[1]}`;
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
        return text
            .replace(/\n/g, '<br>')
            .replace(/•/g, '&bull;')
            .replace(/o/g, '&nbsp;&nbsp;o');
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
