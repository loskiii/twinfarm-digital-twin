const express = require('express');
const { getFarmSimulator } = require('../lib/farmSimulator');
const { getDatabaseInfo } = require('../lib/db');

const router = express.Router();

router.get('/health', (req, res) => {
    const simulator = getFarmSimulator();
    res.json({
        status: 'ok',
        service: 'TwinFarm API',
        database: getDatabaseInfo(),
        simulator: simulator ? 'running' : 'stopped',
        uptimeSeconds: Math.floor(process.uptime()),
        lastUpdate: simulator?.state?.updatedAt || null
    });
});

router.get('/state', (req, res) => {
    const simulator = getFarmSimulator();
    if (!simulator) {
        return res.status(503).json({ error: 'Farm simulator is not running.' });
    }
    res.json(simulator.getPublicState());
});

router.get('/fields', (req, res) => {
    const simulator = getFarmSimulator();
    if (!simulator) {
        return res.status(503).json({ error: 'Farm simulator is not running.' });
    }
    const state = simulator.getPublicState();
    res.json({
        updatedAt: state.updatedAt,
        fields: state.fields
    });
});

module.exports = router;
