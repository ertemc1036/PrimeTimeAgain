# PrimeMe AI – Statusbericht vor TestFlight

Stand: 27.11.2026, Branch `claude/primeme-redesign`. Beta-Backend: Supabase `xbnzjpaqhdnlharchlis` (EU, Stockholm).

## 1. Fertig implementiert und erfolgreich getestet

| Bereich | Ergebnis | Nachweis |
| --- | --- | --- |
| **Registrierung ohne E-Mail-Bestätigung** | Konto erstellen → sofort angemeldet → Onboarding-Daten gespeichert → PrimeMe+ Beta → Heute. Kein Bestätigungs-Screen, kein Code, keine E-Mail. | Live: 2 neue Konten (`confirmation_sent_at` leer, Session sofort); Browser-Test Onboarding → Konto → Dashboard |
| **Ursache der angezeigten Bestätigung** | Nicht Supabase (dort war und ist die Bestätigung aus), sondern die App: Nach der Registrierung über „Konto erstellen“ (`/auth/sign-up`) leitete sie auf „E-Mail bestätigen“ (OTP-Mail), solange Founder-Plätze frei waren. Zusätzlich gab es Weiterleitungen zum alten Code-Screen (`/auth/verify`) und eine Bestätigungs-Aufforderung auf der Paywall. Alles entfernt; fehlt die Session trotzdem, meldet die App einen Serverfehler statt eines Code-Screens. | Code + Live-Test |
| **Sicherheit bei unbestätigter E-Mail** | Eine unbestätigte Adresse ist kein Identitätsnachweis (`identityVerified=false`), bringt keinen Founder-Platz und erlaubt **keine** Verknüpfung mit Apple (Datenbank-Trigger blockiert automatische Verknüpfung, bis die E-Mail per Code bewiesen ist). Zweite Registrierung mit derselben E-Mail → `user_already_exists`. | Live + Server-Test „Identity … linking needs a proven email“ |
| **Passwort-Regeln** | Mindestens 8 Zeichen jetzt auch serverseitig (vorher 6); Reset-Codes 6-stellig (vorher 8 → passte nicht zur App) | `scripts/supabase-auth-config.mjs` ✓ |
| **Beta-Pro für alle** | `BETA_ALL_USERS_PRO=true` aktiv; jedes neue Konto → „PrimeMe+ Beta“; KI-Limits bleiben | Live |
| **Modus B (Abo-Test) getrennt** | Konto in `SUBSCRIPTION_TESTERS` → kein Beta-Pro, Pro-Funktionen 403, Prime im Free-Kontingent | Live (Secret danach wieder entfernt) |
| **Modus C (kommerziell)** | Ohne Beta: Onboarding ohne Beta-Screen → Konto → PrimeMe+-Angebot → „Mit PrimeMe Free fortfahren“ → Heute; Profil „PrimeMe Free“ | Browser gegen lokalen Stack |
| **Sandbox-Regel** | Sandbox-Käufe schalten Pro nur für Abo-Tester bzw. mit `SANDBOX_PURCHASES=allow` frei | Unit-Test |
| **Webhook** | Ohne/mit falschem Secret → 401; Vergleich in konstanter Zeit; Events führen zum Abgleich des aktuellen RevenueCat-Stands | Live + Server-Tests |
| **Gesundheitscheck** | Bei „Abnehmen“: Schwangerschaft/Stillzeit, Essstörung, Erkrankung, Medikamente → kein Zielgewicht, kein Tempo, kein Defizit, Hinweis im Plan; Prime erhält (mit Einwilligung) nur `noCalorieDeficit` | Unit-Test + Browser |
| **Prime-Chat, Essensscanner, Sync, Konto-Löschung** | echte KI-Antworten, Scanner erkennt Mahlzeit, Profil/Wasser synchronisiert und vom Server geladen, Löschung entfernt Login und Daten | Live, danach 0 Testkonten, 0 verwaiste Datensätze |
| **Passwort-Reset mit Code** | funktioniert (Code-Mail, neues Passwort, Anmeldung) | Server-Test gegen lokalen Stack mit lokalem Mailserver |
| **Automatische Prüfungen** | Typecheck ✓, Lint 0 Fehler (2 alte Warnungen), Jest 198 ✓ (2 übersprungen), Server 32/32 ✓, iOS- und Android-Export ✓, Expo Doctor 18/20 (die 2 Fehler: Expo-Server von hier nicht erreichbar) | lokal |

