# Pizza Food Truck – Bestellsystem

## App starten

### 1. Backend starten

```
cd backend
node server.js
```

Läuft auf: http://localhost:3001

---

### 2. Frontend starten (neues Terminal-Fenster)

```
cd frontend
npm run dev
```

Läuft auf: http://localhost:5173

---

## Seiten

| Seite | URL |
|---|---|
| Speisekarte (Kunden) | http://localhost:5173 |
| Admin-Panel | http://localhost:5173/admin |

---

## Admin-Panel

**Passwort:** `pizza123`

Das Passwort kann in `backend/.env` unter `ADMIN_PASSWORT` geändert werden.

---

## PayPal Integration einrichten

### Schritt 1 – PayPal Developer Account

1. Gehe zu https://developer.paypal.com
2. Melde dich mit deinem PayPal-Konto an
3. Klicke auf **Apps & Credentials**
4. Klicke auf **Create App**
5. Gib der App einen Namen (z.B. "Pizza Food Truck")
6. Kopiere **Client ID** und **Secret Key**

### Schritt 2 – Zugangsdaten eintragen

**In `backend/.env`:**

```
PAYPAL_CLIENT_ID=HIER_DEINE_CLIENT_ID_EINTRAGEN
PAYPAL_CLIENT_SECRET=HIER_DEIN_SECRET_EINTRAGEN
```

**In `frontend/.env`:**

```
VITE_PAYPAL_CLIENT_ID=HIER_DEINE_CLIENT_ID_EINTRAGEN
```

### Schritt 3 – Testmodus vs. Echtgeld

| Modus | `PAYPAL_BASE_URL` in `backend/.env` |
|---|---|
| **Testmodus** (kein echtes Geld) | `https://api-m.sandbox.paypal.com` |
| **Live** (echte Zahlungen) | `https://api-m.paypal.com` |

Für den Testmodus stellt PayPal im Developer-Portal automatisch Test-Konten bereit.

---

## Demo-Modus (für Entwicklung und Tests)

Standardmäßig ist der Demo-Modus aktiv. Auf der Kasse-Seite erscheint statt PayPal ein gelber **"Demo-Bestellung aufgeben"**-Button — Bestellungen werden direkt gespeichert und tauchen sofort im Admin-Panel auf.

**Demo-Modus ein-/ausschalten** in `backend/.env`:
```
DEMO_MODUS=true    # Demo aktiv (kein PayPal nötig)
DEMO_MODUS=false   # Echte PayPal-Zahlung
```

Nach jeder Änderung an `.env` muss der Backend-Server neu gestartet werden.

---

## Speisekarte anpassen

Die Pizzen werden beim ersten Start automatisch angelegt. Um sie zu ändern:

1. Datei `backend/bestellungen.db` löschen
2. In `backend/server.js` die Liste im `initDb`-Block anpassen (Name, Beschreibung, Preis)
3. Backend neu starten – die neuen Pizzen werden automatisch eingetragen

---

## Später online hosten (VServer)

- Backend auf Port 3001 laufen lassen (oder hinter Nginx als Reverse Proxy)
- Frontend mit `npm run build` bauen → Ordner `frontend/dist` auf den Server kopieren
- In `backend/.env` die `FRONTEND_URL` auf die echte Domain setzen
- In `frontend/.env` die `VITE_PAYPAL_CLIENT_ID` muss vor dem Build gesetzt sein
