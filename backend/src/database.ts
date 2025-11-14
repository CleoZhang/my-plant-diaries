import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = process.env.DB_PATH || './database.sqlite';

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    // Plants table
    db.run(`
      CREATE TABLE IF NOT EXISTS plants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        alias TEXT,
        price REAL,
        delivery_fee REAL,
        purchased_from TEXT,
        purchased_when TEXT,
        received_when TEXT,
        status TEXT DEFAULT 'Alive',
        profile_photo TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add alias column if it doesn't exist (for existing databases)
    db.run(`
      ALTER TABLE plants ADD COLUMN alias TEXT
    `, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding alias column:', err);
      }
    });

    // Add purchase_notes column if it doesn't exist (for existing databases)
    db.run(`
      ALTER TABLE plants ADD COLUMN purchase_notes TEXT
    `, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding purchase_notes column:', err);
      }
    });

    // Plant events table
    db.run(`
      CREATE TABLE IF NOT EXISTS plant_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plant_id INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        event_date TEXT NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
      )
    `);

    // Plant photos table
    db.run(`
      CREATE TABLE IF NOT EXISTS plant_photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plant_id INTEGER NOT NULL,
        photo_path TEXT NOT NULL,
        caption TEXT,
        taken_at TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
      )
    `);

    // Tags table (for purchased_from values)
    db.run(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tag_name TEXT UNIQUE NOT NULL,
        tag_type TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Event types table
    db.run(`
      CREATE TABLE IF NOT EXISTS event_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        emoji TEXT NOT NULL,
        is_custom BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default event types
    const defaultEventTypes = [
      { name: 'Water', emoji: '💧' },
      { name: 'Trim', emoji: '✂️' },
      { name: 'Repot', emoji: '🪴' },
      { name: 'Propagate', emoji: '🌱' },
      { name: 'New Leaf', emoji: '🍃' },
      { name: 'Pest control', emoji: '🐛' },
      { name: 'Root Rot', emoji: '🦠' },
      { name: 'Other', emoji: '📝' }
    ];

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO event_types (name, emoji, is_custom)
      VALUES (?, ?, 0)
    `);

    defaultEventTypes.forEach(eventType => {
      stmt.run(eventType.name, eventType.emoji);
    });

    stmt.finalize();

    // Migration: Remove "General Update" event type and all associated events
    db.run(`DELETE FROM plant_events WHERE event_type = 'General Update'`, (err) => {
      if (err) {
        console.error('Error deleting General Update events:', err);
      } else {
        console.log('Removed General Update events');
      }
    });

    db.run(`DELETE FROM event_types WHERE name = 'General Update'`, (err) => {
      if (err) {
        console.error('Error deleting General Update event type:', err);
      } else {
        console.log('Removed General Update event type');
      }
    });

    console.log('Database initialized successfully');
  });
}

export default db;
