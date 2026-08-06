// Cliente chico para la API de Last.fm (gratis, sin las restricciones que
// Spotify le puso a los endpoints de "artistas parecidos"/audio-features
// para apps nuevas desde nov. 2024 — ver docs/03-backend.md).

const LASTFM_BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

async function fetchJson(params) {
    const url = new URL(LASTFM_BASE_URL);
    url.searchParams.set('api_key', process.env.LASTFM_API_KEY);
    url.searchParams.set('format', 'json');
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

    const response = await fetch(url);
    const body = await response.json();
    if (!response.ok || body.error) {
        throw new Error(body.message || 'Error de Last.fm');
    }
    return body;
}

// Devuelve nombres de artistas parecidos a uno dado, ordenados por
// similitud (segun el "match" que calcula Last.fm en base a tags/escuchas
// cruzadas de sus usuarios).
async function getSimilarArtists(artistName, limit = 5) {
    try {
        const body = await fetchJson({ method: 'artist.getsimilar', artist: artistName, limit });
        const similar = body.similarartists?.artist || [];
        return similar.map((a) => a.name);
    } catch (err) {
        console.error(`No se pudo obtener artistas parecidos a "${artistName}":`, err.message);
        return [];
    }
}

// Una busqueda reciente puede no ser el nombre exacto de un artista
// ("reggaeton 2024", el titulo de una cancion, etc). Esto intenta resolverla
// al artista mas parecido que Last.fm conozca; null si no encuentra nada.
async function resolveArtistFromQuery(query) {
    try {
        const body = await fetchJson({ method: 'artist.search', artist: query, limit: 1 });
        const match = body.results?.artistmatches?.artist?.[0];
        return match ? match.name : null;
    } catch (err) {
        console.error(`No se pudo resolver "${query}" a un artista:`, err.message);
        return null;
    }
}

module.exports = { getSimilarArtists, resolveArtistFromQuery };
