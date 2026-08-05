const request = require('supertest');

let lastEmail = null;
const originalFetch = global.fetch;
global.fetch = async (url, options) => {
    if (String(url).startsWith('https://api.sendgrid.com')) {
        const body = JSON.parse(options.body);
        lastEmail = {
            to: body.personalizations[0].to[0].email,
            subject: body.subject,
            html: body.content[0].value,
        };
        return { ok: true, text: async () => '' };
    }
    return originalFetch(url, options);
};

function getLastEmail() {
    return lastEmail;
}

function extractToken(html) {
    const match = html.match(/token=([a-f0-9]+)/);
    return match ? match[1] : null;
}

async function registerAndVerify(app, { nombre = 'Test', apellido = 'User', email, password = 'password123' }) {
    lastEmail = null;
    await request(app).post('/api/register').send({ nombre, apellido, email, password, repetirPassword: password });
    const token = extractToken(lastEmail.html);
    await request(app).get(`/api/verify-email?token=${token}`);
}

async function registerVerifyAndLogin(app, { email, password = 'password123', ...resto }) {
    await registerAndVerify(app, { email, password, ...resto });
    const agent = request.agent(app);
    await agent.post('/api/login').send({ email, password });
    return agent;
}

module.exports = { getLastEmail, extractToken, registerAndVerify, registerVerifyAndLogin };
