require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3001;
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'bestellungen.db');
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const BILD_ENDUNGEN = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${BILD_ENDUNGEN[file.mimetype] || ''}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!BILD_ENDUNGEN[file.mimetype]) return cb(new Error('Ungueltiger Bildtyp (nur JPEG, PNG, WebP erlaubt)'));
    cb(null, true);
  },
});

function loescheHochgeladenesBild(bildUrl) {
  if (!bildUrl || !bildUrl.startsWith('/uploads/')) return;
  fs.unlink(path.join(UPLOADS_DIR, path.basename(bildUrl)), () => {});
}

// --- DB-Hilfsfunktionen ---
let db;

function dbRun(sql, params = []) {
  return db.prepare(sql).run(params);
}

function dbGet(sql, params = []) {
  return db.prepare(sql).get(params) || null;
}

function dbAll(sql, params = []) {
  return db.prepare(sql).all(params);
}

// Zeitkonstanter String-Vergleich (Schutz gegen Timing-Angriffe auf das Admin-Passwort)
function sichererVergleich(a, b) {
  const bufA = Buffer.from(String(a ?? ''));
  const bufB = Buffer.from(String(b ?? ''));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Prueft die vom Client gesendeten Artikel und ersetzt Name/Preis durch die
// serverseitig hinterlegten Werte, damit der Client den Preis nicht faelschen kann.
function validiereArtikel(inputArtikel) {
  if (!Array.isArray(inputArtikel) || inputArtikel.length === 0) return null;

  const artikel = [];
  for (const item of inputArtikel) {
    const menge = parseInt(item?.menge, 10);
    const id = parseInt(item?.id, 10);
    if (!Number.isInteger(id) || !Number.isInteger(menge) || menge <= 0 || menge > 50) return null;

    const pizza = dbGet('SELECT id, name, preis FROM pizzas WHERE id = ? AND verfuegbar = 1', [id]);
    if (!pizza) return null;

    artikel.push({ id: pizza.id, name: String(pizza.name), preis: pizza.preis, menge });
  }
  return artikel;
}

// Prueft Name/Beschreibung/Preis/Verfuegbarkeit aus einem Pizza-Formular
function validierePizzaFelder(body) {
  const name = String(body?.name ?? '').trim();
  const beschreibung = String(body?.beschreibung ?? '').trim();
  const preis = parseFloat(body?.preis);
  const verfuegbarRoh = body?.verfuegbar;
  const verfuegbar = verfuegbarRoh === undefined || verfuegbarRoh === 'true' || verfuegbarRoh === true || verfuegbarRoh === '1' ? 1 : 0;

  if (!name || name.length > 100) return null;
  if (beschreibung.length > 500) return null;
  if (!Number.isFinite(preis) || preis <= 0 || preis > 200) return null;

  return { name, beschreibung, preis, verfuegbar };
}

// Naechste 3-stellige Bestellnummer (100-999) aus Einstellungen
function naechsteBestellnummer() {
  const row = dbGet("SELECT wert FROM einstellungen WHERE schluessel = 'naechste_nummer'");
  const aktuell = parseInt(row?.wert || '100');
  const naechste = aktuell >= 999 ? 100 : aktuell + 1;
  dbRun(`INSERT OR REPLACE INTO einstellungen (schluessel, wert) VALUES ('naechste_nummer', ?)`, [String(naechste)]);
  return String(aktuell);
}

// Tagesbilanz berechnen
function berechneBilanz() {
  const bestellungen = dbAll('SELECT artikel, gesamtpreis FROM bestellungen');
  const gesamtUmsatz = bestellungen.reduce((s, b) => s + (b.gesamtpreis || 0), 0);
  const anzahlBestellungen = bestellungen.length;

  const pizzaStats = {};
  bestellungen.forEach(b => {
    JSON.parse(String(b.artikel)).forEach(a => {
      if (!pizzaStats[a.name]) pizzaStats[a.name] = { menge: 0, umsatz: 0 };
      pizzaStats[a.name].menge += a.menge;
      pizzaStats[a.name].umsatz += a.preis * a.menge;
    });
  });

  const pizzaListe = Object.entries(pizzaStats)
    .map(([name, s]) => ({ name, menge: s.menge, umsatz: s.umsatz }))
    .sort((a, b) => b.menge - a.menge);

  return {
    anzahlBestellungen,
    gesamtPizzen: pizzaListe.reduce((s, p) => s + p.menge, 0),
    gesamtUmsatz,
    pizzaListe,
  };
}

// Shop-Status (offen/geschlossen) + naechstes Event aus Einstellungen lesen
function holeStatus() {
  const offen = dbGet("SELECT wert FROM einstellungen WHERE schluessel = 'shop_offen'")?.wert !== '0';
  const datum = dbGet("SELECT wert FROM einstellungen WHERE schluessel = 'event_datum'")?.wert || '';
  const uhrzeit = dbGet("SELECT wert FROM einstellungen WHERE schluessel = 'event_uhrzeit'")?.wert || '';
  const ort = dbGet("SELECT wert FROM einstellungen WHERE schluessel = 'event_ort'")?.wert || '';
  return { offen, event: { datum, uhrzeit, ort } };
}

// Prueft Datum/Uhrzeit/Ort fuers naechste Event
function validiereEventFelder(body) {
  const datum = String(body?.datum ?? '').trim();
  const uhrzeit = String(body?.uhrzeit ?? '').trim();
  const ort = String(body?.ort ?? '').trim();

  if (datum && !/^\d{4}-\d{2}-\d{2}$/.test(datum)) return null;
  if (uhrzeit && !/^\d{2}:\d{2}$/.test(uhrzeit)) return null;
  if (ort.length > 200) return null;

  return { datum, uhrzeit, ort };
}

// --- Datenbank initialisieren ---
function initDb() {
  db = new Database(DB_FILE);
  db.pragma('journal_mode = WAL');

  db.exec(`CREATE TABLE IF NOT EXISTS pizzas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    beschreibung TEXT,
    preis REAL NOT NULL,
    bild_url TEXT,
    verfuegbar INTEGER DEFAULT 1
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS bestellungen (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bestellnummer TEXT UNIQUE NOT NULL,
    artikel TEXT NOT NULL,
    gesamtpreis REAL NOT NULL,
    status TEXT DEFAULT 'neu',
    quelle TEXT DEFAULT 'online',
    erstellt_am TEXT DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime'))
  )`);
  const bestellungenSpalten = db.prepare("PRAGMA table_info(bestellungen)").all();
  if (!bestellungenSpalten.some(s => s.name === 'quelle')) {
    db.exec("ALTER TABLE bestellungen ADD COLUMN quelle TEXT DEFAULT 'online'");
  }
  db.exec(`CREATE TABLE IF NOT EXISTS einstellungen (
    schluessel TEXT PRIMARY KEY,
    wert TEXT NOT NULL
  )`);
  db.exec(`INSERT OR IGNORE INTO einstellungen (schluessel, wert) VALUES ('naechste_nummer', '100')`);
  db.exec(`INSERT OR IGNORE INTO einstellungen (schluessel, wert) VALUES ('shop_offen', '1')`);
  db.exec(`INSERT OR IGNORE INTO einstellungen (schluessel, wert) VALUES ('event_datum', '')`);
  db.exec(`INSERT OR IGNORE INTO einstellungen (schluessel, wert) VALUES ('event_uhrzeit', '')`);
  db.exec(`INSERT OR IGNORE INTO einstellungen (schluessel, wert) VALUES ('event_ort', '')`);

  const count = dbGet('SELECT COUNT(*) as n FROM pizzas');
  if (!count || count.n === 0) {
    const ins = db.prepare('INSERT INTO pizzas (name, beschreibung, preis) VALUES (?, ?, ?)');
    const beispielPizzen = [
      ['Margherita',       'Tomatensauce, Mozzarella, frisches Basilikum',            9.50],
      ['Salami',           'Tomatensauce, Mozzarella, Salami',                        11.00],
      ['Prosciutto',       'Tomatensauce, Mozzarella, Parmaschinken',                 12.00],
      ['Funghi',           'Tomatensauce, Mozzarella, Champignons',                   10.50],
      ['Diavola',          'Tomatensauce, Mozzarella, scharfe Salami, Peperoni',      11.50],
      ['Quattro Formaggi', 'Tomatensauce, Mozzarella, Gorgonzola, Parmesan, Ricotta', 12.50],
      ['Veggie',           'Tomatensauce, Mozzarella, Paprika, Zucchini, Aubergine',  11.00],
      ['Hawaii',           'Tomatensauce, Mozzarella, Schinken, Ananas',              10.50],
      ['Tonno',            'Tomatensauce, Mozzarella, Thunfisch, Zwiebeln',           11.00],
      ['BBQ Chicken',      'BBQ-Sauce, Mozzarella, Haehnchenbrust, rote Zwiebeln',    12.50],
    ];
    const insertAlle = db.transaction(rows => rows.forEach(row => ins.run(row)));
    insertAlle(beispielPizzen);
    console.log('Beispiel-Pizzen eingetragen.');
  }
}

// --- Middleware ---
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'pizza-geheimnis-aendere-mich',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 8 * 60 * 60 * 1000 },
}));
app.use('/uploads', express.static(UPLOADS_DIR));

