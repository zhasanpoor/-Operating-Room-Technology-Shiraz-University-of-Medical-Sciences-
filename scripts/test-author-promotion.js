/**
 * تست ارتقای کاربر به نویسنده پس از تأیید مدیر.
 *
 * نکتهٔ کلیدی که بررسی می‌شود: کاربر با **همان توکن قبلی** و بدون خروج
 * و ورود مجدد، بلافاصله دسترسی نویسندگی می‌گیرد.
 */
const BASE = process.env.TEST_BASE || 'http://localhost:3960';
let pass = 0, fail = 0;
const check = (l, ok, d) => { ok ? (pass++, console.log('  ✓ ' + l))
    : (fail++, console.log('  ✗ ' + l + (d ? '\n      → ' + d : ''))); };
const J = { 'Content-Type': 'application/json' };

(async () => {
    const admin = (await (await fetch(`${BASE}/api/auth/login`, {
        method: 'POST', headers: J,
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
    })).json()).token;
    const AH = { ...J, Authorization: `Bearer ${admin}` };

    console.log('\n── کاربر عادی ثبت‌نام می‌کند ────────────────');
    const u = 'promo' + Date.now().toString().slice(-5);
    const signup = await (await fetch(`${BASE}/api/auth/signup`, {
        method: 'POST', headers: J,
        body: JSON.stringify({ username: u, password: 'Promo12345', full_name: 'زهرا محمدی' })
    })).json();
    const userToken = signup.token;          // ← همین توکن تا آخر استفاده می‌شود
    const UH = { ...J, Authorization: `Bearer ${userToken}` };

    check('نقش اولیه «کاربر عادی» است', signup.user.role === 'user', signup.user.role);

    // کاربر عادی نباید بتواند پست بسازد
    let r = await fetch(`${BASE}/api/operations`, {
        method: 'POST', headers: UH,
        body: JSON.stringify({ category_id: 1, op_number: 'X-1', name: 'تلاش زودهنگام' })
    });
    check('کاربر عادی نمی‌تواند پست بسازد', r.status === 403, 'HTTP ' + r.status);

    console.log('\n── درخواست نویسندگی ────────────────────────');
    r = await fetch(`${BASE}/api/profile/request-author`, {
        method: 'POST', headers: UH,
        body: JSON.stringify({ note: 'دوست دارم دربارهٔ جراحی ارتوپدی بنویسم' })
    });
    check('درخواست ثبت شد', r.ok, JSON.stringify(await r.clone().json()));

    let profile = await (await fetch(`${BASE}/api/profile`, { headers: UH })).json();
    check('وضعیت درخواست «در انتظار» شد',
          profile.author_request_status === 'pending', profile.author_request_status);
    check('ولی نقش هنوز عوض نشده', profile.role === 'user', profile.role);

    console.log('\n── مدیر تأیید می‌کند ───────────────────────');
    const queue = await (await fetch(`${BASE}/api/author-requests`, { headers: AH })).json();
    const target = queue.find(x => x.username === u);
    check('درخواست در صف مدیر دیده می‌شود', !!target, `صف: ${queue.length} مورد`);

    r = await fetch(`${BASE}/api/author-requests/${target.id}`, {
        method: 'POST', headers: AH, body: JSON.stringify({ decision: 'approve' })
    });
    check('مدیر تأیید کرد', r.ok, JSON.stringify(await r.clone().json()));

    console.log('\n── ارتقا بلافاصله اعمال می‌شود ─────────────');
    // *** مهم: همان توکن قبلی، بدون ورود مجدد ***
    profile = await (await fetch(`${BASE}/api/profile`, { headers: UH })).json();
    check('نقش به «نویسنده» ارتقا یافت', profile.role === 'editor', profile.role);
    check('وضعیت درخواست «تأییدشده» شد',
          profile.author_request_status === 'approved', profile.author_request_status);

    r = await fetch(`${BASE}/api/operations`, {
        method: 'POST', headers: UH,
        body: JSON.stringify({ category_id: 1, op_number: 'PROMO-1', name: 'اولین پست نویسندهٔ جدید' })
    });
    check('حالا با همان توکن قبلی می‌تواند پست بسازد', r.ok, 'HTTP ' + r.status);
    const op = r.ok ? await r.json() : null;

    if (op) {
        r = await fetch(`${BASE}/api/operations/${op.id}/content`, {
            method: 'PUT', headers: UH,
            body: JSON.stringify({ description: '<p>محتوای اولین پست</p>' })
        });
        check('می‌تواند محتوای پست خودش را بنویسد', r.ok, 'HTTP ' + r.status);

        r = await fetch(`${BASE}/api/operations/${op.id}/submit`, { method: 'POST', headers: UH });
        check('می‌تواند پست را برای تأیید بفرستد', r.ok, 'HTTP ' + r.status);
    }

    const notifs = await (await fetch(`${BASE}/api/notifications`, { headers: UH })).json();
    check('کاربر اعلان تبریک دریافت کرد',
          notifs.notifications.some(n => /نویسنده/.test(n.title)),
          JSON.stringify(notifs.notifications.map(n => n.title)));

    console.log('\n── داشبورد نقش جدید را نشان می‌دهد ─────────');
    const dash = await (await fetch(`${BASE}/api/dashboard-stats`, { headers: UH })).json();
    check('داشبورد به نمای نویسنده تغییر کرد', dash.role === 'editor', dash.role);
    check('آمار پست‌های نویسنده برمی‌گردد',
          typeof dash.stats.total === 'number', JSON.stringify(dash.stats));

    console.log('\n── تنزل و بازگشت داده‌ها ───────────────────');
    await fetch(`${BASE}/api/auth/users/${target.id}/role`, {
        method: 'POST', headers: AH, body: JSON.stringify({ role: 'user' })
    });
    r = await fetch(`${BASE}/api/operations`, {
        method: 'POST', headers: UH,
        body: JSON.stringify({ category_id: 1, op_number: 'X-2', name: 'بعد از تنزل' })
    });
    check('پس از تنزل، دیگر نمی‌تواند پست بسازد', r.status === 403, 'HTTP ' + r.status);

    await fetch(`${BASE}/api/auth/users/${target.id}/role`, {
        method: 'POST', headers: AH, body: JSON.stringify({ role: 'editor' })
    });
    const dash2 = await (await fetch(`${BASE}/api/dashboard-stats`, { headers: UH })).json();
    check('پس از ارتقای مجدد، پست‌های قبلی سر جایشان است',
          dash2.stats.total >= 1, JSON.stringify(dash2.stats));

    console.log(`\n${'═'.repeat(50)}`);
    console.log(`نتیجه: ${pass} قبول · ${fail} رد`);
    process.exitCode = fail > 0 ? 1 : 0;
})().catch(e => { console.error('تست متوقف شد:', e.stack); process.exit(1); });
