# PrimeMe AI – Schritt für Schritt zu TestFlight (für Einsteiger)

Stand: 27.11.2026.
- **Ziel:** kostenlose TestFlight-Beta (Modus A).
- **Was hier nicht passiert:** Nichts wird öffentlich im App Store veröffentlicht, und es werden keine echten Zahlungen aktiviert.

**Feste Werte:**
- Bundle ID **`com.minus30.app`** (nicht ändern);
- App-Name **PrimeMe AI**;
- Supabase-Projekt `xbnzjpaqhdnlharchlis` (Region EU, Stockholm).

## Schritt 1 – Apple Developer Program
1. Unter developer.apple.com/programs mit deiner Apple-ID anmelden (Zwei-Faktor-Authentifizierung nötig) → **Enroll**.
2. **Einzelperson oder Organisation?**
   - Als Einzelperson erscheint dein **Name** als Anbieter im App Store.
   - Als Organisation (UG/GmbH) erscheint der Firmenname; dafür ist eine **D-U-N-S-Nummer** nötig (kostenlos, dauert einige Tage).
3. Jahresgebühr bezahlen. Die Freischaltung dauert meist 1–2 Tage.
4. Du bist automatisch **Account Holder** (alle Rechte). Weitere Personen lädst du später in App Store Connect unter *Users and Access* ein (Rolle *App Manager* reicht für Builds und TestFlight).

## Schritt 2 – App in App Store Connect anlegen
1. appstoreconnect.apple.com → **Apps → + → New App**.
2. Ausfüllen:
   - **Platform:** iOS.
   - **Name:** PrimeMe AI. Ist er vergeben, z. B. „PrimeMe AI – Fitness Coach“.
   - **Primary Language:** Deutsch.
   - **Bundle ID:** `com.minus30.app`. Steht sie nicht in der Liste, legt EAS sie beim ersten Build an (Schritt 5), danach erneut versuchen.
   - **SKU:** frei wählbar und intern, z. B. `primeme-ai-ios`.
   - **User Access:** Full Access.
3. **App Information:**
   - Kategorie **Health & Fitness**, zweite Kategorie **Food & Drink**.
   - **Age Rating:** Fragebogen wahrheitsgemäß beantworten. Die App ist laut Nutzungsbedingungen ab 18; bietet App Store Connect eine höhere Einstufung bzw. Altersgrenze an, 18+ wählen.
