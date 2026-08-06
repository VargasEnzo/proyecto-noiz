// Estado "online" en memoria, no en la base: es un dato efímero (quién está
// conectado ahora mismo), no algo que tenga sentido persistir entre reinicios
// del server. Cada usuario logueado manda un heartbeat periódico mientras
// tiene el dashboard abierto (ver POST /api/heartbeat).

const lastSeen = new Map();

function markOnline(userId) {
    lastSeen.set(userId, Date.now());
}

function isOnline(userId, thresholdMs = 45000) {
    const ts = lastSeen.get(userId);
    return !!ts && Date.now() - ts < thresholdMs;
}

module.exports = { markOnline, isOnline };
