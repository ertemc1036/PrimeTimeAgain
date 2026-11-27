# PrimeMe AI – Master-Redesign: Analyse und Umsetzungsplan

Branch `claude/primeme-redesign`. Stand: 27.11.2026.
Grundlage ist dein Master-Briefing (20 Abschnitte). Diese Datei ist die laufende Übersicht. Sie hält fest, was es gibt, was fehlt, was in welcher Phase passiert und was erledigt ist.

## Phase 1 – Repository-Audit

### Technik

| Bereich | Stand |
| --- | --- |
| Basis | Expo SDK 58, React Native 0.88, TypeScript strict, Expo Router (typed routes) |
| Sprachen | i18next, 5 Sprachen; ein Test prüft, dass alle Sprachen dieselben Schlüssel haben |
| Daten | Offline-first `AppStateProvider` mit validierten Mutationen, lokal gespeichert (AsyncStorage / SecureStore) |
| Sync | Supabase `user_records`: Last-Write-Wins, Outbox, Konto-Wechsel, Zusammenführen |
| Konten | E-Mail mit Code, Sign in with Apple, Konto löschen, Datenexport |
| Datenbank | 4 Migrationen; RLS auf allen Tabellen; privater Bucket für Trainingsfotos |
| KI | nur serverseitig (Edge Functions `prime`, `coach`, `food-scan`, `workout-photo`); Anbieter-Schicht für OpenAI oder Claude; Tageslimits und globale Kostenbremse |
| Prime-Agent | Strukturierte, mit zod validierte Aktionen: Wasser, Mahlzeit, Training, Ruhetag, Gewicht, Erinnerung. Bestätigen speichert atomar mit Protokoll, „Rückgängig“ löscht genau diese Einträge. Prime Memory mit Kategorien, einsehbar, bearbeitbar, löschbar |
| Abo | RevenueCat (`react-native-purchases`) und serverseitige Prüfung (`entitlement`, `revenuecat-webhook`), Founders-Plätze, Test-Pro. Produkt-IDs `minus30_pro_*` bleiben |
| 3D | three.js auf expo-gl; 3 Körpermodelle (GLB) mit Start- und Zielform als Morph |
| Tests | Jest 167 (Domain, Sync, Schemas, Sicherheit, Übersetzungen), Server-Tests gegen lokalen Stack, Web-E2E-Skripte |
| Sicherheit | Keine Schlüssel im Client; Sicherheitsregeln im Prime-Prompt; Zielgewicht-Untergrenze (BMI) |

### Was fehlt oder überarbeitet werden muss

