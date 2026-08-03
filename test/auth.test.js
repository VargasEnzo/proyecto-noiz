process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';
process.env.SESSION_SECRET = 'test-secret';
process.env.ADMIN_EMAIL = 'admin@test.com';
process.env.JAMENDO_CLIENT_ID = 'test-client-id';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../server/index');

test('registro rechaza campos incompletos', async () => {
    const res = await request(app).post('/api/register').send({ nombre: 'Ana' });
    assert.equal(res.status, 400);
});

test('registro rechaza email inválido', async () => {
    const res = await request(app).post('/api/register').send({
        nombre: 'Ana',
        apellido: 'Gomez',
        email: 'no-es-un-email',
        password: 'password123',
        repetirPassword: 'password123',
    });
    assert.equal(res.status, 400);
});

test('registro rechaza contraseña corta', async () => {
    const res = await request(app).post('/api/register').send({
        nombre: 'Ana',
        apellido: 'Gomez',
        email: 'ana@test.com',
        password: '123',
        repetirPassword: '123',
    });
    assert.equal(res.status, 400);
});

test('registro exitoso crea sesión y permite ver /api/me', async () => {
    const agent = request.agent(app);
    const res = await agent.post('/api/register').send({
        nombre: 'Ana',
        apellido: 'Gomez',
        email: 'ana@test.com',
        password: 'password123',
        repetirPassword: 'password123',
    });
    assert.equal(res.status, 200);

    const me = await agent.get('/api/me');
    assert.equal(me.status, 200);
    assert.equal(me.body.email, 'ana@test.com');
    assert.equal(me.body.isAdmin, false);
});

test('login falla con contraseña incorrecta', async () => {
    const agent = request.agent(app);
    await agent.post('/api/register').send({
        nombre: 'Beto',
        apellido: 'Lopez',
        email: 'beto@test.com',
        password: 'password123',
        repetirPassword: 'password123',
    });
    await agent.post('/api/logout');

    const res = await agent.post('/api/login').send({ email: 'beto@test.com', password: 'incorrecta' });
    assert.equal(res.status, 401);
});

test('login exitoso reestablece la sesión', async () => {
    const agent = request.agent(app);
    await agent.post('/api/register').send({
        nombre: 'Caro',
        apellido: 'Diaz',
        email: 'caro@test.com',
        password: 'password123',
        repetirPassword: 'password123',
    });
    await agent.post('/api/logout');

    const res = await agent.post('/api/login').send({ email: 'caro@test.com', password: 'password123' });
    assert.equal(res.status, 200);

    const me = await agent.get('/api/me');
    assert.equal(me.status, 200);
    assert.equal(me.body.email, 'caro@test.com');
});

test('/api/me sin sesión devuelve 401', async () => {
    const res = await request(app).get('/api/me');
    assert.equal(res.status, 401);
});