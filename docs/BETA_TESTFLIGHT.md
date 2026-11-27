# PrimeMe AI – Beta-Backend und TestFlight

Stand: 27.11.2026. Supabase-Projekt `xbnzjpaqhdnlharchlis` ist die **Beta-Umgebung**.

## 1. Ursache des Registrierungsproblems

- **Was passiert ist:** Jede Anmeldung bzw. Registrierung aus der App (Expo auf dem iPhone) wurde vom Supabase-Gateway mit **`401 Invalid API key`** abgelehnt. Das gilt für `signup`, Login, Sign in with Apple und Token-Refresh.
- **Beleg:** Die Edge-Logs zeigen genau diese Anfragen. Der Auth-Server selbst hat keine einzige erhalten.
- **Ursache:** Der in der App verwendete anon key gehörte nicht (mehr) zu diesem Projekt; das Projekt hat einen neueren Schlüssel.
- **Was es nicht war:** Registrierung (`disable_signup: false`) und E-Mail-Konto waren nie gesperrt. Es gab keine Allowlist und keine feste User-ID.
- **Zusätzlicher App-Fehler:** Die Meldung „Invalid API key“ wurde als „Code ist falsch“ angezeigt, weil das Wort „invalid“ falsch zugeordnet wurde. Das hat die Ursache verschleiert.

**Behoben:**
- `eas.json` enthält für alle Build-Profile die richtige URL und den gültigen anon key. Beide sind öffentliche Werte und keine Geheimnisse.
- `npm run env:beta` schreibt dieselben Werte in deine lokale `.env.local` für Expo Go.
- `npm run release-check` prüft jetzt, dass der Schlüssel zum Projekt passt.
- Die App zeigt bei einem abgelehnten Schlüssel eine eigene, klare Meldung (`server_config`).

**Live getestet (27.11.2026)** gegen das echte Backend mit dem richtigen Schlüssel:
- zwei neue Konten registriert, Session sofort erhalten;
- ab- und wieder angemeldet (bestehendes Konto);
- falsches Passwort und doppelte Registrierung abgewiesen;
- Session-Refresh funktioniert;
- Entitlement-Abfrage funktioniert;
- Konto-Löschung funktioniert (beide Testkonten wieder gelöscht).

## 2. Beta: alle Nutzer bekommen PrimeMe+ (serverseitig)

- **Wo die Logik sitzt:** `supabase/functions/_shared/entitlement.ts` → `betaAllUsersPro()`.
- **Steuerung über Edge-Function-Secrets:**
  - `BETA_ALL_USERS_PRO=true` schaltet PrimeMe+ für **jedes angemeldete Konto** frei: Prime-Chat mit Plus-Limits, Essensscanner, Fotoanalyse, Memory, alle KI-Functions.
  - `BETA_PRO_UNTIL=JJJJ-MM-TT` ist optional. Nach diesem Datum endet die Beta automatisch.
- **Reihenfolge:** Ein echtes Abo hat Vorrang, dann `PRO_TESTERS`, dann die Beta, dann Founders-Plätze.
- **Was die Beta nicht berührt:** RevenueCat, Produkt-IDs und Preise bleiben unverändert. Es gibt keine gefälschten Käufe und keinen Bypass in der App.
- **Missbrauchsschutz bleibt:** Limits pro Nutzer (`quota.ts`) und das globale Tageslimit (`AI_GLOBAL_DAILY_LIMIT`, Standard 2000).
- **Anzeige in der App:** „PrimeMe+ Beta“, keine Paywalls.
- **Trennung von den Builds:** Die Beta hängt **nur** am Secret dieses Supabase-Projekts, nicht an einem App-Build. Ein TestFlight-Build (Profil `production`) bekommt sie also auch.
  - Für die spätere öffentliche Version: Secret löschen oder `false` setzen, oder ein separates Produktionsprojekt ohne Secret verwenden.
- **Test:** `supabase/tests/logic.test.ts` prüft an/aus, Enddatum und ungültige Werte.

## 3. Status Supabase (geprüft per Supabase-Verbindung)

| Bereich | Status |
| --- | --- |
| Migrationen | **erledigt:** `founder_seats`, `identity_proofs`, `primeme_collections`, `harden_bump_server_seq` sind eingespielt. Die Dateien sind auf die Live-Versionsnummern umbenannt, damit `supabase db push` nichts doppelt ausführt. |
| RLS | aktiv auf allen Tabellen. Hinweis „RLS ohne Policy“ ist gewollt: diese Tabellen sind nur für den Server. |
| Storage | private Buckets `progress-photos` und `workout-photos` vorhanden |
| Edge Functions | **offen:** live ist noch die alte Version 4. `prime` und `founders` fehlen ganz (die App ruft `founders` → 404). Siehe Schritt A. |
| Secret `BETA_ALL_USERS_PRO` | **offen**, siehe Schritt A |
| Secret `OPENAI_API_KEY` | konnte nicht geprüft werden (kein gültiger Zugriffstoken), siehe Schritt A |
| E-Mail-Bestätigung | aus (`mailer_autoconfirm: true`): Registrierung braucht keine E-Mail |
| Passwort-zurücksetzen | braucht E-Mail-Versand. Der eingebaute Supabase-Mailer schickt nur an Mitglieder deines Supabase-Teams, maximal etwa 2 pro Stunde. Siehe Schritt C. |

