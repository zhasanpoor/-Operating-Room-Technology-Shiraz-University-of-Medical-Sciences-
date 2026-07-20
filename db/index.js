/**
 * لایهٔ دسترسی به دیتابیس — یک رابط ناهمگام (async) روی دو موتور.
 *
 *   • اگر `DATABASE_URL` تنظیم باشد  → PostgreSQL (سایت زنده روی Render)
 *   • در غیر این صورت                → SQLite از طریق sql.js (توسعهٔ محلی)
 *
 * چرا هر دو؟ روی Render فایل‌سیستم موقتی است و SQLite با هر دیپلوی پاک
 * می‌شود؛ پس داده‌های واقعی باید در Postgres باشند. اما برای توسعه روی
 * ویندوز، اجبار به نصب Postgres اصطکاک بی‌مورد است.
 *
 * قرارداد نوشتن کوئری: همیشه از جای‌گذار `?` استفاده کنید.
 * این ماژول برای Postgres خودش آن را به `$1، $2، …` تبدیل می‌کند.
 */

const IS_POSTGRES = !!process.env.DATABASE_URL;

// ---------------------------------------------------------------------------
// تبدیل جای‌گذار: ?  →  $1, $2, ...
// رشته‌های داخل کوتیشن نادیده گرفته می‌شوند تا «?» درون متن خراب نشود.
// ---------------------------------------------------------------------------
function toPgPlaceholders(sql) {
    let out = '';
    let index = 0;
    let inSingle = false;
    let inDouble = false;

    for (let i = 0; i < sql.length; i++) {
        const ch = sql[i];

        if (ch === "'" && !inDouble) {
            // '' داخل رشته یعنی کوتیشن escape شده
            if (inSingle && sql[i + 1] === "'") { out += "''"; i++; continue; }
            inSingle = !inSingle;
        } else if (ch === '"' && !inSingle) {
            inDouble = !inDouble;
        }

        if (ch === '?' && !inSingle && !inDouble) {
            out += '$' + (++index);
        } else {
            out += ch;
        }
    }
    return out;
}

/** SQLite برای مقادیر بولی 0/1 می‌خواهد؛ Postgres هم عدد را می‌پذیرد. */
function normalizeParams(params) {
    return params.map(p => (typeof p === 'boolean' ? (p ? 1 : 0) : p));
}

