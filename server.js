require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
const { initDatabase } = require('./database');

async function main() {
    const db = await initDatabase();
    console.log('Database initialized.');

    const catCount = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
    if (catCount === 0) {
        console.log('Database empty, running auto-seed...');
        require('./seed')(db);
        require('./seed-content')(db);
        console.log('Auto-seed completed!');
    }

    const apiRoutes = require('./routes/api')(db);

    const app = express();
    const PORT = process.env.PORT || 3000;

    // سیاست امنیتی محتوا (CSP): اسکریپت فقط از خود سایت اجرا می‌شود، پس
    // حتی اگر رشته‌ای مخرب از پاک‌سازی رد شود، مرورگر اجرایش نمی‌کند.
    // منابع مجاز دقیقاً همان‌هایی‌اند که سایت واقعاً استفاده می‌کند.
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                // 'unsafe-inline' فقط برای استایل لازم است (style=... فراوان
                // در قالب‌ها). برای اسکریپت لازم نیست چون هندلرهای درون‌خطی
                // حذف و به فایل منتقل شدند.
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
                fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
                imgSrc: ["'self'", 'data:', 'https:'],
                mediaSrc: ["'self'", 'https:'],
                // ویدیو و اسلاید داخل iframe از این دامنه‌ها می‌آید
                frameSrc: [
                    "'self'",
                    'https://www.youtube.com', 'https://www.youtube-nocookie.com',
                    'https://www.aparat.com', 'https://player.vimeo.com',
                    'https://docs.google.com'
                ],
                connectSrc: ["'self'"],
                objectSrc: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                frameAncestors: ["'self'"]
            }
        },
        crossOriginEmbedderPolicy: false
    }));

    // CORS محدود به دامنه‌های مجاز. در توسعه (بدون فهرست) آزاد است؛
    // در production فقط دامنه‌های ALLOWED_ORIGINS و same-origin.
    const { ALLOWED_ORIGINS, IS_PRODUCTION } = require('./config');
    app.use(cors({
        origin(origin, cb) {
            if (!origin) return cb(null, true);            // same-origin یا ابزار
            if (!IS_PRODUCTION) return cb(null, true);
            if (ALLOWED_ORIGINS.length === 0) return cb(null, true);
            return cb(null, ALLOWED_ORIGINS.includes(origin));
        },
        credentials: true
    }));

    app.use(morgan('combined'));
    app.use(express.json({ limit: '2mb' }));
    app.use(express.urlencoded({ extended: true, limit: '2mb' }));
    app.use(cookieParser());

    // اعتماد به پراکسی Render تا req.ip واقعی باشد (برای محدودیت نرخ و بلاک IP)
    app.set('trust proxy', 1);

    // محدودیت نرخ عمومی روی کل API — سپر کلی در برابر سیل درخواست.
    // محافظت اختصاصی brute-force روی لاگین جداگانه در lib/auth-guard است.
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 300,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'درخواست‌های شما بیش از حد مجاز است. کمی صبر کنید.' }
    });
    app.use('/api/', limiter);

    app.use(express.static(path.join(__dirname, 'public')));
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

    app.use('/api', apiRoutes);

    app.get('/admin', (req, res) => {
        res.sendFile(path.join(__dirname, 'admin', 'index.html'));
    });

    app.get('/admin/*', (req, res) => {
        res.sendFile(path.join(__dirname, 'admin', 'index.html'));
    });

    // مسیر API که پیدا نشد باید JSON برگرداند، نه صفحهٔ HTML.
    // قبلاً به app.get('*') می‌رسید و index.html را می‌فرستاد که کلاینت
    // را گیج می‌کرد (پاسخ HTML به‌جای خطای ۴۰۴).
    app.use('/api', (req, res) => {
        res.status(404).json({ error: 'این آدرس API وجود ندارد.' });
    });

    // بقیهٔ مسیرها اپلیکیشن تک‌صفحه‌ای را می‌گیرند؛ مسیرهای واقعاً ناموجود
    // در سمت کلاینت مدیریت می‌شوند. صفحهٔ ۴۰۴ اختصاصی برای درخواست‌های
    // مستقیمِ فایل‌مانند (مثلاً /chart.png) که وجود ندارند.
    app.get('*', (req, res) => {
        const looksLikeFile = path.extname(req.path);
        if (looksLikeFile) {
            return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
        }
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // مدیریت خطای نهایی — پاسخ متناسب با نوع درخواست
    app.use((err, req, res, next) => {
        console.error('خطای مدیریت‌نشده:', err && (err.stack || err.message || err));
        const wantsJson = req.path.startsWith('/api')
            || (req.headers.accept || '').includes('application/json');
        if (wantsJson) {
            return res.status(500).json({ error: 'خطای سرور. کمی بعد دوباره تلاش کنید.' });
        }
        res.status(500).sendFile(path.join(__dirname, 'public', '500.html'));
    });

    app.listen(PORT, () => {
        console.log(`\n========================================`);
        console.log(`  تکنولوژی اتاق عمل — ویژه دانشجویان و متخصصین`);
        console.log(`========================================`);
        console.log(`  سایت اصلی:    http://localhost:${PORT}`);
        console.log(`  پنل مدیریت:   http://localhost:${PORT}/admin`);
        console.log(`  API:          http://localhost:${PORT}/api`);
        console.log(`========================================\n`);
    });
}

main().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
