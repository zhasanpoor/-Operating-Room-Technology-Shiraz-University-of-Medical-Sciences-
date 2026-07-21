/**
 * ارسال ایمیل — تأیید حساب و بازیابی رمز.
 *
 * طراحی برای شرایط واقعی این پروژه:
 *   • تا وقتی SMTP تنظیم نشده، ایمیل‌ها به‌جای ارسال در **کنسول چاپ**
 *     می‌شوند. یعنی کل جریان ثبت‌نام و فعال‌سازی همین حالا قابل تست است
 *     و بعداً فقط چند متغیر محیطی اضافه می‌شود.
 *   • خطای ارسال هرگز ثبت‌نام کاربر را شکست نمی‌دهد؛ فقط لاگ می‌شود.
 */

const crypto = require('crypto');

let nodemailer = null;
try {
    nodemailer = require('nodemailer');
} catch (err) {
    console.warn('⚠️  nodemailer نصب نیست — ایمیل‌ها فقط در کنسول چاپ می‌شوند.');
}

let transporter = null;
let mailerReady = false;

/** آیا SMTP پیکربندی شده است؟ */
function isConfigured() {
    return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
    if (transporter || !isConfigured() || !nodemailer) return transporter;

    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        // پورت ۴۶۵ همیشه TLS مستقیم است، بقیه STARTTLS
        secure: parseInt(process.env.SMTP_PORT, 10) === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        connectionTimeout: 10000
    });
    mailerReady = true;
    return transporter;
}

/**
 * ارسال ایمیل. اگر SMTP نباشد، محتوا در کنسول چاپ می‌شود.
 * @returns {Promise<{sent:boolean, reason?:string}>}
 */
async function sendMail({ to, subject, html, text }) {
    if (!isConfigured() || !nodemailer) {
        console.log('\n' + '─'.repeat(64));
        console.log('📧 ایمیل (ارسال نشد — SMTP تنظیم نشده):');
        console.log('   گیرنده: ' + to);
        console.log('   موضوع:  ' + subject);
        console.log('   متن:    ' + (text || '').replace(/\n/g, '\n           '));
        console.log('─'.repeat(64) + '\n');
        return { sent: false, reason: 'smtp_not_configured' };
    }

    try {
        const from = process.env.SMTP_FROM
            || `"تکنولوژی اتاق عمل" <${process.env.SMTP_USER}>`;
        await getTransporter().sendMail({ from, to, subject, html, text });
        return { sent: true };
    } catch (err) {
        console.error('ارسال ایمیل ناموفق بود:', err.message);
        return { sent: false, reason: err.message };
    }
}

// ── توکن‌های ایمیل ──────────────────────────────────────────────────

/**
 * توکن تصادفی می‌سازد و **هش آن** را برمی‌گرداند.
 * خود توکن در دیتابیس ذخیره نمی‌شود؛ اگر دیتابیس لو برود، کسی نمی‌تواند
 * با آن حساب‌ها را فعال یا رمز را بازنشانی کند.
 */
function createToken() {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return { token, hash };
}

function hashToken(token) {
    return crypto.createHash('sha256').update(String(token)).digest('hex');
}

// ── قالب ایمیل ──────────────────────────────────────────────────────

function layout(title, bodyHtml) {
    return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head><meta charset="UTF-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:Tahoma,Arial,sans-serif;direction:rtl">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 12px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
        <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px;text-align:center">
          <div style="font-size:34px">🏥</div>
          <div style="color:#fff;font-size:18px;font-weight:bold;margin-top:8px">تکنولوژی اتاق عمل</div>
        </td></tr>
        <tr><td style="padding:32px 28px;color:#1f2937;font-size:14px;line-height:2">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:18px;text-align:center;color:#9ca3af;font-size:11.5px;border-top:1px solid #eee">
          این ایمیل به‌صورت خودکار ارسال شده است. اگر شما درخواستش نکرده‌اید، نادیده بگیرید.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function button(href, label) {
    return `<div style="text-align:center;margin:26px 0">
      <a href="${href}" style="display:inline-block;background:#6366f1;color:#fff;
         text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:bold">
        ${label}
      </a>
    </div>`;
}

/** ایمیل فعال‌سازی حساب. */
async function sendVerificationEmail(to, name, verifyUrl) {
    const html = layout('فعال‌سازی حساب', `
        <p style="font-size:16px;font-weight:bold">سلام ${escape(name)} 👋</p>
        <p>خوش اومدی! برای فعال شدن حسابت روی دکمهٔ زیر بزن:</p>
        ${button(verifyUrl, '✅ فعال‌سازی حساب')}
        <p style="color:#6b7280;font-size:12.5px">
          اگر دکمه کار نکرد، این نشانی را در مرورگر باز کن:<br>
          <span style="word-break:break-all;color:#6366f1">${verifyUrl}</span>
        </p>
        <p style="color:#6b7280;font-size:12.5px">این لینک تا ۲۴ ساعت معتبر است.</p>`);

    return sendMail({
        to,
        subject: 'فعال‌سازی حساب — تکنولوژی اتاق عمل',
        html,
        text: `سلام ${name}!\nبرای فعال‌سازی حسابت این نشانی را باز کن:\n${verifyUrl}\n(تا ۲۴ ساعت معتبر است)`
    });
}

/** ایمیل بازیابی رمز عبور. */
async function sendPasswordResetEmail(to, name, resetUrl) {
    const html = layout('بازیابی رمز عبور', `
        <p style="font-size:16px;font-weight:bold">سلام ${escape(name)}</p>
        <p>برای تعیین رمز جدید روی دکمهٔ زیر بزن:</p>
        ${button(resetUrl, '🔑 تعیین رمز جدید')}
        <p style="color:#6b7280;font-size:12.5px">
          اگر دکمه کار نکرد، این نشانی را باز کن:<br>
          <span style="word-break:break-all;color:#6366f1">${resetUrl}</span>
        </p>
        <p style="color:#b91c1c;font-size:12.5px">
          این لینک فقط ۱ ساعت معتبر است. اگر شما درخواست نکرده‌اید،
          رمزتان را عوض کنید.
        </p>`);

    return sendMail({
        to,
        subject: 'بازیابی رمز عبور — تکنولوژی اتاق عمل',
        html,
        text: `سلام ${name}\nبرای تعیین رمز جدید این نشانی را باز کن:\n${resetUrl}\n(تا ۱ ساعت معتبر است)`
    });
}

/** فرار دادن HTML در متن ایمیل. */
function escape(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = {
    sendMail, sendVerificationEmail, sendPasswordResetEmail,
    createToken, hashToken, isConfigured
};
