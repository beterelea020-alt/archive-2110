# ربط الأرشيف 21:10 بـ Supabase وVercel

## الخلاصة
المشروع يستخدم PostgreSQL عبر مكتبة `pg` وجداول مخصصة للمستخدمين والفرق والإجابات. لذلك يتصل بقاعدة بيانات Supabase PostgreSQL عن طريق `DATABASE_URL`؛ لا يحتاج `SUPABASE_URL` أو `SUPABASE_ANON_KEY` أو `SUPABASE_SERVICE_ROLE_KEY` في هذا التصميم. تسجيل الدخول الحالي مخصص للمشروع ولا يستخدم Supabase Auth.

## 1) تهيئة Supabase قبل تشغيل الموقع للعامة
1. أنشئ مشروع Supabase واحفظ كلمة مرور قاعدة البيانات.
2. افتح **Connect** في لوحة Supabase وانسخ URI من **Transaction pooler** لاستخدامه مع Vercel. استخدم الرابط كما أعطاك إياه Supabase واستبدل خانة كلمة المرور فقط، مع ترميز أي رموز خاصة في كلمة المرور URL-encoding عند الحاجة.
3. في نسخة المشروع الكاملة التي تحتوي مجلد `private/`، انسخ `.env.example` إلى `.env`.
4. ضع URI الذي نسخته في `DATABASE_URL`، واجعل `DATABASE_SSL=true`. أضف `ADMIN_EMAIL` و`ADMIN_PASSWORD`، واجعل كلمة المرور 12 حرفًا على الأقل. غيّر `AUTH_SECRET` إلى قيمة عشوائية طويلة لا تقل عن 32 حرفًا.
5. من مجلد المشروع الكامل على جهازك، شغّل:

   ```powershell
   npm install
   npm run db:setup
   ```

   يهيئ هذا الأمر الجداول ويضيف الفصول والتلميحات وينشئ/يرفع حساب الإدارة إلى دور ADMIN في قاعدة Supabase التي تشير إليها `DATABASE_URL`. يستخدم أمر التهيئة `private/round-hints.json`، لذا نفّذه من الحزمة الكاملة قبل الاعتماد على نسخة GitHub العامة التي تستبعد `private/`.

## 2) إعداد Vercel
من **Project → Settings → Environment Variables** أضف للـProduction (ولـPreview قيمة قاعدة بيانات اختبارية منفصلة إن أمكن):

- `DATABASE_URL` = URI من Supabase **Transaction pooler**.
- `DATABASE_SSL` = `true`.
- `AUTH_SECRET` = نفس السر الطويل الذي استخدمته للتطبيق في الإنتاج.

أعد النشر بعد حفظ المتغيرات. لا تسمِّ أيًا من هذه المتغيرات ببادئة `NEXT_PUBLIC_`، ولا تضع `DATABASE_URL` في كود المتصفح. لا تحتاج `ADMIN_PASSWORD` على Vercel بعد إنشاء الحساب في قاعدة البيانات؛ ضبطها على Vercel وحده لا ينشئ حساب المدير.

## 3) التحقق بعد النشر
1. افتح `/login` وسجّل الدخول بحساب المدير الذي أُنشئ أثناء `npm run db:setup`.
2. افتح `/admin` وتأكد من ظهور الأدوار العشرة والمواعيد.
3. ارفع ملف دليل الحل السري من لوحة الإدارة؛ سيُحفظ في جدول `admin_guides`.
4. أنشئ حساب لاعبًا تجريبيًا، أرسل إجابة تجريبية، واختبر التصحيح ونشر النتيجة.
5. تحقق من سجلات Vercel عند فشل أي طلب. نجاح بناء Vercel وحده لا يعني أن قاعدة البيانات هُيئت.

## تنبيهات
- لا تشغّل `npm run db:reset` على قاعدة الإنتاج؛ فهو يحذف جداول اللعبة.
- لا ترفع `private/` أو `.env` إلى مستودع عام. `.gitignore` يستبعدهما.
- هذا ربط بقاعدة PostgreSQL في Supabase، وليس تحويلًا إلى Supabase Auth أو Data API/RLS. كل عمليات قاعدة البيانات تمر عبر خادم Next.js، لذلك يجب إبقاء `DATABASE_URL` سرًا.
- إعدادات Vercel لا تُشغّل `db:setup` تلقائيًا؛ نفّذه مرة واحدة من جهازك مع `DATABASE_URL` الذي يشير إلى مشروع Supabase الصحيح.
