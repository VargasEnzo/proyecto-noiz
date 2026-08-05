import { state } from './state.js';
import { escapeHtml } from './utils.js';
import { showArtistSongs } from './browse.js';

const topArtistsListEl = document.getElementById('top-artists-list'),
    mobileTopArtistsListEl = document.getElementById('mobile-top-artists-list');

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

function renderInto(container, artistas) {
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
        row.addEventListener('click', () => showArtistSongs(row.dataset.nombre));
    });
}

export function renderDiscoverSide() {
    const artistas = getTopArtistas();
    renderInto(topArtistsListEl, artistas);
    renderInto(mobileTopArtistsListEl, artistas);
}
