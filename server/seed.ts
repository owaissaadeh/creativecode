import { storage } from "./storage";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "./db";
import { users, leads, clients, commissions, pageItems, consultations } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  try {
    // 1. Clear sensitive old data but keep CMS/Config
    console.log("Cleaning up old users and related data...");
    await db.delete(commissions);
    await db.delete(clients);
    await db.delete(leads);
    await db.delete(users);

    // 2. Create the new Master Admin
    const adminPass = await bcrypt.hash("owais@123", 10);
    await storage.createUser({
      id: randomUUID(),
      name: "أويس - المدير العام",
      email: "admin@creativecode-jo.com",
      password: adminPass,
      role: "admin",
      commissionRate: "0",
    });

    console.log("✅ Database reset: New admin created (admin@creativecode-jo.com)");
  } catch (err) {
    console.error("Seed error:", err);
  }
}
