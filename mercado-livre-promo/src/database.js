const Database = require('better-sqlite3');
const config = require('./config');

let db;

function getDb() {
  if (!db) {
    db = new Database(config.dbPath);
    db.exec(`
      CREATE TABLE IF NOT EXISTS posted_products (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        price REAL NOT NULL,
        original_price REAL,
        discount_percent INTEGER,
        posted_at INTEGER NOT NULL
      );
    `);
  }
  return db;
}

function hasBeenPosted(productId) {
  const row = getDb().prepare('SELECT id FROM posted_products WHERE id = ?').get(productId);
  return !!row;
}

function markAsPosted(product) {
  getDb().prepare(`
    INSERT OR IGNORE INTO posted_products (id, title, price, original_price, discount_percent, posted_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    product.id,
    product.title,
    product.price,
    product.originalPrice,
    product.discountPercent,
    Date.now()
  );
}

// Remove produtos postados há mais de 7 dias para evitar repost de promoções renovadas
function cleanOldEntries(daysOld = 7) {
  const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;
  const result = getDb().prepare('DELETE FROM posted_products WHERE posted_at < ?').run(cutoff);
  return result.changes;
}

module.exports = { hasBeenPosted, markAsPosted, cleanOldEntries };
