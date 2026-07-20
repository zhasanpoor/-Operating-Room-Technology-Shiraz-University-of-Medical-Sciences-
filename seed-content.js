require('dotenv').config();

module.exports = function(db) {

const contentData = [
  {
    op_number: '01',
    description: `آمپوتاسیون به معنای برداشت جراحی بخشی از اندام یا کل اندام است. این عمل معمولاً در موارد گانگرن، ایسکمی شدید، تروما، عفونت غیرقابل کنترل، تومورهای بدخیم یا بدشکلی‌های غیرقابل اصلاح انجام می‌شود. هدف، حذف بافت غیرقابل حیات، کنترل درد و عفونت، و ایجاد استامپ مناسب برای ترمیم یا پروتزگذاری است.

تشریح کامل عمل:

۱. ارزیابی قبل از عمل
- تعیین سطح مناسب قطع عضو بر اساس: خونرسانی بافت، میزان درگیری عفونی یا تروما، قابلیت استفاده از پروتز، وضعیت عمومی بیمار
- بررسی عروقی، تصویربرداری در صورت لزوم، و ارزیابی بیهوشی

۲. بیهوشی و آماده‌سازی
- معمولاً بیهوشی عمومی یا اسپاینال
- آنتی‌بیوتیک پروفیلاکسی در صورت نیاز
- قرار دادن تورنیکه در اندام مناسب در صورت اندیکاسیون

۳. طراحی فلپ‌ها
- بسته به سطح قطع، فلپ‌های پوستی قدامی/خلفی یا long posterior flap طراحی می‌شوند
- هدف: پوشش بدون کشش و ایجاد استامپ پایدار

۴. برش پوست و بافت نرم
- برش پوست با اسکالپل
- کنترل خونریزی با الکتروکوتر
- ادامه برش تا لایه‌های عمقی

۵. قطع عضلات
- عضلات به‌صورت لایه‌به‌لایه قطع می‌شوند
- عروق و اعصاب شناسایی و محافظت می‌شوند
- عضلات آنتاگونیست در صورت امکان با myodesis / myoplasty تثبیت می‌شوند

۶. کنترل عروق
- شریان و وریدهای اصلی لیگاتور می‌شوند
- عروق کوچک با کوتر یا لیگاتور بسته می‌شوند
- کنترل هموستاز بسیار مهم است

۷. مدیریت اعصاب
- اعصاب اصلی با کشش ملایم کشیده و در سطح بالاتر قطع می‌شوند
- هدف: کاهش احتمال نوروم دردناک

۸. قطع استخوان
- پریوست به‌طور مناسب جدا می‌شود
- استخوان با اره جراحی یا اره استخوانی قطع می‌شود
- لبه‌های تیز با رَسپ یا فایل استخوانی صاف می‌شوند

۹. شستشو و هموستاز نهایی
- شستشوی حفره با سرم
- کنترل خونریزی نهایی
- در صورت نیاز درن گذاشته می‌شود

۱۰. بستن زخم
- فاشیا و عضله بسته می‌شوند
- پوست با بخیه یا استیپل بسته می‌شود
- پانسمان فشاری جهت شکل‌دهی استامپ`,
    instruments: `ست پایه:
• اسکالپل دسته ۳ یا ۴
• تیغ شماره ۱۰، ۱۱، ۱۵، ۲۰/۲۲
• قیچی مایو مستقیم و خمیده
• قیچی متزن‌بام
• پنس آناتومیک
• پنس دندانه‌دار
• هموستات کِلی
• هموستات کرایل
• کلمپ کوخر
• نیدلهولدر
• سوزن بخیه
• رترکتور دستی

ابزارهای تخصصی:
• تورنیکه پنوماتیک
• الکتروکوتر مونوپولار/بایپولار
• اره استخوانی یا oscillating saw
• گیلی‌ساو در برخی موارد
• رَسپ یا فایل استخوانی
• Periosteal elevator
• Bone cutter / rongeur
• Suction tip

مواد مصرفی:
• نخ لیگاتور ابریشم 2-0/0
• Vicryl 0, 2-0
• Nylon 2-0 یا 3-0
• استیپلر پوستی
• گاز، سرم، پانسمان فشاری
• درن در صورت نیاز`,
    video_url_1: 'https://www.youtube.com/watch?v=QYfGxYkCbVQ',
    video_title_1: 'Below Knee Amputation - Surgical Technique',
    video_url_2: 'https://www.youtube.com/watch?v=dVp1wkJHcGc',
    video_title_2: 'Above Knee Amputation - Full Procedure'
  },
  {
    op_number: '02',
    description: `آپاندکتومی عمل برداشت آپاندیس است که معمولاً به‌دلیل آپاندیسیت حاد انجام می‌شود. این عمل می‌تواند به‌صورت باز یا لاپاروسکوپیک انجام شود. هدف، حذف منبع عفونت و پیشگیری از پرفوراسیون، پریتونیت و آبسه است.

تشریح کامل عمل:

۱. ارزیابی و آماده‌سازی
- تشخیص بالینی و تصویربرداری در صورت نیاز
- NPO، مایع‌درمانی، آنتی‌بیوتیک
- بیهوشی عمومی

۲. انتخاب رویکرد
- Open appendectomy: اغلب از برش McBurney یا Lanz
- Laparoscopic appendectomy: با ۳ پورت یا بیشتر

۳. ایجاد دسترسی
- در روش باز: برش در ربع تحتانی راست
- در روش لاپاروسکوپیک: ایجاد پنوموپریتونئوم و قرار دادن تروکارها

۴. شناسایی آپاندیس
- یافتن cecum و taeniae coli
- دنبال کردن تا base آپاندیس

۵. کنترل مزوآپاندیس
- لیگاتور یا کوتر عروق مزوآپاندیس
- جداسازی تدریجی

۶. بستن پایه آپاندیس
- لیگاتور base
- در لاپاروسکوپیک: endoloop یا stapler

۷. برداشت آپاندیس
- قطع آپاندیس و خارج‌کردن در specimen bag
- در صورت آلودگی، شستشوی ناحیه

۸. کنترل هموستاز و بستن
- بررسی stump
- بستن لایه‌ها
- در موارد آلوده، ممکن است درن لازم شود`,
    instruments: `ست پایه:
• اسکالپل
• قیچی مایو و متزن‌بام
• پنس آدسون/آناتومیک
• هموستات‌ها
• نیدلهولدر
• رترکتور کوچک و متوسط

ابزارهای تخصصی:
• در روش باز:
  - Deaver retractor
  - Langenbeck retractor
  - Balfour در برخی موارد
• در روش لاپاروسکوپیک:
  - تروکار ۵ و ۱۰/۱۲ میلیمتری
  - دوربین لاپاروسکوپی
  - Grasper
  - Dissector
  - Endoloop
  - Endostapler در صورت نیاز
  - Suction-irrigation
  - Suction و electrocautery

مواد مصرفی:
• Vicryl 2-0 / 3-0
• Monocryl یا Nylon برای پوست
• Endoloop یا stapler cartridge
• سرم شستشو
• آنتی‌بیوتیک`,
    video_url_1: 'https://www.youtube.com/watch?v=GHBqNBqMMSg',
    video_title_1: 'Laparoscopic Appendectomy - Full Procedure',
    video_url_2: 'https://www.youtube.com/watch?v=I6V3J5qB7YA',
    video_title_2: 'Open Appendectomy - Surgical Technique'
  },
  {
    op_number: '03',
    description: `کوله‌سیستکتومی برداشت جراحی کیسه صفرا است. شایع‌ترین اندیکاسیون آن سنگ کیسه صفرا، کوله‌سیستیت حاد یا مزمن، پولیپ مشکوک و برخی اختلالات عملکردی است. امروزه اغلب به‌صورت لاپاروسکوپیک انجام می‌شود.

تشریح کامل عمل:

۱. آماده‌سازی
- ارزیابی آزمایشگاهی و تصویربرداری
- بیهوشی عمومی
- آنتی‌بیوتیک پروفیلاکسی در موارد عفونی

۲. ورود لاپاروسکوپیک
- ایجاد پنوموپریتونئوم
- گذاشتن تروکارها در موقعیت‌های استاندارد

۳. اکسپوژر
- بالا کشیدن فوندوس کیسه صفرا
- کنار زدن اینفاندیبولوم
- نمایان‌کردن مثلث کالو/هپاتوسیستیک

۴. تشریح مثلث هپاتوسیستیک
- شناسایی cystic duct و cystic artery
- رعایت critical view of safety

۵. بستن و قطع داکت و شریان سیستیک
- کلیپ‌گذاری یا لیگاتور
- سپس قطع

۶. جدا کردن کیسه صفرا از بستر کبد
- با کوتر یا hook dissection
- کنترل خونریزی بستر

۷. خارج‌کردن نمونه
- در specimen bag
- شستشو و بررسی نشت صفرا

۸. بستن
- خارج‌کردن تروکارها
- بستن فاشیای پورتهای بزرگ
- بخیه پوست`,
    instruments: `ست پایه:
• اسکالپل
• پنس و قیچی
• نیدلهولدر
• ساکشن
• کوتر

ابزارهای تخصصی لاپاروسکوپیک:
• لاپاروسکوپ ۳۰ درجه
• تروکار ۵ و ۱۰/۱۲mm
• Insufflator
• Graspers
• Maryland dissector
• Hook cautery
• Clip applier
• Endobag
• Suction-irrigation
• Needle driver لاپاروسکوپیک

مواد مصرفی:
• Clips titanium یا polymer
• Vicryl 2-0 / 3-0
• Nylon یا absorbable برای پوست
• سرم شستشو`,
    video_url_1: 'https://www.youtube.com/watch?v=IyFYmBGDdWY',
    video_title_1: 'Laparoscopic Cholecystectomy - 4K Step by Step',
    video_url_2: 'https://www.youtube.com/watch?v=5W2qW2qW2qY',
    video_title_2: 'Cholecystectomy - Critical View of Safety'
  },
  {
    op_number: '04',
    description: `گاستروژژنوستومی تیوب، لوله‌ای برای تغذیه است که از طریق دیواره شکم وارد معده شده و نوک آن به ژژنوم هدایت می‌شود. این کار برای بیمارانی انجام می‌شود که تغذیه دهانی ندارند یا خطر آسپیراسیون بالا دارند.

تشریح کامل عمل:

۱. اندیکاسیون
- اختلال بلع
- آسپیراسیون مکرر
- ناتوانی در تغذیه دهانی
- نیاز به تغذیه طولانی‌مدت

۲. روش انجام
- ممکن است به‌صورت اندوسکوپیک، فلوروسکوپیک یا جراحی باز انجام شود

۳. ورود به معده
- ایجاد دسترسی از راه پوست یا حین جراحی
- تثبیت معده به دیواره شکم در صورت نیاز

۴. عبور دادن لوله
- لوله از stomach وارد pylorus و سپس jejunum می‌شود
- موقعیت نوک لوله تأیید می‌شود

۵. فیکس کردن
- بالون یا bumper در معده
- تثبیت بخش ژژونال برای جلوگیری از جابجایی

۶. کنترل و آموزش
- اطمینان از محل صحیح
- آموزش مراقبت از لوله، flush و feeding`,
    instruments: `اگر اندوسکوپیک/فلوروسکوپیک:
• اندوسکوپ
• فلوروسکوپی
• Guidewire
• Dilator
• GJ tube kit
• Syringe
• Contrast

اگر جراحی:
• ست جراحی عمومی
• Retractors
• Clamp
• Needle holder
• Suction
• Electrocautery
• Feeding tube kit

مواد مصرفی:
• لوله GJ
• Sutures برای fixation
• Dressing material
• Contrast media در صورت نیاز`,
    video_url_1: 'https://www.youtube.com/watch?v=kB0F5z2q3RI',
    video_title_1: 'J Tube Placement Procedure - PEG',
    video_url_2: 'https://www.youtube.com/watch?v=example4',
    video_title_2: 'Gastrojejunostomy Tube - Fluoroscopy Guided'
  },
  {
    op_number: '05',
    description: `گاستروستومی تیوب یا G-tube لوله‌ای است که برای تغذیه مستقیم وارد معده می‌شود. در بیمارانی استفاده می‌شود که توانایی تغذیه دهانی ندارند ولی معده عملکرد مناسبی دارد.

تشریح کامل عمل:

۱. اندیکاسیون
- دیسفاژی
- بیماری‌های نورولوژیک
- ناتوانی در تغذیه کافی
- نیاز به تغذیه طولانی‌مدت

۲. روش انجام
- PEG: Percutaneous Endoscopic Gastrostomy
- Open gastrostomy
- Laparoscopic gastrostomy

۳. دسترسی به معده
- تعیین محل مناسب روی دیواره شکم
- در PEG با اندوسکوپ، نور transillumination و finger indentation
- در روش جراحی، معده به سطح قدامی شکم آورده می‌شود

۴. ایجاد مسیر
- سوراخ کردن دیواره شکم و معده
- عبور guidewire یا لوله

۵. قرار دادن تیوب
- قرارگیری bumper/balloon
- تثبیت داخلی و خارجی

۶. تأیید و پانسمان
- بررسی محل
- پانسمان استریل
- آموزش مراقبت از لوله`,
    instruments: `در PEG:
• اندوسکوپ
• PEG kit
• Guidewire
• Trocar needle
• Introducer
• Dilator
• Bumper tube
• Syringe
• Antiseptic prep

در روش جراحی:
• ست عمومی
• Retractors
• Needle holder
• Clamps
• Suction
• Electrocautery
• Gastrostomy tube kit

مواد مصرفی:
• G-tube
• Sutures
• Dressing
• Saline/contrast در صورت نیاز`,
    video_url_1: 'https://www.youtube.com/watch?v=LQrJ6eLW1FY',
    video_title_1: 'PEG Tube Gastrostomy - Placement Full Procedure',
    video_url_2: 'https://www.youtube.com/watch?v=example5',
    video_title_2: 'Stamm Gastrostomy - Open Surgical Technique'
  },
  {
    op_number: '06',
    description: `گاسترکتومی به برداشت بخشی یا تمام معده گفته می‌شود. این عمل برای سرطان معده، زخم‌های مقاوم، خونریزی شدید، ضایعات پیش‌سرطانی، یا بیماری‌های خاص انجام می‌شود. انواع آن شامل partial gastrectomy و total gastrectomy است.

تشریح کامل عمل:

۱. ارزیابی قبل از عمل
- بررسی اندوسکوپی، CT scan، biopsy
- ارزیابی وضعیت تغذیه، کم‌خونی، عملکرد قلب و ریه
- آماده‌سازی برای بیهوشی عمومی

۲. اکسپوژر
- معمولاً از راه الپاراتومی یا لاپاروسکوپی
- بررسی کامل حفره شکمی و staging در موارد بدخیمی

۳. آزادسازی معده
- لیگاتور و قطع عروق مناسب
- جداسازی greater and lesser curvature
- در صورت نیاز dissection of lymph nodes

۴. برداشت بخش موردنظر
- در partial gastrectomy: برداشت قسمت distal یا proximal
- در total gastrectomy: برداشت کامل معده

۵. بازسازی مسیر گوارشی
- Billroth I
- Billroth II
- Roux-en-Y reconstruction
- انتخاب روش بر اساس وضعیت بیمار و هدف عمل

۶. کنترل خونریزی و نشتی
- تست آناستوموز
- شستشو
- قرار دادن درن در برخی موارد

۷. بستن
- Closure لایه‌ها
- پانسمان و مراقبت بعد از عمل`,
    instruments: `ست پایه:
• اسکالپل
• قیچی
• پنس‌ها
• هموستات
• نیدلهولدر
• Retractors

ابزارهای تخصصی:
• Balfour retractor
• Bookwalter retractor
• Suction irrigator
• Electrocautery
• Stapler linear / circular
• Gastric clamps
• Bowel clamps
• Vessel ligation instruments
• Anastomosis instruments

مواد مصرفی:
• Sutures قابل جذب و غیرقابل جذب
• Stapler cartridges
• Drains
• Saline
• Specimen bags`,
    video_url_1: 'https://www.youtube.com/watch?v=totalGastrectomy',
    video_title_1: 'Roux-en-Y Total Gastrectomy - Reconstruction',
    video_url_2: 'https://www.youtube.com/watch?v=subtotalGast',
    video_title_2: 'Laparoscopic Subtotal Gastrectomy'
  },
  {
    op_number: '07',
    description: `گاستروژژنوستومی ایجاد اتصال جراحی بین معده و ژژنوم است تا عبور غذا از دوازدهه دور زده شود. این عمل بیشتر برای رفع انسداد خروجی معده، بایپس در بدخیمی‌ها، یا برخی جراحی‌های باریاتریک انجام می‌شود.

تشریح کامل عمل:

۱. ارزیابی قبل از عمل
- بررسی علت انسداد یا نیاز به بایپس
- ارزیابی تغذیه، وضعیت عمومی، و تصویربرداری در صورت لزوم
- انتخاب روش باز، لاپاروسکوپیک، یا اندوسکوپیک

۲. بیهوشی و آماده‌سازی
- معمولاً بیهوشی عمومی
- آنتی‌بیوتیک پروفیلاکسی
- آماده‌سازی شکم و استریل‌کردن میدان عمل

۳. دسترسی به شکم
- الپاراتومی یا ایجاد پورت‌های لاپاروسکوپی
- بررسی معده، دوازدهه، و ژژنوم

۴. انتخاب محل آناستوموز
- انتخاب حلقه مناسب ژژنوم
- رساندن ژژنوم به کنار معده بدون کشش

۵. ایجاد آناستوموز
- باز کردن رویه معده و ژژنوم
- انجام آناستوموز به‌صورت hand-sewn یا stapled
- ایجاد مسیر عبور جدید برای غذا

۶. کنترل نشتی و خونریزی
- بررسی لبه‌ها
- تست نشتی در صورت نیاز
- هموستاز نهایی

۷. بستن شکم
- شستشو
- درن در صورت نیاز
- بستن لایه‌ها`,
    instruments: `ست پایه:
• اسکالپل
• قیچی
• پنس
• هموستات
• نیدلهولدر
• رترکتور

ابزارهای تخصصی:
• ست لاپاروسکوپی در صورت روش کم‌تهاجمی
• تروکار
• دوربین
• گراسپر
• کوتر
• ساکشن/ایریگیشن

مواد مصرفی:
• نخ‌های قابل جذب و غیرقابل جذب
• استیپلر linear یا circular
• گاز و پانسمان
• درن در صورت نیاز`,
    video_url_1: 'https://www.youtube.com/watch?v=rouxEnYHand',
    video_title_1: 'Roux-en-Y Gastrojejunostomy - Hand Sewn Technique',
    video_url_2: 'https://www.youtube.com/watch?v=openGJ',
    video_title_2: 'Open Gastrojejunostomy - Surgical Steps'
  },
  {
    op_number: '08',
    description: `ترمیم هرنی اینگوینال یعنی برگرداندن محتویات فتق به حفره شکم و تقویت دیواره کانال اینگوینال با مش یا ترمیم بافتی. رایج‌ترین روش باز، تکنیک Lichtenstein است.

تشریح کامل عمل:

۱. ارزیابی قبل از عمل
- تعیین نوع فتق: مستقیم، غیرمستقیم، یا مختنق
- بررسی قابلیت ریداکشن
- ارزیابی درد، تورم، و علائم ایسکمی یا انسداد

۲. بیهوشی و آماده‌سازی
- بیهوشی عمومی، نخاعی، یا موضعی
- آنتی‌بیوتیک در صورت استفاده از مش
- وضعیت‌دهی مناسب بیمار

۳. برش و دسترسی
- برش اینگوینال روی کانال
- باز کردن لایه‌ها تا رسیدن به کانال اینگوینال
- شناسایی طناب اسپرماتیک یا لیگامان راند

۴. جداسازی کیسه فتق
- جدا کردن کیسه از ساختارهای اطراف
- بازگرداندن محتویات فتق
- لیگاتور یا رزکشن کیسه در صورت نیاز

۵. ترمیم دیواره
- قرار دادن مش در روش Lichtenstein
- تثبیت مش با بخیه
- یا ترمیم بدون مش در روش Shouldice

۶. بستن زخم
- هموستاز نهایی
- بستن فاشیا و پوست
- پانسمان استریل`,
    instruments: `ست پایه:
• اسکالپل
• قیچی
• پنس
• هموستات
• نیدلهولدر
• رترکتور دستی

ابزارهای تخصصی:
• مش جراحی
• کوتر
• ست لاپاروسکوپی در روش TAPP/TEP
• تروکار
• تکر/فیکس‌کننده مش

مواد مصرفی:
• نخ پروپیلن یا نایلون
• نخ قابل جذب
• گاز و پانسمان
• مش پلی‌پروپیلن`,
    video_url_1: 'https://www.youtube.com/watch?v=lichtensteinHernia',
    video_title_1: 'Lichtenstein Inguinal Hernia Repair - Step by Step',
    video_url_2: '',
    video_title_2: ''
  },
  {
    op_number: '09',
    description: `ژژنوستومی تیوب قرار دادن لوله تغذیه مستقیم در ژژنوم است برای بیمارانی که نمی‌توانند از راه دهان یا معده تغذیه شوند یا در خطر آسپیراسیون هستند.

تشریح کامل عمل:

۱. ارزیابی قبل از عمل
- بررسی نیاز تغذیه‌ای طولانی‌مدت
- ارزیابی عملکرد دستگاه گوارش فوقانی
- انتخاب روش جراحی، اندوسکوپیک، یا فلوروسکوپیک

۲. بیهوشی و آماده‌سازی
- آرام‌بخشی یا بیهوشی عمومی
- آنتی‌بیوتیک پروفیلاکسی
- استریل‌کردن محل ورود لوله

۳. دسترسی به ژژنوم
- از راه جراحی باز یا اندوسکوپی/فلوروسکوپی
- انتخاب لوپ مناسب ژژنوم

۴. قرار دادن لوله
- عبور guidewire
- قرار دادن لوله J روی wire
- تثبیت داخلی و خارجی لوله

۵. فیکس و بررسی
- اطمینان از محل صحیح
- شستشوی لوله
- فیکس خارجی روی پوست`,
    instruments: `ست پایه:
• اسکالپل
• پنس
• قیچی
• نیدلهولدر
• رترکتور

ابزارهای تخصصی:
• آندوسکوپ
• فلوروسکوپ
• Guidewire
• Dilator
• کیت jejunostomy tube
• سرنگ و ست flush

مواد مصرفی:
• نخ بخیه
• پانسمان
• محلول ضدعفونی
• سرم نرمال سالین`,
    video_url_1: 'https://www.youtube.com/watch?v=witzelJej',
    video_title_1: 'Witzel Jejunostomy Technique',
    video_url_2: '',
    video_title_2: ''
  },
  {
    op_number: '10',
    description: `بایپس لاپاروسکوپیک معمولاً به Roux-en-Y gastric bypass اشاره دارد؛ در آن معده کوچک شده و به ژژنوم متصل می‌شود تا هم حجم غذای دریافتی کم شود و هم جذب کاهش یابد.

تشریح کامل عمل:

۱. ارزیابی قبل از عمل
- بررسی BMI و اندیکاسیون باریاتریک
- بررسی بیماری‌های همراه مانند دیابت، OSA، GERD
- ارزیابی تغذیه و آمادگی روانی

۲. بیهوشی و آماده‌سازی
- بیهوشی عمومی
- آنتی‌بیوتیک پروفیلاکسی
- وضعیت‌دهی مناسب در تخت جراحی

۳. ایجاد پورت‌های لاپاروسکوپی
- ورود تروکارها
- ایجاد دید مناسب از معده و روده

۴. ایجاد pouch معده
- تقسیم معده به بخش کوچک
- جدا کردن pouch از بقیه معده

۵. ساخت Roux limb
- اندازه‌گیری و آزادسازی ژژنوم
- بالا آوردن loop روده به سمت pouch

۶. انجام آناستوموزها
- گاستروژژنوستومی
- ژژنوژژنوستومی
- بررسی نشتی و خونریزی

۷. پایان عمل
- بررسی مسیر روده
- بستن پورت‌ها
- درن در صورت نیاز`,
    instruments: `ست پایه:
• اسکالپل
• پنس
• قیچی
• نیدلهولدر
• هموستات

ابزارهای تخصصی:
• ست کامل لاپاروسکوپی
• تروکار
• دوربین
• استیپلر laparoscopic
• Graspers
• Dissector
• Energy device

مواد مصرفی:
• نخ قابل جذب
• استیپلر و cartridge
• مش/درن در صورت نیاز
• گاز و پانسمان`,
    video_url_1: 'https://www.youtube.com/watch?v=rouxEnYGastric',
    video_title_1: 'Laparoscopic Roux-en-Y Gastric Bypass - Full Procedure 4K',
    video_url_2: '',
    video_title_2: ''
  },
  {
    op_number: '11',
    description: `کوله‌سیستکتومی لاپاروسکوپیک برداشت کیسه صفرا با روش کم‌تهاجمی است و بیشتر برای سنگ کیسه صفرا، کوله‌سیستیت و عوارض آن انجام می‌شود.

تشریح کامل عمل:

۱. ارزیابی قبل از عمل
- بررسی علائم صفراوی
- سونوگرافی و آزمایش‌های کبدی
- ارزیابی احتمال التهاب شدید یا چسبندگی

۲. بیهوشی و آماده‌سازی
- بیهوشی عمومی
- آنتی‌بیوتیک در صورت نیاز
- پوزیشن مناسب و آماده‌سازی شکم

۳. ورود لاپاروسکوپی
- ایجاد pneumoperitoneum
- گذاشتن تروکارها
- مشاهده کیسه صفرا و کبد

۴. دیسکسیون کالوت
- آزادسازی مثلث Calot
- شناسایی cystic duct و cystic artery
- رسیدن به critical view of safety

۵. کلیپ و قطع
- کلیپ‌کردن duct و artery
- قطع ساختارها
- جدا کردن کیسه صفرا از بستر کبد

۶. خارج کردن و پایان عمل
- خارج‌کردن GB در endobag
- کنترل خونریزی
- بستن پورت‌ها`,
    instruments: `ست پایه:
• اسکالپل
• پنس
• قیچی
• هموستات
• نیدلهولدر

ابزارهای تخصصی:
• لاپاروسکوپ
• تروکار
• کلیپر
• Graspers
• Hook cautery
• Suction/irrigation

مواد مصرفی:
• کلیپ فلزی یا polymer
• نخ بخیه
• Endobag
• گاز و پانسمان`,
    video_url_1: 'https://www.youtube.com/watch?v=lapCholecystTech',
    video_title_1: 'Laparoscopic Cholecystectomy Technique',
    video_url_2: '',
    video_title_2: ''
  },
  {
    op_number: '12',
    description: `ترمیم هرنی لاپاروسکوپیک برای اصلاح فتق‌های شکمی، به‌ویژه اینگوینال، فمورال یا برخی فتق‌های دیواره شکم انجام می‌شود. در این روش، فتق از داخل شکم یا فضای پری‌پریتونئال ترمیم و معمولاً با مش تقویت می‌شود.

تشریح کامل عمل:

۱. ارزیابی قبل از عمل
- تعیین نوع و محل فتق
- بررسی فتق دوطرفه یا عودکننده
- ارزیابی شرایط عمومی بیمار

۲. بیهوشی و آماده‌سازی
- بیهوشی عمومی
- آنتی‌بیوتیک پروفیلاکسی
- استریل‌کردن شکم و پهلوها

۳. ایجاد دسترسی لاپاروسکوپیک
- TAPP یا TEP
- ایجاد پورت‌ها
- بررسی محل فتق

۴. کاهش فتق
- برگرداندن محتویات فتق
- آزادسازی چسبندگی‌ها
- بررسی viability بافت

۵. قرار دادن مش
- برش و جایگذاری مش
- پوشش محل ضعف دیواره
- تثبیت با tack یا بخیه

۶. پایان عمل
- بستن پریتونئوم در TAPP
- خارج‌کردن ابزارها
- بستن پورت‌ها`,
    instruments: `ست پایه:
• اسکالپل
• قیچی
• پنس
• نیدلهولدر
• هموستات

ابزارهای تخصصی:
• ست لاپاروسکوپی
• تروکار
• دوربین
• Mesh
• tackers
• Dissector
• Grasper

مواد مصرفی:
• مش جراحی
• نخ بخیه
• کلیپ یا tack
• گاز و پانسمان`,
    video_url_1: 'https://www.youtube.com/watch?v=lapHerniaRepair',
    video_title_1: 'Laparoscopic Inguinal Hernia Repair - Step by Step',
    video_url_2: '',
    video_title_2: ''
  }
];

function seedContent() {
    console.log('Seeding operation content...');

    const updateContent = db.prepare(`
        UPDATE operation_content SET
            description = ?,
            instruments = ?,
            video_url_1 = ?,
            video_url_2 = ?,
            video_title_1 = ?,
            video_title_2 = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE operation_id = (SELECT id FROM operations WHERE op_number = ?)
    `);

    const transaction = db.transaction(() => {
        for (const content of contentData) {
            const result = updateContent.run(
                content.description,
                content.instruments,
                content.video_url_1 || '',
                content.video_url_2 || '',
                content.video_title_1 || '',
                content.video_title_2 || '',
                content.op_number
            );
            if (result.changes > 0) {
                console.log(`  ✓ Op ${content.op_number} content updated`);
            } else {
                console.log(`  ✗ Op ${content.op_number} not found`);
            }
        }
    });

    transaction();
    console.log('Content seeding completed!');
}

seedContent();
};
