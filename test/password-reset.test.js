process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';
process.env.SESSION_SECRET = 'test-secret';
process.env.ADMIN_EMAIL = 'admin@test.com';
process.env.JAMENDO_CLIENT_ID = 'test-client-id';
process.env.GMAIL_USER = 'test@gmail.com';
process.env.GMAIL_APP_PASSWORD = 'test-app-password';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const nodemailer = require('nodemailer');

let lastEmailSent = null;
nodemailer.createTransport = () => ({
    sendMail: async (options) => {
        lastEmailSent = options;
        return { messageId: 'test' };
    },
});

const app = require('../server/index');

test('forgot-password responde ok incluso si el email no existe (no enumerar usuarios)', async () => {
    lastEmailSent = null;
    const res = await request(app).post('/api/forgot-password').send({ email: 'noexiste@test.com' });
    assert.equal(res.status, 200);
    assert.equal(lastEmailSent, null);
});

test('forgot-password envía el email y reset-password cambia la contraseña', async () => {
    await request(app).post('/api/register').send({
        nombre: 'Reset',
        apellido: 'User',
        email: 'reset@test.com',
        password: 'password123',
        repetirPassword: 'password123',
    });

    lastEmailSent = null;
    const forgot = await request(app).post('/api/forgot-password').send({ email: 'reset@test.com' });
    assert.equal(forgot.status, 200);
    assert.ok(lastEmailSent);
    assert.equal(lastEmailSent.to, 'reset@test.com');

    const match = lastEmailSent.html.match(/token=([a-f0-9]+)/);
    assert.ok(match, 'el email debería incluir un link con token');
    const token = match[1];

    const passwordCorta = await request(app)
        .post('/api/reset-password')
        .send({ token, password: '123', repetirPassword: '123' });
    assert.equal(passwordCorta.status, 400);

    const reset = await request(app)
        .post('/api/reset-password')
        .send({ token, password: 'nuevaPassword123', repetirPassword: 'nuevaPassword123' });
    assert.equal(reset.status, 200);

    const loginViejo = await request(app)
        .post('/api/login')
        .send({ email: 'reset@test.com', password: 'password123' });
    assert.equal(loginViejo.status, 401);

    const loginNuevo = await request(app)
        .post('/api/login')
        .send({ email: 'reset@test.com', password: 'nuevaPassword123' });
    assert.equal(loginNuevo.status, 200);

    const reusarToken = await request(app)
        .post('/api/reset-password')
        .send({ token, password: 'otraPassword123', repetirPassword: 'otraPassword123' });
    assert.equal(reusarToken.status, 400);
});

test('reset-password rechaza token inválido', async () => {
    const res = await request(app)
        .post('/api/reset-password')
        .send({ token: 'token-invalido', password: 'password123', repetirPassword: 'password123' });
    assert.equal(res.status, 400);
});