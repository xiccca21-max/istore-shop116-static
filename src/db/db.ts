import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

function resolveDbPath() {
  if (process.env.DB_PATH) return process.env.DB_PATH;
  // Vercel/serverless: writable FS is /tmp (ephemeral, but works for MVP).
  if (process.env.VERCEL) return "/tmp/app.db";
  return path.join(process.cwd(), "data", "app.db");
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  _db = new Database(dbPath);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  return _db;
}

