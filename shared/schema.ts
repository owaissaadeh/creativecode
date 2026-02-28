import { pgTable, text, varchar, integer, timestamp, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "sales"] }).notNull().default("sales"),
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

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true });
export const insertCommissionSchema = createInsertSchema(commissions).omit({ id: true, createdAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertCommission = z.infer<typeof insertCommissionSchema>;
export type Commission = typeof commissions.$inferSelect;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
export type LoginData = z.infer<typeof loginSchema>;
