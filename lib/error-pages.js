/**
 * صفحات خطای HTTP — همه از یک قالب واحد ساخته می‌شوند.
 *
 * چرا قالب واحد به‌جای فایل جدا برای هر کد؟
 * هفت فایل HTML تقریباً یکسان یعنی هفت جا برای فراموش کردن یک تغییر.
 * اینجا فقط متن‌ها فرق می‌کنند و ظاهر یک‌جا نگهداری می‌شود.
 */

const { escapeHtml } = require('./sanitize');

/** ارقام لاتین → فارسی */
function toFa(n) {
    return String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
}

/**
 * متن هر کد وضعیت. لحن عمداً خودمانی و بدون اصطلاح فنی است تا
 * دانشجویی که با خطا روبه‌رو می‌شود بداند دقیقاً چه کار کند.
 */
const PAGES = {
    400: {
        emoji: '🤔',
        title: 'درخواستت درست نبود',
        text: 'اطلاعاتی که فرستادی ناقص یا نامعتبر بود. یک بار دیگر بررسی کن و دوباره امتحان کن.',
        gradient: ['#f59e0b', '#ef4444']
    },
    401: {
        emoji: '🔐',
        title: 'اول باید وارد بشی',
        text: 'برای دیدن این صفحه لازمه وارد حسابت بشی. اگر حساب نداری، ثبت‌نام کن — چند ثانیه بیشتر طول نمی‌کشه.',
        gradient: ['#6366f1', '#8b5cf6'],
        action: { href: '/?login=1', label: '🔑 ورود به حساب' }
    },
    403: {
        emoji: '🚫',
        title: 'اجازهٔ دسترسی نداری',
        text: 'این بخش برای سطح دسترسی تو باز نیست. اگر فکر می‌کنی اشتباهیه، با مدیر سایت تماس بگیر.',
        gradient: ['#ef4444', '#dc2626']
    },
    404: {
        emoji: '🧭',
        title: 'این صفحه رو پیدا نکردیم!',
        text: 'انگار آدرسی که دنبالش بودی وجود نداره یا جابه‌جا شده. نگران نباش، برگرد به صفحهٔ اصلی و از اونجا ادامه بده.',
        gradient: ['#6366f1', '#8b5cf6']
    },
    413: {
        emoji: '📦',
        title: 'فایلت خیلی بزرگه',
        text: 'حجم چیزی که فرستادی بیشتر از حد مجازه. فایل کوچک‌تری انتخاب کن یا اول فشرده‌اش کن.',
        gradient: ['#f59e0b', '#f97316']
    },
    429: {
        emoji: '⏳',
        title: 'یه کم آروم‌تر!',
        text: 'در مدت کوتاهی درخواست‌های زیادی فرستادی. چند دقیقه صبر کن و دوباره تلاش کن.',
        gradient: ['#f59e0b', '#eab308']
    },
    500: {
        emoji: '🛠️',
        title: 'یه مشکلی از سمت ما پیش اومد',
        text: 'سرور به مشکل خورده — تقصیر تو نیست! چند لحظه صبر کن و دوباره امتحان کن.',
        gradient: ['#ef4444', '#f59e0b']
    },
    503: {
        emoji: '🔧',
        title: 'سایت موقتاً در دسترس نیست',
        text: 'داریم روی سایت کار می‌کنیم و به‌زودی برمی‌گردیم. کمی بعد دوباره سر بزن.',
        gradient: ['#8b5cf6', '#6366f1']
    }
};

/**
 * صفحهٔ خطا را می‌سازد.
 * @param {number} code کد وضعیت
 * @param {string} [detail] توضیح اضافه (اختیاری) — باید از قبل امن باشد
 * @returns {string} HTML کامل
 */
function renderErrorPage(code, detail) {
    const page = PAGES[code] || PAGES[500];
    const [c1, c2] = page.gradient;
    const action = page.action || { href: '/', label: '🏠 بازگشت به صفحهٔ اصلی' };

    return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>${escapeHtml(page.title)} | تکنولوژی اتاق عمل</title>
    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;800&display=swap" rel="stylesheet">
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{
            font-family:'Vazirmatn',system-ui,sans-serif;
            background:radial-gradient(circle at 30% 20%,#12141e,#06060b);
            color:#e5e7eb;min-height:100vh;
            display:flex;align-items:center;justify-content:center;
            text-align:center;padding:24px;
        }
        .box{max-width:460px;animation:fadeUp .5s cubic-bezier(.2,.8,.2,1)}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        .emoji{font-size:56px;margin-bottom:14px}
        .code{
            font-size:110px;font-weight:800;line-height:1;margin-bottom:8px;
            background:linear-gradient(135deg,${c1},${c2});
            -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
        }
        h1{font-size:23px;margin-bottom:12px}
        p{color:#9ca3af;line-height:2;margin-bottom:26px}
        .detail{
            font-size:13px;color:#6b7280;background:#12141e;
            border:1px solid #1e2235;border-radius:10px;
            padding:10px 14px;margin-bottom:22px;
        }
        .actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
        .btn{
            display:inline-flex;align-items:center;gap:8px;
            background:linear-gradient(135deg,#6366f1,#8b5cf6);
            color:#fff;text-decoration:none;padding:14px 26px;
            border-radius:12px;font-weight:600;font-size:15px;
            transition:transform .2s,box-shadow .2s;
        }
        .btn:hover{transform:translateY(-2px);box-shadow:0 10px 30px rgba(99,102,241,.4)}
        .btn-ghost{
            background:transparent;border:1.5px solid #2a2e45;color:#9ca3af;
        }
        .btn-ghost:hover{border-color:#6366f1;color:#e5e7eb;box-shadow:none}
    </style>
</head>
<body>
    <div class="box">
        <div class="emoji">${page.emoji}</div>
        <div class="code">${toFa(code)}</div>
        <h1>${escapeHtml(page.title)}</h1>
        <p>${escapeHtml(page.text)}</p>
        ${detail ? `<div class="detail">${escapeHtml(detail)}</div>` : ''}
        <div class="actions">
            <a class="btn" href="${escapeHtml(action.href)}">${action.label}</a>
            <a class="btn btn-ghost" href="/help">راهنمای سایت</a>
        </div>
    </div>
</body>
</html>`;
}

/**
 * آیا این درخواست پاسخ JSON می‌خواهد یا صفحهٔ HTML؟
 *
 * از `originalUrl` استفاده می‌شود نه `req.path`: داخل `app.use('/api', …)`
 * اکسپرس پیشوند mount را حذف می‌کند و `req.path` برابر `/nope` می‌شود،
 * پس بررسی با `req.path` هرگز مسیرهای API را تشخیص نمی‌داد و به کلاینت
 * صفحهٔ HTML برمی‌گشت.
 */
function wantsJson(req) {
    const url = req.originalUrl || req.url || req.path || '';
    if (url.startsWith('/api')) return true;
    const accept = req.headers.accept || '';
    return accept.includes('application/json') && !accept.includes('text/html');
}

/**
 * پاسخ خطا را با فرمت مناسب می‌فرستد.
 * از این تابع در همهٔ مسیرها استفاده می‌شود تا رفتار یکدست بماند.
 */
function sendError(req, res, code, message, detail) {
    res.status(code);
    if (wantsJson(req)) {
        return res.json({ error: message || PAGES[code]?.title || 'خطا', status: code });
    }
    res.type('html').send(renderErrorPage(code, detail));
}

module.exports = { renderErrorPage, sendError, wantsJson, PAGES };
