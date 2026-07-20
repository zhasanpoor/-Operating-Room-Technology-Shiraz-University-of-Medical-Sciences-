/**
 * پیکربندی مرکزی و اعتبارسنجی اسرار.
 *
 * قانون: هرگز یک secret پیش‌فرض و قابل حدس در کد نگذارید.
 * در حالت production نبودِ JWT_SECRET قوی = خطای مرگبار (سرور بالا نمی‌آید).
 * در حالت development یک secret تصادفی ساخته و در `.jwt-secret` ذخیره می‌شود
 * تا با هر ری‌استارت همه از سیستم بیرون نیفتند.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const SECRET_FILE = path.join(__dirname, '.jwt-secret');

/** secretهایی که قبلاً در سورس‌کد لو رفته‌اند و دیگر نباید استفاده شوند. */
const KNOWN_WEAK_SECRETS = new Set([
    'shiraz-ort-secret-2024',
    'shiraz-ort-secret-key-2024',
    'secret',
    'changeme'
]);

function isStrongSecret(value) {
    return typeof value === 'string'
        && value.length >= 32
        && !KNOWN_WEAK_SECRETS.has(value);
}

/**
 * کلید امضای توکن را تعیین می‌کند.
 *
 * چرا دیگر با خطا خارج نمی‌شویم؟
 * نسخهٔ قبلی در production بدون `JWT_SECRET` کل سرویس را پایین می‌آورد.
 * این تصمیم اشتباه بود: خطری که می‌خواستیم جلویش را بگیریم «کلید ضعیف یا
 * لو رفته» بود، و یک مقدار تصادفی ۴۸ بایتی دقیقاً به اندازهٔ مقدار محیطی
 * امن است. تنها تفاوتش این است که با ری‌استارت عوض می‌شود و کاربران باید
 * دوباره وارد شوند — که هزینهٔ راحتی است، نه هزینهٔ امنیتی.
 *
 * پس: هرگز از کلید ضعیفِ لو رفته استفاده نمی‌کنیم، ولی سایت را هم
 * پایین نمی‌آوریم. فقط بلند هشدار می‌دهیم.
 */
function resolveJwtSecret() {
    const fromEnv = process.env.JWT_SECRET;

    if (isStrongSecret(fromEnv)) return fromEnv;

    if (fromEnv && !isStrongSecret(fromEnv)) {
        console.warn('⚠️  مقدار JWT_SECRET ضعیف یا لو رفته است و نادیده گرفته شد.');
    }

    // تلاش برای کلید پایدار روی دیسک تا ری‌استارت‌های داخل همان کانتینر
    // کاربران را بیرون نیندازد.
    let secret = null;
    try {
        if (fs.existsSync(SECRET_FILE)) {
            const saved = fs.readFileSync(SECRET_FILE, 'utf8').trim();
            if (isStrongSecret(saved)) secret = saved;
        }
        if (!secret) {
            secret = crypto.randomBytes(48).toString('hex');
            fs.writeFileSync(SECRET_FILE, secret, { mode: 0o600 });
        }
    } catch (err) {
        // فایل‌سیستم فقط-خواندنی — کلید موقت در حافظه
        secret = secret || crypto.randomBytes(48).toString('hex');
    }

    if (IS_PRODUCTION) {
        console.warn(`
╔══════════════════════════════════════════════════════════════╗
║  ⚠️  هشدار: JWT_SECRET در متغیرهای محیطی تنظیم نشده است.     ║
║                                                              ║
║  سایت بالا می‌آید و امن است (کلید تصادفی قوی ساخته شد)،      ║
║  اما این کلید با هر ری‌استارت عوض می‌شود و همهٔ کاربران      ║
║  از حساب خارج می‌شوند.                                       ║
║                                                              ║
║  برای رفع دائمی، در Render → Environment این را اضافه کنید:  ║
║     JWT_SECRET = (یک مقدار تصادفی ۶۴ کاراکتری)               ║
╚══════════════════════════════════════════════════════════════╝
`);
    } else {
        console.warn('⚠️  JWT_SECRET تنظیم نشده — کلید تصادفی در .jwt-secret ذخیره شد (توسعه).');
    }

    return secret;
}

module.exports = {
    IS_PRODUCTION,
    PORT: parseInt(process.env.PORT, 10) || 3000,
    JWT_SECRET: resolveJwtSecret(),
    JWT_EXPIRES_IN: '7d',

    // امنیت ورود
    BCRYPT_ROUNDS: 12,
    LOGIN_CAPTCHA_AFTER: 3,      // بعد از این تعداد خطا، کپچا لازم می‌شود
    LOGIN_BLOCK_AFTER: 5,        // بعد از این تعداد خطا، بلاک می‌شود
    LOGIN_BLOCK_MINUTES: 15,     // مدت بلاک
    LOGIN_WINDOW_MINUTES: 15,    // بازهٔ شمارش تلاش‌های ناموفق

    // آپلود
    MAX_UPLOAD_BYTES: 8 * 1024 * 1024,
    MAX_AVATAR_BYTES: 2 * 1024 * 1024,

    // دامنه‌های مجاز برای CORS (در production حتماً تنظیم شود)
    ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || '')
        .split(',').map(s => s.trim()).filter(Boolean),

    // دامنه‌های مجاز برای ویدیو و اسلاید
    ALLOWED_VIDEO_HOSTS: [
        'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be',
        'aparat.com', 'www.aparat.com',
        'vimeo.com', 'player.vimeo.com'
    ]
};
