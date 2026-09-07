import type { Express, Response } from "express";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { authMiddleware, adminOnly, type AuthRequest } from "./routes";
import { uploadPrivateFile, uploadPrivateFileMiddleware, streamPrivateFile } from "./lib/objectStorage";
import { sendNewDeliverableEmail, sendStageNeedsActionEmail, sendTicketReplyEmail, sendTicketResolvedEmail } from "./lib/email";

const TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"];
const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"];

async function getClientUserEmailsForProject(projectId: string): Promise<string[]> {
  const project = await storage.getProjectById(projectId);
  if (!project) return [];
  return getClientUserEmailsForClient(project.clientId);
}

async function getClientUserEmailsForClient(clientId: string): Promise<string[]> {
  const clientUsers = await storage.getClientUsersByClient(clientId);
  return clientUsers.filter((cu) => cu.isActive).map((cu) => cu.email);
}

const STAGE_STATUSES = ["not_started", "in_progress", "needs_review", "changes_requested", "approved", "completed"];
const PROJECT_STATUSES = ["active", "on_hold", "completed", "cancelled"];

async function projectBelongsToSales(projectId: string, salesId: string): Promise<boolean> {
  const project = await storage.getProjectById(projectId);
  if (!project) return false;
  const client = await storage.getAllClients().then((cs) => cs.find((c) => c.id === project.clientId));
  return !!client && client.salesId === salesId;
}

async function stageBelongsToSales(stageId: string, salesId: string): Promise<boolean> {
  const stage = await storage.getProjectStageById(stageId);
  if (!stage) return false;
  return projectBelongsToSales(stage.projectId, salesId);
}

