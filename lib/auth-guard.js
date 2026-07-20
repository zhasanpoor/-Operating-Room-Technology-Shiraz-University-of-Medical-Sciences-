/**
 * محافظت از ورود در برابر حملهٔ حدس رمز (brute-force).
 *
 * سیاست (طبق خواستهٔ کارفرما):
 *   • بعد از ۳ تلاش ناموفق  → کپچای ساده لازم می‌شود
 *   • بعد از ۵ تلاش ناموفق  → کاربر و IP به مدت ۱۵ دقیقه بلاک می‌شوند
 *
 * شمارش هم روی «نام کاربری» و هم روی «IP» انجام می‌شود، چون:
 *   - فقط IP:  مهاجم پشت NAT کاربران بی‌گناه را بلاک می‌کند
 *   - فقط کاربر: مهاجم با IP ثابت می‌تواند هزاران نام کاربری را امتحان کند
 */

const crypto = require('crypto');
const {
    LOGIN_CAPTCHA_AFTER, LOGIN_BLOCK_AFTER,
    LOGIN_BLOCK_MINUTES, LOGIN_WINDOW_MINUTES
} = require('../config');

/** زمان فعلی به شکل قابل مقایسه در SQLite و Postgres. */
function nowIso() {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function minutesAgoIso(minutes) {
    return new Date(Date.now() - minutes * 60000)
        .toISOString().replace('T', ' ').slice(0, 19);
}

function futureIso(minutes) {
    return new Date(Date.now() + minutes * 60000)
        .toISOString().replace('T', ' ').slice(0, 19);
}

/** IP واقعی درخواست‌کننده (پشت پراکسی Render هم درست کار می‌کند). */
function clientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) return String(forwarded).split(',')[0].trim();
    return req.ip || req.connection?.remoteAddress || 'unknown';
}

/** تعداد تلاش ناموفق در بازهٔ زمانی جاری. */
function failureCount(db, scope, identifier) {
    const row = db.prepare(`
        SELECT COUNT(*) AS c FROM login_attempts
        WHERE scope = ? AND identifier = ? AND success = 0 AND created_at > ?
    `).get(scope, String(identifier).toLowerCase(), minutesAgoIso(LOGIN_WINDOW_MINUTES));
    return row ? row.c : 0;
}

