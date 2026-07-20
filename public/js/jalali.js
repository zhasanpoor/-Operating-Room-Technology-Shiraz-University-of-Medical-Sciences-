/**
 * تبدیل تاریخ میلادی ⇄ شمسی + قالب‌بندی فارسی.
 *
 * این فایل هم در سرور (require) و هم در مرورگر (script tag) کار می‌کند
 * تا منطق تاریخ در دو جا تکرار نشود.
 *
 * الگوریتم تبدیل: jalaali-js (Behrang Noruzi Niya) — پیاده‌سازی استاندارد.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.Jalali = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
                  1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

    var MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
                  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

    var WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه',
                    'پنجشنبه', 'جمعه', 'شنبه'];

    function div(a, b) { return ~~(a / b); }
    function mod(a, b) { return a - ~~(a / b) * b; }

    /** اطلاعات سال کبیسه و مبدأ فروردین برای یک سال شمسی. */
    function jalCal(jy) {
        var bl = breaks.length,
            gy = jy + 621,
            leapJ = -14,
            jp = breaks[0],
            jm, jump, leap, leapG, march, n, i;

        if (jy < jp || jy >= breaks[bl - 1]) {
            throw new Error('سال شمسی خارج از محدودهٔ پشتیبانی: ' + jy);
        }

        for (i = 1; i < bl; i += 1) {
            jm = breaks[i];
            jump = jm - jp;
            if (jy < jm) break;
            leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
            jp = jm;
        }
        n = jy - jp;

        leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
        if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

        leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
        march = 20 + leapJ - leapG;

        if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
        leap = mod(mod(n + 1, 33) - 1, 4);
        if (leap === -1) leap = 4;

        return { leap: leap, gy: gy, march: march };
    }

    /** تاریخ میلادی → روز جولیَن. */
    function g2d(gy, gm, gd) {
        var d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4)
              + div(153 * mod(gm + 9, 12) + 2, 5)
              + gd - 34840408;
        d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
        return d;
    }

    /** روز جولیَن → تاریخ میلادی. */
    function d2g(jdn) {
        var j, i, gd, gm, gy;
        j = 4 * jdn + 139361631;
        j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
        i = div(mod(j, 1461), 4) * 5 + 308;
        gd = div(mod(i, 153), 5) + 1;
        gm = mod(div(i, 153), 12) + 1;
        gy = div(j, 1461) - 100100 + div(8 - gm, 6);
        return { gy: gy, gm: gm, gd: gd };
    }

    /**
     * تاریخ شمسی → روز جولیَن.
     * جملهٔ `div(jm,7)*(jm-7)` تفاوت ماه‌های ۳۱ روزهٔ نیمهٔ اول سال با
     * ماه‌های ۳۰ روزهٔ نیمهٔ دوم را جبران می‌کند (برای ماه ۷ باید صفر شود).
     */
    function j2d(jy, jm, jd) {
        var r = jalCal(jy);
        return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
    }

    /** روز جولیَن → تاریخ شمسی. */
    function d2j(jdn) {
        var gy = d2g(jdn).gy,
            jy = gy - 621,
            r = jalCal(jy),
            jdn1f = g2d(gy, 3, r.march),
            jm, jd, k;

        k = jdn - jdn1f;
        if (k >= 0) {
            if (k <= 185) {
                jm = 1 + div(k, 31);
                jd = mod(k, 31) + 1;
                return { jy: jy, jm: jm, jd: jd };
            }
            k -= 186;
        } else {
            jy -= 1;
            k += 179;
            if (r.leap === 1) k += 1;
        }
        jm = 7 + div(k, 30);
        jd = mod(k, 30) + 1;
        return { jy: jy, jm: jm, jd: jd };
    }

    function toJalaali(gy, gm, gd) { return d2j(g2d(gy, gm, gd)); }
    function toGregorian(jy, jm, jd) { return d2g(j2d(jy, jm, jd)); }

    // ── کمکی‌های نمایش ──────────────────────────────────────────────

    var FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

    /** ارقام لاتین را به فارسی تبدیل می‌کند. */
    function toFaDigits(input) {
        return String(input).replace(/[0-9]/g, function (d) { return FA_DIGITS[+d]; });
    }

    function pad2(n) { return n < 10 ? '0' + n : String(n); }

    /**
     * ورودی را به شیء Date تبدیل می‌کند.
     * رشته‌های SQLite ("YYYY-MM-DD HH:MM:SS") بدون منطقه‌زمانی ذخیره
     * می‌شوند و UTC هستند، پس صریحاً به‌عنوان UTC تفسیر می‌شوند.
     */
    function parseDate(value) {
        if (value instanceof Date) return value;
        if (typeof value === 'number') return new Date(value);
        if (!value) return null;

        var s = String(value).trim();
        var sqlite = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(s);
        if (sqlite) {
            return new Date(Date.UTC(+sqlite[1], +sqlite[2] - 1, +sqlite[3],
                                     +sqlite[4], +sqlite[5], +sqlite[6]));
        }
        var dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
        if (dateOnly) {
            return new Date(Date.UTC(+dateOnly[1], +dateOnly[2] - 1, +dateOnly[3]));
        }
        var parsed = new Date(s);
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    /**
     * قالب‌بندی تاریخ به شمسی.
     * حالت‌ها: 'short' → ۱۴۰۳/۰۵/۰۲ · 'long' → ۲ مرداد ۱۴۰۳
     *          'full'  → پنجشنبه ۲ مرداد ۱۴۰۳ · 'datetime' → ۲ مرداد ۱۴۰۳، ساعت ۱۴:۳۰
     */
    function format(value, style) {
        var date = parseDate(value);
        if (!date) return '—';

        var j = toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate());
        var out;

        switch (style || 'long') {
            case 'short':
                out = j.jy + '/' + pad2(j.jm) + '/' + pad2(j.jd);
                break;
            case 'full':
                out = WEEKDAYS[date.getDay()] + ' ' + j.jd + ' ' + MONTHS[j.jm - 1] + ' ' + j.jy;
                break;
            case 'datetime':
                out = j.jd + ' ' + MONTHS[j.jm - 1] + ' ' + j.jy + '، ساعت '
                    + pad2(date.getHours()) + ':' + pad2(date.getMinutes());
                break;
            default:
                out = j.jd + ' ' + MONTHS[j.jm - 1] + ' ' + j.jy;
        }
        return toFaDigits(out);
    }

    /** زمان نسبی خودمانی: «۳ ساعت پیش»، «همین الان». */
    function relative(value) {
        var date = parseDate(value);
        if (!date) return '—';

        var seconds = Math.floor((Date.now() - date.getTime()) / 1000);

        if (seconds < 0) return format(value, 'long');        // تاریخ آینده
        if (seconds < 60) return 'همین الان';
        if (seconds < 3600) return toFaDigits(Math.floor(seconds / 60)) + ' دقیقه پیش';
        if (seconds < 86400) return toFaDigits(Math.floor(seconds / 3600)) + ' ساعت پیش';
        if (seconds < 604800) return toFaDigits(Math.floor(seconds / 86400)) + ' روز پیش';
        if (seconds < 2592000) return toFaDigits(Math.floor(seconds / 604800)) + ' هفته پیش';

        return format(value, 'long');
    }

    return {
        toJalaali: toJalaali,
        toGregorian: toGregorian,
        format: format,
        relative: relative,
        toFaDigits: toFaDigits,
        MONTHS: MONTHS,
        WEEKDAYS: WEEKDAYS
    };
}));
