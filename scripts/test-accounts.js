/**
 * تست چرخهٔ کامل حساب کاربری:
 * ثبت‌نام → پروفایل → تغییر رمز → درخواست نویسندگی → تأیید مدیر
 * به‌علاوهٔ محافظت brute-force (کپچا بعد ۳ خطا، بلاک بعد ۵ خطا).
 */
const BASE = process.env.TEST_BASE || 'http://localhost:3991';

let pass = 0, fail = 0;
function check(label, ok, detail) {
    if (ok) { pass++; console.log('  ✓ ' + label); }
    else { fail++; console.log('  ✗ ' + label + (detail ? '\n      → ' + detail : '')); }
}
const J = { 'Content-Type': 'application/json' };
const H = t => ({ ...J, 'Authorization': `Bearer ${t}` });
const post = (p, body, token) => fetch(BASE + p, {
    method: 'POST', headers: token ? H(token) : J, body: JSON.stringify(body || {})
});

async function main() {
    const uniq = Date.now().toString().slice(-6);
    const uname = 'student' + uniq;

    console.log('\n── اعتبارسنجی ثبت‌نام ──────────────────────');
    let r = await post('/api/auth/signup', { username: 'ab', password: 'Test1234', full_name: 'علی رضایی' });
    check('نام کاربری خیلی کوتاه رد شد', r.status === 400, 'HTTP ' + r.status);

    r = await post('/api/auth/signup', { username: uname, password: '123', full_name: 'علی رضایی' });
    check('رمز کوتاه رد شد', r.status === 400, (await r.json()).error);

    r = await post('/api/auth/signup', { username: uname, password: 'password', full_name: 'علی رضایی' });
    check('رمز رایج و قابل حدس رد شد', r.status === 400, (await r.json()).error);

    r = await post('/api/auth/signup', { username: uname, password: 'abcdefgh', full_name: 'علی رضایی' });
    check('رمز بدون عدد رد شد', r.status === 400, (await r.json()).error);

    r = await post('/api/auth/signup', { username: uname, password: 'Test1234', full_name: 'ع' });
    check('نام ناقص رد شد', r.status === 400, (await r.json()).error);

    r = await post('/api/auth/signup', {
        username: uname, password: 'Test1234', full_name: 'علی رضایی', email: 'not-an-email'
    });
    check('ایمیل نامعتبر رد شد', r.status === 400, (await r.json()).error);

    console.log('\n── ثبت‌نام موفق ────────────────────────────');
    r = await post('/api/auth/signup', {
        username: uname, password: 'Test1234', full_name: 'علی رضایی',
        email: `ali${uniq}@example.com`
    });
    const signup = await r.json();
    check('ثبت‌نام انجام شد', r.ok, JSON.stringify(signup).slice(0, 120));
    check('توکن برگشت', !!signup.token);
    check('نقش پیش‌فرض «کاربر عادی» است', signup.user?.role === 'user', signup.user?.role);
    const userToken = signup.token;

    r = await post('/api/auth/signup', { username: uname, password: 'Test1234', full_name: 'تکراری' });
    check('نام کاربری تکراری رد شد', r.status === 400, (await r.json()).error);

    console.log('\n── پروفایل ─────────────────────────────────');
    let profile = await (await fetch(`${BASE}/api/profile`, { headers: H(userToken) })).json();
    check('پروفایل خوانده شد', profile.username === uname, JSON.stringify(profile).slice(0, 100));
    check('رمز در پاسخ پروفایل نیست', profile.password === undefined);

    r = await fetch(`${BASE}/api/profile`, {
        method: 'PUT', headers: H(userToken),
        body: JSON.stringify({ full_name: 'علی رضایی‌نژاد', bio: 'دانشجوی اتاق عمل' })
    });
    check('ویرایش پروفایل انجام شد', r.ok, String(r.status));
    profile = await (await fetch(`${BASE}/api/profile`, { headers: H(userToken) })).json();
    check('تغییرات ذخیره شد', profile.full_name === 'علی رضایی‌نژاد', profile.full_name);

    // XSS در بیو باید پاک شود
    await fetch(`${BASE}/api/profile`, {
        method: 'PUT', headers: H(userToken),
        body: JSON.stringify({ bio: '<script>alert(1)</script>سلام' })
    });
    profile = await (await fetch(`${BASE}/api/profile`, { headers: H(userToken) })).json();
    check('اسکریپت از بیو حذف شد', !/<script/i.test(profile.bio), profile.bio);

    console.log('\n── تغییر رمز ───────────────────────────────');
    r = await post('/api/profile/password',
        { current_password: 'WrongPass1', new_password: 'NewPass1234' }, userToken);
    check('رمز فعلی اشتباه رد شد', r.status === 401, (await r.json()).error);

    r = await post('/api/profile/password',
        { current_password: 'Test1234', new_password: 'weak' }, userToken);
    check('رمز جدید ضعیف رد شد', r.status === 400, (await r.json()).error);

    r = await post('/api/profile/password',
        { current_password: 'Test1234', new_password: 'Test1234' }, userToken);
    check('رمز جدید یکسان با قبلی رد شد', r.status === 400, (await r.json()).error);

    r = await post('/api/profile/password',
        { current_password: 'Test1234', new_password: 'NewPass1234' }, userToken);
    check('تغییر رمز موفق بود', r.ok, (await r.json()).error || '');

    r = await post('/api/auth/login', { username: uname, password: 'NewPass1234' });
    check('ورود با رمز جدید کار می‌کند', r.ok, String(r.status));
    const freshToken = (await r.json()).token;

    console.log('\n── درخواست نویسندگی ────────────────────────');
    r = await post('/api/profile/request-author', { note: 'دوست دارم مطلب بنویسم' }, freshToken);
    check('درخواست ثبت شد', r.ok, (await r.json()).error || '');

    r = await post('/api/profile/request-author', {}, freshToken);
    check('درخواست تکراری رد شد', r.status === 400, (await r.json()).error);

    const adminLogin = await (await post('/api/auth/login',
        { username: 'admin', password: 'admin123' })).json();
    const adminToken = adminLogin.token;

    const requests = await (await fetch(`${BASE}/api/author-requests`, { headers: H(adminToken) })).json();
    check('درخواست در فهرست مدیر هست', requests.some(x => x.username === uname),
          'تعداد: ' + requests.length);

    r = await fetch(`${BASE}/api/author-requests`, { headers: H(freshToken) });
    check('کاربر عادی فهرست درخواست‌ها را نمی‌بیند', r.status === 403, 'HTTP ' + r.status);

    const target = requests.find(x => x.username === uname);
    r = await post(`/api/author-requests/${target.id}`, { decision: 'approve' }, adminToken);
    check('مدیر درخواست را تأیید کرد', r.ok, (await r.json()).error || '');

    profile = await (await fetch(`${BASE}/api/profile`, { headers: H(freshToken) })).json();
    check('نقش کاربر به نویسنده تغییر کرد', profile.role === 'editor', profile.role);

    const notifs = await (await fetch(`${BASE}/api/notifications`, { headers: H(freshToken) })).json();
    check('کاربر اعلان تبریک گرفت',
          notifs.notifications.some(n => n.title.includes('نویسنده')),
          JSON.stringify(notifs.notifications.map(n => n.title)));

    console.log('\n── مدیریت کاربر توسط مدیر ──────────────────');
    r = await post(`/api/auth/users/${target.id}/active`,
        { is_active: false, reason: 'بررسی موقت' }, adminToken);
    check('مدیر کاربر را غیرفعال کرد', r.ok, (await r.json()).error || '');

    r = await post('/api/auth/login', { username: uname, password: 'NewPass1234' });
    check('کاربر غیرفعال نمی‌تواند وارد شود', r.status === 403, 'HTTP ' + r.status);

    r = await fetch(`${BASE}/api/profile`, { headers: H(freshToken) });
    check('توکن قبلی کاربر غیرفعال هم رد می‌شود', r.status === 403, 'HTTP ' + r.status);

    await post(`/api/auth/users/${target.id}/active`, { is_active: true }, adminToken);
    r = await post('/api/auth/login', { username: uname, password: 'NewPass1234' });
    check('بعد از فعال‌سازی دوباره وارد می‌شود', r.ok, 'HTTP ' + r.status);

    // تنزل و ارتقای مجدد نباید پست‌ها را پاک کند
    await post(`/api/auth/users/${target.id}/role`, { role: 'user' }, adminToken);
    await post(`/api/auth/users/${target.id}/role`, { role: 'editor' }, adminToken);
    const users = await (await fetch(`${BASE}/api/auth/users`, { headers: H(adminToken) })).json();
    const restored = users.find(u => u.id === target.id);
    check('بعد از تنزل و ارتقای مجدد، نقش درست است', restored.role === 'editor', restored.role);

    r = await post(`/api/auth/users/${target.id}/role`, { role: 'superuser' }, adminToken);
    check('نقش نامعتبر رد شد', r.status === 400, 'HTTP ' + r.status);

    console.log('\n── محافظت brute-force ──────────────────────');
    const victim = 'victim' + uniq;
    await post('/api/auth/signup', { username: victim, password: 'Victim1234', full_name: 'قربانی تست' });

    let sawCaptcha = false, sawBlock = false;
    for (let i = 1; i <= 6; i++) {
        const res = await post('/api/auth/login', { username: victim, password: 'wrong' + i });
        const body = await res.json();
        if (body.needsCaptcha) sawCaptcha = true;
        if (body.blocked || res.status === 429) { sawBlock = true; break; }
    }
    check('بعد از چند تلاش ناموفق کپچا لازم شد', sawCaptcha);
    check('بعد از تلاش‌های بیشتر حساب بلاک شد', sawBlock);

    r = await post('/api/auth/login', { username: victim, password: 'Victim1234' });
    check('حتی با رمز درست هم در زمان بلاک اجازه نمی‌دهد', r.status === 429, 'HTTP ' + r.status);
    const blockBody = await r.json();
    check('پیام بلاک فارسی و شامل زمان است',
          /دقیقه/.test(blockBody.error), blockBody.error);

    console.log(`\n${'═'.repeat(52)}`);
    console.log(`نتیجه: ${pass} قبول · ${fail} رد`);
    process.exitCode = fail > 0 ? 1 : 0;
}

main().catch(err => {
    console.error('تست متوقف شد:', err.stack);
    process.exit(1);
});
