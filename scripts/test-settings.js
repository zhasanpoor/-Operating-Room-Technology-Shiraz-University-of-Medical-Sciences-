/** تست تنظیمات سایت و اعمال شدن واقعی سیاست‌ها. */
const BASE = process.env.TEST_BASE || 'http://localhost:3965';
let pass = 0, fail = 0;
const check = (l, ok, d) => { ok ? (pass++, console.log('  ✓ ' + l))
    : (fail++, console.log('  ✗ ' + l + (d ? '\n      → ' + d : ''))); };
const J = { 'Content-Type': 'application/json' };

(async () => {
    const admin = (await (await fetch(`${BASE}/api/auth/login`, {
        method: 'POST', headers: J,
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
    })).json()).token;
    const H = { ...J, Authorization: `Bearer ${admin}` };
    const setSettings = body => fetch(`${BASE}/api/settings`, {
        method: 'PUT', headers: H, body: JSON.stringify(body) });

    console.log('\n── خواندن تنظیمات ──────────────────────────');
    const groups = await (await fetch(`${BASE}/api/settings`, { headers: H })).json();
    check('تنظیمات گروه‌بندی‌شده برگشت',
          groups.general && groups.policy && groups.limits && groups.legal,
          Object.keys(groups).join(','));
    check('هر گروه برچسب فارسی دارد', /[؀-ۿ]/.test(groups.general.label), groups.general.label);

    console.log('\n── دسترسی ──────────────────────────────────');
    let r = await fetch(`${BASE}/api/settings`);
    check('کاربر بدون ورود به تنظیمات دسترسی ندارد', r.status === 401, String(r.status));

    const u = 'setuser' + Date.now().toString().slice(-5);
    const su = await (await fetch(`${BASE}/api/auth/signup`, {
        method: 'POST', headers: J,
        body: JSON.stringify({ username: u, password: 'SetPass123', full_name: 'کاربر تست' })
    })).json();
    r = await fetch(`${BASE}/api/settings`, { headers: { Authorization: `Bearer ${su.token}` } });
    check('کاربر عادی به تنظیمات دسترسی ندارد', r.status === 403, String(r.status));

    console.log('\n── اعتبارسنجی مقادیر ───────────────────────');
    r = await setSettings({ max_upload_mb: 9999 });
    check('عدد خارج از محدوده رد شد', r.status === 400, String(r.status));

    r = await setSettings({ contact_email: 'not-an-email' });
    check('ایمیل نامعتبر رد شد', r.status === 400, String(r.status));

    r = await setSettings({ evil_key: 'hack', site_name: 'اتاق عمل شیراز' });
    check('کلید ناشناخته نادیده گرفته شد ولی کلید معتبر ذخیره شد', r.ok,
          JSON.stringify(await r.clone().json()));

    const pub = await (await fetch(`${BASE}/api/settings/public`)).json();
    check('نام سایت ذخیره و عمومی شد', pub.site_name === 'اتاق عمل شیراز', pub.site_name);
    check('کلید ناشناخته ذخیره نشد', pub.evil_key === undefined);
    check('تنظیمات محرمانه در خروجی عمومی نیست', pub.max_upload_mb === undefined);

    r = await setSettings({ about_text: '<script>alert(1)</script><p>دربارهٔ ما</p>' });
    const pub2 = await (await fetch(`${BASE}/api/settings/public`)).json();
    check('اسکریپت از متن پاک شد', !/<script/i.test(pub2.about_text || ''), pub2.about_text);

    console.log('\n── سیاست‌ها واقعاً اعمال می‌شوند ────────────');
    await setSettings({ allow_signup: '0' });
    r = await fetch(`${BASE}/api/auth/signup`, {
        method: 'POST', headers: J,
        body: JSON.stringify({ username: 'blocked' + Date.now().toString().slice(-4),
                               password: 'Blocked123', full_name: 'کاربر مسدود' })
    });
    check('با بستن ثبت‌نام، ثبت‌نام رد می‌شود', r.status === 403, String(r.status));

    await setSettings({ allow_signup: '1' });
    r = await fetch(`${BASE}/api/auth/signup`, {
        method: 'POST', headers: J,
        body: JSON.stringify({ username: 'ok' + Date.now().toString().slice(-5),
                               password: 'Allowed123', full_name: 'کاربر مجاز' })
    });
    check('با باز کردن ثبت‌نام، دوباره کار می‌کند', r.ok, String(r.status));

    await setSettings({ allow_author_requests: '0' });
    r = await fetch(`${BASE}/api/profile/request-author`, {
        method: 'POST', headers: { ...J, Authorization: `Bearer ${su.token}` },
        body: JSON.stringify({ note: 'تست' })
    });
    check('با بستن درخواست نویسندگی، رد می‌شود', r.status === 403, String(r.status));
    await setSettings({ allow_author_requests: '1' });

    console.log('\n── تأیید خودکار پست ────────────────────────');
    await fetch(`${BASE}/api/auth/register`, {
        method: 'POST', headers: H,
        body: JSON.stringify({ username: 'aa' + Date.now().toString().slice(-5),
                               password: 'AutoPass1', full_name: 'نویسندهٔ خودکار', role: 'editor' })
    });
    const users = await (await fetch(`${BASE}/api/auth/users`, { headers: H })).json();
    const ed = users.filter(x => x.role === 'editor').pop();
    const edTok = (await (await fetch(`${BASE}/api/auth/login`, {
        method: 'POST', headers: J,
        body: JSON.stringify({ username: ed.username, password: 'AutoPass1' })
    })).json()).token;
    const EH = { ...J, Authorization: `Bearer ${edTok}` };

    await setSettings({ auto_approve_posts: '1' });
    const op = await (await fetch(`${BASE}/api/operations`, {
        method: 'POST', headers: EH,
        body: JSON.stringify({ category_id: 1, op_number: 'AUTO-1', name: 'پست تأیید خودکار' })
    })).json();
    await fetch(`${BASE}/api/operations/${op.id}/submit`, { method: 'POST', headers: EH });
    const opAfter = await (await fetch(`${BASE}/api/operations/${op.id}`, { headers: H })).json();
    check('با تأیید خودکار، پست مستقیم منتشر شد',
          opAfter.status === 'approved' && opAfter.is_locked === 1,
          `status=${opAfter.status} locked=${opAfter.is_locked}`);

    await setSettings({ auto_approve_posts: '0' });
    const op2 = await (await fetch(`${BASE}/api/operations`, {
        method: 'POST', headers: EH,
        body: JSON.stringify({ category_id: 1, op_number: 'AUTO-2', name: 'پست صف عادی' })
    })).json();
    await fetch(`${BASE}/api/operations/${op2.id}/submit`, { method: 'POST', headers: EH });
    const op2After = await (await fetch(`${BASE}/api/operations/${op2.id}`, { headers: H })).json();
    check('با خاموش کردنش، پست به صف بررسی می‌رود', op2After.status === 'pending', op2After.status);

    console.log(`\n${'═'.repeat(50)}`);
    console.log(`نتیجه: ${pass} قبول · ${fail} رد`);
    process.exitCode = fail > 0 ? 1 : 0;
})().catch(e => { console.error('تست متوقف شد:', e.stack); process.exit(1); });
