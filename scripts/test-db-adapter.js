/** تست لایهٔ دسترسی به دیتابیس. اجرا: npm run test:db */
const path = require('path');
const fs = require('fs');
const { toPgPlaceholders } = require('../db');

let pass = 0, fail = 0;
function check(label, condition, detail) {
    if (condition) { pass++; console.log('  ✓ ' + label); }
    else { fail++; console.log('  ✗ ' + label + (detail ? '  → ' + detail : '')); }
}

console.log('\n── تبدیل جای‌گذار ? به $n ────────────────────');
const cases = [
    ['SELECT * FROM users WHERE id = ?', 'SELECT * FROM users WHERE id = $1'],
    ['INSERT INTO a (x,y,z) VALUES (?,?,?)', 'INSERT INTO a (x,y,z) VALUES ($1,$2,$3)'],
    ['UPDATE a SET x=? WHERE id=? AND y=?', 'UPDATE a SET x=$1 WHERE id=$2 AND y=$3'],
    // «؟» داخل رشته نباید تبدیل شود
    ["SELECT * FROM t WHERE msg = 'what?' AND id = ?",
     "SELECT * FROM t WHERE msg = 'what?' AND id = $1"],
    // کوتیشن escape شده
    ["SELECT '??' AS a, ? AS b", "SELECT '??' AS a, $1 AS b"],
    ['SELECT * FROM t', 'SELECT * FROM t'],
    ['SELECT * FROM t WHERE a LIKE ? OR b LIKE ?',
     'SELECT * FROM t WHERE a LIKE $1 OR b LIKE $2']
];
for (const [input, expected] of cases) {
    const got = toPgPlaceholders(input);
    check(input.slice(0, 52), got === expected, got);
}

console.log('\n── درایور SQLite روی دیتابیس موقت ──────────');

// روی یک فایل جدا کار می‌کنیم تا دیتابیس واقعی دست نخورد
const tmpPath = path.join(__dirname, '..', '.tmp-test.sqlite');
if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
process.env.DB_PATH = tmpPath;
delete process.env.DATABASE_URL;   // اجبار به حالت SQLite

// ماژول را تازه بارگذاری می‌کنیم تا DATABASE_URL دوباره خوانده شود
delete require.cache[require.resolve('../db')];
const { connect } = require('../db');

(async () => {
    const db = await connect();
    check('اتصال برقرار شد و گویش SQLite است', db.dialect === 'sqlite', db.dialect);

    await db.exec(`CREATE TABLE t (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        score INTEGER DEFAULT 0
    )`);

    const ins = await db.insert('INSERT INTO t (name, score) VALUES (?, ?)', ['علی', 10]);
    check('insert شناسه برگرداند', ins.id === 1, JSON.stringify(ins));

    const ins2 = await db.insert('INSERT INTO t (name, score) VALUES (?, ?)', ['مریم', 20]);
    check('شناسهٔ دوم افزایش یافت', ins2.id === 2, JSON.stringify(ins2));

    const row = await db.one('SELECT * FROM t WHERE id = ?', [1]);
    check('one ردیف درست را برگرداند', row && row.name === 'علی', JSON.stringify(row));

    const rows = await db.query('SELECT * FROM t ORDER BY id');
    check('query همهٔ ردیف‌ها را برگرداند', rows.length === 2, JSON.stringify(rows));

    const upd = await db.run('UPDATE t SET score = ? WHERE id = ?', [99, 1]);
    check('run تعداد تغییر را برگرداند', upd.changes === 1, JSON.stringify(upd));

    const missing = await db.one('SELECT * FROM t WHERE id = ?', [999]);
    check('ردیف ناموجود undefined می‌دهد', missing === undefined, String(missing));

    // متن فارسی و کاراکترهای خاص سالم بمانند
    await db.insert('INSERT INTO t (name) VALUES (?)', ["آپاندکتومی <script> ' \" ?"]);
    const weird = await db.one('SELECT * FROM t WHERE id = ?', [3]);
    check('متن فارسی و کاراکتر خاص سالم ذخیره شد',
          weird.name === "آپاندکتومی <script> ' \" ?", weird.name);

    // تراکنش: در صورت خطا باید برگردد
    try {
        await db.tx(async (t) => {
            await t.insert('INSERT INTO t (name) VALUES (?)', ['موقتی']);
            throw new Error('شکست عمدی');
        });
    } catch (e) { /* انتظار می‌رفت */ }
    const afterRollback = await db.query('SELECT * FROM t WHERE name = ?', ['موقتی']);
    check('تراکنش با خطا rollback شد', afterRollback.length === 0,
          JSON.stringify(afterRollback));

    // تراکنش موفق باید ثبت شود
    await db.tx(async (t) => {
        await t.insert('INSERT INTO t (name) VALUES (?)', ['ماندگار']);
    });
    const afterCommit = await db.query('SELECT * FROM t WHERE name = ?', ['ماندگار']);
    check('تراکنش موفق commit شد', afterCommit.length === 1, JSON.stringify(afterCommit));

    // داده باید روی دیسک نوشته شده باشد (هر نوشتن بلافاصله save می‌کند)
    check('فایل دیتابیس روی دیسک ساخته شد', fs.existsSync(tmpPath));

    // نکته: عمداً db.close() صدا زده نمی‌شود. بستن sql.js و بلافاصله خروج
    // از پروسه روی ویندوز باعث خطای assertion در libuv می‌شود که ربطی به
    // درستی تست ندارد ولی exit code را خراب می‌کند.
    fs.unlinkSync(tmpPath);

    console.log(`\n${'═'.repeat(50)}`);
    console.log(`نتیجه: ${pass} قبول · ${fail} رد`);
    process.exitCode = fail > 0 ? 1 : 0;
})().catch(err => {
    console.error('\nتست با خطا متوقف شد:', err.stack);
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    process.exit(1);
});
