import express from "express";
import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import multer from "multer";
import path from "path";
import { Storage } from "@google-cloud/storage";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

const gcsClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: { type: "json", subject_token_field_name: "access_token" },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
} as any);

async function uploadToObjectStorage(buffer: Buffer, filename: string, mimetype: string): Promise<string> {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID!;
  const objectName = `public/${filename}`;
  const file = gcsClient.bucket(bucketId).file(objectName);
  await file.save(buffer, { contentType: mimetype, resumable: false, validation: false });
  return `/api/files/${filename}`;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".png", ".jpg", ".jpeg", ".ico", ".svg", ".webp", ".gif"];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

const JWT_SECRET = process.env.SESSION_SECRET || "crm-secret-key-2026";

export interface AuthRequest extends Request {
  user?: { id: string; role: string; commissionRate: string };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "غير مصرح" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string; commissionRate: string; type?: string };
    // Reject client-portal tokens outright — a client token must never work on staff routes,
    // even if the JWT secrets happened to collide (defense in depth alongside portalAuthMiddleware).
    if (decoded.type !== "staff") return res.status(401).json({ message: "غير مصرح" });
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "جلسة منتهية" });
  }
}

export function adminOnly(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") return res.status(403).json({ message: "غير مسموح" });
  next();
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    next();
  });

  // Serve standalone proposal pages
  app.use("/proposal", express.static(path.join(process.cwd(), "proposal")));
  app.use("/hrm", express.static(path.join(process.cwd(), "hrm")));
  app.use("/ecommerce", express.static(path.join(process.cwd(), "ecommerce")));

  // Public lead form
  app.post("/api/leads/public", async (req, res) => {
    try {
      const { name, companyName, phone, email, serviceType, budget, message, source } = req.body;
      if (!name || !phone || !email || !serviceType) return res.status(400).json({ message: "حقول مطلوبة ناقصة" });
      const lead = await storage.createLead({ name, companyName, phone, email, serviceType, budget, message, source: source || "direct", status: "New" });
      res.json(lead);
    } catch (err) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Legacy: serve locally uploaded files (dev fallback for old URLs)
  if (process.env.NODE_ENV !== "production") {
    const { existsSync, mkdirSync } = await import("fs");
    const uploadsDir = path.resolve("uploads");
    if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
    app.use("/uploads", express.static(uploadsDir));
  }

  // Serve files from object storage
  app.get("/api/files/:filename", async (req, res) => {
    try {
      const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID!;
      const objectName = `public/${req.params.filename}`;
      const file = gcsClient.bucket(bucketId).file(objectName);
      const [exists] = await file.exists();
      if (!exists) return res.status(404).json({ message: "الملف غير موجود" });
      const [metadata] = await file.getMetadata();
      const [buffer] = await file.download();
      res.set("Content-Type", metadata.contentType || "application/octet-stream");
      res.set("Content-Length", String(buffer.length));
      res.set("Cache-Control", "public, max-age=31536000");
      res.end(buffer);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Admin: Upload image (logo or favicon)
  app.post("/api/admin/upload", authMiddleware, adminOnly, upload.single("file"), async (req: AuthRequest, res: Response) => {
    if (!req.file) return res.status(400).json({ message: "لم يتم اختيار ملف أو نوع الملف غير مدعوم" });
    try {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      const url = await uploadToObjectStorage(req.file.buffer, filename, req.file.mimetype);
      res.json({ url });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ message: "فشل رفع الملف" });
    }
  });

  // Public: Site Config
  app.get("/api/content/config", async (req, res) => {
    try {
      const config = await storage.getSiteConfig();
      res.json(config);
    } catch {
      res.json({ logo_text: "Creative Code", favicon_url: "" });
    }
  });

  // Admin: Update Site Config
  app.patch("/api/admin/content/config", authMiddleware, adminOnly, async (req, res) => {
    try {
      await storage.setSiteConfig(req.body);
      const config = await storage.getSiteConfig();
      res.json(config);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Public: Page Content
  app.get("/api/content/items", async (req, res) => {
    try {
      const { type } = req.query;
      const items = await storage.getPageItems(type as string | undefined);
      res.json(items);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Public: Consultation booking
  app.post("/api/consultations/public", async (req, res) => {
    try {
      const { name, phone, email, companyName, serviceType, consultationDate, consultationTime, message } = req.body;
      if (!name || !phone || !email || !serviceType || !consultationDate || !consultationTime) {
        return res.status(400).json({ message: "يرجى تعبئة جميع الحقول المطلوبة" });
      }
      const consultation = await storage.createConsultation({
        name, phone, email, companyName, serviceType, consultationDate, consultationTime, message, status: "pending"
      });
      if (typeof (global as any).fbq === "function") {
        (global as any).fbq("track", "Schedule");
      }
      res.json(consultation);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Facebook Webhook
  app.get("/api/webhooks/facebook", (req, res) => {
    const verify_token = process.env.FB_VERIFY_TOKEN || "nexacrm_verify";
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === verify_token) {
      res.status(200).send(challenge);
    } else {
      res.status(403).send("Forbidden");
    }
  });
  app.post("/api/webhooks/facebook", (req, res) => {
    res.status(200).send("EVENT_RECEIVED");
  });

  // Auth
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ message: "أدخل البريد وكلمة المرور" });
      const user = await storage.getUserByEmail(email);
      if (!user) return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
      const token = jwt.sign({ id: user.id, role: user.role, commissionRate: user.commissionRate, type: "staff" }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, commissionRate: user.commissionRate } });
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Admin: Users
  app.get("/api/admin/users", authMiddleware, adminOnly, async (req, res) => {
    const allUsers = await storage.getAllUsers();
    res.json(allUsers.map((u) => ({ ...u, password: undefined })));
  });

  app.post("/api/admin/users", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { name, email, password, commissionRate } = req.body;
      if (!name || !email || !password) return res.status(400).json({ message: "حقول مطلوبة ناقصة" });
      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(400).json({ message: "البريد الإلكتروني مستخدم بالفعل" });
      const hashed = await bcrypt.hash(password, 10);
      const validRole = ["admin", "sales", "finance"].includes(req.body.role) ? req.body.role : "sales";
      const user = await storage.createUser({ name, email, password: hashed, role: validRole, commissionRate: commissionRate || "10" });
      res.json({ ...user, password: undefined });
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.patch("/api/admin/users/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { role, commissionRate } = req.body;
      const user = await storage.updateUser(req.params.id, { role, commissionRate });
      res.json({ ...user, password: undefined });
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.delete("/api/admin/users/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      const user = await storage.getUserById(req.params.id);
      if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
      if (user.email === "admin@creativecode-jo.com") {
        return res.status(403).json({ message: "لا يمكن حذف الأدمن الرئيسي" });
      }
      const { db } = await import("./db");
      const { users } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      await db.delete(users).where(eq(users.id, req.params.id));
      res.json({ message: "تم حذف المستخدم بنجاح" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Admin: Stats
  app.get("/api/admin/stats", authMiddleware, adminOnly, async (req, res) => {
    const stats = await storage.getAdminStats();
    res.json(stats);
  });

  // Admin: Leads
  app.get("/api/admin/leads", authMiddleware, adminOnly, async (req, res) => {
    const allLeads = await storage.getAllLeads();
    res.json(allLeads);
  });

  app.patch("/api/admin/leads/:id/assign", authMiddleware, adminOnly, async (req, res) => {
    try {
      const lead = await storage.updateLead(req.params.id, { assignedTo: req.body.assignedTo });
      res.json(lead);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/admin/leads/:id/convert", authMiddleware, adminOnly, async (req, res) => {
    try {
      const lead = await storage.updateLead(req.params.id, { status: "Converted" });
      const client = await storage.createClient({
        clientName: lead.name,
        companyName: lead.companyName || undefined,
        phone: lead.phone,
        email: lead.email,
        serviceType: lead.serviceType,
        dealValue: lead.budget || "0",
        status: "New Lead",
        salesId: lead.assignedTo || undefined,
        leadId: lead.id,
        notes: [],
      });
      res.json({ lead, client });
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Admin: Clients
  app.get("/api/admin/clients", authMiddleware, adminOnly, async (req, res) => {
    const allClients = await storage.getAllClients();
    const allUsers = await storage.getAllUsers();
    const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u.name]));
    res.json(allClients.map((c) => ({ ...c, salesName: c.salesId ? userMap[c.salesId] : null })));
  });

  // Admin: Commissions
  app.get("/api/admin/commissions", authMiddleware, adminOnly, async (req, res) => {
    const allCommissions = await storage.getAllCommissions();
    const allUsers = await storage.getAllUsers();
    const allClients = await storage.getAllClients();
    const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u.name]));
    const clientMap = Object.fromEntries(allClients.map((c) => [c.id, c.clientName]));
    res.json(allCommissions.map((c) => ({
      ...c,
      salesName: userMap[c.salesId],
      clientName: clientMap[c.clientId],
    })));
  });

  // Admin: Reports
  app.get("/api/admin/reports", authMiddleware, adminOnly, async (req, res) => {
    const reports = await storage.getReports();
    res.json(reports);
  });

  // Shared: Update client
  app.patch("/api/clients/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { status, dealValue, nextMeetingDate } = req.body;
      const existing = await storage.getAllClients().then((cs) => cs.find((c) => c.id === req.params.id));
      if (!existing) return res.status(404).json({ message: "العميل غير موجود" });
      if (req.user?.role === "sales" && existing.salesId !== req.user.id) {
        return res.status(403).json({ message: "غير مسموح" });
      }

      const updateData: Record<string, unknown> = {};
      if (status) updateData.status = status;
      if (dealValue !== undefined) updateData.dealValue = dealValue;
      if (nextMeetingDate !== undefined) updateData.nextMeetingDate = nextMeetingDate ? new Date(nextMeetingDate) : null;

      const client = await storage.updateClient(req.params.id, updateData as any);

      if (status === "Won" && existing.status !== "Won" && client.salesId) {
        const salesUser = await storage.getUserById(client.salesId);
        if (salesUser) {
          const dv = Number(client.dealValue);
          const rate = Number(salesUser.commissionRate);
          const amount = (dv * rate) / 100;
          await storage.createCommission({
            salesId: client.salesId,
            clientId: client.id,
            dealValue: String(dv),
            commissionRate: String(rate),
            commissionAmount: String(amount),
          });
        }
      }

      res.json(client);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/clients/:id/notes", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { note } = req.body;
      if (!note) return res.status(400).json({ message: "الملاحظة مطلوبة" });
      const client = await storage.addClientNote(req.params.id, note);
      res.json(client);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Sales: Stats
  app.get("/api/sales/stats", authMiddleware, async (req: AuthRequest, res) => {
    if (!req.user) return res.status(401).json({ message: "غير مصرح" });
    const stats = await storage.getSalesStats(req.user.id);
    res.json(stats);
  });

  // Sales: Leads
  app.get("/api/sales/leads", authMiddleware, async (req: AuthRequest, res) => {
    if (!req.user) return res.status(401).json({ message: "غير مصرح" });
    const myLeads = await storage.getLeadsByAssignee(req.user.id);
    res.json(myLeads);
  });

  app.patch("/api/sales/leads/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const lead = await storage.updateLead(req.params.id, { status: req.body.status });
      res.json(lead);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Sales: Clients
  app.get("/api/sales/clients", authMiddleware, async (req: AuthRequest, res) => {
    if (!req.user) return res.status(401).json({ message: "غير مصرح" });
    const myClients = await storage.getClientsBySales(req.user.id);
    res.json(myClients);
  });

  app.post("/api/sales/clients", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "غير مصرح" });
      const { clientName, companyName, phone, email, serviceType, dealValue, nextMeetingDate } = req.body;
      if (!clientName || !phone || !email || !serviceType) return res.status(400).json({ message: "حقول مطلوبة ناقصة" });
      const client = await storage.createClient({
        salesId: req.user.id,
        clientName, companyName, phone, email, serviceType,
        dealValue: dealValue || "0",
        status: "New Lead",
        nextMeetingDate: nextMeetingDate ? new Date(nextMeetingDate) : undefined,
        notes: [],
      });
      res.json(client);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Admin: Content Items (CMS)
  app.get("/api/admin/content/items", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { type } = req.query;
      const items = await storage.getPageItems(type as string | undefined);
      res.json(items);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/admin/content/items", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { itemType, title, subtitle, description, icon, tags, orderIndex, isActive } = req.body;
      if (!itemType || !title) return res.status(400).json({ message: "النوع والعنوان مطلوبان" });
      const item = await storage.createPageItem({ itemType, title, subtitle, description, icon, tags: tags || [], orderIndex: orderIndex || 0, isActive: isActive !== false });
      res.json(item);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.patch("/api/admin/content/items/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      const item = await storage.updatePageItem(req.params.id, req.body);
      res.json(item);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.delete("/api/admin/content/items/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      await storage.deletePageItem(req.params.id);
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Admin: Consultations
  app.get("/api/admin/consultations", authMiddleware, adminOnly, async (req, res) => {
    try {
      const all = await storage.getAllConsultations();
      res.json(all);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.patch("/api/admin/consultations/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { status, adminNotes } = req.body;
      const consultation = await storage.updateConsultation(req.params.id, { status, adminNotes });
      res.json(consultation);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Admin: Tasks (all tasks)
  app.get("/api/admin/tasks", authMiddleware, adminOnly, async (req, res) => {
    try {
      const allTasks = await storage.getAllTasks();
      const allUsers = await storage.getAllUsers();
      const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u.name]));
      res.json(allTasks.map((t) => ({
        ...t,
        assignedToName: t.assignedTo ? userMap[t.assignedTo] : null,
        createdByName: t.createdBy ? userMap[t.createdBy] : null,
      })));
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  const VALID_STATUS = ["todo", "in_progress", "done"] as const;
  const VALID_PRIORITY = ["low", "medium", "high"] as const;

  app.post("/api/admin/tasks", authMiddleware, adminOnly, async (req: AuthRequest, res) => {
    try {
      const { title, description, assignedTo, dueDate, priority, status, relatedLeadId, relatedClientId } = req.body;
      if (!title) return res.status(400).json({ message: "العنوان مطلوب" });
      const resolvedPriority = priority || "medium";
      const resolvedStatus = status || "todo";
      if (!VALID_PRIORITY.includes(resolvedPriority)) return res.status(400).json({ message: "أولوية غير صالحة" });
      if (!VALID_STATUS.includes(resolvedStatus)) return res.status(400).json({ message: "حالة غير صالحة" });
      const task = await storage.createTask({
        title, description, assignedTo: assignedTo || null,
        createdBy: req.user!.id,
        dueDate: dueDate || null, priority: resolvedPriority,
        status: resolvedStatus,
        relatedLeadId: relatedLeadId || null, relatedClientId: relatedClientId || null,
      });
      res.json(task);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.patch("/api/admin/tasks/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      const body = req.body;
      const updates: Record<string, unknown> = {};
      if ("title" in body) updates.title = body.title;
      if ("description" in body) updates.description = body.description || null;
      if ("assignedTo" in body) updates.assignedTo = body.assignedTo || null;
      if ("dueDate" in body) updates.dueDate = body.dueDate || null;
      if ("priority" in body) {
        if (!VALID_PRIORITY.includes(body.priority)) return res.status(400).json({ message: "أولوية غير صالحة" });
        updates.priority = body.priority;
      }
      if ("status" in body) {
        if (!VALID_STATUS.includes(body.status)) return res.status(400).json({ message: "حالة غير صالحة" });
        updates.status = body.status;
      }
      if ("relatedLeadId" in body) updates.relatedLeadId = body.relatedLeadId || null;
      if ("relatedClientId" in body) updates.relatedClientId = body.relatedClientId || null;
      const task = await storage.updateTask(req.params.id, updates);
      res.json(task);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.delete("/api/admin/tasks/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      await storage.deleteTask(req.params.id);
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Shared: Get tasks related to a lead or client
  app.get("/api/tasks/by-lead/:leadId", authMiddleware, adminOnly, async (req, res) => {
    try {
      const tasks = await storage.getTasksByLead(req.params.leadId);
      const allUsers = await storage.getAllUsers();
      const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u.name]));
      res.json(tasks.map((t) => ({ ...t, assignedToName: t.assignedTo ? userMap[t.assignedTo] : null })));
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.get("/api/tasks/by-client/:clientId", authMiddleware, adminOnly, async (req: AuthRequest, res) => {
    try {
      const tasks = await storage.getTasksByClient(req.params.clientId);
      const allUsers = await storage.getAllUsers();
      const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u.name]));
      res.json(tasks.map((t) => ({ ...t, assignedToName: t.assignedTo ? userMap[t.assignedTo] : null })));
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Sales: Tasks (own tasks only)
  const validStatus = ["todo", "in_progress", "done"] as const;
  const validPriority = ["low", "medium", "high"] as const;

  app.get("/api/sales/tasks", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (!req.user || req.user.role !== "sales") return res.status(403).json({ message: "غير مسموح" });
      const myTasks = await storage.getTasksByUser(req.user.id);
      res.json(myTasks);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.patch("/api/sales/tasks/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (!req.user || req.user.role !== "sales") return res.status(403).json({ message: "غير مسموح" });
      const { status } = req.body;
      if (status && !validStatus.includes(status)) return res.status(400).json({ message: "حالة غير صالحة" });
      const allTasks = await storage.getAllTasks();
      const task = allTasks.find((t) => t.id === req.params.id);
      if (!task) return res.status(404).json({ message: "المهمة غير موجودة" });
      if (task.assignedTo !== req.user.id) return res.status(403).json({ message: "غير مسموح" });
      const updated = await storage.updateTask(req.params.id, { status });
      res.json(updated);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Shared: Pending tasks count (for sidebar badge)
  app.get("/api/tasks/pending-count", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "غير مصرح" });
      const count = await storage.getPendingTasksCount(req.user.id);
      res.json({ count });
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Sales: Commissions
  app.get("/api/sales/commissions", authMiddleware, async (req: AuthRequest, res) => {
    if (!req.user) return res.status(401).json({ message: "غير مصرح" });
    const myCommissions = await storage.getCommissionsBySales(req.user.id);
    const allClients = await storage.getClientsBySales(req.user.id);
    const clientMap = Object.fromEntries(allClients.map((c) => [c.id, c.clientName]));
    res.json(myCommissions.map((c) => ({ ...c, clientName: clientMap[c.clientId] })));
  });

  return httpServer;
}
