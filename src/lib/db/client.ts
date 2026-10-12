import "server-only";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { statements } from "./migrations";

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
let raw: ReturnType<typeof createClient> | null = null;
function connect(): Db {
  if (!instance) {
    raw = createClient({ url, authToken });
    instance = drizzle(raw, { schema });
  }
  return instance;
}

/**
 * Creates any missing tables and indexes from the committed migration SQL.
 * Every statement is IF NOT EXISTS, so this is idempotent; it runs once per
 * process, before the first request that touches the database.
 */
let ready: Promise<void> | null = null;
export function ensureSchema(): Promise<void> {
  if (!ready) {
    connect();
    ready = (async () => {
      for (const sql of statements) await raw!.execute(sql);
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = connect();
    const value = Reflect.get(real, prop);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
