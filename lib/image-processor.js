/**
 * بهینه‌سازی تصاویر آپلودشده.
 *
 * چرا با احتیاط؟ `sharp` یک ماژول *بومی* (native) است — همان دسته‌ای که
 * قبلاً باعث شد `better-sqlite3` روی سرور کامپایل نشود. اگر روی هاست
 * جدید بارگذاری نشود، **نباید کل آپلود از کار بیفتد**. پس:
 *
 *   • بارگذاری sharp داخل try/catch است
 *   • اگر در دسترس نباشد، فایل اصلی بدون تغییر ذخیره می‌شود
 *   • هر خطای پردازش هم به همان حالت امن برمی‌گردد
 *
 * یعنی بهینه‌سازی یک «بهبود» است، نه یک وابستگی حیاتی.
 */

const fs = require('fs');
const path = require('path');

let sharp = null;
let sharpAvailable = false;

try {
    sharp = require('sharp');
    sharpAvailable = true;
} catch (err) {
    console.warn('⚠️  ماژول sharp در دسترس نیست — تصاویر بدون بهینه‌سازی ذخیره می‌شوند.');
    console.warn('   دلیل:', String(err.message).split('\n')[0]);
}

/** اندازه‌های استاندارد سایت. */
const PRESETS = {
    content: { width: 1600, height: 1600, quality: 82 },  // تصویر داخل مطلب
    avatar:  { width: 400,  height: 400,  quality: 85 },  // عکس پروفایل
    thumb:   { width: 400,  height: 400,  quality: 75 }   // بندانگشتی
};

function isAvailable() { return sharpAvailable; }

/**
 * تصویر را بهینه می‌کند: تغییر اندازه، فشرده‌سازی، و حذف متادیتا.
 *
 * حذف EXIF فقط برای حجم نیست — عکس گوشی می‌تواند **مختصات جغرافیایی**
 * محل گرفته شدن را همراه داشته باشد. انتشار آن یعنی لو رفتن محل کار یا
 * زندگی کاربر، پس در هر حالت پاک می‌شود.
 *
 * @returns {Promise<{optimized:boolean, width?:number, height?:number,
 *                    sizeBefore:number, sizeAfter:number, thumb?:string}>}
 */
async function optimizeImage(filePath, options = {}) {
    const preset = PRESETS[options.preset || 'content'] || PRESETS.content;
    const sizeBefore = safeSize(filePath);

    if (!sharpAvailable) {
        return { optimized: false, sizeBefore, sizeAfter: sizeBefore };
    }

    const tempPath = filePath + '.tmp';

    try {
        const image = sharp(filePath, { failOn: 'none' });
        const meta = await image.metadata();

        // تصویر کوچک‌تر از حد هدف بزرگ‌نمایی نمی‌شود
        const needsResize = (meta.width && meta.width > preset.width)
                         || (meta.height && meta.height > preset.height);

        // `.rotate()` بدون آرگومان، عکس را بر اساس جهت EXIF می‌چرخاند.
        // این باید *قبل* از دور ریختن متادیتا انجام شود وگرنه عکس‌های
        // گوشی کج ذخیره می‌شوند.
        //
        // نکته: `withMetadata()` در sharp متادیتا را **نگه می‌دارد**، نه
        // اینکه پاکش کند. sharp به‌صورت پیش‌فرض متادیتا را دور می‌ریزد،
        // پس برای حذف EXIF کافی است اصلاً صدایش نزنیم.
        let pipeline = image.rotate();

        if (needsResize) {
            pipeline = pipeline.resize(preset.width, preset.height, {
                fit: 'inside',
                withoutEnlargement: true
            });
        }

        // فرمت خروجی: PNG با شفافیت PNG می‌ماند، بقیه به JPEG بهینه
        const isPng = meta.format === 'png';
        const hasAlpha = meta.hasAlpha;

        if (isPng && hasAlpha) {
            pipeline = pipeline.png({ compressionLevel: 9, palette: true });
        } else if (meta.format === 'webp') {
            pipeline = pipeline.webp({ quality: preset.quality });
        } else {
            pipeline = pipeline.jpeg({ quality: preset.quality, mozjpeg: true });
        }

        await pipeline.toFile(tempPath);

        const sizeAfter = safeSize(tempPath);

        // اگر بهینه‌سازی فایل را بزرگ‌تر کرد، اصل را نگه می‌داریم
        if (sizeAfter > 0 && sizeAfter < sizeBefore) {
            fs.renameSync(tempPath, filePath);
        } else {
            safeUnlink(tempPath);
            return { optimized: false, sizeBefore, sizeAfter: sizeBefore,
                     width: meta.width, height: meta.height };
        }

        const result = {
            optimized: true,
            width: needsResize ? undefined : meta.width,
            height: needsResize ? undefined : meta.height,
            sizeBefore,
            sizeAfter: safeSize(filePath)
        };

        if (options.thumbnail) {
            result.thumb = await makeThumbnail(filePath);
        }
        return result;

    } catch (err) {
        console.error('بهینه‌سازی تصویر ناموفق بود:', err.message);
        safeUnlink(tempPath);
        // فایل اصلی دست‌نخورده باقی می‌ماند
        return { optimized: false, sizeBefore, sizeAfter: sizeBefore };
    }
}

/** نسخهٔ بندانگشتی می‌سازد و نام فایلش را برمی‌گرداند. */
async function makeThumbnail(filePath) {
    if (!sharpAvailable) return null;
    try {
        const dir = path.dirname(filePath);
        const ext = path.extname(filePath);
        const base = path.basename(filePath, ext);
        const thumbName = `${base}-thumb.jpg`;

        await sharp(filePath, { failOn: 'none' })
            .resize(PRESETS.thumb.width, PRESETS.thumb.height,
                    { fit: 'cover', position: 'centre' })
            .jpeg({ quality: PRESETS.thumb.quality })
            .toFile(path.join(dir, thumbName));

        return thumbName;
    } catch (err) {
        return null;
    }
}

/** آیا این نوع MIME تصویر قابل پردازش است؟ */
function isProcessableImage(mimetype) {
    return /^image\/(jpeg|png|webp|gif|tiff|avif)$/.test(String(mimetype || ''));
}

function safeSize(p) {
    try { return fs.statSync(p).size; } catch (e) { return 0; }
}
function safeUnlink(p) {
    try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (e) { /* بی‌اهمیت */ }
}

/** خلاصهٔ خوانا از نتیجهٔ بهینه‌سازی — برای پیام به کاربر. */
function describeSaving(result) {
    if (!result.optimized || !result.sizeBefore) return '';
    const saved = result.sizeBefore - result.sizeAfter;
    if (saved <= 0) return '';
    const percent = Math.round((saved / result.sizeBefore) * 100);
    return `${percent}٪ کم‌حجم‌تر شد`;
}

module.exports = {
    optimizeImage, makeThumbnail, isProcessableImage,
    isAvailable, describeSaving, PRESETS
};
