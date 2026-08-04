const db = require('../db');

const PACIFIC_TZ = 'America/Los_Angeles';

function todayPacific() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: PACIFIC_TZ }).format(new Date());
}

async function recordYoutubeUsage(units) {
    if (!units) return;
    await db.run(
        `INSERT INTO youtube_quota_usage (date, units_used) VALUES (?, ?)
         ON CONFLICT(date) DO UPDATE SET units_used = units_used + excluded.units_used`,
        todayPacific(),
        units
    );
}

async function getYoutubeUsageToday() {
    const date = todayPacific();
    const row = await db.get('SELECT units_used FROM youtube_quota_usage WHERE date = ?', date);
    return { date, unitsUsed: row?.units_used || 0 };
}

module.exports = { recordYoutubeUsage, getYoutubeUsageToday };