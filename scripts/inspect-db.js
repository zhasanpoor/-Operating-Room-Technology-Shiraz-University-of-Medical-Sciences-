/** ابزار توسعه: نمایش وضعیت فعلی اسکیما و داده‌ها. اجرا: npm run db:inspect */
require('dotenv').config();
const { initDatabase } = require('../database');

initDatabase().then(db => {
    const cols = t => db.prepare(`PRAGMA table_info(${t})`).all().map(r => r.name).join(', ');
    const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all().map(r => r.name);

    console.log('\nTABLES:\n  ' + tables.join('\n  '));
    console.log('\nusers:      ' + cols('users'));
    console.log('operations: ' + cols('operations'));
    console.log('\noperation status:',
        JSON.stringify(db.prepare(
            'SELECT status, is_locked, COUNT(*) c FROM operations GROUP BY status, is_locked'
        ).all()));
    console.log('counts:',
        JSON.stringify(db.prepare(`SELECT
            (SELECT COUNT(*) FROM operations) ops,
            (SELECT COUNT(*) FROM categories) cats,
            (SELECT COUNT(*) FROM users) users`).get()));
    console.log('migrations applied:',
        db.prepare('SELECT id FROM schema_migrations ORDER BY id').all().map(r => r.id).join(', '));
    process.exit(0);
}).catch(err => {
    console.error('FAILED:', err.stack);
    process.exit(1);
});
