# Erster Test auf einem echten iPhone – Checkliste

- 🔵 = **nur du** auf einem echten iPhone (Haptik, Kamera, Apple-ID, StoreKit, Gefühl der Bedienung).
- ✅ = bereits automatisch oder live gegen das Backend geprüft. Trotzdem kurz gegenprüfen.

**Vorbereitung:**
- TestFlight-Build aus Profil `beta` installieren ([BETA_TESTFLIGHT.md](BETA_TESTFLIGHT.md)).
- Am besten ein kleines Gerät (iPhone SE/mini) und ein großes (Pro Max), falls verfügbar.

## 1. Start und Onboarding
- [ ] 🔵 App startet ohne Absturz, Splash → Willkommen.
- [ ] 🔵 Jede Frage auf eigenem Screen, Zurück-Pfeil und Fortschrittsbalken funktionieren.
- [ ] 🔵 Haptik bei Auswahl, Drehrädern und Skala spürbar, aber nicht störend.
- [ ] 🔵 Wheel Picker (Geburtsdatum, Größe) laufen flüssig, rasten sauber ein; „Wert eingeben“ funktioniert.
- [ ] 🔵 Gewichtsskala: Wischen, Einrasten auf 0,1 kg, Wechsel kg/lbs ohne Wertverlust.
- [ ] 🔵 Ziel „Abnehmen“ → Gesundheitscheck erscheint. „Schwanger oder stillend“ wählen → kein Zielgewicht/Tempo, Plan zeigt den Hinweis ohne Defizit. Danach zurück und „Nichts davon“ wählen.
- [ ] 🔵 Tastatur verdeckt bei Name und Konto keine Felder und keinen Button.
- [ ] 🔵 Kleine und große Bildschirme: nichts abgeschnitten. Mit großer Schrift (Einstellungen → Anzeige → Textgröße) nochmal prüfen.
- [ ] 🔵 „Bewegung reduzieren“ an: Übergänge ohne Wischanimation.
- [ ] 🔵 App mitten im Onboarding schließen und neu öffnen → setzt beim letzten Schritt fort.

## 2. Registrierung und Anmeldung
- [ ] ✅ 🔵 Konto mit E-Mail und Passwort erstellen → **keine** Bestätigungs-E-Mail, sofort angemeldet, „PrimeMe+ Beta ist aktiv“, dann Heute-Dashboard.
- [ ] 🔵 Sign in with Apple (neues Konto) → sofort im Dashboard.
- [ ] 🔵 Abmelden und mit E-Mail/Passwort wieder anmelden → Onboarding wird **nicht** erneut gezeigt, Daten sind da.
- [ ] 🔵 „Passwort vergessen?“ → Code per E-Mail → neues Passwort → Anmeldung. **Erst nach SMTP-Einrichtung möglich.**
- [ ] 🔵 Profil → Konto → Apple verknüpfen (bei E-Mail-Konto): fragt zuerst nach einem Code zur E-Mail-Bestätigung (Schutz vor Kontoübernahme).

## 3. App-Funktionen
- [ ] 🔵 Profil zeigt „PrimeMe+ Beta“.
- [ ] 🔵 Heute: Kalorien, Makros, Wasser (+250 ml), Serie, Tagesaufgaben.
- [ ] ✅ 🔵 Prime-Chat antwortet echt; Vorschläge werden erst nach „Speichern“ eingetragen.
- [ ] ✅ 🔵 Essensscanner mit Kamera: Foto → Schätzwerte → bearbeiten → speichern.
- [ ] 🔵 Kamera- und Fotozugriff: Abfrage erscheint mit verständlichem Text; „Nicht erlauben“ führt zu einem Hinweis.
- [ ] 🔵 Training eintragen, Ruhetag eintragen.
- [ ] 🔵 **Serie:** Ernährung abschließen + Training (oder Ruhetag) → Tag erledigt. Planung für morgen ist freiwillig und ändert nichts an der Serie.
- [ ] 🔵 Flugmodus: Einträge möglich; nach dem Wiederverbinden synchronisiert.
- [ ] 🔵 App beenden und neu starten: alles noch da.

## 4. Abos (erst mit Build aus Profil `subscription-test` und Sandbox-Tester)
- [ ] 🔵 Paywall zeigt Preise aus dem App Store (9,99 €/69,99 € bei deutschem Sandbox-Account), „entspricht … pro Monat“, „… % sparen“.
- [ ] 🔵 Monatsabo kaufen → PrimeMe+ Monthly im Profil, Verlängerungsdatum.
- [ ] 🔵 Wechsel auf Jahresabo über „Abo verwalten“.
- [ ] 🔵 Kündigen → „Endet am …“, danach Ablauf → PrimeMe Free, Daten bleiben.
- [ ] 🔵 App löschen, neu installieren, anmelden → „Käufe wiederherstellen“.
- [ ] 🔵 Kauf abbrechen → keine Fehlermeldung, nichts freigeschaltet.
- [ ] 🔵 Optional: Testphase nur sichtbar, wenn in App Store Connect angelegt und berechtigt.

## 5. Konto löschen
- [ ] ✅ 🔵 Profil → Konto → Konto löschen → Hinweis auf Apple-Abo sichtbar → nach Bestätigung zurück zum Start; Anmeldung mit den alten Daten ist nicht mehr möglich.

Fehler bitte mit Screenshot, Gerät, iOS-Version und Uhrzeit notieren (TestFlight → Feedback senden).
