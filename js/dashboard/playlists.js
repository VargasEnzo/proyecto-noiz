import { state } from './state.js';
import { escapeHtml, closeMobileMenu } from './utils.js';
import { createPlaylist, deletePlaylistRequest, addSongToPlaylistRequest, searchTracksRequest } from './api.js';
import { renderSongList } from './songlist.js';

const playlistList = document.getElementById('playlist-list'),
    newPlaylistBtn = document.getElementById('new-playlist-btn'),
    songSideTitle = document.getElementById('song-side-title'),
    searchInput = document.getElementById('search-input'),
    browseChips = document.getElementById('browse-chips'),
    navHome = document.getElementById('nav-home'),
    navExplorar = document.getElementById('nav-explorar'),
    navAdmin = document.getElementById('nav-admin');

const navItems = {
    home: navHome,
    explorar: navExplorar,
    generos: document.getElementById('nav-generos'),
    radio: document.getElementById('nav-radio'),
    artistas: document.getElementById('nav-artistas'),
    albums: document.getElementById('nav-albums'),
    admin: navAdmin,
};

const songSideEl = document.querySelector('.song_side'),
    discoverSideEl = document.querySelector('.discover_side'),
    adminViewEl = document.getElementById('admin-view');

// --- Sidebar: navegación (Inicio/Explorar) ---

export function setActiveNav(view) {
    state.currentView = view;
    Object.entries(navItems).forEach(([key, el]) => el.classList.toggle('active', key === view));
    songSideEl.classList.toggle('hidden', view === 'admin');
    discoverSideEl.classList.toggle('hidden', view === 'admin');
    adminViewEl.classList.toggle('hidden', view !== 'admin');
    closeMobileMenu();
}

function hideBrowseChips() {
    browseChips.classList.add('hidden');
    browseChips.innerHTML = '';
}

export function selectHome() {
    state.activePlaylistId = null;
    setActiveNav('home');
    renderPlaylistsSidebar();
    hideBrowseChips();
    songSideTitle.textContent = 'Inicio';
    renderSongList(state.homeSongs);
}

export function selectExplorar() {
    state.activePlaylistId = null;
    setActiveNav('explorar');
    renderPlaylistsSidebar();
    hideBrowseChips();
    songSideTitle.textContent = 'Explorar';
    renderSongList(state.homeSongs);
    searchInput.focus();
}

navHome.addEventListener('click', selectHome);
navExplorar.addEventListener('click', selectExplorar);

searchInput.addEventListener('input', () => {
    const raw = searchInput.value.trim();
    if (!raw) {
        clearTimeout(state.searchDebounceTimer);
        selectHome();
        return;
    }

    clearTimeout(state.searchDebounceTimer);
    state.searchDebounceTimer = setTimeout(async () => {
        state.activePlaylistId = null;
        setActiveNav('search');
        renderPlaylistsSidebar();
        hideBrowseChips();
        songSideTitle.textContent = `Resultados para "${raw}"`;
        renderSongList(await searchTracksRequest(raw));
    }, 300);
});

// --- Sidebar: playlists ---

export function renderPlaylistsSidebar() {
    playlistList.innerHTML = state.playlists
        .map(
            (p) => `
        <div class="playlist-item ${p.id === state.activePlaylistId ? 'active' : ''}" data-playlist-id="${p.id}">
            <span class="playlist-item-name">${escapeHtml(p.nombre)}</span>
            <i class="bi bi-trash playlist-delete-btn" data-playlist-id="${p.id}" title="Borrar playlist"></i>
        </div>
    `
        )
        .join('');

    playlistList.querySelectorAll('.playlist-item').forEach((item) => {
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('playlist-delete-btn')) return;
            selectPlaylist(Number(item.dataset.playlistId));
        });
    });

    playlistList.querySelectorAll('.playlist-delete-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = Number(btn.dataset.playlistId);
            await deletePlaylistRequest(id);
            state.playlists = state.playlists.filter((p) => p.id !== id);
            if (state.activePlaylistId === id) {
                selectHome();
            } else {
                renderPlaylistsSidebar();
            }
        });
    });
}

export function selectPlaylist(id) {
    state.activePlaylistId = id;
    setActiveNav('playlist');
    renderPlaylistsSidebar();
    hideBrowseChips();
    const playlist = state.playlists.find((p) => p.id === id);
    songSideTitle.textContent = playlist.nombre;
    renderSongList(playlist.songs);
}

// --- Modal "Nueva playlist" ---

const newPlaylistModal = document.createElement('div');
newPlaylistModal.id = 'new-playlist-modal-overlay';
newPlaylistModal.style.display = 'none';
newPlaylistModal.innerHTML = `
    <div class="modal-card">
        <h3>Nueva playlist</h3>
        <input type="text" id="new-playlist-name-input" placeholder="Nombre de la playlist">
        <div class="modal-actions">
            <button type="button" class="modal-cancel-btn" id="new-playlist-cancel-btn">Cancelar</button>
            <button type="button" class="modal-create-btn" id="new-playlist-create-btn">Crear</button>
        </div>
    </div>
`;
document.body.appendChild(newPlaylistModal);

const newPlaylistNameInput = document.getElementById('new-playlist-name-input');

function openNewPlaylistModal() {
    newPlaylistNameInput.value = '';
    newPlaylistModal.style.display = 'flex';
    newPlaylistNameInput.focus();
}

function closeNewPlaylistModal() {
    newPlaylistModal.style.display = 'none';
}

newPlaylistBtn.addEventListener('click', openNewPlaylistModal);
document.getElementById('new-playlist-cancel-btn').addEventListener('click', closeNewPlaylistModal);

document.getElementById('new-playlist-create-btn').addEventListener('click', async () => {
    const nombre = newPlaylistNameInput.value.trim();
    if (!nombre) return;
    const nueva = await createPlaylist(nombre);
    state.playlists.push(nueva);
    renderPlaylistsSidebar();
    closeNewPlaylistModal();
});

newPlaylistNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('new-playlist-create-btn').click();
});

// --- Menú flotante "agregar a playlist" ---

const addMenu = document.createElement('div');
addMenu.id = 'add-to-playlist-menu';
addMenu.classList.add('hidden');
document.body.appendChild(addMenu);

export function openAddMenu(anchorEl, song) {
    addMenu.innerHTML =
        state.playlists.length === 0
            ? '<p class="add-menu-empty">Creá una playlist primero</p>'
            : state.playlists.map((p) => `<button data-playlist-id="${p.id}">${escapeHtml(p.nombre)}</button>`).join('');

    const rect = anchorEl.getBoundingClientRect();
    addMenu.style.top = `${rect.bottom + window.scrollY}px`;
    addMenu.style.left = `${rect.left + window.scrollX}px`;
    addMenu.classList.remove('hidden');

    addMenu.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const playlistId = Number(btn.dataset.playlistId);
            await addSongToPlaylistRequest(playlistId, song);
            state.playlists.find((p) => p.id === playlistId).songs.push(song);
            closeAddMenu();
        });
    });
}

function closeAddMenu() {
    addMenu.classList.add('hidden');
}

document.addEventListener('click', (e) => {
    if (!addMenu.contains(e.target) && !e.target.classList.contains('add-to-playlist-btn')) {
        closeAddMenu();
    }
});
