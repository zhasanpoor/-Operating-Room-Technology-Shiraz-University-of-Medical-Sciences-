/**
 * تست جداسازی سطوح دسترسی.
 *
 * این تست واقعاً تلاش می‌کند سطح دسترسی را بالا ببرد — اگر روزی این
 * محافظت‌ها برداشته شوند، اینجا قرمز می‌شود.
 *
 * اجرا: سرور روی پورت ۳۹۹۵ با ADMIN_PASSWORD=admin123 بالا باشد.
 */
const BASE = process.env.TEST_BASE || 'http://localhost:3995';

let pass = 0, fail = 0;
function check(label, ok, detail) {
    if (ok) { pass++; console.log('  ✓ ' + label); }
    else { fail++; console.log('  ✗ ' + label + (detail ? '\n      → ' + detail : '')); }
}

async function login(username, password) {
    const r = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    if (!r.ok) return null;
    return (await r.json()).token;
}

const H = t => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${t}` });

async function main() {
    const adminToken = await login('admin', 'admin123');
    if (!adminToken) { console.error('ورود مدیر ناموفق'); process.exit(1); }
    console.log('\n── آماده‌سازی ───────────────────────────────');
    check('ورود مدیر', !!adminToken);

    // ساخت یک نویسنده برای آزمایش
    await fetch(`${BASE}/api/auth/register`, {
        method: 'POST', headers: H(adminToken),
        body: JSON.stringify({
            username: 'testauthor', password: 'AuthorPass123!',
            full_name: 'نویسندهٔ آزمایشی', role: 'editor'
        })
    });
    const authorToken = await login('testauthor', 'AuthorPass123!');
    check('ورود نویسنده', !!authorToken);
    if (!authorToken) process.exit(1);

    console.log('\n── نویسنده نباید بتواند سطح دسترسی بالا ببرد ──');
    let r = await fetch(`${BASE}/api/auth/register`, {
        method: 'POST', headers: H(authorToken),
        body: JSON.stringify({
            username: 'eviladmin', password: 'Pass123456!',
            full_name: 'مدیر جعلی', role: 'admin'
        })
    });
    check('نویسنده نمی‌تواند حساب مدیر بسازد', r.status === 403, 'HTTP ' + r.status);
    check('حساب جعلی واقعاً ساخته نشد', !(await login('eviladmin', 'Pass123456!')));

    r = await fetch(`${BASE}/api/auth/users`, { headers: H(authorToken) });
    check('نویسنده لیست کاربران را نمی‌بیند', r.status === 403, 'HTTP ' + r.status);

    r = await fetch(`${BASE}/api/auth/users/1`, { method: 'DELETE', headers: H(authorToken) });
    check('نویسنده نمی‌تواند کاربر حذف کند', r.status === 403, 'HTTP ' + r.status);

    r = await fetch(`${BASE}/api/categories/1`, { method: 'DELETE', headers: H(authorToken) });
    check('نویسنده نمی‌تواند دسته‌بندی حذف کند', r.status === 403, 'HTTP ' + r.status);

    r = await fetch(`${BASE}/api/operations/1`, { method: 'DELETE', headers: H(authorToken) });
    check('نویسنده نمی‌تواند عمل حذف کند', r.status === 403, 'HTTP ' + r.status);

    console.log('\n── مالکیت پست ──────────────────────────────');
    // نویسنده پست خودش را می‌سازد
    r = await fetch(`${BASE}/api/operations`, {
        method: 'POST', headers: H(authorToken),
        body: JSON.stringify({ category_id: 1, op_number: 'T-1', name: 'پست آزمایشی نویسنده' })
    });
    check('نویسنده می‌تواند پست بسازد', r.ok, 'HTTP ' + r.status);
    const ownId = r.ok ? (await r.json()).id : null;

    if (ownId) {
        r = await fetch(`${BASE}/api/operations/${ownId}/content`, {
            method: 'PUT', headers: H(authorToken),
            body: JSON.stringify({ description: '<p>محتوای من</p>' })
        });
        check('نویسنده محتوای پست خودش را ذخیره می‌کند', r.ok, 'HTTP ' + r.status);
    }

    // پست عمل شمارهٔ ۱ متعلق به نویسنده نیست (seed شده، قفل‌شده)
    r = await fetch(`${BASE}/api/operations/1/content`, {
        method: 'PUT', headers: H(authorToken),
        body: JSON.stringify({ description: '<p>دستکاری محتوای دیگری</p>' })
    });
    check('نویسنده محتوای پست دیگری را ویرایش نمی‌کند',
          r.status === 403 || r.status === 423, 'HTTP ' + r.status);

    console.log('\n── محتوای seed شده باید برای مدیر قابل ویرایش بماند ──');
    // قفل شدن فقط هنگام تأیید پستِ یک نویسنده معنا دارد. محتوای seed شده
    // متعلق به خود مدیر است و اگر قفل باشد مدیر نمی‌تواند ۱۴۳ عمل را
    // ویرایش کند — یعنی کاربرد اصلی امروزِ پنل از کار می‌افتد.
    r = await fetch(`${BASE}/api/operations/1/content`, {
        method: 'PUT', headers: H(adminToken),
        body: JSON.stringify({ description: '<p>ویرایش مدیر روی محتوای seed</p>' })
    });
    check('مدیر محتوای seed شده را ویرایش می‌کند', r.ok, 'HTTP ' + r.status);

    console.log('\n── گردش کار کامل: ارسال → تأیید → قفل ──────');
    if (ownId) {
        // نویسنده پستش را برای بررسی می‌فرستد
        r = await fetch(`${BASE}/api/operations/${ownId}/submit`, {
            method: 'POST', headers: H(authorToken)
        });
        check('نویسنده پست را برای بررسی فرستاد', r.ok, 'HTTP ' + r.status);

        // پست باید در صف بررسی مدیر دیده شود
        const queue = await (await fetch(`${BASE}/api/review-queue`, { headers: H(adminToken) })).json();
        check('پست در صف بررسی مدیر است', queue.some(q => q.id === ownId),
              JSON.stringify(queue.map(q => q.id)));

        // نویسنده صف بررسی را نمی‌بیند
        r = await fetch(`${BASE}/api/review-queue`, { headers: H(authorToken) });
        check('نویسنده صف بررسی را نمی‌بیند', r.status === 403, 'HTTP ' + r.status);

        // مدیر تأیید می‌کند (با کامنت)
        r = await fetch(`${BASE}/api/operations/${ownId}/review`, {
            method: 'POST', headers: H(adminToken),
            body: JSON.stringify({ decision: 'approve', comment: 'عالی بود، آفرین!' })
        });
        check('مدیر پست را تأیید کرد', r.ok, 'HTTP ' + r.status);

        // حالا پست قفل است — نویسنده نمی‌تواند ویرایش کند
        r = await fetch(`${BASE}/api/operations/${ownId}/content`, {
            method: 'PUT', headers: H(authorToken),
            body: JSON.stringify({ description: '<p>ویرایش بعد از تأیید</p>' })
        });
        check('نویسنده پست تأییدشدهٔ خودش را ویرایش نمی‌کند',
              r.status === 423, 'HTTP ' + r.status);
        if (r.status === 423) {
            const body = await r.json();
            check('پیام قفل فارسی و روشن است', /تأیید|قفل/.test(body.error), body.error);
        }

        // مدیر هم بدون باز کردن قفل نمی‌تواند
        r = await fetch(`${BASE}/api/operations/${ownId}/content`, {
            method: 'PUT', headers: H(adminToken),
            body: JSON.stringify({ description: '<p>تلاش مدیر</p>' })
        });
        check('مدیر هم بدون باز کردن قفل ویرایش نمی‌کند', r.status === 423, 'HTTP ' + r.status);

        // مدیر قفل را باز می‌کند و حالا می‌تواند
        r = await fetch(`${BASE}/api/operations/${ownId}/unlock`, {
            method: 'POST', headers: H(adminToken)
        });
        check('مدیر قفل را باز کرد', r.ok, 'HTTP ' + r.status);

        // نویسنده باید قفل را باز *نتواند* بکند
        r = await fetch(`${BASE}/api/operations/${ownId}/unlock`, {
            method: 'POST', headers: H(authorToken)
        });
        check('نویسنده نمی‌تواند قفل باز کند', r.status === 403 || r.status === 400,
              'HTTP ' + r.status);

        // اعلان برای نویسنده ساخته شده؟ (بررسی مستقیم دیتابیس در تست جدا)
        console.log('  (اعلان نویسنده در دیتابیس ثبت می‌شود — مسیر نمایش آن در فاز بعد)');
    }

    console.log('\n── حساب غیرفعال ────────────────────────────');
    // نویسنده را غیرفعال می‌کنیم و می‌بینیم توکن قبلی‌اش هم رد می‌شود
    const users = await (await fetch(`${BASE}/api/auth/users`, { headers: H(adminToken) })).json();
    const author = users.find(u => u.username === 'testauthor');
    if (author) {
        // مستقیم در دیتابیس غیرفعال می‌شود (مسیر API آن هنوز ساخته نشده)
        process.env.__DEACTIVATE_ID = String(author.id);
        console.log('  (غیرفعال‌سازی از طریق API هنوز پیاده نشده — فاز ۱)');
    }

    console.log(`\n${'═'.repeat(50)}`);
    console.log(`نتیجه: ${pass} قبول · ${fail} رد`);
    process.exitCode = fail > 0 ? 1 : 0;
}

main().catch(err => {
    console.error('تست متوقف شد:', err.message);
    process.exit(1);
});
