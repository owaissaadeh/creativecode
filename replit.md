# Creative Code — نظام إدارة متكامل

## نظرة عامة
Landing Page لشركة Creative Code التقنية مع نظام CRM متكامل للإدارة الداخلية. مبني بـ React + TypeScript + Express + PostgreSQL.

## الميزات
- **Landing Page** لشركة Creative Code (تقنية) — RTL عربي كامل، خط Cairo
- **نظام حجز الاستشارات**: فورم جذاب مع تقويم مخصص + اختيار وقت (9:00-17:00)
- **CMS داخلي**: إدارة الخدمات والمشاريع من لوحة الأدمن (إضافة/تعديل/حذف/تفعيل)
- **إعدادات الهوية البصرية**: تعديل اسم الشركة (اللوغو) ورابط الفافيكون من تبويب الإعدادات
- **Meta Pixel** جاهز (تعديل PIXEL_ID في index.html)
- **Facebook Webhook** endpoint جاهز
- **نظام المصادقة** بـ JWT مع صلاحيات (admin/sales)
- **لوحة Admin**: مستخدمون، Leads، عملاء، عمولات، تقارير، إدارة محتوى، استشارات
- **لوحة Sales**: Leads المعينة، عملاء، عمولات
- **نظام العمولات** التلقائي عند إغلاق صفقة (Won)

## بيانات الدخول التجريبية
- **المدير**: admin@nexacrm.com / admin123
- **مبيعات (محمد)**: sales@nexacrm.com / sales123
- **مبيعات (سارة)**: sara@nexacrm.com / sara123

## هيكل الملفات
```
client/src/
  pages/
    Landing.tsx            - الصفحة الرئيسية (Creative Code + فورم الاستشارات)
    Login.tsx              - صفحة تسجيل الدخول
    admin/
      Dashboard.tsx        - لوحة تحكم المدير
      Users.tsx            - إدارة المستخدمين
      Leads.tsx            - إدارة العملاء المحتملين
      Clients.tsx          - إدارة العملاء
      Commissions.tsx      - العمولات
      Reports.tsx          - التقارير
      ContentManager.tsx   - إدارة محتوى الموقع (خدمات + مشاريع)
      Consultations.tsx    - إدارة الاستشارات المحجوزة
    sales/
      Dashboard.tsx        - لوحة تحكم المبيعات
      Leads.tsx            - عملائي المحتملون
      Clients.tsx          - عملائي
      Commissions.tsx      - عمولاتي

server/
  routes.ts    - كل الـ API endpoints
  storage.ts   - Database CRUD operations
  migrate.ts   - إنشاء الجداول + بذر البيانات الأولية

shared/
  schema.ts    - Database schema + types (Drizzle ORM)
```

## جداول قاعدة البيانات
- `users` — المستخدمون (admin/sales)
- `leads` — العملاء المحتملون من الـ Landing
- `clients` — العملاء الفعليون في البايبلاين
- `commissions` — العمولات التلقائية
- `page_items` — خدمات ومشاريع Landing Page (CMS)
- `consultations` — حجوزات الاستشارات مع تاريخ ووقت

## API Endpoints
### Public
- `GET /api/content/items` — خدمات ومشاريع الموقع
- `POST /api/consultations/public` — حجز استشارة جديد
- `POST /api/leads/public` — تسجيل عميل محتمل

### Admin (JWT required)
- `/api/admin/content/items` — CRUD للخدمات والمشاريع
- `/api/admin/consultations` — عرض وتحديث الحجوزات
- `/api/admin/stats|users|leads|clients|commissions|reports`

### Sales (JWT required)
- `/api/sales/stats|leads|clients|commissions`

## التقنيات
- Frontend: React, TypeScript, Vite, TanStack Query, Zustand, shadcn/ui, Tailwind
- Backend: Express.js, Drizzle ORM, PostgreSQL
- Auth: JWT Bearer tokens (localStorage key: `crm-auth`)
- RTL: كامل الموقع بالعربية من اليمين لليسار
