# Einwilligung in die Verarbeitung von Gesundheitsdaten

Stand: 27.11.2026, Textversion `2026-11-27`.
- **Status:** Entwurf, rechtlich zu prüfen. Keine Aussage über DSGVO-Konformität.
- **Abgrenzung:** Die Einwilligung ist getrennt von der Einwilligung zur KI-Datennutzung (Profil → Datenschutz → „Prime darf meine Daten nutzen“) und von den Nutzungsbedingungen.

## Umfang
**Gesundheitsangaben im Sinne dieser Einwilligung:**
- Körperangabe für die Berechnung, Größe, Gewicht und Gewichtsverlauf, Zielgewicht;
- Antworten des Gesundheitschecks;
- Allergien, Unverträglichkeiten und besondere Ernährungsanforderungen (z. B. halal; kann religiöse Überzeugungen offenlegen).

**Rechtlich zu prüfen:**
- ob Ernährungstagebuch, Trainings, Wasser, Fortschrittsfotos und KI-Gespräche ebenfalls darunterfallen;
- ob dafür eine Einwilligung oder eine andere Grundlage nötig ist.

Diese Daten werden derzeit als Kernfunktion ohne gesonderte Einwilligung verarbeitet.

## Ablauf
1. **Onboarding:**
   - Gleich nach der Namensfrage und **vor** der ersten Gesundheitsfrage erscheint der Screen „Deine Gesundheitsangaben“: was, wofür, wo, freiwillig und widerrufbar.
   - Dazu eine **nicht vorausgewählte** Checkbox. „Einwilligen und weiter“ ist erst nach dem Haken aktiv.
   - Alternative: „Ohne Gesundheitsangaben fortfahren“.
2. **Ohne Einwilligung:**
   - Die Fragen zu Körper, Größe, Gewicht, Gesundheitscheck, Zielgewicht, Tempo und besonderen Anforderungen entfallen.
   - Der Plan nennt ehrlich, dass ohne Körperangaben kein Kalorienrahmen berechnet wird.
   - Die App bleibt nutzbar: Mahlzeiten, Wasser, Training, Ruhetage, Serie, Prime, PrimeMe+ Beta. Eingeschränkt sind nur Kalorienrahmen und Gewichtsverlauf.
3. **Speicherung:**
   - `profile.healthConsent = { granted, version, at }` im Profil.
   - Wird mit dem Konto synchronisiert (verschlüsselte Übertragung, Row Level Security).
   - Vor der Kontoerstellung liegt alles im verschlüsselten Onboarding-Entwurf auf dem Gerät.
4. **Durchsetzung in der Datenschicht** (`src/domain/mutations.ts`, getestet in `src/domain/consent.test.ts`):
   - Ohne gültige Einwilligung werden Gesundheitsfelder beim Onboarding und bei Profiländerungen verworfen.
   - Gewichtseinträge werden abgelehnt, auch wenn Prime sie vorschlägt.
   - Prime erhält Allergien, besondere Anforderungen und den Gesundheitscheck-Hinweis nur mit **beiden** Einwilligungen.
5. **Widerruf:**
   - Profil → Datenschutz → „Gesundheitsdaten“ ausschalten.
   - Danach Bestätigung → Löschen von Körperangaben, Gewicht und Gewichtsverlauf, Zielgewicht, Gesundheitscheck, Allergien und Anforderungen, Kalorienrahmen und Wasser-Richtwert, auf dem Gerät und per Sync im Konto.
   - Name, Ziele, Ernährungsform, Einträge und Abo bleiben.
   - Erneut einwilligen ist jederzeit möglich.
6. **Versionierung:**
   - Ändert sich der Text wesentlich, `HEALTH_CONSENT_VERSION` in `src/domain/consent.ts` erhöhen.
   - Konten mit älterer oder fehlender Antwort werden beim nächsten App-Start einmal gefragt.
   - Bis zur Antwort gilt „keine Einwilligung“; Ablehnen löscht die Gesundheitsangaben.
   - Das betrifft auch die drei bestehenden Konten.

## Texte (Deutsch; EN/TR/ES/FR in `src/i18n/locales/*.json` unter `consent`)
- **Titel:** Deine Gesundheitsangaben
- **Einleitung:** Für deinen persönlichen Plan brauchen wir Angaben, die als Gesundheitsdaten gelten. Dafür bitten wir dich gesondert um deine Einwilligung.
- **Worum es geht:** Körperangabe für die Berechnung, Größe, Gewicht und Gewichtsverlauf, Zielgewicht, deine Antworten im Gesundheitscheck sowie Allergien, Unverträglichkeiten und besondere Ernährungsanforderungen (z. B. halal).
- **Wofür:** Nur um deinen Kalorienrahmen, deine Makros und deinen Wasser-Richtwert zu berechnen, Sicherheitsgrenzen anzuwenden und deine Angaben zwischen deinen Geräten zu synchronisieren. Keine Werbung, kein Verkauf.
- **Wo sie liegen:** Auf deinem Gerät und – sobald du ein Konto hast – in deinem Konto bei unserem Hosting-Anbieter in der EU. An die KI gehen sie nur, wenn du das separat erlaubst; dein Gewicht nie.
- **Freiwillig und jederzeit widerrufbar:** Du kannst PrimeMe auch ohne diese Angaben nutzen – dann ohne persönlichen Kalorienrahmen und ohne Gewichtsverlauf. Den Widerruf findest du unter Profil → Datenschutz; deine Gesundheitsangaben werden dann gelöscht.
- **Checkbox:** Ich willige ausdrücklich ein, dass PrimeMe AI meine oben genannten Gesundheitsangaben für diese Zwecke verarbeitet.
- **Widerruf:** Deine Gesundheitsangaben (…) werden auf diesem Gerät und in deinem Konto gelöscht. Dein persönlicher Kalorienrahmen entfällt. Alles andere bleibt erhalten.

## Offene Punkte für die Rechtsprüfung
- Umfang der Gesundheitsdaten (siehe oben).
- Ob die Erklärung „Wo sie liegen“ vollständig ist: Supabase Inc. als US-Unternehmen; mit KI-Einwilligung gehen Allergien an OpenAI in den USA.
- Aufbewahrung in Backups nach dem Widerruf.
- Nachweisbarkeit: Der Zeitpunkt wird mit dem Profil gespeichert. Ein serverseitiges, unveränderliches Einwilligungsprotokoll gibt es noch nicht. Kann ergänzt werden, falls gefordert.
