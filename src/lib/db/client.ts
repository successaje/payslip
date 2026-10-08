import "server-only";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// DATABASE_* is what .env.example documents; TURSO_* is what the Vercel
// marketplace integration sets, so a one-click install needs no renaming.
const url = process.env.DATABASE_URL ?? process.env.TURSO_DATABASE_URL ?? "file:./data/payslip.db";
const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || undefined;

const client = createClient({ url, authToken });

export const db = drizzle(client, { schema });
export type Db = typeof db;
