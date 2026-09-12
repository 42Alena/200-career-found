import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import { env } from "@/lib/env";
import * as schema from "@/lib/db/schema";

type CareerFoundDatabase = NeonHttpDatabase<typeof schema>;

let cachedDb: CareerFoundDatabase | null | undefined;

export function getDb() {
  if (cachedDb !== undefined) {
    return cachedDb;
  }

  if (!env.DATABASE_URL) {
    cachedDb = null;
    return cachedDb;
  }

  cachedDb = drizzle(neon(env.DATABASE_URL), { schema });
  return cachedDb;
}