| Anforderung aus dem Briefing | Stand vorher | Phase |
| --- | --- | --- |
| Neue Farbpalette, zentrale Tokens, keine Neonfarben | teils (erste Babyblau-Version) | **2 – erledigt** |
| PrimeAvatar-Komponente (austauschbar, Animation) | Platzhalter-Badge | **2 – erledigt** |
| Tabs Heute · Gym · Prime · Küche · Profil | erledigt im letzten Schritt | **3 – erledigt** |
| Heute als Dashboard mit Wochenleiste, Briefing, Ernährung, Makros, Wasser, Training, Mahlzeiten, Fortschritt, Body Journey, Planung | teilweise | **3 – erledigt** |
| Onboarding: eine Frage pro Bildschirm, 20 dynamische Fragen, Zwischenspeichern, Plan-Erstellung, Plan bestätigen | 7 Schritte, mehrere Felder pro Bildschirm | 4 |
| Energiebedarf und Makro-Rahmen | fehlt (nur Wasserziel) | 4 (Berechnung + Sicherheitsregeln; fachliche Prüfung vor Release nötig) |
| Gym: Übungen, Muskelgruppen, Sätze/Wdh./Gewicht, Workout-Modus mit Pausentimer, Trainingsplan | nur Trainingsart und Dauer | 5 (neue Sync-Sammlung → kleine Migration) |
| Küche: Mahlzeiten austauschen, Lieblingsgerichte, Rezepte, Einkaufsliste, Kühlschrank (vorbereitet) | Eintragen, Planen, KI-Scan, gespeicherte Mahlzeiten | 5 |
| Prime: Mikrofon, Foto-Upload im Chat, weitere Aktionen (Wochenzusammenfassung, Pläne, Einkaufsliste, Präferenzen) | Chat, Kamera-Link, 6 Aktionen | 6 |
| Prime Voice (Aufnahme → Transkription → Korrektur → Senden) | fehlt; Mikrofon in `app.json` bewusst blockiert | 6 (`expo-audio`, neue Function `transcribe`, Berechtigung erst dann freigeben) |
| Body Journey: kompakte Vorschau, Detailansicht, Gewicht ausblendbar, „illustrativ“ statt „Scan“ | großer Body Scan auf Heute | **3/7 – Grundlage erledigt**, Rest 7 (Körpermaße, Architektur für Proportionen) |
| Journey: Wochen-/Monatsberichte, Notizen, Erfolge über das Gewicht hinaus | Serien, Gewicht, 7-Monats-Programm, Meilensteine, Fotos | 7/8 |
| Proaktives Coaching (Morgens/Mittags/Abends, Wochenrückblick, Comeback) | lokale Erinnerungen mit Modi und Pause | 8 |
| Paywall nach Briefing (monatlich + jährlich, transparent) | Paywall vorhanden, Jahresabo vorbereitet | 8 |
| Profil: Ziele, Ernährungs-/Trainingspräferenzen, Coaching-Stil, Abmelden | teils | 4/8 |

## Was in diesem Schritt umgesetzt wurde (Phase 2 und 3)

**Design-Fundament (Phase 2)**
- **Farbpalette:** deine Werte (`#A8D8FF`, `#E1F1FF`, `#F2F8FD`, `#F7F9FC`, `#101114`, `#737780`, `#E7EBF0`, `#111111`) als Tokens in `src/theme/index.ts`.
  - Zusätzlich gibt es `primaryDeep #2C74BE` für Text und kleine Icons auf Weiß. Babyblau selbst ist dafür zu hell (Kontrast).
  - Die dunkle 3D-Bühne hat eigene Tokens (`stage`).
- **Keine fest eingetragenen Farben mehr:** Außerhalb des Themes steht keine Hex-Farbe mehr im Code. Nur die Lichttöne der 3D-Szene sind Zahlenwerte.
- **Neues Kartensystem:** heller App-Hintergrund mit weißen Karten, dezentem Rand und Schatten.
- **Komponenten:**
  - Auswahlkarten und Chips sind ausgewählt babyblau mit dunkler Kontur; ein haptisches Feedback war schon vorhanden.
  - Segment-Schalter sind weiß auf Grau.
  - Fortschrittsringe und -balken sind babyblau.
  - Schalter sind babyblau; Eingabefelder bekommen beim Fokus einen blauen Rand.
  - Ladeindikatoren sind blau.
- **`PrimeAvatar`** (`src/features/prime/PrimeAvatar.tsx`):
  - schwarzer Kreis mit weißem Symbol;
  - kurzes „Hallo“-Antippen-Animation, wenn der Prime-Tab geöffnet wird;
  - sanftes Atmen, solange Prime antwortet;
  - respektiert „Bewegung reduzieren“;
  - dein Maskottchen kommt später an einer Stelle hinein (`PRIME_ARTWORK`).

**Navigation und Dashboard (Phase 3)** – Heute zeigt von oben nach unten:
1. Begrüßung, Datum, Profil-Kreis.
2. **Wochenleiste:**
   - Heute ist babyblau.
   - Vergangene Tage zeigen ihre Einträge und einen Punkt, wenn es Daten gibt.
   - Zukünftige Tage (bis 6 Tage) öffnen die Planung und werden nie als erledigt angezeigt.
