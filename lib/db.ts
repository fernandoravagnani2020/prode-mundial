import { createClient, type InValue } from "@libsql/client";
import fs from "fs";
import path from "path";

function makeClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (url) return createClient({ url, authToken });

  // Local dev: file-based SQLite
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  return createClient({ url: `file:${path.join(dataDir, "prode.db")}` });
}

const client = makeClient();

let initialized = false;
let initPromise: Promise<void> | null = null;

async function ensureSchema() {
  if (initialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      await client.batch([
        {
          sql: `CREATE TABLE IF NOT EXISTS users (
            dni TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            is_admin INTEGER NOT NULL DEFAULT 0,
            password_hash TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          )`,
        },
        {
          sql: `CREATE TABLE IF NOT EXISTS matches (
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
          )`,
        },
        {
          sql: `CREATE TABLE IF NOT EXISTS predictions (
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
          )`,
        },
      ], "write");
      // Migration: add password_hash column if it doesn't exist yet
      try {
        await client.execute("ALTER TABLE users ADD COLUMN password_hash TEXT");
      } catch {
        // Column already exists — ignore
      }

      initialized = true;
    })();
  }
  await initPromise;
}

export async function dbGet<T>(sql: string, args: InValue[] = []): Promise<T | undefined> {
  await ensureSchema();
  const result = await client.execute({ sql, args });
  if (result.rows.length === 0) return undefined;
  return result.rows[0] as unknown as T;
}

export async function dbAll<T>(sql: string, args: InValue[] = []): Promise<T[]> {
  await ensureSchema();
  const result = await client.execute({ sql, args });
  return result.rows as unknown as T[];
}

export async function dbRun(sql: string, args: InValue[] = []): Promise<void> {
  await ensureSchema();
  await client.execute({ sql, args });
}

export async function dbBatch(statements: Array<{ sql: string; args?: InValue[] }>): Promise<void> {
  await ensureSchema();
  await client.batch(statements, "write");
}
