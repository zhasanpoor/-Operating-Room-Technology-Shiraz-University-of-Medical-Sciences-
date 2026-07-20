/** تست لایهٔ پاک‌سازی و شناسایی حمله. اجرا: npm run test:security */
const S = require('../lib/sanitize');

let pass = 0, fail = 0;
function check(label, condition, detail) {
    if (condition) { pass++; console.log('  ✓ ' + label); }
    else { fail++; console.log('  ✗ ' + label + (detail ? '  → ' + detail : '')); }
}

console.log('\n── پاک‌سازی XSS ─────────────────────────────');
const xssPayloads = [
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    '<a href="javascript:alert(1)">کلیک</a>',
    '<iframe src="//evil.com"></iframe>',
    '<svg/onload=alert(1)>',
    '<body onload=alert(1)>',
    '<div style="background:url(javascript:alert(1))">x</div>',
    '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">x</a>',
    '<object data="evil.swf"></object>',
    '<form action="//evil.com"><input name="p"></form>'
];
for (const payload of xssPayloads) {
    const clean = S.sanitizeRichText(payload);
    const dangerous = /<\s*(script|iframe|object|embed|svg|form)\b/i.test(clean)
                   || /\bon\w+\s*=/i.test(clean)
                   || /javascript\s*:/i.test(clean)
                   || /data\s*:\s*text\/html/i.test(clean);
    check(payload.slice(0, 48), !dangerous, 'خروجی: ' + clean.slice(0, 60));
}

console.log('\n── محتوای سالم باید حفظ شود ─────────────────');
const safeHtml = '<p>شرح <strong>عمل</strong> جراحی</p><ul><li>اسکالپل</li><li>پنس</li></ul>';
const kept = S.sanitizeRichText(safeHtml);
check('تگ‌های مجاز حفظ شدند', kept.includes('<strong>') && kept.includes('<li>'), kept);

const link = S.sanitizeRichText('<a href="https://example.com">منبع</a>');
check('لینک خارجی امن‌سازی شد (noopener)',
      link.includes('rel="noopener') && link.includes('target="_blank"'), link);

const img = S.sanitizeRichText('<img src="/uploads/1.png" alt="ابزار">');
check('تصویر مجاز حفظ شد', img.includes('<img') && img.includes('/uploads/1.png'), img);

console.log('\n── متن ساده ────────────────────────────────');
check('تگ‌ها از متن ساده حذف شدند',
      S.sanitizePlainText('<b>آپاندکتومی</b><script>x</script>') === 'آپاندکتومی',
      S.sanitizePlainText('<b>آپاندکتومی</b><script>x</script>'));

console.log('\n── شناسایی تهدید ───────────────────────────');
const threats = [
    ['<script>alert(1)</script>', 'xss'],
    ['%3Cscript%3Ealert(1)%3C/script%3E', 'xss'],              // URL-encoded
    ['&#x3c;script&#x3e;alert(1)&#x3c;/script&#x3e;', 'xss'],  // HTML entity
    ["' OR 1=1 --", 'sqli'],
    ['1 UNION SELECT password FROM users', 'sqli'],
    ['; DROP TABLE users;', 'sqli'],
    ['../../../etc/passwd', 'path_traversal'],
    ['x; cat /etc/passwd', 'command_injection'],
    ['{{constructor.constructor("alert(1)")()}}', 'template_injection'],
    ['{"__proto__": {"admin": true}}', 'prototype_pollution']
];
for (const [payload, expectedType] of threats) {
    const found = S.detectThreats(payload);
    check(`${expectedType}: ${payload.slice(0, 42)}`,
          found.some(t => t.type === expectedType),
          'یافت شد: ' + JSON.stringify(found.map(t => t.type)));
}

console.log('\n── متن سالم نباید هشدار بدهد (false positive) ──');
const benign = [
    'آپاندکتومی یک عمل جراحی شکمی است.',
    'وسایل مورد نیاز: اسکالپل شماره ۱۰، پنس کوخر، قیچی متزنبام',
    'بیمار در وضعیت سوپاین قرار می‌گیرد و برش در ناحیه McBurney زده می‌شود.',
    'دمای اتاق باید بین 20 و 24 درجه باشد',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    '<p>محتوای معمولی با <strong>تأکید</strong></p>'
];
for (const text of benign) {
    const found = S.detectThreats(text);
    check('بی‌خطر: ' + text.slice(0, 44), found.length === 0,
          'هشدار اشتباه: ' + JSON.stringify(found.map(t => t.label)));
}

console.log('\n── اعتبارسنجی لینک ویدیو ───────────────────');
const videoCases = [
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', true, 'youtube'],
    ['https://youtu.be/dQw4w9WgXcQ', true, 'youtube'],
    ['https://www.aparat.com/v/abc123', true, 'aparat'],
    ['https://vimeo.com/123456789', true, 'vimeo'],
    ['https://evil.com/video', false, null],
    ['javascript:alert(1)', false, null],
    ['http://localhost:3000/admin', false, null],
    ['http://169.254.169.254/latest/meta-data/', false, null],   // SSRF ابری
    ['', true, '']
];
for (const [url, shouldPass, provider] of videoCases) {
    const result = S.validateVideoUrl(url);
    const ok = result.ok === shouldPass && (!provider || result.provider === provider);
    check(`${url.slice(0, 46) || '(خالی)'} → ${shouldPass ? 'مجاز' : 'رد'}`,
          ok, JSON.stringify(result));
}

const embed = S.validateVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
check('نشانی embed بدون کوکی ساخته شد',
      embed.embed === 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', embed.embed);

console.log('\n── نام فایل امن ────────────────────────────');
const files = [
    ['../../etc/passwd', /^[^\/\\]*$/],
    ['..\\..\\windows\\system32', /^[^\/\\]*$/],
    ['عمل جراحی.png', /عمل/],
    ['.htaccess', /^[^.]/],
    ['shell.php;.jpg', /^[^;]*$/]
];
for (const [name, expected] of files) {
    const safe = S.safeFilename(name);
    check(`${name} → ${safe}`, expected.test(safe), safe);
}

console.log(`\n${'═'.repeat(50)}`);
console.log(`نتیجه: ${pass} قبول · ${fail} رد`);
process.exit(fail > 0 ? 1 : 0);
