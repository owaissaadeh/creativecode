import { db } from "./db";
import { sql } from "drizzle-orm";

export async function migrateDb() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'sales',
        commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS leads (
        id VARCHAR(36) PRIMARY KEY,
        name TEXT NOT NULL,
        company_name TEXT,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        service_type TEXT NOT NULL,
        budget TEXT,
        message TEXT,
        source TEXT DEFAULT 'direct',
        status TEXT NOT NULL DEFAULT 'New',
        assigned_to VARCHAR(36) REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS clients (
        id VARCHAR(36) PRIMARY KEY,
        sales_id VARCHAR(36) REFERENCES users(id),
        client_name TEXT NOT NULL,
        company_name TEXT,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        service_type TEXT NOT NULL,
        deal_value DECIMAL(12,2) NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'New Lead',
        next_meeting_date TIMESTAMP,
        notes TEXT[] NOT NULL DEFAULT '{}',
        lead_id VARCHAR(36) REFERENCES leads(id),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS commissions (
        id VARCHAR(36) PRIMARY KEY,
        sales_id VARCHAR(36) NOT NULL REFERENCES users(id),
        client_id VARCHAR(36) NOT NULL REFERENCES clients(id),
        deal_value DECIMAL(12,2) NOT NULL,
        commission_rate DECIMAL(5,2) NOT NULL,
        commission_amount DECIMAL(12,2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    console.log("✅ Database tables ready");
  } catch (err) {
    console.error("Migration error:", err);
    throw err;
  }
}
