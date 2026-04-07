import { db } from "./db";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { pageItems } from "@shared/schema";

export async function migrateDb() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'sales',
        commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS leads (
        id VARCHAR(36) PRIMARY KEY,
        name TEXT NOT NULL,
        company_name TEXT,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        service_type TEXT NOT NULL,
        budget TEXT,
        message TEXT,
        source TEXT DEFAULT 'direct',
        status TEXT NOT NULL DEFAULT 'New',
        assigned_to VARCHAR(36) REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS clients (
        id VARCHAR(36) PRIMARY KEY,
        sales_id VARCHAR(36) REFERENCES users(id),
        client_name TEXT NOT NULL,
        company_name TEXT,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        service_type TEXT NOT NULL,
        deal_value DECIMAL(12,2) NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'New Lead',
        next_meeting_date TIMESTAMP,
        notes TEXT[] NOT NULL DEFAULT '{}',
        lead_id VARCHAR(36) REFERENCES leads(id),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS commissions (
        id VARCHAR(36) PRIMARY KEY,
        sales_id VARCHAR(36) NOT NULL REFERENCES users(id),
        client_id VARCHAR(36) NOT NULL REFERENCES clients(id),
        deal_value DECIMAL(12,2) NOT NULL,
        commission_rate DECIMAL(5,2) NOT NULL,
        commission_amount DECIMAL(12,2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS page_items (
        id VARCHAR(36) PRIMARY KEY,
        item_type TEXT NOT NULL,
        title TEXT NOT NULL,
        subtitle TEXT,
        description TEXT,
        icon TEXT,
        tags TEXT[] NOT NULL DEFAULT '{}',
        order_index INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS consultations (
        id VARCHAR(36) PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        company_name TEXT,
        service_type TEXT NOT NULL,
        consultation_date TEXT NOT NULL,
        consultation_time TEXT NOT NULL,
        message TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(36) PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        assigned_to VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
        created_by VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        due_date DATE,
        priority TEXT NOT NULL DEFAULT 'medium',
        status TEXT NOT NULL DEFAULT 'todo',
        related_lead_id VARCHAR(36) REFERENCES leads(id) ON DELETE SET NULL,
        related_client_id VARCHAR(36) REFERENCES clients(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    console.log("✅ Database tables ready");

    await seedPageItems();

  } catch (err) {
    console.error("Migration error:", err);
    throw err;
  }
}

async function seedPageItems() {
  const existing = await db.execute(sql`SELECT COUNT(*) as count FROM page_items`);
  const count = Number((existing.rows[0] as any).count);
  if (count > 0) return;

  const services = [
    { id: randomUUID(), item_type: "service", title: "تطوير التطبيقات", subtitle: "ويب وموبايل", description: "نبني تطبيقات ويب وموبايل متطورة بأحدث التقنيات وأفضل تجربة مستخدم", icon: "Code2", tags: ["React", "Node.js", "Flutter"], order_index: 1 },
    { id: randomUUID(), item_type: "service", title: "الذكاء الاصطناعي", subtitle: "حلول AI مخصصة", description: "حلول ذكاء اصطناعي مخصصة لتحسين أعمالك وأتمتة عملياتك بذكاء", icon: "Brain", tags: ["Python", "LLM", "NLP"], order_index: 2 },
    { id: randomUUID(), item_type: "service", title: "أتمتة العمليات", subtitle: "توفير الوقت والتكاليف", description: "نؤتمت عملياتك التجارية لتوفير الوقت والتكاليف وزيادة الإنتاجية", icon: "Zap", tags: ["Automation", "Workflow", "API"], order_index: 3 },
    { id: randomUUID(), item_type: "service", title: "الأنظمة المتكاملة", subtitle: "إدارة شاملة", description: "أنظمة إدارة متكاملة تلبي جميع احتياجات مؤسستك في مكان واحد", icon: "Settings2", tags: ["ERP", "CRM", "Dashboard"], order_index: 4 },
    { id: randomUUID(), item_type: "service", title: "الحوسبة السحابية", subtitle: "بنية تحتية آمنة", description: "نقل وإدارة بياناتك على السحابة بأمان وكفاءة عالية", icon: "Cloud", tags: ["AWS", "Azure", "DevOps"], order_index: 5 },
    { id: randomUUID(), item_type: "service", title: "تطبيقات الموبايل", subtitle: "iOS وAndroid", description: "تطبيقات موبايل احترافية لنظامي iOS وAndroid بتجربة مستخدم مميزة", icon: "Smartphone", tags: ["Flutter", "React Native", "Swift"], order_index: 6 },
  ];

  const projects = [
    { id: randomUUID(), item_type: "project", title: "بوت خدمة العملاء", subtitle: "ذكاء اصطناعي", description: "روبوت محادثة ذكي للرد على استفسارات العملاء على مدار الساعة بدقة عالية", icon: "Bot", tags: ["Python", "NLP", "WhatsApp API"], order_index: 1 },
    { id: randomUUID(), item_type: "project", title: "نظام إدارة المطاعم", subtitle: "نظام متكامل", description: "نظام شامل لإدارة الطلبات والمخزون والموظفين مع تقارير تفصيلية", icon: "UtensilsCrossed", tags: ["React", "Firebase", "Node.js"], order_index: 2 },
    { id: randomUUID(), item_type: "project", title: "منصة تعليمية ذكية", subtitle: "ذكاء اصطناعي", description: "منصة تعليمية تفاعلية مع ذكاء اصطناعي لتتبع تقدم الطلاب وتخصيص المحتوى", icon: "GraduationCap", tags: ["React", "Node.js", "AI"], order_index: 3 },
    { id: randomUUID(), item_type: "project", title: "تطبيق توصيل سريع", subtitle: "تطبيق موبايل", description: "تطبيق توصيل متكامل مع تتبع الطلبات لحظة بلحظة وواجهة سهلة الاستخدام", icon: "Truck", tags: ["Flutter", "Maps API", "Firebase"], order_index: 4 },
    { id: randomUUID(), item_type: "project", title: "منصة تجارة إلكترونية", subtitle: "متجر متكامل", description: "منصة تجارة إلكترونية متكاملة مع نظام دفع آمن وإدارة مخزون ذكية", icon: "ShoppingCart", tags: ["Next.js", "Stripe", "MongoDB"], order_index: 5 },
    { id: randomUUID(), item_type: "project", title: "لوحة تحليلات ذكية", subtitle: "BI Dashboard", description: "لوحة تحليلات بيانات متقدمة مع تقارير تفاعلية ونماذج تنبؤية بالذكاء الاصطناعي", icon: "BarChart3", tags: ["Python", "PowerBI", "ML"], order_index: 6 },
  ];

  const allItems = [...services, ...projects];
  for (const item of allItems) {
    await db.insert(pageItems).values({
      id: item.id,
      itemType: item.item_type as "service" | "project",
      title: item.title,
      subtitle: item.subtitle,
      description: item.description,
      icon: item.icon,
      tags: item.tags,
      orderIndex: item.order_index,
      isActive: true,
    });
  }

  console.log("✅ Page items seeded");
}
