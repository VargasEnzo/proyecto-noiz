// Arma la seccion "Recomendado" del dashboard a partir de lo que cada
// usuario ya escuchó/buscó: en vez de un pool genérico de canciones
// populares, mira los artistas de sus playlists y de sus búsquedas
// recientes, y le trae artistas parecidos (Last.fm) con una canción real
// de cada uno (YouTube). Ver docs/03-backend.md para el detalle completo.

const db = require('../db');
const { getSimilarArtists, resolveArtistFromQuery } = require('./lastfm');
const { searchTracks } = require('./youtube');

const MAX_SEED_ARTISTS = 5;
const MAX_RECENT_SEARCHES = 10;
const MAX_RECOMMENDATIONS = 6;
const CACHE_MS = 30 * 60 * 1000;

const cache = new Map(); // userId -> { tracks, cachedAt }

function dedupeCaseInsensitive(names) {
    const seen = new Set();
    const result = [];
    for (const name of names) {
        const key = name.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            result.push(name);
        }
    }
    return result;
}

async function getSeedArtists(userId) {
    const playlistArtists = await db.all(
        `SELECT DISTINCT ps.artist
         FROM playlist_songs ps
         JOIN playlists p ON p.id = ps.playlist_id
         WHERE p.user_id = ?
         ORDER BY ps.id DESC
         LIMIT 20`,
        userId
    );

    const recentSearches = await db.all(
        'SELECT query FROM search_history WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?',
        userId,
        MAX_RECENT_SEARCHES
    );

    const resueltos = await Promise.all(recentSearches.map((s) => resolveArtistFromQuery(s.query)));

    const seeds = dedupeCaseInsensitive([
        ...playlistArtists.map((p) => p.artist),
        ...resueltos.filter(Boolean),
    ]);

    return seeds.slice(0, MAX_SEED_ARTISTS);
}

async function getSimilarCandidates(seedArtists) {
    const porSemilla = await Promise.all(seedArtists.map((artist) => getSimilarArtists(artist)));

    const conteo = new Map(); // nombre (tal cual lo devuelve Last.fm) -> cantidad de semillas que lo sugirieron
    const seedKeys = new Set(seedArtists.map((s) => s.toLowerCase()));

    porSemilla.forEach((similares) => {
        const yaContadosEnEstaSemilla = new Set();
        similares.forEach((nombre) => {
            const key = nombre.toLowerCase();
            if (seedKeys.has(key) || yaContadosEnEstaSemilla.has(key)) return;
            yaContadosEnEstaSemilla.add(key);
            conteo.set(nombre, (conteo.get(nombre) || 0) + 1);
        });
    });

    return [...conteo.entries()].sort((a, b) => b[1] - a[1]).map(([nombre]) => nombre);
}

async function buildRecommendations(userId) {
    const seedArtists = await getSeedArtists(userId);
    if (seedArtists.length === 0) return [];

    const candidatos = (await getSimilarCandidates(seedArtists)).slice(0, MAX_RECOMMENDATIONS);
    if (candidatos.length === 0) return [];

    const resultados = await Promise.all(
        candidatos.map(async (artista) => {
            try {
                const tracks = await searchTracks(artista);
                return tracks[0] || null;
            } catch (err) {
                console.error(`No se pudo buscar una canción de "${artista}" en YouTube:`, err.message);
                return null;
            }
        })
    );

    return resultados.filter(Boolean);
}

async function getRecommendations(userId) {
    const cached = cache.get(userId);
    if (cached && Date.now() - cached.cachedAt < CACHE_MS) {
        return cached.tracks;
    }

    const tracks = await buildRecommendations(userId);
    cache.set(userId, { tracks, cachedAt: Date.now() });
    return tracks;
}

module.exports = { getRecommendations };
