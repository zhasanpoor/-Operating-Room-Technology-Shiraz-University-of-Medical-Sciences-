const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');
let _db = null;

class SqlJsWrapper {
    constructor(sqlDb) {
        this.sqlDb = sqlDb;
    }

    exec(sql) {
        this.sqlDb.exec(sql);
        this.save();
    }

    pragma(str) {
        this.sqlDb.run(`PRAGMA ${str}`);
    }

    prepare(sql) {
        const sqlDb = this.sqlDb;
        const self = this;
        return {
            run(...params) {
                sqlDb.run(sql, params);
                const changes = sqlDb.getRowsModified();
                let lastInsertRowid = null;
                try {
                    const r = sqlDb.exec('SELECT last_insert_rowid()');
                    if (r.length > 0 && r[0].values.length > 0) lastInsertRowid = r[0].values[0][0];
                } catch(e) {}
                // بدون این save، هر نوشتنی فقط در حافظه می‌ماند و با
                // ری‌استارت سرویس از بین می‌رود — ویرایش محتوا، ساخت کاربر،
                // ثبت رویداد امنیتی و... همه بی‌صدا گم می‌شدند.
                // داخل تراکنش به تعویق می‌افتد تا حالت نیمه‌کاره ذخیره نشود.
                self.save();
                return { changes, lastInsertRowid };
            },
            get(...params) {
                const stmt = sqlDb.prepare(sql);
                if (params.length > 0) stmt.bind(params);
                if (stmt.step()) {
                    const row = stmt.getAsObject();
                    stmt.free();
                    return row;
                }
                stmt.free();
                return undefined;
            },
            all(...params) {
                const stmt = sqlDb.prepare(sql);
                if (params.length > 0) stmt.bind(params);
                const rows = [];
                while (stmt.step()) {
                    rows.push(stmt.getAsObject());
                }
                stmt.free();
                return rows;
            }
        };
    }

    transaction(fn) {
        const self = this;
        return function (...args) {
            self.sqlDb.run('BEGIN TRANSACTION');
            self._inTransaction = true;
            try {
                const result = fn(...args);
                self.sqlDb.run('COMMIT');
                return result;
            } catch (err) {
                self.sqlDb.run('ROLLBACK');
                throw err;
            } finally {
                // ذخیره فقط پس از پایان تراکنش (چه COMMIT چه ROLLBACK)
                // تا وضعیت نیمه‌کاره روی دیسک ننشیند.
                self._inTransaction = false;
                self.save();
            }
        };
    }

    save() {
        if (this._inTransaction) return;
        try {
            const data = this.sqlDb.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(dbPath, buffer);
        } catch(e) {
            console.error('DB save error:', e.message);
        }
    }
}

async function initDatabase() {
    if (_db) return _db;
    const SQL = await initSqlJs();
    let sqlDb;
    if (fs.existsSync(dbPath)) {
        const fileBuffer = fs.readFileSync(dbPath);
        sqlDb = new SQL.Database(fileBuffer);
    } else {
        sqlDb = new SQL.Database();
    }
    _db = new SqlJsWrapper(sqlDb);
    _db.pragma('foreign_keys = ON');

    _db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'editor', 'user')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE NOT NULL,
            name_fa TEXT NOT NULL,
            name_en TEXT NOT NULL,
            icon TEXT DEFAULT '🏥',
            color TEXT DEFAULT '#3b82f6',
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS operations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER NOT NULL,
            op_number TEXT NOT NULL,
            name TEXT NOT NULL,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS operation_content (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            operation_id INTEGER NOT NULL UNIQUE,
            description TEXT DEFAULT '',
            instruments TEXT DEFAULT '',
            video_url_1 TEXT DEFAULT '',
            video_url_2 TEXT DEFAULT '',
            video_title_1 TEXT DEFAULT '',
            video_title_2 TEXT DEFAULT '',
            slides_url TEXT DEFAULT '',
            slides_title TEXT DEFAULT '',
            description_images TEXT DEFAULT '[]',
            instruments_images TEXT DEFAULT '[]',
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS uploaded_files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            original_name TEXT NOT NULL,
            stored_name TEXT NOT NULL,
            file_type TEXT NOT NULL,
            file_size INTEGER DEFAULT 0,
            uploaded_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (uploaded_by) REFERENCES users(id)
        );

        CREATE INDEX IF NOT EXISTS idx_operations_category ON operations(category_id);
        CREATE INDEX IF NOT EXISTS idx_operation_content_operation ON operation_content(operation_id);
    `);

    // اسکیمای پایه بالا ساخته شد؛ حالا مهاجرت‌های افزایشی نسخه ۲ اجرا می‌شوند.
    const { runMigrations } = require('./migrations');
    runMigrations(_db);

    _db.save();
    return _db;
}

function getDb() {
    if (!_db) throw new Error('Database not initialized yet!');
    return _db;
}

module.exports = { initDatabase, getDb };
