/**
 * محافظت CSRF (جعل درخواست بین‌سایتی).
 *
 * ── چرا این سایت الان هم تا حد زیادی امن است؟ ──
 * توکن ورود در `localStorage` نگه داشته می‌شود و دستی در هدر
 * `Authorization` فرستاده می‌شود. مرورگر این هدر را به‌صورت خودکار
 * ضمیمه نمی‌کند، پس یک سایت مهاجم نمی‌تواند از طرف کاربر درخواست
 * معتبر بفرستد. این ذاتاً جلوی CSRF را می‌گیرد.
 *
 * ── پس چرا این ماژول لازم است؟ ──
 * ۱. کد از `cookie-parser` استفاده می‌کند و `authMiddleware` توکن را از
 *    کوکی هم می‌پذیرد. **هر مسیری که کوکی را بپذیرد در برابر CSRF
 *    آسیب‌پذیر است**، چون مرورگر کوکی را خودکار می‌فرستد.
 * ۲. اگر روزی احراز هویت به کوکی منتقل شود، محافظت از قبل آماده است.
 *
 * ── روش: Double Submit Cookie ──
 * یک توکن تصادفی هم در کوکی (قابل خواندن توسط جاوااسکریپت) و هم در هدر
 * فرستاده می‌شود. سایت مهاجم به‌خاطر Same-Origin Policy نمی‌تواند کوکی
 * ما را بخواند، پس نمی‌تواند هدر درست را بسازد.
 */

const crypto = require('crypto');

const COOKIE_NAME = 'csrf_token';
const HEADER_NAME = 'x-csrf-token';

/** روش‌هایی که وضعیت سرور را تغییر نمی‌دهند و نیاز به بررسی ندارند. */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** مسیرهایی که ذاتاً نمی‌توانند CSRF داشته باشند یا باید باز بمانند. */
const EXEMPT_PATHS = [
    '/api/auth/login',      // هنوز نشستی وجود ندارد
    '/api/auth/signup',
    '/api/auth/gate',
    '/api/track/view'       // بی‌نام و بی‌اثر روی داده‌های کاربر
];

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * کوکی CSRF را در صورت نبود می‌سازد.
 * این کوکی عمداً `httpOnly` **نیست** — جاوااسکریپت باید بتواند بخواندش
 * تا در هدر بفرستد. محرمانه بودنش لازم نیست؛ فقط باید برای سایت دیگر
 * غیرقابل‌خواندن باشد که Same-Origin Policy تضمینش می‌کند.
 */
function issueToken(req, res, isProduction) {
    let token = req.cookies && req.cookies[COOKIE_NAME];
    if (!token) {
        token = generateToken();
        res.cookie(COOKIE_NAME, token, {
            httpOnly: false,
            secure: isProduction,     // روی HTTPS فقط
            sameSite: 'lax',
            maxAge: 7 * 24 * 3600 * 1000,
            path: '/'
        });
    }
    return token;
}

/**
 * میدلور محافظت CSRF.
 *
 * فقط درخواست‌هایی را رد می‌کند که **با کوکی** احراز هویت شده‌اند.
 * درخواست‌های دارای هدر `Authorization` مصون‌اند چون مرورگر آن هدر را
 * خودکار نمی‌فرستد؛ رد کردنشان فقط کلاینت‌های سالم را می‌شکند.
 */
function csrfProtection({ isProduction = false } = {}) {
    return function (req, res, next) {
        issueToken(req, res, isProduction);

        if (SAFE_METHODS.has(req.method)) return next();

        const url = req.originalUrl || req.url || '';
        if (EXEMPT_PATHS.some(p => url.startsWith(p))) return next();

        // احراز هویت با هدر → مرورگر خودکار نمی‌فرستد → CSRF ممکن نیست
        const hasAuthHeader = !!(req.headers.authorization
            && req.headers.authorization.startsWith('Bearer '));
        if (hasAuthHeader) return next();

        // از اینجا به بعد یعنی درخواست متکی به کوکی است
        const cookieToken = req.cookies && req.cookies[COOKIE_NAME];
        const headerToken = req.headers[HEADER_NAME];

        // درخواست بدون هیچ نشانهٔ احراز هویت — لایهٔ auth خودش رد می‌کند
        if (!req.cookies || !req.cookies.token) return next();

        if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
            return res.status(403).json({
                error: 'درخواست معتبر نیست. صفحه را تازه کن و دوباره تلاش کن.',
                code: 'CSRF_INVALID'
            });
        }
        next();
    };
}

/** مقایسهٔ زمان‌ثابت تا از حملهٔ زمانی جلوگیری شود. */
function safeEqual(a, b) {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = { csrfProtection, issueToken, COOKIE_NAME, HEADER_NAME };