## 2. Implementiert, aber noch nicht vollständig getestet

- **Paywall** (`src/app/pro.tsx`):
  - „Become your Prime.“, echte Vorteile;
  - Jahresabo vorausgewählt;
  - nur Store-Preise, dynamische Ersparnis;
  - Testphase nur bei Apple-Berechtigung;
  - Wiederherstellen, Abo verwalten, AGB und Datenschutz.
  - Im Browser geprüft (dort ohne Store). **Echte Preise und Käufe erst auf dem iPhone mit RevenueCat-Schlüssel.**
- **Mitgliedschaft im Profil:**
  - Anzeige Free / Beta / Monthly / Yearly / Founders / Testzugang;
  - Verlängerungs- bzw. Ablaufdatum, Abo verwalten (Apple-Seite als Rückfall);
  - Hinweis, dass Konto-Löschung kein Apple-Abo kündigt.
- **Abo-Lebenszyklus** (Kauf, Abbruch, Verlängerung, Kündigung, Ablauf, Erstattung, Grace Period, Wiederherstellen, Wechsel): Server-Logik getestet. Sandbox-Tests auf dem iPhone stehen aus.
- Sign in with Apple, Haptik, Picker, Tastatur und große Schrift: nur auf dem iPhone prüfbar ([IPHONE_TESTING.md](IPHONE_TESTING.md)).

## 3. Externe Konfiguration erforderlich (deine Schritte)

