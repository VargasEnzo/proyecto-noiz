const db = require('../db');

async function requireAdmin(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'No hay sesión activa.' });
    }

    const user = await db.get('SELECT email FROM users WHERE id = ?', req.session.userId);
    if (!user || user.email !== process.env.ADMIN_EMAIL) {
        return res.status(403).json({ error: 'No tenés permisos de administrador.' });
    }

    next();
}

module.exports = requireAdmin;
