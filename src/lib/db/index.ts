import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

// Cache the connection on globalThis so Next.js dev-mode module reloads
// don't open a new handle per request.
const globalForDb = globalThis as unknown as { __susuDb?: Database.Database };

type ColumnInfo = { name: string; notnull: number };

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
  migrateGroupsIfStale(db);

  globalForDb.__susuDb = db;
  return db;
}

/**
 * CREATE TABLE IF NOT EXISTS never alters an existing table. Older local DBs
 * still require contribution_amount/schedule/round_due_at NOT NULL and lack
 * phase / round1_start_at - which breaks setup-first group creation.
 */
function migrateGroupsIfStale(db: Database.Database): void {
  const cols = db.prepare("PRAGMA table_info(groups)").all() as ColumnInfo[];
  if (cols.length === 0) return;

  const byName = new Map(cols.map((c) => [c.name, c]));
  const hasPhase = byName.has("phase");
  const contrib = byName.get("contribution_amount");
  const termsStillRequired = contrib?.notnull === 1;
  if (hasPhase && !termsStillRequired) return;

  db.pragma("foreign_keys = OFF");
  db.exec(`
    CREATE TABLE groups_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      invite_code TEXT NOT NULL UNIQUE,
      phase TEXT NOT NULL DEFAULT 'setup',
      contribution_amount REAL CHECK (contribution_amount IS NULL OR contribution_amount > 0),
      schedule TEXT,
      round1_start_at TEXT,
      current_cycle INTEGER NOT NULL DEFAULT 1,
      current_round INTEGER NOT NULL DEFAULT 1,
      round_due_at TEXT
    );
  `);

  if (hasPhase) {
    db.exec(`
      INSERT INTO groups_new (
        id, name, invite_code, phase, contribution_amount, schedule,
        round1_start_at, current_cycle, current_round, round_due_at
      )
      SELECT
        id, name, invite_code, phase, contribution_amount, schedule,
        round1_start_at, current_cycle, current_round, round_due_at
      FROM groups;
    `);
  } else {
    // Pre-phase schema used cycle_complete instead of phase.
    db.exec(`
      INSERT INTO groups_new (
        id, name, invite_code, phase, contribution_amount, schedule,
        round1_start_at, current_cycle, current_round, round_due_at
      )
      SELECT
        id,
        name,
        invite_code,
        CASE WHEN cycle_complete = 1 THEN 'cycle_complete' ELSE 'live' END,
        contribution_amount,
        schedule,
        NULL,
        current_cycle,
        current_round,
        round_due_at
      FROM groups;
    `);
  }

  db.exec(`
    DROP TABLE groups;
    ALTER TABLE groups_new RENAME TO groups;
  `);
  db.pragma("foreign_keys = ON");
}
