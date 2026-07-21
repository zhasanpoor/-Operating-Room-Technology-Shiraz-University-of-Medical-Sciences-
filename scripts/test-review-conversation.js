/**
 * تست چرخهٔ کامل بازبینی:
 * نویسنده می‌نویسد → می‌فرستد → مدیر اصلاح می‌خواهد → نویسنده پاسخ
 * می‌دهد و اصلاح می‌کند → دوباره می‌فرستد → مدیر تأیید می‌کند.
 */
const BASE = process.env.TEST_BASE || 'http://localhost:3954';
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

    const uname = 'conv' + Date.now().toString().slice(-5);
    await fetch(`${BASE}/api/auth/register`, {
        method: 'POST', headers: AH,
        body: JSON.stringify({ username: uname, password: 'ConvPass123',
                               full_name: 'حسین نوروزی', role: 'editor' })
    });
    const author = (await (await fetch(`${BASE}/api/auth/login`, {
        method: 'POST', headers: J,
        body: JSON.stringify({ username: uname, password: 'ConvPass123' })
    })).json()).token;
    const EH = { ...J, Authorization: `Bearer ${author}` };

    console.log('\n── نویسنده پست می‌سازد و می‌فرستد ──────────');
    const op = await (await fetch(`${BASE}/api/operations`, {
        method: 'POST', headers: EH,
        body: JSON.stringify({ category_id: 1, op_number: 'CONV-1', name: 'عمل آزمایشی گفتگو' })
    })).json();
    await fetch(`${BASE}/api/operations/${op.id}/content`, {
        method: 'PUT', headers: EH,
        body: JSON.stringify({ description: '<p>نسخهٔ اول</p>' })
    });
    let r = await fetch(`${BASE}/api/operations/${op.id}/submit`, { method: 'POST', headers: EH });
    check('پست به صف بررسی رفت', r.ok, String(r.status));

    console.log('\n── مدیر درخواست اصلاح می‌دهد ───────────────');
    r = await fetch(`${BASE}/api/operations/${op.id}/review`, {
        method: 'POST', headers: AH,
        body: JSON.stringify({ decision: 'changes',
            comment: 'لطفاً بخش وسایل مورد نیاز را کامل‌تر بنویس.' })
    });
    check('درخواست اصلاح ثبت شد', r.ok, String(r.status));

    let detail = await (await fetch(`${BASE}/api/operations/${op.id}`, { headers: EH })).json();
    check('وضعیت پست «نیازمند اصلاح» شد',
          detail.status === 'changes_requested', detail.status);
    check('پست قفل نیست تا بتواند اصلاح کند', detail.is_locked === 0, String(detail.is_locked));

    console.log('\n── نویسنده کامنت مدیر را می‌بیند ───────────');
    let comments = await (await fetch(`${BASE}/api/operations/${op.id}/comments`,
        { headers: EH })).json();
    check('کامنت مدیر برای نویسنده قابل دیدن است', comments.length === 1, JSON.stringify(comments));
    check('نوع کامنت «بررسی» است', comments[0].kind === 'review', comments[0].kind);
    check('متن کامنت درست است',
          comments[0].body.includes('وسایل مورد نیاز'), comments[0].body);

    console.log('\n── نویسنده پاسخ می‌دهد ─────────────────────');
    r = await fetch(`${BASE}/api/operations/${op.id}/comments`, {
        method: 'POST', headers: EH,
        body: JSON.stringify({ body: 'چشم، لیست کامل ابزارها را اضافه کردم.' })
    });
    check('پاسخ نویسنده ثبت شد', r.ok, String(r.status));

    comments = await (await fetch(`${BASE}/api/operations/${op.id}/comments`,
        { headers: AH })).json();
    check('مدیر هر دو پیام را می‌بیند', comments.length === 2, String(comments.length));
    check('پاسخ نویسنده نوع «reply» دارد',
          comments[1].kind === 'reply', comments[1].kind);

    console.log('\n── محرمانگی گفتگو ──────────────────────────');
    const other = 'other' + Date.now().toString().slice(-4);
    await fetch(`${BASE}/api/auth/register`, {
        method: 'POST', headers: AH,
        body: JSON.stringify({ username: other, password: 'OtherPass1',
                               full_name: 'نویسندهٔ دیگر', role: 'editor' })
    });
    const otherTok = (await (await fetch(`${BASE}/api/auth/login`, {
        method: 'POST', headers: J,
        body: JSON.stringify({ username: other, password: 'OtherPass1' })
    })).json()).token;
    r = await fetch(`${BASE}/api/operations/${op.id}/comments`,
        { headers: { Authorization: `Bearer ${otherTok}` } });
    check('نویسندهٔ دیگر گفتگو را نمی‌بیند', r.status === 403, String(r.status));

    r = await fetch(`${BASE}/api/operations/${op.id}/comments`);
    check('مهمان گفتگو را نمی‌بیند', r.status === 401, String(r.status));

    r = await fetch(`${BASE}/api/operations/${op.id}/comments`, {
        method: 'POST', headers: { ...J, Authorization: `Bearer ${otherTok}` },
        body: JSON.stringify({ body: 'دخالت بی‌جا' })
    });
    check('نویسندهٔ دیگر نمی‌تواند پیام بگذارد', r.status === 403, String(r.status));

    console.log('\n── اصلاح و ارسال دوباره ────────────────────');
    r = await fetch(`${BASE}/api/operations/${op.id}/content`, {
        method: 'PUT', headers: EH,
        body: JSON.stringify({ instruments: '<ul><li>اسکالپل</li><li>پنس کوخر</li></ul>' })
    });
    check('نویسنده توانست محتوا را اصلاح کند', r.ok, String(r.status));

    r = await fetch(`${BASE}/api/operations/${op.id}/submit`, { method: 'POST', headers: EH });
    check('دوباره ارسال شد', r.ok, String(r.status));

    console.log('\n── تأیید نهایی و قفل شدن ───────────────────');
    r = await fetch(`${BASE}/api/operations/${op.id}/review`, {
        method: 'POST', headers: AH,
        body: JSON.stringify({ decision: 'approve', comment: 'عالی شد، ممنون!' })
    });
    check('مدیر تأیید کرد', r.ok, String(r.status));

    detail = await (await fetch(`${BASE}/api/operations/${op.id}`, { headers: EH })).json();
    check('پست منتشر و قفل شد',
          detail.status === 'approved' && detail.is_locked === 1,
          `status=${detail.status} locked=${detail.is_locked}`);

    r = await fetch(`${BASE}/api/operations/${op.id}/content`, {
        method: 'PUT', headers: EH,
        body: JSON.stringify({ description: '<p>تلاش برای ویرایش بعد از تأیید</p>' })
    });
    check('نویسنده دیگر نمی‌تواند ویرایش کند', r.status === 423, String(r.status));

    comments = await (await fetch(`${BASE}/api/operations/${op.id}/comments`,
        { headers: EH })).json();
    check('کل تاریخچهٔ گفتگو باقی مانده', comments.length === 3, String(comments.length));

    const notifs = await (await fetch(`${BASE}/api/notifications`, { headers: EH })).json();
    check('نویسنده اعلان‌های بررسی را گرفته',
          notifs.notifications.length >= 2,
          JSON.stringify(notifs.notifications.map(n => n.title)));

    console.log(`\n${'═'.repeat(50)}`);
    console.log(`نتیجه: ${pass} قبول · ${fail} رد`);
    process.exitCode = fail > 0 ? 1 : 0;
})().catch(e => { console.error('تست متوقف شد:', e.stack); process.exit(1); });
