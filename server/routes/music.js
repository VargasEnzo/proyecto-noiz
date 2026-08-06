const express = require('express');
const db = require('../db');
const requireAuthApi = require('../middleware/requireAuthApi');
const createLimiter = require('../middleware/apiLimiter');
const { getPopularTracks, searchTracks, getTracksByTag } = require('../services/youtube');
const { getRecommendations } = require('../services/recommendations');

const router = express.Router();

const SEARCH_HISTORY_LIMIT = 30;

async function logSearch(userId, query) {
    await db.run('INSERT INTO search_history (user_id, query) VALUES (?, ?)', userId, query);
    await db.run(
        `DELETE FROM search_history WHERE user_id = ? AND id NOT IN (
            SELECT id FROM search_history WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?
        )`,
        userId,
        userId,
        SEARCH_HISTORY_LIMIT
    );
}

const musicLimiter = createLimiter({ limit: 60 });

router.use(requireAuthApi);
router.use(musicLimiter);

router.get('/popular', async (req, res) => {
    try {
        const tracks = await getPopularTracks();
        res.json(tracks);
    } catch (err) {
        console.error(err);
        res.status(502).json({ error: 'No se pudo conectar con YouTube.' });
    }
});

router.get('/genre', async (req, res) => {
    const tag = req.query.tag;
    if (!tag) {
        return res.status(400).json({ error: 'Falta el género.' });
    }

    try {
        const tracks = await getTracksByTag(tag);
        res.json(tracks);
    } catch (err) {
        console.error(err);
        res.status(502).json({ error: 'No se pudo conectar con YouTube.' });
    }
});

router.get('/search', async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ error: 'Falta el parámetro de búsqueda.' });
    }

    logSearch(req.session.userId, query).catch((err) => console.error('No se pudo guardar la búsqueda', err));

    try {
        const tracks = await searchTracks(query);
        res.json(tracks);
    } catch (err) {
        console.error(err);
        res.status(502).json({ error: 'No se pudo conectar con YouTube.' });
    }
});

router.get('/recommendations', async (req, res) => {
    try {
        const tracks = await getRecommendations(req.session.userId);
        res.json(tracks);
    } catch (err) {
        console.error(err);
        res.status(502).json({ error: 'No se pudieron generar recomendaciones.' });
    }
});

module.exports = router;
