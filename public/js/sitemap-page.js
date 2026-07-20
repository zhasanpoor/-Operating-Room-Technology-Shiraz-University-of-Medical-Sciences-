/**
 * ساخت فهرست دسته‌بندی‌ها و عمل‌ها در صفحهٔ نقشهٔ سایت.
 *
 * در فایل جدا نگه داشته شده چون CSP سایت اسکریپت درون‌خطی را
 * اجرا نمی‌کند.
 */
(function () {
    'use strict';

    const container = document.getElementById('smContent');
    if (!container) return;

    function esc(value) {
        const div = document.createElement('div');
        div.textContent = value == null ? '' : String(value);
        return div.innerHTML;
    }

    const faNum = n => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);

    (async function load() {
        try {
            const [categories, operations] = await Promise.all([
                fetch('/api/categories').then(r => r.json()),
                fetch('/api/operations').then(r => r.json())
            ]);

            const byCategory = {};
            for (const op of operations) {
                (byCategory[op.category_key] = byCategory[op.category_key] || []).push(op);
            }

            container.innerHTML = categories.map(function (cat) {
                const ops = byCategory[cat.key] || [];
                const links = ops.map(op =>
                    `<a href="/op/${encodeURIComponent(op.slug || op.id)}">${esc(op.name)}</a>`
                ).join('');

                return `
                <div class="sm-group">
                    <h3>${esc(cat.icon)} ${esc(cat.name_fa)}
                        <span class="sm-count">${faNum(ops.length)} عمل</span></h3>
                    <div class="sm-links">
                        ${links || '<span class="sm-loading">هنوز عملی ثبت نشده</span>'}
                    </div>
                </div>`;
            }).join('');
        } catch (err) {
            container.innerHTML =
                '<div class="sm-loading">بارگذاری فهرست ناموفق بود. دوباره تلاش کنید.</div>';
        }
    }());
}());
