/**
 * مهاجرت اسکیمای دیتابیس — افزایشی و بی‌خطر (idempotent).
 *
 * هر مهاجرت فقط یک بار اجرا می‌شود و در جدول `schema_migrations` ثبت می‌گردد.
 * هیچ داده‌ای حذف یا بازنویسی نمی‌شود؛ فقط ستون و جدول اضافه می‌شود.
 */

/** نام ستون‌های یک جدول را برمی‌گرداند (برای ALTER امن). */
function columnsOf(db, table) {
    try {
        return db.prepare(`PRAGMA table_info(${table})`).all().map(r => r.name);
    } catch (e) {
        return [];
    }
}

/** ستون را فقط در صورتی اضافه می‌کند که وجود نداشته باشد. */
function addColumn(db, table, column, definition) {
    if (columnsOf(db, table).includes(column)) return false;
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    return true;
}

function tableExists(db, table) {
    const row = db.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name = ?`
    ).get(table);
    return !!row;
}

// ---------------------------------------------------------------------------

const migrations = [
    {
        id: '002_user_profiles',
        description: 'فیلدهای پروفایل، وضعیت فعال بودن و درخواست نویسندگی',
        up(db) {
            addColumn(db, 'users', 'email', "TEXT");
            addColumn(db, 'users', 'avatar', "TEXT DEFAULT ''");
            addColumn(db, 'users', 'bio', "TEXT DEFAULT ''");
            addColumn(db, 'users', 'is_active', 'INTEGER DEFAULT 1');
            // pending | approved | rejected | none
            addColumn(db, 'users', 'author_request_status', "TEXT DEFAULT 'none'");
            addColumn(db, 'users', 'author_request_note', "TEXT DEFAULT ''");
            addColumn(db, 'users', 'author_requested_at', 'DATETIME');
            addColumn(db, 'users', 'last_login_at', 'DATETIME');
            addColumn(db, 'users', 'password_changed_at', 'DATETIME');
            // زمانی که ادمین کاربر را به دلیل رفتار مشکوک قفل کرده
            addColumn(db, 'users', 'suspended_reason', "TEXT DEFAULT ''");

            db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email
                     ON users(email) WHERE email IS NOT NULL AND email != ''`);
        }
    },

    {
        id: '003_content_workflow',
        description: 'مالکیت پست، وضعیت گردش کار و قفل شدن پس از تأیید',
        up(db) {
            addColumn(db, 'operations', 'author_id', 'INTEGER REFERENCES users(id)');
            // draft | pending | approved | rejected | changes_requested
            // پیش‌فرض برای پست‌های *جدید* پیش‌نویس است؛ ردیف‌های موجود پایین‌تر
            // به «تأییدشده» تبدیل می‌شوند چون محتوای seed شدهٔ خود ادمین هستند.
            addColumn(db, 'operations', 'status', "TEXT DEFAULT 'draft'");
            addColumn(db, 'operations', 'submitted_at', 'DATETIME');
            addColumn(db, 'operations', 'published_at', 'DATETIME');
            addColumn(db, 'operations', 'reviewed_by', 'INTEGER REFERENCES users(id)');
            addColumn(db, 'operations', 'reviewed_at', 'DATETIME');
            addColumn(db, 'operations', 'updated_at', 'DATETIME');
            addColumn(db, 'operations', 'view_count', 'INTEGER DEFAULT 0');
            // پس از تأیید ادمین ۱ می‌شود و ویرایش برای همه بسته می‌شود
            addColumn(db, 'operations', 'is_locked', 'INTEGER DEFAULT 0');

            db.exec(`CREATE INDEX IF NOT EXISTS idx_operations_author ON operations(author_id)`);
            db.exec(`CREATE INDEX IF NOT EXISTS idx_operations_status ON operations(status)`);

            // تمام ردیف‌های موجود در لحظهٔ مهاجرت، محتوای seed شدهٔ ادمین هستند:
            // منتشرشده و قفل‌شده تلقی می‌شوند.
            db.exec(`UPDATE operations
                     SET status = 'approved', is_locked = 1,
                         published_at = COALESCE(published_at, created_at)`);
        }
    },

    {
        id: '004_review_comments',
        description: 'گفتگوی ادمین و نویسنده روی هر پست',
        up(db) {
            db.exec(`
                CREATE TABLE IF NOT EXISTS post_comments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    operation_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    body TEXT NOT NULL,
                    -- review = نظر بررسی ادمین، reply = پاسخ نویسنده، system = خودکار
                    kind TEXT DEFAULT 'reply' CHECK(kind IN ('review','reply','system')),
                    is_read INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                );
                CREATE INDEX IF NOT EXISTS idx_comments_operation ON post_comments(operation_id);
            `);
        }
    },

    {
        id: '005_notifications',
        description: 'اعلان‌های داخل سایت',
        up(db) {
            db.exec(`
                CREATE TABLE IF NOT EXISTS notifications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    body TEXT DEFAULT '',
                    link TEXT DEFAULT '',
                    icon TEXT DEFAULT '🔔',
                    is_read INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_notifications_user
                    ON notifications(user_id, is_read);
            `);
        }
    },

    {
        id: '006_security',
        description: 'ردیابی تلاش ورود، بلاک IP، رویدادهای امنیتی و لاگ ممیزی',
        up(db) {
            db.exec(`
                CREATE TABLE IF NOT EXISTS login_attempts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    identifier TEXT NOT NULL,   -- نام کاربری یا ip
                    scope TEXT NOT NULL,        -- 'user' یا 'ip'
                    success INTEGER DEFAULT 0,
                    ip TEXT DEFAULT '',
                    user_agent TEXT DEFAULT '',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_attempts_lookup
                    ON login_attempts(scope, identifier, created_at);

                CREATE TABLE IF NOT EXISTS blocks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    identifier TEXT NOT NULL,
                    scope TEXT NOT NULL,        -- 'user' یا 'ip'
                    reason TEXT DEFAULT '',
                    blocked_until DATETIME NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_blocks_lookup
                    ON blocks(scope, identifier, blocked_until);

                CREATE TABLE IF NOT EXISTS security_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    event_type TEXT NOT NULL,   -- xss_attempt, sqli_attempt, bad_upload, ...
                    severity TEXT DEFAULT 'medium' CHECK(severity IN ('low','medium','high')),
                    detail TEXT DEFAULT '',
                    payload TEXT DEFAULT '',    -- نمونهٔ ورودی مشکوک (بریده‌شده)
                    ip TEXT DEFAULT '',
                    resolved INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                );
                CREATE INDEX IF NOT EXISTS idx_security_unresolved
                    ON security_events(resolved, created_at);

                CREATE TABLE IF NOT EXISTS audit_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    action TEXT NOT NULL,
                    target_type TEXT DEFAULT '',
                    target_id INTEGER,
                    detail TEXT DEFAULT '',
                    ip TEXT DEFAULT '',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                );
                CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
            `);
        }
    },

    {
        id: '007_gamification',
        description: 'آمار و دستاوردهای نویسندگان',
        up(db) {
            db.exec(`
                CREATE TABLE IF NOT EXISTS achievements (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    badge_key TEXT NOT NULL,
                    awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
                CREATE UNIQUE INDEX IF NOT EXISTS idx_achievement_unique
                    ON achievements(user_id, badge_key);
            `);
            // امتیاز تجمعی نویسنده — با تنزل سطح دسترسی صفر نمی‌شود
            addColumn(db, 'users', 'points', 'INTEGER DEFAULT 0');
            addColumn(db, 'users', 'onboarded', 'INTEGER DEFAULT 0');
        }
    },

    {
        id: '008_upload_hardening',
        description: 'ردیابی مالکیت و بازرسی فایل‌های آپلودشده',
        up(db) {
            addColumn(db, 'uploaded_files', 'sha256', "TEXT DEFAULT ''");
            addColumn(db, 'uploaded_files', 'is_quarantined', 'INTEGER DEFAULT 0');
        }
    },

    {
        id: '009_unlock_seeded_content',
        description: 'باز کردن قفل محتوای seed شده تا مدیر بتواند ویرایشش کند',
        up(db) {
            // مهاجرت ۰۰۳ همهٔ عمل‌های موجود را قفل کرد. اشتباه بود:
            // قفل شدن باید فقط وقتی رخ دهد که مدیر پست *یک نویسنده* را
            // تأیید می‌کند. محتوای seed شده متعلق به خود مدیر است و اگر
            // قفل بماند، مدیر دیگر نمی‌تواند هیچ‌کدام از ۱۴۳ عمل را ویرایش کند.
            //
            // ضمناً دیتابیس تازه (که Render با هر دیپلوی می‌سازد) این
            // ردیف‌ها را قفل‌نشده می‌ساخت — یعنی رفتار سایت زنده با
            // نسخهٔ محلی فرق می‌کرد. این مهاجرت هر دو را یکسان می‌کند.
            db.exec(`UPDATE operations SET is_locked = 0 WHERE author_id IS NULL`);
        }
    },

    {
        id: '010_engagement',
        description: 'علاقه‌مندی، نشان کردن، و ثبت اشتراک‌گذاری',
        up(db) {
            db.exec(`
                -- علاقه‌مندی و نشان در یک جدول با ستون kind نگه داشته می‌شوند
                -- چون ساختارشان یکی است و کوئری‌ها ساده‌تر می‌مانند.
                CREATE TABLE IF NOT EXISTS user_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    operation_id INTEGER NOT NULL,
                    kind TEXT NOT NULL CHECK(kind IN ('favorite','bookmark')),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE
                );
                CREATE UNIQUE INDEX IF NOT EXISTS idx_user_items_unique
                    ON user_items(user_id, operation_id, kind);
                CREATE INDEX IF NOT EXISTS idx_user_items_op
                    ON user_items(operation_id, kind);

                CREATE TABLE IF NOT EXISTS shares (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    operation_id INTEGER NOT NULL,
                    user_id INTEGER,                  -- مهمان هم می‌تواند اشتراک بگذارد
                    channel TEXT NOT NULL,            -- telegram, whatsapp, copy, native, ...
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
                );
                CREATE INDEX IF NOT EXISTS idx_shares_op ON shares(operation_id);
                CREATE INDEX IF NOT EXISTS idx_shares_channel ON shares(channel, created_at);
            `);
        }
    },

    {
        id: '011_profile_and_verification',
        description: 'اطلاعات تکمیلی پروفایل و تأیید ایمیل',
        up(db) {
            addColumn(db, 'users', 'mobile', "TEXT DEFAULT ''");
            addColumn(db, 'users', 'workplace', "TEXT DEFAULT ''");   // بیمارستان
            addColumn(db, 'users', 'university', "TEXT DEFAULT ''");  // محل تحصیل
            addColumn(db, 'users', 'field_of_study', "TEXT DEFAULT ''");
            addColumn(db, 'users', 'study_level', "TEXT DEFAULT ''");
            addColumn(db, 'users', 'email_verified', 'INTEGER DEFAULT 0');
            addColumn(db, 'users', 'auth_provider', "TEXT DEFAULT 'local'"); // local | google

            db.exec(`
                CREATE TABLE IF NOT EXISTS email_tokens (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    token_hash TEXT NOT NULL,   -- خود توکن ذخیره نمی‌شود، فقط هش آن
                    purpose TEXT NOT NULL DEFAULT 'verify',
                    expires_at DATETIME NOT NULL,
                    used_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_email_tokens_lookup
                    ON email_tokens(token_hash, purpose);
            `);

            // کاربران فعلی (که با روش قدیمی ساخته شده‌اند) تأییدشده تلقی
            // می‌شوند تا با فعال شدن این قابلیت از سایت بیرون نیفتند.
            db.exec(`UPDATE users SET email_verified = 1`);
        }
    },

    {
        id: '012_analytics',
        description: 'ثبت بازدید صفحات و رفتار کاربر برای گزارش‌های مدیریتی',
        up(db) {
            db.exec(`
                CREATE TABLE IF NOT EXISTS page_views (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    operation_id INTEGER,
                    path TEXT NOT NULL,
                    referrer TEXT DEFAULT '',
                    device TEXT DEFAULT '',      -- mobile | tablet | desktop
                    browser TEXT DEFAULT '',
                    -- IP ذخیره نمی‌شود؛ فقط هش کوتاه برای شمارش بازدیدکنندهٔ یکتا
                    visitor_hash TEXT DEFAULT '',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                    FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_views_created ON page_views(created_at);
                CREATE INDEX IF NOT EXISTS idx_views_op ON page_views(operation_id);
            `);
        }
    },

    {
        id: '013_site_settings',
        description: 'تنظیمات و سیاست‌های سایت به‌صورت کلید-مقدار',
        up(db) {
            db.exec(`
                CREATE TABLE IF NOT EXISTS site_settings (
                    key TEXT PRIMARY KEY,
                    value TEXT DEFAULT '',
                    category TEXT DEFAULT 'general',
                    updated_by INTEGER,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `);

            const defaults = [
                ['site_name', 'تکنولوژی اتاق عمل', 'general'],
                ['site_tagline', 'ویژه دانشجویان و متخصصین علوم پزشکی', 'general'],
                ['contact_email', '', 'general'],
                ['allow_signup', '1', 'policy'],
                ['require_email_verification', '0', 'policy'],
                ['auto_approve_posts', '0', 'policy'],
                ['max_upload_mb', '8', 'limits'],
                ['login_block_minutes', '15', 'limits']
            ];
            const stmt = db.prepare(
                `INSERT OR IGNORE INTO site_settings (key, value, category) VALUES (?, ?, ?)`
            );
            for (const [k, v, c] of defaults) stmt.run(k, v, c);
        }
    },

    {
        id: '014_operation_slug',
        description: 'آدرس خوانا (slug) برای هر عمل — لازم برای سئو',
        up(db) {
            addColumn(db, 'operations', 'slug', 'TEXT');
            db.exec(`CREATE INDEX IF NOT EXISTS idx_operations_slug ON operations(slug)`);
        }
    },

    {
        id: '015_backfill_slugs',
        description: 'ساخت slug برای عمل‌های موجود',
        up(db) {
            const { uniqueSlug } = require('./lib/slug');
            const rows = db.prepare(
                'SELECT id, name, op_number, slug FROM operations ORDER BY id'
            ).all();

            const taken = new Set(rows.filter(r => r.slug).map(r => r.slug));
            const update = db.prepare('UPDATE operations SET slug = ? WHERE id = ?');

            let count = 0;
            for (const row of rows) {
                if (row.slug) continue;
                update.run(uniqueSlug(row.name, row.op_number, taken), row.id);
                count++;
            }
            if (count > 0) console.log(`     ${count} slug ساخته شد`);
        }
    }
];

// ---------------------------------------------------------------------------

function runMigrations(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id TEXT PRIMARY KEY,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    const applied = new Set(
        db.prepare('SELECT id FROM schema_migrations').all().map(r => r.id)
    );

    let count = 0;
    for (const migration of migrations) {
        if (applied.has(migration.id)) continue;
        try {
            migration.up(db);
            db.prepare('INSERT INTO schema_migrations (id) VALUES (?)').run(migration.id);
            console.log(`  ✓ migration ${migration.id} — ${migration.description}`);
            count++;
        } catch (err) {
            console.error(`  ✗ migration ${migration.id} failed:`, err.message);
            throw err;
        }
    }

    if (count > 0) {
        db.save();
        console.log(`${count} migration(s) applied.`);
    }
    return count;
}

module.exports = { runMigrations, columnsOf, tableExists };
