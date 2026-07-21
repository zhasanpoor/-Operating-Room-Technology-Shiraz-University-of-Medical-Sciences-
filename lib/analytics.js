/**
 * ثبت بازدید و رفتار کاربر برای گزارش‌های مدیریتی.
 *
 * اصل حریم خصوصی: **IP خام ذخیره نمی‌شود.** برای شمارش «بازدیدکنندهٔ
 * یکتا» فقط یک هش کوتاه و روزانه از IP نگه داشته می‌شود که:
 *   • با نمک روزانه ساخته می‌شود، پس بین روزها قابل ردیابی نیست
 *   • برگشت‌پذیر نیست، پس IP کاربر از آن استخراج نمی‌شود
 * این برای آمار کافی است و کاربر را قابل شناسایی نمی‌کند.
 */

const crypto = require('crypto');

// نمک روزانه — با هر ری‌استارت و هر روز عوض می‌شود
let saltDay = '';
let dailySalt = crypto.randomBytes(16);

function currentSalt() {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== saltDay) {
        saltDay = today;
        dailySalt = crypto.randomBytes(16);
    }
    return dailySalt;
}

/** هش غیرقابل‌برگشت بازدیدکننده. */
function visitorHash(ip, userAgent) {
    return crypto.createHmac('sha256', currentSalt())
        .update(String(ip || '') + '|' + String(userAgent || ''))
        .digest('hex')
        .slice(0, 16);
}

/** نوع دستگاه را از user-agent حدس می‌زند. */
function detectDevice(ua) {
    const s = String(ua || '').toLowerCase();
    if (/ipad|tablet|playbook|silk/.test(s)) return 'tablet';
    if (/mobile|iphone|ipod|android.*mobile|windows phone/.test(s)) return 'mobile';
    if (/android/.test(s)) return 'tablet';
    return 'desktop';
}

/** نام مرورگر — ترتیب بررسی مهم است چون بیشترشان «Chrome» را هم اعلام می‌کنند. */
function detectBrowser(ua) {
    const s = String(ua || '');
    if (/Edg\//.test(s)) return 'Edge';
    if (/OPR\/|Opera/.test(s)) return 'Opera';
    if (/Firefox\//.test(s)) return 'Firefox';
    if (/SamsungBrowser/.test(s)) return 'Samsung';
    if (/Chrome\//.test(s)) return 'Chrome';
    if (/Safari\//.test(s)) return 'Safari';
    if (/bot|crawl|spider|slurp/i.test(s)) return 'Bot';
    return 'سایر';
}

/** آیا این درخواست از یک ربات است؟ ربات‌ها در آمار شمرده نمی‌شوند. */
function isBot(ua) {
    return /bot|crawl|spider|slurp|facebookexternalhit|telegrambot|whatsapp|preview/i
        .test(String(ua || ''));
}

/**
 * یک بازدید را ثبت می‌کند. هرگز throw نمی‌کند — شکست آمارگیری نباید
 * درخواست کاربر را خراب کند.
 */
function recordView(db, { userId, operationId, path, referrer, ip, userAgent }) {
    try {
        if (isBot(userAgent)) return;
        db.prepare(`
            INSERT INTO page_views
                (user_id, operation_id, path, referrer, device, browser, visitor_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            userId || null,
            operationId || null,
            String(path || '').slice(0, 300),
            String(referrer || '').slice(0, 300),
            detectDevice(userAgent),
            detectBrowser(userAgent),
            visitorHash(ip, userAgent)
        );
    } catch (err) {
        // بی‌صدا — آمار حیاتی نیست
    }
}

/** بازهٔ زمانی به رشتهٔ قابل مقایسه در SQL. */
function sinceIso(days) {
    return new Date(Date.now() - days * 86400000)
        .toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * گزارش کامل برای پنل مدیر.
 * @param {number} days بازهٔ گزارش به روز
 */
function buildReport(db, days = 30) {
    const since = sinceIso(days);

    const totals = db.prepare(`
        SELECT COUNT(*) AS views,
               COUNT(DISTINCT visitor_hash) AS visitors,
               COUNT(DISTINCT user_id) AS logged_in_users
        FROM page_views WHERE created_at > ?
    `).get(since);

    const byDevice = db.prepare(`
        SELECT device, COUNT(*) AS count FROM page_views
        WHERE created_at > ? GROUP BY device ORDER BY count DESC
    `).all(since);

    const byBrowser = db.prepare(`
        SELECT browser, COUNT(*) AS count FROM page_views
        WHERE created_at > ? GROUP BY browser ORDER BY count DESC LIMIT 8
    `).all(since);

    // پربازدیدترین عمل‌ها
    const topOperations = db.prepare(`
        SELECT o.id, o.name, o.slug, COUNT(pv.id) AS views
        FROM page_views pv
        JOIN operations o ON pv.operation_id = o.id
        WHERE pv.created_at > ?
        GROUP BY o.id ORDER BY views DESC LIMIT 10
    `).all(since);

    // روند روزانه
    const daily = db.prepare(`
        SELECT substr(created_at, 1, 10) AS day,
               COUNT(*) AS views,
               COUNT(DISTINCT visitor_hash) AS visitors
        FROM page_views WHERE created_at > ?
        GROUP BY day ORDER BY day
    `).all(since);

    // ساعات اوج ترافیک
    const hourly = db.prepare(`
        SELECT CAST(substr(created_at, 12, 2) AS INTEGER) AS hour, COUNT(*) AS count
        FROM page_views WHERE created_at > ?
        GROUP BY hour ORDER BY hour
    `).all(since);

    // ورودهای اخیر
    const recentLogins = db.prepare(`
        SELECT la.identifier, la.ip, la.user_agent, la.created_at
        FROM login_attempts la
        WHERE la.success = 1 AND la.scope = 'user' AND la.created_at > ?
        ORDER BY la.created_at DESC LIMIT 15
    `).all(since);

    // رشد کاربران
    const userGrowth = db.prepare(`
        SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS count
        FROM users WHERE created_at > ? GROUP BY day ORDER BY day
    `).all(since);

    return {
        days, totals, byDevice, byBrowser, topOperations,
        daily, hourly, recentLogins, userGrowth
    };
}

module.exports = { recordView, buildReport, detectDevice, detectBrowser, isBot };
