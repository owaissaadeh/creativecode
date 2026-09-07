import { db } from "./db";
import {
  users, leads, clients, commissions, pageItems, consultations, tasks,
  clientUsers, projects, projectStages, deliverables, projectComments,
  approvals, supportTickets, ticketMessages,
} from "@shared/schema";
import { eq, and, desc, sql, or } from "drizzle-orm";
import { randomUUID } from "crypto";
import type {
  User, InsertUser, Lead, InsertLead,
  Client, InsertClient, Commission, InsertCommission,
  PageItem, InsertPageItem, Consultation, InsertConsultation,
  Task, InsertTask,
  ClientUser, InsertClientUser, Project, InsertProject,
  ProjectStage, InsertProjectStage, Deliverable, InsertDeliverable,
  ProjectComment, InsertProjectComment, Approval, InsertApproval,
  SupportTicket, InsertSupportTicket, TicketMessage, InsertTicketMessage,
} from "@shared/schema";

export interface IStorage {
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(data: InsertUser & { id?: string }): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User>;

  getAllLeads(): Promise<Lead[]>;
  getLeadsByAssignee(userId: string): Promise<Lead[]>;
  createLead(data: InsertLead & { id?: string }): Promise<Lead>;
  updateLead(id: string, data: Partial<Lead>): Promise<Lead>;

  getAllClients(): Promise<Client[]>;
  getClientsBySales(salesId: string): Promise<Client[]>;
  createClient(data: InsertClient & { id?: string }): Promise<Client>;
  updateClient(id: string, data: Partial<Client>): Promise<Client>;
  addClientNote(id: string, note: string): Promise<Client>;

  getAllCommissions(): Promise<Commission[]>;
  getCommissionsBySales(salesId: string): Promise<Commission[]>;
  createCommission(data: InsertCommission & { id?: string }): Promise<Commission>;

  getPageItems(itemType?: string): Promise<PageItem[]>;
  getPageItem(id: string): Promise<PageItem | undefined>;
  createPageItem(data: InsertPageItem & { id?: string }): Promise<PageItem>;
  updatePageItem(id: string, data: Partial<PageItem>): Promise<PageItem>;
  deletePageItem(id: string): Promise<void>;
  getSiteConfig(): Promise<{ logo_text: string; logo_url: string; favicon_url: string }>;
  setSiteConfig(data: { logo_text?: string; logo_url?: string; favicon_url?: string }): Promise<void>;

  getAllConsultations(): Promise<Consultation[]>;
  createConsultation(data: InsertConsultation & { id?: string }): Promise<Consultation>;
  updateConsultation(id: string, data: Partial<Consultation>): Promise<Consultation>;

  getAllTasks(): Promise<Task[]>;
  getTasksByUser(userId: string): Promise<Task[]>;
  getTasksByLead(leadId: string): Promise<Task[]>;
  getTasksByClient(clientId: string): Promise<Task[]>;
  getPendingTasksCount(userId: string): Promise<number>;
  createTask(data: InsertTask & { id?: string }): Promise<Task>;
  updateTask(id: string, data: Partial<Task>): Promise<Task>;
  deleteTask(id: string): Promise<void>;

  getAdminStats(): Promise<unknown>;
  getSalesStats(salesId: string): Promise<unknown>;
  getReports(): Promise<unknown>;

  // ─── Client Portal ────────────────────────────────────────────────────
  getClientUserById(id: string): Promise<ClientUser | undefined>;
  getClientUserByEmail(email: string): Promise<ClientUser | undefined>;
  getClientUsersByClient(clientId: string): Promise<ClientUser[]>;
  createClientUser(data: InsertClientUser & { id?: string }): Promise<ClientUser>;
  updateClientUser(id: string, data: Partial<ClientUser>): Promise<ClientUser>;

