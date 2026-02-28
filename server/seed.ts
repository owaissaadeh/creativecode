import { storage } from "./storage";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

export async function seedDatabase() {
  try {
    const existing = await storage.getUserByEmail("admin@creativecode.jo");
    if (existing) return;

    const adminPass = await bcrypt.hash("CCAdmin2026!", 10);
    const admin = await storage.createUser({
      id: randomUUID(),
      name: "أحمد المدير",
      email: "admin@creativecode.jo",
      password: adminPass,
      role: "admin",
      commissionRate: "0",
    });

    const salesPass = await bcrypt.hash("CCSales2026!", 10);
    const sales1 = await storage.createUser({
      id: randomUUID(),
      name: "محمد العمري",
      email: "sales@creativecode.jo",
      password: salesPass,
      role: "sales",
      commissionRate: "10",
    });

    const sales2 = await storage.createUser({
      id: randomUUID(),
      name: "سارة الحربي",
      email: "sara@creativecode.jo",
      password: await bcrypt.hash("CCSara2026!", 10),
      role: "sales",
      commissionRate: "12",
    });

    const leadId1 = randomUUID();
    const leadId2 = randomUUID();
    const leadId3 = randomUUID();

    await storage.createLead({ id: leadId1, name: "خالد الشمري", companyName: "شركة الأمل للتجارة", phone: "0501234567", email: "khaled@amal.com", serviceType: "crm", budget: "50000", message: "نريد نظام CRM متكامل لفريق مبيعاتنا", source: "direct", status: "Converted", assignedTo: sales1.id });
    await storage.createLead({ id: leadId2, name: "نورة القحطاني", companyName: "مجموعة النور", phone: "0557654321", email: "noura@nour.com", serviceType: "marketing", budget: "30000", message: "نحتاج استشارة في التسويق الرقمي", source: "facebook", status: "Contacted", assignedTo: sales1.id });
    await storage.createLead({ id: leadId3, name: "عبدالله الغامدي", companyName: "الغامدي العقارية", phone: "0533456789", email: "abdulla@ghamdi.com", serviceType: "sales", budget: "100000", message: "مهتم بنظام إدارة المبيعات", source: "utm_source=google", status: "New", assignedTo: sales2.id });
    await storage.createLead({ id: randomUUID(), name: "ريم السالم", companyName: "مؤسسة الرائدة", phone: "0544567890", email: "reem@raeda.com", serviceType: "training", budget: "20000", message: "نريد برنامج تدريبي لفريقنا", source: "direct", status: "New" });
    await storage.createLead({ id: randomUUID(), name: "فيصل الدوسري", companyName: "الدوسري للمقاولات", phone: "0566789012", email: "faisal@dossari.com", serviceType: "crm", budget: "75000", message: "تحسين إدارة العلاقات مع عملائنا", source: "referral", status: "New" });

    const client1Id = randomUUID();
    const client2Id = randomUUID();
    await storage.createClient({
      id: client1Id,
      salesId: sales1.id,
      clientName: "خالد الشمري",
      companyName: "شركة الأمل للتجارة",
      phone: "0501234567",
      email: "khaled@amal.com",
      serviceType: "CRM",
      dealValue: "50000",
      status: "Won",
      leadId: leadId1,
      notes: ["تم التواصل وإرسال العرض", "وافق على العقد"],
    });
    await storage.createClient({
      id: client2Id,
      salesId: sales2.id,
      clientName: "مشاري البلوي",
      companyName: "البلوي الاستشارية",
      phone: "0512345678",
      email: "meshari@balawi.com",
      serviceType: "استشارات مبيعات",
      dealValue: "80000",
      status: "Won",
      notes: ["تم إغلاق الصفقة بنجاح"],
    });
    await storage.createClient({
      id: randomUUID(),
      salesId: sales1.id,
      clientName: "نورة القحطاني",
      companyName: "مجموعة النور",
      phone: "0557654321",
      email: "noura@nour.com",
      serviceType: "التسويق الرقمي",
      dealValue: "30000",
      status: "Proposal Sent",
      notes: ["تم إرسال العرض التفصيلي"],
    });
    await storage.createClient({
      id: randomUUID(),
      salesId: sales2.id,
      clientName: "أسامة المطيري",
      companyName: "الرياض للتقنية",
      phone: "0523456789",
      email: "osama@rtech.com",
      serviceType: "CRM",
      dealValue: "120000",
      status: "Negotiation",
      notes: ["في مرحلة التفاوض على السعر"],
    });

    await storage.createCommission({
      id: randomUUID(),
      salesId: sales1.id,
      clientId: client1Id,
      dealValue: "50000",
      commissionRate: "10",
      commissionAmount: "5000",
    });
    await storage.createCommission({
      id: randomUUID(),
      salesId: sales2.id,
      clientId: client2Id,
      dealValue: "80000",
      commissionRate: "12",
      commissionAmount: "9600",
    });

    console.log("✅ Seed data created successfully");
  } catch (err) {
    console.error("Seed error:", err);
  }
}
