# PrimeMe AI – Onboarding

Code: `src/features/onboarding/flow/`, eine Route: `src/app/(onboarding)/welcome.tsx`. Plan-Logik: `src/domain/plan.ts` (getestet).

## Ablauf (29 Bildschirme + Gesundheitscheck bei „Abnehmen“; Referenz = Cal-AI-Screenshot-Nummer)

| # | Schritt | Ref. | Hinweis |
| --- | --- | --- | --- |
| 1 | Welcome | 01 | Echte PrimeMe-Screens im Phone-Mockup, als „Beispielansicht“ gekennzeichnet; Sprache, Anmelden |
| 2 | Name | – | für Prime und das Profil (nötig) |
| 3 | Körperangabe für die Berechnung | 02 | weiblich / männlich / nicht angeben; erklärt, dass es nicht um Identität geht; ohne Angabe **kein** Kalorienrahmen |
| 4 | Workouts pro Woche | 03 | bisherige Aktivität, keine Vorgabe |
| 5 | Geburtsdatum | 04 | Wheel-Picker, Reihenfolge je Sprache; unter 18 → Hinweisseite; gespeichert wird nur das Geburtsjahr |
| 6 | Herkunft | 05 | freiwillig, nur eigene Statistik |
| 7 | Andere Apps | 06 | Ja / Nein |
| 8 | Kleine Schritte | 07 | eigene Grafik, keine Statistiken |
| 9 | Größe | 08 | Wheel-Picker cm / ft in, alternativ Wert eingeben |
| 10 | Gewicht | 09 | horizontale Skala 0,1 kg / 0,2 lbs, Einheitenwechsel ohne Wertverlust, alternativ Wert eingeben |
| 11 | Trainer / Ernährungsberatung | 10 | Ja / Nein |
| 12 | Ziel | 11 | Abnehmen, Gewicht halten, Fitter werden (Muskelaufbau erst, wenn unterstützt) |
| 12a | Gesundheitscheck | – | nur bei „Abnehmen“: schwanger/stillend, Essstörung (aktuell/früher), relevante Erkrankung, Medikamente, nichts davon. Bei einer Angabe: kein Zielgewicht, kein Tempo, kein Defizit, Hinweis im Plan |
| 13 | Zielgewicht | 12 | nur bei „Abnehmen“; muss unter dem aktuellen Gewicht liegen; unter BMI 18,5 nicht möglich; Hinweis bei > 30 % |
| 14 | Zielbotschaft | 13 | tatsächliche Differenz, keine Garantie |
| 15 | Tempo | 14 | Behutsam / Ausgewogen / Individuell; Sicherheitsgrenzen; Orientierung als Spanne |
| 16 | Prime als Begleiter | 15 | echte Funktionen, Prime-Bild |
| 17 | Herausforderungen | 16 | Mehrfachauswahl, freiwillig |
| 18 | Ernährungsform | 17 | Einfachauswahl |
| 19 | Besondere Anforderungen | 17 | Halal, laktosefrei, glutenfrei, Nussallergie – eigener kompakter Schritt |
| 20 | Persönliche Motivation | 18 | Mehrfachauswahl |
| 21 | Jeder Schritt zählt | 19 | Gewohnheits-Meilensteine, als Illustration gekennzeichnet |
| 22 | Danke | 20 | Prime (Daumen hoch), Datenschutz-Hinweis, **freiwillige** Einwilligung für Primes Datenzugriff |
| 23 | Plan wird erstellt | 21 | echte Rechenschritte, ca. 2 s, kein „metabolisches Alter“ |
| 24 | Plan | 22 | Ziel, Start-/Zielgewicht, Orientierung als Schätzung, „Angaben bearbeiten“ |
| 25 | Tägliche Empfehlung | 22 | kcal + Makros + Wasser; ohne Körperangaben ehrlicher Hinweis statt Zahlen |
| 26 | Alltag | 23–24 | Training, Ernährung, zwei Tagesaufgaben, Planen freiwillig; keine erfundenen Nutzerzahlen |
| 27 | PrimeMe+ Beta | 25–27 | ersetzt die Abo-Seiten; nur im Build-Profil `beta` (`EXPO_PUBLIC_BETA_ALL_USERS_PRO=1`) **und** solange der Server die Beta meldet |
| 28 | Konto erstellen | – | E-Mail + Passwort, Sign in with Apple (iOS), „Anmelden“; **keine Bestätigungs-E-Mail**, sofort angemeldet; Fehler in der App-Sprache; Antworten bleiben erhalten |
| 29 | Willkommen | – | wartet auf die erste Synchronisierung, zeigt „PrimeMe+ Beta ist aktiv“, dann Dashboard. Ohne Beta (Modus B/C): einmal das PrimeMe+-Angebot, „Mit PrimeMe Free fortfahren“ möglich |

