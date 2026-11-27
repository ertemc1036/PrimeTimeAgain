# PrimeMe+ – Abonnements, Beta und RevenueCat

Stand: 27.11.2026. Bundle ID `com.minus30.app` (unverändert), App-Name „PrimeMe AI“.

## 1. Angebot

| Produkt | Produkt-ID (App Store) | Referenzpreis Deutschland | Laufzeit |
| --- | --- | --- | --- |
| PrimeMe+ Monthly | `minus30_pro_monthly` | 9,99 € | 1 Monat, automatisch verlängernd |
| PrimeMe+ Yearly | `minus30_pro_yearly` | 69,99 € (≈ 5,83 €/Monat, 49,89 € bzw. ≈ 41,6 % günstiger als 12 × monatlich) | 1 Jahr, automatisch verlängernd |

- Beide Abos liegen in **einer** Subscription Group „PrimeMe+“ und schalten dasselbe RevenueCat-Entitlement **`pro`** frei.
- Die Produkt-IDs stammen aus der ersten Einrichtung. Sie sind für Nutzer unsichtbar und bleiben, solange sie in App Store Connect noch nicht angelegt sind, frei änderbar – danach sind sie dauerhaft.
- **Die App enthält keine fest hinterlegten Preise.** Die Paywall zeigt nur den lokalisierten Preis aus dem Store (RevenueCat `priceString`). „Entspricht … pro Monat“ und „… % sparen“ werden aus den echten Store-Preisen berechnet (`yearlySaving()` in `src/services/subscriptions/revenuecat.ts`, getestet). Bei unterschiedlichen Währungen oder ohne Ersparnis wird nichts angezeigt.
- **Kostenlose Testphase (optional, noch nicht aktiv):** Sie wird ausschließlich in App Store Connect angelegt (Introductory Offer → Free → 3 Tage beim Jahresabo). Die App zeigt sie nur, wenn der Store sie liefert **und** Apple die Berechtigung des Accounts bestätigt (`checkTrialOrIntroductoryPriceEligibility`). Text: „3 Tage kostenlos, anschließend 69,99 € pro Jahr. Automatische Verlängerung, sofern nicht gekündigt.“ – immer mit dem lokalisierten Preis. **Aktivierung nur nach deiner Zustimmung.**

## 2. Die drei Modi

| Modus | Wofür | App-Build (EAS-Profil) | Server (Supabase-Secrets) |
| --- | --- | --- | --- |
| **A – kostenlose Beta** | TestFlight jetzt | `beta` (`EXPO_PUBLIC_BETA_ALL_USERS_PRO=1`) | `BETA_ALL_USERS_PRO=true` |
| **B – Abo-Test** | Echte Paywall mit Sandbox-Käufen testen | `subscription-test` (`…=0`) | Konto-IDs der Tester in `SUBSCRIPTION_TESTERS` |
| **C – kommerziell** | Öffentlicher Launch | `production` (`…=0`) | `BETA_ALL_USERS_PRO` entfernt |

**Was der Server entscheidet** (`supabase/functions/_shared/entitlement.ts`), in dieser Reihenfolge:
1. **Bezahltes Abo**, von RevenueCat bestätigt.
2. **Abo-Tester** (`SUBSCRIPTION_TESTERS`): Hier ist Schluss. Es gibt keine Beta, keinen Testzugang und keinen Founder-Platz, damit Käufe, Wiederherstellung, Verlängerung und Ablauf unverfälscht testbar sind.
3. **`PRO_TESTERS`**: Testzugang ohne Kauf.
4. **Beta** (`BETA_ALL_USERS_PRO=true`, optional mit Enddatum `BETA_PRO_UNTIL`).
5. **Founder-Platz.**

**Sandbox-Käufe** (TestFlight, Xcode, App Review; es wird nichts abgebucht):
- Sie schalten PrimeMe+ nur für `SUBSCRIPTION_TESTERS` frei.
- Für alle anderen gilt das nur mit `SANDBOX_PURCHASES=allow`. Das ist sinnvoll während Apple die Abos prüft, weil App Review in der Sandbox kauft.
- Ein normaler TestFlight-Nutzer erhält durch einen Sandbox-Kauf also kein Pro.

