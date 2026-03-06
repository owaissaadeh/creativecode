import { storage } from "./storage";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "./db";
import { users, leads, clients, commissions, pageItems, consultations } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  try {
    const existingAdmin = await storage.getUserByEmail("admin@creativecode-jo.com");
    if (existingAdmin) return;

    console.log("Cleaning up old data...");
    await db.delete(commissions);
    await db.delete(clients);
    await db.delete(leads);
    await db.delete(users);

    const adminPass = await bcrypt.hash("owais@123", 10);
    const admin = await storage.createUser({
      id: randomUUID(),
      name: "أويس - المدير العام",
      email: "admin@creativecode-jo.com",
      password: adminPass,
      role: "admin",
      commissionRate: "0",
    });

    const salesPass = await bcrypt.hash("sales123", 10);
    const sales1 = await storage.createUser({
      id: randomUUID(),
      name: "محمد أحمد",
      email: "m.ahmed@creativecode-jo.com",
      password: salesPass,
      role: "sales",
      commissionRate: "10",
    });

    const financePass = await bcrypt.hash("finance123", 10);
    const finance = await storage.createUser({
      id: randomUUID(),
      name: "سارة محمود",
      email: "s.mahmoud@creativecode-jo.com",
      password: financePass,
      role: "finance",
      commissionRate: "0",
    });

    const lead1 = await storage.createLead({
      name: "عبدالله زيد",
      companyName: "مجموعة زيد التجارية",
      phone: "0790000001",
      email: "abdullah@zaid.com",
      serviceType: "web",
      budget: "2500",
      message: "نحتاج موقع إلكتروني لشركتنا الجديدة",
      source: "facebook",
      status: "Converted",
      assignedTo: sales1.id
    });

    const lead2 = await storage.createLead({
      name: "ليلى حسن",
      companyName: "بوتيك الأناقة",
      phone: "0790000002",
      email: "laila@fashion.com",
      serviceType: "ai",
      budget: "5000",
      message: "مهتمين بأتمتة خدمة العملاء باستخدام الذكاء الاصطناعي",
      source: "google",
      status: "New",
      assignedTo: sales1.id
    });

    const client1 = await storage.createClient({
      salesId: sales1.id,
      clientName: "عبدالله زيد",
      companyName: "مجموعة زيد التجارية",
      phone: "0790000001",
      email: "abdullah@zaid.com",
      serviceType: "تطوير موقع ويب",
      dealValue: "2500",
      status: "Won",
      leadId: lead1.id,
      notes: ["تم توقيع العقد", "تم استلام الدفعة الأولى"]
    });

    const client2 = await storage.createClient({
      salesId: sales1.id,
      clientName: "عمر خالد",
      companyName: "مطاعم الضيافة",
      phone: "0790000003",
      email: "omar@hospitality.com",
      serviceType: "تطبيق موبايل",
      dealValue: "4000",
      status: "Proposal Sent",
      notes: ["العرض قيد الدراسة من قبل العميل"]
    });

    await storage.createCommission({
      salesId: sales1.id,
      clientId: client1.id,
      dealValue: "2500",
      commissionRate: "10",
      commissionAmount: "250",
    });

    await storage.createConsultation({
      name: "إبراهيم علي",
      phone: "0790000004",
      email: "ibrahim@tech.com",
      companyName: "إبراهيم للتقنية",
      serviceType: "automation",
      consultationDate: "2026-03-15",
      consultationTime: "10:00",
      message: "استشارة بخصوص أتمتة العمليات الإدارية",
      status: "confirmed"
    });

    console.log("✅ Seed data created successfully");
  } catch (err) {
    console.error("Seed error:", err);
  }
}
