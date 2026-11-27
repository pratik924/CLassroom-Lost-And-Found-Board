import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'lost_and_found.db');

// Cache the db connection in global object to avoid multiple instances in Next.js hot reload
let db;

function getDb() {
  if (!db) {
    db = new Database(dbPath);
    // Optimize performance and reliability
    db.pragma('journal_mode = WAL');

    // Initialize reports table
    db.exec(`
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL CHECK(kind IN ('lost', 'found')),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        location TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'resolved')),
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }
  return db;
}

export default getDb;
