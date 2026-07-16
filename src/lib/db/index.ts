import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

// Cache the connection on globalThis so Next.js dev-mode module reloads
// don't open a new handle per request.
const globalForDb = globalThis as unknown as { __susuDb?: Database.Database };

export function getDb(): Database.Database {
  if (globalForDb.__susuDb) return globalForDb.__susuDb;

  const configured = process.env.DATABASE_URL || "./data/susu.db";
  const dbPath = path.isAbsolute(configured)
    ? configured
    : path.join(process.cwd(), configured);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const schemaPath = path.join(process.cwd(), "src", "lib", "db", "schema.sql");
  db.exec(fs.readFileSync(schemaPath, "utf8"));

  globalForDb.__susuDb = db;
  return db;
}
