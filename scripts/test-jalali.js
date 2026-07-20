/** تست تبدیل تاریخ شمسی در برابر تاریخ‌های مرجع شناخته‌شده. */
const J = require('../public/js/jalali');

const cases = [
    // [میلادی, شمسی موردانتظار]
    [[1979, 2, 11], [1357, 11, 22]],   // پیروزی انقلاب
    [[2026, 3, 21], [1405, 1, 1]],     // نوروز ۱۴۰۵
    [[2026, 7, 20], [1405, 4, 29]],    // امروز
    [[2000, 1, 1], [1378, 10, 11]],
    [[2024, 3, 20], [1403, 1, 1]],     // نوروز ۱۴۰۳
    [[1900, 1, 1], [1278, 10, 11]],
    [[2100, 12, 31], [1479, 10, 10]]
];

let failed = 0;
for (const [[gy, gm, gd], [ejy, ejm, ejd]] of cases) {
    const got = J.toJalaali(gy, gm, gd);
    const ok = got.jy === ejy && got.jm === ejm && got.jd === ejd;
    if (!ok) failed++;
    console.log(`${ok ? '✓' : '✗'} ${gy}-${gm}-${gd} → ${got.jy}/${got.jm}/${got.jd}` +
                (ok ? '' : `  (انتظار: ${ejy}/${ejm}/${ejd})`));
}

// رفت‌وبرگشت: هر تبدیل باید معکوس‌پذیر باشد
let rtFailed = 0;
for (let i = 0; i < 5000; i++) {
    const d = new Date(Date.UTC(1930, 0, 1) + i * 86400000 * 12);
    const j = J.toJalaali(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    const g = J.toGregorian(j.jy, j.jm, j.jd);
    if (g.gy !== d.getUTCFullYear() || g.gm !== d.getUTCMonth() + 1 || g.gd !== d.getUTCDate()) {
        rtFailed++;
        if (rtFailed < 4) console.log('✗ round-trip', d.toISOString().slice(0, 10), '→', j, '→', g);
    }
}
console.log(`\nround-trip: ${5000 - rtFailed}/5000 گذشت`);

console.log('\nنمونهٔ قالب‌بندی:');
console.log('  long     ', J.format('2026-07-20 08:30:00', 'long'));
console.log('  short    ', J.format('2026-07-20 08:30:00', 'short'));
console.log('  full     ', J.format('2026-07-20 08:30:00', 'full'));
console.log('  datetime ', J.format('2026-07-20 08:30:00', 'datetime'));
console.log('  relative ', J.relative(new Date(Date.now() - 3 * 3600 * 1000)));
console.log('  null     ', J.format(null));

process.exit(failed + rtFailed > 0 ? 1 : 0);
