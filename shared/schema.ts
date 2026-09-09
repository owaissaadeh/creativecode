import { pgTable, text, varchar, integer, timestamp, decimal, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "sales", "finance"] }).notNull().default("sales"),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull().default("10"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leads = pgTable("leads", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: text("name").notNull(),
  companyName: text("company_name"),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  serviceType: text("service_type").notNull(),
  budget: text("budget"),
  message: text("message"),
  source: text("source").default("direct"),
  status: text("status", { enum: ["New", "Contacted", "Converted", "Lost"] }).notNull().default("New"),
  assignedTo: varchar("assigned_to", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clients = pgTable("clients", {
  id: varchar("id", { length: 36 }).primaryKey(),
  salesId: varchar("sales_id", { length: 36 }).references(() => users.id),
  clientName: text("client_name").notNull(),
  companyName: text("company_name"),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  serviceType: text("service_type").notNull(),
  dealValue: decimal("deal_value", { precision: 12, scale: 2 }).notNull().default("0"),
  status: text("status", {
    enum: ["New Lead", "Contacted", "Meeting Scheduled", "Proposal Sent", "Negotiation", "Won", "Lost"],
  }).notNull().default("New Lead"),
  nextMeetingDate: timestamp("next_meeting_date"),
  notes: text("notes").array().notNull().default([]),
  leadId: varchar("lead_id", { length: 36 }).references(() => leads.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const commissions = pgTable("commissions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  salesId: varchar("sales_id", { length: 36 }).references(() => users.id).notNull(),
  clientId: varchar("client_id", { length: 36 }).references(() => clients.id).notNull(),
  dealValue: decimal("deal_value", { precision: 12, scale: 2 }).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull(),
  commissionAmount: decimal("commission_amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pageItems = pgTable("page_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  itemType: text("item_type", { enum: ["service", "project", "config"] }).notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  description: text("description"),
  icon: text("icon"),
  imageUrls: text("image_urls").array().notNull().default([]),
  tags: text("tags").array().notNull().default([]),
  orderIndex: integer("order_index").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const consultations = pgTable("consultations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  companyName: text("company_name"),
  serviceType: text("service_type").notNull(),
  consultationDate: text("consultation_date").notNull(),
  consultationTime: text("consultation_time").notNull(),
  message: text("message"),
  status: text("status", { enum: ["pending", "confirmed", "done", "cancelled"] }).notNull().default("pending"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: varchar("id", { length: 36 }).primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  assignedTo: varchar("assigned_to", { length: 36 }).references(() => users.id),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id).notNull(),
  dueDate: date("due_date"),
  priority: text("priority", { enum: ["low", "medium", "high"] }).notNull().default("medium"),
  status: text("status", { enum: ["todo", "in_progress", "done"] }).notNull().default("todo"),
  relatedLeadId: varchar("related_lead_id", { length: 36 }).references(() => leads.id),
  relatedClientId: varchar("related_client_id", { length: 36 }).references(() => clients.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Client Portal ──────────────────────────────────────────────────────────

export const clientUsers = pgTable("client_users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  clientId: varchar("client_id", { length: 36 }).references(() => clients.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["owner", "member"] }).notNull().default("member"),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: varchar("id", { length: 36 }).primaryKey(),
  clientId: varchar("client_id", { length: 36 }).references(() => clients.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status", { enum: ["active", "on_hold", "completed", "cancelled"] }).notNull().default("active"),
  startDate: date("start_date"),
  targetEndDate: date("target_end_date"),
  ownerStaffId: varchar("owner_staff_id", { length: 36 }).references(() => users.id),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectStages = pgTable("project_stages", {
  id: varchar("id", { length: 36 }).primaryKey(),
  projectId: varchar("project_id", { length: 36 }).references(() => projects.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  sequence: integer("sequence").notNull().default(0),
  status: text("status", {
    enum: ["not_started", "in_progress", "needs_review", "changes_requested", "approved", "completed"],
  }).notNull().default("not_started"),
  plannedDate: date("planned_date"),
  startedAt: timestamp("started_at"),
  submittedForReviewAt: timestamp("submitted_for_review_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const deliverables = pgTable("deliverables", {
  id: varchar("id", { length: 36 }).primaryKey(),
  projectId: varchar("project_id", { length: 36 }).references(() => projects.id, { onDelete: "cascade" }).notNull(),
  stageId: varchar("stage_id", { length: 36 }).references(() => projectStages.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  fileName: text("file_name").notNull(),
  objectKey: text("object_key").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  version: integer("version").notNull().default(1),
  uploadedBy: varchar("uploaded_by", { length: 36 }).references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectComments = pgTable("project_comments", {
  id: varchar("id", { length: 36 }).primaryKey(),
  projectId: varchar("project_id", { length: 36 }).references(() => projects.id, { onDelete: "cascade" }).notNull(),
  stageId: varchar("stage_id", { length: 36 }).references(() => projectStages.id, { onDelete: "cascade" }),
  authorType: text("author_type", { enum: ["client", "staff"] }).notNull(),
  authorClientUserId: varchar("author_client_user_id", { length: 36 }).references(() => clientUsers.id),
  authorStaffId: varchar("author_staff_id", { length: 36 }).references(() => users.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const approvals = pgTable("approvals", {
  id: varchar("id", { length: 36 }).primaryKey(),
  stageId: varchar("stage_id", { length: 36 }).references(() => projectStages.id, { onDelete: "cascade" }).notNull(),
  decision: text("decision", { enum: ["approved", "changes_requested"] }).notNull(),
  clientComment: text("client_comment"),
  approvedByClientUserId: varchar("approved_by_client_user_id", { length: 36 }).references(() => clientUsers.id).notNull(),
  stageTitleSnapshot: text("stage_title_snapshot").notNull(),
  projectNameSnapshot: text("project_name_snapshot").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const supportTickets = pgTable("support_tickets", {
  id: varchar("id", { length: 36 }).primaryKey(),
  projectId: varchar("project_id", { length: 36 }).references(() => projects.id, { onDelete: "cascade" }).notNull(),
  clientId: varchar("client_id", { length: 36 }).references(() => clients.id, { onDelete: "cascade" }).notNull(),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: text("status", { enum: ["open", "in_progress", "resolved", "closed"] }).notNull().default("open"),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] }).notNull().default("medium"),
  assignedTo: varchar("assigned_to", { length: 36 }).references(() => users.id),
  createdByClientUserId: varchar("created_by_client_user_id", { length: 36 }).references(() => clientUsers.id).notNull(),
  resolvedAt: timestamp("resolved_at"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ticketMessages = pgTable("ticket_messages", {
  id: varchar("id", { length: 36 }).primaryKey(),
  ticketId: varchar("ticket_id", { length: 36 }).references(() => supportTickets.id, { onDelete: "cascade" }).notNull(),
  senderType: text("sender_type", { enum: ["client", "staff"] }).notNull(),
  senderClientUserId: varchar("sender_client_user_id", { length: 36 }).references(() => clientUsers.id),
  senderStaffId: varchar("sender_staff_id", { length: 36 }).references(() => users.id),
  body: text("body").notNull(),
  attachmentFileName: text("attachment_file_name"),
  attachmentObjectKey: text("attachment_object_key"),
  attachmentMimeType: text("attachment_mime_type"),
  attachmentFileSize: integer("attachment_file_size"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contracts = pgTable("contracts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  projectId: varchar("project_id", { length: 36 }).references(() => projects.id, { onDelete: "cascade" }).notNull().unique(),
  totalValue: decimal("total_value", { precision: 12, scale: 2 }).notNull(),
  fileName: text("file_name").notNull(),
  objectKey: text("object_key").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  uploadedBy: varchar("uploaded_by", { length: 36 }).references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: varchar("id", { length: 36 }).primaryKey(),
  projectId: varchar("project_id", { length: 36 }).references(() => projects.id, { onDelete: "cascade" }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  label: text("label").notNull(),
  dueDate: date("due_date"),
  status: text("status", { enum: ["pending", "received"] }).notNull().default("pending"),
  receivedByStaffId: varchar("received_by_staff_id", { length: 36 }).references(() => users.id),
  receivedAt: timestamp("received_at"),
  receiptFileName: text("receipt_file_name"),
  receiptObjectKey: text("receipt_object_key"),
  receiptMimeType: text("receipt_mime_type"),
  receiptFileSize: integer("receipt_file_size"),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertClientUserSchema = createInsertSchema(clientUsers).omit({ id: true, createdAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true });
export const insertProjectStageSchema = createInsertSchema(projectStages).omit({ id: true, createdAt: true });
export const insertDeliverableSchema = createInsertSchema(deliverables).omit({ id: true, createdAt: true });
export const insertProjectCommentSchema = createInsertSchema(projectComments).omit({ id: true, createdAt: true });
export const insertApprovalSchema = createInsertSchema(approvals).omit({ id: true, createdAt: true });
export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({ id: true, createdAt: true });
export const insertTicketMessageSchema = createInsertSchema(ticketMessages).omit({ id: true, createdAt: true });
export const insertContractSchema = createInsertSchema(contracts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });

export type ClientUser = typeof clientUsers.$inferSelect;
export type InsertClientUser = z.infer<typeof insertClientUserSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type ProjectStage = typeof projectStages.$inferSelect;
export type InsertProjectStage = z.infer<typeof insertProjectStageSchema>;
export type Deliverable = typeof deliverables.$inferSelect;
export type InsertDeliverable = z.infer<typeof insertDeliverableSchema>;
export type ProjectComment = typeof projectComments.$inferSelect;
export type InsertProjectComment = z.infer<typeof insertProjectCommentSchema>;
export type Approval = typeof approvals.$inferSelect;
export type InsertApproval = z.infer<typeof insertApprovalSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type TicketMessage = typeof ticketMessages.$inferSelect;
export type InsertTicketMessage = z.infer<typeof insertTicketMessageSchema>;
export type Contract = typeof contracts.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export const portalLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
export type PortalLoginData = z.infer<typeof portalLoginSchema>;

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true });
export const insertCommissionSchema = createInsertSchema(commissions).omit({ id: true, createdAt: true });
export const insertPageItemSchema = createInsertSchema(pageItems).omit({ id: true, createdAt: true });
export const insertConsultationSchema = createInsertSchema(consultations).omit({ id: true, createdAt: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertCommission = z.infer<typeof insertCommissionSchema>;
export type Commission = typeof commissions.$inferSelect;
export type InsertPageItem = z.infer<typeof insertPageItemSchema>;
export type PageItem = typeof pageItems.$inferSelect;
export type InsertConsultation = z.infer<typeof insertConsultationSchema>;
export type Consultation = typeof consultations.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
export type LoginData = z.infer<typeof loginSchema>;
