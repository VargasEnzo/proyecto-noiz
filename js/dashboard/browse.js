import { state } from './state.js';
import { escapeHtml } from './utils.js';
import { tracksByGenreRequest } from './api.js';
import { renderSongList } from './songlist.js';
import { setActiveNav, renderPlaylistsSidebar } from './playlists.js';
import { playMusic, loadMusic, setShuffle } from './player.js';

const songSideTitle = document.getElementById('song-side-title'),
    browseChips = document.getElementById('browse-chips'),
    navGeneros = document.getElementById('nav-generos'),
    navRadio = document.getElementById('nav-radio'),
    navArtistas = document.getElementById('nav-artistas'),
    navAlbums = document.getElementById('nav-albums');

const GENEROS = [
    { tag: 'pop', label: 'Pop' },
    { tag: 'rock', label: 'Rock' },
    { tag: 'electronic', label: 'Electrónica' },
    { tag: 'hiphop', label: 'Hip-Hop' },
    { tag: 'jazz', label: 'Jazz' },
    { tag: 'classical', label: 'Clásica' },
    { tag: 'reggae', label: 'Reggae' },
    { tag: 'folk', label: 'Folk' },
    { tag: 'ambient', label: 'Ambient' },
];

function showChips(items, onSelect) {
    if (items.length === 0) {
        browseChips.innerHTML = '<p class="add-menu-empty">No hay datos disponibles todavía.</p>';
        browseChips.classList.remove('hidden');
        return;
    }

    browseChips.innerHTML = items
        .map((item, index) => `<button type="button" class="browse-chip" data-index="${index}">${escapeHtml(item.label)}</button>`)
        .join('');
    browseChips.classList.remove('hidden');

    browseChips.querySelectorAll('.browse-chip').forEach((btn) => {
        btn.addEventListener('click', () => {
            browseChips.querySelectorAll('.browse-chip').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            onSelect(items[Number(btn.dataset.index)]);
        });
    });
}

function resetBrowseView(view, titulo) {
    state.activePlaylistId = null;
    setActiveNav(view);
    renderPlaylistsSidebar();
    songSideTitle.textContent = titulo;
    renderSongList([]);
}

function selectGeneros() {
    resetBrowseView('generos', 'Géneros');
    showChips(GENEROS, async (genero) => {
        songSideTitle.textContent = `Género: ${genero.label}`;
        renderSongList(await tracksByGenreRequest(genero.tag));
    });
}

function selectArtistas() {
    resetBrowseView('artistas', 'Artistas');
    const artistas = [...new Set(state.homeSongs.map((s) => s.artist))].map((nombre) => ({
        label: nombre,
        nombre,
    }));
    showChips(artistas, (artista) => {
        songSideTitle.textContent = `Artista: ${artista.nombre}`;
        renderSongList(state.homeSongs.filter((s) => s.artist === artista.nombre));
    });
}

function selectAlbums() {
    resetBrowseView('albums', 'Albums');
    const albums = [...new Set(state.homeSongs.map((s) => s.album).filter(Boolean))].map((nombre) => ({
        label: nombre,
        nombre,
    }));
    showChips(albums, (album) => {
        songSideTitle.textContent = `Álbum: ${album.nombre}`;
        renderSongList(state.homeSongs.filter((s) => s.album === album.nombre));
    });
}

function selectRadio() {
    resetBrowseView('radio', 'Radio');
    browseChips.classList.add('hidden');
    browseChips.innerHTML = '';

    if (state.homeSongs.length === 0) return;

    const mezcladas = [...state.homeSongs].sort(() => Math.random() - 0.5);
    setShuffle(true);
    renderSongList(mezcladas);
    state.playbackQueue = mezcladas;
    state.musicIndex = 0;
    loadMusic(state.playbackQueue[0]);
    playMusic();
}

navGeneros.addEventListener('click', selectGeneros);
navRadio.addEventListener('click', selectRadio);
navArtistas.addEventListener('click', selectArtistas);
navAlbums.addEventListener('click', selectAlbums);