## Plan-Berechnung (`computePlan`)

- **Energiebedarf:** Mifflin-St Jeor × Aktivitätsfaktor.
  - Aktivitätsfaktor nach Workouts pro Woche: 0 → 1,2; 1–2 → 1,375; 3–5 → 1,55; 6+ → 1,725.
- **Abnehmen:** Defizit nach Tempo (0,25 / 0,5 / 0,75 kg pro Woche), begrenzt auf:
  - höchstens 25 % des Bedarfs;
  - höchstens 1 % des Körpergewichts pro Woche;
  - nie unter 1.200 kcal (weiblich) bzw. 1.500 kcal (männlich). Liegt der Bedarf selbst darunter, gibt es kein Defizit.
  - Bei einem ungesunden Zielgewicht wird gar kein Defizit eingeplant.
  - Bei einer Angabe im Gesundheitscheck (Schwangerschaft/Stillzeit, Essstörung, Erkrankung, Medikamente) ebenfalls nicht; Prime erhält mit Einwilligung nur `noCalorieDeficit`, nicht den Grund.
- **Makros:**
  - Protein 1,6 g pro kg eines gesunden Referenzgewichts (höchstens BMI 25);
  - Fett 30 % der Kalorien;
  - Kohlenhydrate als Rest.
- **Wasser:** 30 ml pro kg, begrenzt auf 1,5–3 l, als Richtwert.
- **Fachliche Prüfung:** Alle Werte müssen vor einer kommerziellen Veröffentlichung von einer Ernährungsfachkraft geprüft werden.

## Daten und Datenschutz

- **Zwischenspeicherung:**
  - Der Entwurf liegt verschlüsselt im iOS-Schlüsselbund bzw. Android-Keystore (`expo-secure-store`).
  - Ein Neustart setzt beim letzten Schritt fort.
  - Der Entwurf wird gelöscht, sobald ein Profil existiert.
- **Keine KI vor dem Konto:** Vor der Registrierung gibt es keinen Server- und keinen KI-Aufruf. Der Plan wird lokal berechnet.
- **Nach der Registrierung:**
  1. Erst nach der ersten Synchronisierung des Kontos wird das Profil geschrieben.
  2. Hat das Konto schon ein Profil, wird es nur geladen, nie überschrieben.
- **Prime-Daten:** Prime nutzt die Antworten nur mit der freiwilligen Einwilligung (Profil → Datenschutz). Gewicht bleibt ausgeschlossen.
- **Profil-Bearbeitung:** Änderungen unter Profil → Persönliche Daten / Ziele berechnen den Kalorienrahmen mit denselben Regeln neu.

## Tests

- **Jest:** `src/domain/plan.test.ts`, 9 Tests: Formel, Defizit-Grenzen, Untergrenze, ungesundes Ziel, fehlende Körperdaten, Makros, Wasser, 18+-Prüfung auf den Tag.
- **Browser, 390 × 844, Deutsch:** alle 29 Schritte durchlaufen; Screenshots verglichen.
- **Browser, 375 × 667:** Englisch, Türkisch, Spanisch, Französisch; keine abgeschnittenen Texte.
- **Live gegen das Beta-Backend**, neues Konto, danach in der App gelöscht:
  - Onboarding → Registrierung → erste Synchronisierung → „PrimeMe+ Beta ist aktiv“ → Dashboard mit persönlichem Kalorienrahmen;
  - echter Prime-Chat mit Vorschlägen und Speichern;
  - Training eintragen;
  - Konto-Löschung.

## Noch auf einem echten iPhone zu testen

- Haptik, Schwung der Picker und Skala, Tastatur bei Name und Konto.
- Sign in with Apple, Wiederaufnahme nach App-Neustart.
- „Bewegung reduzieren“ und große Schriftgrößen.
- Anzeige der WebP-Bilder.
