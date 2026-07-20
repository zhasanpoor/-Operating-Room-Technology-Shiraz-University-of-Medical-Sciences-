const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'shiraz-ort-secret-key-2024';

module.exports = function(db) {
const router = express.Router();

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
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp|svg|pdf|pptx|docx|mp4|webm/;
        const extname = allowed.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowed.test(file.mimetype);
        if (extname || mimetype) return cb(null, true);
        cb('فایل پشتیبانی نمی‌شود');
    }
});

function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
    if (!token) return res.status(401).json({ error: 'احراز هویت لازم است' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'توکن نامعتبر' });
    }
}

function adminOnly(req, res, next) {
    if (req.user.role !== 'admin' && req.user.role !== 'editor') {
        return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }
    next();
}

// Auth
router.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'نام کاربری و رمز عبور الزامی است' });
        }
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (!user) {
            return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
        }
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
        }
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        res.json({
            token,
            user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/auth/register', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { username, password, full_name, role } = req.body;
        if (!username || !password || !full_name) {
            return res.status(400).json({ error: 'تمام فیلدها الزامی است' });
        }
        const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existing) {
            return res.status(400).json({ error: 'نام کاربری تکراری است' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
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

router.get('/auth/users', authMiddleware, adminOnly, (req, res) => {
    const users = db.prepare('SELECT id, username, full_name, role, created_at FROM users ORDER BY id').all();
    res.json(users);
});

router.delete('/auth/users/:id', authMiddleware, adminOnly, (req, res) => {
    if (parseInt(req.params.id) === req.user.id) {
        return res.status(400).json({ error: 'نمی‌توانید خودتان را حذف کنید' });
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ message: 'کاربر حذف شد' });
});

// Categories
router.get('/categories', (req, res) => {
    try {
        const categories = db.prepare(`
            SELECT c.*, COUNT(o.id) as operation_count
            FROM categories c
            LEFT JOIN operations o ON c.id = o.category_id
            GROUP BY c.id
            ORDER BY c.sort_order
        `).all();
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/categories/:key', (req, res) => {
    try {
        const category = db.prepare('SELECT * FROM categories WHERE key = ?').get(req.params.key);
        if (!category) return res.status(404).json({ error: 'دسته‌بندی یافت نشد' });

        const operations = db.prepare(`
            SELECT o.*, oc.description, oc.instruments, oc.video_url_1, oc.video_url_2,
                   oc.video_title_1, oc.video_title_2, oc.slides_url, oc.slides_title,
                   oc.description_images, oc.instruments_images
            FROM operations o
            LEFT JOIN operation_content oc ON o.id = oc.operation_id
            WHERE o.category_id = ?
            ORDER BY o.sort_order
        `).all(category.id);

        res.json({ ...category, operations });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/categories/:id', authMiddleware, adminOnly, (req, res) => {
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

router.delete('/categories/:id', authMiddleware, adminOnly, (req, res) => {
    try {
        db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
        res.json({ message: 'دسته‌بندی حذف شد' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Operations
router.get('/operations', (req, res) => {
    try {
        const { search, category } = req.query;
        let query = `
            SELECT o.*, c.name_fa as category_name_fa, c.name_en as category_name_en,
                   c.key as category_key, c.icon as category_icon, c.color as category_color,
                   oc.description, oc.instruments, oc.video_url_1, oc.video_url_2,
                   oc.video_title_1, oc.video_title_2, oc.slides_url, oc.slides_title,
                   oc.description_images, oc.instruments_images
            FROM operations o
            JOIN categories c ON o.category_id = c.id
            LEFT JOIN operation_content oc ON o.id = oc.operation_id
        `;
        const params = [];
        const conditions = [];

        if (search) {
            conditions.push('(o.name LIKE ? OR o.op_number LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }
        if (category) {
            conditions.push('c.key = ?');
            params.push(category);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ' ORDER BY c.sort_order, o.sort_order';

        const operations = db.prepare(query).all(...params);
        res.json(operations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/operations/:id', (req, res) => {
    try {
        const operation = db.prepare(`
            SELECT o.*, c.name_fa as category_name_fa, c.name_en as category_name_en,
                   c.key as category_key, c.icon as category_icon, c.color as category_color,
                   oc.description, oc.instruments, oc.video_url_1, oc.video_url_2,
                   oc.video_title_1, oc.video_title_2, oc.slides_url, oc.slides_title,
                   oc.description_images, oc.instruments_images
            FROM operations o
            JOIN categories c ON o.category_id = c.id
            LEFT JOIN operation_content oc ON o.id = oc.operation_id
            WHERE o.id = ?
        `).get(req.params.id);

        if (!operation) return res.status(404).json({ error: 'عمل یافت نشد' });
        res.json(operation);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/operations', authMiddleware, adminOnly, (req, res) => {
    try {
        const { category_id, op_number, name, sort_order } = req.body;
        const result = db.prepare(`
            INSERT INTO operations (category_id, op_number, name, sort_order) VALUES (?, ?, ?, ?)
        `).run(category_id, op_number, name, sort_order || 0);

        db.prepare(`INSERT INTO operation_content (operation_id) VALUES (?)`).run(result.lastInsertRowid);

        res.json({ id: result.lastInsertRowid, message: 'عمل اضافه شد' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/operations/:id', authMiddleware, adminOnly, (req, res) => {
    try {
        const { op_number, name, sort_order } = req.body;
        db.prepare(`
            UPDATE operations SET op_number = COALESCE(?, op_number), name = COALESCE(?, name),
            sort_order = COALESCE(?, sort_order) WHERE id = ?
        `).run(op_number, name, sort_order, req.params.id);
        res.json({ message: 'عمل بروزرسانی شد' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/operations/:id', authMiddleware, adminOnly, (req, res) => {
    try {
        db.prepare('DELETE FROM operations WHERE id = ?').run(req.params.id);
        res.json({ message: 'عمل حذف شد' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Content
router.put('/operations/:id/content', authMiddleware, adminOnly, (req, res) => {
    try {
        const { description, instruments, video_url_1, video_url_2, video_title_1, video_title_2,
                slides_url, slides_title, description_images, instruments_images } = req.body;

        const operation = db.prepare('SELECT id FROM operations WHERE id = ?').get(req.params.id);
        if (!operation) return res.status(404).json({ error: 'عمل یافت نشد' });

        const existing = db.prepare('SELECT id FROM operation_content WHERE operation_id = ?').get(req.params.id);

        if (existing) {
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
            `).run(description, instruments, video_url_1, video_url_2, video_title_1, video_title_2,
                   slides_url, slides_title, description_images, instruments_images, req.params.id);
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
        res.status(500).json({ error: err.message });
    }
});

// Upload
router.post('/upload', authMiddleware, upload.single('file'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'فایلی ارسال نشد' });

        db.prepare(`
            INSERT INTO uploaded_files (original_name, stored_name, file_type, file_size, uploaded_by)
            VALUES (?, ?, ?, ?, ?)
        `).run(req.file.originalname, req.file.filename, req.file.mimetype, req.file.size, req.user.id);

        res.json({
            url: `/uploads/${req.file.filename}`,
            filename: req.file.originalname,
            message: 'فایل آپلود شد'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/files', authMiddleware, (req, res) => {
    const files = db.prepare('SELECT * FROM uploaded_files ORDER BY created_at DESC LIMIT 100').all();
    res.json(files);
});

router.delete('/files/:id', authMiddleware, adminOnly, (req, res) => {
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

/**
 * بررسی سلامت سرویس — برای اطمینان از اینکه Postgres درست وصل شده.
 * هیچ اطلاعات محرمانه‌ای (آدرس، کاربر، رمز) برگردانده نمی‌شود.
 */
router.get('/health', async (req, res) => {
    const report = {
        status: 'ok',
        time: new Date().toISOString(),
        database: {}
    };

    const url = process.env.DATABASE_URL;
    report.database.configured = !!url;

    if (!url) {
        report.status = 'degraded';
        report.database.engine = 'sqlite';
        report.database.persistent = false;
        report.database.warning =
            'DATABASE_URL تنظیم نشده — داده‌ها با هر دیپلوی پاک می‌شوند.';
        return res.json(report);
    }

    report.database.engine = 'postgres';

    let pool;
    try {
        const { Pool } = require('pg');
        pool = new Pool({
            connectionString: url,
            ssl: url.includes('localhost') ? false : { rejectUnauthorized: false },
            connectionTimeoutMillis: 8000,
            max: 1
        });
        const result = await pool.query('SELECT version() AS version');
        report.database.connected = true;
        report.database.persistent = true;
        report.database.version =
            String(result.rows[0].version).split(' ').slice(0, 2).join(' ');
    } catch (err) {
        report.status = 'degraded';
        report.database.connected = false;
        report.database.error = describeDbError(err);
    } finally {
        if (pool) pool.end().catch(() => {});
    }

    // همیشه ۲۰۰ برمی‌گردد و وضعیت واقعی در بدنهٔ پاسخ است.
    // اگر روزی Render این مسیر را به‌عنوان health check استفاده کند،
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