/** اگر بلاک فعالی وجود دارد، ثانیه‌های باقی‌مانده را برمی‌گرداند. */
function activeBlockSeconds(db, scope, identifier) {
    const row = db.prepare(`
        SELECT blocked_until FROM blocks
        WHERE scope = ? AND identifier = ? AND blocked_until > ?
        ORDER BY blocked_until DESC LIMIT 1
    `).get(scope, String(identifier).toLowerCase(), nowIso());
    if (!row) return 0;
    const remaining = Math.ceil((new Date(row.blocked_until + 'Z') - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
}

/**
 * وضعیت فعلی ورود را می‌سنجد — قبل از بررسی رمز صدا زده می‌شود.
 *
 * @returns {{blocked:boolean, seconds:number, needsCaptcha:boolean, attempts:number}}
 */
function checkLoginGate(db, username, ip) {
    const userBlock = username ? activeBlockSeconds(db, 'user', username) : 0;
    const ipBlock = activeBlockSeconds(db, 'ip', ip);
    const seconds = Math.max(userBlock, ipBlock);

    if (seconds > 0) {
        return { blocked: true, seconds, needsCaptcha: true, attempts: LOGIN_BLOCK_AFTER };
    }

    const attempts = Math.max(
        username ? failureCount(db, 'user', username) : 0,
        failureCount(db, 'ip', ip)
    );

    return {
        blocked: false,
        seconds: 0,
        needsCaptcha: attempts >= LOGIN_CAPTCHA_AFTER,
        attempts
    };
}

/** یک تلاش ورود را ثبت می‌کند و در صورت نیاز بلاک می‌سازد. */
function recordAttempt(db, { username, ip, success, userAgent }) {
    const uname = String(username || '').toLowerCase();

    for (const [scope, identifier] of [['user', uname], ['ip', ip]]) {
        if (!identifier) continue;
        db.prepare(`
            INSERT INTO login_attempts (identifier, scope, success, ip, user_agent)
            VALUES (?, ?, ?, ?, ?)
        `).run(identifier, scope, success ? 1 : 0, ip || '', String(userAgent || '').slice(0, 200));
    }

    if (success) {
        // ورود موفق سابقهٔ خطا را پاک می‌کند تا کاربر قانونی گیر نیفتد
        db.prepare('DELETE FROM login_attempts WHERE scope = ? AND identifier = ?')
          .run('user', uname);
        db.prepare('DELETE FROM login_attempts WHERE scope = ? AND identifier = ?')
          .run('ip', ip);
        return { blocked: false };
    }

    // آیا با این خطا به سقف رسیدیم؟
    let blockedNow = false;
    for (const [scope, identifier] of [['user', uname], ['ip', ip]]) {
        if (!identifier) continue;
        if (failureCount(db, scope, identifier) >= LOGIN_BLOCK_AFTER) {
            db.prepare(`
                INSERT INTO blocks (identifier, scope, reason, blocked_until)
                VALUES (?, ?, ?, ?)
            `).run(identifier, scope,
                   `${LOGIN_BLOCK_AFTER} تلاش ناموفق ورود`,
                   futureIso(LOGIN_BLOCK_MINUTES));
            blockedNow = true;
        }
    }
    return { blocked: blockedNow };
}

// ── کپچای ساده ─────────────────────────────────────────────────────
//
// عمداً ساده و فارسی است (جمع دو عدد کوچک). هدف کند کردن ربات‌هاست،
// نه آزار کاربر. پاسخ درست به شکل امضاشده به کلاینت داده می‌شود تا
// نیازی به نگهداری session سمت سرور نباشد.

const CAPTCHA_SECRET = crypto.randomBytes(32);

function signCaptcha(answer, expiresAt) {
    return crypto.createHmac('sha256', CAPTCHA_SECRET)
        .update(`${answer}.${expiresAt}`).digest('hex');
}

/** یک چالش تازه می‌سازد. */
function createCaptcha() {
    const a = 1 + Math.floor(Math.random() * 9);
    const b = 1 + Math.floor(Math.random() * 9);
    const answer = a + b;
    const expiresAt = Date.now() + 5 * 60 * 1000;
    const faDigits = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
    return {
        question: `${faDigits[a]} + ${faDigits[b]} = ?`,
        token: `${expiresAt}.${signCaptcha(answer, expiresAt)}`
    };
}

/** پاسخ کاربر را می‌سنجد. */
function verifyCaptcha(token, answer) {
    if (!token || answer === undefined || answer === null) return false;
    const [expiresRaw, signature] = String(token).split('.');
    const expiresAt = Number(expiresRaw);
    if (!expiresAt || Date.now() > expiresAt) return false;

    // ارقام فارسی را هم قبول می‌کنیم
    const normalized = String(answer)
        .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
        .trim();
    const numeric = parseInt(normalized, 10);
    if (Number.isNaN(numeric)) return false;

    const expected = signCaptcha(numeric, expiresAt);
    // مقایسهٔ زمان‌ثابت برای جلوگیری از حملهٔ زمانی
    const a = Buffer.from(expected);
    const b = Buffer.from(signature || '');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ── اعتبارسنجی رمز عبور ─────────────────────────────────────────────

/** رمزهایی که همه امتحان می‌کنند. */
const COMMON_PASSWORDS = new Set([
    'password', '123456', '12345678', '123456789', 'qwerty', 'abc123',
    'admin', 'admin123', 'letmein', 'welcome', 'iloveyou', '1234567890',
    'password123', 'qwerty123', '111111', '123123', 'admin1234'
]);

/**
 * قدرت رمز را می‌سنجد.
 * @returns {{ok:true}|{ok:false, error:string}}
 */
function validatePassword(password, { username } = {}) {
    if (!password || typeof password !== 'string') {
        return { ok: false, error: 'رمز عبور را وارد کنید.' };
    }
    if (password.length < 8) {
        return { ok: false, error: 'رمز عبور باید حداقل ۸ کاراکتر باشد.' };
    }
    if (password.length > 128) {
        return { ok: false, error: 'رمز عبور خیلی طولانی است.' };
    }
    if (COMMON_PASSWORDS.has(password.toLowerCase())) {
        return { ok: false, error: 'این رمز خیلی ساده و قابل حدس است. یک رمز دیگر انتخاب کنید.' };
    }
    if (username && password.toLowerCase().includes(String(username).toLowerCase())) {
        return { ok: false, error: 'رمز عبور نباید شامل نام کاربری باشد.' };
    }
    const hasLetter = /[a-zA-Z؀-ۿ]/.test(password);
    const hasDigit = /\d/.test(password);
    if (!hasLetter || !hasDigit) {
        return { ok: false, error: 'رمز عبور باید هم حرف داشته باشد و هم عدد.' };
    }
    return { ok: true };
}

/** نام کاربری معتبر: انگلیسی، عدد، نقطه و زیرخط. */
function validateUsername(username) {
    if (!username || typeof username !== 'string') {
        return { ok: false, error: 'نام کاربری را وارد کنید.' };
    }
    const trimmed = username.trim();
    if (trimmed.length < 3 || trimmed.length > 30) {
        return { ok: false, error: 'نام کاربری باید بین ۳ تا ۳۰ کاراکتر باشد.' };
    }
    if (!/^[a-zA-Z0-9._]+$/.test(trimmed)) {
        return { ok: false, error: 'نام کاربری فقط می‌تواند شامل حروف انگلیسی، عدد، نقطه و زیرخط باشد.' };
    }
    if (/^[._]|[._]$/.test(trimmed)) {
        return { ok: false, error: 'نام کاربری نباید با نقطه یا زیرخط شروع یا تمام شود.' };
    }
    return { ok: true, value: trimmed.toLowerCase() };
}

module.exports = {
    clientIp,
    checkLoginGate,
    recordAttempt,
    createCaptcha,
    verifyCaptcha,
    validatePassword,
    validateUsername
};
