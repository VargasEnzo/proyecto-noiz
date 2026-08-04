const rateLimit = require('express-rate-limit');

function createLimiter(options) {
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Demasiadas solicitudes. Probá de nuevo en unos minutos.' },
        ...options,
    });

    return (req, res, next) => {
        if (process.env.NODE_ENV === 'test') return next();
        return limiter(req, res, next);
    };
}

module.exports = createLimiter;