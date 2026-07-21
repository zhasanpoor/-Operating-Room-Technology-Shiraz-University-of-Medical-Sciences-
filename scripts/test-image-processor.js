/** تست بهینه‌سازی تصویر: تغییر اندازه، فشرده‌سازی، و حذف متادیتای مکان. */
const fs = require('fs');
const path = require('path');
const os = require('os');
const ip = require('../lib/image-processor');

let pass = 0, fail = 0;
const check = (l, ok, d) => { ok ? (pass++, console.log('  ✓ ' + l))
    : (fail++, console.log('  ✗ ' + l + (d ? '\n      → ' + d : ''))); };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'imgtest-'));

(async () => {
    console.log('\n── در دسترس بودن ───────────────────────────');
    check('sharp بارگذاری شد', ip.isAvailable());
    if (!ip.isAvailable()) {
        console.log('  (بدون sharp، بهینه‌سازی رد می‌شود ولی آپلود کار می‌کند)');
        process.exit(0);
    }

    const sharp = require('sharp');

    console.log('\n── تغییر اندازهٔ تصویر بزرگ ─────────────────');
    const big = path.join(tmp, 'big.jpg');
    await sharp({ create: { width: 4000, height: 3000, channels: 3,
                            background: { r: 200, g: 40, b: 40 } } })
        .jpeg({ quality: 100 }).toFile(big);

    const beforeSize = fs.statSync(big).size;
    const result = await ip.optimizeImage(big, { preset: 'content' });
    const meta = await sharp(big).metadata();

    check('تصویر بهینه شد', result.optimized, JSON.stringify(result));
    check('عرض به حداکثر مجاز کاهش یافت', meta.width <= 1600, `width=${meta.width}`);
    check('نسبت ابعاد حفظ شد', Math.abs(meta.width / meta.height - 4000 / 3000) < 0.02,
          `${meta.width}x${meta.height}`);
    check('حجم کم شد', result.sizeAfter < beforeSize,
          `${beforeSize} → ${result.sizeAfter}`);
    console.log('    ' + ip.describeSaving(result));

    console.log('\n── حذف متادیتای مکان (EXIF GPS) ────────────');
    const withGps = path.join(tmp, 'gps.jpg');
    await sharp({ create: { width: 2000, height: 1500, channels: 3,
                            background: { r: 30, g: 90, b: 200 } } })
        .withMetadata({
            exif: {
                IFD0: { Copyright: 'test' },
                GPSIFD: { GPSLatitude: '29/1 36/1 0/1', GPSLongitude: '52/1 32/1 0/1' }
            }
        })
        .jpeg().toFile(withGps);

    const gpsBefore = await sharp(withGps).metadata();
    await ip.optimizeImage(withGps, { preset: 'content' });
    const gpsAfter = await sharp(withGps).metadata();

    check('عکس اولیه واقعاً EXIF داشت', !!gpsBefore.exif, String(!!gpsBefore.exif));
    check('EXIF پس از پردازش حذف شد', !gpsAfter.exif,
          gpsAfter.exif ? 'هنوز ' + gpsAfter.exif.length + ' بایت EXIF دارد' : 'پاک شد');

    console.log('\n── تصویر کوچک نباید بزرگ‌نمایی شود ─────────');
    const small = path.join(tmp, 'small.png');
    await sharp({ create: { width: 300, height: 200, channels: 4,
                            background: { r: 0, g: 0, b: 0, alpha: 0.5 } } })
        .png().toFile(small);
    await ip.optimizeImage(small, { preset: 'content' });
    const smallMeta = await sharp(small).metadata();
    check('ابعاد تصویر کوچک دست‌نخورده ماند',
          smallMeta.width === 300 && smallMeta.height === 200,
          `${smallMeta.width}x${smallMeta.height}`);
    check('شفافیت PNG حفظ شد', smallMeta.hasAlpha, String(smallMeta.hasAlpha));

    console.log('\n── آواتار ──────────────────────────────────');
    const av = path.join(tmp, 'avatar.jpg');
    await sharp({ create: { width: 2400, height: 2400, channels: 3,
                            background: { r: 10, g: 200, b: 120 } } })
        .jpeg().toFile(av);
    await ip.optimizeImage(av, { preset: 'avatar' });
    const avMeta = await sharp(av).metadata();
    check('آواتار به ۴۰۰ پیکسل کاهش یافت', avMeta.width <= 400, `width=${avMeta.width}`);

    console.log('\n── بندانگشتی ───────────────────────────────');
    const forThumb = path.join(tmp, 'thumb-src.jpg');
    await sharp({ create: { width: 1200, height: 800, channels: 3,
                            background: { r: 120, g: 60, b: 200 } } })
        .jpeg().toFile(forThumb);
    const thumbName = await ip.makeThumbnail(forThumb);
    check('فایل بندانگشتی ساخته شد', !!thumbName && fs.existsSync(path.join(tmp, thumbName)),
          String(thumbName));

    console.log('\n── فایل خراب نباید سرور را بخواباند ────────');
    const broken = path.join(tmp, 'broken.jpg');
    fs.writeFileSync(broken, Buffer.from('این اصلاً عکس نیست، فقط متن است'));
    const brokenResult = await ip.optimizeImage(broken, { preset: 'content' });
    check('فایل خراب بدون پرتاب خطا مدیریت شد', brokenResult.optimized === false,
          JSON.stringify(brokenResult));
    check('فایل اصلی دست‌نخورده باقی ماند', fs.existsSync(broken));

    console.log('\n── تشخیص نوع قابل پردازش ───────────────────');
    check('image/jpeg قابل پردازش', ip.isProcessableImage('image/jpeg'));
    check('image/png قابل پردازش', ip.isProcessableImage('image/png'));
    check('application/pdf قابل پردازش نیست', !ip.isProcessableImage('application/pdf'));
    check('video/mp4 قابل پردازش نیست', !ip.isProcessableImage('video/mp4'));

    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`نتیجه: ${pass} قبول · ${fail} رد`);
    process.exitCode = fail > 0 ? 1 : 0;
})().catch(e => {
    console.error('تست متوقف شد:', e.stack);
    fs.rmSync(tmp, { recursive: true, force: true });
    process.exit(1);
});
