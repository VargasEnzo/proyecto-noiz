const YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3';
const MUSIC_CATEGORY_ID = '10';

let popularCache = null;
let popularCacheAt = 0;
const POPULAR_CACHE_MS = 10 * 60 * 1000;

function parseIsoDuration(iso) {
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const hours = Number(match[1] || 0);
    const minutes = Number(match[2] || 0);
    const seconds = Number(match[3] || 0);
    const totalMinutes = hours * 60 + minutes;
    return `${totalMinutes}:${String(seconds).padStart(2, '0')}`;
}

function cleanTitle(title) {
    return title
        .replace(/\(official\s*(music\s*)?video\)/gi, '')
        .replace(/\[official\s*(music\s*)?video\]/gi, '')
        .replace(/\(official\s*audio\)/gi, '')
        .replace(/\(lyrics?\s*video\)/gi, '')
        .replace(/\(lyrics?\)/gi, '')
        .trim();
}

function cleanArtist(channelTitle) {
    return channelTitle.replace(/\s*-\s*Topic$/i, '').trim();
}

async function fetchJson(path, params) {
    const url = new URL(`${YOUTUBE_BASE_URL}/${path}`);
    url.searchParams.set('key', process.env.YOUTUBE_API_KEY);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

    const response = await fetch(url);
    const body = await response.json();
    if (!response.ok) {
        throw new Error(body.error?.message || 'Error de YouTube');
    }
    return body;
}

async function videosById(ids) {
    if (ids.length === 0) return [];
    const body = await fetchJson('videos', {
        part: 'snippet,contentDetails',
        id: ids.join(','),
    });
    return body.items.map((item) => ({
        id: item.id,
        displayName: cleanTitle(item.snippet.title),
        artist: cleanArtist(item.snippet.channelTitle),
        cover: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
        path: `https://www.youtube.com/watch?v=${item.id}`,
        duration: parseIsoDuration(item.contentDetails.duration),
    }));
}

async function getPopularTracks() {
    if (popularCache && Date.now() - popularCacheAt < POPULAR_CACHE_MS) {
        return popularCache;
    }

    const body = await fetchJson('videos', {
        part: 'snippet,contentDetails',
        chart: 'mostPopular',
        videoCategoryId: MUSIC_CATEGORY_ID,
        regionCode: 'AR',
        maxResults: 20,
    });

    const tracks = body.items.map((item) => ({
        id: item.id,
        displayName: cleanTitle(item.snippet.title),
        artist: cleanArtist(item.snippet.channelTitle),
        cover: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
        path: `https://www.youtube.com/watch?v=${item.id}`,
        duration: parseIsoDuration(item.contentDetails.duration),
    }));

    popularCache = tracks;
    popularCacheAt = Date.now();
    return tracks;
}

async function searchTracks(query) {
    const searchBody = await fetchJson('search', {
        part: 'snippet',
        type: 'video',
        videoCategoryId: MUSIC_CATEGORY_ID,
        q: query,
        maxResults: 20,
    });

    const ids = searchBody.items.map((item) => item.id.videoId);
    return videosById(ids);
}

function getTracksByTag(tag) {
    return searchTracks(`${tag} official music`);
}

module.exports = { getPopularTracks, searchTracks, getTracksByTag };
