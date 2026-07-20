/**
 * فیلتر دسته‌بندی و جستجوی زندهٔ سؤالات متداول.
 *
 * این کد عمداً در فایل جداست و درون‌خطی نیست: سیاست امنیتی سایت
 * (CSP) اجرای اسکریپت درون‌خطی را ممنوع می‌کند تا جلوی تزریق کد
 * گرفته شود. اسکریپت درون‌خطی بی‌صدا اجرا نمی‌شود.
 */
(function () {
    'use strict';

    const items = Array.prototype.slice.call(document.querySelectorAll('.faq-item'));
    const search = document.getElementById('faqSearch');
    const empty = document.getElementById('faqEmpty');
    if (!items.length || !search) return;

    let activeCategory = 'all';

    function apply() {
        const query = search.value.trim().toLowerCase();
        let visible = 0;

        for (const item of items) {
            const matchesCategory = activeCategory === 'all'
                || item.dataset.cat === activeCategory;
            const matchesText = !query
                || item.textContent.toLowerCase().indexOf(query) !== -1;
            const show = matchesCategory && matchesText;

            item.style.display = show ? '' : 'none';
            if (show) visible++;
        }

        if (empty) empty.classList.toggle('hidden', visible > 0);
    }

    search.addEventListener('input', apply);

    document.querySelectorAll('.faq-cat').forEach(function (button) {
        button.addEventListener('click', function () {
            document.querySelectorAll('.faq-cat')
                .forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            activeCategory = button.dataset.cat;
            apply();
        });
    });
}());