**Beta zentral beenden:** `supabase secrets unset BETA_ALL_USERS_PRO`.
- Ab der nächsten Anfrage gilt das normale Free-/Pro-Modell.
- Der Beta-Screen im Onboarding fragt den Server (öffentlicher `founders`-Endpunkt, Feld `beta`). Er verschwindet also auch in bereits installierten Beta-Builds, ohne neuen Build.

**Onboarding-Ablauf:**
- **A:** Plan → PrimeMe+ Beta vorstellen → Konto → Willkommen → Heute.
- **B/C:** Plan → Konto → einmalig das PrimeMe+-Angebot (`/pro?from=onboarding`) → Abo wählen oder „Mit PrimeMe Free fortfahren“ → Heute.
- Gekauft wird immer erst mit angemeldetem Konto. RevenueCat nutzt die Supabase-User-ID als App User ID.

## 3. Lebenszyklus (wie die App und der Server reagieren)

| Zustand | Verhalten |
| --- | --- |
| Kauf erfolgreich | Die App zeigt sofort PrimeMe+ (Store-Antwort) und fragt den Server (`entitlement`, erzwingt RevenueCat-Abgleich). KI-Funktionen gibt nur der Server frei. |
| Kauf abgebrochen | Keine Meldung, nichts ändert sich. |
| Kauf fehlgeschlagen / ausstehend (Ask to Buy) | Meldung „hat nicht geklappt, nichts berechnet“ bzw. „wartet auf Bestätigung“. |
| Testphase | Profil zeigt „Testphase endet am …“. |
| Verlängerung | Webhook `RENEWAL` → Server holt den aktuellen Stand bei RevenueCat. |
| Kündigung | Pro bleibt bis zum Ablaufdatum („Endet am …“), danach Free. |
| Ablauf | `EXPIRATION` → Free. Alle Daten bleiben erhalten. |
| Rückerstattung | RevenueCat setzt das Ablaufdatum auf den Erstattungszeitpunkt → Free. |
| Zahlungsproblem / Billing Grace Period | Pro bleibt während der Kulanzfrist (`grace_period`), Hinweis zur Zahlungsmethode. Danach `billing_issue` → Free. |
| Wiederherstellen, Gerätewechsel, Neuinstallation | „Käufe wiederherstellen“ in Profil und Paywall. Pro hängt am PrimeMe-Konto, nicht am Gerät. |
| Kontowechsel | Die App meldet RevenueCat den neuen Nutzer (`logIn`/`logOut`). Werte werden nie zwischen Konten übernommen. |
| Wechsel Monat ↔ Jahr | Über Apples Abo-Verwaltung (gleiche Gruppe). `PRODUCT_CHANGE` → Server-Abgleich. |
| Doppelte oder verspätete Webhooks | Jedes Event führt zu einem Abruf des **aktuellen** Stands bei RevenueCat (idempotent). Ohne REST-Schlüssel werden Events ignoriert, die älter als der gespeicherte Stand sind. |

## 4. Einrichtung (deine Schritte)

