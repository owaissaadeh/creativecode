import type { Express } from "express";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { portalAuthMiddleware, signPortalToken, type PortalAuthRequest } from "./portalAuth";
import { streamPrivateFile, uploadPrivateFile, uploadPrivateFileMiddleware } from "./lib/objectStorage";
import {
  sendStageApprovedEmail, sendStageChangesRequestedEmail, sendNewClientCommentEmail,
  sendNewTicketEmail, sendTicketReplyEmail,
} from "./lib/email";

const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"];

function computeProgress(stages: { status: string }[]): number {
  if (stages.length === 0) return 0;
  const done = stages.filter((s) => s.status === "completed" || s.status === "approved").length;
  return Math.round((done / stages.length) * 100);
}

async function getAdminEmails(): Promise<string[]> {
  const users = await storage.getAllUsers();
  return users.filter((u) => u.role === "admin").map((u) => u.email);
}

async function getStaffRecipientsForProject(projectId: string): Promise<string[]> {
  const project = await storage.getProjectById(projectId);
  if (!project) return [];
  const users = await storage.getAllUsers();
  const emails = new Set<string>();
  users.filter((u) => u.role === "admin").forEach((u) => emails.add(u.email));
  if (project.ownerStaffId) {
    const owner = users.find((u) => u.id === project.ownerStaffId);
    if (owner) emails.add(owner.email);
  }
  return Array.from(emails);
}

