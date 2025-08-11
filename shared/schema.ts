import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, bytea } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const frmRepairs = pgTable("frm_repairs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  fileSize: integer("file_size").notNull(),
  frmType: text("frm_type").notNull(),
  vin: text("vin"),
  mileage: integer("mileage"),
  repairStatus: text("repair_status").notNull().default("pending"),
  analysisData: text("analysis_data"),
  originalData: bytea("original_data"),
  repairedData: bytea("repaired_data"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertFrmRepairSchema = createInsertSchema(frmRepairs).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertFrmRepair = z.infer<typeof insertFrmRepairSchema>;
export type FrmRepair = typeof frmRepairs.$inferSelect;

export const frmAnalysisSchema = z.object({
  corruptionLevel: z.number().min(0).max(100),
  recoverableSectors: z.number(),
  totalSectors: z.number(),
  vehicleData: z.object({
    vin: z.string().optional(),
    model: z.string().optional(),
    year: z.number().optional(),
    mileage: z.number().optional(),
    frmType: z.string(),
  }),
  configurationData: z.record(z.string(), z.any()),
});

export type FrmAnalysis = z.infer<typeof frmAnalysisSchema>;
