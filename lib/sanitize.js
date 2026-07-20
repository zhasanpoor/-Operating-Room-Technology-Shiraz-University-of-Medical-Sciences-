/**
 * پاک‌سازی ورودی و شناسایی تلاش برای حمله.
 *
 * دو لایهٔ مجزا:
 *   ۱) پاک‌سازی (sanitize) — ورودی را بی‌خطر می‌کند تا امن ذخیره/نمایش شود.
 *   ۲) شناسایی (detect)     — الگوهای مهاجم را گزارش می‌دهد تا ادمین مطلع شود.
 *
 * نکتهٔ مهم: تزریق SQL در این پروژه با «کوئری پارامتری» دفع می‌شود، نه با
 * فیلتر کردن کلمات. تشخیص الگوی SQL اینجا فقط برای *هشدار به ادمین* است و
 * هیچ‌گاه تنها خط دفاعی نیست.
 */

const sanitizeHtmlLib = require('sanitize-html');
const { ALLOWED_VIDEO_HOSTS } = require('../config');

// ── ۱) پاک‌سازی ─────────────────────────────────────────────────────

/** تگ‌ها و ویژگی‌های مجاز در محتوای غنی (شرح عمل، لیست وسایل). */
const RICH_TEXT_POLICY = {
    allowedTags: [
        'p', 'br', 'hr', 'div', 'span',
        'b', 'strong', 'i', 'em', 'u', 's', 'mark', 'small', 'sub', 'sup',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'a', 'img', 'figure', 'figcaption'
    ],
    allowedAttributes: {
        a: ['href', 'title', 'target', 'rel'],
        img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
        '*': ['dir', 'class']
    },
    // فقط پروتکل‌های بی‌خطر — جلوی javascript: و data: گرفته می‌شود
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['http', 'https'] },
    allowProtocolRelative: false,
    // کلاس‌های دلخواه ممنوع؛ فقط کلاس‌های ظاهریِ شناخته‌شده
    allowedClasses: {
        '*': ['text-center', 'text-right', 'text-left',
              'highlight', 'note', 'warning', 'tip']
    },
    transformTags: {
        // هر لینک خارجی امن‌سازی می‌شود (جلوگیری از حملهٔ tabnabbing)
        a: (tagName, attribs) => ({
            tagName: 'a',
            attribs: {
                ...attribs,
                target: '_blank',
                rel: 'noopener noreferrer nofollow'
            }
        })
    },
    disallowedTagsMode: 'discard'
};

/** محتوای غنی (HTML) را با سیاست allowlist پاک می‌کند. */
function sanitizeRichText(dirty) {
    if (dirty === null || dirty === undefined) return '';
    return sanitizeHtmlLib(String(dirty), RICH_TEXT_POLICY);
}

/** تمام تگ‌ها را حذف می‌کند — برای فیلدهای متنی ساده مثل نام و عنوان. */
function sanitizePlainText(dirty) {
    if (dirty === null || dirty === undefined) return '';
    return sanitizeHtmlLib(String(dirty), { allowedTags: [], allowedAttributes: {} })
        .replace(/\s+/g, ' ')
        .trim();
}

/** فرار دادن کاراکترهای HTML — برای درج امن در قالب‌های سمت سرور. */
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ── ۲) شناسایی الگوی حمله ──────────────────────────────────────────

