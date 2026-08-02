const express = require('express');
const requireAuthApi = require('../middleware/requireAuthApi');
const { getPopularTracks, searchTracks } = require('../services/jamendo');

const router = express.Router();

router.use(requireAuthApi);

router.get('/popular', async (req, res) => {
    try {
        const tracks = await getPopularTracks();
        res.json(tracks);
    } catch (err) {
        res.status(502).json({ error: 'No se pudo conectar con Jamendo.' });
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
        res.status(502).json({ error: 'No se pudo conectar con Jamendo.' });
    }
});

module.exports = router;