// ---------------------------------------------------------------------------
// درایور PostgreSQL
// ---------------------------------------------------------------------------
class PostgresDriver {
    constructor() {
        const { Pool } = require('pg');
        this.dialect = 'postgres';
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            // Render برای اتصال‌های بیرونی TLS لازم دارد اما گواهی داخلی است
            ssl: process.env.DATABASE_URL.includes('localhost')
                ? false
                : { rejectUnauthorized: false },
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 15000
        });

        // خطای بی‌صدای کانکشن نباید کل پروسه را بکشد
        this.pool.on('error', err => {
            console.error('خطای غیرمنتظرهٔ استخر Postgres:', err.message);
        });
    }

    async query(sql, params = []) {
        const result = await this.pool.query(toPgPlaceholders(sql), normalizeParams(params));
        return result.rows;
    }

    async one(sql, params = []) {
        const rows = await this.query(sql, params);
        return rows[0];
    }

    /** INSERT/UPDATE/DELETE — تعداد ردیف‌های تغییریافته را برمی‌گرداند. */
    async run(sql, params = []) {
        const result = await this.pool.query(toPgPlaceholders(sql), normalizeParams(params));
        return { changes: result.rowCount, rows: result.rows };
    }

    /** INSERT به همراه شناسهٔ ردیف تازه‌ساخته‌شده. */
    async insert(sql, params = []) {
        const withReturning = /returning/i.test(sql) ? sql : sql + ' RETURNING id';
        const rows = await this.query(withReturning, params);
        return { id: rows[0] ? rows[0].id : null, changes: rows.length };
    }

    /** اجرای DDL خام (بدون پارامتر). */
    async exec(sql) {
        await this.pool.query(sql);
    }

    /** اجرای چند عملیات در یک تراکنش. */
    async tx(fn) {
        const client = await this.pool.connect();
        const scoped = {
            dialect: 'postgres',
            query: async (sql, params = []) =>
                (await client.query(toPgPlaceholders(sql), normalizeParams(params))).rows,
            one: async (sql, params = []) =>
                (await client.query(toPgPlaceholders(sql), normalizeParams(params))).rows[0],
            run: async (sql, params = []) => {
                const r = await client.query(toPgPlaceholders(sql), normalizeParams(params));
                return { changes: r.rowCount, rows: r.rows };
            },
            insert: async (sql, params = []) => {
                const s = /returning/i.test(sql) ? sql : sql + ' RETURNING id';
                const r = await client.query(toPgPlaceholders(s), normalizeParams(params));
                return { id: r.rows[0] ? r.rows[0].id : null, changes: r.rowCount };
            },
            exec: async (sql) => { await client.query(sql); }
        };

        try {
            await client.query('BEGIN');
            const result = await fn(scoped);
            await client.query('COMMIT');
            return result;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async close() {
        await this.pool.end();
    }
}

// ---------------------------------------------------------------------------
// درایور SQLite (sql.js) — همان رابط، اما روی فایل محلی
// ---------------------------------------------------------------------------
class SqliteDriver {
    constructor(sqlDb, filePath) {
        const fs = require('fs');
        this.dialect = 'sqlite';
        this.sqlDb = sqlDb;
        this.filePath = filePath;
        this.fs = fs;
        this._dirty = false;
        this._inTransaction = false;
    }

    _rows(sql, params) {
        const stmt = this.sqlDb.prepare(sql);
        try {
            if (params && params.length) stmt.bind(normalizeParams(params));
            const rows = [];
            while (stmt.step()) rows.push(stmt.getAsObject());
            return rows;
        } finally {
            stmt.free();
        }
    }

    async query(sql, params = []) {
        return this._rows(sql, params);
    }

    async one(sql, params = []) {
        return this._rows(sql, params)[0];
    }

    async run(sql, params = []) {
        this.sqlDb.run(sql, normalizeParams(params));
        const changes = this.sqlDb.getRowsModified();
        this._save();
        return { changes, rows: [] };
    }

    async insert(sql, params = []) {
        // SQLite جملهٔ RETURNING را در نسخه‌های قدیمی پشتیبانی نمی‌کند
        const plain = sql.replace(/\s+returning\s+\w+\s*$/i, '');
        this.sqlDb.run(plain, normalizeParams(params));
        const changes = this.sqlDb.getRowsModified();
        const result = this.sqlDb.exec('SELECT last_insert_rowid() AS id');
        const id = result.length && result[0].values.length ? result[0].values[0][0] : null;
        this._save();
        return { id, changes };
    }

    async exec(sql) {
        this.sqlDb.exec(sql);
        this._save();
    }

    async tx(fn) {
        this.sqlDb.run('BEGIN TRANSACTION');
        this._inTransaction = true;
        try {
            const result = await fn(this);
            this.sqlDb.run('COMMIT');
            return result;
        } catch (err) {
            this.sqlDb.run('ROLLBACK');
            throw err;
        } finally {
            this._inTransaction = false;
            this._save();
        }
    }

    /** نوشتن روی دیسک — داخل تراکنش به تعویق می‌افتد تا کند نشود. */
    _save() {
        if (this._inTransaction) { this._dirty = true; return; }
        try {
            this.fs.writeFileSync(this.filePath, Buffer.from(this.sqlDb.export()));
            this._dirty = false;
        } catch (err) {
            console.error('خطا در ذخیرهٔ دیتابیس SQLite:', err.message);
        }
    }

    async close() {
        this._save();
        this.sqlDb.close();
    }
}

// ---------------------------------------------------------------------------

let _db = null;

async function connect() {
    if (_db) return _db;

    if (IS_POSTGRES) {
        _db = new PostgresDriver();
        // اتصال را همین ابتدا می‌سنجیم تا خطا زودتر معلوم شود
        const row = await _db.one('SELECT version() AS version');
        console.log('دیتابیس: PostgreSQL —', String(row.version).split(',')[0]);
    } else {
        const path = require('path');
        const fs = require('fs');
        const initSqlJs = require('sql.js');
        const filePath = process.env.DB_PATH
            ? path.resolve(process.env.DB_PATH)
            : path.join(__dirname, '..', 'database.sqlite');

        const SQL = await initSqlJs();
        const sqlDb = fs.existsSync(filePath)
            ? new SQL.Database(fs.readFileSync(filePath))
            : new SQL.Database();
        sqlDb.run('PRAGMA foreign_keys = ON');

        _db = new SqliteDriver(sqlDb, filePath);
        console.log('دیتابیس: SQLite (توسعهٔ محلی) —', filePath);
        console.warn('⚠️  روی سرور حتماً DATABASE_URL تنظیم شود، وگرنه داده‌ها با هر دیپلوی پاک می‌شوند.');
    }

    return _db;
}

function getDb() {
    if (!_db) throw new Error('دیتابیس هنوز متصل نشده است — اول connect() را صدا بزنید.');
    return _db;
}

module.exports = { connect, getDb, toPgPlaceholders, IS_POSTGRES };
