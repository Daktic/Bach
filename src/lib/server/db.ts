import "server-only";
import { createClient } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

// The database connection (ADR 0007). TURSO_DATABASE_URL and TURSO_AUTH_TOKEN
// point at Turso; without them, a local SQLite file in .data/ is used.

export type Db = LibSQLDatabase<typeof schema>;

let db: Db | undefined;

export function getDb(): Db {
  if (!db) {
    const url = process.env.TURSO_DATABASE_URL || "file:.data/bach.db";
    const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
    db = drizzle(client, { schema });
  }
  return db;
}

/** For tests: use this database instead (e.g. an in-memory one). */
export function setDbForTests(next: Db | undefined): void {
  db = next;
}
