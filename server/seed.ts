import { storage } from "./storage";
import { db } from "./db";
import { users, commissions, clients, leads, consultations } from "@shared/schema";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

export async function seedDatabase() {
  try {
    // Only seed if admin doesn't exist — NEVER delete existing data
    const existingAdmin = await storage.getUserByEmail("admin@creativecode-jo.com");
    if (existingAdmin) {
      console.log("✅ Database already seeded, skipping.");
      return;
    }

    console.log("🌱 Seeding fresh demo data...");

    // ─── Users ───────────────────────────────────────────────────────────────
    const admin = await storage.createUser({
      id: randomUUID(),
      name: "أويس - المدير العام",
      email: "admin@creativecode-jo.com",
      password: await bcrypt.hash("owais@123", 10),
      role: "admin",
      commissionRate: "0",
    });

    const sales1 = await storage.createUser({
      id: randomUUID(),
      name: "محمد أحمد",
      email: "m.ahmed@creativecode-jo.com",
      password: await bcrypt.hash("sales123", 10),
      role: "sales",
      commissionRate: "10",
    });

    const sales2 = await storage.createUser({
      id: randomUUID(),
      name: "سارة خالد",
      email: "s.khalid@creativecode-jo.com",
      password: await bcrypt.hash("sales123", 10),
      role: "sales",
      commissionRate: "12",
    });

    await storage.createUser({
      id: randomUUID(),
      name: "ليلى محمود",
      email: "l.mahmoud@creativecode-jo.com",
      password: await bcrypt.hash("finance123", 10),
      role: "finance",
      commissionRate: "0",
    });

    // ─── Leads ───────────────────────────────────────────────────────────────
    const l1 = await storage.createLead({
      id: randomUUID(),
      name: "عبدالله الزيد",
      companyName: "مجموعة الزيد للتجارة",
      phone: "0791110001",
      email: "a.zaid@zaidgroup.com",
      serviceType: "web",
      budget: "3500",
      message: "نحتاج موقع إلكتروني احترافي لشركتنا",
      source: "facebook",
      status: "Converted",
      assignedTo: sales1.id,
    });

    const l2 = await storage.createLead({
      id: randomUUID(),
      name: "ريم عبدالله",
      companyName: "بوتيك ريم",
      phone: "0785552002",
      email: "reem@boutique.com",
      serviceType: "marketing",
      budget: "2000",
      message: "نريد حملة تسويقية على وسائل التواصل الاجتماعي",
      source: "instagram",
      status: "Contacted",
      assignedTo: sales1.id,
    });

    const l3 = await storage.createLead({
      id: randomUUID(),
      name: "خالد الرشيدي",
      companyName: "مطاعم الرشيدي",
      phone: "0770003003",
      email: "khaled@rashidi.com",
      serviceType: "ai",
      budget: "7000",
      message: "نريد نظام ذكاء اصطناعي لإدارة الطلبات",
      source: "google",
      status: "New",
      assignedTo: sales2.id,
    });

    await storage.createLead({
      id: randomUUID(),
      name: "نورة الحسيني",
      companyName: "عيادة الحسيني",
      phone: "0796664004",
      email: "noura@clinic.com",
      serviceType: "automation",
      budget: "4500",
      message: "أتمتة مواعيد المرضى والتذكيرات",
      source: "referral",
      status: "New",
    });

    await storage.createLead({
      id: randomUUID(),
      name: "سامر العلي",
      companyName: "شركة العلي للمقاولات",
      phone: "0799995005",
      email: "samer@ali-contracting.com",
      serviceType: "web",
      budget: "5000",
      message: "موقع ونظام إدارة مشاريع",
      source: "direct",
      status: "New",
    });

    // ─── Clients ─────────────────────────────────────────────────────────────
    const c1 = await storage.createClient({
      id: randomUUID(),
      salesId: sales1.id,
      clientName: "عبدالله الزيد",
      companyName: "مجموعة الزيد للتجارة",
      phone: "0791110001",
      email: "a.zaid@zaidgroup.com",
      serviceType: "تطوير موقع ويب احترافي",
      dealValue: "3500",
      status: "Won",
      leadId: l1.id,
      notes: ["تم توقيع العقد بتاريخ 1 مارس", "تم استلام الدفعة الأولى 1750 د.أ"],
    });

    const c2 = await storage.createClient({
      id: randomUUID(),
      salesId: sales1.id,
      clientName: "يوسف المنصور",
      companyName: "منصور للاستيراد والتصدير",
      phone: "0791220002",
      email: "yousef@mansour-trade.com",
      serviceType: "تطبيق موبايل iOS وAndroid",
      dealValue: "8000",
      status: "Won",
      notes: ["تم إغلاق الصفقة بنجاح", "التسليم المتوقع نهاية أبريل"],
    });

    const c3 = await storage.createClient({
      id: randomUUID(),
      salesId: sales2.id,
      clientName: "دانا حمدان",
      companyName: "دانا للأزياء",
      phone: "0785332003",
      email: "dana@fashion.com",
      serviceType: "متجر إلكتروني متكامل",
      dealValue: "5500",
      status: "Won",
      notes: ["الدفعة الأولى مستلمة", "العمل جارٍ على التصميم"],
    });

    await storage.createClient({
      id: randomUUID(),
      salesId: sales2.id,
      clientName: "خالد الرشيدي",
      companyName: "مطاعم الرشيدي",
      phone: "0770003003",
      email: "khaled@rashidi.com",
      serviceType: "نظام ذكاء اصطناعي للطلبات",
      dealValue: "7000",
      status: "Proposal Sent",
      leadId: l3.id,
      notes: ["تم إرسال العرض التفصيلي", "بانتظار الرد"],
    });

    await storage.createClient({
      id: randomUUID(),
      salesId: sales1.id,
      clientName: "ريم عبدالله",
      companyName: "بوتيك ريم",
      phone: "0785552002",
      email: "reem@boutique.com",
      serviceType: "إدارة التسويق الرقمي",
      dealValue: "2000",
      status: "Negotiation",
      leadId: l2.id,
      notes: ["في مرحلة التفاوض على السعر النهائي"],
    });

    await storage.createClient({
      id: randomUUID(),
      salesId: sales2.id,
      clientName: "فارس البصري",
      companyName: "مدرسة البصري الخاصة",
      phone: "0788881007",
      email: "faris@basri-school.com",
      serviceType: "منصة تعليمية ذكية",
      dealValue: "12000",
      status: "Meeting Scheduled",
      notes: ["اجتماع مقرر الأسبوع القادم للعرض التقديمي"],
    });

    // ─── Commissions ─────────────────────────────────────────────────────────
    await storage.createCommission({
      id: randomUUID(),
      salesId: sales1.id,
      clientId: c1.id,
      dealValue: "3500",
      commissionRate: "10",
      commissionAmount: "350",
    });

    await storage.createCommission({
      id: randomUUID(),
      salesId: sales1.id,
      clientId: c2.id,
      dealValue: "8000",
      commissionRate: "10",
      commissionAmount: "800",
    });

    await storage.createCommission({
      id: randomUUID(),
      salesId: sales2.id,
      clientId: c3.id,
      dealValue: "5500",
      commissionRate: "12",
      commissionAmount: "660",
    });

    // ─── Consultations ───────────────────────────────────────────────────────
    await storage.createConsultation({
      id: randomUUID(),
      name: "إبراهيم العمر",
      phone: "0791234501",
      email: "ibrahim@omar-co.com",
      companyName: "العمر للتقنية",
      serviceType: "web",
      consultationDate: "2026-03-10",
      consultationTime: "10:00",
      message: "استشارة بخصوص تطوير موقع الشركة",
      status: "confirmed",
    });

    await storage.createConsultation({
      id: randomUUID(),
      name: "لمى الجابر",
      phone: "0785006002",
      email: "lama@jaber.com",
      companyName: "مؤسسة الجابر",
      serviceType: "ai",
      consultationDate: "2026-03-12",
      consultationTime: "14:00",
      message: "مهتمة بتطبيقات الذكاء الاصطناعي في مجال التعليم",
      status: "pending",
    });

    console.log("✅ Demo data seeded successfully.");
  } catch (err) {
    console.error("❌ Seed error:", err);
  }
}
