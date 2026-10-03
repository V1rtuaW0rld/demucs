import type { InferSelectModel } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const Result = sqliteTable("result", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status", {
    enum: ["success", "error", "processing"],
  }).notNull(),
  twoStems: integer("two_stems", { mode: "boolean" }).notNull(),
  stems: integer("stems").notNull().default(4),
  model: text("model").notNull().default("htdemucs"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  enhancerSettings: text("enhancer_settings"),
});

export type ResultType = InferSelectModel<typeof Result>;
