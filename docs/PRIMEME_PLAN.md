# PrimeMe AI – Analyse und Umsetzungsplan

Branch `claude/primeme-ai` (Basis: `claude/diet9-apple-signin`). Stand: 27.11.2026.

## 1. Was bereits funktioniert und weiterverwendet wird

| Bereich | Stand | Weiterverwendung |
| --- | --- | --- |
| Expo SDK 58, Expo Router, TypeScript, 5 Sprachen (en/de/tr/es/fr) | fertig | unverändert |
| Offline-first-Datenhaltung (`AppStateProvider`, validierte Mutationen, lokale Speicherung) | fertig | Basis für alle Prime-Aktionen |
| Cloud-Sync (Supabase `user_records`, Last-Write-Wins, Outbox, Konto-Wechsel, Zusammenführen) | fertig, getestet | neue Datensammlungen kommen hinzu |
| Konten: E-Mail mit Code, Sign in with Apple, Konto löschen, Datenexport | fertig | unverändert |
| Pro über RevenueCat + Server-Prüfung, Test-Pro, Founders-Plätze | fertig | wird „PrimeMe+“, Produkt-IDs bleiben |
| KI-Anbieter-Schicht (OpenAI oder Claude, nur serverseitig) | fertig | Prime nutzt dieselbe Schicht |
| Prime Vision Basis: Essensfoto → Schätzung → Korrektur → Speichern | fertig | wird von Prime genutzt |
| KI-Coach (Streaming, Kontext nur mit Einwilligung, Sicherheitsregeln) | fertig | wird zu Prime ausgebaut |
| Pläne pro Tag (Mahlzeiten, Aktivität), „Plan Tomorrow“-Routine | fertig | bleibt als Planungsroutine |
| Ernährungs-, Trainings-, Ruhetag-, Gewichts-, Fotolog | fertig | unverändert |
| Journey (Serien, 7-Monats-Programm, Erfolge, Fortschrittsfotos) | fertig | wird erweitert |
| Erinnerungen (lokale Benachrichtigungen, Modi, Pause) | fertig | Basis für proaktives Coaching |
| 3D-Körper-Avatar | fertig (iPhone getestet) | bleibt auf Today |

## 2. Was fehlt oder sich ändert

| Anforderung | Entscheidung |
| --- | --- |
| Name/Marke PrimeMe AI, Prime, PrimeMe+, Neongrün #C5F653 | Anzeigename und Texte ändern; **Bundle ID `com.minus30.app`, URL-Schema und Produkt-IDs bleiben** (sonst neue App im Store bzw. Käufe weg) |
| Maskottchen Prime | Vektor-Platzhalter-Komponente, austauschbar durch deine Bilddatei (`assets/images/prime.png`) |
| Navigation Today · Plan · **Prime** · Journey · Profile | Ernährung und Training ziehen als eigene Seiten unter Today; Prime in der Mitte hervorgehoben |
| Wassertracker | neu (Datenmodell, Sync, Today-Karte) |
| Prime-Agent mit App-Aktionen | neu: Server-Function `prime` liefert Antwort **und** vorgeschlagene Aktionen (streng validiert); die App zeigt jede Aktion als Karte mit Übernehmen / Ändern / Verwerfen; nach dem Übernehmen „Rückgängig“. Nichts wird ohne Bestätigung eingetragen |
| Prime Memory | neu: eigene Erinnerungen (Kategorie + Text), nur nach Bestätigung gespeichert, im Profil einsehbar, bearbeitbar, löschbar; Chatverläufe sind kein Gedächtnis |
| KI-Onboarding im Gespräch | neu; braucht ein Konto (KI läuft nur serverseitig) – ohne Konto bleibt der bisherige Fragebogen als Ausweg |
| Spracheingabe | neu: Aufnahme mit `expo-audio` (in Expo Go enthalten) → Server-Function `transcribe` → Text |
| Kühlschrank/Speisekarte | neu auf Basis der Fotoanalyse |
| Wochenplan Ernährung/Training, Rezepte, Einkaufsliste | neu, als Prime-Aktionen, die Pläne erzeugen (Nutzer bestätigt) |
| Tagebuch (Gedanken, Momente), Check-in, Wochenberichte | neu in Journey |
| Proaktives Coaching | Ausbau der lokalen Erinnerungen (einwilligungsbasiert, pausierbar) |
| Free vs. PrimeMe+ | Free: Basisfunktionen + begrenzte Prime-Nachrichten; PrimeMe+: Memory, Sprache, Foto-KI, Pläne, Berichte |
| Später: Prime Muscle / Mind / Performance / Maintenance | Programm-Feld im Profil vorbereitet, nicht umgesetzt |

## 3. Datenbank

