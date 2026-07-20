const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
    sanitizeRichText, sanitizePlainText, detectThreats, worstSeverity, validateVideoUrl
} = require('../lib/sanitize');
const {
    clientIp, checkLoginGate, recordAttempt, createCaptcha, verifyCaptcha,
    validatePassword, validateUsername
} = require('../lib/auth-guard');
const { uniqueSlug } = require('../lib/slug');

// مقدار پیش‌فرض قبلی ('shiraz-ort-secret-key-2024') در همین مخزن عمومی
// منتشر شده بود و هرکسی می‌توانست با آن توکن مدیر جعل کند.
// config.js در production بدون secret قوی اجازهٔ بالا آمدن نمی‌دهد.
const {
    JWT_SECRET, JWT_EXPIRES_IN, BCRYPT_ROUNDS,
    LOGIN_BLOCK_AFTER, LOGIN_CAPTCHA_AFTER, LOGIN_BLOCK_MINUTES,
    MAX_AVATAR_BYTES, MAX_UPLOAD_BYTES
} = require('../config');

module.exports = function(db) {
const router = express.Router();

/**
 * `undefined` را به `null` تبدیل می‌کند.
 * درایور sql.js فقط null را می‌پذیرد و با undefined خطای بدون پیام می‌دهد.
 */
function nz(value) {
    return value === undefined ? null : value;
}

/**
 * ثبت رویداد حساس در لاگ ممیزی.
 * عمداً هرگز throw نمی‌کند — شکست در لاگ‌گیری نباید عملیات اصلی را خراب کند.
 */
function writeAudit(req, action, targetType, targetId, detail) {
    try {
        db.prepare(`
            INSERT INTO audit_log (user_id, action, target_type, target_id, detail, ip)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(req.user ? req.user.id : null, action, targetType || '',
               targetId || null, String(detail || '').slice(0, 500),
               clientIp(req));
    } catch (err) {
        console.error('ثبت لاگ ممیزی ناموفق:', err.message);
    }
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: MAX_UPLOAD_BYTES },
    fileFilter: (req, file, cb) => {
        // multer v2: خطا باید شیء Error باشد، نه رشته.
        // هم پسوند و هم نوع MIME باید مجاز باشند (نه «یا») تا فایلی با
        // پسوند جعلی راه پیدا نکند.
        const allowedExt = /\.(jpe?g|png|gif|webp|pdf|pptx|docx|mp4|webm)$/i;
        const allowedMime = /^(image\/(jpeg|png|gif|webp)|application\/pdf|application\/vnd\.openxmlformats|video\/(mp4|webm))/;
        const okExt = allowedExt.test(file.originalname);
        const okMime = allowedMime.test(file.mimetype);
        if (okExt && okMime) return cb(null, true);
        cb(new Error('این نوع فایل پشتیبانی نمی‌شود.'));
    }
});

function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
    if (!token) return res.status(401).json({ error: 'احراز هویت لازم است' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // نقش و وضعیت از دیتابیس خوانده می‌شود، نه از توکن.
        // اگر ادمین سطح دسترسی کسی را پایین بیاورد یا حسابش را ببندد،
        // توکن قبلی‌اش نباید همچنان دسترسی بالا بدهد.
        const fresh = db.prepare(
            'SELECT id, username, full_name, role, is_active FROM users WHERE id = ?'
        ).get(decoded.id);

        if (!fresh) return res.status(401).json({ error: 'حساب کاربری یافت نشد' });
        if (fresh.is_active === 0) {
            return res.status(403).json({
                error: 'حساب شما غیرفعال شده است. با مدیر سایت تماس بگیرید.'
            });
        }

        req.user = fresh;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'توکن نامعتبر' });
    }
}

/**
 * فقط مدیر.
 *
 * پیش از این `adminOnly` نقش `editor` را هم می‌پذیرفت و روی مسیر ساخت
 * کاربر نشسته بود — یعنی یک نویسنده می‌توانست برای خودش حساب ادمین
 * بسازد و کاربران را حذف کند. ارتقای کامل سطح دسترسی.
 */
function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'این بخش فقط برای مدیر سایت است.' });
    }
    next();
}

/** مدیر یا نویسنده — برای کارهای محتوایی. */
function requireAuthor(req, res, next) {
    if (req.user.role !== 'admin' && req.user.role !== 'editor') {
        return res.status(403).json({ error: 'برای این کار باید نویسنده باشید.' });
    }
    next();
}

/**
 * بررسی اجازهٔ ویرایش یک عمل.
 *
 * قواعد:
 *   • نویسنده فقط پست‌های خودش را می‌بیند و ویرایش می‌کند.
 *   • پست تأییدشده قفل است و هیچ‌کس ویرایشش نمی‌کند — حتی نویسنده.
 *     مدیر برای اصلاح باید اول عمداً قفل را باز کند.
 *
 * @returns {{ok:true, operation:object}|{ok:false, status:number, error:string}}
 */
function checkOperationAccess(db, user, operationId) {
    const operation = db.prepare(
        'SELECT id, author_id, status, is_locked FROM operations WHERE id = ?'
    ).get(operationId);

    if (!operation) {
        return { ok: false, status: 404, error: 'این عمل جراحی پیدا نشد.' };
    }

    const isAdmin = user.role === 'admin';
    const isOwner = operation.author_id === user.id;

    if (!isAdmin && !isOwner) {
        return { ok: false, status: 403, error: 'شما فقط به پست‌های خودتان دسترسی دارید.' };
    }

    if (operation.is_locked === 1) {
        return {
            ok: false,
            status: 423,
            error: isAdmin
                ? 'این پست تأیید و قفل شده. برای ویرایش، اول قفلش را باز کنید.'
                : 'این پست تأیید شده و دیگر قابل ویرایش نیست.'
        };
    }

    return { ok: true, operation };
}

/**
 * احراز هویت اختیاری — برای مسیرهای عمومی که خروجی‌شان به نقش بستگی دارد.
 * توکن نامعتبر خطا نمی‌دهد؛ فقط کاربر مهمان حساب می‌شود.
 */
function optionalAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
    req.user = null;
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const fresh = db.prepare(
                'SELECT id, username, full_name, role, is_active FROM users WHERE id = ?'
            ).get(decoded.id);
            if (fresh && fresh.is_active !== 0) req.user = fresh;
        } catch (e) { /* مهمان */ }
    }
    next();
}

/**
 * شرط SQL دیده شدن پست بر اساس نقش.
 *
 * بدون این فیلتر، پیش‌نویس‌های نویسنده‌ها در سایت عمومی نشت می‌کنند.
 *   • مهمان و کاربر عادی: فقط تأییدشده‌ها
 *   • نویسنده: تأییدشده‌ها + همهٔ پست‌های خودش (با هر وضعیتی)
 *   • مدیر: همه‌چیز
 *
 * @returns {{sql:string, params:Array}}
 */
function visibilityFilter(user) {
    if (user && user.role === 'admin') {
        return { sql: '1=1', params: [] };
    }
    if (user && user.role === 'editor') {
        return { sql: "(o.status = 'approved' OR o.author_id = ?)", params: [user.id] };
    }
    return { sql: "o.status = 'approved'", params: [] };
}

// Auth

/** وضعیت ورود — کلاینت می‌پرسد آیا کپچا لازم است یا بلاک شده. */
router.get('/auth/gate', (req, res) => {
    try {
        const ip = clientIp(req);
        const gate = checkLoginGate(db, req.query.username, ip);
        const payload = {
            blocked: gate.blocked,
            needsCaptcha: gate.needsCaptcha,
            remainingSeconds: gate.seconds
        };
        if (gate.needsCaptcha && !gate.blocked) payload.captcha = createCaptcha();
        res.json(payload);
    } catch (err) {
        res.json({ blocked: false, needsCaptcha: false, remainingSeconds: 0 });
    }
});

router.post('/auth/login', async (req, res) => {
    const ip = clientIp(req);
    try {
        const { username, password, captchaToken, captchaAnswer } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'نام کاربری و رمز عبور را وارد کنید.' });
        }

        // ── دروازهٔ ضد حدس رمز ──────────────────────────────────────
        const gate = checkLoginGate(db, username, ip);

        if (gate.blocked) {
            const minutes = Math.ceil(gate.seconds / 60);
            return res.status(429).json({
                error: `به دلیل تلاش‌های ناموفق زیاد، ورود موقتاً بسته شده. حدود ${minutes} دقیقهٔ دیگر دوباره امتحان کنید.`,
                blocked: true,
                remainingSeconds: gate.seconds
            });
        }

        if (gate.needsCaptcha && !verifyCaptcha(captchaToken, captchaAnswer)) {
            // کپچای غلط هم یک تلاش ناموفق حساب می‌شود. اگر نشود، شمارنده
            // روی ۳ قفل می‌ماند و بلاکِ ۵ تلاش هرگز فعال نمی‌شود — یعنی
            // مهاجم می‌تواند بی‌نهایت به این مسیر فشار بیاورد.
            const attempt = recordAttempt(db, {
                username, ip, success: false, userAgent: req.headers['user-agent']
            });
            if (attempt.blocked) {
                return res.status(429).json({
                    error: `تلاش‌های ناموفق زیاد بود. ورود به مدت ${LOGIN_BLOCK_MINUTES} دقیقه بسته شد.`,
                    blocked: true
                });
            }
            return res.status(400).json({
                error: 'پاسخ سؤال امنیتی درست نیست.',
                needsCaptcha: true,
                captcha: createCaptcha()
            });
        }

        const user = db.prepare('SELECT * FROM users WHERE username = ?')
                       .get(String(username).toLowerCase().trim());

        // پیام یکسان برای «کاربر نیست» و «رمز غلط» تا نام‌های کاربری لو نروند
        const invalid = () => {
            const result = recordAttempt(db, {
                username, ip, success: false, userAgent: req.headers['user-agent']
            });
            const body = { error: 'نام کاربری یا رمز عبور اشتباه است.' };
            if (result.blocked) {
                body.error = `تلاش‌های ناموفق زیاد بود. ورود به مدت ${LOGIN_BLOCK_MINUTES} دقیقه بسته شد.`;
                body.blocked = true;
            } else {
                const after = checkLoginGate(db, username, ip);
                if (after.needsCaptcha) {
                    body.needsCaptcha = true;
                    body.captcha = createCaptcha();
                }
                const left = LOGIN_BLOCK_AFTER - after.attempts;
                if (left > 0 && after.attempts >= LOGIN_CAPTCHA_AFTER) {
                    body.error += ` (${left} تلاش دیگر تا بسته شدن موقت)`;
                }
            }
            return res.status(401).json(body);
        };

        if (!user) return invalid();

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return invalid();

        if (user.is_active === 0) {
            recordAttempt(db, { username, ip, success: false, userAgent: req.headers['user-agent'] });
            return res.status(403).json({
                error: 'حساب شما غیرفعال شده است. برای پیگیری با مدیر سایت تماس بگیرید.'
            });
        }

        recordAttempt(db, { username, ip, success: true, userAgent: req.headers['user-agent'] });
        db.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
        res.json({
            token,
            user: {
                id: user.id, username: user.username, full_name: user.full_name,
                role: user.role, avatar: user.avatar || ''
            }
        });
    } catch (err) {
        console.error('خطا در ورود:', err.message);
        res.status(500).json({ error: 'ورود انجام نشد. کمی بعد دوباره تلاش کنید.' });
    }
});

/** ثبت‌نام عمومی — کاربر عادی می‌سازد. */
router.post('/auth/signup', async (req, res) => {
    const ip = clientIp(req);
    try {
        const { username, password, full_name, email } = req.body;

        const uname = validateUsername(username);
        if (!uname.ok) return res.status(400).json({ error: uname.error });

        const pwd = validatePassword(password, { username: uname.value });
        if (!pwd.ok) return res.status(400).json({ error: pwd.error });

        const name = sanitizePlainText(full_name);
        if (!name || name.length < 3) {
            return res.status(400).json({ error: 'نام و نام خانوادگی را کامل وارد کنید.' });
        }

        let cleanEmail = null;
        if (email) {
            cleanEmail = sanitizePlainText(email).toLowerCase();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
                return res.status(400).json({ error: 'ایمیل معتبر نیست.' });
            }
            const emailTaken = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
            if (emailTaken) {
                return res.status(400).json({ error: 'این ایمیل قبلاً ثبت شده است.' });
            }
        }

        const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(uname.value);
        if (exists) {
            return res.status(400).json({ error: 'این نام کاربری قبلاً گرفته شده. یکی دیگر انتخاب کنید.' });
        }

        const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const result = db.prepare(`
            INSERT INTO users (username, password, full_name, email, role, is_active, password_changed_at)
            VALUES (?, ?, ?, ?, 'user', 1, CURRENT_TIMESTAMP)
        `).run(uname.value, hashed, name, cleanEmail);

        const userId = result.lastInsertRowid;

        db.prepare(`INSERT INTO notifications (user_id, title, body, icon)
                    VALUES (?, ?, ?, '🎉')`)
          .run(userId, 'به جمع ما خوش اومدی!',
               'حسابت ساخته شد. اگه دوست داری مطلب بنویسی، از پروفایلت درخواست نویسندگی بده.');

        const token = jwt.sign(
            { id: userId, username: uname.value, role: 'user', full_name: name },
            JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }
        );

        recordAttempt(db, { username: uname.value, ip, success: true, userAgent: req.headers['user-agent'] });

        res.json({
            token,
            user: { id: userId, username: uname.value, full_name: name, role: 'user', avatar: '' },
            message: 'ثبت‌نامت انجام شد. خوش اومدی!'
        });
    } catch (err) {
        console.error('خطا در ثبت‌نام:', err.message);
        res.status(500).json({ error: 'ثبت‌نام انجام نشد. کمی بعد دوباره تلاش کنید.' });
    }
});

router.post('/auth/register', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { username, password, full_name, role } = req.body;
        if (!username || !password || !full_name) {
            return res.status(400).json({ error: 'تمام فیلدها الزامی است' });
        }
        const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existing) {
            return res.status(400).json({ error: 'نام کاربری تکراری است' });
        }
        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const result = db.prepare(`
            INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)
        `).run(username, hashedPassword, full_name, role || 'user');
        res.json({ id: result.lastInsertRowid, message: 'کاربر اضافه شد' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/auth/me', authMiddleware, (req, res) => {
    const user = db.prepare('SELECT id, username, full_name, role, created_at FROM users WHERE id = ?').get(req.user.id);
    res.json(user);
});

router.get('/auth/users', authMiddleware, requireAdmin, (req, res) => {
    try {
        const users = db.prepare(`
            SELECT u.id, u.username, u.full_name, u.email, u.role, u.avatar,
                   u.is_active, u.author_request_status, u.author_request_note,
                   u.author_requested_at, u.last_login_at, u.created_at,
                   (SELECT COUNT(*) FROM operations WHERE author_id = u.id) AS post_count
            FROM users u ORDER BY u.id
        `).all();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'خواندن کاربران ناموفق بود.' });
    }
});

router.delete('/auth/users/:id', authMiddleware, requireAdmin, (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (id === req.user.id) {
            return res.status(400).json({ error: 'نمی‌توانید حساب خودتان را حذف کنید.' });
        }
        const target = db.prepare('SELECT id, role FROM users WHERE id = ?').get(id);
        if (!target) return res.status(404).json({ error: 'کاربر پیدا نشد.' });

        // نباید آخرین مدیر حذف شود وگرنه هیچ‌کس به پنل دسترسی ندارد
        if (target.role === 'admin') {
            const admins = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'").get().c;
            if (admins <= 1) {
                return res.status(400).json({ error: 'این تنها مدیر سایت است و نمی‌شود حذفش کرد.' });
            }
        }

        // پست‌های کاربر حذف نمی‌شوند؛ فقط بی‌صاحب می‌شوند تا محتوا از بین نرود
        db.prepare('UPDATE operations SET author_id = NULL WHERE author_id = ?').run(id);
        db.prepare('DELETE FROM users WHERE id = ?').run(id);
        writeAudit(req, 'user_delete', 'user', id, `حذف کاربر ${id}`);
        res.json({ message: 'کاربر حذف شد.' });
    } catch (err) {
        console.error('خطا در حذف کاربر:', err.message);
        res.status(500).json({ error: 'حذف کاربر انجام نشد.' });
    }
});

/** فعال یا غیرفعال کردن حساب کاربر. */
router.post('/auth/users/:id/active', authMiddleware, requireAdmin, (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (id === req.user.id) {
            return res.status(400).json({ error: 'نمی‌توانید حساب خودتان را غیرفعال کنید.' });
        }
        const target = db.prepare('SELECT id, role, full_name FROM users WHERE id = ?').get(id);
        if (!target) return res.status(404).json({ error: 'کاربر پیدا نشد.' });

        const active = req.body.is_active ? 1 : 0;
        if (!active && target.role === 'admin') {
            const admins = db.prepare(
                "SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND is_active = 1"
            ).get().c;
            if (admins <= 1) {
                return res.status(400).json({ error: 'این تنها مدیر فعال سایت است.' });
            }
        }

        const reason = sanitizePlainText(req.body.reason || '');
        db.prepare('UPDATE users SET is_active = ?, suspended_reason = ? WHERE id = ?')
          .run(active, active ? '' : reason, id);

        db.prepare(`INSERT INTO notifications (user_id, title, body, icon)
                    VALUES (?, ?, ?, ?)`)
          .run(id,
               active ? 'حسابت دوباره فعال شد' : 'حسابت غیرفعال شد',
               active ? 'می‌تونی دوباره وارد بشی.' : (reason || 'برای پیگیری با مدیر سایت تماس بگیر.'),
               active ? '✅' : '🚫');

        writeAudit(req, active ? 'user_activate' : 'user_deactivate', 'user', id,
                   `${target.full_name}${reason ? ' — ' + reason : ''}`);
        res.json({ message: active ? 'کاربر فعال شد.' : 'کاربر غیرفعال شد.' });
    } catch (err) {
        console.error('خطا در تغییر وضعیت کاربر:', err.message);
        res.status(500).json({ error: 'تغییر وضعیت انجام نشد.' });
    }
});

/** تغییر سطح دسترسی کاربر. */
router.post('/auth/users/:id/role', authMiddleware, requireAdmin, (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const role = req.body.role;
        if (!['admin', 'editor', 'user'].includes(role)) {
            return res.status(400).json({ error: 'سطح دسترسی نامعتبر است.' });
        }
        const target = db.prepare('SELECT id, role, full_name FROM users WHERE id = ?').get(id);
        if (!target) return res.status(404).json({ error: 'کاربر پیدا نشد.' });

        if (id === req.user.id && role !== 'admin') {
            return res.status(400).json({ error: 'نمی‌توانید سطح دسترسی خودتان را پایین بیاورید.' });
        }
        if (target.role === 'admin' && role !== 'admin') {
            const admins = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'").get().c;
            if (admins <= 1) {
                return res.status(400).json({ error: 'این تنها مدیر سایت است.' });
            }
        }

        // نکتهٔ مهم: پست‌ها و امتیاز کاربر دست نمی‌خورند. اگر بعداً دوباره
        // نویسنده شود، همهٔ سابقه و آمار قبلی‌اش سر جایش است.
        db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);

        const roleFa = { admin: 'مدیر', editor: 'نویسنده', user: 'کاربر عادی' }[role];
        db.prepare(`INSERT INTO notifications (user_id, title, body, icon)
                    VALUES (?, ?, ?, '🔄')`)
          .run(id, 'سطح دسترسی‌ات عوض شد', `الان سطح دسترسی تو «${roleFa}» است.`);

        writeAudit(req, 'user_role_change', 'user', id,
                   `${target.full_name}: ${target.role} → ${role}`);
        res.json({ message: `سطح دسترسی به «${roleFa}» تغییر کرد.` });
    } catch (err) {
        console.error('خطا در تغییر نقش:', err.message);
        res.status(500).json({ error: 'تغییر سطح دسترسی انجام نشد.' });
    }
});

// ── پروفایل کاربر ───────────────────────────────────────────────────

router.get('/profile', authMiddleware, (req, res) => {
    try {
        const user = db.prepare(`
            SELECT id, username, full_name, email, bio, avatar, role, points,
                   author_request_status, author_request_note, onboarded,
                   last_login_at, created_at
            FROM users WHERE id = ?
        `).get(req.user.id);
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'خواندن پروفایل ناموفق بود.' });
    }
});

router.put('/profile', authMiddleware, (req, res) => {
    try {
        const { full_name, email, bio } = req.body;
        const updates = {};

        if (full_name !== undefined) {
            const name = sanitizePlainText(full_name);
            if (name.length < 3) {
                return res.status(400).json({ error: 'نام باید حداقل ۳ کاراکتر باشد.' });
            }
            updates.full_name = name;
        }

        if (email !== undefined) {
            if (email === '' || email === null) {
                updates.email = null;
            } else {
                const clean = sanitizePlainText(email).toLowerCase();
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) {
                    return res.status(400).json({ error: 'ایمیل معتبر نیست.' });
                }
                const taken = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?')
                                .get(clean, req.user.id);
                if (taken) return res.status(400).json({ error: 'این ایمیل برای کاربر دیگری ثبت شده.' });
                updates.email = clean;
            }
        }

        if (bio !== undefined) {
            updates.bio = sanitizePlainText(bio).slice(0, 500);
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'چیزی برای تغییر نفرستادید.' });
        }

        const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        db.prepare(`UPDATE users SET ${fields} WHERE id = ?`)
          .run(...Object.values(updates), req.user.id);

        res.json({ message: 'پروفایلت به‌روز شد.' });
    } catch (err) {
        console.error('خطا در به‌روزرسانی پروفایل:', err.message);
        res.status(500).json({ error: 'به‌روزرسانی پروفایل انجام نشد.' });
    }
});

/** تغییر رمز عبور — نیازمند رمز فعلی. */
router.post('/profile/password', authMiddleware, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        if (!current_password || !new_password) {
            return res.status(400).json({ error: 'رمز فعلی و رمز جدید را وارد کنید.' });
        }

        const user = db.prepare('SELECT id, username, password FROM users WHERE id = ?')
                       .get(req.user.id);
        const matches = await bcrypt.compare(current_password, user.password);
        if (!matches) {
            return res.status(401).json({ error: 'رمز فعلی درست نیست.' });
        }

        const check = validatePassword(new_password, { username: user.username });
        if (!check.ok) return res.status(400).json({ error: check.error });

        if (await bcrypt.compare(new_password, user.password)) {
            return res.status(400).json({ error: 'رمز جدید با رمز فعلی یکی است.' });
        }

        const hashed = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
        db.prepare('UPDATE users SET password = ?, password_changed_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(hashed, req.user.id);

        writeAudit(req, 'password_change', 'user', req.user.id, 'تغییر رمز عبور');
        res.json({ message: 'رمز عبورت عوض شد.' });
    } catch (err) {
        console.error('خطا در تغییر رمز:', err.message);
        res.status(500).json({ error: 'تغییر رمز انجام نشد.' });
    }
});

/** درخواست ارتقا به نویسنده. */
router.post('/profile/request-author', authMiddleware, (req, res) => {
    try {
        if (req.user.role !== 'user') {
            return res.status(400).json({ error: 'شما از قبل دسترسی نویسندگی دارید.' });
        }
        const current = db.prepare('SELECT author_request_status FROM users WHERE id = ?')
                          .get(req.user.id);
        if (current.author_request_status === 'pending') {
            return res.status(400).json({ error: 'درخواست شما قبلاً ثبت شده و در حال بررسی است.' });
        }

        const note = sanitizePlainText(req.body.note || '').slice(0, 500);
        db.prepare(`UPDATE users SET author_request_status = 'pending',
                    author_request_note = ?, author_requested_at = CURRENT_TIMESTAMP
                    WHERE id = ?`).run(note, req.user.id);

        const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1").get();
        if (admin) {
            db.prepare(`INSERT INTO notifications (user_id, title, body, icon)
                        VALUES (?, ?, ?, '✍️')`)
              .run(admin.id, 'درخواست نویسندگی جدید',
                   `${req.user.full_name} می‌خواهد نویسنده شود.`);
        }

        res.json({ message: 'درخواستت ثبت شد. مدیر سایت بررسی می‌کند و خبرت می‌کنیم.' });
    } catch (err) {
        console.error('خطا در درخواست نویسندگی:', err.message);
        res.status(500).json({ error: 'ثبت درخواست انجام نشد.' });
    }
});

/**
 * آپلود عکس پروفایل.
 * محدودیت‌ها سخت‌گیرانه‌تر از آپلود عمومی است: فقط تصویر، حجم کم،
 * و بررسی «امضای واقعی فایل» نه فقط پسوند — چون پسوند به‌راحتی جعل می‌شود.
 */
const avatarUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const dir = path.join(__dirname, '..', 'uploads', 'avatars');
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            cb(null, dir);
        },
        filename: (req, file, cb) => {
            const ext = { 'image/jpeg': '.jpg', 'image/png': '.png',
                          'image/webp': '.webp' }[file.mimetype] || '.img';
            cb(null, `u${req.user.id}-${Date.now()}${ext}`);
        }
    }),
    limits: { fileSize: MAX_AVATAR_BYTES, files: 1 },
    fileFilter: (req, file, cb) => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
            return cb(new Error('فقط عکس JPG، PNG یا WebP قابل قبول است.'));
        }
        cb(null, true);
    }
});

/** امضای واقعی فایل تصویر را می‌سنجد (magic bytes). */
function looksLikeImage(filePath) {
    let fd;
    try {
        const buf = Buffer.alloc(12);
        fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, buf, 0, 12, 0);
        const isJpg = buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
        const isPng = buf.slice(0, 8).equals(Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]));
        const isWebp = buf.slice(0, 4).toString('ascii') === 'RIFF'
                    && buf.slice(8, 12).toString('ascii') === 'WEBP';
        return isJpg || isPng || isWebp;
    } catch (e) {
        return false;
    } finally {
        if (fd !== undefined) try { fs.closeSync(fd); } catch (e) {}
    }
}

router.post('/profile/avatar', authMiddleware, (req, res) => {
    avatarUpload.single('avatar')(req, res, (uploadErr) => {
        if (uploadErr) {
            const tooBig = uploadErr.code === 'LIMIT_FILE_SIZE';
            return res.status(400).json({
                error: tooBig
                    ? `حجم عکس نباید بیشتر از ${Math.round(MAX_AVATAR_BYTES / 1024 / 1024)} مگابایت باشد.`
                    : (uploadErr.message || 'آپلود عکس انجام نشد.')
            });
        }
        if (!req.file) return res.status(400).json({ error: 'عکسی انتخاب نشده.' });

        // پسوند و MIME را کلاینت می‌فرستد و قابل جعل است؛ محتوای واقعی
        // فایل باید بررسی شود تا کسی اسکریپت را به اسم عکس آپلود نکند.
        if (!looksLikeImage(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch (e) {}
            try {
                db.prepare(`INSERT INTO security_events
                    (user_id, event_type, severity, detail, ip)
                    VALUES (?, 'bad_upload', 'high', ?, ?)`)
                  .run(req.user.id,
                       `فایلی با نام ${req.file.originalname} به‌عنوان عکس آپلود شد ولی تصویر نبود.`,
                       clientIp(req));
            } catch (e) {}
            return res.status(400).json({ error: 'این فایل عکس معتبری نیست.' });
        }

        try {
            const url = `/uploads/avatars/${req.file.filename}`;

            // عکس قبلی پاک شود تا دیسک پر نشود
            const previous = db.prepare('SELECT avatar FROM users WHERE id = ?').get(req.user.id);
            if (previous && previous.avatar && previous.avatar.startsWith('/uploads/avatars/')) {
                const oldPath = path.join(__dirname, '..', previous.avatar.replace(/^\//, ''));
                if (fs.existsSync(oldPath)) { try { fs.unlinkSync(oldPath); } catch (e) {} }
            }

            db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(url, req.user.id);
            db.prepare(`INSERT INTO uploaded_files
                        (original_name, stored_name, file_type, file_size, uploaded_by)
                        VALUES (?, ?, ?, ?, ?)`)
              .run(req.file.originalname, 'avatars/' + req.file.filename,
                   req.file.mimetype, req.file.size, req.user.id);

            res.json({ url, message: 'عکس پروفایلت عوض شد.' });
        } catch (err) {
            console.error('خطا در ذخیرهٔ آواتار:', err.message);
            res.status(500).json({ error: 'ذخیرهٔ عکس انجام نشد.' });
        }
    });
});

/** فهرست درخواست‌های نویسندگی — برای مدیر. */
router.get('/author-requests', authMiddleware, requireAdmin, (req, res) => {
    try {
        const requests = db.prepare(`
            SELECT id, username, full_name, email, bio, avatar,
                   author_request_note, author_requested_at
            FROM users WHERE author_request_status = 'pending'
            ORDER BY author_requested_at ASC
        `).all();
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: 'خواندن درخواست‌ها ناموفق بود.' });
    }
});

/** تأیید یا رد درخواست نویسندگی. */
router.post('/author-requests/:id', authMiddleware, requireAdmin, (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const approve = req.body.decision === 'approve';
        const note = sanitizePlainText(req.body.note || '');

        const target = db.prepare(
            'SELECT id, full_name, author_request_status FROM users WHERE id = ?'
        ).get(id);
        if (!target) return res.status(404).json({ error: 'کاربر پیدا نشد.' });
        if (target.author_request_status !== 'pending') {
            return res.status(400).json({ error: 'این درخواست قبلاً بررسی شده است.' });
        }

        if (approve) {
            db.prepare(`UPDATE users SET role = 'editor', author_request_status = 'approved'
                        WHERE id = ?`).run(id);
            db.prepare(`INSERT INTO notifications (user_id, title, body, icon)
                        VALUES (?, ?, ?, '🎉')`)
              .run(id, 'تبریک! نویسنده شدی 🎉',
                   'از این به بعد می‌تونی پست بنویسی و برای تأیید بفرستی. اولین پستت رو بنویس!');
        } else {
            db.prepare(`UPDATE users SET author_request_status = 'rejected' WHERE id = ?`).run(id);
            db.prepare(`INSERT INTO notifications (user_id, title, body, icon)
                        VALUES (?, ?, ?, '📋')`)
              .run(id, 'درخواست نویسندگی',
                   note || 'فعلاً با درخواستت موافقت نشد. می‌تونی بعداً دوباره تلاش کنی.');
        }

        writeAudit(req, approve ? 'author_approve' : 'author_reject', 'user', id, target.full_name);
        res.json({ message: approve ? 'کاربر نویسنده شد.' : 'درخواست رد شد.' });
    } catch (err) {
        console.error('خطا در بررسی درخواست نویسندگی:', err.message);
        res.status(500).json({ error: 'بررسی درخواست انجام نشد.' });
    }
});

// Categories
router.get('/categories', optionalAuth, (req, res) => {
    try {
        const vis = visibilityFilter(req.user);
        const categories = db.prepare(`
            SELECT c.*, COUNT(o.id) as operation_count
            FROM categories c
            LEFT JOIN operations o ON c.id = o.category_id AND ${vis.sql}
            GROUP BY c.id
            ORDER BY c.sort_order
        `).all(...vis.params);
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/categories/:key', optionalAuth, (req, res) => {
    try {
        const category = db.prepare('SELECT * FROM categories WHERE key = ?').get(req.params.key);
        if (!category) return res.status(404).json({ error: 'دسته‌بندی یافت نشد' });

        const vis = visibilityFilter(req.user);
        const operations = db.prepare(`
            SELECT o.*, oc.description, oc.instruments, oc.video_url_1, oc.video_url_2,
                   oc.video_title_1, oc.video_title_2, oc.slides_url, oc.slides_title,
                   oc.description_images, oc.instruments_images,
                   u.full_name AS author_name
            FROM operations o
            LEFT JOIN operation_content oc ON o.id = oc.operation_id
            LEFT JOIN users u ON o.author_id = u.id
            WHERE o.category_id = ? AND ${vis.sql}
            ORDER BY o.sort_order
        `).all(category.id, ...vis.params);

        res.json({ ...category, operations });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/categories/:id', authMiddleware, requireAdmin, (req, res) => {
    try {
        const { name_fa, name_en, icon, color, sort_order } = req.body;
        db.prepare(`
            UPDATE categories SET name_fa = COALESCE(?, name_fa), name_en = COALESCE(?, name_en),
            icon = COALESCE(?, icon), color = COALESCE(?, color), sort_order = COALESCE(?, sort_order)
            WHERE id = ?
        `).run(name_fa, name_en, icon, color, sort_order, req.params.id);
        res.json({ message: 'دسته‌بندی بروزرسانی شد' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/categories/:id', authMiddleware, requireAdmin, (req, res) => {
    try {
        db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
        res.json({ message: 'دسته‌بندی حذف شد' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Operations
router.get('/operations', optionalAuth, (req, res) => {
    try {
        const { search, category, mine, status } = req.query;
        const vis = visibilityFilter(req.user);

        let query = `
            SELECT o.*, c.name_fa as category_name_fa, c.name_en as category_name_en,
                   c.key as category_key, c.icon as category_icon, c.color as category_color,
                   oc.description, oc.instruments, oc.video_url_1, oc.video_url_2,
                   oc.video_title_1, oc.video_title_2, oc.slides_url, oc.slides_title,
                   oc.description_images, oc.instruments_images,
                   u.full_name AS author_name
            FROM operations o
            JOIN categories c ON o.category_id = c.id
            LEFT JOIN operation_content oc ON o.id = oc.operation_id
            LEFT JOIN users u ON o.author_id = u.id
        `;
        const params = [...vis.params];
        const conditions = [vis.sql];

        if (search) {
            conditions.push('(o.name LIKE ? OR o.op_number LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }
        if (category) {
            conditions.push('c.key = ?');
            params.push(category);
        }
        // فیلترهای پنل: پست‌های خودم / وضعیت مشخص (فقط برای واردشده‌ها)
        if (mine === '1' && req.user) {
            conditions.push('o.author_id = ?');
            params.push(req.user.id);
        }
        if (status && req.user) {
            conditions.push('o.status = ?');
            params.push(status);
        }

        query += ' WHERE ' + conditions.join(' AND ');
        query += ' ORDER BY c.sort_order, o.sort_order';

        const operations = db.prepare(query).all(...params);
        res.json(operations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/operations/:id', optionalAuth, (req, res) => {
    try {
        const vis = visibilityFilter(req.user);
        const operation = db.prepare(`
            SELECT o.*, c.name_fa as category_name_fa, c.name_en as category_name_en,
                   c.key as category_key, c.icon as category_icon, c.color as category_color,
                   oc.description, oc.instruments, oc.video_url_1, oc.video_url_2,
                   oc.video_title_1, oc.video_title_2, oc.slides_url, oc.slides_title,
                   oc.description_images, oc.instruments_images,
                   u.full_name AS author_name
            FROM operations o
            JOIN categories c ON o.category_id = c.id
            LEFT JOIN operation_content oc ON o.id = oc.operation_id
            LEFT JOIN users u ON o.author_id = u.id
            WHERE o.id = ? AND ${vis.sql}
        `).get(req.params.id, ...vis.params);

        if (!operation) return res.status(404).json({ error: 'عمل یافت نشد' });
        res.json(operation);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/operations', authMiddleware, requireAuthor, (req, res) => {
    try {
        const { category_id, op_number, name, sort_order } = req.body;
        if (!category_id || !name) {
            return res.status(400).json({ error: 'دسته‌بندی و نام عمل الزامی است.' });
        }

        // پست جدید به نام سازنده‌اش ثبت می‌شود.
        // مدیر مستقیم منتشر می‌کند؛ نویسنده پیش‌نویس می‌سازد که باید
        // بعداً برای تأیید بفرستد.
        const isAdmin = req.user.role === 'admin';
        const status = isAdmin ? 'approved' : 'draft';

        // آدرس خوانا برای سئو و اشتراک‌گذاری — بدون این، لینک پست فقط
        // شناسهٔ عددی می‌شود که نه برای کاربر معنا دارد نه برای گوگل.
        const cleanName = sanitizePlainText(name);
        const cleanNumber = sanitizePlainText(op_number);
        const taken = new Set(
            db.prepare('SELECT slug FROM operations WHERE slug IS NOT NULL')
              .all().map(r => r.slug)
        );

        const result = db.prepare(`
            INSERT INTO operations (category_id, op_number, name, sort_order,
                                    author_id, status, is_locked, published_at, slug)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(category_id, cleanNumber, cleanName,
               sort_order || 0, req.user.id, status, 0,
               isAdmin ? new Date().toISOString() : null,
               uniqueSlug(cleanName, cleanNumber, taken));

        db.prepare(`INSERT INTO operation_content (operation_id) VALUES (?)`).run(result.lastInsertRowid);

        res.json({ id: result.lastInsertRowid, message: 'عمل اضافه شد' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/operations/:id', authMiddleware, requireAuthor, (req, res) => {
    try {
        const access = checkOperationAccess(db, req.user, req.params.id);
        if (!access.ok) {
            return res.status(access.status).json({ error: access.error });
        }

        const { op_number, name, sort_order } = req.body;
        db.prepare(`
            UPDATE operations SET op_number = COALESCE(?, op_number), name = COALESCE(?, name),
            sort_order = COALESCE(?, sort_order), updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(
            op_number === undefined ? null : sanitizePlainText(op_number),
            name === undefined ? null : sanitizePlainText(name),
            nz(sort_order), req.params.id
        );
        res.json({ message: 'عمل بروزرسانی شد' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/operations/:id', authMiddleware, requireAdmin, (req, res) => {
    try {
        db.prepare('DELETE FROM operations WHERE id = ?').run(req.params.id);
        res.json({ message: 'عمل حذف شد' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── گردش کار بررسی و تأیید ─────────────────────────────────────────

/**
 * ارسال پست برای بررسی — توسط نویسنده.
 * پیش‌نویس یا «نیازمند اصلاح» → «در انتظار تأیید».
 */
router.post('/operations/:id/submit', authMiddleware, requireAuthor, (req, res) => {
    try {
        const operation = db.prepare(
            'SELECT id, author_id, status, is_locked, name FROM operations WHERE id = ?'
        ).get(req.params.id);

        if (!operation) return res.status(404).json({ error: 'این عمل جراحی پیدا نشد.' });
        if (req.user.role !== 'admin' && operation.author_id !== req.user.id) {
            return res.status(403).json({ error: 'شما فقط پست‌های خودتان را می‌توانید بفرستید.' });
        }
        if (operation.is_locked === 1) {
            return res.status(423).json({ error: 'این پست قبلاً تأیید شده است.' });
        }
        if (operation.status === 'pending') {
            return res.status(400).json({ error: 'این پست همین الان هم در صف بررسی است.' });
        }

        db.prepare(`UPDATE operations SET status = 'pending',
                    submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?`).run(req.params.id);

        res.json({ message: 'پستت رفت توی صف بررسی! نتیجه رو بهت خبر می‌دیم. 🎉' });
    } catch (err) {
        console.error('خطا در ارسال برای بررسی:', err.message);
        res.status(500).json({ error: 'ارسال انجام نشد. دوباره تلاش کن.' });
    }
});

/**
 * تصمیم مدیر روی پست: تأیید / رد / درخواست اصلاح.
 * تأیید ⇒ انتشار + قفل شدن برای همیشه (حتی برای نویسنده).
 */
router.post('/operations/:id/review', authMiddleware, requireAdmin, (req, res) => {
    try {
        const { decision, comment } = req.body;

        const valid = { approve: 'approved', reject: 'rejected', changes: 'changes_requested' };
        if (!valid[decision]) {
            return res.status(400).json({
                error: 'تصمیم باید یکی از این‌ها باشد: approve، reject، changes'
            });
        }

        const operation = db.prepare(
            'SELECT id, author_id, status, name FROM operations WHERE id = ?'
        ).get(req.params.id);
        if (!operation) return res.status(404).json({ error: 'این عمل جراحی پیدا نشد.' });

        const newStatus = valid[decision];
        const isApprove = decision === 'approve';
        const wasApproved = operation.status === 'approved';

        db.prepare(`UPDATE operations SET
                        status = ?,
                        is_locked = ?,
                        reviewed_by = ?,
                        reviewed_at = CURRENT_TIMESTAMP,
                        published_at = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE published_at END,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?`)
          .run(newStatus, isApprove ? 1 : 0, req.user.id, isApprove ? 1 : 0, req.params.id);

        // امتیاز تشویقی: ۱۰ امتیاز برای هر تأیید تازه. اگر پستی که قبلاً
        // تأیید شده بود حالا رد/اصلاح شود، امتیازش پس گرفته می‌شود تا
        // آمار جدول رتبه‌بندی درست بماند. امتیاز هرگز منفی نمی‌شود.
        if (operation.author_id) {
            if (isApprove && !wasApproved) {
                db.prepare('UPDATE users SET points = points + 10 WHERE id = ?')
                  .run(operation.author_id);
            } else if (!isApprove && wasApproved) {
                db.prepare('UPDATE users SET points = MAX(0, points - 10) WHERE id = ?')
                  .run(operation.author_id);
            }
        }

        // کامنت بررسی (اختیاری) — گفتگوی ادمین و نویسنده روی پست
        if (comment && String(comment).trim()) {
            db.prepare(`INSERT INTO post_comments (operation_id, user_id, body, kind)
                        VALUES (?, ?, ?, 'review')`)
              .run(req.params.id, req.user.id, sanitizePlainText(comment).slice(0, 2000));
        }

        // اعلان برای نویسنده
        if (operation.author_id) {
            const messages = {
                approved: { title: 'پستت تأیید شد! 🎉',
                            body: `«${operation.name}» منتشر شد. دمت گرم!`, icon: '✅' },
                rejected: { title: 'پستت رد شد 😔',
                            body: `«${operation.name}» تأیید نشد. نظر مدیر رو ببین.`, icon: '❌' },
                changes_requested: { title: 'پستت اصلاح می‌خواد ✏️',
                            body: `«${operation.name}» چند تا تغییر لازم داره. نظر مدیر رو ببین.`, icon: '📝' }
            };
            const msg = messages[newStatus];
            db.prepare(`INSERT INTO notifications (user_id, title, body, icon, link)
                        VALUES (?, ?, ?, ?, ?)`)
              .run(operation.author_id, msg.title, msg.body, msg.icon,
                   '/dashboard/posts/' + operation.id);
        }

        // ثبت در لاگ ممیزی
        db.prepare(`INSERT INTO audit_log (user_id, action, target_type, target_id, detail, ip)
                    VALUES (?, ?, 'operation', ?, ?, ?)`)
          .run(req.user.id, 'review_' + decision, req.params.id,
               `«${operation.name}» → ${newStatus}`, req.ip || '');

        const doneMessages = {
            approved: 'پست تأیید و منتشر شد. از این به بعد قفل است.',
            rejected: 'پست رد شد و به نویسنده خبر داده شد.',
            changes_requested: 'درخواست اصلاح ثبت شد و به نویسنده خبر داده شد.'
        };
        res.json({ message: doneMessages[newStatus] });
    } catch (err) {
        console.error('خطا در بررسی پست:', err.message);
        res.status(500).json({ error: 'ثبت تصمیم انجام نشد. دوباره تلاش کنید.' });
    }
});

/**
 * باز کردن قفل پست تأییدشده — فقط مدیر، برای اصلاح‌های ضروری.
 * پست از حالت انتشار خارج نمی‌شود؛ فقط دوباره قابل ویرایش می‌شود.
 */
router.post('/operations/:id/unlock', authMiddleware, requireAdmin, (req, res) => {
    try {
        const operation = db.prepare(
            'SELECT id, name, is_locked FROM operations WHERE id = ?'
        ).get(req.params.id);
        if (!operation) return res.status(404).json({ error: 'این عمل جراحی پیدا نشد.' });
        if (operation.is_locked !== 1) {
            return res.status(400).json({ error: 'این پست قفل نیست.' });
        }

        db.prepare(`UPDATE operations SET is_locked = 0, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?`).run(req.params.id);

        db.prepare(`INSERT INTO audit_log (user_id, action, target_type, target_id, detail, ip)
                    VALUES (?, 'unlock', 'operation', ?, ?, ?)`)
          .run(req.user.id, req.params.id, `باز کردن قفل «${operation.name}»`, req.ip || '');

        res.json({ message: 'قفل باز شد. یادتان باشد بعد از اصلاح دوباره تأییدش کنید.' });
    } catch (err) {
        console.error('خطا در باز کردن قفل:', err.message);
        res.status(500).json({ error: 'باز کردن قفل انجام نشد.' });
    }
});

/** صف انتظار تأیید — برای پنل مدیر. */
router.get('/review-queue', authMiddleware, requireAdmin, (req, res) => {
    try {
        const queue = db.prepare(`
            SELECT o.id, o.name, o.op_number, o.status, o.submitted_at,
                   c.name_fa AS category_name, c.icon AS category_icon,
                   u.full_name AS author_name, u.username AS author_username
            FROM operations o
            JOIN categories c ON o.category_id = c.id
            LEFT JOIN users u ON o.author_id = u.id
            WHERE o.status = 'pending'
            ORDER BY o.submitted_at ASC
        `).all();
        res.json(queue);
    } catch (err) {
        res.status(500).json({ error: 'خواندن صف بررسی ناموفق بود.' });
    }
});

/** کامنت‌های بررسی یک پست — مدیر یا نویسندهٔ همان پست. */
router.get('/operations/:id/comments', authMiddleware, (req, res) => {
    try {
        const operation = db.prepare(
            'SELECT id, author_id FROM operations WHERE id = ?'
        ).get(req.params.id);
        if (!operation) return res.status(404).json({ error: 'این عمل جراحی پیدا نشد.' });

        if (req.user.role !== 'admin' && operation.author_id !== req.user.id) {
            return res.status(403).json({ error: 'گفتگوی این پست به شما مربوط نیست.' });
        }

        const comments = db.prepare(`
            SELECT pc.id, pc.body, pc.kind, pc.created_at,
                   u.full_name AS user_name, u.role AS user_role
            FROM post_comments pc
            JOIN users u ON pc.user_id = u.id
            WHERE pc.operation_id = ?
            ORDER BY pc.created_at ASC
        `).all(req.params.id);
        res.json(comments);
    } catch (err) {
        res.status(500).json({ error: 'خواندن گفتگو ناموفق بود.' });
    }
});

/** پاسخ روی گفتگوی پست — نویسندهٔ همان پست یا مدیر. */
router.post('/operations/:id/comments', authMiddleware, (req, res) => {
    try {
        const operation = db.prepare(
            'SELECT id, author_id, name FROM operations WHERE id = ?'
        ).get(req.params.id);
        if (!operation) return res.status(404).json({ error: 'این عمل جراحی پیدا نشد.' });

        const isAdmin = req.user.role === 'admin';
        if (!isAdmin && operation.author_id !== req.user.id) {
            return res.status(403).json({ error: 'گفتگوی این پست به شما مربوط نیست.' });
        }

        const body = sanitizePlainText(req.body.body || '').slice(0, 2000);
        if (!body) return res.status(400).json({ error: 'متن پیام خالی است.' });

        db.prepare(`INSERT INTO post_comments (operation_id, user_id, body, kind)
                    VALUES (?, ?, ?, ?)`)
          .run(req.params.id, req.user.id, body, isAdmin ? 'review' : 'reply');

        // طرف مقابل گفتگو خبردار شود
        const targetUserId = isAdmin
            ? operation.author_id
            : db.prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1").get()?.id;
        if (targetUserId) {
            db.prepare(`INSERT INTO notifications (user_id, title, body, icon, link)
                        VALUES (?, ?, ?, '💬', ?)`)
              .run(targetUserId,
                   'پیام جدید روی پست',
                   `«${operation.name}»: ${body.slice(0, 80)}`,
                   '/dashboard/posts/' + operation.id);
        }

        res.json({ message: 'پیامت ثبت شد.' });
    } catch (err) {
        console.error('خطا در ثبت کامنت:', err.message);
        res.status(500).json({ error: 'ثبت پیام انجام نشد.' });
    }
});

// ── اعلان‌ها ────────────────────────────────────────────────────────

/** اعلان‌های خود کاربر — جدیدترین اول. */
router.get('/notifications', authMiddleware, (req, res) => {
    try {
        const notifications = db.prepare(`
            SELECT id, title, body, icon, link, is_read, created_at
            FROM notifications WHERE user_id = ?
            ORDER BY created_at DESC LIMIT 50
        `).all(req.user.id);
        const unread = db.prepare(
            'SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0'
        ).get(req.user.id).c;
        res.json({ notifications, unread });
    } catch (err) {
        res.status(500).json({ error: 'خواندن اعلان‌ها ناموفق بود.' });
    }
});

/** همهٔ اعلان‌های کاربر خوانده‌شده علامت می‌خورند. */
router.post('/notifications/read-all', authMiddleware, (req, res) => {
    try {
        db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
        res.json({ message: 'همه خوانده شد.' });
    } catch (err) {
        res.status(500).json({ error: 'به‌روزرسانی اعلان‌ها ناموفق بود.' });
    }
});

// ── علاقه‌مندی و نشان کردن ──────────────────────────────────────────

/** افزودن یا برداشتن علاقه‌مندی/نشان (toggle). */
router.post('/operations/:id/:kind(favorite|bookmark)', authMiddleware, (req, res) => {
    try {
        const kind = req.params.kind;
        const opId = parseInt(req.params.id, 10);

        const operation = db.prepare('SELECT id FROM operations WHERE id = ?').get(opId);
        if (!operation) return res.status(404).json({ error: 'این عمل جراحی پیدا نشد.' });

        const existing = db.prepare(
            'SELECT id FROM user_items WHERE user_id = ? AND operation_id = ? AND kind = ?'
        ).get(req.user.id, opId, kind);

        if (existing) {
            db.prepare('DELETE FROM user_items WHERE id = ?').run(existing.id);
            return res.json({
                active: false,
                message: kind === 'favorite' ? 'از علاقه‌مندی‌ها برداشته شد.' : 'نشان برداشته شد.'
            });
        }

        db.prepare(
            'INSERT INTO user_items (user_id, operation_id, kind) VALUES (?, ?, ?)'
        ).run(req.user.id, opId, kind);

        res.json({
            active: true,
            message: kind === 'favorite' ? 'به علاقه‌مندی‌ها اضافه شد ❤️' : 'نشان شد 🔖'
        });
    } catch (err) {
        console.error('خطا در علاقه‌مندی:', err.message);
        res.status(500).json({ error: 'انجام نشد. دوباره تلاش کنید.' });
    }
});

/** فهرست علاقه‌مندی‌ها و نشان‌های خود کاربر. */
router.get('/my-items', authMiddleware, (req, res) => {
    try {
        const kind = req.query.kind;
        const params = [req.user.id];
        let where = 'ui.user_id = ?';
        if (kind === 'favorite' || kind === 'bookmark') {
            where += ' AND ui.kind = ?';
            params.push(kind);
        }

        const items = db.prepare(`
            SELECT ui.kind, ui.created_at,
                   o.id, o.name, o.op_number, o.slug,
                   c.name_fa AS category_name, c.icon AS category_icon, c.color AS category_color
            FROM user_items ui
            JOIN operations o ON ui.operation_id = o.id
            JOIN categories c ON o.category_id = c.id
            WHERE ${where} AND o.status = 'approved'
            ORDER BY ui.created_at DESC
        `).all(...params);

        res.json(items);
    } catch (err) {
        console.error('خطا در خواندن علاقه‌مندی‌ها:', err.message);
        res.status(500).json({ error: 'خواندن فهرست ناموفق بود.' });
    }
});

/** شناسه‌های علاقه‌مندی/نشان کاربر — برای رنگی کردن دکمه‌ها در فهرست. */
router.get('/my-item-ids', authMiddleware, (req, res) => {
    try {
        const rows = db.prepare(
            'SELECT operation_id, kind FROM user_items WHERE user_id = ?'
        ).all(req.user.id);
        res.json({
            favorites: rows.filter(r => r.kind === 'favorite').map(r => r.operation_id),
            bookmarks: rows.filter(r => r.kind === 'bookmark').map(r => r.operation_id)
        });
    } catch (err) {
        res.json({ favorites: [], bookmarks: [] });
    }
});

// ── اشتراک‌گذاری ────────────────────────────────────────────────────

/** کانال‌های مجاز اشتراک‌گذاری — ورودی دلخواه پذیرفته نمی‌شود. */
const SHARE_CHANNELS = ['telegram', 'whatsapp', 'eitaa', 'bale', 'rubika',
                        'twitter', 'linkedin', 'email', 'copy', 'native'];

/** ثبت یک اشتراک‌گذاری برای گزارش‌گیری. مهمان هم می‌تواند. */
router.post('/operations/:id/share', optionalAuth, (req, res) => {
    try {
        const channel = String(req.body.channel || '').toLowerCase();
        if (!SHARE_CHANNELS.includes(channel)) {
            return res.status(400).json({ error: 'کانال اشتراک‌گذاری نامعتبر است.' });
        }
        const opId = parseInt(req.params.id, 10);
        const operation = db.prepare('SELECT id FROM operations WHERE id = ?').get(opId);
        if (!operation) return res.status(404).json({ error: 'این عمل جراحی پیدا نشد.' });

        db.prepare('INSERT INTO shares (operation_id, user_id, channel) VALUES (?, ?, ?)')
          .run(opId, req.user ? req.user.id : null, channel);

        res.json({ ok: true });
    } catch (err) {
        // شکست ثبت آمار نباید تجربهٔ کاربر را خراب کند
        res.json({ ok: false });
    }
});

/**
 * جدول رتبه‌بندی نویسندگان بر اساس تعداد پست تأییدشده.
 * عمومی است (بدون احراز هویت) تا رقابت دیده شود، اما فقط نام و آمار
 * غیرحساس برگردانده می‌شود — نه ایمیل و نه نام کاربری.
 */
router.get('/leaderboard', optionalAuth, (req, res) => {
    try {
        const rows = db.prepare(`
            SELECT u.id, u.full_name, u.avatar, u.points,
                   COUNT(o.id) AS approved_count
            FROM users u
            JOIN operations o ON o.author_id = u.id AND o.status = 'approved'
            WHERE u.role = 'editor' AND u.is_active = 1
            GROUP BY u.id
            HAVING approved_count > 0
            ORDER BY approved_count DESC, u.points DESC
            LIMIT 20
        `).all();

        const levelOf = (n) => n >= 30 ? { name: 'الماسی', icon: '💎' }
            : n >= 15 ? { name: 'طلایی', icon: '🥇' }
            : n >= 5  ? { name: 'نقره‌ای', icon: '🥈' }
            : n >= 1  ? { name: 'برنزی', icon: '🥉' }
            : { name: 'تازه‌کار', icon: '🌱' };

        const board = rows.map((r, i) => ({
            rank: i + 1,
            full_name: r.full_name,
            avatar: r.avatar || '',
            approved_count: r.approved_count,
            level: levelOf(r.approved_count),
            // آیا این ردیف، خود کاربر درخواست‌دهنده است؟
            isMe: req.user ? r.id === req.user.id : false
        }));

        // اگر کاربر واردشده نویسنده است ولی جزو ۲۰ نفر اول نیست، رتبهٔ خودش را هم بده
        let myRank = null;
        if (req.user && req.user.role === 'editor' && !board.some(b => b.isMe)) {
            const all = db.prepare(`
                SELECT u.id, COUNT(o.id) AS c
                FROM users u
                JOIN operations o ON o.author_id = u.id AND o.status = 'approved'
                WHERE u.role = 'editor' AND u.is_active = 1
                GROUP BY u.id HAVING c > 0
                ORDER BY c DESC
            `).all();
            const idx = all.findIndex(x => x.id === req.user.id);
            if (idx >= 0) myRank = { rank: idx + 1, approved_count: all[idx].c };
        }

        res.json({ board, myRank });
    } catch (err) {
        console.error('خطا در رتبه‌بندی:', err.message);
        res.status(500).json({ error: 'خواندن جدول رتبه‌بندی ناموفق بود.' });
    }
});

// ── آمار داشبورد ────────────────────────────────────────────────────

/**
 * آمار داشبورد بر اساس نقش.
 * مدیر: کل سیستم + صف بررسی + رویدادهای امنیتی باز.
 * نویسنده: فقط آمار پست‌های خودش.
 */
router.get('/dashboard-stats', authMiddleware, (req, res) => {
    try {
        if (req.user.role === 'admin') {
            const byStatus = db.prepare(`
                SELECT status, COUNT(*) AS c FROM operations GROUP BY status
            `).all();
            const stats = db.prepare(`
                SELECT
                    (SELECT COUNT(*) FROM categories) AS categories,
                    (SELECT COUNT(*) FROM operations) AS operations,
                    (SELECT COUNT(*) FROM operation_content
                     WHERE description IS NOT NULL AND description != '') AS with_content,
                    (SELECT COUNT(*) FROM users) AS users,
                    (SELECT COUNT(*) FROM users WHERE role = 'editor') AS authors,
                    (SELECT COUNT(*) FROM operations WHERE status = 'pending') AS pending,
                    (SELECT COUNT(*) FROM security_events WHERE resolved = 0) AS open_security_events,
                    (SELECT COUNT(*) FROM users
                     WHERE author_request_status = 'pending') AS author_requests
            `).get();
            const perCategory = db.prepare(`
                SELECT c.name_fa AS name, c.icon, c.color, COUNT(o.id) AS count
                FROM categories c
                LEFT JOIN operations o ON o.category_id = c.id
                GROUP BY c.id ORDER BY c.sort_order
            `).all();
            const recent = db.prepare(`
                SELECT a.action, a.detail, a.created_at, u.full_name AS user_name
                FROM audit_log a LEFT JOIN users u ON a.user_id = u.id
                ORDER BY a.created_at DESC LIMIT 10
            `).all();
            return res.json({ role: 'admin', stats, byStatus, perCategory, recent });
        }

        // نویسنده: آمار خودش
        const mine = db.prepare(`
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
                SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS drafts,
                SUM(CASE WHEN status = 'changes_requested' THEN 1 ELSE 0 END) AS needs_changes,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
                COALESCE(SUM(view_count), 0) AS views
            FROM operations WHERE author_id = ?
        `).get(req.user.id);
        res.json({ role: req.user.role, stats: mine });
    } catch (err) {
        console.error('خطا در آمار داشبورد:', err.message);
        res.status(500).json({ error: 'خواندن آمار ناموفق بود.' });
    }
});

// Content
router.put('/operations/:id/content', authMiddleware, requireAuthor, (req, res) => {
    try {
        let { description, instruments, video_url_1, video_url_2, video_title_1, video_title_2,
              slides_url, slides_title, description_images, instruments_images } = req.body;

        // مالکیت و قفل بودن پست بررسی می‌شود: نویسنده فقط پست خودش،
        // و پست تأییدشده برای هیچ‌کس قابل ویرایش نیست.
        const access = checkOperationAccess(db, req.user, req.params.id);
        if (!access.ok) {
            return res.status(access.status).json({ error: access.error });
        }

        // ── پاک‌سازی و اعتبارسنجی ورودی ─────────────────────────────
        // محتوای ویرایشگر HTML است و بدون پاک‌سازی یک مسیر مستقیم XSS
        // می‌شود: هر نویسنده می‌تواند اسکریپت تزریق کند که در مرورگر
        // بازدیدکنندگان و ادمین اجرا شود.

        // اول: گزارش تلاش حمله به ادمین (ورودی خام بررسی می‌شود)
        const threats = detectThreats({
            description, instruments, video_title_1, video_title_2, slides_title
        });
        if (threats.length > 0) {
            try {
                db.prepare(`INSERT INTO security_events
                    (user_id, event_type, severity, detail, payload, ip)
                    VALUES (?, ?, ?, ?, ?, ?)`
                ).run(
                    req.user.id,
                    threats[0].type,
                    worstSeverity(threats),
                    'الگوی مشکوک در محتوای عمل ' + req.params.id + ': ' +
                        threats.map(t => t.label).join('، '),
                    threats.map(t => t.sample).join(' | ').slice(0, 500),
                    req.ip || ''
                );
            } catch (logErr) {
                console.error('ثبت رویداد امنیتی ناموفق:', logErr.message);
            }
        }

        // دوم: پاک‌سازی. محتوای غنی با allowlist، عنوان‌ها به متن ساده.
        if (description !== undefined && description !== null) {
            description = sanitizeRichText(description);
        }
        if (instruments !== undefined && instruments !== null) {
            instruments = sanitizeRichText(instruments);
        }
        for (const key of ['video_title_1', 'video_title_2', 'slides_title']) {
            if (req.body[key] !== undefined && req.body[key] !== null) {
                const clean = sanitizePlainText(req.body[key]);
                if (key === 'video_title_1') video_title_1 = clean;
                if (key === 'video_title_2') video_title_2 = clean;
                if (key === 'slides_title') slides_title = clean;
            }
        }

        // سوم: لینک ویدیو فقط از دامنه‌های مجاز
        for (const [key, value] of [['video_url_1', video_url_1], ['video_url_2', video_url_2]]) {
            if (value === undefined || value === null) continue;
            const check = validateVideoUrl(value);
            if (!check.ok) {
                return res.status(400).json({ error: check.error });
            }
            if (key === 'video_url_1') video_url_1 = check.url;
            else video_url_2 = check.url;
        }

        const existing = db.prepare('SELECT id FROM operation_content WHERE operation_id = ?').get(req.params.id);

        if (existing) {
            // مهم: درایور sql.js نمی‌تواند undefined را bind کند و خطای بدون
            // پیام پرتاب می‌کند. nz() فیلدهای نیامده را null می‌کند تا
            // COALESCE مقدار قبلی را نگه دارد.
            db.prepare(`
                UPDATE operation_content SET
                    description = COALESCE(?, description),
                    instruments = COALESCE(?, instruments),
                    video_url_1 = COALESCE(?, video_url_1),
                    video_url_2 = COALESCE(?, video_url_2),
                    video_title_1 = COALESCE(?, video_title_1),
                    video_title_2 = COALESCE(?, video_title_2),
                    slides_url = COALESCE(?, slides_url),
                    slides_title = COALESCE(?, slides_title),
                    description_images = COALESCE(?, description_images),
                    instruments_images = COALESCE(?, instruments_images),
                    updated_at = CURRENT_TIMESTAMP
                WHERE operation_id = ?
            `).run(nz(description), nz(instruments), nz(video_url_1), nz(video_url_2),
                   nz(video_title_1), nz(video_title_2), nz(slides_url), nz(slides_title),
                   nz(description_images), nz(instruments_images), req.params.id);
        } else {
            db.prepare(`
                INSERT INTO operation_content (operation_id, description, instruments, video_url_1, video_url_2,
                    video_title_1, video_title_2, slides_url, slides_title, description_images, instruments_images)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(req.params.id, description || '', instruments || '', video_url_1 || '', video_url_2 || '',
                   video_title_1 || '', video_title_2 || '', slides_url || '', slides_title || '',
                   description_images || '[]', instruments_images || '[]');
        }

        res.json({ message: 'محتوا ذخیره شد' });
    } catch (err) {
        // خطا حتماً سمت سرور لاگ شود؛ قبلاً بی‌صدا بلعیده می‌شد و
        // عیب‌یابی را غیرممکن می‌کرد. به کاربر پیام کلی داده می‌شود تا
        // جزئیات داخلی سیستم فاش نشود.
        console.error('خطا در ذخیرهٔ محتوا:', err && (err.stack || err.message || err));
        res.status(500).json({ error: 'ذخیرهٔ محتوا انجام نشد. لطفاً دوباره تلاش کنید.' });
    }
});

// Upload
router.post('/upload', authMiddleware, (req, res) => {
    // خطای multer (نوع نامجاز یا حجم زیاد) داخل همین‌جا مدیریت می‌شود تا
    // به‌جای خطای ۵۰۰ کلی، پیام فارسی روشن به کاربر برسد.
    upload.single('file')(req, res, (uploadErr) => {
        if (uploadErr) {
            const tooBig = uploadErr.code === 'LIMIT_FILE_SIZE';
            return res.status(400).json({
                error: tooBig
                    ? `حجم فایل نباید بیشتر از ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} مگابایت باشد.`
                    : (uploadErr.message || 'آپلود فایل انجام نشد.')
            });
        }
        try {
            if (!req.file) return res.status(400).json({ error: 'فایلی ارسال نشد.' });

            db.prepare(`
                INSERT INTO uploaded_files (original_name, stored_name, file_type, file_size, uploaded_by)
                VALUES (?, ?, ?, ?, ?)
            `).run(sanitizePlainText(req.file.originalname), req.file.filename,
                   req.file.mimetype, req.file.size, req.user.id);

            res.json({
                url: `/uploads/${req.file.filename}`,
                filename: req.file.originalname,
                message: 'فایل آپلود شد.'
            });
        } catch (err) {
            console.error('خطا در آپلود:', err.message);
            res.status(500).json({ error: 'ذخیرهٔ فایل انجام نشد.' });
        }
    });
});

router.get('/files', authMiddleware, (req, res) => {
    try {
        // نویسنده فقط فایل‌های خودش را می‌بیند؛ پیش از این فهرست کامل
        // آپلودهای همهٔ کاربران به هر کسی که وارد شده بود نشان داده می‌شد.
        const files = req.user.role === 'admin'
            ? db.prepare(`SELECT * FROM uploaded_files
                          ORDER BY created_at DESC LIMIT 100`).all()
            : db.prepare(`SELECT * FROM uploaded_files WHERE uploaded_by = ?
                          ORDER BY created_at DESC LIMIT 100`).all(req.user.id);
        res.json(files);
    } catch (err) {
        console.error('خطا در خواندن فایل‌ها:', err.message);
        res.status(500).json({ error: 'خواندن فهرست فایل‌ها ناموفق بود.' });
    }
});

router.delete('/files/:id', authMiddleware, requireAdmin, (req, res) => {
    try {
        const file = db.prepare('SELECT stored_name FROM uploaded_files WHERE id = ?').get(req.params.id);
        if (file) {
            const filePath = path.join(__dirname, '..', 'uploads', file.stored_name);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        db.prepare('DELETE FROM uploaded_files WHERE id = ?').run(req.params.id);
        res.json({ message: 'فایل حذف شد' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * خطای اتصال دیتابیس را به پیام فارسی امن تبدیل می‌کند.
 * عمداً متن خام خطا برگردانده نمی‌شود چون معمولاً شامل نام میزبان و
 * نام کاربری است و نباید عمومی شود.
 */
function describeDbError(err) {
    const code = err && err.code;
    switch (code) {
        case 'ENOTFOUND':
        case 'EAI_AGAIN':
            return 'آدرس دیتابیس پیدا نشد — احتمالاً DATABASE_URL اشتباه کپی شده.';
        case 'ECONNREFUSED':
            return 'دیتابیس اتصال را رد کرد — شاید هنوز آماده نشده یا منطقه‌اش فرق دارد.';
        case 'ETIMEDOUT':
            return 'اتصال به دیتابیس زمان‌بر شد — احتمالاً منطقهٔ دیتابیس با سرویس وب یکی نیست.';
        case '28P01':
            return 'نام کاربری یا رمز دیتابیس اشتباه است.';
        case '3D000':
            return 'دیتابیسی با این نام وجود ندارد.';
        default:
            return 'اتصال به دیتابیس برقرار نشد' + (code ? ` (کد: ${code})` : '') + '.';
    }
}

// استخر اتصال Postgres فقط یک بار ساخته و بین درخواست‌ها بازاستفاده می‌شود.
// ساختن استخر تازه به‌ازای هر درخواست، سقف اتصال‌های پلن رایگان را
// خیلی زود پر می‌کند (health check هر چند ثانیه یک بار صدا زده می‌شود).
let _healthPool = null;
function getHealthPool(url) {
    if (!_healthPool) {
        const { Pool } = require('pg');
        _healthPool = new Pool({
            connectionString: url,
            ssl: url.includes('localhost') ? false : { rejectUnauthorized: false },
            connectionTimeoutMillis: 8000,
            max: 1,
            idleTimeoutMillis: 10000
        });
        _healthPool.on('error', () => { /* خطای بی‌صدا نباید پروسه را بکشد */ });
    }
    return _healthPool;
}

// نتیجهٔ بررسی دیتابیس ۳۰ ثانیه کش می‌شود تا health checkهای پیاپی
// به دیتابیس فشار نیاورند.
let _healthCache = { at: 0, value: null };
const HEALTH_CACHE_MS = 30000;

/**
 * بررسی سلامت سرویس — برای اطمینان از اینکه Postgres درست وصل شده.
 * هیچ اطلاعات محرمانه‌ای (آدرس، کاربر، رمز) برگردانده نمی‌شود.
 */
router.get('/health', async (req, res) => {
    const url = process.env.DATABASE_URL;

    if (!url) {
        return res.json({
            status: 'degraded',
            time: new Date().toISOString(),
            database: {
                configured: false,
                engine: 'sqlite',
                persistent: false,
                warning: 'DATABASE_URL تنظیم نشده — داده‌ها با هر دیپلوی پاک می‌شوند.'
            }
        });
    }

    // پاسخ کش‌شده اگر تازه است
    if (_healthCache.value && Date.now() - _healthCache.at < HEALTH_CACHE_MS) {
        return res.json({ ..._healthCache.value, cached: true });
    }

    const database = { configured: true, engine: 'postgres' };
    let status = 'ok';

    try {
        const result = await getHealthPool(url).query('SELECT version() AS version');
        database.connected = true;
        database.persistent = true;
        database.version =
            String(result.rows[0].version).split(' ').slice(0, 2).join(' ');
    } catch (err) {
        status = 'degraded';
        database.connected = false;
        database.error = describeDbError(err);
    }

    const report = { status, time: new Date().toISOString(), database };
    _healthCache = { at: Date.now(), value: report };

    // همیشه ۲۰۰ برمی‌گردد و وضعیت واقعی در بدنهٔ پاسخ است.
    // چون این مسیر به‌عنوان healthCheckPath در render.yaml ثبت شده،
    // پاسخ ۵۰۳ باعث شکست دیپلوی یا ری‌استارت پیاپی سرویس می‌شود.
    res.json(report);
});

// Stats
router.get('/stats', (req, res) => {
    try {
        const stats = db.prepare(`
            SELECT
                (SELECT COUNT(*) FROM categories) as total_categories,
                (SELECT COUNT(*) FROM operations) as total_operations,
                (SELECT COUNT(*) FROM operation_content WHERE description != '') as content_count,
                (SELECT COUNT(*) FROM users) as total_users
        `).get();
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

return router;
};
