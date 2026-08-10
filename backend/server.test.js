const os = require('os');
const path = require('path');
const fs = require('fs');

const UPLOADS_TEST_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'pizza-uploads-test-'));

process.env.ADMIN_PASSWORT = 'test-passwort';
process.env.DB_FILE = ':memory:';
process.env.SESSION_SECRET = 'test-secret';
process.env.UPLOADS_DIR = UPLOADS_TEST_DIR;

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, initDb } = require('./server');

async function alsAdminEingeloggt() {
  const res = await request(app).post('/api/admin/login').send({ passwort: 'test-passwort' });
  return res.headers['set-cookie'];
}

test.before(() => {
  initDb();
});

test.after(() => {
  fs.rmSync(UPLOADS_TEST_DIR, { recursive: true, force: true });
});

test('GET /api/pizzas liefert die Speisekarte', async () => {
  const res = await request(app).get('/api/pizzas');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.ok(res.body.length > 0);
  assert.ok(res.body[0].preis > 0);
});

test('Bestellung ignoriert einen vom Client manipulierten Preis', async () => {
  const pizzasRes = await request(app).get('/api/pizzas');
  const pizza = pizzasRes.body[0];

  const bestellRes = await request(app)
    .post('/api/bestellung')
    .send({ artikel: [{ id: pizza.id, name: 'Manipuliert', preis: 0.01, menge: 2 }] });

  assert.equal(bestellRes.status, 200);
  assert.ok(bestellRes.body.bestellnummer);
  assert.equal(bestellRes.body.gesamtpreis, pizza.preis * 2);

  const loginRes = await request(app).post('/api/admin/login').send({ passwort: 'test-passwort' });
  const cookie = loginRes.headers['set-cookie'];

  const liste = await request(app).get('/api/admin/bestellungen').set('Cookie', cookie);
  const gespeichert = liste.body.find(b => b.bestellnummer === bestellRes.body.bestellnummer);

  assert.equal(gespeichert.artikel[0].preis, pizza.preis);
  assert.equal(gespeichert.artikel[0].name, pizza.name);
  assert.equal(gespeichert.gesamtpreis, pizza.preis * 2);
  assert.equal(gespeichert.status, 'neu');
});

test('Bestellung mit unbekannter Pizza-ID wird abgelehnt', async () => {
  const res = await request(app)
    .post('/api/bestellung')
    .send({ artikel: [{ id: 999999, preis: 1, menge: 1 }] });
  assert.equal(res.status, 400);
});

