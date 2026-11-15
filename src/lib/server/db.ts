import "server-only";
import type { Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

// The database connection (ADR 0007). TURSO_DATABASE_URL and TURSO_AUTH_TOKEN
// point at Turso, reached over HTTP with the pure-JS client so no native
// SQLite binary has to load on the host. Without them (local dev only), a
// SQLite file in .data/ is used through the Node client, loaded on demand.

export type Db = LibSQLDatabase<typeof schema>;

let db: Promise<Db> | undefined;

async function connect(): Promise<Db> {
  const url = process.env.TURSO_DATABASE_URL;
  let client: Client;
  if (url && !url.startsWith("file:")) {
    const { createClient } = await import("@libsql/client/web");
    client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
  } else {
    // Hosted, a missing URL is a setup mistake: say so instead of failing to
    // write a file to a read-only disk. An explicit file: URL is allowed.
    if (!url && (process.env.VERCEL || process.env.NODE_ENV === "production")) {
      throw new Error("TURSO_DATABASE_URL is not set; the hosted app has nowhere to store data.");
    }
    const { createClient } = await import("@libsql/client");
    client = createClient({ url: url || "file:.data/bach.db" });
  }
  return drizzle(client, { schema });
}

export function getDb(): Promise<Db> {
  if (!db) {
    db = connect();
    db.catch(() => (db = undefined)); // retry on the next request
  }
  return db;
}

/** For tests: use this database instead (e.g. an in-memory one). */
export function setDbForTests(next: Db | undefined): void {
  db = next ? Promise.resolve(next) : undefined;
}
