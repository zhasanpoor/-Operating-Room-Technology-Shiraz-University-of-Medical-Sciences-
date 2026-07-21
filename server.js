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

    // محافظت CSRF — چون authMiddleware توکن را از کوکی هم می‌پذیرد و
    // مرورگر کوکی را خودکار می‌فرستد، آن مسیر بدون این محافظت در برابر
    // جعل درخواست بین‌سایتی باز است.
    const { csrfProtection } = require('./lib/csrf');
    app.use(csrfProtection({ isProduction: IS_PRODUCTION }));

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

    // ── سئو ─────────────────────────────────────────────────────────
    const seo = require('./lib/seo');
    const errorPages = require('./lib/error-pages');
    const fsp = require('fs');

    /** نشانی پایهٔ سایت — از روی درخواست ساخته می‌شود تا با هر دامنه‌ای کار کند. */
    function baseUrlOf(req) {
        const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        return `${proto}://${req.get('host')}`;
    }

    app.get('/sitemap.xml', (req, res) => {
        try {
            res.type('application/xml').send(seo.buildSitemap(db, baseUrlOf(req)));
        } catch (err) {
            console.error('خطا در ساخت نقشهٔ سایت:', err.message);
            res.status(500).type('text/plain').send('sitemap error');
        }
    });

    app.get('/robots.txt', (req, res) => {
        res.type('text/plain').send(seo.buildRobots(baseUrlOf(req)));
    });

    // قالب صفحهٔ اصلی یک بار خوانده و در حافظه نگه داشته می‌شود
    const indexPath = path.join(__dirname, 'public', 'index.html');
    let indexTemplate = fsp.readFileSync(indexPath, 'utf8');

    /**
     * متاتگ‌ها را داخل HTML تزریق می‌کند.
     * ربات‌های شبکه‌های اجتماعی جاوااسکریپت اجرا نمی‌کنند، پس عنوان و
     * توضیح باید در همان HTML اولیه باشد وگرنه لینک اشتراک‌گذاری‌شده
     * بدون عنوان و توضیح نمایش داده می‌شود.
     */
    function renderPage(metaHtml) {
        return indexTemplate.replace(
            /<title>[\s\S]*?<\/title>/,
            metaHtml.trim()
        );
    }

    // صفحهٔ اختصاصی هر عمل — با متاتگ مخصوص خودش
    app.get('/op/:slug', (req, res, next) => {
        try {
            const key = req.params.slug;
            const operation = db.prepare(`
                SELECT o.id, o.name, o.slug, o.status, o.published_at, o.updated_at,
                       oc.description, u.full_name AS author_name
                FROM operations o
                LEFT JOIN operation_content oc ON oc.operation_id = o.id
                LEFT JOIN users u ON o.author_id = u.id
                WHERE (o.slug = ? OR o.id = ?) AND o.status = 'approved'
            `).get(key, parseInt(key, 10) || -1);

            if (!operation) {
                return errorPages.sendError(req, res, 404);
            }
            res.send(renderPage(seo.operationMeta(operation, baseUrlOf(req))));
        } catch (err) {
            next(err);
        }
    });

    // صفحات ایستا — بدون این، catch-all پایین اپلیکیشن تک‌صفحه‌ای را
    // سرو می‌کرد و این صفحات هرگز دیده نمی‌شدند.
    const STATIC_PAGES = {
        '/help': 'help.html',
        '/faq': 'faq.html',
        '/sitemap': 'sitemap.html'
    };
    for (const [route, file] of Object.entries(STATIC_PAGES)) {
        app.get(route, (req, res) => {
            res.sendFile(path.join(__dirname, 'public', file));
        });
    }

    // مسیر API که پیدا نشد باید JSON برگرداند، نه صفحهٔ HTML.
    // قبلاً به app.get('*') می‌رسید و index.html را می‌فرستاد که کلاینت
    // را گیج می‌کرد (پاسخ HTML به‌جای خطای ۴۰۴).
    app.use('/api', (req, res) => {
        errorPages.sendError(req, res, 404, 'این آدرس API وجود ندارد.');
    });

    // صفحهٔ تأیید ایمیل — لینکی که در ایمیل کاربر است به اینجا می‌آید.
    // خود تأیید سمت کلاینت با فراخوانی API انجام می‌شود تا نتیجه با
    // پیام فارسی روشن نمایش داده شود.
    app.get('/verify-email', (req, res) => {
        res.type('html').send(`<!DOCTYPE html>
<html lang="fa" dir="rtl"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>تأیید ایمیل | تکنولوژی اتاق عمل</title>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Vazirmatn',system-ui,sans-serif;background:radial-gradient(circle at 30% 20%,#12141e,#06060b);
color:#e5e7eb;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px}
.box{max-width:420px}.ico{font-size:60px;margin-bottom:16px}
h1{font-size:22px;margin-bottom:12px}p{color:#9ca3af;line-height:2;margin-bottom:24px}
.btn{display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;
text-decoration:none;padding:14px 30px;border-radius:12px;font-weight:600}
.spin{width:40px;height:40px;border:3px solid #1e2235;border-top-color:#6366f1;border-radius:50%;
margin:0 auto 18px;animation:s 1s linear infinite}@keyframes s{to{transform:rotate(360deg)}}
</style></head><body>
<div class="box" id="box">
  <div class="spin"></div><h1>در حال بررسی…</h1><p>چند لحظه صبر کن</p>
</div>
<script>
(async () => {
  const token = new URLSearchParams(location.search).get('token');
  const box = document.getElementById('box');
  const show = (ico, title, text, link) => {
    box.innerHTML = '<div class="ico">' + ico + '</div><h1>' + title + '</h1>' +
      '<p>' + text + '</p><a class="btn" href="' + (link || '/') + '">بازگشت به سایت</a>';
  };
  if (!token) return show('⚠️', 'لینک ناقص است', 'این نشانی توکن تأیید ندارد.');
  try {
    const res = await fetch('/api/auth/verify-email?token=' + encodeURIComponent(token));
    const data = await res.json();
    if (res.ok) show('🎉', 'ایمیلت تأیید شد!', data.message || 'حسابت فعال شد.');
    else show('😕', 'تأیید نشد', data.error || 'مشکلی پیش آمد.');
  } catch (e) {
    show('😕', 'ارتباط برقرار نشد', 'اینترنتت را بررسی کن و دوباره تلاش کن.');
  }
})();
</script></body></html>`);
    });

    // صفحات خطا با آدرس مستقیم — برای پیش‌نمایش و لینک دادن از جاهای دیگر
    app.get('/error/:code', (req, res) => {
        const code = parseInt(req.params.code, 10);
        if (!errorPages.PAGES[code]) return errorPages.sendError(req, res, 404);
        res.status(code).type('html').send(errorPages.renderErrorPage(code));
    });

    // بقیهٔ مسیرها اپلیکیشن تک‌صفحه‌ای را می‌گیرند؛ مسیرهای واقعاً ناموجود
    // در سمت کلاینت مدیریت می‌شوند. صفحهٔ ۴۰۴ اختصاصی برای درخواست‌های
    // مستقیمِ فایل‌مانند (مثلاً /chart.png) که وجود ندارند.
    app.get('*', (req, res) => {
        const looksLikeFile = path.extname(req.path);
        if (looksLikeFile) {
            return errorPages.sendError(req, res, 404);
        }
        // متاتگ‌های پیش‌فرض تزریق می‌شوند تا صفحهٔ اصلی هم برای موتور
        // جستجو و اشتراک‌گذاری عنوان و توضیح درست داشته باشد.
        res.send(renderPage(seo.defaultMeta(baseUrlOf(req))));
    });

    // مدیریت خطای نهایی — پاسخ متناسب با نوع درخواست
    app.use((err, req, res, next) => {
        console.error('خطای مدیریت‌نشده:', err && (err.stack || err.message || err));

        // خطاهای شناخته‌شده کد درست خودشان را می‌گیرند، نه ۵۰۰ کلی
        let code = 500;
        if (err && (err.type === 'entity.too.large' || err.code === 'LIMIT_FILE_SIZE')) {
            code = 413;
        } else if (err && err.status >= 400 && err.status < 600) {
            code = err.status;
        }
        errorPages.sendError(req, res, code);
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