  getAllProjects(): Promise<Project[]>;
  getProjectById(id: string): Promise<Project | undefined>;
  getProjectsByClient(clientId: string): Promise<Project[]>;
  getProjectsBySales(salesId: string): Promise<Project[]>;
  createProject(data: InsertProject & { id?: string }): Promise<Project>;
  updateProject(id: string, data: Partial<Project>): Promise<Project>;

  getProjectStagesByProject(projectId: string): Promise<ProjectStage[]>;
  getProjectStageById(id: string): Promise<ProjectStage | undefined>;
  createProjectStage(data: InsertProjectStage & { id?: string }): Promise<ProjectStage>;
  updateProjectStage(id: string, data: Partial<ProjectStage>): Promise<ProjectStage>;
  deleteProjectStage(id: string): Promise<void>;

  getDeliverablesByProject(projectId: string): Promise<Deliverable[]>;
  getDeliverablesByStage(stageId: string): Promise<Deliverable[]>;
  getDeliverableById(id: string): Promise<Deliverable | undefined>;
  createDeliverable(data: InsertDeliverable & { id?: string }): Promise<Deliverable>;
  deleteDeliverable(id: string): Promise<void>;

  getProjectComments(projectId: string, stageId?: string): Promise<ProjectComment[]>;
  createProjectComment(data: InsertProjectComment & { id?: string }): Promise<ProjectComment>;

  getApprovalsByStage(stageId: string): Promise<Approval[]>;
  createApproval(data: InsertApproval & { id?: string }): Promise<Approval>;

  getAllTickets(): Promise<SupportTicket[]>;
  getTicketById(id: string): Promise<SupportTicket | undefined>;
  getTicketsByClient(clientId: string): Promise<SupportTicket[]>;
  getTicketsByProject(projectId: string): Promise<SupportTicket[]>;
  getTicketsForSales(salesId: string): Promise<SupportTicket[]>;
  createTicket(data: InsertSupportTicket & { id?: string }): Promise<SupportTicket>;
  updateTicket(id: string, data: Partial<SupportTicket>): Promise<SupportTicket>;

  getTicketMessages(ticketId: string): Promise<TicketMessage[]>;
  getTicketMessageById(id: string): Promise<TicketMessage | undefined>;
  createTicketMessage(data: InsertTicketMessage & { id?: string }): Promise<TicketMessage>;
}

