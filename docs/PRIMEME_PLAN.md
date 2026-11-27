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
| 1 | Marke, Farben, Prime-Maskottchen, neue Navigation, Profil-Tab | in Arbeit |
| 2 | Wassertracker + neue Sync-Sammlungen + Migration (vorbereitet) | in Arbeit |
| 3 | Prime-Agent: Chat-Tab, Server-Function `prime`, validierte Aktionen, Bestätigen/Ändern/Rückgängig, Prime Memory, Nutzungsgrenzen Free/Plus | in Arbeit |
| 4 | KI-Onboarding im Gespräch (nach Konto-Erstellung), Planvorschlag mit Bestätigung | offen |
| 5 | Prime Voice: Aufnahme + Transkription, im Chat und Onboarding | offen |
| 6 | Prime Vision: Rückfragen bei unklaren Fotos, Kühlschrank/Speisekarte | offen |
| 7 | Wochenplanung: Ernährungs-/Trainingsplan, Rezepte, Einkaufsliste | offen |
| 8 | Journey: Tagebuch, Check-ins, Wochen-/Monatsberichte | offen |
| 9 | Proaktives Coaching (Morgenplanung, Wasser, Wochenrückblick, Wiedereinstieg) | offen |
| 10 | Store-Vorbereitung: Name/Icon/Screenshots, Datenschutztexte, Review-Notizen, RevenueCat-Produkte „PrimeMe+“ | offen |
