import { readFileSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// Reads TURSO_DATABASE_URL and TURSO_AUTH_TOKEN from .env.local (the same
// values the app uses), so `pnpm db:migrate` updates that database.
function fromEnvLocal(key: string): string | undefined {
  if (process.env[key]) return process.env[key];
  try {
    const line = readFileSync(".env.local", "utf8")
      .split("\n")
      .find((l) => l.startsWith(`${key}=`));
    return line?.slice(key.length + 1).trim().replace(/^["']|["']$/g, "") || undefined;
  } catch {
    return undefined;
  }
}

const url = fromEnvLocal("TURSO_DATABASE_URL");

export default defineConfig({
  schema: "./src/lib/server/schema.ts",
  out: "./drizzle",
  dialect: url ? "turso" : "sqlite",
  dbCredentials: url
    ? { url, authToken: fromEnvLocal("TURSO_AUTH_TOKEN") }
    : { url: "file:.data/bach.db" },
});
