import { state } from './state.js';
import { escapeHtml } from './utils.js';
import { playMusic, loadMusic } from './player.js';

const recommendedCardEl = document.getElementById('recommended-card'),
    topArtistsListEl = document.getElementById('top-artists-list');

function getRecomendado() {
    if (state.homeSongs.length === 0) return null;
    if (!state.currentSong) return state.homeSongs[0];
    const otras = state.homeSongs.filter((s) => s.id !== state.currentSong.id);
    return otras.length > 0 ? otras[Math.floor(Math.random() * otras.length)] : null;
}

function getTopArtistas() {
    const counts = {};
    state.homeSongs.forEach((s) => {
        counts[s.artist] = (counts[s.artist] || 0) + 1;
    });
    return Object.entries(counts)
        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5);
}

export function renderDiscoverSide() {
    const recomendado = getRecomendado();

    recommendedCardEl.innerHTML = recomendado
        ? `
        <div class="recommended-card">
            <img src="${escapeHtml(recomendado.cover)}" alt="${escapeHtml(recomendado.displayName)}">
            <div class="recommended-card-info">
                <span class="recommended-card-title">${escapeHtml(recomendado.displayName)}</span>
                <span class="recommended-card-artist">${escapeHtml(recomendado.artist)}</span>
            </div>
            <i class="bi bi-play-circle-fill"></i>
        </div>
    `
        : '';

    if (recomendado) {
        recommendedCardEl.querySelector('.recommended-card').addEventListener('click', () => {
            state.playbackQueue = state.homeSongs;
            state.musicIndex = state.homeSongs.findIndex((s) => s.id === recomendado.id);
            loadMusic(state.playbackQueue[state.musicIndex]);
            playMusic();
        });
    }

    topArtistsListEl.innerHTML = getTopArtistas()
        .map(
            (a) => `
        <div class="top-artist-row">
            <i class="bi bi-person-circle"></i>
            <div class="top-artist-info">
                <span class="top-artist-name">${escapeHtml(a.nombre)}</span>
                <span class="top-artist-count">${a.cantidad} canción${a.cantidad === 1 ? '' : 'es'}</span>
            </div>
        </div>
    `
        )
        .join('');
}