export function registerProjectRoutes(app: Express) {
  // ─── Admin: Client portal contacts ─────────────────────────────────────
  app.get("/api/admin/clients/:id/client-users", authMiddleware, adminOnly, async (req, res) => {
    try {
      const rows = await storage.getClientUsersByClient(req.params.id);
      res.json(rows.map((r) => ({ ...r, password: undefined })));
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/admin/clients/:id/client-users", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { name, email, password, role } = req.body;
      if (!name || !email || !password) return res.status(400).json({ message: "حقول مطلوبة ناقصة" });
      const existing = await storage.getClientUserByEmail(email);
      if (existing) return res.status(400).json({ message: "البريد الإلكتروني مستخدم بالفعل" });
      const hashed = await bcrypt.hash(password, 10);
      const validRole = ["owner", "member"].includes(role) ? role : "member";
      const clientUser = await storage.createClientUser({ clientId: req.params.id, name, email, password: hashed, role: validRole });
      res.json({ ...clientUser, password: undefined });
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.patch("/api/admin/client-users/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { name, role, isActive, password } = req.body;
      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (role !== undefined && ["owner", "member"].includes(role)) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (password) updateData.password = await bcrypt.hash(password, 10);
      const clientUser = await storage.updateClientUser(req.params.id, updateData as any);
      res.json({ ...clientUser, password: undefined });
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/sales/clients/:id/client-users", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "غير مصرح" });
      const client = await storage.getAllClients().then((cs) => cs.find((c) => c.id === req.params.id));
      if (!client) return res.status(404).json({ message: "العميل غير موجود" });
      if (client.salesId !== req.user.id) return res.status(403).json({ message: "غير مسموح" });
      const { name, email, password } = req.body;
      if (!name || !email || !password) return res.status(400).json({ message: "حقول مطلوبة ناقصة" });
      const existing = await storage.getClientUserByEmail(email);
      if (existing) return res.status(400).json({ message: "البريد الإلكتروني مستخدم بالفعل" });
      const hashed = await bcrypt.hash(password, 10);
      const clientUser = await storage.createClientUser({ clientId: req.params.id, name, email, password: hashed, role: "member" });
      res.json({ ...clientUser, password: undefined });
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // ─── Admin: Projects ────────────────────────────────────────────────────
  app.get("/api/admin/projects", authMiddleware, adminOnly, async (_req, res) => {
    try {
      const list = await storage.getAllProjects();
      const clients = await storage.getAllClients();
      const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.clientName]));
      res.json(list.map((p) => ({ ...p, clientName: clientMap[p.clientId] })));
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/admin/projects", authMiddleware, adminOnly, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "غير مصرح" });
      const { clientId, name, description, startDate, targetEndDate, ownerStaffId } = req.body;
      if (!clientId || !name) return res.status(400).json({ message: "حقول مطلوبة ناقصة" });
      const project = await storage.createProject({
        clientId, name, description,
        startDate: startDate || undefined, targetEndDate: targetEndDate || undefined,
        ownerStaffId: ownerStaffId || undefined, createdBy: req.user.id,
      });
      res.json(project);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.get("/api/admin/projects/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      const project = await storage.getProjectById(req.params.id);
      if (!project) return res.status(404).json({ message: "المشروع غير موجود" });
      const client = await storage.getAllClients().then((cs) => cs.find((c) => c.id === project.clientId));
      res.json({ ...project, clientName: client?.clientName });
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.get("/api/admin/projects/:id/deliverables", authMiddleware, adminOnly, async (req, res) => {
    try {
      const list = await storage.getDeliverablesByProject(req.params.id);
      res.json(list.map((d) => ({ ...d, objectKey: undefined })));
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.patch("/api/admin/projects/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { name, description, status, startDate, targetEndDate, ownerStaffId } = req.body;
      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (status !== undefined && PROJECT_STATUSES.includes(status)) updateData.status = status;
      if (startDate !== undefined) updateData.startDate = startDate || null;
      if (targetEndDate !== undefined) updateData.targetEndDate = targetEndDate || null;
      if (ownerStaffId !== undefined) updateData.ownerStaffId = ownerStaffId || null;
      const project = await storage.updateProject(req.params.id, updateData as any);
      res.json(project);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.get("/api/admin/projects/:id/stages", authMiddleware, adminOnly, async (req, res) => {
    try {
      const stages = await storage.getProjectStagesByProject(req.params.id);
      res.json(stages);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/admin/projects/:id/stages", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { title, description, sequence, plannedDate } = req.body;
      if (!title) return res.status(400).json({ message: "عنوان المرحلة مطلوب" });
      const stage = await storage.createProjectStage({
        projectId: req.params.id, title, description, sequence: sequence ?? 0, plannedDate: plannedDate || undefined,
      });
      res.json(stage);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.patch("/api/admin/stages/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { title, description, sequence, status, plannedDate } = req.body;
      const updateData: Record<string, unknown> = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (sequence !== undefined) updateData.sequence = sequence;
      if (plannedDate !== undefined) updateData.plannedDate = plannedDate || null;
      if (status !== undefined && STAGE_STATUSES.includes(status)) {
        updateData.status = status;
        if (status === "in_progress") updateData.startedAt = new Date();
        if (status === "needs_review") updateData.submittedForReviewAt = new Date();
        if (status === "completed") updateData.completedAt = new Date();
      }
      const stage = await storage.updateProjectStage(req.params.id, updateData as any);
      res.json(stage);

      if (status === "needs_review") {
        getClientUserEmailsForProject(stage.projectId).then(async (to) => {
          if (to.length === 0) return;
          const project = await storage.getProjectById(stage.projectId);
          sendStageNeedsActionEmail({
            to, projectName: project?.name || "", stageTitle: stage.title,
            portalUrl: `${req.protocol}://${req.get("host")}/portal/projects/${stage.projectId}`,
          }).catch((err) => console.error("Email send failed (stage needs action):", err));
        });
      }
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.delete("/api/admin/stages/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      const deliverablesOnStage = await storage.getDeliverablesByStage(req.params.id);
      if (deliverablesOnStage.length > 0) return res.status(400).json({ message: "لا يمكن حذف مرحلة تحتوي تسليمات" });
      await storage.deleteProjectStage(req.params.id);
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // ─── Admin: Deliverables ────────────────────────────────────────────────
  app.post(
    "/api/admin/projects/:id/deliverables",
    authMiddleware, adminOnly, uploadPrivateFileMiddleware.single("file"),
    async (req: AuthRequest, res: Response) => {
      if (!req.file) return res.status(400).json({ message: "لم يتم اختيار ملف" });
      try {
        if (!req.user) return res.status(401).json({ message: "غير مصرح" });
        const { title, description, stageId } = req.body;
        const objectKey = await uploadPrivateFile(req.file.buffer, req.file.originalname, req.file.mimetype);
        const deliverable = await storage.createDeliverable({
          projectId: req.params.id, stageId: stageId || undefined,
          title: title || req.file.originalname, description,
          fileName: req.file.originalname, objectKey, mimeType: req.file.mimetype, fileSize: req.file.size,
          version: 1, uploadedBy: req.user.id,
        });
        res.json(deliverable);

        getClientUserEmailsForProject(req.params.id).then(async (to) => {
          if (to.length === 0) return;
          const project = await storage.getProjectById(req.params.id);
          sendNewDeliverableEmail({
            to, projectName: project?.name || "", deliverableTitle: deliverable.title,
            portalUrl: `${req.protocol}://${req.get("host")}/portal/projects/${req.params.id}`,
          }).catch((err) => console.error("Email send failed (new deliverable):", err));
        });
      } catch (err) {
        console.error("Deliverable upload error:", err);
        res.status(500).json({ message: "فشل رفع الملف" });
      }
    }
  );

  app.delete("/api/admin/deliverables/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      await storage.deleteDeliverable(req.params.id);
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.get("/api/admin/deliverables/:id/download", authMiddleware, adminOnly, async (req, res) => {
    try {
      const deliverable = await storage.getDeliverableById(req.params.id);
      if (!deliverable) return res.status(404).json({ message: "الملف غير موجود" });
      await streamPrivateFile(deliverable.objectKey, res, deliverable.fileName, deliverable.mimeType);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // ─── Sales: Projects (scoped to own clients) ───────────────────────────
  app.get("/api/sales/projects", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "غير مصرح" });
      const list = await storage.getProjectsBySales(req.user.id);
      const clients = await storage.getClientsBySales(req.user.id);
      const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.clientName]));
      res.json(list.map((p) => ({ ...p, clientName: clientMap[p.clientId] })));
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.get("/api/sales/projects/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "غير مصرح" });
      if (!(await projectBelongsToSales(req.params.id, req.user.id))) return res.status(403).json({ message: "غير مسموح" });
      const project = await storage.getProjectById(req.params.id);
      if (!project) return res.status(404).json({ message: "المشروع غير موجود" });
      const client = await storage.getAllClients().then((cs) => cs.find((c) => c.id === project.clientId));
      res.json({ ...project, clientName: client?.clientName });
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.get("/api/sales/projects/:id/deliverables", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "غير مصرح" });
      if (!(await projectBelongsToSales(req.params.id, req.user.id))) return res.status(403).json({ message: "غير مسموح" });
      const list = await storage.getDeliverablesByProject(req.params.id);
      res.json(list.map((d) => ({ ...d, objectKey: undefined })));
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/sales/projects", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "غير مصرح" });
      const { clientId, name, description, startDate, targetEndDate } = req.body;
      if (!clientId || !name) return res.status(400).json({ message: "حقول مطلوبة ناقصة" });
      const client = await storage.getAllClients().then((cs) => cs.find((c) => c.id === clientId));
      if (!client || client.salesId !== req.user.id) return res.status(403).json({ message: "غير مسموح" });
      const project = await storage.createProject({
        clientId, name, description,
        startDate: startDate || undefined, targetEndDate: targetEndDate || undefined,
        ownerStaffId: req.user.id, createdBy: req.user.id,
      });
      res.json(project);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.get("/api/sales/projects/:id/stages", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "غير مصرح" });
      if (!(await projectBelongsToSales(req.params.id, req.user.id))) return res.status(403).json({ message: "غير مسموح" });
      const stages = await storage.getProjectStagesByProject(req.params.id);
      res.json(stages);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/sales/projects/:id/stages", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "غير مصرح" });
      if (!(await projectBelongsToSales(req.params.id, req.user.id))) return res.status(403).json({ message: "غير مسموح" });
      const { title, description, sequence, plannedDate } = req.body;
      if (!title) return res.status(400).json({ message: "عنوان المرحلة مطلوب" });
      const stage = await storage.createProjectStage({
        projectId: req.params.id, title, description, sequence: sequence ?? 0, plannedDate: plannedDate || undefined,
      });
      res.json(stage);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.patch("/api/sales/stages/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "غير مصرح" });
      if (!(await stageBelongsToSales(req.params.id, req.user.id))) return res.status(403).json({ message: "غير مسموح" });
      const { title, description, sequence, status, plannedDate } = req.body;
      const updateData: Record<string, unknown> = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (sequence !== undefined) updateData.sequence = sequence;
      if (plannedDate !== undefined) updateData.plannedDate = plannedDate || null;
      if (status !== undefined && STAGE_STATUSES.includes(status)) {
        updateData.status = status;
        if (status === "in_progress") updateData.startedAt = new Date();
        if (status === "needs_review") updateData.submittedForReviewAt = new Date();
        if (status === "completed") updateData.completedAt = new Date();
      }
      const stage = await storage.updateProjectStage(req.params.id, updateData as any);
      res.json(stage);

      if (status === "needs_review") {
        getClientUserEmailsForProject(stage.projectId).then(async (to) => {
          if (to.length === 0) return;
          const project = await storage.getProjectById(stage.projectId);
          sendStageNeedsActionEmail({
            to, projectName: project?.name || "", stageTitle: stage.title,
            portalUrl: `${req.protocol}://${req.get("host")}/portal/projects/${stage.projectId}`,
          }).catch((err) => console.error("Email send failed (stage needs action):", err));
        });
      }
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post(
    "/api/sales/projects/:id/deliverables",
    authMiddleware, uploadPrivateFileMiddleware.single("file"),
    async (req: AuthRequest, res: Response) => {
      if (!req.file) return res.status(400).json({ message: "لم يتم اختيار ملف" });
      try {
        if (!req.user) return res.status(401).json({ message: "غير مصرح" });
        if (!(await projectBelongsToSales(req.params.id, req.user.id))) return res.status(403).json({ message: "غير مسموح" });
        const { title, description, stageId } = req.body;
        const objectKey = await uploadPrivateFile(req.file.buffer, req.file.originalname, req.file.mimetype);
        const deliverable = await storage.createDeliverable({
          projectId: req.params.id, stageId: stageId || undefined,
          title: title || req.file.originalname, description,
          fileName: req.file.originalname, objectKey, mimeType: req.file.mimetype, fileSize: req.file.size,
          version: 1, uploadedBy: req.user.id,
        });
        res.json(deliverable);

        getClientUserEmailsForProject(req.params.id).then(async (to) => {
          if (to.length === 0) return;
          const project = await storage.getProjectById(req.params.id);
          sendNewDeliverableEmail({
            to, projectName: project?.name || "", deliverableTitle: deliverable.title,
            portalUrl: `${req.protocol}://${req.get("host")}/portal/projects/${req.params.id}`,
          }).catch((err) => console.error("Email send failed (new deliverable):", err));
        });
      } catch (err) {
        console.error("Deliverable upload error:", err);
        res.status(500).json({ message: "فشل رفع الملف" });
      }
    }
  );

  app.get("/api/sales/deliverables/:id/download", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "غير مصرح" });
      const deliverable = await storage.getDeliverableById(req.params.id);
      if (!deliverable) return res.status(404).json({ message: "الملف غير موجود" });
      if (!(await projectBelongsToSales(deliverable.projectId, req.user.id))) return res.status(403).json({ message: "غير مسموح" });
      await streamPrivateFile(deliverable.objectKey, res, deliverable.fileName, deliverable.mimeType);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // ─── Comments (staff side) ──────────────────────────────────────────────
  app.get("/api/admin/projects/:id/comments", authMiddleware, adminOnly, async (req, res) => {
    try {
      const stageId = typeof req.query.stageId === "string" ? req.query.stageId : undefined;
      const comments = await storage.getProjectComments(req.params.id, stageId);
      res.json(comments);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/admin/projects/:id/comments", authMiddleware, adminOnly, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "غير مصرح" });
      const { body, stageId } = req.body;
      if (!body || !body.trim()) return res.status(400).json({ message: "الرسالة مطلوبة" });
      const comment = await storage.createProjectComment({
        projectId: req.params.id, stageId: stageId || undefined,
        authorType: "staff", authorStaffId: req.user.id, body,
      });
      res.json(comment);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.get("/api/sales/projects/:id/comments", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "غير مصرح" });
      if (!(await projectBelongsToSales(req.params.id, req.user.id))) return res.status(403).json({ message: "غير مسموح" });
      const stageId = typeof req.query.stageId === "string" ? req.query.stageId : undefined;
      const comments = await storage.getProjectComments(req.params.id, stageId);
      res.json(comments);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/sales/projects/:id/comments", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "غير مصرح" });
      if (!(await projectBelongsToSales(req.params.id, req.user.id))) return res.status(403).json({ message: "غير مسموح" });
      const { body, stageId } = req.body;
      if (!body || !body.trim()) return res.status(400).json({ message: "الرسالة مطلوبة" });
      const comment = await storage.createProjectComment({
        projectId: req.params.id, stageId: stageId || undefined,
        authorType: "staff", authorStaffId: req.user.id, body,
      });
      res.json(comment);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // ─── Admin: Support Tickets ─────────────────────────────────────────────
  app.get("/api/admin/tickets", authMiddleware, adminOnly, async (_req, res) => {
    try {
      const tickets = await storage.getAllTickets();
      const clients = await storage.getAllClients();
      const users = await storage.getAllUsers();
      const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.clientName]));
      const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));
      res.json(tickets.map((t) => ({
        ...t, clientName: clientMap[t.clientId], assignedToName: t.assignedTo ? userMap[t.assignedTo] : undefined,
      })));
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.get("/api/admin/tickets/open-count", authMiddleware, adminOnly, async (_req, res) => {
    try {
      const tickets = await storage.getAllTickets();
      const count = tickets.filter((t) => t.status === "open" || t.status === "in_progress").length;
      res.json({ count });
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.get("/api/admin/tickets/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      const ticket = await storage.getTicketById(req.params.id);
      if (!ticket) return res.status(404).json({ message: "التذكرة غير موجودة" });
      const messages = await storage.getTicketMessages(ticket.id);
      const client = await storage.getAllClients().then((cs) => cs.find((c) => c.id === ticket.clientId));
      res.json({ ...ticket, clientName: client?.clientName, messages: messages.map((m) => ({ ...m, attachmentObjectKey: undefined })) });
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.patch("/api/admin/tickets/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { status, priority, assignedTo } = req.body;
      const existing = await storage.getTicketById(req.params.id);
      if (!existing) return res.status(404).json({ message: "التذكرة غير موجودة" });
      const updateData: Record<string, unknown> = {};
      if (status !== undefined && TICKET_STATUSES.includes(status)) {
        updateData.status = status;
        if (status === "resolved") updateData.resolvedAt = new Date();
        if (status === "closed") updateData.closedAt = new Date();
      }
      if (priority !== undefined && TICKET_PRIORITIES.includes(priority)) updateData.priority = priority;
      if (assignedTo !== undefined) updateData.assignedTo = assignedTo || null;
      const ticket = await storage.updateTicket(req.params.id, updateData as any);
      res.json(ticket);

      if (status === "resolved" && existing.status !== "resolved") {
        const clientUser = await storage.getClientUserById(existing.createdByClientUserId);
        if (clientUser) {
          sendTicketResolvedEmail({ to: clientUser.email, subject: ticket.subject }).catch((err) =>
            console.error("Email send failed (ticket resolved):", err)
          );
        }
      }
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post(
    "/api/admin/tickets/:id/messages",
    authMiddleware, adminOnly, uploadPrivateFileMiddleware.single("file"),
    async (req: AuthRequest, res) => {
      try {
        if (!req.user) return res.status(401).json({ message: "غير مصرح" });
        const ticket = await storage.getTicketById(req.params.id);
        if (!ticket) return res.status(404).json({ message: "التذكرة غير موجودة" });
        const { body } = req.body;
        if (!body || !body.trim()) return res.status(400).json({ message: "الرسالة مطلوبة" });

        let attachment: Record<string, unknown> = {};
        if (req.file) {
          const objectKey = await uploadPrivateFile(req.file.buffer, req.file.originalname, req.file.mimetype);
          attachment = { attachmentFileName: req.file.originalname, attachmentObjectKey: objectKey, attachmentMimeType: req.file.mimetype, attachmentFileSize: req.file.size };
        }
        const message = await storage.createTicketMessage({
          ticketId: ticket.id, senderType: "staff", senderStaffId: req.user.id, body, ...attachment,
        } as any);
        res.json({ ...message, attachmentObjectKey: undefined });

        if (ticket.status === "resolved" || ticket.status === "closed") {
          await storage.updateTicket(ticket.id, { status: "in_progress" });
        }
        const clientUser = await storage.getClientUserById(ticket.createdByClientUserId);
        if (clientUser) {
          sendTicketReplyEmail({ to: clientUser.email, subject: ticket.subject, replyBody: body }).catch((err) =>
            console.error("Email send failed (ticket reply):", err)
          );
        }
      } catch {
        res.status(500).json({ message: "خطأ في الخادم" });
      }
    }
  );

  app.get("/api/admin/ticket-messages/:id/attachment", authMiddleware, adminOnly, async (req, res) => {
    try {
      const message = await storage.getTicketMessageById(req.params.id);
      if (!message || !message.attachmentObjectKey) return res.status(404).json({ message: "الملف غير موجود" });
      await streamPrivateFile(message.attachmentObjectKey, res, message.attachmentFileName || "attachment", message.attachmentMimeType || "application/octet-stream");
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // ─── Sales: Support Tickets (scoped) ────────────────────────────────────
  app.get("/api/sales/tickets", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "غير مصرح" });
      const tickets = await storage.getTicketsForSales(req.user.id);
      const clients = await storage.getAllClients();
      const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.clientName]));
      res.json(tickets.map((t) => ({ ...t, clientName: clientMap[t.clientId] })));
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.get("/api/sales/tickets/open-count", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "غير مصرح" });
      const tickets = await storage.getTicketsForSales(req.user.id);
      const count = tickets.filter((t) => t.status === "open" || t.status === "in_progress").length;
      res.json({ count });
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.get("/api/sales/tickets/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "غير مصرح" });
      const ticket = await storage.getTicketById(req.params.id);
      if (!ticket) return res.status(404).json({ message: "التذكرة غير موجودة" });
      const scoped = await storage.getTicketsForSales(req.user.id);
      if (!scoped.find((t) => t.id === ticket.id)) return res.status(403).json({ message: "غير مسموح" });
      const messages = await storage.getTicketMessages(ticket.id);
      const client = await storage.getAllClients().then((cs) => cs.find((c) => c.id === ticket.clientId));
      res.json({ ...ticket, clientName: client?.clientName, messages: messages.map((m) => ({ ...m, attachmentObjectKey: undefined })) });
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.patch("/api/sales/tickets/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "غير مصرح" });
      const existing = await storage.getTicketById(req.params.id);
      if (!existing) return res.status(404).json({ message: "التذكرة غير موجودة" });
      const scoped = await storage.getTicketsForSales(req.user.id);
      if (!scoped.find((t) => t.id === existing.id)) return res.status(403).json({ message: "غير مسموح" });
      const { status, priority } = req.body;
      const updateData: Record<string, unknown> = {};
      if (status !== undefined && TICKET_STATUSES.includes(status)) {
        updateData.status = status;
        if (status === "resolved") updateData.resolvedAt = new Date();
        if (status === "closed") updateData.closedAt = new Date();
      }
      if (priority !== undefined && TICKET_PRIORITIES.includes(priority)) updateData.priority = priority;
      const ticket = await storage.updateTicket(req.params.id, updateData as any);
      res.json(ticket);

      if (status === "resolved" && existing.status !== "resolved") {
        const clientUser = await storage.getClientUserById(existing.createdByClientUserId);
        if (clientUser) {
          sendTicketResolvedEmail({ to: clientUser.email, subject: ticket.subject }).catch((err) =>
            console.error("Email send failed (ticket resolved):", err)
          );
        }
      }
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post(
    "/api/sales/tickets/:id/messages",
    authMiddleware, uploadPrivateFileMiddleware.single("file"),
    async (req: AuthRequest, res) => {
      try {
        if (!req.user) return res.status(401).json({ message: "غير مصرح" });
        const ticket = await storage.getTicketById(req.params.id);
        if (!ticket) return res.status(404).json({ message: "التذكرة غير موجودة" });
        const scoped = await storage.getTicketsForSales(req.user.id);
        if (!scoped.find((t) => t.id === ticket.id)) return res.status(403).json({ message: "غير مسموح" });
        const { body } = req.body;
        if (!body || !body.trim()) return res.status(400).json({ message: "الرسالة مطلوبة" });

        let attachment: Record<string, unknown> = {};
        if (req.file) {
          const objectKey = await uploadPrivateFile(req.file.buffer, req.file.originalname, req.file.mimetype);
          attachment = { attachmentFileName: req.file.originalname, attachmentObjectKey: objectKey, attachmentMimeType: req.file.mimetype, attachmentFileSize: req.file.size };
        }
        const message = await storage.createTicketMessage({
          ticketId: ticket.id, senderType: "staff", senderStaffId: req.user.id, body, ...attachment,
        } as any);
        res.json({ ...message, attachmentObjectKey: undefined });

        if (ticket.status === "resolved" || ticket.status === "closed") {
          await storage.updateTicket(ticket.id, { status: "in_progress" });
        }
        const clientUser = await storage.getClientUserById(ticket.createdByClientUserId);
        if (clientUser) {
          sendTicketReplyEmail({ to: clientUser.email, subject: ticket.subject, replyBody: body }).catch((err) =>
            console.error("Email send failed (ticket reply):", err)
          );
        }
      } catch {
        res.status(500).json({ message: "خطأ في الخادم" });
      }
    }
  );

  app.get("/api/sales/ticket-messages/:id/attachment", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "غير مصرح" });
      const message = await storage.getTicketMessageById(req.params.id);
      if (!message || !message.attachmentObjectKey) return res.status(404).json({ message: "الملف غير موجود" });
      const ticket = await storage.getTicketById(message.ticketId);
      if (!ticket) return res.status(404).json({ message: "غير موجود" });
      const scoped = await storage.getTicketsForSales(req.user.id);
      if (!scoped.find((t) => t.id === ticket.id)) return res.status(403).json({ message: "غير مسموح" });
      await streamPrivateFile(message.attachmentObjectKey, res, message.attachmentFileName || "attachment", message.attachmentMimeType || "application/octet-stream");
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });
}
