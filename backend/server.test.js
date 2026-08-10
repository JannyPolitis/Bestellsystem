process.env.DEMO_MODUS = 'true';
process.env.ADMIN_PASSWORT = 'test-passwort';
process.env.DB_FILE = ':memory:';
process.env.SESSION_SECRET = 'test-secret';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, initDb } = require('./server');

test.before(() => {
  initDb();
});

test('GET /api/pizzas liefert die Speisekarte', async () => {
  const res = await request(app).get('/api/pizzas');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.ok(res.body.length > 0);
  assert.ok(res.body[0].preis > 0);
});

test('Demo-Bestellung ignoriert einen vom Client manipulierten Preis', async () => {
  const pizzasRes = await request(app).get('/api/pizzas');
  const pizza = pizzasRes.body[0];

  const bestellRes = await request(app)
    .post('/api/bestellung/demo')
    .send({ artikel: [{ id: pizza.id, name: 'Manipuliert', preis: 0.01, menge: 2 }] });

  assert.equal(bestellRes.status, 200);
  assert.ok(bestellRes.body.bestellnummer);

  const loginRes = await request(app).post('/api/admin/login').send({ passwort: 'test-passwort' });
  const cookie = loginRes.headers['set-cookie'];

  const liste = await request(app).get('/api/admin/bestellungen').set('Cookie', cookie);
  const gespeichert = liste.body.find(b => b.bestellnummer === bestellRes.body.bestellnummer);

  assert.equal(gespeichert.artikel[0].preis, pizza.preis);
  assert.equal(gespeichert.artikel[0].name, pizza.name);
  assert.equal(gespeichert.gesamtpreis, pizza.preis * 2);
});

test('Demo-Bestellung mit unbekannter Pizza-ID wird abgelehnt', async () => {
  const res = await request(app)
    .post('/api/bestellung/demo')
    .send({ artikel: [{ id: 999999, preis: 1, menge: 1 }] });
  assert.equal(res.status, 400);
});

test('Demo-Bestellung mit ungueltiger Menge wird abgelehnt', async () => {
  const pizzasRes = await request(app).get('/api/pizzas');
  const pizza = pizzasRes.body[0];
  const res = await request(app)
    .post('/api/bestellung/demo')
    .send({ artikel: [{ id: pizza.id, preis: pizza.preis, menge: -1 }] });
  assert.equal(res.status, 400);
});

test('Admin-Login mit falschem Passwort schlaegt fehl', async () => {
  const res = await request(app).post('/api/admin/login').send({ passwort: 'falsch' });
  assert.equal(res.status, 401);
});

test('Admin-Login mit richtigem Passwort funktioniert', async () => {
  const res = await request(app).post('/api/admin/login').send({ passwort: 'test-passwort' });
  assert.equal(res.status, 200);
  assert.ok(res.headers['set-cookie']);
});

test('Admin-Routen ohne Session sind gesperrt', async () => {
  const res = await request(app).get('/api/admin/bestellungen');
  assert.equal(res.status, 401);
});
