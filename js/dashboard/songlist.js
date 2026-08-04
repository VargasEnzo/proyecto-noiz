import { state } from './state.js';
import { escapeHtml } from './utils.js';
import { removeSongFromPlaylistRequest } from './api.js';
import { playMusic, loadMusic } from './player.js';
import { openAddMenu } from './playlists.js';

const songList = document.getElementById('song-list');

export function renderSongList(list) {
    state.displayedSongs = list;

    songList.innerHTML = list
        .map((song, index) => {
            const actionIcon = state.activePlaylistId
                ? `<i class="bi bi-dash-circle-fill remove-from-playlist-btn" title="Quitar de la playlist"></i>`
                : `<i class="bi bi-plus-circle-fill add-to-playlist-btn" title="Agregar a playlist"></i>`;

            return `
        <li class="song-item" data-index="${index}" data-song-id="${song.id}">
            <span class="song-item-index">${index + 1}</span>
            <img src="${escapeHtml(song.cover)}" alt="${escapeHtml(song.displayName)}">
            <div class="song-item-info">
                <span class="song-item-title">${escapeHtml(song.displayName)}</span>
                <span class="song-item-artist">${escapeHtml(song.artist)}</span>
            </div>
            <span class="song-item-duration">${song.duration}</span>
            ${actionIcon}
        </li>
    `;
        })
        .join('');

    songList.querySelectorAll('.song-item').forEach((item) => {
        const song = list[Number(item.dataset.index)];

        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-to-playlist-btn')) {
                e.stopPropagation();
                openAddMenu(e.target, song);
                return;
            }
            if (e.target.classList.contains('remove-from-playlist-btn')) {
                e.stopPropagation();
                removeFromCurrentPlaylist(song.id);
                return;
            }

            state.playbackQueue = state.displayedSongs;
            state.musicIndex = Number(item.dataset.index);
            loadMusic(state.playbackQueue[state.musicIndex]);
            playMusic();
        });
    });

    highlightActiveSong();
}

export async function removeFromCurrentPlaylist(songId) {
    await removeSongFromPlaylistRequest(state.activePlaylistId, songId);
    const playlist = state.playlists.find((p) => p.id === state.activePlaylistId);
    playlist.songs = playlist.songs.filter((s) => s.id !== songId);
    renderSongList(playlist.songs);
}

export function highlightActiveSong() {
    songList.querySelectorAll('.song-item').forEach((item) => {
        item.classList.toggle(
            'active',
            !!state.currentSong && item.dataset.songId === String(state.currentSong.id)
        );
    });
}