export class DatabaseStorage implements IStorage {
  async getUserById(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getAllUsers() {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async createUser(data: InsertUser & { id?: string }) {
    const id = data.id || randomUUID();
    const [user] = await db.insert(users).values({ ...data, id }).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>) {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  async getAllLeads() {
    return db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async getLeadsByAssignee(userId: string) {
    return db.select().from(leads).where(eq(leads.assignedTo, userId)).orderBy(desc(leads.createdAt));
  }

  async createLead(data: InsertLead & { id?: string }) {
    const id = data.id || randomUUID();
    const [lead] = await db.insert(leads).values({ ...data, id }).returning();
    return lead;
  }

  async updateLead(id: string, data: Partial<Lead>) {
    const [lead] = await db.update(leads).set(data).where(eq(leads.id, id)).returning();
    return lead;
  }

  async getAllClients() {
    return db.select().from(clients).orderBy(desc(clients.createdAt));
  }

  async getClientsBySales(salesId: string) {
    return db.select().from(clients).where(eq(clients.salesId, salesId)).orderBy(desc(clients.createdAt));
  }

  async createClient(data: InsertClient & { id?: string }) {
    const id = data.id || randomUUID();
    const [client] = await db.insert(clients).values({ ...data, id }).returning();
    return client;
  }

  async updateClient(id: string, data: Partial<Client>) {
    const [client] = await db.update(clients).set(data).where(eq(clients.id, id)).returning();
    return client;
  }

  async addClientNote(id: string, note: string) {
    const [current] = await db.select().from(clients).where(eq(clients.id, id));
    const notes = [...(current.notes || []), note];
    const [client] = await db.update(clients).set({ notes }).where(eq(clients.id, id)).returning();
    return client;
  }

  async getAllCommissions() {
    return db.select().from(commissions).orderBy(desc(commissions.createdAt));
  }

  async getCommissionsBySales(salesId: string) {
    return db.select().from(commissions).where(eq(commissions.salesId, salesId)).orderBy(desc(commissions.createdAt));
  }

  async createCommission(data: InsertCommission & { id?: string }) {
    const id = data.id || randomUUID();
    const [commission] = await db.insert(commissions).values({ ...data, id }).returning();
    return commission;
  }

  async getPageItems(itemType?: string) {
    if (itemType) {
      return db.select().from(pageItems)
        .where(and(eq(pageItems.itemType, itemType as any), eq(pageItems.isActive, true)))
        .orderBy(pageItems.orderIndex);
    }
    return db.select().from(pageItems)
      .where(sql`item_type != 'config'`)
      .orderBy(pageItems.itemType, pageItems.orderIndex);
  }

  async getPageItem(id: string) {
    const [item] = await db.select().from(pageItems).where(eq(pageItems.id, id));
    return item;
  }

  async createPageItem(data: InsertPageItem & { id?: string }) {
    const id = data.id || randomUUID();
    const [item] = await db.insert(pageItems).values({ ...data, id }).returning();
    return item;
  }

  async updatePageItem(id: string, data: Partial<PageItem>) {
    const [item] = await db.update(pageItems).set(data).where(eq(pageItems.id, id)).returning();
    return item;
  }

  async deletePageItem(id: string) {
    await db.delete(pageItems).where(eq(pageItems.id, id));
  }

  async getSiteConfig(): Promise<{ logo_text: string; logo_url: string; favicon_url: string }> {
    const results = await db.execute(sql`SELECT description FROM page_items WHERE item_type = 'config' LIMIT 1`);
    const defaults = { logo_text: "Creative Code", logo_url: "", favicon_url: "" };
    if (!results.rows[0]) return defaults;
    try {
      const parsed = JSON.parse((results.rows[0] as any).description || "{}");
      return { ...defaults, ...parsed };
    } catch { return defaults; }
  }

  async setSiteConfig(data: { logo_text?: string; logo_url?: string; favicon_url?: string }): Promise<void> {
    const current = await this.getSiteConfig();
    const merged = { ...current, ...data };
    const results = await db.execute(sql`SELECT id FROM page_items WHERE item_type = 'config' LIMIT 1`);
    if (results.rows[0]) {
      const id = (results.rows[0] as any).id;
      await db.execute(sql`UPDATE page_items SET description = ${JSON.stringify(merged)} WHERE id = ${id}`);
    } else {
      const id = randomUUID();
      await db.execute(sql`INSERT INTO page_items (id, item_type, title, description, tags, order_index, is_active, created_at) VALUES (${id}, 'config', 'site_config', ${JSON.stringify(merged)}, '{}', 0, true, NOW())`);
    }
  }

  async getAllConsultations() {
    return db.select().from(consultations).orderBy(desc(consultations.createdAt));
  }

  async createConsultation(data: InsertConsultation & { id?: string }) {
    const id = data.id || randomUUID();
    const [consultation] = await db.insert(consultations).values({ ...data, id }).returning();
    return consultation;
  }

  async updateConsultation(id: string, data: Partial<Consultation>) {
    const [consultation] = await db.update(consultations).set(data).where(eq(consultations.id, id)).returning();
    return consultation;
  }

  async getAllTasks() {
    return db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }

  async getTasksByUser(userId: string) {
    return db.select().from(tasks)
      .where(eq(tasks.assignedTo, userId))
      .orderBy(desc(tasks.createdAt));
  }

  async getTasksByLead(leadId: string) {
    return db.select().from(tasks).where(eq(tasks.relatedLeadId, leadId)).orderBy(desc(tasks.createdAt));
  }

  async getTasksByClient(clientId: string) {
    return db.select().from(tasks).where(eq(tasks.relatedClientId, clientId)).orderBy(desc(tasks.createdAt));
  }

  async getPendingTasksCount(userId: string) {
    const result = await db.select().from(tasks)
      .where(and(eq(tasks.assignedTo, userId), or(eq(tasks.status, "todo"), eq(tasks.status, "in_progress"))));
    return result.length;
  }

  async createTask(data: InsertTask & { id?: string }) {
    const id = data.id || randomUUID();
    const [task] = await db.insert(tasks).values({ ...data, id }).returning();
    return task;
  }

  async updateTask(id: string, data: Partial<Task>) {
    const [task] = await db.update(tasks).set(data).where(eq(tasks.id, id)).returning();
    return task;
  }

  async deleteTask(id: string) {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async getAdminStats() {
    const allLeads = await this.getAllLeads();
    const allClients = await this.getAllClients();
    const allCommissions = await this.getAllCommissions();
    const allUsers = await this.getAllUsers();
    const allConsultations = await this.getAllConsultations();

    const salesUsers = allUsers.filter((u) => u.role === "sales");
    const wonClients = allClients.filter((c) => c.status === "Won");
    const totalSales = wonClients.reduce((s, c) => s + Number(c.dealValue), 0);
    const totalCommissions = allCommissions.reduce((s, c) => s + Number(c.commissionAmount), 0);
    const closingRate = allClients.length > 0 ? Math.round((wonClients.length / allClients.length) * 100) : 0;
    const pendingConsultations = allConsultations.filter((c) => c.status === "pending").length;

    const salesTotals = salesUsers.map((u) => ({
      name: u.name,
      total: allClients.filter((c) => c.salesId === u.id && c.status === "Won")
        .reduce((s, c) => s + Number(c.dealValue), 0),
    })).sort((a, b) => b.total - a.total);

    const bestSales = salesTotals[0]?.total > 0 ? salesTotals[0] : null;

    return {
      totalLeads: allLeads.length,
      totalClients: allClients.length,
      totalSalesUsers: salesUsers.length,
      totalSales,
      totalCommissions,
      closingRate,
      bestSales,
      recentLeads: allLeads.slice(0, 5),
      pendingConsultations,
      totalConsultations: allConsultations.length,
    };
  }

  async getSalesStats(salesId: string) {
    const myLeads = await this.getLeadsByAssignee(salesId);
    const myClients = await this.getClientsBySales(salesId);
    const myCommissions = await this.getCommissionsBySales(salesId);
    const wonClients = myClients.filter((c) => c.status === "Won");
    const totalCommissions = myCommissions.reduce((s, c) => s + Number(c.commissionAmount), 0);

    return {
      totalLeads: myLeads.length,
      totalClients: myClients.length,
      wonClients: wonClients.length,
      totalCommissions,
      recentLeads: myLeads.slice(0, 5),
      recentClients: myClients.slice(0, 5),
    };
  }

  async getReports() {
    const allClients = await this.getAllClients();
    const allCommissions = await this.getAllCommissions();
    const allLeads = await this.getAllLeads();
    const allUsers = await this.getAllUsers();

    const wonClients = allClients.filter((c) => c.status === "Won");
    const totalSales = wonClients.reduce((s, c) => s + Number(c.dealValue), 0);
    const totalCommissions = allCommissions.reduce((s, c) => s + Number(c.commissionAmount), 0);
    const closingRate = allClients.length > 0 ? Math.round((wonClients.length / allClients.length) * 100) : 0;

    const salesTotals = allUsers
      .filter((u) => u.role === "sales")
      .map((u) => ({
        name: u.name,
        total: allClients.filter((c) => c.salesId === u.id && c.status === "Won")
          .reduce((s, c) => s + Number(c.dealValue), 0),
      })).sort((a, b) => b.total - a.total);
    const bestSales = salesTotals[0]?.total > 0 ? salesTotals[0] : null;

    const monthMap: Record<string, number> = {};
    wonClients.forEach((c) => {
      const m = new Date(c.createdAt).toLocaleDateString("ar-SA", { month: "short", year: "2-digit" });
      monthMap[m] = (monthMap[m] || 0) + Number(c.dealValue);
    });
    const salesByMonth = Object.entries(monthMap).map(([month, total]) => ({ month, total }));

    const statusCount: Record<string, number> = {};
    allClients.forEach((c) => { statusCount[c.status] = (statusCount[c.status] || 0) + 1; });
    const clientsByStatus = Object.entries(statusCount).map(([status, count]) => ({ status, count }));

    const sourceCount: Record<string, number> = {};
    allLeads.forEach((l) => { sourceCount[l.source || "direct"] = (sourceCount[l.source || "direct"] || 0) + 1; });
    const leadsBySource = Object.entries(sourceCount).map(([source, count]) => ({ source, count }));

    return { totalSales, totalCommissions, closingRate, bestSales, salesByMonth, clientsByStatus, leadsBySource };
  }

  // ─── Client Portal ──────────────────────────────────────────────────────

  async getClientUserById(id: string) {
    const [row] = await db.select().from(clientUsers).where(eq(clientUsers.id, id));
    return row;
  }

  async getClientUserByEmail(email: string) {
    const [row] = await db.select().from(clientUsers).where(eq(clientUsers.email, email));
    return row;
  }

  async getClientUsersByClient(clientId: string) {
    return db.select().from(clientUsers).where(eq(clientUsers.clientId, clientId)).orderBy(desc(clientUsers.createdAt));
  }

  async createClientUser(data: InsertClientUser & { id?: string }) {
    const id = data.id || randomUUID();
    const [row] = await db.insert(clientUsers).values({ ...data, id }).returning();
    return row;
  }

  async updateClientUser(id: string, data: Partial<ClientUser>) {
    const [row] = await db.update(clientUsers).set(data).where(eq(clientUsers.id, id)).returning();
    return row;
  }

  async getAllProjects() {
    return db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProjectById(id: string) {
    const [row] = await db.select().from(projects).where(eq(projects.id, id));
    return row;
  }

  async getProjectsByClient(clientId: string) {
    return db.select().from(projects).where(eq(projects.clientId, clientId)).orderBy(desc(projects.createdAt));
  }

  async getProjectsBySales(salesId: string) {
    const rows = await db.select({ project: projects })
      .from(projects)
      .innerJoin(clients, eq(projects.clientId, clients.id))
      .where(eq(clients.salesId, salesId))
      .orderBy(desc(projects.createdAt));
    return rows.map((r) => r.project);
  }

  async createProject(data: InsertProject & { id?: string }) {
    const id = data.id || randomUUID();
    const [row] = await db.insert(projects).values({ ...data, id }).returning();
    return row;
  }

  async updateProject(id: string, data: Partial<Project>) {
    const [row] = await db.update(projects).set(data).where(eq(projects.id, id)).returning();
    return row;
  }

  async getProjectStagesByProject(projectId: string) {
    return db.select().from(projectStages).where(eq(projectStages.projectId, projectId)).orderBy(projectStages.sequence);
  }

  async getProjectStageById(id: string) {
    const [row] = await db.select().from(projectStages).where(eq(projectStages.id, id));
    return row;
  }

  async createProjectStage(data: InsertProjectStage & { id?: string }) {
    const id = data.id || randomUUID();
    const [row] = await db.insert(projectStages).values({ ...data, id }).returning();
    return row;
  }

  async updateProjectStage(id: string, data: Partial<ProjectStage>) {
    const [row] = await db.update(projectStages).set(data).where(eq(projectStages.id, id)).returning();
    return row;
  }

  async deleteProjectStage(id: string) {
    await db.delete(projectStages).where(eq(projectStages.id, id));
  }

  async getDeliverablesByProject(projectId: string) {
    return db.select().from(deliverables).where(eq(deliverables.projectId, projectId)).orderBy(desc(deliverables.createdAt));
  }

  async getDeliverablesByStage(stageId: string) {
    return db.select().from(deliverables).where(eq(deliverables.stageId, stageId)).orderBy(desc(deliverables.createdAt));
  }

  async getDeliverableById(id: string) {
    const [row] = await db.select().from(deliverables).where(eq(deliverables.id, id));
    return row;
  }

  async createDeliverable(data: InsertDeliverable & { id?: string }) {
    const id = data.id || randomUUID();
    const [row] = await db.insert(deliverables).values({ ...data, id }).returning();
    return row;
  }

  async deleteDeliverable(id: string) {
    await db.delete(deliverables).where(eq(deliverables.id, id));
  }

  async getProjectComments(projectId: string, stageId?: string) {
    if (stageId) {
      return db.select().from(projectComments)
        .where(and(eq(projectComments.projectId, projectId), eq(projectComments.stageId, stageId)))
        .orderBy(projectComments.createdAt);
    }
    return db.select().from(projectComments).where(eq(projectComments.projectId, projectId)).orderBy(projectComments.createdAt);
  }

  async createProjectComment(data: InsertProjectComment & { id?: string }) {
    const id = data.id || randomUUID();
    const [row] = await db.insert(projectComments).values({ ...data, id }).returning();
    return row;
  }

  async getApprovalsByStage(stageId: string) {
    return db.select().from(approvals).where(eq(approvals.stageId, stageId)).orderBy(desc(approvals.createdAt));
  }

  async createApproval(data: InsertApproval & { id?: string }) {
    const id = data.id || randomUUID();
    const [row] = await db.insert(approvals).values({ ...data, id }).returning();
    return row;
  }

  async getAllTickets() {
    return db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt));
  }

  async getTicketById(id: string) {
    const [row] = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
    return row;
  }

  async getTicketsByClient(clientId: string) {
    return db.select().from(supportTickets).where(eq(supportTickets.clientId, clientId)).orderBy(desc(supportTickets.createdAt));
  }

  async getTicketsByProject(projectId: string) {
    return db.select().from(supportTickets).where(eq(supportTickets.projectId, projectId)).orderBy(desc(supportTickets.createdAt));
  }

  async getTicketsForSales(salesId: string) {
    const rows = await db.select({ ticket: supportTickets })
      .from(supportTickets)
      .leftJoin(clients, eq(supportTickets.clientId, clients.id))
      .where(or(eq(clients.salesId, salesId), eq(supportTickets.assignedTo, salesId)))
      .orderBy(desc(supportTickets.createdAt));
    return rows.map((r) => r.ticket);
  }

  async createTicket(data: InsertSupportTicket & { id?: string }) {
    const id = data.id || randomUUID();
    const [row] = await db.insert(supportTickets).values({ ...data, id }).returning();
    return row;
  }

  async updateTicket(id: string, data: Partial<SupportTicket>) {
    const [row] = await db.update(supportTickets).set(data).where(eq(supportTickets.id, id)).returning();
    return row;
  }

  async getTicketMessages(ticketId: string) {
    return db.select().from(ticketMessages).where(eq(ticketMessages.ticketId, ticketId)).orderBy(ticketMessages.createdAt);
  }

  async getTicketMessageById(id: string) {
    const [row] = await db.select().from(ticketMessages).where(eq(ticketMessages.id, id));
    return row;
  }

  async createTicketMessage(data: InsertTicketMessage & { id?: string }) {
    const id = data.id || randomUUID();
    const [row] = await db.insert(ticketMessages).values({ ...data, id }).returning();
    return row;
  }
}

export const storage = new DatabaseStorage();
