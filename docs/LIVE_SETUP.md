# Diet9 – Live-Setup auf dem Mac (Supabase + echter OpenAI-Scanner)

Stand: Branch `claude/diet9-openai-pro`. Diese Anleitung ändert erst etwas an deinem
Supabase-Projekt, wenn du die markierten Schritte (⚠️) selbst ausführst.

## Was im Repository steht (geprüft)

- **Kein Supabase-Projekt hinterlegt:** keine `supabase/config.toml`, kein verknüpftes Projekt
  (`supabase/.temp/` ist leer bzw. per `.gitignore` ausgeschlossen), keine Projekt-URL im Code,
  in `.env.example`, `app.json`, `eas.json` oder in der Git-Historie aller Branches.
  Deine Projekt-ID (20 Kleinbuchstaben, „Reference ID“) kommt deshalb in Schritt 3 von deinem Mac.
- **1 Migration:** `supabase/migrations/20261026000000_minus30_init.sql` legt an:
  `user_records`, `entitlements`, `ai_usage` (alle mit Row Level Security), Funktion
  `purge_ai_usage()`, die privaten Storage-Buckets `progress-photos` und `workout-photos` samt
  Zugriffsregel „nur eigener Ordner“. Die OpenAI-/Pro-Test-Funktionen brauchen **keine** weitere
  Migration.
- **8 Edge Functions:** `sync`, `export`, `entitlement`, `food-scan`, `workout-photo`, `coach`,
  `delete-account` (alle prüfen die Anmeldung selbst über Supabase Auth) und
  `revenuecat-webhook` (prüft sein eigenes Secret, daher ohne JWT-Prüfung deployen).
- **Secrets, die Supabase selbst bereitstellt:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `SUPABASE_DB_URL` – nichts zu tun.
- **Secrets, die du setzt:** `OPENAI_API_KEY` (Pflicht für den Scanner), `PRO_TESTERS`
  (dein Testzugang), empfohlen für die Testphase `AI_GLOBAL_DAILY_LIMIT`. RevenueCat-Secrets
  erst, wenn Käufe eingerichtet werden.

## Schritte

### 1. Werkzeuge (einmalig)

```bash
brew install supabase/tap/supabase      # Supabase CLI (oder ohne Homebrew: npx supabase@2 …)
supabase --version                       # getestet mit 2.122.0
```

Docker ist nicht nötig: Die Functions werden mit `--use-api` auf Supabase-Servern gebündelt.

### 2. Code holen

```bash
cd <dein PrimeTimeAgain-Ordner>
git fetch origin
git checkout claude/diet9-openai-pro
git pull
npm install
```

### 3. Anmelden und Projekt verknüpfen (ändert nichts im Projekt)

```bash
supabase login            # öffnet den Browser
supabase projects list    # zeigt deine Projekte mit REFERENCE ID und Region
supabase link             # Projekt aus der Liste auswählen (oder: supabase link <REFERENCE ID>)
```

Noch kein Projekt? Im Dashboard (supabase.com/dashboard) „New project“, Region Frankfurt
(eu-central-1), Datenbank-Passwort sicher speichern, dann `supabase link`.

### 4. Ist-Zustand prüfen (nur lesen)

```bash
bash scripts/supabase/check-live.sh
```

Zeigt: verknüpftes Projekt, welche Migrationen schon drin sind, was `db push` anwenden **würde**
(Probelauf), welche Functions fehlen, welche Secrets fehlen (nur Namen), ob `.env.local` zum
Projekt passt. Schick mir die Ausgabe, wenn etwas unklar ist.

### 5. ⚠️ Datenbank einrichten (produktive Änderung)

```bash
supabase db push --dry-run   # zeigt nur an
supabase db push             # wendet 20261026000000_minus30_init.sql an
```

Wenn der Probelauf die Migration **nicht** anzeigt oder `db push` mit „already exists“ abbricht,
gibt es die Tabellen schon (z. B. von Hand angelegt). Dann **nicht** weiter probieren, sondern
mir die Ausgabe schicken.

### 6. ⚠️ Edge Functions deployen

```bash
supabase functions deploy sync export entitlement food-scan workout-photo coach delete-account --use-api
supabase functions deploy revenuecat-webhook --no-verify-jwt --use-api
```