const THREAT_PATTERNS = [
    // --- XSS ---
    { type: 'xss', severity: 'high',
      re: /<\s*script\b/i, label: 'تگ script' },
    { type: 'xss', severity: 'high',
      re: /javascript\s*:/i, label: 'پروتکل javascript:' },
    { type: 'xss', severity: 'high',
      re: /\bon(error|load|click|mouseover|focus|submit|animationstart|toggle)\s*=/i,
      label: 'رویداد درون‌خطی HTML' },
    { type: 'xss', severity: 'high',
      re: /<\s*iframe\b/i, label: 'تگ iframe' },
    { type: 'xss', severity: 'medium',
      re: /<\s*(object|embed|base|form|svg|math)\b/i, label: 'تگ خطرناک' },
    { type: 'xss', severity: 'medium',
      re: /data\s*:\s*text\/html/i, label: 'data URI از نوع HTML' },
    { type: 'xss', severity: 'medium',
      re: /\bdocument\s*\.\s*(cookie|domain|write)\b/i, label: 'دسترسی به document' },
    { type: 'xss', severity: 'medium',
      re: /\b(eval|atob|Function)\s*\(/i, label: 'اجرای کد پویا' },

    // --- SQL Injection (فقط برای هشدار — دفاع اصلی کوئری پارامتری است) ---
    { type: 'sqli', severity: 'high',
      re: /\b(union\s+(all\s+)?select|select\s+.+\s+from\s+information_schema)\b/i,
      label: 'UNION SELECT' },
    { type: 'sqli', severity: 'high',
      re: /(\bor\b|\band\b)\s+['"]?\d+['"]?\s*=\s*['"]?\d+/i,
      label: 'شرط همیشه‌درست' },
    { type: 'sqli', severity: 'high',
      re: /;\s*(drop|delete|truncate|alter)\s+(table|database)\b/i,
      label: 'دستور تخریبی SQL' },
    { type: 'sqli', severity: 'medium',
      re: /\b(sleep|pg_sleep|waitfor\s+delay|benchmark)\s*\(/i,
      label: 'تزریق مبتنی بر زمان' },

    // --- تزریق فرمان و پیمایش مسیر ---
    { type: 'path_traversal', severity: 'high',
      re: /\.\.[\/\\]/, label: 'پیمایش مسیر (../)' },
    { type: 'command_injection', severity: 'high',
      re: /[;|`]\s*(cat|curl|wget|rm|chmod|bash|sh|powershell|nc)\b/i,
      label: 'تزریق فرمان سیستمی' },

    // --- تزریق در قالب و NoSQL ---
    { type: 'template_injection', severity: 'medium',
      re: /\{\{.*?(constructor|__proto__|process|require).*?\}\}/i,
      label: 'تزریق قالب' },
    { type: 'prototype_pollution', severity: 'high',
      re: /("|')?(__proto__|constructor\s*\.\s*prototype)("|')?\s*:/,
      label: 'آلودگی prototype' }
];

/**
 * ورودی را برای الگوهای حمله بررسی می‌کند.
 * @returns {Array<{type,severity,label,sample}>} فهرست تهدیدهای یافت‌شده
 */
function detectThreats(input) {
    if (input === null || input === undefined) return [];

    // اشیاء و آرایه‌ها به‌صورت بازگشتی بررسی می‌شوند
    if (typeof input === 'object') {
        const found = [];
        for (const value of Object.values(input)) {
            found.push(...detectThreats(value));
        }
        return dedupe(found);
    }

    const text = String(input);
    if (!text) return [];

    // نسخهٔ رمزگشایی‌شده هم بررسی می‌شود تا دور زدن با encode ناکام بماند
    const variants = [text];
    try {
        const decoded = decodeURIComponent(text.replace(/\+/g, ' '));
        if (decoded !== text) variants.push(decoded);
    } catch (e) { /* درصد نامعتبر — نادیده */ }

    // رمزگشایی موجودیت‌های HTML (مثل &#x3c;script&#x3e;)
    const entityDecoded = text
        .replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
        .replace(/&#(\d+);?/g, (_, d) => String.fromCharCode(parseInt(d, 10)));
    if (entityDecoded !== text) variants.push(entityDecoded);

    const found = [];
    for (const pattern of THREAT_PATTERNS) {
        for (const variant of variants) {
            const match = pattern.re.exec(variant);
            if (match) {
                found.push({
                    type: pattern.type,
                    severity: pattern.severity,
                    label: pattern.label,
                    sample: match[0].slice(0, 120)
                });
                break;  // یک بار گزارش هر الگو کافی است
            }
        }
    }
    return dedupe(found);
}

function dedupe(threats) {
    const seen = new Set();
    return threats.filter(t => {
        const key = t.type + '|' + t.label;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/** بالاترین شدت میان تهدیدهای یافت‌شده. */
function worstSeverity(threats) {
    if (threats.some(t => t.severity === 'high')) return 'high';
    if (threats.some(t => t.severity === 'medium')) return 'medium';
    return 'low';
}

// ── ۳) اعتبارسنجی نشانی ─────────────────────────────────────────────

/**
 * لینک ویدیو را بررسی و به نشانی embed تبدیل می‌کند.
 * فقط میزبان‌های سفیدفهرست‌شده پذیرفته می‌شوند (جلوگیری از SSRF و درج iframe دلخواه).
 *
 * @returns {{ok:true, url:string, embed:string, provider:string}
 *          |{ok:false, error:string}}
 */
function validateVideoUrl(raw) {
    if (!raw || !String(raw).trim()) return { ok: true, url: '', embed: '', provider: '' };

    let parsed;
    try {
        parsed = new URL(String(raw).trim());
    } catch (e) {
        return { ok: false, error: 'نشانی ویدیو معتبر نیست.' };
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return { ok: false, error: 'فقط لینک‌های http و https قابل قبول‌اند.' };
    }

    const host = parsed.hostname.toLowerCase();
    if (!ALLOWED_VIDEO_HOSTS.includes(host)) {
        return {
            ok: false,
            error: 'فقط لینک یوتیوب، آپارات یا ویمئو پذیرفته می‌شود.'
        };
    }

    // --- یوتیوب ---
    if (host.endsWith('youtube.com')) {
        const id = parsed.searchParams.get('v');
        if (id && /^[\w-]{11}$/.test(id)) {
            return { ok: true, url: parsed.href, provider: 'youtube',
                     embed: `https://www.youtube-nocookie.com/embed/${id}` };
        }
        const embedMatch = /^\/embed\/([\w-]{11})/.exec(parsed.pathname);
        if (embedMatch) {
            return { ok: true, url: parsed.href, provider: 'youtube',
                     embed: `https://www.youtube-nocookie.com/embed/${embedMatch[1]}` };
        }
        return { ok: false, error: 'شناسهٔ ویدیوی یوتیوب پیدا نشد.' };
    }

    if (host === 'youtu.be') {
        const id = parsed.pathname.slice(1);
        if (/^[\w-]{11}$/.test(id)) {
            return { ok: true, url: parsed.href, provider: 'youtube',
                     embed: `https://www.youtube-nocookie.com/embed/${id}` };
        }
        return { ok: false, error: 'شناسهٔ ویدیوی یوتیوب پیدا نشد.' };
    }

    // --- آپارات ---
    if (host.endsWith('aparat.com')) {
        const m = /^\/v\/([\w-]+)/.exec(parsed.pathname);
        if (m) {
            return { ok: true, url: parsed.href, provider: 'aparat',
                     embed: `https://www.aparat.com/video/video/embed/videohash/${m[1]}/vt/frame` };
        }
        return { ok: false, error: 'شناسهٔ ویدیوی آپارات پیدا نشد.' };
    }

    // --- ویمئو ---
    if (host.endsWith('vimeo.com')) {
        const m = /(\d{6,})/.exec(parsed.pathname);
        if (m) {
            return { ok: true, url: parsed.href, provider: 'vimeo',
                     embed: `https://player.vimeo.com/video/${m[1]}` };
        }
        return { ok: false, error: 'شناسهٔ ویدیوی ویمئو پیدا نشد.' };
    }

    return { ok: false, error: 'این سرویس ویدیو پشتیبانی نمی‌شود.' };
}

/** نام فایل امن — بدون مسیر، بدون کاراکتر خطرناک. */
function safeFilename(name) {
    return String(name || 'file')
        .replace(/[\/\\]/g, '_')       // جداکنندهٔ مسیر
        .replace(/\.{2,}/g, '.')       // پیمایش مسیر
        .replace(/[^\w.؀-ۿ -]/g, '')  // فقط حروف، عدد، فارسی
        .replace(/^\.+/, '')           // فایل مخفی
        .slice(0, 120)
        .trim() || 'file';
}

module.exports = {
    sanitizeRichText,
    sanitizePlainText,
    escapeHtml,
    detectThreats,
    worstSeverity,
    validateVideoUrl,
    safeFilename,
    RICH_TEXT_POLICY
};
