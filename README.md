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

## Bestellablauf

Es gibt kein Online-Bezahlsystem. Kunden stellen sich auf der Speisekarte ihre Bestellung
zusammen, geben sie über **"Bestellung aufgeben"** ab und bezahlen anschließend **bar bei
Abholung**. Die Bestellung erscheint sofort im Admin-Panel mit Status "Neu" und wandert von
dort über "In Arbeit" zu "Fertig".

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

---

## CI/CD-Pipeline (GitHub Actions)

Bei jedem Push auf `main` laufen die Backend-Tests, danach wird das Frontend gebaut und
per SSH/rsync auf den VServer deployt (`.github/workflows/deploy.yml`). Der Node-Prozess
läuft dort dauerhaft unter PM2, die Pipeline lädt nur Code neu und macht `pm2 reload`
(kein Downtime).

**Einmalige Einrichtung, bevor die Pipeline zum ersten Mal läuft:**

1. **GitHub-Repo erstellen** (leer, ohne README/Lizenz vorausgewählt) und als Remote setzen:
   ```
   git remote add origin <REPO_URL>
   git push -u origin main
   ```

2. **Deploy-Key auf dem VServer hinterlegen.** Öffentlichen Schlüssel
   (`~/.ssh/pizza_ci_deploy.pub` auf diesem Rechner) in die `~/.ssh/authorized_keys`
   des Deploy-Users auf dem VServer eintragen.

3. **Zielverzeichnisse auf dem VServer anlegen**, z.B.:
   ```
   /var/www/pizza/backend
   /var/www/pizza/frontend
   ```
   Im Backend-Verzeichnis einmalig manuell `backend/.env` mit echten Produktions-Werten
   anlegen (wird von der Pipeline nie überschrieben oder gelöscht).

4. **Nginx** so konfigurieren, dass `/var/www/pizza/frontend` als statische Seite
   ausgeliefert wird und `/api` auf `http://localhost:3001` (Backend) proxied wird.

5. **Folgende Secrets** unter *GitHub → Settings → Secrets and variables → Actions*
   anlegen:

   | Secret | Beispielwert |
   |---|---|
   | `VSERVER_HOST` | deine Server-IP oder Hostname |
   | `VSERVER_PORT` | `22` |
   | `VSERVER_USER` | dedizierter Deploy-User, z.B. `deploy` |
   | `VSERVER_SSH_KEY` | Inhalt von `~/.ssh/pizza_ci_deploy` (privater Schlüssel) |
   | `VSERVER_BACKEND_PATH` | `/var/www/pizza/backend` |
   | `VSERVER_FRONTEND_PATH` | `/var/www/pizza/frontend` |
   | `PM2_APP_NAME` | `pizza-backend` |

Danach läuft jeder Push auf `main` automatisch durch: Tests → Build → Deploy.
