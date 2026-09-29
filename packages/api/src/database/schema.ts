import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  /** The language the user is learning, as a BCP 47 language tag. */
  targetLanguage: text("target_language").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
