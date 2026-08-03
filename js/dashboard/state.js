export const state = {
    playlists: [],
    homeSongs: [], // canciones populares de Jamendo, catálogo de "Inicio"
    currentView: 'home', // 'home' | 'search' | 'playlist'
    activePlaylistId: null, // null salvo que currentView sea 'playlist'
    displayedSongs: [], // lo que se ve ahora mismo en song_side
    playbackQueue: [], // la lista dentro de la cual se mueven next/prev
    musicIndex: 0,
    currentSong: null,
    isPlaying: false,
    isShuffle: false,
    searchDebounceTimer: null,
    currentUser: null,
};

export const music = new Audio();