// =============================================================
// ROUTEN
// =============================================================

app.get('/api/pizzas', (_req, res) => {
  res.json(dbAll('SELECT * FROM pizzas WHERE verfuegbar = 1 ORDER BY id'));
});

// Oeffentlich: Shop-Status (offen/geschlossen) + naechstes Event
app.get('/api/status', (_req, res) => {
  res.json(holeStatus());
});

// Oeffentlich: Kunde pollt seinen Bestellstatus
app.get('/api/bestellung/:nr/status', (req, res) => {
  const row = dbGet('SELECT status FROM bestellungen WHERE bestellnummer = ?', [req.params.nr]);
  if (!row) return res.status(404).json({ error: 'Nicht gefunden' });
  res.json({ status: String(row.status) });
});

// Bestellung aufgeben (Barzahlung bei Abholung)
app.post('/api/bestellung', (req, res) => {
  if (!holeStatus().offen) return res.status(403).json({ error: 'Der Shop ist aktuell geschlossen' });

  const artikel = validiereArtikel(req.body.artikel);
  if (!artikel) return res.status(400).json({ error: 'Ungueltige Artikel' });

  const bestellnummer = naechsteBestellnummer();
  const gesamt = artikel.reduce((s, a) => s + a.preis * a.menge, 0);

  dbRun(
    `INSERT INTO bestellungen (bestellnummer, artikel, gesamtpreis, status) VALUES (?, ?, ?, 'neu')`,
    [bestellnummer, JSON.stringify(artikel), gesamt]
  );

  console.log(`Neue Bestellung: #${bestellnummer} (${gesamt.toFixed(2)} EUR, bar bei Abholung)`);
  res.json({ bestellnummer, gesamtpreis: gesamt });
});