## Schritt A – Functions deployen und Beta einschalten (auf deinem Mac, ca. 5 Minuten)

Im Projektordner, auf dem Branch `claude/primeme-redesign`:

```bash
git pull
npx supabase@2 login        # öffnet den Browser, mit deinem Supabase-Konto bestätigen
npx supabase@2 functions deploy sync export entitlement food-scan workout-photo coach delete-account prime --project-ref xbnzjpaqhdnlharchlis --use-api
npx supabase@2 functions deploy revenuecat-webhook founders --no-verify-jwt --project-ref xbnzjpaqhdnlharchlis --use-api
npx supabase@2 secrets set BETA_ALL_USERS_PRO=true --project-ref xbnzjpaqhdnlharchlis
npx supabase@2 secrets list --project-ref xbnzjpaqhdnlharchlis
```

In der letzten Liste muss **`OPENAI_API_KEY`** stehen.
- **Fehlt er:** Schlüssel bei platform.openai.com → API keys erzeugen und mit `npx supabase@2 secrets set OPENAI_API_KEY=sk-… --project-ref xbnzjpaqhdnlharchlis` setzen.
- **Nicht** in die App oder ins Repo eintragen.

**Alternative:** Gib mir einen gültigen Supabase-Zugriffstoken, dann erledige ich das.
- Wo du ihn findest: Supabase → Avatar unten links → Account preferences → Access Tokens → Generate new token.
- Er beginnt mit **`sbp_`**. Der zuletzt eingegebene Wert war kein solcher Token.

## Schritt B – Lokal in Expo Go testen

```bash
npm run env:beta
npx expo start --go --clear
```

## Schritt C – E-Mail-Versand für „Passwort vergessen“

1. Supabase → **Authentication → Emails → SMTP Settings** → „Enable custom SMTP“.
2. Daten eines Mail-Anbieters eintragen (z. B. Resend, Postmark, Brevo): Host, Port, Benutzer, Passwort, Absender (z. B. `no-reply@deine-domain`).

Ohne eigenen SMTP-Versand kommen Codes nur bei Mitgliedern deines Supabase-Teams an. Registrierung und Anmeldung funktionieren auch ohne.

Empfohlen: **Authentication → Providers → Email → „Prevent use of leaked passwords“** (Pro-Plan).

## Schritt D – TestFlight-Build

**Voraussetzungen:**
- Apple Developer Program (bezahlt);
- Expo-Konto;
- in App Store Connect eine App mit Bundle ID **`com.minus30.app`** (unverändert).

```bash
npx eas-cli@latest login
npx eas-cli@latest init          # verknüpft das Projekt, schreibt extra.eas.projectId in app.json → committen
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --latest
```

- **Beim ersten Build** fragt EAS nach deinem Apple-Login und legt Zertifikat und Provisioning-Profil automatisch an. Diese Fragen mit „Yes“ beantworten.
- **`submit`** lädt den Build nach App Store Connect hoch. Es veröffentlicht **nichts** im App Store.

**In App Store Connect → deine App → TestFlight:**
1. **Test Information:**
   - Beta-App-Beschreibung, Feedback-E-Mail;
   - Datenschutzrichtlinie: **URL erforderlich**, siehe Release-Blocker.
2. **Beta App Review Information:** Kontaktdaten und ein **Review-Testkonto**.
   - Lege es in der App selbst an, z. B. `review@deine-domain`.
   - Es bekommt durch die Beta automatisch PrimeMe+.
   - E-Mail und Passwort nur dort eintragen, nicht ins Repo.
3. **Notiz an das Review-Team:**
   - Fitness- und Wellness-App ab 18, keine medizinische Diagnose.
   - KI-Schätzungen sind gekennzeichnet.
   - Konto-Löschung unter Profil → Konto.
4. **Testergruppen:**
   - interne Tester sofort;
   - externe Tester erst nach der Beta-Prüfung durch Apple (meist 1–2 Tage).
5. **Exportkonformität:** ist durch `ITSAppUsesNonExemptEncryption: false` bereits beantwortet.

## Release-Blocker (Stand jetzt)

1. **Edge Functions und Beta-Secret** sind nicht live (Schritt A).
2. **`OPENAI_API_KEY`:** nicht verifiziert.
3. **Datenschutzrichtlinie als öffentlich erreichbare URL** fehlt. Apple verlangt sie in App Store Connect. Die Texte in der App sind nur ein Entwurf und vorher rechtlich zu prüfen.
4. **EAS-Projekt** nicht verknüpft (`eas init`).
5. **Test auf einem echten iPhone mit dem neuen Build:** Registrierung, Anmeldung, KI-Funktionen. Von hier aus nicht möglich.

**Nicht blockierend für TestFlight:**
- RevenueCat-Schlüssel: Käufe sind in der Beta nicht nötig.
- Nutzungsbedingungen und Support-E-Mail als URL bzw. Wert: empfohlen.
