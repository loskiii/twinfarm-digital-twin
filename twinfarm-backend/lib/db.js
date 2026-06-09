const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'twinfarm.db');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const FARM_STATE_FILE = path.join(DATA_DIR, 'farm-state.json');

let db = null;

function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}

function initDatabase() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            farm_size TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS farm_state (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            state_json TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
    `);

    migrateFromJsonFiles();
    seedUsersIfEmpty();

    return db;
}

function rowToUser(row) {
    if (!row) return null;
    return {
        id: row.id,
        email: row.email,
        passwordHash: row.password_hash,
        firstName: row.first_name,
        lastName: row.last_name,
        farmSize: row.farm_size,
        createdAt: row.created_at
    };
}

function migrateFromJsonFiles() {
    const userCount = getDb().prepare('SELECT COUNT(*) AS count FROM users').get().count;
    if (userCount === 0 && fs.existsSync(USERS_FILE)) {
        try {
            const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
            const insert = getDb().prepare(`
                INSERT OR IGNORE INTO users (id, email, password_hash, first_name, last_name, farm_size, created_at)
                VALUES (@id, @email, @passwordHash, @firstName, @lastName, @farmSize, @createdAt)
            `);
            const migrateUsers = getDb().transaction((entries) => {
                for (const user of entries) {
                    insert.run({
                        id: user.id,
                        email: user.email,
                        passwordHash: user.passwordHash,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        farmSize: user.farmSize || null,
                        createdAt: user.createdAt
                    });
                }
            });
            migrateUsers(users);
            console.log(`Migrated ${users.length} user(s) from users.json`);
        } catch (error) {
            console.warn('Could not migrate users.json:', error.message);
        }
    }

    const sessionCount = getDb().prepare('SELECT COUNT(*) AS count FROM sessions').get().count;
    if (sessionCount === 0 && fs.existsSync(SESSIONS_FILE)) {
        try {
            const sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
            const insert = getDb().prepare(`
                INSERT OR IGNORE INTO sessions (token, user_id, created_at)
                VALUES (@token, @userId, @createdAt)
            `);
            const migrateSessions = getDb().transaction((entries) => {
                for (const [token, session] of Object.entries(entries)) {
                    insert.run({
                        token,
                        userId: session.userId,
                        createdAt: session.createdAt
                    });
                }
            });
            migrateSessions(sessions);
            console.log(`Migrated ${Object.keys(sessions).length} session(s) from sessions.json`);
        } catch (error) {
            console.warn('Could not migrate sessions.json:', error.message);
        }
    }

    const farmStateCount = getDb().prepare('SELECT COUNT(*) AS count FROM farm_state').get().count;
    if (farmStateCount === 0 && fs.existsSync(FARM_STATE_FILE)) {
        try {
            const state = JSON.parse(fs.readFileSync(FARM_STATE_FILE, 'utf8'));
            saveFarmState(state);
            console.log('Migrated farm state from farm-state.json');
        } catch (error) {
            console.warn('Could not migrate farm-state.json:', error.message);
        }
    }
}

function seedUsersIfEmpty() {
    const count = getDb().prepare('SELECT COUNT(*) AS count FROM users').get().count;
    if (count > 0) return;

    const demoHash = bcrypt.hashSync('demo123', 10);
    const farmerHash = bcrypt.hashSync('farmer123', 10);
    const insert = getDb().prepare(`
        INSERT INTO users (id, email, password_hash, first_name, last_name, farm_size, created_at)
        VALUES (@id, @email, @passwordHash, @firstName, @lastName, @farmSize, @createdAt)
    `);

    const seedUsers = getDb().transaction(() => {
        insert.run({
            id: crypto.randomUUID(),
            email: 'demo@twinfarm.com',
            passwordHash: demoHash,
            firstName: 'Demo',
            lastName: 'Farmer',
            farmSize: 'medium',
            createdAt: new Date().toISOString()
        });
        insert.run({
            id: crypto.randomUUID(),
            email: 'farmer@example.com',
            passwordHash: farmerHash,
            firstName: 'John',
            lastName: 'Kamau',
            farmSize: 'small',
            createdAt: new Date().toISOString()
        });
    });

    seedUsers();
    console.log('Seeded demo users in SQLite database');
}

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function findUserByEmail(email) {
    const row = getDb().prepare('SELECT * FROM users WHERE email = ?').get(normalizeEmail(email));
    return rowToUser(row);
}

function findUserById(id) {
    const row = getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
    return rowToUser(row);
}

function emailExists(email) {
    const row = getDb().prepare('SELECT id FROM users WHERE email = ?').get(normalizeEmail(email));
    return Boolean(row);
}

function createUser(user) {
    getDb().prepare(`
        INSERT INTO users (id, email, password_hash, first_name, last_name, farm_size, created_at)
        VALUES (@id, @email, @passwordHash, @firstName, @lastName, @farmSize, @createdAt)
    `).run({
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        farmSize: user.farmSize || null,
        createdAt: user.createdAt
    });
    return user;
}

function createSession(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    const createdAt = new Date().toISOString();
    getDb().prepare(`
        INSERT INTO sessions (token, user_id, created_at)
        VALUES (?, ?, ?)
    `).run(token, userId, createdAt);
    return token;
}

function getSessionUser(token) {
    if (!token) return null;
    const row = getDb().prepare(`
        SELECT u.*
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token = ?
    `).get(token);
    return rowToUser(row);
}

function deleteSession(token) {
    if (!token) return;
    getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

function loadFarmState() {
    const row = getDb().prepare('SELECT state_json FROM farm_state WHERE id = 1').get();
    if (!row) return null;
    return JSON.parse(row.state_json);
}

function saveFarmState(state) {
    const updatedAt = state.updatedAt || new Date().toISOString();
    getDb().prepare(`
        INSERT INTO farm_state (id, state_json, updated_at)
        VALUES (1, @stateJson, @updatedAt)
        ON CONFLICT(id) DO UPDATE SET
            state_json = excluded.state_json,
            updated_at = excluded.updated_at
    `).run({
        stateJson: JSON.stringify(state),
        updatedAt
    });
}

function getDatabaseInfo() {
    const users = getDb().prepare('SELECT COUNT(*) AS count FROM users').get().count;
    const sessions = getDb().prepare('SELECT COUNT(*) AS count FROM sessions').get().count;
    const farmState = getDb().prepare('SELECT updated_at FROM farm_state WHERE id = 1').get();
    return {
        engine: 'sqlite',
        path: DB_PATH,
        users,
        sessions,
        farmStateUpdatedAt: farmState?.updated_at || null
    };
}

module.exports = {
    initDatabase,
    getDb,
    normalizeEmail,
    findUserByEmail,
    findUserById,
    emailExists,
    createUser,
    createSession,
    getSessionUser,
    deleteSession,
    loadFarmState,
    saveFarmState,
    getDatabaseInfo
};