export function registerPortalRoutes(app: Express) {
  app.post("/api/portal/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ message: "أدخل البريد وكلمة المرور" });
      const clientUser = await storage.getClientUserByEmail(email);
      if (!clientUser || !clientUser.isActive) return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
      const valid = await bcrypt.compare(password, clientUser.password);
      if (!valid) return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
      await storage.updateClientUser(clientUser.id, { lastLoginAt: new Date() });
      const token = signPortalToken({ clientUserId: clientUser.id, clientId: clientUser.clientId, role: clientUser.role });
      res.json({
        token,
        clientUser: { id: clientUser.id, name: clientUser.name, email: clientUser.email, role: clientUser.role, clientId: clientUser.clientId },
      });
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.get("/api/portal/me", portalAuthMiddleware, async (req: PortalAuthRequest, res) => {
    try {
      if (!req.clientUser) return res.status(401).json({ message: "غير مصرح" });
      const clientUser = await storage.getClientUserById(req.clientUser.clientUserId);
      if (!clientUser) return res.status(404).json({ message: "الحساب غير موجود" });
      const client = await storage.getAllClients().then((cs) => cs.find((c) => c.id === clientUser.clientId));
      res.json({
        clientUser: { id: clientUser.id, name: clientUser.name, email: clientUser.email, role: clientUser.role, clientId: clientUser.clientId },
        company: client ? { id: client.id, clientName: client.clientName, companyName: client.companyName } : null,
      });
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // ─── Projects ───────────────────────────────────────────────────────────
  app.get("/api/portal/projects", portalAuthMiddleware, async (req: PortalAuthRequest, res) => {
    try {
      if (!req.clientUser) return res.status(401).json({ message: "غير مصرح" });
      const list = await storage.getProjectsByClient(req.clientUser.clientId);
      const withProgress = await Promise.all(
        list.map(async (p) => {
          const stages = await storage.getProjectStagesByProject(p.id);
          return { ...p, progress: computeProgress(stages), stagesCount: stages.length };
        })
      );
      res.json(withProgress);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.get("/api/portal/projects/:id", portalAuthMiddleware, async (req: PortalAuthRequest, res) => {
    try {
      if (!req.clientUser) return res.status(401).json({ message: "غير مصرح" });
      const project = await storage.getProjectById(req.params.id);
      if (!project || project.clientId !== req.clientUser.clientId) return res.status(404).json({ message: "المشروع غير موجود" });
      const stages = await storage.getProjectStagesByProject(project.id);
      res.json({ ...project, stages, progress: computeProgress(stages) });
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // ─── Deliverables ───────────────────────────────────────────────────────
  app.get("/api/portal/projects/:id/deliverables", portalAuthMiddleware, async (req: PortalAuthRequest, res) => {
    try {
      if (!req.clientUser) return res.status(401).json({ message: "غير مصرح" });
      const project = await storage.getProjectById(req.params.id);
      if (!project || project.clientId !== req.clientUser.clientId) return res.status(404).json({ message: "المشروع غير موجود" });
      const list = await storage.getDeliverablesByProject(project.id);
      res.json(list.map((d) => ({ ...d, objectKey: undefined })));
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.get("/api/portal/deliverables/:id/download", portalAuthMiddleware, async (req: PortalAuthRequest, res) => {
    try {
      if (!req.clientUser) return res.status(401).json({ message: "غير مصرح" });
      const deliverable = await storage.getDeliverableById(req.params.id);
      if (!deliverable) return res.status(404).json({ message: "الملف غير موجود" });
      const project = await storage.getProjectById(deliverable.projectId);
      if (!project || project.clientId !== req.clientUser.clientId) return res.status(403).json({ message: "غير مسموح" });
      await streamPrivateFile(deliverable.objectKey, res, deliverable.fileName, deliverable.mimeType);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // ─── Comments ───────────────────────────────────────────────────────────
  app.get("/api/portal/projects/:id/comments", portalAuthMiddleware, async (req: PortalAuthRequest, res) => {
    try {
      if (!req.clientUser) return res.status(401).json({ message: "غير مصرح" });
      const project = await storage.getProjectById(req.params.id);
      if (!project || project.clientId !== req.clientUser.clientId) return res.status(404).json({ message: "المشروع غير موجود" });
      const stageId = typeof req.query.stageId === "string" ? req.query.stageId : undefined;
      const comments = await storage.getProjectComments(project.id, stageId);
      res.json(comments);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/portal/projects/:id/comments", portalAuthMiddleware, async (req: PortalAuthRequest, res) => {
    try {
      if (!req.clientUser) return res.status(401).json({ message: "غير مصرح" });
      const project = await storage.getProjectById(req.params.id);
      if (!project || project.clientId !== req.clientUser.clientId) return res.status(404).json({ message: "المشروع غير موجود" });
      const { body, stageId } = req.body;
      if (!body || !body.trim()) return res.status(400).json({ message: "الرسالة مطلوبة" });
      const comment = await storage.createProjectComment({
        projectId: project.id, stageId: stageId || undefined,
        authorType: "client", authorClientUserId: req.clientUser.clientUserId, body,
      });
      res.json(comment);

      const clientUser = await storage.getClientUserById(req.clientUser.clientUserId);
      const client = await storage.getAllClients().then((cs) => cs.find((c) => c.id === project.clientId));
      getStaffRecipientsForProject(project.id).then((to) => {
        if (to.length === 0) return;
        sendNewClientCommentEmail({
          to, clientName: client?.clientName || clientUser?.name || "عميل", projectName: project.name, commentBody: body,
        }).catch((err) => console.error("Email send failed (new client comment):", err));
      });
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // ─── Approvals ──────────────────────────────────────────────────────────
  app.post("/api/portal/stages/:id/approve", portalAuthMiddleware, async (req: PortalAuthRequest, res) => {
    try {
      if (!req.clientUser) return res.status(401).json({ message: "غير مصرح" });
      const { decision, comment } = req.body;
      if (!["approved", "changes_requested"].includes(decision)) return res.status(400).json({ message: "قرار غير صالح" });
      const stage = await storage.getProjectStageById(req.params.id);
      if (!stage) return res.status(404).json({ message: "المرحلة غير موجودة" });
      const project = await storage.getProjectById(stage.projectId);
      if (!project || project.clientId !== req.clientUser.clientId) return res.status(403).json({ message: "غير مسموح" });

      const approval = await storage.createApproval({
        stageId: stage.id, decision, clientComment: comment || undefined,
        approvedByClientUserId: req.clientUser.clientUserId,
        stageTitleSnapshot: stage.title, projectNameSnapshot: project.name,
      });
      await storage.updateProjectStage(stage.id, {
        status: decision === "approved" ? "approved" : "changes_requested",
      });
      res.json(approval);

      const clientUser = await storage.getClientUserById(req.clientUser.clientUserId);
      getStaffRecipientsForProject(project.id).then((to) => {
        if (to.length === 0) return;
        const emailFn = decision === "approved" ? sendStageApprovedEmail : sendStageChangesRequestedEmail;
        emailFn({
          to, clientName: clientUser?.name || "عميل", projectName: project.name, stageTitle: stage.title, comment,
        }).catch((err) => console.error("Email send failed (stage approval):", err));
      });
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // ─── Support Tickets ────────────────────────────────────────────────────
  app.get("/api/portal/tickets", portalAuthMiddleware, async (req: PortalAuthRequest, res) => {
    try {
      if (!req.clientUser) return res.status(401).json({ message: "غير مصرح" });
      const tickets = await storage.getTicketsByClient(req.clientUser.clientId);
      res.json(tickets);
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/portal/tickets", portalAuthMiddleware, async (req: PortalAuthRequest, res) => {
    try {
      if (!req.clientUser) return res.status(401).json({ message: "غير مصرح" });
      const { projectId, subject, description, priority } = req.body;
      if (!projectId || !subject || !description) return res.status(400).json({ message: "حقول مطلوبة ناقصة" });
      const project = await storage.getProjectById(projectId);
      if (!project || project.clientId !== req.clientUser.clientId) return res.status(403).json({ message: "غير مسموح" });
      const validPriority = TICKET_PRIORITIES.includes(priority) ? priority : "medium";
      const ticket = await storage.createTicket({
        projectId, clientId: req.clientUser.clientId, subject, description,
        priority: validPriority, createdByClientUserId: req.clientUser.clientUserId,
      });
      res.json(ticket);

      const clientUser = await storage.getClientUserById(req.clientUser.clientUserId);
      getAdminEmails().then((to) => {
        if (to.length === 0) return;
        sendNewTicketEmail({
          to, clientName: clientUser?.name || "عميل", subject, priority: validPriority,
          ticketUrl: `${req.protocol}://${req.get("host")}/admin/tickets`,
        }).catch((err) => console.error("Email send failed (new ticket):", err));
      });
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.get("/api/portal/tickets/:id", portalAuthMiddleware, async (req: PortalAuthRequest, res) => {
    try {
      if (!req.clientUser) return res.status(401).json({ message: "غير مصرح" });
      const ticket = await storage.getTicketById(req.params.id);
      if (!ticket || ticket.clientId !== req.clientUser.clientId) return res.status(404).json({ message: "التذكرة غير موجودة" });
      const messages = await storage.getTicketMessages(ticket.id);
      res.json({ ...ticket, messages: messages.map((m) => ({ ...m, attachmentObjectKey: undefined })) });
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post(
    "/api/portal/tickets/:id/messages",
    portalAuthMiddleware, uploadPrivateFileMiddleware.single("file"),
    async (req: PortalAuthRequest, res) => {
      try {
        if (!req.clientUser) return res.status(401).json({ message: "غير مصرح" });
        const ticket = await storage.getTicketById(req.params.id);
        if (!ticket || ticket.clientId !== req.clientUser.clientId) return res.status(404).json({ message: "التذكرة غير موجودة" });
        const { body } = req.body;
        if (!body || !body.trim()) return res.status(400).json({ message: "الرسالة مطلوبة" });

        let attachment: { attachmentFileName?: string; attachmentObjectKey?: string; attachmentMimeType?: string; attachmentFileSize?: number } = {};
        if (req.file) {
          const objectKey = await uploadPrivateFile(req.file.buffer, req.file.originalname, req.file.mimetype);
          attachment = { attachmentFileName: req.file.originalname, attachmentObjectKey: objectKey, attachmentMimeType: req.file.mimetype, attachmentFileSize: req.file.size };
        }

        const message = await storage.createTicketMessage({
          ticketId: ticket.id, senderType: "client", senderClientUserId: req.clientUser.clientUserId, body, ...attachment,
        });
        res.json({ ...message, attachmentObjectKey: undefined });

        if (ticket.status === "resolved" || ticket.status === "closed") {
          await storage.updateTicket(ticket.id, { status: "open" });
        }

        const staffId = ticket.assignedTo;
        (async () => {
          const to = staffId ? (await storage.getUserById(staffId))?.email : undefined;
          const recipients = to ? [to] : await getAdminEmails();
          for (const email of recipients) {
            sendTicketReplyEmail({ to: email, subject: ticket.subject, replyBody: body }).catch((err) =>
              console.error("Email send failed (ticket reply):", err)
            );
          }
        })();
      } catch {
        res.status(500).json({ message: "خطأ في الخادم" });
      }
    }
  );

  app.get("/api/portal/ticket-messages/:id/attachment", portalAuthMiddleware, async (req: PortalAuthRequest, res) => {
    try {
      if (!req.clientUser) return res.status(401).json({ message: "غير مصرح" });
      const message = await storage.getTicketMessageById(req.params.id);
      if (!message || !message.attachmentObjectKey) return res.status(404).json({ message: "الملف غير موجود" });
      const ticket = await storage.getTicketById(message.ticketId);
      if (!ticket || ticket.clientId !== req.clientUser.clientId) return res.status(403).json({ message: "غير مسموح" });
      await streamPrivateFile(message.attachmentObjectKey, res, message.attachmentFileName || "attachment", message.attachmentMimeType || "application/octet-stream");
    } catch {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });
}
