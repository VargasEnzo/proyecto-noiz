const express = require('express');
const db = require('../db');
const requireAuthApi = require('../middleware/requireAuthApi');
const createLimiter = require('../middleware/apiLimiter');

const router = express.Router();

const writeLimiter = createLimiter({ limit: 60 });

router.use(requireAuthApi);

async function getOwnedPlaylist(playlistId, userId) {
    return db.get('SELECT * FROM playlists WHERE id = ? AND user_id = ?', playlistId, userId);
}

function rowToSong(row) {
    return {
        id: row.track_id,
        displayName: row.title,
        artist: row.artist,
        cover: row.cover_url,
        path: row.audio_url,
        duration: row.duration,
    };
}

router.get('/', async (req, res) => {
    const playlists = await db.all('SELECT * FROM playlists WHERE user_id = ?', req.session.userId);

    const conCanciones = await Promise.all(
        playlists.map(async (playlist) => {
            const songs = (await db.all('SELECT * FROM playlist_songs WHERE playlist_id = ?', playlist.id)).map(
                rowToSong
            );
            return { ...playlist, songs };
        })
    );

    res.json(conCanciones);
});

router.post('/', writeLimiter, async (req, res) => {
    const { nombre } = req.body;
    if (!nombre) {
        return res.status(400).json({ error: 'La playlist necesita un nombre.' });
    }

    const info = await db.run('INSERT INTO playlists (user_id, nombre) VALUES (?, ?)', req.session.userId, nombre);

    res.json({ id: Number(info.lastInsertRowid), user_id: req.session.userId, nombre, songs: [] });
});

router.delete('/:id', writeLimiter, async (req, res) => {
    const playlist = await getOwnedPlaylist(req.params.id, req.session.userId);
    if (!playlist) {
        return res.status(404).json({ error: 'Playlist no encontrada.' });
    }

    await db.run('DELETE FROM playlist_songs WHERE playlist_id = ?', playlist.id);
    await db.run('DELETE FROM playlists WHERE id = ?', playlist.id);
    res.json({ ok: true });
});

router.post('/:id/songs', writeLimiter, async (req, res) => {
    const playlist = await getOwnedPlaylist(req.params.id, req.session.userId);
    if (!playlist) {
        return res.status(404).json({ error: 'Playlist no encontrada.' });
    }

    const { id, displayName, artist, cover, path, duration } = req.body;
    if (!id || !displayName || !artist || !cover || !path || !duration) {
        return res.status(400).json({ error: 'Faltan datos de la canción.' });
    }

    await db.run(
        'INSERT INTO playlist_songs (playlist_id, track_id, title, artist, cover_url, audio_url, duration) VALUES (?, ?, ?, ?, ?, ?, ?)',
        playlist.id,
        String(id),
        displayName,
        artist,
        cover,
        path,
        duration
    );

    res.json({ ok: true });
});

router.delete('/:id/songs/:trackId', writeLimiter, async (req, res) => {
    const playlist = await getOwnedPlaylist(req.params.id, req.session.userId);
    if (!playlist) {
        return res.status(404).json({ error: 'Playlist no encontrada.' });
    }

    await db.run(
        'DELETE FROM playlist_songs WHERE playlist_id = ? AND CAST(track_id AS TEXT) = ?',
        playlist.id,
        req.params.trackId
    );
    res.json({ ok: true });
});

module.exports = router;
