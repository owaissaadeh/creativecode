# NexaCRM - نظام CRM متكامل

## نظرة عامة
نظام إدارة علاقات عملاء (CRM) متكامل مع Landing Page احترافية. مبني بـ React + TypeScript في الواجهة الأمامية و Express + PostgreSQL في الخلفية.

## الميزات
- **Landing Page** احترافية بـ Hero Section، خدمات، مشاريع، وCTA
- **نموذج Lead** مع حفظ البيانات في قاعدة البيانات وتتبع UTM
- **Meta Pixel** جاهز (تعديل PIXEL_ID في index.html)
- **Facebook Webhook** endpoint جاهز لربط Meta لاحقاً
- **نظام المصادقة** بـ JWT مع صلاحيات (admin/sales)
- **لوحة Admin**: إدارة المستخدمين، الـ Leads، العملاء، العمولات، التقارير
- **لوحة Sales**: الـ Leads المعينة، إدارة العملاء، متابعة العمولات
- **نظام العمولات** التلقائي عند إغلاق صفقة (Won)

## بيانات الدخول التجريبية
- **المدير**: admin@nexacrm.com / admin123
- **مبيعات (محمد)**: sales@nexacrm.com / sales123
- **مبيعات (سارة)**: sara@nexacrm.com / sara123

## هيكل الملفات
```
client/src/
  pages/
    Landing.tsx       - الصفحة الرئيسية العامة
    Login.tsx         - صفحة تسجيل الدخول
    admin/
      Dashboard.tsx   - لوحة تحكم المدير
      Users.tsx       - إدارة المستخدمين
      Leads.tsx       - إدارة العملاء المحتملين
      Clients.tsx     - إدارة العملاء
      Commissions.tsx - إدارة العمولات
      Reports.tsx     - التقارير والإحصائيات
    sales/
      Dashboard.tsx   - لوحة تحكم المبيعات
      Leads.tsx       - عملائي المحتملون
      Clients.tsx     - عملائي
      Commissions.tsx - عمولاتي
  components/
    Layout.tsx        - القالب الرئيسي مع Sidebar
  lib/
    auth.ts           - Zustand store للمصادقة
    queryClient.ts    - TanStack Query setup

server/
  index.ts            - نقطة البداية مع migrate + seed
  routes.ts           - جميع API endpoints
  storage.ts          - طبقة قاعدة البيانات
  db.ts               - Drizzle + PostgreSQL connection
  migrate.ts          - إنشاء الجداول
  seed.ts             - بيانات تجريبية

shared/
  schema.ts           - Drizzle schema + Zod types
```

## التقنيات
- Frontend: React, TypeScript, TanStack Query, Zustand, Tailwind CSS, shadcn/ui
- Backend: Express.js, TypeScript, JWT, bcryptjs
- Database: PostgreSQL, Drizzle ORM
- Auth: JWT Bearer Tokens (لا session cookies)

## إعداد Meta Pixel
في `client/index.html`، استبدل `__META_PIXEL_ID__` بـ Pixel ID الخاص بك.

## متغيرات البيئة
- `DATABASE_URL` - رابط قاعدة البيانات
- `SESSION_SECRET` - مفتاح JWT
- `FB_VERIFY_TOKEN` - للـ Facebook Webhook verification
