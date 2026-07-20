require('dotenv').config();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

module.exports = function(db) {

const categoriesData = [
    { key: 'general', name_fa: 'جنرال', name_en: 'General Surgery', icon: '🏥', color: '#2563eb', sort_order: 1 },
    { key: 'cardiac', name_fa: 'قلب', name_en: 'Cardiac Surgery', icon: '❤️', color: '#dc2626', sort_order: 2 },
    { key: 'neurosurgery', name_fa: 'نوروسرجری', name_en: 'Neurosurgery', icon: '🧠', color: '#7c3aed', sort_order: 3 },
    { key: 'urology', name_fa: 'یورولوژی', name_en: 'Urology', icon: '🩺', color: '#0891b2', sort_order: 4 },
    { key: 'vascular', name_fa: 'وسکولار', name_en: 'Vascular Surgery', icon: '🫀', color: '#e11d48', sort_order: 5 },
    { key: 'plastic', name_fa: 'پلاستیک', name_en: 'Plastic Surgery', icon: '✨', color: '#d946ef', sort_order: 6 },
    { key: 'pediatrics', name_fa: 'اطفال', name_en: 'Pediatric Surgery', icon: '👶', color: '#f59e0b', sort_order: 7 },
    { key: 'thorax', name_fa: 'توراکس', name_en: 'Thoracic Surgery', icon: '🫁', color: '#059669', sort_order: 8 },
    { key: 'orthopedics', name_fa: 'ارتوپدی', name_en: 'Orthopedic Surgery', icon: '🦴', color: '#6366f1', sort_order: 9 },
    { key: 'gynecology', name_fa: 'زنان', name_en: 'Gynecology Surgery', icon: '👩', color: '#ec4899', sort_order: 10 }
];

const operationsData = {
    general: [
        { op_number: '01', name: 'AMPUTATION', sort_order: 1 },
        { op_number: '02', name: 'APPENDECTOMY', sort_order: 2 },
        { op_number: '03', name: 'CHOLECYSTECTOMY', sort_order: 3 },
        { op_number: '04', name: 'GASTEROJEOJENOSTOMY TUBE', sort_order: 4 },
        { op_number: '05', name: 'GASTEROSTOMY TUBE', sort_order: 5 },
        { op_number: '06', name: 'GASTRECTOMY', sort_order: 6 },
        { op_number: '07', name: 'GASTROJEJUNOSTOMY', sort_order: 7 },
        { op_number: '08', name: 'INGUINAL HERNIA', sort_order: 8 },
        { op_number: '09', name: 'JEJENOSTOMY TUBE', sort_order: 9 },
        { op_number: '10', name: 'LAPARASCOPIC BYPASS', sort_order: 10 },
        { op_number: '11', name: 'LAPARASCOPIC CHOLECYSTECTOMY', sort_order: 11 },
        { op_number: '12', name: 'LAPARASCOPIC HERNIA', sort_order: 12 },
        { op_number: '13', name: 'LAPARASCOPIC HYSTERECTOMY', sort_order: 13 },
        { op_number: '14', name: 'LAPARASCOPY (CHOLECYSTECTOMY)', sort_order: 14 },
        { op_number: '15', name: 'LAPARATOMY', sort_order: 15 },
        { op_number: '16', name: 'ORINGER', sort_order: 16 },
        { op_number: '17', name: 'SPLENECTOMY', sort_order: 17 },
        { op_number: '18', name: 'TRACHEOSTOMY TUBE', sort_order: 18 }
    ],
    cardiac: [
        { op_number: '31', name: 'VSD', sort_order: 1 },
        { op_number: '32', name: 'POST MI V.S.D', sort_order: 2 },
        { op_number: '33', name: 'PERICARDIAL WINDOW', sort_order: 3 },
        { op_number: '34', name: 'PERFUSION', sort_order: 4 },
        { op_number: '35', name: 'MVR', sort_order: 5 },
        { op_number: '36', name: 'EMBOLECTOMY', sort_order: 6 },
        { op_number: '37', name: 'CABG', sort_order: 7 },
        { op_number: '38', name: 'BLEEDING CONTROL', sort_order: 8 },
        { op_number: '39', name: 'AVR', sort_order: 9 },
        { op_number: '40', name: 'ASD', sort_order: 10 },
        { op_number: '41', name: 'Aortic Dissection', sort_order: 11 }
    ],
    neurosurgery: [
        { op_number: '51', name: 'VENTRCULOSTOMY', sort_order: 1 },
        { op_number: '52', name: 'V.N.S', sort_order: 2 },
        { op_number: '53', name: 'V.P SHUNT (بزرگسال)', sort_order: 3 },
        { op_number: '54', name: 'V.P SHUNT (اطفال)', sort_order: 4 },
        { op_number: '55', name: 'TETHERED CORD', sort_order: 5 },
        { op_number: '56', name: 'S.D.H', sort_order: 6 },
        { op_number: '57', name: 'MOYA MOYA', sort_order: 7 },
        { op_number: '58', name: 'MENINGOMYELOCELE', sort_order: 8 },
        { op_number: '59', name: 'LAMINECTOMY', sort_order: 9 },
        { op_number: '60', name: 'I.C.H', sort_order: 10 },
        { op_number: '61', name: 'E.T.V', sort_order: 11 },
        { op_number: '62', name: 'DECOMPRESSION', sort_order: 12 },
        { op_number: '63', name: 'CRANIOPLASTY', sort_order: 13 },
        { op_number: '64', name: 'CORD TUMOR', sort_order: 14 },
        { op_number: '65', name: 'CHRONIC S.D.H', sort_order: 15 },
        { op_number: '66', name: 'BRAIN TUMOR', sort_order: 16 },
        { op_number: '67', name: 'A.V.M', sort_order: 17 },
        { op_number: '68', name: 'ANJIOPLASTY NEUROSURGERY', sort_order: 18 }
    ],
    urology: [
        { op_number: '81', name: 'VARICOCELECTOMY', sort_order: 1 },
        { op_number: '82', name: 'URETROLITHOTOMY', sort_order: 2 },
        { op_number: '83', name: 'TUR (پروستات)', sort_order: 3 },
        { op_number: '84', name: 'TUR (مثانه و پروستات)', sort_order: 4 },
        { op_number: '85', name: 'TUL', sort_order: 5 },
        { op_number: '86', name: 'RADICAL NEPHRECTOMY', sort_order: 6 },
        { op_number: '87', name: 'RADICAL CYSTECTOMY', sort_order: 7 },
        { op_number: '88', name: 'PYELOPLASTY - بزرگسال', sort_order: 8 },
        { op_number: '89', name: 'PYELOPLASTY - اطفال', sort_order: 9 },
        { op_number: '90', name: 'PUV', sort_order: 10 },
        { op_number: '91', name: 'P.C.N.L', sort_order: 11 },
        { op_number: '92', name: 'ORCHIOPEXY', sort_order: 12 },
        { op_number: '93', name: 'OPEN PROSTATECTOMY', sort_order: 13 },
        { op_number: '94', name: 'NEPHROLITHOTOMY', sort_order: 14 },
        { op_number: '95', name: 'HYPOSPADIAS', sort_order: 15 },
        { op_number: '96', name: 'HYDROCELECTOMY', sort_order: 16 },
        { op_number: '97', name: 'HERNIORRHAPHY - بزرگسال', sort_order: 17 },
        { op_number: '98', name: 'HERNIATOMY - اطفال', sort_order: 18 },
        { op_number: '99', name: 'D.O.I.U', sort_order: 19 },
        { op_number: '100', name: 'CYSTOSCOPY', sort_order: 20 },
        { op_number: '101', name: 'CYSTOLITHOTRIPSY', sort_order: 21 },
        { op_number: '102', name: 'CYSTOLITHOTOMY', sort_order: 22 }
    ],
    vascular: [
        { op_number: '111', name: 'VASCULAR (STAB WOUND)', sort_order: 1 },
        { op_number: '112', name: 'VARIS', sort_order: 2 },
        { op_number: '113', name: 'PORT CATH', sort_order: 3 },
        { op_number: '114', name: 'PERMANENT CATHETER', sort_order: 4 },
        { op_number: '115', name: 'FOGARTY', sort_order: 5 },
        { op_number: '116', name: 'D.LUMEN', sort_order: 6 },
        { op_number: '117', name: 'CLOUSER OF A.V.SHUNT', sort_order: 7 },
        { op_number: '118', name: 'ANJIOPLASTY', sort_order: 8 },
        { op_number: '119', name: 'AMPUTATION', sort_order: 9 },
        { op_number: '120', name: 'ABDOMINAL ANEURISM', sort_order: 10 },
        { op_number: '121', name: 'A.V.SHUNT', sort_order: 11 }
    ],
    plastic: [
        { op_number: '131', name: 'ABDOMINOPLASTY', sort_order: 1 },
        { op_number: '132', name: 'BED SORE', sort_order: 2 },
        { op_number: '133', name: 'BLEPHAROPLASTY', sort_order: 3 },
        { op_number: '134', name: 'BREAST PROTEZ', sort_order: 4 },
        { op_number: '135', name: 'CLEFT LIP', sort_order: 5 },
        { op_number: '136', name: 'CLEFT PALATE', sort_order: 6 },
        { op_number: '137', name: 'FAT INJECTION', sort_order: 7 },
        { op_number: '138', name: 'FLAP', sort_order: 8 },
        { op_number: '139', name: 'LIPOSUCTION', sort_order: 9 },
        { op_number: '140', name: 'MAMMOPLASTY', sort_order: 10 },
        { op_number: '141', name: 'MICROTIA STAGE 1', sort_order: 11 },
        { op_number: '142', name: 'REMOVAL/INSERTION T.E', sort_order: 12 },
        { op_number: '143', name: 'RHINOPLASTY', sort_order: 13 },
        { op_number: '144', name: 'SKIN GRAFT', sort_order: 14 }
    ],
    pediatrics: [
        { op_number: '150', name: 'A.V. SHUNT', sort_order: 1 },
        { op_number: '151', name: 'ACE', sort_order: 2 },
        { op_number: '152', name: 'ALCHOLE INJECTION', sort_order: 3 },
        { op_number: '153', name: 'ANOPLASTY', sort_order: 4 },
        { op_number: '154', name: 'APPENDECTOMY', sort_order: 5 },
        { op_number: '155', name: 'BILIARY ATRESIA', sort_order: 6 },
        { op_number: '156', name: 'BOTAX INJECTION + RECTAL BIOPSY', sort_order: 7 },
        { op_number: '157', name: 'BRONCHOSCOPY', sort_order: 8 },
        { op_number: '158', name: 'COLOSTOMY', sort_order: 9 },
        { op_number: '159', name: 'CUT DOWN', sort_order: 10 },
        { op_number: '160', name: 'DIAPHRAGMATIC HERNIA', sort_order: 11 },
        { op_number: '161', name: 'ESOPHAGOSCOPY', sort_order: 12 },
        { op_number: '162', name: 'HERNIATOMY', sort_order: 13 },
        { op_number: '163', name: 'HYDATID CYST LUNG', sort_order: 14 },
        { op_number: '164', name: 'HYPOSPADIAS', sort_order: 15 },
        { op_number: '165', name: 'JEJONAL/DEODENAL ATRESIA', sort_order: 16 },
        { op_number: '166', name: 'LAPARASCOPY UDT', sort_order: 17 },
        { op_number: '167', name: 'LAPARASCOPY ACE', sort_order: 18 },
        { op_number: '168', name: 'LIVER MASS HEPATECTOMY', sort_order: 19 },
        { op_number: '169', name: 'ORCHIOPEXY', sort_order: 20 },
        { op_number: '170', name: 'P.S.A.R.P', sort_order: 21 },
        { op_number: '171', name: 'PORT-A-CATH', sort_order: 22 },
        { op_number: '172', name: 'PULL THROUGH ABDOMINAL', sort_order: 23 },
        { op_number: '173', name: 'PULL THROUGH TRANSANAL', sort_order: 24 },
        { op_number: '174', name: 'STRICTURO PLASTY', sort_order: 25 },
        { op_number: '175', name: 'TE FISTULA - ESOPHAGIAL ATRESIA', sort_order: 26 },
        { op_number: '176', name: 'UMBILICAL HERNIA', sort_order: 27 }
    ],
    thorax: [
        { op_number: '191', name: 'BRONCHOSCOPY FIBEROPTIC/RIGID', sort_order: 1 },
        { op_number: '192', name: 'CHOLECYSTECTOMY', sort_order: 2 },
        { op_number: '193', name: 'HYDATID CYST LUNG', sort_order: 3 },
        { op_number: '194', name: 'LAPARASCOPY (CHOLECYSTECTOMY)', sort_order: 4 },
        { op_number: '195', name: 'ORINGER', sort_order: 5 },
        { op_number: '196', name: 'THORACOSCOPY (VATS)', sort_order: 6 },
        { op_number: '197', name: 'THORACOTOMY + LUNG MASS', sort_order: 7 },
        { op_number: '198', name: 'THYMECTOMY', sort_order: 8 },
        { op_number: '199', name: 'THYROGLOSSAL CYST', sort_order: 9 },
        { op_number: '200', name: 'TRACHEAL STENOSIS', sort_order: 10 }
    ],
    orthopedics: [
        { op_number: '211', name: 'CLOSE REDUCTION', sort_order: 1 },
        { op_number: '212', name: 'EXTERNAL FIXATION', sort_order: 2 },
        { op_number: '213', name: 'FEMOUR FIXATION', sort_order: 3 },
        { op_number: '214', name: 'HUMERUS FIXATION', sort_order: 4 },
        { op_number: '215', name: 'INTERNAL FIXATION', sort_order: 5 },
        { op_number: '216', name: 'TENDON TRANSFER', sort_order: 6 },
        { op_number: '217', name: 'TOTAL HIP', sort_order: 7 },
        { op_number: '218', name: 'TOTAL KNEE', sort_order: 8 }
    ],
    gynecology: [
        { op_number: '226', name: 'C. SECTION', sort_order: 1 },
        { op_number: '227', name: 'ECTOPIC PREGNANCY', sort_order: 2 },
        { op_number: '228', name: 'Pri Acreta & Accreta', sort_order: 3 },
        { op_number: '229', name: 'تثبیت نوزاد', sort_order: 4 }
    ]
};

function seed() {
    console.log('Seeding database...');

    const insertCategory = db.prepare(`
        INSERT OR IGNORE INTO categories (key, name_fa, name_en, icon, color, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    // محتوای seed شده متعلق به مدیر است و باید «منتشرشده» باشد، نه پیش‌نویس.
    // چون روی دیتابیس تازه (سرور) مهاجرت‌ها *قبل* از seed اجرا می‌شوند،
    // ستون status پیش‌فرض 'draft' می‌گیرد و بدون این تنظیم صریح، تمام
    // عمل‌ها پیش‌نویس و برای بازدیدکننده نامرئی می‌شدند.
    const opColumns = db.prepare(`PRAGMA table_info(operations)`).all().map(c => c.name);
    const hasStatus = opColumns.includes('status');

    const insertOperation = hasStatus
        ? db.prepare(`
            INSERT OR IGNORE INTO operations
                (category_id, op_number, name, sort_order, status, is_locked, published_at)
            VALUES (?, ?, ?, ?, 'approved', 0, CURRENT_TIMESTAMP)
        `)
        : db.prepare(`
            INSERT OR IGNORE INTO operations (category_id, op_number, name, sort_order)
            VALUES (?, ?, ?, ?)
        `);

    const insertContent = db.prepare(`
        INSERT OR IGNORE INTO operation_content (operation_id)
        VALUES (?)
    `);

    const insertUser = db.prepare(`
        INSERT OR IGNORE INTO users (username, password, full_name, role)
        VALUES (?, ?, ?, ?)
    `);

    // ── رمز حساب مدیر ────────────────────────────────────────────────
    // هرگز رمز ثابت در کد نگذارید: این seed هر بار که دیتابیس خالی باشد
    // اجرا می‌شود و روی Render (فایل‌سیستم موقتی) یعنی هر دیپلوی.
    // رمز ثابت یعنی سایت عمومی همیشه با یک رمز شناخته‌شده باز می‌شود.
    const isProduction = process.env.NODE_ENV === 'production';
    let adminPassword = process.env.ADMIN_PASSWORD;
    let generated = false;

    if (!adminPassword || adminPassword.length < 8) {
        adminPassword = crypto.randomBytes(12).toString('base64url');
        generated = true;
    }

    const salt = bcrypt.genSaltSync(12);
    const transaction = db.transaction(() => {
        insertUser.run('admin', bcrypt.hashSync(adminPassword, salt), 'مدیر سیستم', 'admin');

        // حساب نمایشی «editor» فقط در محیط توسعه ساخته می‌شود
        if (!isProduction) {
            insertUser.run('editor', bcrypt.hashSync('editor123', salt), 'ویرایشگر', 'editor');
        }

        for (const cat of categoriesData) {
            insertCategory.run(cat.key, cat.name_fa, cat.name_en, cat.icon, cat.color, cat.sort_order);
            const category = db.prepare('SELECT id FROM categories WHERE key = ?').get(cat.key);

            const ops = operationsData[cat.key] || [];
            for (const op of ops) {
                insertOperation.run(category.id, op.op_number, op.name, op.sort_order);
                const operation = db.prepare('SELECT id FROM operations WHERE op_number = ?').get(op.op_number);
                insertContent.run(operation.id);
            }
        }
    });

    transaction();
    console.log('Database seeded successfully!');

    if (generated) {
        // نشانهٔ انگلیسی عمدی: جستجوی متن فارسی در نمایشگر لاگ Render دشوار است.
        // کاربر فقط کافی است «ADMIN_PASSWORD» را سرچ کند.
        console.log('\n' + '='.repeat(64));
        console.log('  ADMIN_PASSWORD (generated) >>> ' + adminPassword + ' <<<');
        console.log('  username: admin');
        console.log('');
        console.log('  حساب مدیر ساخته شد — نام کاربری: admin');
        console.log('  رمز عبور تصادفی: ' + adminPassword);
        console.log('');
        console.log('  این رمز فقط همین یک بار نمایش داده می‌شود.');
        console.log('  همین حالا ذخیره‌اش کنید و پس از ورود عوضش کنید.');
        console.log('  برای تعیین رمز دلخواه، متغیر ADMIN_PASSWORD را تنظیم کنید.');
        console.log('='.repeat(64) + '\n');
    } else {
        console.log('حساب مدیر با رمز تعیین‌شده در ADMIN_PASSWORD ساخته شد.');
    }

    if (!isProduction) {
        console.log('حساب آزمایشی ویرایشگر (فقط در حالت توسعه): editor / editor123');
    }
}

seed();
};
