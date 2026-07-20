/**
 * ویرایشگر متن غنی — بر پایهٔ Quill، تنظیم‌شده برای فارسی و راست‌به‌چپ.
 *
 * چرا Quill به‌صورت محلی و نه از CDN؟ دسترسی به CDNهای خارجی از ایران
 * ناپایدار است و ویرایشگر پنل مدیریت نباید به آن وابسته باشد.
 *
 * نکتهٔ امنیتی: خروجی این ویرایشگر HTML است و *هرگز* نباید مستقیم
 * ذخیره یا نمایش داده شود. سرور آن را با `lib/sanitize.js` پاک می‌کند.
 * پاک‌سازی سمت کلاینت فقط برای تجربهٔ کاربری است، نه امنیت.
 */

(function (global) {
    'use strict';

    /** برچسب‌های فارسی برای دکمه‌های نوار ابزار (نمایش در tooltip). */
    const TOOLTIPS = {
        'ql-bold': 'درشت',
        'ql-italic': 'کج',
        'ql-underline': 'زیرخط',
        'ql-strike': 'خط‌خورده',
        'ql-blockquote': 'نقل‌قول',
        'ql-code-block': 'قطعه کد',
        'ql-link': 'پیوند',
        'ql-image': 'تصویر',
        'ql-clean': 'پاک کردن قالب‌بندی',
        'ql-list': 'لیست',
        'ql-header': 'تیتر',
        'ql-align': 'ترازبندی',
        'ql-color': 'رنگ متن',
        'ql-background': 'رنگ پس‌زمینه',
        'ql-indent': 'تورفتگی',
        'ql-direction': 'جهت متن'
    };

    const DEFAULT_TOOLBAR = [
        [{ header: [2, 3, 4, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }, { background: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ align: [] }, { indent: '-1' }, { indent: '+1' }],
        ['blockquote', 'code-block'],
        ['link', 'image'],
        ['clean']
    ];

    /**
     * یک ویرایشگر می‌سازد.
     *
     * @param {string} selector  انتخابگر عنصر میزبان
     * @param {object} options
     * @param {string} options.placeholder   متن راهنما
     * @param {function} options.onUpload    آپلود تصویر؛ باید Promise<string> برگرداند
     * @param {function} options.onChange    با هر تغییر صدا زده می‌شود
     * @returns {object} رابط کنترل ویرایشگر
     */
    function create(selector, options) {
        options = options || {};

        const host = document.querySelector(selector);
        if (!host) {
            console.error('ویرایشگر: عنصر میزبان پیدا نشد —', selector);
            return null;
        }

        const quill = new Quill(host, {
            theme: 'snow',
            placeholder: options.placeholder || 'محتوا را اینجا بنویسید…',
            modules: {
                toolbar: {
                    container: options.toolbar || DEFAULT_TOOLBAR,
                    handlers: {
                        // آپلود تصویر به‌جای درج base64 (که دیتابیس را باد می‌کند)
                        image: function () {
                            pickAndUploadImage(quill, options.onUpload);
                        }
                    }
                },
                clipboard: {
                    // چسباندن از ورد/سایت‌ها نباید استایل و اسکریپت بیاورد
                    matchVisual: false
                },
                history: { delay: 800, maxStack: 200, userOnly: true }
            }
        });

        // جهت پیش‌فرض راست‌به‌چپ
        quill.root.setAttribute('dir', 'rtl');
        quill.root.style.textAlign = 'right';

        applyPersianTooltips(host);

        if (typeof options.onChange === 'function') {
            quill.on('text-change', function () {
                options.onChange(getHtml(quill));
            });
        }

        return {
            quill: quill,
            getHtml: function () { return getHtml(quill); },
            setHtml: function (html) { setHtml(quill, html); },
            getText: function () { return quill.getText().trim(); },
            isEmpty: function () { return getHtml(quill) === ''; },
            focus: function () { quill.focus(); },
            enable: function (on) { quill.enable(on !== false); },
            /** تعداد کاراکترهای واقعی متن (بدون تگ) — برای شمارندهٔ کاراکتر */
            length: function () { return quill.getText().trim().length; }
        };
    }

    /** HTML ویرایشگر؛ اگر واقعاً خالی باشد رشتهٔ خالی برمی‌گرداند. */
    function getHtml(quill) {
        const html = quill.root.innerHTML;
        // Quill برای سند خالی «<p><br></p>» می‌گذارد که نباید ذخیره شود
        if (html === '<p><br></p>' || html === '<p></p>') return '';
        return html;
    }

    /**
     * محتوا را داخل ویرایشگر می‌گذارد.
     * از `dangerouslyPasteHTML` استفاده می‌شود چون محتوا از سرور می‌آید و
     * سرور قبلاً آن را پاک کرده است. محتوای پاک‌نشده هرگز نباید اینجا برسد.
     */
    function setHtml(quill, html) {
        if (!html) {
            quill.setContents([]);
            return;
        }
        quill.clipboard.dangerouslyPasteHTML(html, 'silent');
    }

    /** انتخاب فایل تصویر و درج آن در محل مکان‌نما پس از آپلود. */
    function pickAndUploadImage(quill, onUpload) {
        if (typeof onUpload !== 'function') {
            console.warn('ویرایشگر: تابع آپلود تصویر تعریف نشده است.');
            return;
        }

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/png,image/jpeg,image/gif,image/webp';
        input.click();

        input.onchange = async function () {
            const file = input.files && input.files[0];
            if (!file) return;

            const range = quill.getSelection(true);
            const index = range ? range.index : quill.getLength();

            // نشانگر موقت تا کاربر بداند در حال آپلود است
            quill.insertText(index, '⏳ در حال آپلود تصویر…', 'silent');
            const placeholderLength = '⏳ در حال آپلود تصویر…'.length;

            try {
                const url = await onUpload(file);
                quill.deleteText(index, placeholderLength, 'silent');
                quill.insertEmbed(index, 'image', url, 'user');
                quill.setSelection(index + 1, 0);
            } catch (err) {
                quill.deleteText(index, placeholderLength, 'silent');
                const message = (err && err.message) || 'آپلود تصویر انجام نشد.';
                if (global.toast) global.toast(message, 'error');
                else alert(message);
            }
        };
    }

    /** tooltip فارسی روی دکمه‌های نوار ابزار می‌گذارد. */
    function applyPersianTooltips(host) {
        const toolbar = host.previousElementSibling;
        if (!toolbar || !toolbar.classList.contains('ql-toolbar')) return;

        toolbar.querySelectorAll('button, .ql-picker').forEach(function (el) {
            for (const cls of el.classList) {
                if (TOOLTIPS[cls]) {
                    el.setAttribute('title', TOOLTIPS[cls]);
                    break;
                }
            }
        });
    }

    global.RichEditor = { create: create };

}(window));