// =============================================================
// ADMIN-ROUTEN
// =============================================================

const requireAdmin = (req, res, next) =>
  req.session?.adminLoggedIn ? next() : res.status(401).json({ error: 'Nicht autorisiert' });

app.post('/api/admin/login', (req, res) => {
  const { passwort } = req.body;
  if (passwort && sichererVergleich(passwort, process.env.ADMIN_PASSWORT)) {
    req.session.adminLoggedIn = true;
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: 'Falsches Passwort' });
  }
});

app.post('/api/admin/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));

app.get('/api/admin/check', requireAdmin, (_req, res) => res.json({ ok: true }));

app.get('/api/admin/bestellungen', requireAdmin, (_req, res) => {
  const liste = dbAll('SELECT * FROM bestellungen ORDER BY id DESC');
  res.json(liste.map(b => ({ ...b, artikel: JSON.parse(String(b.artikel)) })));
});

app.put('/api/admin/bestellungen/:id/status', requireAdmin, (req, res) => {
  const { status } = req.body;
  if (!['neu', 'in_arbeit', 'fertig'].includes(status)) {
    return res.status(400).json({ error: 'Ungueltiger Status' });
  }
  dbRun('UPDATE bestellungen SET status = ? WHERE id = ?', [status, req.params.id]);
  res.json({ ok: true });
});

// Admin: Bestellung manuell an der Theke aufnehmen (Kunde ohne Handy/Internet)
app.post('/api/admin/bestellung', requireAdmin, (req, res) => {
  const artikel = validiereArtikel(req.body.artikel);
  if (!artikel) return res.status(400).json({ error: 'Ungueltige Artikel' });

  const bestellnummer = naechsteBestellnummer();
  const gesamt = artikel.reduce((s, a) => s + a.preis * a.menge, 0);

  dbRun(
    `INSERT INTO bestellungen (bestellnummer, artikel, gesamtpreis, status, quelle) VALUES (?, ?, ?, 'neu', 'theke')`,
    [bestellnummer, JSON.stringify(artikel), gesamt]
  );

  res.json({ bestellnummer, gesamtpreis: gesamt });
});

// Admin: alle Pizzen inkl. nicht verfuegbarer, fuer die Speisekarten-Verwaltung
app.get('/api/admin/pizzas', requireAdmin, (_req, res) => {
  res.json(dbAll('SELECT * FROM pizzas ORDER BY id'));
});

// Admin: neue Pizza anlegen
app.post('/api/admin/pizzas', requireAdmin, upload.single('bild'), (req, res) => {
  const felder = validierePizzaFelder(req.body);
  if (!felder) {
    loescheHochgeladenesBild(req.file && `/uploads/${req.file.filename}`);
    return res.status(400).json({ error: 'Ungueltige Pizza-Daten' });
  }

  const bildUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const info = dbRun(
    'INSERT INTO pizzas (name, beschreibung, preis, bild_url, verfuegbar) VALUES (?, ?, ?, ?, ?)',
    [felder.name, felder.beschreibung, felder.preis, bildUrl, felder.verfuegbar]
  );
  res.status(201).json(dbGet('SELECT * FROM pizzas WHERE id = ?', [info.lastInsertRowid]));
});

// Admin: Pizza aktualisieren (Text + optional neues Bild)
app.put('/api/admin/pizzas/:id', requireAdmin, upload.single('bild'), (req, res) => {
  const bestehende = dbGet('SELECT * FROM pizzas WHERE id = ?', [req.params.id]);
  if (!bestehende) {
    loescheHochgeladenesBild(req.file && `/uploads/${req.file.filename}`);
    return res.status(404).json({ error: 'Pizza nicht gefunden' });
  }

  const felder = validierePizzaFelder(req.body);
  if (!felder) {
    loescheHochgeladenesBild(req.file && `/uploads/${req.file.filename}`);
    return res.status(400).json({ error: 'Ungueltige Pizza-Daten' });
  }

  const bildUrl = req.file ? `/uploads/${req.file.filename}` : bestehende.bild_url;
  dbRun(
    'UPDATE pizzas SET name = ?, beschreibung = ?, preis = ?, bild_url = ?, verfuegbar = ? WHERE id = ?',
    [felder.name, felder.beschreibung, felder.preis, bildUrl, felder.verfuegbar, req.params.id]
  );

  if (req.file) loescheHochgeladenesBild(bestehende.bild_url);
  res.json(dbGet('SELECT * FROM pizzas WHERE id = ?', [req.params.id]));
});

// Admin: Pizza loeschen
app.delete('/api/admin/pizzas/:id', requireAdmin, (req, res) => {
  const bestehende = dbGet('SELECT * FROM pizzas WHERE id = ?', [req.params.id]);
  if (!bestehende) return res.status(404).json({ error: 'Pizza nicht gefunden' });

  dbRun('DELETE FROM pizzas WHERE id = ?', [req.params.id]);
  loescheHochgeladenesBild(bestehende.bild_url);
  res.json({ ok: true });
});

// Tagesbilanz abrufen (ohne Loeschen)
app.get('/api/admin/bilanz', requireAdmin, (_req, res) => {
  res.json(berechneBilanz());
});

// Tagesabschluss: Bilanz zurueckgeben, Daten loeschen, Zaehler zuruecksetzen, Shop schliessen
app.post('/api/admin/tagesabschluss', requireAdmin, (_req, res) => {
  const bilanz = berechneBilanz();
  const zuruecksetzen = db.transaction(() => {
    db.exec('DELETE FROM bestellungen');
    dbRun(`INSERT OR REPLACE INTO einstellungen (schluessel, wert) VALUES ('naechste_nummer', '100')`);
    dbRun(`INSERT OR REPLACE INTO einstellungen (schluessel, wert) VALUES ('shop_offen', '0')`);
  });
  zuruecksetzen();
  console.log(`Tagesabschluss: ${bilanz.anzahlBestellungen} Bestellungen, €${bilanz.gesamtUmsatz.toFixed(2)}`);
  res.json(bilanz);
});

// Admin: Shop oeffnen/schliessen
app.put('/api/admin/shop-status', requireAdmin, (req, res) => {
  dbRun(`INSERT OR REPLACE INTO einstellungen (schluessel, wert) VALUES ('shop_offen', ?)`, [req.body.offen ? '1' : '0']);
  res.json(holeStatus());
});

// Admin: naechstes Event (Datum/Uhrzeit/Ort) pflegen
app.put('/api/admin/event', requireAdmin, (req, res) => {
  const felder = validiereEventFelder(req.body);
  if (!felder) return res.status(400).json({ error: 'Ungueltige Event-Daten' });

  dbRun(`INSERT OR REPLACE INTO einstellungen (schluessel, wert) VALUES ('event_datum', ?)`, [felder.datum]);
  dbRun(`INSERT OR REPLACE INTO einstellungen (schluessel, wert) VALUES ('event_uhrzeit', ?)`, [felder.uhrzeit]);
  dbRun(`INSERT OR REPLACE INTO einstellungen (schluessel, wert) VALUES ('event_ort', ?)`, [felder.ort]);
  res.json(holeStatus());
});

// Fehler-Handler fuer Bild-Uploads (falscher Typ, zu gross, etc.)
app.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError || err?.message?.includes('Bildtyp')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = { app, initDb };

// --- Start (nicht beim Importieren in Tests) ---
if (require.main === module) {
  try {
    initDb();
    app.listen(PORT, () => console.log(`Pizza-Server laeuft auf http://localhost:${PORT}`));
  } catch (err) {
    console.error('DB-Fehler:', err);
    process.exit(1);
  }
}
