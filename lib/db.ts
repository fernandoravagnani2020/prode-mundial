import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "prode.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  initSchema(db);
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      dni TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT UNIQUE,
      phase TEXT NOT NULL DEFAULT 'group',
      group_name TEXT,
      team1 TEXT NOT NULL,
      team2 TEXT NOT NULL,
      team1_flag TEXT NOT NULL DEFAULT '',
      team2_flag TEXT NOT NULL DEFAULT '',
      match_date TEXT NOT NULL,
      venue TEXT,
      score1 INTEGER,
      score2 INTEGER,
      status TEXT NOT NULL DEFAULT 'scheduled'
    );

    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_dni TEXT NOT NULL,
      match_id INTEGER NOT NULL,
      predicted_score1 INTEGER NOT NULL,
      predicted_score2 INTEGER NOT NULL,
      points INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_dni, match_id),
      FOREIGN KEY (user_dni) REFERENCES users(dni),
      FOREIGN KEY (match_id) REFERENCES matches(id)
    );
  `);
}
