// Panel derecho (discover_side): ya no es "Recomendado" (eso se mudó a
// poblar "Inicio", ver main.js) — ahora es un acompañante de lo que se está
// reproduciendo: portada/título/artista de la canción actual, y debajo hasta
// 3 canciones más del mismo artista. Se actualiza en cada loadMusic() (ver
// player.js).

import { state } from './state.js';
import { escapeHtml, closeMobileMenu } from './utils.js';
import { loadMusic, playMusic, openNowPlaying } from './player.js';
import { fetchArtistTracks } from './api.js';

const nowPlayingCardEl = document.getElementById('discover-now-playing'),
    nowPlayingCoverEl = document.getElementById('discover-now-playing-cover'),
    nowPlayingTitleEl = document.getElementById('discover-now-playing-title'),
    nowPlayingArtistEl = document.getElementById('discover-now-playing-artist'),
    artistTracksListEl = document.getElementById('artist-tracks-list'),
    mobileArtistTracksListEl = document.getElementById('mobile-artist-tracks-list');

nowPlayingCardEl.addEventListener('click', openNowPlaying);

function renderTrackRows(container, tracks) {
    if (tracks.length === 0) {
        container.innerHTML = '<p class="add-menu-empty">No hay más canciones de este artista por ahora.</p>';
        return;
    }

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
            state.playbackQueue = tracks;
            state.musicIndex = Number(row.dataset.index);
            loadMusic(state.playbackQueue[state.musicIndex]);
            playMusic();
        });
    });
}

// Evita que la respuesta de un artista viejo pise a una más nueva si el
// usuario cambia de canción rápido (dos requests en vuelo, gana el último).
let requestId = 0;

export async function renderArtistPanel(song) {
    nowPlayingCoverEl.src = song.cover;
    nowPlayingTitleEl.textContent = song.displayName;
    nowPlayingArtistEl.textContent = song.artist;

    const thisRequest = ++requestId;
    const tracks = await fetchArtistTracks(song.artist, song.id);
    if (thisRequest !== requestId) return;

    renderTrackRows(artistTracksListEl, tracks);
    renderTrackRows(mobileArtistTracksListEl, tracks);
}