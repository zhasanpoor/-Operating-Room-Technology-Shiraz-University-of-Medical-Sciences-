/** تست فیلدهای تکمیلی پروفایل و صفحات خطا. */
const BASE = process.env.TEST_BASE || 'http://localhost:3966';
let pass = 0, fail = 0;
const check = (l, ok, d) => { ok ? (pass++, console.log('  ✓ ' + l))
    : (fail++, console.log('  ✗ ' + l + (d ? '\n      → ' + d : ''))); };

(async () => {
    const login = await (await fetch(`${BASE}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
    })).json();
    const H = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${login.token}` };
    const put = body => fetch(`${BASE}/api/profile`, {
        method: 'PUT', headers: H, body: JSON.stringify(body) });

    console.log('\n── اعتبارسنجی موبایل ───────────────────────');
    let r = await put({ mobile: '123' });
    check('شمارهٔ کوتاه رد شد', r.status === 400, String(r.status));

    r = await put({ mobile: '09123456789' });
    check('شمارهٔ استاندارد پذیرفته شد', r.ok, JSON.stringify(await r.clone().json()));

    r = await put({ mobile: '۰۹۱۲۳۴۵۶۷۸۹' });
    check('ارقام فارسی پذیرفته شد', r.ok, JSON.stringify(await r.clone().json()));

    r = await put({ mobile: '+989123456789' });
    check('فرمت +98 پذیرفته شد', r.ok, JSON.stringify(await r.clone().json()));

    r = await put({ mobile: '0912 345 6789' });
    check('فاصله در شماره نادیده گرفته شد', r.ok, JSON.stringify(await r.clone().json()));

    let p = await (await fetch(`${BASE}/api/profile`, { headers: H })).json();
    check('شماره به فرمت یکسان ذخیره شد', p.mobile === '09123456789', p.mobile);

    console.log('\n── اطلاعات تحصیلی و شغلی ───────────────────');
    r = await put({
        university: 'دانشگاه علوم پزشکی شیراز',
        study_level: 'کارشناسی',
        field_of_study: 'تکنولوژی اتاق عمل',
        workplace: 'بیمارستان نمازی'
    });
    check('ذخیرهٔ اطلاعات تحصیلی موفق بود', r.ok, JSON.stringify(await r.clone().json()));

    p = await (await fetch(`${BASE}/api/profile`, { headers: H })).json();
    check('دانشگاه ذخیره شد', p.university === 'دانشگاه علوم پزشکی شیراز', p.university);
    check('مقطع ذخیره شد', p.study_level === 'کارشناسی', p.study_level);
    check('رشته ذخیره شد', p.field_of_study === 'تکنولوژی اتاق عمل', p.field_of_study);
    check('محل کار ذخیره شد', p.workplace === 'بیمارستان نمازی', p.workplace);

    r = await put({ study_level: 'مدرک جعلی' });
    check('مقطع نامعتبر رد شد', r.status === 400, String(r.status));

    r = await put({ university: '<script>alert(1)</script>دانشگاه' });
    p = await (await fetch(`${BASE}/api/profile`, { headers: H })).json();
    check('اسکریپت از نام دانشگاه پاک شد', !/<script/i.test(p.university), p.university);

    console.log('\n── صفحات خطا ───────────────────────────────');
    for (const code of [400, 401, 403, 404, 429, 500, 503]) {
        const res = await fetch(`${BASE}/error/${code}`);
        const html = await res.text();
        check(`صفحهٔ ${code} با کد درست و متن فارسی`,
              res.status === code && /<h1>/.test(html) && /[؀-ۿ]/.test(html),
              `HTTP ${res.status}`);
    }

    const apiErr = await fetch(`${BASE}/api/does-not-exist`);
    const ct = apiErr.headers.get('content-type') || '';
    check('مسیر API ناموجود JSON برمی‌گرداند', ct.includes('json'), ct);

    const pageErr = await fetch(`${BASE}/missing.png`);
    check('فایل ناموجود صفحهٔ HTML برمی‌گرداند',
          (pageErr.headers.get('content-type') || '').includes('html'));

    console.log(`\n${'═'.repeat(50)}`);
    console.log(`نتیجه: ${pass} قبول · ${fail} رد`);
    process.exitCode = fail > 0 ? 1 : 0;
})().catch(e => { console.error('تست متوقف شد:', e.message); process.exit(1); });
