const siteData = {
  categories: {
  "general": {
    "fa": "جنرال",
    "en": "General Surgery",
    "icon": "🏥",
    "color": "#2563eb",
    "operations": [
      { "id": "01", "name": "AMPUTATION" },
      { "id": "02", "name": "APPENDECTOMY" },
      { "id": "03", "name": "CHOLECYSTECTOMY" },
      { "id": "04", "name": "GASTEROJEOJENOSTOMY TUBE" },
      { "id": "05", "name": "GASTEROSTOMY TUBE" },
      { "id": "06", "name": "GASTRECTOMY" },
      { "id": "07", "name": "GASTROJEJUNOSTOMY" },
      { "id": "08", "name": "INGUINAL HERNIA" },
      { "id": "09", "name": "JEJENOSTOMY TUBE" },
      { "id": "10", "name": "LAPARASCOPIC BYPASS" },
      { "id": "11", "name": "LAPARASCOPIC CHOLECYSTECTOMY" },
      { "id": "12", "name": "LAPARASCOPIC HERNIA" },
      { "id": "13", "name": "LAPARASCOPIC HYSTERECTOMY" },
      { "id": "14", "name": "LAPARASCOPY (CHOLECYSTECTOMY)" },
      { "id": "15", "name": "LAPARATOMY" },
      { "id": "16", "name": "ORINGER" },
      { "id": "17", "name": "SPLENECTOMY" },
      { "id": "18", "name": "TRACHEOSTOMY TUBE" }
    ]
  },
  "cardiac": {
    "fa": "قلب",
    "en": "Cardiac Surgery",
    "icon": "❤️",
    "color": "#dc2626",
    "operations": [
      { "id": "31", "name": "VSD" },
      { "id": "32", "name": "POST MI V.S.D" },
      { "id": "33", "name": "PERICARDIAL WINDOW" },
      { "id": "34", "name": "PERFUSION" },
      { "id": "35", "name": "MVR" },
      { "id": "36", "name": "EMBOLECTOMY" },
      { "id": "37", "name": "CABG" },
      { "id": "38", "name": "BLEEDING CONTROL" },
      { "id": "39", "name": "AVR" },
      { "id": "40", "name": "ASD" },
      { "id": "41", "name": "Aortic Dissection" }
    ]
  },
  "neurosurgery": {
    "fa": "نوروسرجری",
    "en": "Neurosurgery",
    "icon": "🧠",
    "color": "#7c3aed",
    "operations": [
      { "id": "51", "name": "VENTRCULOSTOMY" },
      { "id": "52", "name": "V.N.S" },
      { "id": "53", "name": "V.P SHUNT (بزرگسال)" },
      { "id": "54", "name": "V.P SHUNT (اطفال)" },
      { "id": "55", "name": "TETHERED CORD" },
      { "id": "56", "name": "S.D.H" },
      { "id": "57", "name": "MOYA MOYA" },
      { "id": "58", "name": "MENINGOMYELOCELE" },
      { "id": "59", "name": "LAMINECTOMY" },
      { "id": "60", "name": "I.C.H" },
      { "id": "61", "name": "E.T.V" },
      { "id": "62", "name": "DECOMPRESSION" },
      { "id": "63", "name": "CRANIOPLASTY" },
      { "id": "64", "name": "CORD TUMOR" },
      { "id": "65", "name": "CHRONIC S.D.H" },
      { "id": "66", "name": "BRAIN TUMOR" },
      { "id": "67", "name": "A.V.M" },
      { "id": "68", "name": "ANJIOPLASTY NEUROSURGERY" }
    ]
  },
  "urology": {
    "fa": "یورولوژی",
    "en": "Urology",
    "icon": "🩺",
    "color": "#0891b2",
    "operations": [
      { "id": "81", "name": "VARICOCELECTOMY" },
      { "id": "82", "name": "URETROLITHOTOMY" },
      { "id": "83", "name": "TUR (پروستات)" },
      { "id": "84", "name": "TUR (مثانه و پروستات)" },
      { "id": "85", "name": "TUL" },
      { "id": "86", "name": "RADICAL NEPHRECTOMY" },
      { "id": "87", "name": "RADICAL CYSTECTOMY" },
      { "id": "88", "name": "PYELOPLASTY - بزرگسال" },
      { "id": "89", "name": "PYELOPLASTY - اطفال" },
      { "id": "90", "name": "PUV" },
      { "id": "91", "name": "P.C.N.L" },
      { "id": "92", "name": "ORCHIOPEXY" },
      { "id": "93", "name": "OPEN PROSTATECTOMY" },
      { "id": "94", "name": "NEPHROLITHOTOMY" },
      { "id": "95", "name": "HYPOSPADIAS" },
      { "id": "96", "name": "HYDROCELECTOMY" },
      { "id": "97", "name": "HERNIORRHAPHY - بزرگسال" },
      { "id": "98", "name": "HERNIATOMY - اطفال" },
      { "id": "99", "name": "D.O.I.U" },
      { "id": "100", "name": "CYSTOSCOPY" },
      { "id": "101", "name": "CYSTOLITHOTRIPSY" },
      { "id": "102", "name": "CYSTOLITHOTOMY" }
    ]
  },
  "vascular": {
    "fa": "وسکولار",
    "en": "Vascular Surgery",
    "icon": "🫀",
    "color": "#e11d48",
    "operations": [
      { "id": "111", "name": "VASCULAR (STAB WOUND)" },
      { "id": "112", "name": "VARIS" },
      { "id": "113", "name": "PORT CATH" },
      { "id": "114", "name": "PERMANENT CATHETER" },
      { "id": "115", "name": "FOGARTY" },
      { "id": "116", "name": "D.LUMEN" },
      { "id": "117", "name": "CLOUSER OF A.V.SHUNT" },
      { "id": "118", "name": "ANJIOPLASTY" },
      { "id": "119", "name": "AMPUTATION" },
      { "id": "120", "name": "ABDOMINAL ANEURISM" },
      { "id": "121", "name": "A.V.SHUNT" }
    ]
  },
  "plastic": {
    "fa": "پلاستیک",
    "en": "Plastic Surgery",
    "icon": "✨",
    "color": "#d946ef",
    "operations": [
      { "id": "131", "name": "ABDOMINOPLASTY" },
      { "id": "132", "name": "BED SORE" },
      { "id": "133", "name": "BLEPHAROPLASTY" },
      { "id": "134", "name": "BREAST PROTEZ" },
      { "id": "135", "name": "CLEFT LIP" },
      { "id": "136", "name": "CLEFT PALATE" },
      { "id": "137", "name": "FAT INJECTION" },
      { "id": "138", "name": "FLAP" },
      { "id": "139", "name": "LIPOSUCTION" },
      { "id": "140", "name": "MAMMOPLASTY" },
      { "id": "141", "name": "MICROTIA STAGE 1" },
      { "id": "142", "name": "REMOVAL/INSERTION T.E" },
      { "id": "143", "name": "RHINOPLASTY" },
      { "id": "144", "name": "SKIN GRAFT" }
    ]
  },
  "pediatrics": {
    "fa": "اطفال",
    "en": "Pediatric Surgery",
    "icon": "👶",
    "color": "#f59e0b",
    "operations": [
      { "id": "150", "name": "A.V. SHUNT" },
      { "id": "151", "name": "ACE" },
      { "id": "152", "name": "ALCHOLE INJECTION" },
      { "id": "153", "name": "ANOPLASTY" },
      { "id": "154", "name": "APPENDECTOMY" },
      { "id": "155", "name": "BILIARY ATRESIA" },
      { "id": "156", "name": "BOTAX INJECTION + RECTAL BIOPSY" },
      { "id": "157", "name": "BRONCHOSCOPY" },
      { "id": "158", "name": "COLOSTOMY" },
      { "id": "159", "name": "CUT DOWN" },
      { "id": "160", "name": "DIAPHRAGMATIC HERNIA" },
      { "id": "161", "name": "ESOPHAGOSCOPY" },
      { "id": "162", "name": "HERNIATOMY" },
      { "id": "163", "name": "HYDATID CYST LUNG" },
      { "id": "164", "name": "HYPOSPADIAS" },
      { "id": "165", "name": "JEJONAL/DEODENAL ATRESIA" },
      { "id": "166", "name": "LAPARASCOPY UDT" },
      { "id": "167", "name": "LAPARASCOPY ACE" },
      { "id": "168", "name": "LIVER MASS HEPATECTOMY" },
      { "id": "169", "name": "ORCHIOPEXY" },
      { "id": "170", "name": "P.S.A.R.P" },
      { "id": "171", "name": "PORT-A-CATH" },
      { "id": "172", "name": "PULL THROUGH ABDOMINAL" },
      { "id": "173", "name": "PULL THROUGH TRANSANAL" },
      { "id": "174", "name": "STRICTURO PLASTY" },
      { "id": "175", "name": "TE FISTULA - ESOPHAGIAL ATRESIA" },
      { "id": "176", "name": "UMBILICAL HERNIA" }
    ]
  },
  "thorax": {
    "fa": "توراکس",
    "en": "Thoracic Surgery",
    "icon": "🫁",
    "color": "#059669",
    "operations": [
      { "id": "191", "name": "BRONCHOSCOPY FIBEROPTIC/RIGID" },
      { "id": "192", "name": "CHOLECYSTECTOMY" },
      { "id": "193", "name": "HYDATID CYST LUNG" },
      { "id": "194", "name": "LAPARASCOPY (CHOLECYSTECTOMY)" },
      { "id": "195", "name": "ORINGER" },
      { "id": "196", "name": "THORACOSCOPY (VATS)" },
      { "id": "197", "name": "THORACOTOMY + LUNG MASS" },
      { "id": "198", "name": "THYMECTOMY" },
      { "id": "199", "name": "THYROGLOSSAL CYST" },
      { "id": "200", "name": "TRACHEAL STENOSIS" }
    ]
  },
  "orthopedics": {
    "fa": "ارتوپدی",
    "en": "Orthopedic Surgery",
    "icon": "🦴",
    "color": "#6366f1",
    "operations": [
      { "id": "211", "name": "CLOSE REDUCTION" },
      { "id": "212", "name": "EXTERNAL FIXATION" },
      { "id": "213", "name": "FEMOUR FIXATION" },
      { "id": "214", "name": "HUMERUS FIXATION" },
      { "id": "215", "name": "INTERNAL FIXATION" },
      { "id": "216", "name": "TENDON TRANSFER" },
      { "id": "217", "name": "TOTAL HIP" },
      { "id": "218", "name": "TOTAL KNEE" }
    ]
  },
  "gynecology": {
    "fa": "زنان",
    "en": "Gynecology Surgery",
    "icon": "妇",
    "color": "#ec4899",
    "operations": [
      { "id": "226", "name": "C. SECTION" },
      { "id": "227", "name": "ECTOPIC PREGNANCY" },
      { "id": "228", "name": "Pri Acreta & Accreta" },
      { "id": "229", "name": "تثبیت نوزاد" }
    ]
  }
  },

  operationContent: {
    "01": {
      "description": "آمپوتاسیون به معنای برداشت جراحی بخشی از اندام یا کل اندام است. این عمل معمولاً در موارد گانگرن، ایسکمی شدید، تروما، عفونت غیرقابل کنترل، تومورهای بدخیمیا بدشکلیهای غیرقابل اصلاح انجام میشود. هدف، حذف بافت غیرقابلحیات، کنترل درد و عفونت، و ایجاد استامپ مناسب برای ترمیم یا پروتزگذاری است.\n\nتشریح کامل عمل:\n۱. ارزیابی قبل از عمل\n- تعیین سطح مناسب قطع عضو بر اساس: خونرسانی بافت، میزان درگیری عفونی یا تروما، قابلیت استفاده از پروتز، وضعیت عمومی بیمار\n- بررسی عروقی، تصویربرداری در صورت لزوم، و ارزیابی بیهوشی\n\n۲. بیهوشی و آمادهسازی\n- معمولاً بیهوشی عمومی یا اسپاینال\n- آنتیبیوتیک پروفیلاکسی در صورت نیاز\n- قرار دادن تورنیکه در اندام مناسب در صورت اندیکاسیون\n\n۳. طراحی فلپها\n- بسته به سطح قطع، فلپهای پوستی قدامی/خلفی یا long posterior flap طراحی میشوند\n- هدف: پوشش بدون کشش و ایجاد استامپ پایدار\n\n۴. برش پوست و بافت نرم\n- برش پوست با اسکالپل\n- کنترل خونریزی با الکتروکوتر\n- ادامه برش تا الیههای عمقی\n\n۵. قطع عضلات\n- عضلات بهصورت الیهبهالیه قطع میشوند\n- عروق و اعصاب شناسایی و محافظت میشوند\n- عضلات آنتاگونیست در صورت امکان با myodesis / myoplasty تثبیت میشوند\n\n۶. کنترل عروق\n- شریان و وریدهای اصلی لیگاتور میشوند\n- عروق کوچک با کوتر یا لیگاتور بسته میشوند\n- کنترل هموستاز بسیار مهم است\n\n۷. مدیریت اعصاب\n- اعصاب اصلی با کشش ملایم کشیده و در سطح بالاتر قطع میشوند\n- هدف: کاهش احتمال نوروم دردناک\n\n۸. قطع استخوان\n- پریوست بهطور مناسب جدا میشود\n- استخوان با اره جراحی یا اره استخوانی قطع میشود\n- لبههای تیز با رَسپ یا فایل استخوانی صاف میشوند\n\n۹. شستوشو و هموستاز نهایی\n- شستوشوی حفره با سرم\n- کنترل خونریزی نهایی\n- در صورت نیاز درن گذاشته میشود\n\n۱۰. بستن زخم\n- فاشیا و عضله بسته میشوند\n- پوست با بخیه یا استیپل بسته میشود\n- پانسمان فشاری جهت شکلدهی استامپ",
      "instruments": "ست پایه:\n• اسکالپل دسته ۳ یا ۴\n• تیغ شماره ۱۰، ۱۱، ۱۵، ۲۰/۲۲\n• قیچی مایو مستقیم و خمیده\n• قیچی متزنبام\n• پنس آناتومیک\n• پنس دندانهدار\n• هموستات کِلی\n• هموستات کرایل\n• کلمپ کوخر\n• نیدلهولدر\n• سوزن بخیه\n• رترکتور دستی\n\nابزارهای تخصصی:\n• تورنیکه پنوماتیک\n• الکتروکوتر مونوپوالر/بایپوالر\n• اره استخوانی یا oscillating saw\n• گیلیساو در برخی موارد\n• رَسپ یا فایل استخوانی\n• periosteal elevator\n• bone cutter / rongeur\n• suction tip\n\nمواد مصرفی:\n• نخ لیگاتور ابریشم ۰/۲-۰\n• Vicryl 0, 2-0\n• Nylon 2-0 یا 3-0\n• استیپلر پوستی\n• گاز، سرم، پانسمان فشاری\n• درن در صورت نیاز",
      "video_title_1": "Below Knee Amputation Surgical Technique",
      "video_url_1": "https://www.youtube.com/results?search_query=Below+Knee+Amputation+Surgical+Technique",
      "video_title_2": "Above Knee Amputation Full Procedure",
      "video_url_2": "https://www.youtube.com/results?search_query=Above+Knee+Amputation+Full+Procedure"
    },
    "02": {
      "description": "آپاندکتومی عمل برداشت آپاندیس است که معمولاً بهدلیل آپاندیسیت حاد انجام میشود. این عمل میتواند بهصورت باز یا الپاروسکوپیک انجام شود. هدف، حذف منبع عفونت و پیشگیری از پرفوراسیون، پریتونیت و آبسه است.\n\nتشریح کامل عمل:\n۱. ارزیابی و آمادهسازی\n- تشخیص بالینی و تصویربرداری در صورت نیاز\n- NPO، مایعدرمانی، آنتیبیوتیک\n- بیهوشی عمومی\n\n۲. انتخاب رویکرد\n- Open appendectomy: اغلب از برش McBurney یا Lanz\n- Laparoscopic appendectomy: با ۳ پورت یا بیشتر\n\n۳. ایجاد دسترسی\n- در روش باز: برش در ربع تحتانی راست\n- در روش الپاروسکوپی: ایجاد پنوموپریتونئوم و قرار دادن تروکارها\n\n۴. شناسایی آپاندیس\n- یافتن cecum و taeniae coli\n- دنبال کردن تا base آپاندیس\n\n۵. کنترل مزوآپاندیس\n- لیگاتور یا کوتر عروق مزوآپاندیس\n- جداسازی تدریجی\n\n۶. بستن پایه آپاندیس\n- لیگاتور base\n- در الپاروسکوپی: endoloop یا stapler\n\n۷. برداشت آپاندیس\n- قطع آپاندیس و خارجکردن در specimen bag\n- در صورت آلودگی، شستوشوی ناحیه\n\n۸. کنترل هموستاز و بستن\n- بررسی stump\n- بستن الیهها\n- در موارد آلوده، ممکن است درن لازم شود",
      "instruments": "ست پایه:\n• اسکالپل\n• قیچی مایو و متزنبام\n• پنس آدسون/آناتومیک\n• هموستاتها\n• نیدلهولدر\n• رترکتور کوچک و متوسط\n\nابزارهای تخصصی:\n• در روش باز: Deaver retractor, Langenbeck retractor, Balfour در برخی موارد\n• در روش الپاروسکوپیک: تروکار ۵ و ۱۰/۱۲ میلیمتری، دوربین الپاروسکوپی، grasper، dissector، endoloop، endostapler در صورت نیاز، suction-irrigation\n\nمواد مصرفی:\n• Vicryl 2-0 / 3-0\n• Monocryl یا Nylon برای پوست\n• endoloop یا stapler cartridge\n• سرم شستوشو\n• آنتیبیوتیک",
      "video_title_1": "Laparoscopic Appendectomy Full Procedure",
      "video_url_1": "https://www.youtube.com/results?search_query=Laparoscopic+Appendectomy+Full+Procedure",
      "video_title_2": "Open Appendectomy Surgical Technique",
      "video_url_2": "https://www.youtube.com/results?search_query=Open+Appendectomy+Surgical+Technique"
    },
    "03": {
      "description": "کولهسیستکتومی برداشت جراحی کیسه صفرا است. شایعترین اندیکاسیون آن سنگ کیسه صفرا، کولسیستیت حاد یا مزمن، پولیپ مشکوک و برخی اختلالات عملکردی است. امروزه اغلب بهصورت الپاروسکوپیک انجام میشود.\n\nتشریح کامل عمل:\n۱. آمادهسازی\n- ارزیابی آزمایشگاهی و تصویربرداری\n- بیهوشی عمومی\n- آنتیبیوتیک پروفیلاکسی در موارد عفونی\n\n۲. ورود الپاروسکوپیک\n- ایجاد پنوموپریتونئوم\n- گذاشتن تروکارها در موقعیتهای استاندارد\n\n۳. اکسپوژر\n- بالا کشیدن فوندوس کیسه صفرا\n- کنار زدن اینفاندیبولوم\n- نمایانکردن مثلث کالو/هپاتوسیستیک\n\n۴. تشریح مثلث هپاتوسیستیک\n- شناسایی cystic duct و cystic artery\n- رعایت critical view of safety\n\n۵. بستن و قطع داکت و شریان سیستیک\n- کلیپگذاری یا لیگاتور\n- سپس قطع\n\n۶. جدا کردن کیسه صفرا از بستر کبد\n- با کوتر یا hook dissection\n- کنترل خونریزی بستر\n\n۷. خارجکردن نمونه\n- در specimen bag\n- شستوشو و بررسی نشت صفرا\n\n۸. بستن\n- خارجکردن تروکارها\n- بستن فاشیای پورتهای بزرگ\n- بخیه پوست",
      "instruments": "ست پایه:\n• اسکالپل\n• پنس و قیچی\n• نیدلهولدر\n• ساکشن\n• کوتر\n\nابزارهای تخصصی الپاروسکوپی:\n• الپاروسکوپ ۳۰ درجه\n• تروکار ۵ و ۱۰/۱۲mm\n• insufflator\n• graspers\n• Maryland dissector\n• hook cautery\n• clip applier\n• endobag\n• suction-irrigation\n• needle driver الپاروسکوپیک\n\nمواد مصرفی:\n• clips titanium یا polymer\n• Vicryl 2-0 / 3-0\n• nylon یا absorbable برای پوست\n• سرم شستوشو",
      "video_title_1": "Laparoscopic Cholecystectomy 4K Step by Step",
      "video_url_1": "https://www.youtube.com/results?search_query=Laparoscopic+Cholecystectomy+4K+Step+by+Step",
      "video_title_2": "Cholecystectomy Critical View of Safety",
      "video_url_2": "https://www.youtube.com/results?search_query=Cholecystectomy+Critical+View+of+Safety"
    },
    "04": {
      "description": "گاستروژژنوستومی تیوب، لولهای برای تغذیه است که از طریق دیواره شکم وارد معده شده و نوک آن به ژژنوم هدایت میشود. این کار برای بیمارانی انجام میشود که تغذیه دهانی ندارند یا خطر آسپیراسیون بالادارند.\n\nتشریح کامل عمل:\n۱. اندیکاسیون\n- اختلال بلع\n- آسپیراسیون مکرر\n- ناتوانی در تغذیه دهانی\n- نیاز به تغذیه طوالنیمدت\n\n۲. روش انجام\n- ممکن است بهصورت اندوسکوپیک، فلوروسکوپیک، یا جراحی باز انجام شود\n\n۳. ورود به معده\n- ایجاد دسترسی از راه پوست یا حین جراحی\n- تثبیت معده به دیواره شکم در صورت نیاز\n\n۴. عبور دادن لوله\n- لوله از stomach وارد pylorus و سپس jejunum میشود\n- موقعیت نوک لوله تأیید میشود\n\n۵. فیکسکردن\n- بالون یا bumper در معده\n- تثبیت بخش ژژونال برای جلوگیری از جابهجایی\n\n۶. کنترل و آموزش\n- اطمینان از محل صحیح\n- آموزش مراقبت از لوله، flush و feeding",
      "instruments": "اگر اندوسکوپیک/فلوروسکوپیک:\n• اندوسکوپ\n• فلوروسکوپی\n• guidewire\n• dilator\n• GJ tube kit\n• syringe\n• contrast\n\nاگر جراحی:\n• ست جراحی عمومی\n• retractors\n• clamp\n• needle holder\n• suction\n• electrocautery\n• feeding tube kit\n\nمواد مصرفی:\n• لوله GJ\n• sutures برای fixation\n• dressing material\n• contrast media در صورت نیاز",
      "video_title_1": "J Tube Placement Procedure-PEG",
      "video_url_1": "https://www.youtube.com/results?search_query=J+Tube+Placement+Procedure+PEG",
      "video_title_2": "Gastrojejunostomy Tube Fluoroscopy Guided",
      "video_url_2": "https://www.youtube.com/results?search_query=Gastrojejunostomy+Tube+Fluoroscopy+Guided"
    },
    "05": {
      "description": "گاستروستومی تیوب یا G-tube لولهای است که برای تغذیه مستقیم وارد معده میشود. در بیمارانی استفاده میشود که توانایی تغذیه دهانی ندارند ولی معده عملکرد مناسبی دارد.\n\nتشریح کامل عمل:\n۱. اندیکاسیون\n- دیسفاژی\n- بیماریهای نورولوژیک\n- ناتوانی در تغذیه کافی\n- نیاز به تغذیه طوالنیمدت\n\n۲. روش انجام\n- PEG: percutaneous endoscopic gastrostomy\n- Open gastrostomy\n- Laparoscopic gastrostomy\n\n۳. دسترسی به معده\n- تعیین محل مناسب روی دیواره شکم\n- در PEG با اندوسکوپ، نور transillumination و finger indentation\n- در روش جراحی، معده به سطح قدامی شکم آورده میشود\n\n۴. ایجاد مسیر\n- سوراخ کردن دیواره شکم و معده\n- عبور guidewire یا لوله\n\n۵. قرار دادن تیوب\n- قرارگیری bumper/balloon\n- تثبیت داخلی و خارجی\n\n۶. تأیید و پانسمان\n- بررسی محل\n- پانسمان استریل\n- آموزش مراقبت از لوله",
      "instruments": "در PEG:\n• اندوسکوپ\n• PEG kit\n• guidewire\n• trocar needle\n• introducer\n• dilator\n• bumper tube\n• syringe\n• antiseptic prep\n\nدر روش جراحی:\n• ست عمومی\n• retractors\n• needle holder\n• clamps\n• suction\n• electrocautery\n• gastrostomy tube kit\n\nمواد مصرفی:\n• G-tube\n• sutures\n• dressing\n• saline/contrast در صورت نیاز",
      "video_title_1": "PEG Tube Gastrostomy Placement Full Procedure",
      "video_url_1": "https://www.youtube.com/results?search_query=PEG+Tube+Gastrostomy+Placement+Full+Procedure",
      "video_title_2": "Stamm Gastrostomy Open Surgical Technique",
      "video_url_2": "https://www.youtube.com/results?search_query=Stamm+Gastrostomy+Open+Surgical+Technique"
    },
    "06": {
      "description": "گاسترکتومی به برداشت بخشی یا تمام معده گفته میشود. این عمل برای سرطان معده، زخمهای مقاوم، خونریزی شدید، ضایعات پیشسرطانی، یا بیماریهای خاص انجام میشود. انواع آن شامل partial gastrectomy و total gastrectomy است.\n\nتشریح کامل عمل:\n۱. ارزیابی قبل از عمل\n- بررسی اندوسکوپی، CT scan، biopsy\n- ارزیابی وضعیت تغذیه، کمخونی، عملکرد قلب و ریه\n- آمادهسازی برای بیهوشی عمومی\n\n۲. اکسپوژر\n- معمولاً از راه الپاراتومی یا الپاروسکوپی\n- بررسی کامل حفره شکمی و staging در موارد بدخیمی\n\n۳. آزادسازی معده\n- لیگاتور و قطع عروق مناسب\n- جداسازی greater and lesser curvature\n- در صورت نیاز dissection of lymph nodes\n\n۴. برداشت بخش موردنظر\n- در partial gastrectomy: برداشت قسمت distal یا proximal\n- در total gastrectomy: برداشت کامل معده\n\n۵. بازسازی مسیر گوارشی\n- Billroth I\n- Billroth II\n- Roux-en-Y reconstruction\n- انتخاب روش بر اساس وضعیت بیمار و هدف عمل\n\n۶. کنترل خونریزی و نشتی\n- تست آناستوموز\n- شستوشو\n- قرار دادن درن در برخی موارد\n\n۷. بستن\n- closure الیهها\n- پانسمان و مراقبت بعد از عمل",
      "instruments": "ست پایه:\n• اسکالپل\n• قیچی\n• پنسها\n• هموستات\n• نیدلهولدر\n• retractors\n\nابزارهای تخصصی:\n• Balfour retractor\n• Bookwalter retractor\n• suction irrigator\n• electrocautery\n• stapler linear / circular\n• gastric clamps\n• bowel clamps\n• vessel ligation instruments\n• anastomosis instruments\n\nمواد مصرفی:\n• sutures قابل جذب و غیرقابل جذب\n• stapler cartridges\n• drains\n• saline\n• specimen bags",
      "video_title_1": "Total Gastrectomy Roux-en-Y Reconstruction",
      "video_url_1": "https://www.youtube.com/results?search_query=Total+Gastrectomy+Roux+en+Y+Reconstruction",
      "video_title_2": "Laparoscopic Subtotal Gastrectomy",
      "video_url_2": "https://www.youtube.com/results?search_query=Laparoscopic+Subtotal+Gastrectomy"
    },
    "07": {
      "description": "گاستروژژنوستومی ایجاد اتصال جراحی بین معده و ژژنوم است تا عبور غذا از دوازدهه دور زده شود. این عمل بیشتر برای رفع انسداد خروجی معده، بایپس در بدخیمیها، یا برخی جراحیهای باریاتریک انجام میشود.\n\nتشریح کامل عمل:\n۱. ارزیابی قبل از عمل\n- بررسی علت انسداد یا نیاز به بایپس\n- ارزیابی تغذیه، وضعیت عمومی، و تصویربرداری در صورت لزوم\n- انتخاب روش باز، الپاروسکوپیک، یا اندوسکوپیک\n\n۲. بیهوشی و آمادهسازی\n- معمولاً بیهوشی عمومی\n- آنتیبیوتیک پروفیلاکسی\n- آمادهسازی شکم و استریلکردن میدان عمل\n\n۳. دسترسی به شکم\n- الپاراتومی یا ایجاد پورتهای الپاروسکوپی\n- بررسی معده، دوازدهه، و ژژنوم\n\n۴. انتخاب محل آناستوموز\n- انتخاب حلقه مناسب ژژنوم\n- رساندن ژژنوم به کنار معده بدون کشش\n\n۵. ایجاد آناستوموز\n- باز کردن رویه معده و ژژنوم\n- انجام آناستوموز بهصورت hand-sewn یا stapled\n- ایجاد مسیر عبور جدید برای غذا\n\n۶. کنترل نشتی و خونریزی\n- بررسی لبهها\n- تست نشتی در صورت نیاز\n- هموستاز نهایی\n\n۷. بستن شکم\n- شستوشو\n- درن در صورت نیاز\n- بستن الیهها",
      "instruments": "ست پایه:\n• اسکالپل\n• قیچی\n• پنس\n• هموستات\n• نیدلهولدر\n• رترکتور\n\nابزارهای تخصصی:\n• ست الپاروسکوپی در صورت روش کمتهاجمی\n• تروکار\n• دوربین\n• گراسپر\n• کوتر\n• ساکشن/ایریگیشن\n\nمواد مصرفی:\n• نخهای قابل جذب و غیرقابل جذب\n• استیپلر linear یا circular\n• گاز و پانسمان\n• درن در صورت نیاز",
      "video_title_1": "Roux-en-Y Hand-sewn Gastrojejunostomy Technique",
      "video_url_1": "https://www.youtube.com/results?search_query=Roux+en+Y+Hand+sewn+Gastrojejunostomy+Technique",
      "video_title_2": "Open Gastrojejunostomy Surgical Steps",
      "video_url_2": "https://www.youtube.com/results?search_query=Open+Gastrojejunostomy+Surgical+Steps"
    },
    "08": {
      "description": "ترمیم هرنی اینگوینال یعنی برگرداندن محتویات فتق به حفره شکم و تقویت دیواره کانال اینگوینال با مش یا ترمیم بافتی. رایجترین روش باز، تکنیک Lichtenstein است.\n\nتشریح کامل عمل:\n۱. ارزیابی قبل از عمل\n- تعیین نوع فتق: مستقیم، غیرمستقیم، یا مختنق\n- بررسی قابلیت ریداکشن\n- ارزیابی درد، تورم، و عالئم ایسکمی یا انسداد\n\n۲. بیهوشی و آمادهسازی\n- بیهوشی عمومی، نخاعی، یا موضعی\n- آنتیبیوتیک در صورت استفاده از مش\n- وضعیتدهی مناسب بیمار\n\n۳. برش و دسترسی\n- برش اینگوینال روی کانال\n- باز کردن الیهها تا رسیدن به کانال اینگوینال\n- شناسایی طناب اسپرماتیک یا لیگامان راند\n\n۴. جداسازی کیسه فتق\n- جدا کردن کیسه از ساختارهای اطراف\n- بازگرداندن محتویات فتق\n- لیگاتور یا رزکشن کیسه در صورت نیاز\n\n۵. ترمیم دیواره\n- قرار دادن مش در روش Lichtenstein\n- تثبیت مش با بخیه\n- یا ترمیم بدون مش در روش Shouldice\n\n۶. بستن زخم\n- هموستاز نهایی\n- بستن فاشیا و پوست\n- پانسمان استریل",
      "instruments": "ست پایه:\n• اسکالپل\n• قیچی\n• پنس\n• هموستات\n• نیدلهولدر\n• رترکتور دستی\n\nابزارهای تخصصی:\n• مش جراحی\n• کوتر\n• ست الپاروسکوپی در روش TAPP/TEP\n• تروکار\n• تکر/فیکسکننده مش\n\nمواد مصرفی:\n• نخ پروپیلن یا نایلون\n• نخ قابل جذب\n• گاز و پانسمان\n• مش پلیپروپیلن",
      "video_title_1": "Lichtenstein Inguinal Hernia Repair Step by Step",
      "video_url_1": "https://www.youtube.com/results?search_query=Lichtenstein+Inguinal+Hernia+Repair+Step+by+Step"
    },
    "09": {
      "description": "ژژنوستومی تیوب قرار دادن لوله تغذیه مستقیم در ژژنوم است برای بیمارانی که نمیتوانند از راه دهان یا معده تغذیه شوند یا در خطر آسپیراسیون هستند.\n\nتشریح کامل عمل:\n۱. ارزیابی قبل از عمل\n- بررسی نیاز تغذیهای طوالنیمدت\n- ارزیابی عملکرد دستگاه گوارش فوقانی\n- انتخاب روش جراحی، اندوسکوپیک، یا فلوروسکوپیک\n\n۲. بیهوشی و آمادهسازی\n- آرامبخشی یا بیهوشی عمومی\n- آنتیبیوتیک پروفیلاکسی\n- استریلکردن محل ورود لوله\n\n۳. دسترسی به ژژنوم\n- از راه جراحی باز یا اندوسکوپی/فلوروسکوپی\n- انتخاب لوپ مناسب ژژنوم\n\n۴. قرار دادن لوله\n- عبور guidewire\n- قرار دادن لوله J روی wire\n- تثبیت داخلی و خارجی لوله\n\n۵. فیکس و بررسی\n- اطمینان از محل صحیح\n- شستوشوی لوله\n- فیکس خارجی روی پوست",
      "instruments": "ست پایه:\n• اسکالپل\n• پنس\n• قیچی\n• نیدلهولدر\n• رترکتور\n\nابزارهای تخصصی:\n• آندوسکوپ\n• فلوروسکوپ\n• guidewire\n• dilator\n• کیت jejunostomy tube\n• سرنگ و ست flush\n\nمواد مصرفی:\n• نخ بخیه\n• پانسمان\n• محلول ضدعفونی\n• سرم نرمال سالین",
      "video_title_1": "Witzel Jejunostomy Technique",
      "video_url_1": "https://www.youtube.com/results?search_query=Witzel+Jejunostomy+Technique"
    },
    "10": {
      "description": "بایپس الپاروسکوپیک معمولاً به Roux-en-Y gastric bypass اشاره دارد؛ در آن معده کوچک شده و به ژژنوم متصل میشود تا هم حجم غذای دریافتی کم شود و هم جذب کاهش یابد.\n\nتشریح کامل عمل:\n۱. ارزیابی قبل از عمل\n- بررسی BMI و اندیکاسیون باریاتریک\n- بررسی بیماریهای همراه مانند دیابت، OSA، GERD\n- ارزیابی تغذیه و آمادگی روانی\n\n۲. بیهوشی و آمادهسازی\n- بیهوشی عمومی\n- آنتیبیوتیک پروفیلاکسی\n- وضعیتدهی مناسب در تخت جراحی\n\n۳. ایجاد پورتهای الپاروسکوپی\n- ورود تروکارها\n- ایجاد دید مناسب از معده و روده\n\n۴. ایجاد pouch معده\n- تقسیم معده به بخش کوچک\n- جدا کردن pouch از بقیه معده\n\n۵. ساخت Roux limb\n- اندازهگیری و آزادسازی ژژنوم\n- بالا آوردن loop روده به سمت pouch\n\n۶. انجام آناستوموزها\n- گاستروژژنوستومی\n- جژونوژژنوستومی\n- بررسی نشتی و خونریزی\n\n۷. پایان عمل\n- بررسی مسیر روده\n- بستن پورتها\n- درن در صورت نیاز",
      "instruments": "ست پایه:\n• اسکالپل\n• پنس\n• قیچی\n• نیدلهولدر\n• هموستات\n\nابزارهای تخصصی:\n• ست کامل الپاروسکوپی\n• تروکار\n• دوربین\n• استیپلر laparoscopic\n• graspers\n• dissector\n• energy device\n\nمواد مصرفی:\n• نخ قابل جذب\n• استیپلر و cartridge\n• مش/درن در صورت نیاز\n• گاز و پانسمان",
      "video_title_1": "Laparoscopic Roux-en-Y Gastric Bypass Full Procedure 4K",
      "video_url_1": "https://www.youtube.com/results?search_query=Laparoscopic+Roux+en+Y+Gastric+Bypass+Full+Procedure+4K"
    },
    "11": {
      "description": "کولهسیستکتومی الپاروسکوپیک برداشت کیسه صفرا با روش کمتهاجمی است و بیشتر برای سنگ کیسه صفرا، کولهسیستیت و عوارض آن انجام میشود.\n\nتشریح کامل عمل:\n۱. ارزیابی قبل از عمل\n- بررسی عالئم صفراوی\n- سونوگرافی و آزمایشهای کبدی\n- ارزیابی احتمال التهاب شدید یا چسبندگی\n\n۲. بیهوشی و آمادهسازی\n- بیهوشی عمومی\n- آنتیبیوتیک در صورت نیاز\n- پوزیشن مناسب و آمادهسازی شکم\n\n۳. ورود الپاروسکوپی\n- ایجاد pneumoperitoneum\n- گذاشتن تروکارها\n- مشاهده کیسه صفرا و کبد\n\n۴. دیسکسیون کالوت\n- آزادسازی مثلث Calot\n- شناسایی cystic duct و cystic artery\n- رسیدن به critical view of safety\n\n۵. کلیپ و قطع\n- کلیپکردن duct و artery\n- قطع ساختارها\n- جدا کردن کیسه صفرا از بستر کبد\n\n۶. خارج کردن و پایان عمل\n- خارجکردن GB در endobag\n- کنترل خونریزی\n- بستن پورتها",
      "instruments": "ست پایه:\n• اسکالپل\n• پنس\n• قیچی\n• هموستات\n• نیدلهولدر\n\nابزارهای تخصصی:\n• الپاروسکوپ\n• تروکار\n• کلیپر\n• graspers\n• hook cautery\n• suction/irrigation\n\nمواد مصرفی:\n• کلیپ فلزی یا polymer\n• نخ بخیه\n• endobag\n• گاز و پانسمان",
      "video_title_1": "Laparoscopic Cholecystectomy Technique",
      "video_url_1": "https://www.youtube.com/results?search_query=Laparoscopic+Cholecystectomy+Technique"
    },
    "12": {
      "description": "ترمیم هرنی الپاروسکوپیک برای اصلاح فتقهای شکمی، بهویژه اینگوینال، فمورال یا برخی فتقهای دیواره شکم انجام میشود. در این روش، فتق از داخل شکم یا فضای پریپریتونئال ترمیم و معمولاً با مش تقویت میشود.\n\nتشریح کامل عمل:\n۱. ارزیابی قبل از عمل\n- تعیین نوع و محل فتق\n- بررسی فتق دوطرفه یا عودکننده\n- ارزیابی شرایط عمومی بیمار\n\n۲. بیهوشی و آمادهسازی\n- بیهوشی عمومی\n- آنتیبیوتیک پروفیلاکسی\n- استریلکردن شکم و پهلوها\n\n۳. ایجاد دسترسی الپاروسکوپیک\n- TAPP یا TEP\n- ایجاد پورتها\n- بررسی محل فتق\n\n۴. کاهش فتق\n- برگرداندن محتویات فتق\n- آزادسازی چسبندگیها\n- بررسی viability بافت\n\n۵. قرار دادن مش\n- برش و جایگذاری مش\n- پوشش محل ضعف دیواره\n- تثبیت با tack یا بخیه\n\n۶. پایان عمل\n- بستن پریتونئوم در TAPP\n- خارجکردن ابزارها\n- بستن پورتها",
      "instruments": "ست پایه:\n• اسکالپل\n• قیچی\n• پنس\n• نیدلهولدر\n• هموستات\n\nابزارهای تخصصی:\n• ست الپاروسکوپی\n• تروکار\n• دوربین\n• mesh\n• tackers\n• dissector\n• grasper\n\nمواد مصرفی:\n• مش جراحی\n• نخ بخیه\n• کلیپ یا tack\n• گاز و پانسمان",
      "video_title_1": "Laparoscopic Inguinal Hernia Repair Step by Step",
      "video_url_1": "https://www.youtube.com/results?search_query=Laparoscopic+Inguinal+Hernia+Repair+Step+by+Step"
    }
  }
};
