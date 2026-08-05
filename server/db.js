const { createClient } = require('@libsql/client');
const path = require('node:path');

function resolveUrl() {
    if (process.env.DB_PATH === ':memory:') return ':memory:';
    if (process.env.TURSO_DATABASE_URL) return process.env.TURSO_DATABASE_URL;
    return `file:${process.env.DB_PATH || path.join(__dirname, 'database.sqlite')}`;
}

const db = createClient({
    url: resolveUrl(),
    authToken: process.env.TURSO_AUTH_TOKEN,
});

db.get = async (sql, ...args) => {
    const result = await db.execute({ sql, args });
    return result.rows[0] ? { ...result.rows[0] } : undefined;
};

db.all = async (sql, ...args) => {
    const result = await db.execute({ sql, args });
    return result.rows.map((row) => ({ ...row }));
};

db.run = async (sql, ...args) => db.execute({ sql, args });

db.ready = (async () => {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            apellido TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            avatar TEXT,
            plan TEXT NOT NULL DEFAULT 'Gratis',
            email_verified INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    `);

    // Migracion: las cuentas creadas antes de este cambio no tienen esta columna.
    // Se agrega con DEFAULT 1 para no bloquear cuentas que ya funcionaban.
    const columns = await db.execute(`PRAGMA table_info(users)`);
    const yaTieneEmailVerified = columns.rows.some((c) => c.name === 'email_verified');
    if (!yaTieneEmailVerified) {
        await db.execute(`ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 1`);
    }

    await db.execute(`
        CREATE TABLE IF NOT EXISTS email_verifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token_hash TEXT NOT NULL UNIQUE,
            expires_at TEXT NOT NULL,
            used INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS password_resets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token_hash TEXT NOT NULL UNIQUE,
            expires_at TEXT NOT NULL,
            used INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS playlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            nombre TEXT NOT NULL
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS playlist_songs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            playlist_id INTEGER NOT NULL,
            track_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            artist TEXT NOT NULL,
            cover_url TEXT NOT NULL,
            audio_url TEXT NOT NULL,
            duration TEXT NOT NULL
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS youtube_quota_usage (
            date TEXT PRIMARY KEY,
            units_used INTEGER NOT NULL DEFAULT 0
        )
    `);
})();

module.exports = db;
