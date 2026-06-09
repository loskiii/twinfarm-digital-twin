const express = require('express');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const farmRoutes = require('./routes/farm');
const { startFarmSimulator } = require('./lib/farmSimulator');
const {
    initDatabase,
    normalizeEmail,
    findUserByEmail,
    emailExists,
    createUser,
    createSession,
    getSessionUser,
    deleteSession,
    getDatabaseInfo
} = require('./lib/db');

const PORT = process.env.PORT || 3456;
const STATIC_DIR = path.join(__dirname, '..');

const app = express();
app.use(express.json());

function publicUser(user) {
    return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        farmSize: user.farmSize,
        createdAt: user.createdAt
    };
}

function getTokenFromRequest(req) {
    const header = req.headers.authorization || '';
    if (header.startsWith('Bearer ')) {
        return header.slice(7);
    }
    return null;
}

app.get('/api/health', (req, res) => {
    res.redirect(307, '/api/farm/health');
});

app.use('/api/farm', farmRoutes);

app.post('/api/auth/signup', async (req, res) => {
    try {
        const firstName = String(req.body.firstName || '').trim();
        const lastName = String(req.body.lastName || '').trim();
        const email = normalizeEmail(req.body.email);
        const password = String(req.body.password || '');
        const farmSize = String(req.body.farmSize || '').trim();

        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ error: 'All required fields must be filled in.' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }

        if (emailExists(email)) {
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }

        const newUser = {
            id: crypto.randomUUID(),
            email,
            passwordHash: await bcrypt.hash(password, 10),
            firstName,
            lastName,
            farmSize,
            createdAt: new Date().toISOString()
        };

        createUser(newUser);

        const token = createSession(newUser.id);
        res.status(201).json({ token, user: publicUser(newUser) });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Could not create account. Please try again.' });
    }
});

app.post('/api/auth/signin', async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const password = String(req.body.password || '');

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const user = findUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const token = createSession(user.id);
        res.json({ token, user: publicUser(user) });
    } catch (error) {
        console.error('Signin error:', error);
        res.status(500).json({ error: 'Could not sign in. Please try again.' });
    }
});

app.get('/api/auth/me', async (req, res) => {
    try {
        const user = getSessionUser(getTokenFromRequest(req));
        if (!user) {
            return res.status(401).json({ error: 'Not signed in.' });
        }
        res.json({ user: publicUser(user) });
    } catch (error) {
        console.error('Session error:', error);
        res.status(500).json({ error: 'Could not load session.' });
    }
});

app.post('/api/auth/signout', async (req, res) => {
    try {
        deleteSession(getTokenFromRequest(req));
        res.json({ ok: true });
    } catch (error) {
        console.error('Signout error:', error);
        res.status(500).json({ error: 'Could not sign out.' });
    }
});

app.use(express.static(STATIC_DIR));

app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(path.join(STATIC_DIR, 'index.html'));
});

async function bootstrap() {
    initDatabase();
    await startFarmSimulator({ intervalMs: 5000, persistEvery: 12 });

    const dbInfo = getDatabaseInfo();
    app.listen(PORT, () => {
        console.log(`TwinFarm running at http://localhost:${PORT}`);
        console.log(`SQLite database: ${dbInfo.path}`);
        console.log('Live simulated farm data updating every 5 seconds');
    });
}

bootstrap().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