4. **Business** → *Paid Apps Agreement*, Bank und Steuern. Erst nötig, wenn Abos verkauft werden; für die kostenlose Beta nicht. Details: [SUBSCRIPTIONS.md](SUBSCRIPTIONS.md#4-einrichtung-deine-schritte).

## Schritt 3 – Abonnementprodukte (für später vorbereiten)
- Vollständige Anleitung inklusive RevenueCat und Server-Benachrichtigungen: [SUBSCRIPTIONS.md](SUBSCRIPTIONS.md).
- **Kurzfassung:**
  - Gruppe „PrimeMe+“ mit `minus30_pro_monthly` (9,99 €) und `minus30_pro_yearly` (69,99 €);
  - RevenueCat-Entitlement `pro`;
  - Offering `default` mit Monthly und Annual;
  - Webhook auf die Supabase-Function.
- **Für die Beta-TestFlight nicht nötig.**

## Schritt 4 – Rechtliche Angaben und Datenschutz
1. **Website veröffentlichen:** [website/README.md](../website/README.md).
   - Zuerst Betreiberangaben in `website/operator.json` eintragen.
   - Dann Datenschutz, Nutzungsbedingungen, Impressum, Gesundheit, Abo und Support **rechtlich prüfen lassen**.
   - Danach `PUBLISH=1 python3 website/build.py` und hochladen.
2. **URLs eintragen:**
   - In `eas.json` (Profile `beta`, `subscription-test`, `production`): `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_SUPPORT_EMAIL`.
   - In App Store Connect: *App Privacy → Privacy Policy URL* und *Support URL*.
3. **App Privacy („Datenschutz-Etikett“):**
   - **Tracking:** Nein.
   - **Verknüpft mit der Identität, Zweck „App Functionality“:**
     - Contact Info → *Email Address*, *Name*;
     - Health & Fitness → *Health*, *Fitness*;
     - User Content → *Photos or Videos*, *Other User Content* (Prime-Chat, Memory);
     - Identifiers → *User ID*;
     - Purchases → *Purchase History*.
   - Keine Werbung, keine Analyse-SDKs, kein Crash-Reporting.
   - **KI-Dienstleister:** Apple fragt nicht nach Dienstleistern, aber die Datenschutzerklärung nennt OpenAI. Die App fragt vor der Übermittlung von Kontextdaten an die KI nach Einwilligung (Profil → Datenschutz).
4. **Account-Löschung:** in der App unter Profil → Konto → Konto löschen. Apple verlangt das, und es ist erfüllt.
5. **Privacy Manifest:** in `app.json` (`ios.privacyManifests`) für UserDefaults vorhanden. Expo ergänzt beim Build die Manifeste der Bibliotheken.
6. **Exportkonformität:** `ITSAppUsesNonExemptEncryption: false`, damit bereits beantwortet.

## Schritt 5 – Expo und EAS verbinden
```bash
npx eas-cli@latest login          # Expo-Konto (kostenlos auf expo.dev anlegen)
npx eas-cli@latest init           # verknüpft das Projekt, schreibt extra.eas.projectId in app.json → committen
npm run release-check -- --profile beta
```
- **Umgebungsvariablen:** Die öffentlichen Werte stehen in `eas.json` je Profil. Geheime Schlüssel (OpenAI, RevenueCat-Secret, Webhook-Secret) gehören **nur** in die Supabase-Secrets, nie in die App.
- **Zertifikate und Provisioning Profiles:** EAS erstellt sie beim ersten Build automatisch. Beantworte die Fragen nach Apple-Login und „Generate a new Apple Distribution Certificate / Provisioning Profile?“ mit **Yes**.
- **Version und Build-Nummer:**
  - Version `1.0.0` steht in `app.json`.
  - Die Build-Nummer zählt EAS automatisch hoch (`appVersionSource: remote`, `autoIncrement`).

## Schritt 6 – iOS-Build (Modus A, kostenlose Beta)
```bash
npx eas-cli@latest build --platform ios --profile beta
```
- **Inhalt des Builds:**
  - Supabase-URL und öffentlicher Schlüssel des Beta-Projekts;
  - Beta-Screen im Onboarding;
  - kein Pro-Testmodus.
- **Geheime Schlüssel:** keine im Build. `npm run release-check` prüft das.
- **Apple-Berechtigungen:** Sign in with Apple, Kamera und Fotos (mit Begründungstexten aus `app.json`), Benachrichtigungen.
- **Backend:** Beta aktiv, live geprüft. Prüfen kannst du es mit `curl https://xbnzjpaqhdnlharchlis.supabase.co/functions/v1/founders`; die Antwort enthält `"beta":true`.

## Schritt 7 – TestFlight
```bash
npx eas-cli@latest submit --platform ios --latest --profile beta
```
`submit` lädt nur nach App Store Connect hoch und **veröffentlicht nichts**. Nach 5–30 Minuten erscheint der Build unter **TestFlight**.

1. **Test Information:**
   - Beta-Beschreibung und „What to Test“ (Texte in [APP_STORE_METADATA.md](APP_STORE_METADATA.md#testflight));
   - Feedback-E-Mail = deine Support-Adresse;
   - Datenschutz-URL.
2. **Review-Testkonto:**
   - Öffne die App, lege ein Konto an (z. B. `review@deine-domain`, starkes Passwort) und beende das Onboarding.
   - Das Konto bekommt automatisch PrimeMe+ Beta.
   - E-Mail und Passwort **nur** in App Store Connect unter *Beta App Review Information → Sign-in required* eintragen, niemals ins Repository.
3. **Review Notes:** Text in [APP_STORE_METADATA.md](APP_STORE_METADATA.md#review-notes).
4. **Tester:**
   - **Interne Tester** (bis zu 100 Personen aus deinem Team): sofort nutzbar.
   - **Externe Tester** (bis 10.000, per E-Mail oder öffentlichem Link): erst nach der Beta App Review durch Apple, meist 1–2 Tage.

## E-Mail für „Passwort vergessen“ (Resend + Supabase SMTP)
Die Registrierung braucht **keine** E-Mail. Nur das Zurücksetzen des Passworts verschickt einen 6-stelligen Code. Ohne eigenen SMTP-Versand kommen E-Mails nur bei Mitgliedern deines Supabase-Teams an.

1. **Resend einrichten:** resend.com → Konto → **Domains → Add Domain**, z. B. `mail.deine-domain.de`.
2. **DNS-Einträge** bei deinem Domain-Anbieter setzen, genau wie Resend sie anzeigt (SPF/TXT, DKIM/TXT, MX für Bounces). Danach in Resend **Verify** und warten, bis alles grün ist.
   - Empfohlen zusätzlich: DMARC-Eintrag `_dmarc` mit `v=DMARC1; p=none;`.
3. **API-Key:** Resend → **API Keys → Create** (Berechtigung *Sending access*, nur diese Domain). Nicht in Chats oder ins Repository kopieren.
4. **Supabase:** Dashboard → **Authentication → Emails → SMTP Settings** → *Enable custom SMTP*:
   - Host `smtp.resend.com`, Port `465`;
   - Benutzer `resend`, Passwort = der API-Key;
   - Absender `no-reply@mail.deine-domain.de`, Name „PrimeMe AI“.
5. **PrimeMe-Vorlagen hochladen** (mit Code statt Link, Schwarz/Weiß, DE + EN):
   ```bash
   SUPABASE_ACCESS_TOKEN=<dein persönlicher Supabase-Token> node scripts/supabase-auth-config.mjs --apply --templates
   ```
   Das Skript bestätigt danach, dass die E-Mail-Bestätigung aus bleibt (`mailer_autoconfirm=true`), Codes 6-stellig sind und das Passwort mindestens 8 Zeichen hat. Die SMTP-Einrichtung schaltet die Bestätigungspflicht **nicht** wieder ein.
6. **Rate Limit:** Unter *Authentication → Rate Limits* „Emails sent“ auf z. B. 30 pro Stunde erhöhen (Standard 2, nur für den eingebauten Versand gedacht).
7. **Test:** In der App unter Anmelden → „Passwort vergessen?“ die eigene Adresse eingeben, Code aus der E-Mail eingeben, neues Passwort setzen. Danach muss die Anmeldung mit dem neuen Passwort funktionieren.
   - Deep Links sind nicht nötig, weil mit einem Code statt eines Links gearbeitet wird.

## Release-Blocker vor TestFlight (Stand jetzt)
Siehe [RELEASE_STATUS.md](RELEASE_STATUS.md). Kurz:
1. Datenschutz-URL (Website mit geprüften Texten).
2. `eas init`.
3. Ein echter iPhone-Test mit dem Build ([IPHONE_TESTING.md](IPHONE_TESTING.md)).