| Was | Wo | Anleitung |
| --- | --- | --- |
| Eigener SMTP (z. B. Resend) + PrimeMe-Reset-Vorlage | Resend + Supabase → Authentication → SMTP; danach `node scripts/supabase-auth-config.mjs --apply --templates` | [BETA_TESTFLIGHT.md](BETA_TESTFLIGHT.md#e-mail-für-passwort-vergessen-resend--supabase-smtp) |
| Betreiberangaben + Rechtsprüfung, Website online | `website/operator.json`, Hosting, Domain | [website/README.md](../website/README.md) |
| `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_SUPPORT_EMAIL` | `eas.json` | nach Veröffentlichung der Website |
| `eas init` (EAS-Projekt verknüpfen) | Terminal | [BETA_TESTFLIGHT.md](BETA_TESTFLIGHT.md#schritt-5--expo-und-eas-verbinden) |
| Apple Developer Program, App in App Store Connect | Apple | Schritte 1–2 |
| Für Abos (nicht für die Beta): Paid Apps Agreement, Bank, Steuern, Abo-Gruppe + 2 Produkte, Server Notifications, RevenueCat-Projekt, `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, Secrets `REVENUECAT_SECRET_KEY` + `REVENUECAT_WEBHOOK_SECRET` | App Store Connect, RevenueCat, Supabase | [SUBSCRIPTIONS.md](SUBSCRIPTIONS.md) |
| Review-Testkonto | in der App anlegen, Zugangsdaten nur in App Store Connect | Schritt 7 |

**Fehlende Schlüssel und Zugangsdaten:**
- RevenueCat: öffentlicher iOS-Schlüssel, Secret Key, Webhook-Secret.
- SMTP-Zugang.
- Die Apple-ID für EAS gibst du selbst beim ersten Build ein.
- OpenAI ist eingerichtet.

## 4. Release-Blocker

**Für die kostenlose TestFlight-Beta (Modus A):**
1. Öffentliche Datenschutz-URL mit geprüftem Text (Apple verlangt sie für externe Tester).
2. `eas init`, erster Build `--profile beta`, Upload.
3. Test auf einem echten iPhone.

**Zusätzlich für den kommerziellen Launch (Modus C):**
- Rechtsprüfung aller Texte. Insbesondere die **ausdrückliche Einwilligung in die Verarbeitung von Gesundheitsdaten** (Art. 9 DSGVO): Die App hat derzeit nur die Einwilligung zur KI-Datennutzung.
- Auftragsverarbeitungsverträge (Supabase, OpenAI, RevenueCat) und Grundlagen für Übermittlungen in die USA.
- Fachliche Prüfung der Planwerte durch eine Ernährungsfachkraft.
- Abos in App Store Connect plus RevenueCat, Sandbox-Test.
- SMTP für Passwort-Reset.
- Beta beenden **nur mit deiner Zustimmung** (`supabase secrets unset BETA_ALL_USERS_PRO`).

## 5. Status-Übersicht

| Punkt | Status |
| --- | --- |
| Registrierung | ohne Bestätigung, sofort angemeldet ✓ |
| E-Mail-Bestätigung | in Supabase aus (`mailer_autoconfirm=true`), in der App keine Bestätigungs-Screens mehr; optionaler Code nur noch beim Verknüpfen von Apple (Schutz vor Kontoübernahme, braucht SMTP) |
| Abos | Monthly 9,99 € / Yearly 69,99 € (Referenz DE, nur in App Store Connect); App zeigt Store-Preise; Produkt-IDs `minus30_pro_monthly`, `minus30_pro_yearly`; Entitlement `pro` |
| RevenueCat | Code vollständig (SDK, Offerings, Kauf, Restore, CustomerInfo, Abo verwalten, Webhook, Server-Abgleich); Projekt/Schlüssel noch nicht angelegt |
| Beta-Pro | aktiv für alle Konten ✓ |
| Backend | 10 Edge Functions mit neuem Code deployt; Migrationen aktuell; RLS und private Buckets unverändert |
| Founders | bestehende Plätze unverändert (3 von 1.000 vergeben); neue Plätze nur mit bewiesener Identität (Apple oder E-Mail-Code). Der Founders-Zähler wird nicht mehr auf der Paywall beworben. Ob das Programm zum Launch weiterlaufen soll, ist deine Entscheidung. |
| Rechtliche Seiten | Entwürfe in `website/` (Datenschutz, Nutzungsbedingungen, Abo-Bedingungen, Gesundheit, Impressum, Support), gelb markierte Lücken, `noindex` bis zur Freigabe |
| iOS-Build | Export erfolgreich; EAS-Build steht aus (`eas init` fehlt) |

## 6. Nächste Schritte bis TestFlight
1. Betreiberangaben schicken → ich fülle die Texte. Danach rechtlich prüfen lassen und die Website hosten.
2. URLs in `eas.json` eintragen → `npm run release-check -- --profile beta` muss grün sein.
3. `npx eas-cli@latest init` → `build --platform ios --profile beta` → `submit --profile beta`.
4. TestFlight-Angaben und Review-Konto anlegen, interne Tester einladen, iPhone-Checkliste durchgehen.
5. Parallel: Resend und SMTP einrichten, Vorlagen hochladen.
6. Später: Abos und RevenueCat einrichten, Modus-B-Test, dann Entscheidung über den Launch.

## Geänderte Dateien (Auszug)
- **Auth:**
  - `src/services/auth.ts`;
  - `src/app/auth/{sign-up,sign-in,reset,confirm-email}.tsx`, `verify.tsx` gelöscht;
  - `src/app/settings/account.tsx`;
  - `src/features/onboarding/flow/Flow.tsx`.
- **Abo:**
  - `src/app/pro.tsx`;
  - `src/services/subscriptions/{revenuecat,entitlements,pricing.test}.ts`;
  - `src/state/ProProvider.tsx`, `src/features/pro/membership.ts`;
  - `src/features/profile/ProfileHub.tsx`;
  - `src/config/app.ts` (alte Platzhalterpreise entfernt);
  - `eas.json` (Profile `beta`, `subscription-test`, `production`);
  - `scripts/release-check.mjs`.
- **Server:**
  - `supabase/functions/_shared/entitlement.ts`;
  - `revenuecat-webhook`, `founders`, `prime`, `coach`;
  - Tests in `supabase/tests/*`;
  - `supabase/templates/{recovery,magiclink}.html`;
  - `scripts/supabase-auth-config.mjs`.
- **Gesundheit:**
  - `src/domain/plan.ts` (+ Test), `src/domain/types.ts`;
  - `src/features/onboarding/flow/{state.tsx,Flow.tsx}`;
  - `src/features/coachContext.ts`;
  - `src/app/settings/health.tsx`.
- **Übersetzungen:** alle 5 Sprachen (`paywall.*`, `membership.*`, `ob.health.*`, Fehlertexte; veraltete Schlüssel entfernt).
- **Website und Doku:**
  - `website/*`;
  - `docs/{RELEASE_STATUS,SUBSCRIPTIONS,BETA_TESTFLIGHT,APP_STORE_METADATA,IPHONE_TESTING,ONBOARDING,RELEASE}.md`.