### App Store Connect
1. **Business** → *Paid Apps Agreement* akzeptieren, Bankkonto und Steuerformulare ausfüllen. Ohne das liefert der Store keine Produkte.
2. App → **Monetization → Subscriptions** → *Subscription Group* „PrimeMe+“ anlegen (+ Lokalisierung DE/EN: Anzeigename „PrimeMe+“).
3. In der Gruppe zwei Abos anlegen:
   - **Reference Name:** „PrimeMe+ Monthly“, **Product ID** `minus30_pro_monthly`, **Duration** 1 Month, **Price** Deutschland 9,99 € (Apple berechnet die anderen Länder; prüfen).
   - **Reference Name:** „PrimeMe+ Yearly“, **Product ID** `minus30_pro_yearly`, **Duration** 1 Year, **Price** 69,99 €.
   - Jeweils **Localization** (Deutsch + Englisch): Anzeigename und Beschreibung (Texte in [APP_STORE_METADATA.md](APP_STORE_METADATA.md#abonnements)).
   - **Review Information:** Screenshot der Paywall (iPhone, z. B. 1290 × 2796) und eine kurze Notiz.
   - Level: Jahresabo über dem Monatsabo einordnen (*Subscription Levels*), damit Wechsel korrekt als Up-/Downgrade gelten.
4. **App Store Server Notifications:** App → *App Information* → *App Store Server Notifications* → Production- und Sandbox-URL = die URL, die RevenueCat dir anzeigt (Version 2).
5. **In-App-Purchase-Schlüssel für RevenueCat:** *Users and Access → Integrations → In-App Purchase* → Schlüssel erzeugen (.p8 herunterladen, Key ID und Issuer ID notieren).
6. **Sandbox-Tester:** *Users and Access → Sandbox → Test Accounts* (eigene, unbenutzte E-Mail-Adressen).
7. **Erste Abos zur Prüfung einreichen:** Sie werden zusammen mit einer App-Version eingereicht (Version → *In-App Purchases and Subscriptions* → beide auswählen). Für eine reine TestFlight-Beta ist das nicht nötig.

### RevenueCat
1. Projekt „PrimeMe AI“ → App hinzufügen → **App Store**, Bundle ID `com.minus30.app`, In-App-Purchase-Schlüssel (.p8, Key ID, Issuer ID) hochladen.
2. **Products** importieren (`minus30_pro_monthly`, `minus30_pro_yearly`).
3. **Entitlement** `pro` anlegen und beide Produkte zuordnen.
4. **Offering** `default` (als *Current*) mit Paketen **Monthly** (`$rc_monthly`) und **Annual** (`$rc_annual`).
5. **API keys:** öffentlichen iOS-Schlüssel (`appl_…`) in `eas.json` für die Profile `subscription-test` und `production` als `EXPO_PUBLIC_REVENUECAT_IOS_KEY` eintragen (öffentlich, kein Geheimnis).
6. **Secret API key (v1)** → nur als Supabase-Secret: `supabase secrets set REVENUECAT_SECRET_KEY=sk_…`.
7. **Integrations → Webhooks:**
   - URL `https://xbnzjpaqhdnlharchlis.supabase.co/functions/v1/revenuecat-webhook`;
   - Authorization-Header `Bearer <zufälliges Geheimnis>`;
   - dasselbe Geheimnis als `supabase secrets set REVENUECAT_WEBHOOK_SECRET=…`;
   - Umgebung: Production **und** Sandbox senden (der Server filtert Sandbox selbst).
8. In RevenueCat die *App Store Server Notifications URL* kopieren und in App Store Connect eintragen (siehe oben, Schritt 4).

Der Webhook ist bereits deployt und lehnt Aufrufe ohne korrektes Geheimnis ab (live geprüft: 401).

### Abo-Test (Modus B)
1. Testkonto in der App anlegen und seine Konto-ID kopieren (Profil → Konto → Konto-ID).
2. `supabase secrets set SUBSCRIPTION_TESTERS=<id1>,<id2>`.
3. Build mit `npx eas-cli@latest build --platform ios --profile subscription-test` → TestFlight.
4. Auf dem iPhone unter *Einstellungen → Developer → Sandbox Account* (bzw. beim Kauf) mit dem Sandbox-Tester anmelden.
5. Testen:
   - Monatsabo, Jahresabo, Abbruch, Wiederherstellen.
   - Ablauf: In der Sandbox dauert ein Monat wenige Minuten, siehe Apple-Doku zu Sandbox-Laufzeiten.
   - Kündigung über *Abo verwalten*, Wechsel Monat/Jahr.
6. Danach `supabase secrets unset SUBSCRIPTION_TESTERS`.
