process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';
process.env.SESSION_SECRET = 'test-secret';
process.env.ADMIN_EMAIL = 'admin@test.com';
process.env.JAMENDO_CLIENT_ID = 'test-client-id';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../server/index');

test('/api/music/genre requiere sesión activa', async () => {
    const res = await request(app).get('/api/music/genre?tag=pop');
    assert.equal(res.status, 401);
});

test('/api/music/genre exige el parámetro tag', async () => {
    const agent = request.agent(app);
    await agent.post('/api/register').send({
        nombre: 'Test',
        apellido: 'User',
        email: 'genero@test.com',
        password: 'password123',
        repetirPassword: 'password123',
    });

    const res = await agent.get('/api/music/genre');
    assert.equal(res.status, 400);
});