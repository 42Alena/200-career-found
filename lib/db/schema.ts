import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import type { Workspace } from "@/lib/contracts";

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").$type<Workspace>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