Neue Datensammlungen im bestehenden Sync (`user_records`): `water`, `memory`, `primeAction` (Aktionsprotokoll für Rückgängig) und später `journal`, `checkin`, `shopping`.
Die Datenbank erlaubt bisher nur feste Sammlungsnamen. Deshalb ist eine **kleine, nicht-destruktive Migration** nötig: `20261127000000_primeme_collections.sql` erweitert nur die erlaubte Liste, es werden keine Daten verändert.
Reihenfolge beim Veröffentlichen: Migration und Functions **vor** der neuen App-Version (alte Server würden neue Sammlungen ablehnen; die App zeigt dann „nicht synchronisiert“, verliert aber nichts).

## 4. Phasen

| Phase | Inhalt | Status |
| --- | --- | --- |
| 0 | Analyse, Plan | erledigt |
| 1 | Marke, Farben, Prime-Maskottchen, neue Navigation, Profil-Tab | erledigt |
| 2 | Wassertracker + neue Sync-Sammlungen + Migration (vorbereitet) | erledigt (Migration nicht live) |
| 3 | Prime-Agent: Chat-Tab, Server-Function `prime`, validierte Aktionen, Bestätigen/Ändern/Rückgängig, Prime Memory, Nutzungsgrenzen Free/Plus | erledigt |
| 4 | KI-Onboarding im Gespräch (nach Konto-Erstellung), Planvorschlag mit Bestätigung | offen |
| 5 | Prime Voice: Aufnahme + Transkription, im Chat und Onboarding | offen |
| 6 | Prime Vision: Rückfragen bei unklaren Fotos, Kühlschrank/Speisekarte | offen |
| 7 | Wochenplanung: Ernährungs-/Trainingsplan, Rezepte, Einkaufsliste | offen |
| 8 | Journey: Tagebuch, Check-ins, Wochen-/Monatsberichte | offen |
| 9 | Proaktives Coaching (Morgenplanung, Wasser, Wochenrückblick, Wiedereinstieg) | offen |
| 10 | Store-Vorbereitung: Name/Icon/Screenshots, Datenschutztexte, Review-Notizen, RevenueCat-Produkte „PrimeMe+“ | offen |

## 5. Umgesetzt in Phase 1–3 (technisch)

- **Prime-Function** `supabase/functions/prime`: Sitzung prüfen → Tarif serverseitig (PrimeMe+ = bestehendes Pro/Founders/Test) → Limit (Free 8/Tag, PrimeMe+ 80/Tag, plus globale Kostenbremse) → KI (OpenAI oder Claude über die bestehende Anbieter-Schicht, strukturierte Ausgabe) → Validierung mit demselben zod-Schema wie in der App → unvollständige Aktionen werden verworfen, „remember“ nur mit PrimeMe+.
- **Aktionen** (`src/domain/primeActions.ts`): Wasser, Mahlzeit (Nährwerte als Schätzung markiert, unbekannte Werte bleiben leer), Training, Ruhetag, Gewicht, Erinnerung. Bestätigen speichert alles einer Aktion atomar (`batch`) plus Protokolleintrag; Rückgängig löscht genau diese Einträge. Bestehende Regeln (Bearbeitungsfenster, Doppel-Trainings) gelten auch für Prime.
- **Datenschutz:** Prime sieht App-Daten nur mit Einwilligung (bestehender Schalter), keine Gewichtsdaten, keine Fotos; Gedächtnis nur mit Einwilligung und PrimeMe+.
- **Sync:** neue Sammlungen `water`, `memory`, `primeAction`; Server validiert sie.

## 6. Nächste Phasen im Detail

- **Phase 4 – KI-Onboarding:** Nach „Los geht's“ und 18+-Bestätigung Konto anlegen (Apple/E-Mail), dann Gespräch mit Prime. Neue Function-Modus `onboarding` mit Schema „extrahierte Profilfelder + nächste Frage“; die App zeigt gesammelte Angaben als bearbeitbare Liste; Abschluss: Planvorschlag (Wasserziel, Mahlzeitenstruktur, Aktivität, Erinnerungszeiten) mit Bestätigung → bestehende `completeOnboarding`-Mutation. Ohne Konto/Cloud bleibt der bisherige Fragebogen.
- **Phase 5 – Voice:** `expo-audio` (in Expo Go enthalten) für Aufnahme, neue Function `transcribe` (OpenAI-Transkription, Audio max. 60 s, nur PrimeMe+), Mikrofon-Taste im Prime-Chat und im Onboarding. App-Konfiguration: Mikrofon-Berechtigungstext (bisher bewusst deaktiviert).
- **Phase 6 – Vision:** Rückfragen bei unklaren Fotos im Chat; Kühlschrank/Speisekarte → Mahlzeitenvorschläge.
- **Phase 7 – Pläne:** Prime-Aktionen „Wochenplan erstellen“ (schreibt Tagespläne nach Bestätigung), Rezepte, Einkaufsliste (neue Sammlung `shopping`).
- **Phase 8 – Journey:** Tagebucheinträge (Gedanken, Momente, Fotos privat), freiwilliger Check-in, Wochen-/Monatsbericht von Prime.
- **Phase 9 – Proaktives Coaching:** Morgenplanung, Wasser, Wochenrückblick, Wiedereinstieg – auf Basis der bestehenden Erinnerungs-Engine, einzeln schaltbar.