Falls die App später trotz Anmeldung „Bitte anmelden“ meldet und die Function-Logs
„Invalid JWT“ zeigen (kann bei Projekten mit den neuen JWT-Signaturschlüsseln vorkommen):
die erste Zeile mit `--no-verify-jwt` wiederholen. Das ist hier sicher, weil jede dieser
Functions das Token selbst bei Supabase Auth prüft (getestet).

### 7. ⚠️ OpenAI-Schlüssel hinterlegen

1. platform.openai.com → Projekt anlegen (z. B. „Diet9“) → **Limits**: Monatsbudget setzen
   (z. B. 5 USD) → **API keys** → neuen Projekt-Key erstellen.
2. Key nur als Supabase-Secret speichern, ohne dass er in der Shell-History landet:

```bash
read -s "OPENAI_KEY?OpenAI-Key: "        # zsh (Standard auf dem Mac); in bash: read -s -p "OpenAI-Key: " OPENAI_KEY
supabase secrets set OPENAI_API_KEY="$OPENAI_KEY"
unset OPENAI_KEY
supabase secrets set AI_GLOBAL_DAILY_LIMIT=50   # Kostenbremse in der Testphase (max. 50 Anfragen/Tag je KI-Funktion)
```

Der Key gehört **nie** in `.env`, `.env.local`, `app.json` oder eine `EXPO_PUBLIC_*`-Variable.
Modell ist standardmäßig `gpt-5.4-mini`; ändern nur bei Bedarf mit
`supabase secrets set OPENAI_MODEL=…`.

### 8. App mit dem Projekt verbinden

```bash
supabase projects api-keys    # „anon“ (oder „publishable“) kopieren – öffentlich, darf in die App
```

Datei `.env.local` im Projektordner anlegen (wird nicht committet):

```
EXPO_PUBLIC_SUPABASE_URL=https://<REFERENCE ID aus Schritt 3>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon- oder publishable-Key>
```

Dann `bash scripts/supabase/check-live.sh` – der Abschnitt „App configuration“ muss die
URL ohne Warnung zeigen.

Supabase-Dashboard → Authentication → Email: Mindestlänge Passwort 8; Vorlagen „Confirm signup“
und „Reset password“ aus `supabase/templates/` übernehmen (zeigen den 6-stelligen Code).

### 9. Konto anlegen und Pro-Testzugang aktivieren

```bash
npx expo start            # iPhone im selben WLAN, QR-Code mit der Kamera scannen → Expo Go
```

1. In der App: Profil → Konto → **Konto erstellen** (deine E-Mail).
2. Profil → Konto → **Konto-ID teilen** → in Notizen/AirDrop an den Mac kopieren.
3. Auf dem Mac:

```bash
supabase secrets set PRO_TESTERS=<deine Konto-ID>
```

4. In der App: Profil → Konto → **Jetzt synchronisieren** → dort steht „Pro · Testzugang“.

Gilt sofort, ohne neues Deployment. Beenden: `supabase secrets unset PRO_TESTERS`.

### 10. Erster echter Scan (kostet Geld)

Ab hier verursacht jeder Scan eine echte OpenAI-Anfrage (geschätzt etwa 0,2–1,5 US-Cent pro Foto;
der echte Wert steht danach in OpenAI → Usage). Ernährung → **Mit KI scannen** → Foto. Die
weiteren Prüfpunkte stehen in `docs/IPHONE_TESTING.md`, Abschnitt
„Pro test access and the real AI scanner“.

Alternativ der budgetierte Testlauf mit 3 Fotos (bricht vor 0,20 USD ab):

```bash
SUPABASE_URL=https://<REFERENCE ID>.supabase.co SUPABASE_ANON_KEY=<anon-Key> \
TEST_EMAIL=<deine App-E-Mail> TEST_PASSWORD=<dein App-Passwort> \
node scripts/ai/live-scan-test.mjs --confirm-paid essen1.jpg essen2.jpg essen3.jpg
```

## Rückgängig machen

- Testzugang beenden: `supabase secrets unset PRO_TESTERS`
- KI abschalten: `supabase secrets unset OPENAI_API_KEY` (die App meldet dann „nicht verfügbar“)
- Functions entfernen: `supabase functions delete <name>`
- Die Migration lässt sich nicht automatisch zurückrollen; vorher im Dashboard unter
  Database → Backups prüfen, dass Backups aktiv sind.
