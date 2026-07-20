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

function resolveJwtSecret() {
    const fromEnv = process.env.JWT_SECRET;

    if (isStrongSecret(fromEnv)) return fromEnv;

    if (IS_PRODUCTION) {
        console.error(`
╔══════════════════════════════════════════════════════════════╗
║  خطای امنیتی مرگبار: JWT_SECRET معتبر تنظیم نشده است.        ║
║                                                              ║
║  یک مقدار تصادفی حداقل ۳۲ کاراکتری در متغیرهای محیطی        ║
║  سرور تعریف کنید. برای ساختنش:                              ║
║    node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
╚══════════════════════════════════════════════════════════════╝
`);
        process.exit(1);
    }

    // حالت توسعه: secret پایدارِ تصادفی روی دیسک
    try {
        if (fs.existsSync(SECRET_FILE)) {
            const saved = fs.readFileSync(SECRET_FILE, 'utf8').trim();
            if (isStrongSecret(saved)) return saved;
        }
        const generated = crypto.randomBytes(48).toString('hex');
        fs.writeFileSync(SECRET_FILE, generated, { mode: 0o600 });
        console.warn('⚠️  JWT_SECRET تنظیم نشده بود — یک مقدار تصادفی ساخته و در .jwt-secret ذخیره شد (فقط برای توسعه).');
        return generated;
    } catch (err) {
        console.warn('⚠️  ذخیرهٔ .jwt-secret ممکن نشد؛ secret موقتی در حافظه ساخته شد.');
        return crypto.randomBytes(48).toString('hex');
    }
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
