الأرشيف 21:10 — تشغيل سريع على Windows

1) ثبّت Node.js LTS وDocker Desktop.
2) افتح PowerShell داخل مجلد المشروع.
3) نفّذ: Copy-Item .env.example .env
4) افتح .env واضبط AUTH_SECRET (32 حرفًا عشوائيًا على الأقل)، وADMIN_EMAIL، وADMIN_PASSWORD (12 حرفًا على الأقل)، وGAME_DATE.
5) نفّذ: docker compose up -d
6) نفّذ: npm install
7) نفّذ: npm run db:setup
8) نفّذ: npm run dev
9) افتح: http://localhost:3000

دخول المدير يكون بالبريد وكلمة المرور التي كتبتها في .env. لا يوجد حساب مدير افتراضي.

قبل النشر: جهز قاعدة PostgreSQL مستضافة، نفّذ npm run db:setup محليًا باستخدام DATABASE_URL المستضافة، ثم ضع DATABASE_URL وDATABASE_SSL وAUTH_SECRET في إعدادات الاستضافة. لا ترفع مجلد private إلى GitHub؛ ارفع ملف دليل الإدارة السري من غرفة التحكم بعد تسجيل الدخول.


لـSupabase + Vercel: راجع README_SUPABASE_VERCEL.md. أوامر db:setup وdb:reset تقرأ .env صراحةً باستخدام Node.js 22. شغّل db:setup محليًا من الحزمة الكاملة بعد ضبط DATABASE_URL على Supabase وDATABASE_SSL=true، ثم أضف DATABASE_URL وDATABASE_SSL وAUTH_SECRET إلى Vercel وأعد النشر.
