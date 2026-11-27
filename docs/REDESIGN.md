# PrimeMe AI – Redesign (Farben, Tabs, Dashboard, Body-Scan)

Branch `claude/primeme-redesign` (Basis: `claude/primeme-ai`). Stand: 27.11.2026.
Bestehende Daten, Speicherung, Sync, Mutationen und die Prime-/KI-Logik sind unverändert. Es gibt keine Datenbank-Migration.

## Farben (`src/theme/index.ts`)

| Token | Wert | Verwendung |
| --- | --- | --- |
| `primary` | `#8EC5FF` | Akzente, Fortschrittsringe, Balken, ausgewähltes Segment |
| `primaryLight` | `#D9EEFF` | Icon-Hintergründe, Pillen |
| `primarySoft` | `#F3F9FF` | Prime-Karte, Hinweis- und Morgen-Karten, erledigte Missionen |
| `primaryDeep` | `#3E8EE6` | Akzent-Text und Icons auf Weiß (lesbarer als `#8EC5FF`) |
| `black` / `darkGray` | `#0B0B0F` / `#1A1A22` | Text, Buttons, Prime-Symbol, Serien-Karte, Body-Scan |
| `mediumGray` / `lightGray` | `#6E6E78` / `#EAEAF0` | Sekundärtext, Linien |
| `white` | `#FFFFFF` | Hintergrund, Karten |

Neu sind die Kartenvarianten `elevated` (weiß, weicher Schatten) und `accent` (hellblau). Das Neongrün wurde überall entfernt.

## Tabs

**Heute · Gym · Prime · Küche · Profil.** Prime sitzt in der Mitte als größeres schwarzes Symbol (`PrimeBadge`).

- **Gym** (`(tabs)/gym.tsx`, vorher `/workout`):
  - Status „trainiert / noch nicht / Ruhetag“ mit Art und Minuten;
  - geplantes Training;
  - Eintragen inklusive Foto-Check-in;
  - Übersicht der letzten 7 Tage (Balken, Einheiten nach Trainingsart);
  - Training für morgen, Verlauf.
- **Küche** (`(tabs)/kitchen.tsx`, vorher `/food`):
  - Kalorien des Tages, gegessene und noch geplante Mahlzeiten;
  - Eintragen und KI-Scan;
  - geplante Mahlzeiten mit „Diese Mahlzeit eintragen“;
  - Nährwerte, Tagebuch abschließen;
  - Mahlzeiten für morgen planen, Verlauf.
- **Plan** (`/plan`) und **Verlauf/Journey** (`/journey`) sind weiterhin erreichbar:
  - über Heute, Gym, Küche und Profil („Fortschritt & Verlauf“);
  - alte Links `/food` und `/workout` leiten weiter.
- Erinnerungen öffnen jetzt Küche bzw. Gym.
- Das grüne Maskottchen ist entfernt. Platzhalter ist `src/features/prime/PrimeBadge.tsx`; das finale Prime-Design wird nur dort eingesetzt.

## Heute (Dashboard)

Reihenfolge auf dem Bildschirm:
1. Begrüßung mit Tagesstatus
2. Prime-Hinweis (helle Karte)
3. Kennzahlen: Kalorien, Wasser, Training
4. Tagesmission mit den drei automatischen Aufgaben
5. Body-Scan
6. Wasser
7. Zusammenfassung Küche: kcal, Makros, noch Geplantes
8. Zusammenfassung Gym
9. Serie (einzige dunkle Karte) und Kalender
10. Fortschritt & Verlauf

Die Zahlen kommen aus `src/domain/daySummary.ts` (reine Funktionen, getestet).

## Body-Scan

**Farben:** Schwarz, Graphit-Körper und ruhiges Babyblau statt Neon. Geändert in `HOLO` (`src/avatar/hologram.ts`), dem Licht in `stage.ts` und in `BodyHero`.

**Gewichtsabhängigkeit:** `src/domain/bodyScan.ts` berechnet `fullness`: 0 = Zielform, 1 = Startform.

1. **Mit Start- und Zielgewicht** (Abnehmziel): Position des aktuellen Gewichts zwischen beiden.
2. **Sonst, mit Körpergröße:** BMI 21 → 0, BMI 32 → 1. Dient nur der Darstellung; der BMI wird nie angezeigt.
3. **Ohne Daten:** Startform.
4. **Glättung:** Gerundet in 5-%-Schritten, damit kleine Tagesschwankungen den Körper nicht springen lassen.

**Anzeige:** Die Ansicht „Aktuell“ ist voreingestellt (Segment Start · Aktuell · Ziel). `AvatarViewer`/`buildAvatar` nehmen dafür jetzt neben `'start' | 'goal'` auch eine Zahl. Der Übergang ist weiterhin animiert.

**Erweiterung:** Weitere Körperformen (z. B. muskulöser) wären zusätzliche Morph-Ziele im GLB. `BodyScanState` würde dann ein Gewicht pro Ziel tragen.

## Prüfungen

- `npx tsc --noEmit`: ohne Fehler.
- `npx expo lint`: 0 Fehler, 2 bestehende Warnungen.
- `npx jest`: 159 Tests bestanden. Neu sind `bodyScan.test.ts` und `daySummary.test.ts`.
- iOS-Export (`expo export --platform ios`) baut.
- Web-Durchlauf mit Screenshots: Onboarding, Heute leer/befüllt, Gym mit Eintrag, Küche, Profil, Prime.
- Nicht auf dem iPhone getestet: Den Body-Scan bitte dort prüfen (Licht und Farben auf echtem GPU).

## Offene Punkte

- Referenz-Screenshot ist nicht angekommen.
- Finales Prime-Design: austauschen in `PrimeBadge.tsx`.
- Muskelgruppen pro Training gibt es im Datenmodell nicht; aktuell wird nach Trainingsart gruppiert. Für Muskelgruppen bräuchte es ein neues Feld in `ActivityLog` und im Sync.
- App-Icon und Splash-Bild sind noch die alten Bilddateien.
- Migration und Functions aus Phase 1–3 sind weiterhin per CLI einzuspielen (siehe `docs/PRIMEME_PLAN.md`).
