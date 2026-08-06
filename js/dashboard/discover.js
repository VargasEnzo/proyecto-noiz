import { state } from './state.js';
import { escapeHtml, closeMobileMenu } from './utils.js';
import { showArtistSongs } from './browse.js';
import { loadMusic, playMusic } from './player.js';
import { fetchRecommendations } from './api.js';

const topArtistsListEl = document.getElementById('top-artists-list'),
    mobileTopArtistsListEl = document.getElementById('mobile-top-artists-list');

// Fallback mientras no hay recomendaciones personalizadas (usuario nuevo,
// sin playlists ni búsquedas todavía): los 6 artistas más repetidos dentro
// del pool de canciones "populares" que ya se cargó.
function getTopArtistas() {
    const counts = {};
    state.homeSongs.forEach((s) => {
        counts[s.artist] = (counts[s.artist] || 0) + 1;
    });
    return Object.entries(counts)
        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 6);
}

function renderArtistRows(container, artistas) {
    container.innerHTML = artistas
        .map(
            (a) => `
        <div class="top-artist-row" data-nombre="${escapeHtml(a.nombre)}">
            <i class="bi bi-person-circle"></i>
            <div class="top-artist-info">
                <span class="top-artist-name">${escapeHtml(a.nombre)}</span>
                <span class="top-artist-count">${a.cantidad} canción${a.cantidad === 1 ? '' : 'es'}</span>
            </div>
        </div>
    `
        )
        .join('');

    container.querySelectorAll('.top-artist-row').forEach((row) => {
        row.addEventListener('click', () => {
            closeMobileMenu();
            showArtistSongs(row.dataset.nombre);
        });
    });
}

// Recomendaciones personalizadas: son canciones reales (ver
// server/services/recommendations.js), así que cada fila se puede
// reproducir directo en vez de solo navegar a la vista de un artista.
function renderTrackRows(container, tracks) {
    container.innerHTML = tracks
        .map(
            (track, index) => `
        <div class="top-artist-row" data-index="${index}">
            <img src="${escapeHtml(track.cover)}" alt="" class="recommended-track-cover">
            <div class="top-artist-info">
                <span class="top-artist-name">${escapeHtml(track.displayName)}</span>
                <span class="top-artist-count">${escapeHtml(track.artist)}</span>
            </div>
        </div>
    `
        )
        .join('');

    container.querySelectorAll('.top-artist-row').forEach((row) => {
        row.addEventListener('click', () => {
            closeMobileMenu();
            state.playbackQueue = state.recommendedTracks;
            state.musicIndex = Number(row.dataset.index);
            loadMusic(state.playbackQueue[state.musicIndex]);
            playMusic();
        });
    });
}

export function renderDiscoverSide() {
    if (state.recommendedTracks.length > 0) {
        renderTrackRows(topArtistsListEl, state.recommendedTracks);
        renderTrackRows(mobileTopArtistsListEl, state.recommendedTracks);
        return;
    }

    const artistas = getTopArtistas();
    renderArtistRows(topArtistsListEl, artistas);
    renderArtistRows(mobileTopArtistsListEl, artistas);
}

// Se llama una sola vez al arrancar el dashboard (ver main.js), en paralelo
// sin bloquear la carga inicial. Si el usuario no tiene playlists ni
// búsquedas todavía, el server devuelve [] y se sigue mostrando el fallback.
export async function loadRecommendations() {
    const tracks = await fetchRecommendations();
    if (tracks.length > 0) {
        state.recommendedTracks = tracks;
        renderDiscoverSide();
    }
}
