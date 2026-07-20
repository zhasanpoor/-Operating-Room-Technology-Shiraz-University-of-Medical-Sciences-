/**
 * سئو: نقشهٔ سایت، robots.txt و متاتگ‌های هر صفحه.
 *
 * نکتهٔ مهم دربارهٔ متاتگ‌ها: سایت ما تک‌صفحه‌ای (SPA) است و محتوا با
 * جاوااسکریپت لود می‌شود. ربات‌های شبکه‌های اجتماعی (تلگرام، واتساپ،
 * توییتر) جاوااسکریپت اجرا **نمی‌کنند** — فقط HTML اولیه را می‌خوانند.
 * پس برای اینکه هنگام اشتراک‌گذاری عنوان و توضیح درست نشان داده شود،
 * باید متاتگ‌ها را سمت *سرور* داخل HTML تزریق کنیم.
 */

const { escapeHtml } = require('./sanitize');

/** متن را برای استفاده در توضیحات متا کوتاه و بدون تگ می‌کند. */
function toDescription(html, fallback, maxLength = 160) {
    const text = String(html || '')
        .replace(/<[^>]*>/g, ' ')      // حذف تگ‌ها
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const source = text || fallback || '';
    if (source.length <= maxLength) return source;
    return source.slice(0, maxLength - 1).replace(/\s+\S*$/, '') + '…';
}

/**
 * متاتگ‌های یک عمل جراحی را می‌سازد.
 * @returns {string} رشتهٔ HTML شامل تگ‌های meta و JSON-LD
 */
function operationMeta(operation, baseUrl) {
    const title = `${operation.name} — تکنولوژی اتاق عمل`;
    const description = toDescription(
        operation.description,
        `شرح کامل عمل ${operation.name}، وسایل مورد نیاز و فیلم آموزشی برای دانشجویان اتاق عمل.`
    );
    const url = `${baseUrl}/op/${operation.slug || operation.id}`;
    const image = `${baseUrl}/og-image.png`;

    // داده‌های ساختاریافته — به گوگل می‌گوید این یک مقالهٔ پزشکی است
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'MedicalWebPage',
        name: operation.name,
        description,
        url,
        inLanguage: 'fa-IR',
        about: { '@type': 'MedicalProcedure', name: operation.name },
        isPartOf: { '@type': 'WebSite', name: 'تکنولوژی اتاق عمل', url: baseUrl }
    };
    if (operation.author_name) {
        jsonLd.author = { '@type': 'Person', name: operation.author_name };
    }
    if (operation.published_at) {
        jsonLd.datePublished = String(operation.published_at).replace(' ', 'T');
    }

    return buildTags({ title, description, url, image, jsonLd });
}

/** متاتگ‌های پیش‌فرض صفحهٔ اصلی. */
function defaultMeta(baseUrl) {
    return buildTags({
        title: 'تکنولوژی اتاق عمل — ویژه دانشجویان و متخصصین علوم پزشکی',
        description: 'مرجع آموزشی عمل‌های جراحی: شرح کامل عمل، وسایل مورد نیاز، '
                   + 'فیلم آموزشی و فایل ارائه، ویژه دانشجویان تکنولوژی اتاق عمل.',
        url: baseUrl,
        image: `${baseUrl}/og-image.png`,
        jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'تکنولوژی اتاق عمل',
            url: baseUrl,
            inLanguage: 'fa-IR',
            potentialAction: {
                '@type': 'SearchAction',
                target: `${baseUrl}/?q={search_term_string}`,
                'query-input': 'required name=search_term_string'
            }
        }
    });
}

function buildTags({ title, description, url, image, jsonLd }) {
    const e = escapeHtml;
    return `
    <title>${e(title)}</title>
    <meta name="description" content="${e(description)}">
    <link rel="canonical" href="${e(url)}">

    <meta property="og:type" content="article">
    <meta property="og:site_name" content="تکنولوژی اتاق عمل">
    <meta property="og:locale" content="fa_IR">
    <meta property="og:title" content="${e(title)}">
    <meta property="og:description" content="${e(description)}">
    <meta property="og:url" content="${e(url)}">
    <meta property="og:image" content="${e(image)}">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${e(title)}">
    <meta name="twitter:description" content="${e(description)}">
    <meta name="twitter:image" content="${e(image)}">

    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
}

/**
 * نقشهٔ سایت XML — فقط محتوای تأییدشده.
 * محتوای پیش‌نویس نباید به موتور جستجو معرفی شود.
 */
function buildSitemap(db, baseUrl) {
    const operations = db.prepare(`
        SELECT o.id, o.slug, o.updated_at, o.published_at
        FROM operations o
        WHERE o.status = 'approved'
        ORDER BY o.id
    `).all();

    const categories = db.prepare('SELECT key FROM categories ORDER BY sort_order').all();

    const staticPages = [
        { loc: '/', priority: '1.0', freq: 'daily' },
        { loc: '/help', priority: '0.6', freq: 'monthly' },
        { loc: '/faq', priority: '0.6', freq: 'monthly' },
        { loc: '/sitemap', priority: '0.4', freq: 'monthly' }
    ];

    const urls = [];

    for (const page of staticPages) {
        urls.push(`  <url>
    <loc>${baseUrl}${page.loc}</loc>
    <changefreq>${page.freq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`);
    }

    for (const category of categories) {
        urls.push(`  <url>
    <loc>${baseUrl}/category/${encodeURIComponent(category.key)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
    }

    for (const op of operations) {
        const lastmod = (op.updated_at || op.published_at || '').toString().slice(0, 10);
        urls.push(`  <url>
    <loc>${baseUrl}/op/${encodeURIComponent(op.slug || op.id)}</loc>${
        lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>`);
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
}

/** robots.txt — مسیرهای خصوصی از ایندکس حذف می‌شوند. */
function buildRobots(baseUrl) {
    return `User-agent: *
Allow: /

# مسیرهای خصوصی نباید ایندکس شوند
Disallow: /admin
Disallow: /api/
Disallow: /uploads/avatars/

Sitemap: ${baseUrl}/sitemap.xml
`;
}

module.exports = {
    operationMeta, defaultMeta, buildSitemap, buildRobots, toDescription
};
