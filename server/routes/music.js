const express = require('express');
const requireAuthApi = require('../middleware/requireAuthApi');
const { getPopularTracks, searchTracks, getTracksByTag } = require('../services/youtube');

const router = express.Router();

router.use(requireAuthApi);

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

    try {
        const tracks = await searchTracks(query);
        res.json(tracks);
    } catch (err) {
        console.error(err);
        res.status(502).json({ error: 'No se pudo conectar con YouTube.' });
    }
});

module.exports = router;
