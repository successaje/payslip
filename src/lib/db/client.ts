import "server-only";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// DATABASE_* is what .env.example documents; TURSO_* is what the Vercel
// marketplace integration sets, so a one-click install needs no renaming.
const url = process.env.DATABASE_URL ?? process.env.TURSO_DATABASE_URL ?? "file:./data/payslip.db";
const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || undefined;

export type Db = ReturnType<typeof drizzle<typeof schema>>;

/**
 * The connection is opened on first use, not at import time. Next evaluates
 * route modules while collecting page data at build, where no database
 * exists; a request is the first moment one is needed.
 */
let instance: Db | null = null;
function connect(): Db {
  if (!instance) instance = drizzle(createClient({ url, authToken }), { schema });
  return instance;
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = connect();
    const value = Reflect.get(real, prop);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
