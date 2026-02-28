import { db } from "./db";
import { users, leads, clients, commissions, pageItems, consultations } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import type {
  User, InsertUser, Lead, InsertLead,
  Client, InsertClient, Commission, InsertCommission,
  PageItem, InsertPageItem, Consultation, InsertConsultation
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
  getSiteConfig(): Promise<{ logo_text: string; favicon_url: string }>;
  setSiteConfig(data: { logo_text?: string; favicon_url?: string }): Promise<void>;

  getAllConsultations(): Promise<Consultation[]>;
  createConsultation(data: InsertConsultation & { id?: string }): Promise<Consultation>;
  updateConsultation(id: string, data: Partial<Consultation>): Promise<Consultation>;

  getAdminStats(): Promise<unknown>;
  getSalesStats(salesId: string): Promise<unknown>;
  getReports(): Promise<unknown>;
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
    return db.select().from(pageItems).orderBy(pageItems.itemType, pageItems.orderIndex);
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

  async getSiteConfig(): Promise<{ logo_text: string; favicon_url: string }> {
    const results = await db.execute(sql`SELECT description FROM page_items WHERE item_type = 'config' LIMIT 1`);
    const defaults = { logo_text: "Creative Code", favicon_url: "" };
    if (!results.rows[0]) return defaults;
    try {
      const parsed = JSON.parse((results.rows[0] as any).description || "{}");
      return { ...defaults, ...parsed };
    } catch { return defaults; }
  }

  async setSiteConfig(data: { logo_text?: string; favicon_url?: string }): Promise<void> {
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
}

export const storage = new DatabaseStorage();