test('Bestellung mit ungueltiger Menge wird abgelehnt', async () => {
  const pizzasRes = await request(app).get('/api/pizzas');
  const pizza = pizzasRes.body[0];
  const res = await request(app)
    .post('/api/bestellung')
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

test('Status-Update lehnt ungueltige Werte ab', async () => {
  const loginRes = await request(app).post('/api/admin/login').send({ passwort: 'test-passwort' });
  const cookie = loginRes.headers['set-cookie'];

  const liste = await request(app).get('/api/admin/bestellungen').set('Cookie', cookie);
  const bestellung = liste.body[0];

  const res = await request(app)
    .put(`/api/admin/bestellungen/${bestellung.id}/status`)
    .set('Cookie', cookie)
    .send({ status: 'bezahlt' });
  assert.equal(res.status, 400);
});

test('GET /api/admin/pizzas ohne Session ist gesperrt', async () => {
  const res = await request(app).get('/api/admin/pizzas');
  assert.equal(res.status, 401);
});

test('Admin kann eine neue Pizza anlegen', async () => {
  const cookie = await alsAdminEingeloggt();
  const res = await request(app)
    .post('/api/admin/pizzas')
    .set('Cookie', cookie)
    .field('name', 'Testpizza')
    .field('beschreibung', 'Testbelag')
    .field('preis', '7.77')
    .field('verfuegbar', 'true');

  assert.equal(res.status, 201);
  assert.equal(res.body.name, 'Testpizza');
  assert.equal(res.body.preis, 7.77);
  assert.equal(res.body.bild_url, null);

  const oeffentlich = await request(app).get('/api/pizzas');
  assert.ok(oeffentlich.body.some(p => p.id === res.body.id));
});

test('Neue Pizza ohne Namen wird abgelehnt', async () => {
  const cookie = await alsAdminEingeloggt();
  const res = await request(app)
    .post('/api/admin/pizzas')
    .set('Cookie', cookie)
    .field('name', '')
    .field('preis', '5');
  assert.equal(res.status, 400);
});

test('Pizza mit Bild-Upload anlegen speichert die Datei unter /uploads', async () => {
  const cookie = await alsAdminEingeloggt();
  const bildPuffer = Buffer.from('89504e470d0a1a0a', 'hex'); // PNG-Signatur reicht fuer den Filter-Test

  const res = await request(app)
    .post('/api/admin/pizzas')
    .set('Cookie', cookie)
    .field('name', 'Bild-Pizza')
    .field('preis', '8')
    .attach('bild', bildPuffer, { filename: 'test.png', contentType: 'image/png' });

  assert.equal(res.status, 201);
  assert.match(res.body.bild_url, /^\/uploads\/.+\.png$/);
  const dateiname = path.basename(res.body.bild_url);
  assert.ok(fs.existsSync(path.join(UPLOADS_TEST_DIR, dateiname)));
});

test('Ungueltiger Bildtyp wird abgelehnt', async () => {
  const cookie = await alsAdminEingeloggt();
  const res = await request(app)
    .post('/api/admin/pizzas')
    .set('Cookie', cookie)
    .field('name', 'Schlechtes Bild')
    .field('preis', '5')
    .attach('bild', Buffer.from('nicht ein bild'), { filename: 'test.txt', contentType: 'text/plain' });

  assert.equal(res.status, 400);
});

test('Admin kann eine Pizza aktualisieren und Sichtbarkeit umschalten', async () => {
  const cookie = await alsAdminEingeloggt();
  const angelegt = await request(app)
    .post('/api/admin/pizzas')
    .set('Cookie', cookie)
    .field('name', 'Update-Pizza')
    .field('preis', '10')
    .field('verfuegbar', 'true');

  const res = await request(app)
    .put(`/api/admin/pizzas/${angelegt.body.id}`)
    .set('Cookie', cookie)
    .field('name', 'Update-Pizza')
    .field('preis', '15.50')
    .field('verfuegbar', 'false');

  assert.equal(res.status, 200);
  assert.equal(res.body.preis, 15.50);
  assert.equal(res.body.verfuegbar, 0);

  const oeffentlich = await request(app).get('/api/pizzas');
  assert.ok(!oeffentlich.body.some(p => p.id === angelegt.body.id));
});

test('Pizza-Update loescht das alte Bild, wenn ein neues hochgeladen wird', async () => {
  const cookie = await alsAdminEingeloggt();
  const bildPuffer = Buffer.from('89504e470d0a1a0a', 'hex');

  const angelegt = await request(app)
    .post('/api/admin/pizzas')
    .set('Cookie', cookie)
    .field('name', 'Bild-Wechsel-Pizza')
    .field('preis', '9')
    .attach('bild', bildPuffer, { filename: 'alt.png', contentType: 'image/png' });

  const altesBild = path.join(UPLOADS_TEST_DIR, path.basename(angelegt.body.bild_url));
  assert.ok(fs.existsSync(altesBild));

  const aktualisiert = await request(app)
    .put(`/api/admin/pizzas/${angelegt.body.id}`)
    .set('Cookie', cookie)
    .field('name', 'Bild-Wechsel-Pizza')
    .field('preis', '9')
    .attach('bild', bildPuffer, { filename: 'neu.png', contentType: 'image/png' });

  assert.notEqual(aktualisiert.body.bild_url, angelegt.body.bild_url);
  assert.ok(!fs.existsSync(altesBild));
});

test('Update einer unbekannten Pizza-ID liefert 404', async () => {
  const cookie = await alsAdminEingeloggt();
  const res = await request(app)
    .put('/api/admin/pizzas/999999')
    .set('Cookie', cookie)
    .field('name', 'Egal')
    .field('preis', '5');
  assert.equal(res.status, 404);
});

test('Admin kann eine Pizza loeschen, inkl. Bilddatei', async () => {
  const cookie = await alsAdminEingeloggt();
  const bildPuffer = Buffer.from('89504e470d0a1a0a', 'hex');

  const angelegt = await request(app)
    .post('/api/admin/pizzas')
    .set('Cookie', cookie)
    .field('name', 'Loesch-Pizza')
    .field('preis', '6')
    .attach('bild', bildPuffer, { filename: 'loeschen.png', contentType: 'image/png' });

  const bildPfad = path.join(UPLOADS_TEST_DIR, path.basename(angelegt.body.bild_url));
  assert.ok(fs.existsSync(bildPfad));

  const res = await request(app).delete(`/api/admin/pizzas/${angelegt.body.id}`).set('Cookie', cookie);
  assert.equal(res.status, 200);
  assert.ok(!fs.existsSync(bildPfad));

  const liste = await request(app).get('/api/admin/pizzas').set('Cookie', cookie);
  assert.ok(!liste.body.some(p => p.id === angelegt.body.id));
});

test('Loeschen einer unbekannten Pizza-ID liefert 404', async () => {
  const cookie = await alsAdminEingeloggt();
  const res = await request(app).delete('/api/admin/pizzas/999999').set('Cookie', cookie);
  assert.equal(res.status, 404);
});