3. **Prime-Briefing:** aus echten Daten (`src/domain/briefing.ts`, getestet), ohne KI-Aufruf und ohne erfundene Inhalte.
4. **Ernährung:**
   - Kalorien mit Ring, sobald ein bestätigter Rahmen existiert (`profile.targets`, kommt mit dem Onboarding-Plan).
   - Ohne Rahmen erscheinen nur die erfassten Werte.
   - „Mahlzeit eintragen“; für gestern „Nachtragen“.
5. **Makros:** Eiweiß, Kohlenhydrate, Fett. Unbekannte Werte erscheinen als „–“, nicht als 0.
6. **Wasser:** heute mit Schnellbuttons und Korrektur, an anderen Tagen nur lesend.
7. **Training:** Status, Art, Dauer, Ruhetag, geplant; „Zum Gym“.
8. **Mahlzeiten:** gegessen und geplant klar getrennt; „Zur Küche“.
9. **Fortschritt:** Gewicht mit 7-Tage-Veränderung (ausblendbar), Trainings der Woche, Serie, Meilensteine; führt zur Journey.
10. **Body Journey:** nur eine kompakte Vorschau. Die neue Detailseite `/body-journey` enthält:
    - das 3D-Modell;
    - Links zu Gewicht, privaten Fotos und Avatar;
    - den Schalter **„Gewicht und Körperdarstellung anzeigen“** (gilt auch für Heute und Journey).
11. **Planungsroutine** „Plan Tomorrow. Complete Today.“ mit den drei Tagesaufgaben.

Außerdem:
- Der Serienkalender ist in die Journey umgezogen.
- Der Plan-Editor kann direkt einen bestimmten Tag öffnen (`/plan?date=`).
- Die Paywall zeigt ausschließlich Store-Preise (RevenueCat → App Store). Referenzpreise Deutschland: 9,99 € pro Monat, 69,99 € pro Jahr (in App Store Connect hinterlegt, nicht im Code).

## Nächste Phasen (Reihenfolge)

1. **Phase 4 – Onboarding:**
   - Ablauf mit einer Frage pro Bildschirm, ein Fragen-Modell mit Bedingungen;
   - Zwischenspeichern;
   - Planberechnung als reine, getestete Funktion: Energiebedarf nach Mifflin-St Jeor, begrenztes Defizit, Untergrenzen;
   - bei Gesundheitsangaben keine automatischen Empfehlungen;
   - Lade-Ansicht mit echten Schritten, Plan prüfen, bearbeiten und bestätigen, danach Konto und PrimeMe+.
2. **Phase 5 – Gym und Küche:**
   - Übungen und Sätze (neue Sync-Sammlung, nicht-destruktive Migration), Workout-Modus mit Pausentimer;
   - Lieblingsgerichte, Einkaufsliste, Mahlzeit austauschen.
3. **Phase 6 – Prime:**
   - Voice: `expo-audio`, Function `transcribe`, Mikrofon-Berechtigung;
   - Foto im Chat;
   - neue Aktionen: Wochenzusammenfassung, Plan, Einkaufsliste, Präferenzen, Training mit Übungen.
4. **Phase 7 – Body Journey:** freiwillige Körpermaße, Architektur für Proportionen, Wochen-/Monatsberichte.
5. **Phase 8 – Premium und Coaching:** Paywall mit Monats- und Jahresabo, Limits, proaktive Check-ins, Comeback.
6. **Phase 9/10:** Qualität, Sicherheit, Release-Übersicht.

## Offene Punkte und Grenzen

- **Ernährungs- und Coaching-Regeln** müssen vor einer kommerziellen Veröffentlichung fachlich geprüft werden (Ernährungsfachkraft, Ärztin oder Arzt).
- **Datenschutz:** Eine DSGVO-Konformität ist nicht geprüft und wird nicht behauptet.
- **Live-Stand:** Migration und Functions aus Phase 1–3 sind noch nicht live; sie werden per CLI eingespielt, siehe `docs/PRIMEME_PLAN.md`.
- **App-Icon und Splash-Bild** sind noch die alten Bilder.
