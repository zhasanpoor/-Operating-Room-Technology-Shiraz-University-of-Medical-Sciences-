/**
 * ساخت آدرس خوانا (slug) از نام عمل جراحی.
 *
 * نام‌ها ترکیبی از فارسی و انگلیسی‌اند (مثلاً «APPENDECTOMY» یا
 * «آپاندکتومی»). هر دو باید به آدرسی تبدیل شوند که:
 *   • در URL بدون encode شدن خوانا بماند
 *   • یکتا باشد
 *   • برای موتور جستجو معنادار باشد
 *
 * حروف فارسی در URL مجازند (RFC 3987) و مرورگرها درست نمایششان می‌دهند،
 * پس آن‌ها را حذف نمی‌کنیم — فقط فاصله و نویسه‌های خطرناک را پاک می‌کنیم.
 */

/** نویسه‌های عربی را به معادل فارسی استاندارد تبدیل می‌کند. */
function normalizePersian(text) {
    return String(text)
        .replace(/[يى]/g, 'ی')   // ي ,ى → ی
        .replace(/ك/g, 'ک')           // ك → ک
        .replace(/[ً-ٰٟ]/g, '') // اعراب
        .replace(/‌/g, '-');          // نیم‌فاصله → خط تیره
}

/**
 * @param {string} name نام عمل
 * @param {string} [opNumber] شمارهٔ عمل — برای یکتا کردن
 * @returns {string}
 */
function makeSlug(name, opNumber) {
    let slug = normalizePersian(name || '')
        .toLowerCase()
        .trim()
        .replace(/[\s_]+/g, '-')                    // فاصله → خط تیره
        .replace(/[^\w؀-ۿ-]/g, '')        // فقط حرف، عدد، فارسی، خط تیره
        .replace(/-{2,}/g, '-')                     // خط تیره تکراری
        .replace(/^-+|-+$/g, '');                   // خط تیره ابتدا و انتها

    if (!slug) slug = 'operation';
    if (opNumber) {
        const num = String(opNumber).trim().replace(/[^\w-]/g, '');
        if (num) slug = `${num}-${slug}`;
    }
    return slug.slice(0, 120);
}

/**
 * slug یکتا می‌سازد؛ اگر تکراری بود عدد به انتهایش اضافه می‌کند.
 * @param {Set<string>} taken مجموعهٔ slugهای گرفته‌شده
 */
function uniqueSlug(name, opNumber, taken) {
    const base = makeSlug(name, opNumber);
    if (!taken.has(base)) { taken.add(base); return base; }
    let i = 2;
    while (taken.has(`${base}-${i}`)) i++;
    const result = `${base}-${i}`;
    taken.add(result);
    return result;
}

module.exports = { makeSlug, uniqueSlug, normalizePersian };
