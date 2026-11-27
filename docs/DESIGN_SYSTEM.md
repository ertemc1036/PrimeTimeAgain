# PrimeMe AI – Design-System (monochrom)

„Simple like Cal AI. Premium like Apple. Personal like ChatGPT.“ Alle Farben kommen aus `src/theme/index.ts`. Außerhalb des Themes gibt es keine Hex-Farben im Code; nur die Lichttöne der (abgeschalteten) 3D-Szene sind Zahlenwerte.

## Farben

| Token | Wert | Verwendung |
| --- | --- | --- |
| `black` | `#000000` | primäre Buttons, aktiver Tag in der Wochenleiste, dunkle Karten |
| `text` (`ink`) | `#1D1D1F` | Text, Icons, Fortschrittsringe und -balken, Schalter |
| `textSecondary` | `#86868B` | Sekundärtext, inaktive Tab-Icons |
| `graphite` | `#2C2C2E` | dunkle Flächen |
| `gray` | `#AEAEB2` | Text auf Dunkel, tertiär |
| `silver` | `#E5E5EA` | Trennlinien, Ringspuren |
| `background` | `#F5F5F7` | App-Hintergrund |
| `surface` | `#FFFFFF` | Karten, Tab-Bar, Chat und Paywall |
| `card` | `rgba(118,118,128,0.12)` | sekundäre Buttons, Chips, Eingabefelder, Icon-Kreise, Chat-Blasen von Prime (wie iOS-Systemfüllung, funktioniert auf Weiß und Grau) |
| `selected` | `rgba(118,118,128,0.2)` | ausgewählte Optionen (grau mit dunkler Kontur) |
| `primeBackdrop` | `#03010C` | Hintergrund von Primes Renderings |

Babyblau und Neongrün sind vollständig entfernt. Essensfotos behalten ihre natürlichen Farben.

## Regeln

- **Karten:** weiß auf `#F5F5F7`, ohne Rahmen, mit sehr leichtem Schatten. Auf weißen Seiten (Chat, Paywall) bekommen Hinweise die graue Füllung (`Card variant="accent"`).
- **Buttons:** primär schwarz, sekundär hellgrau, Text-Buttons ohne Fläche.
- **Auswahl:** graue Füllung mit dunkler Kontur und schwarzem Haken; haptisches Feedback auf iOS/Android.
- **Fortschritt:** Ringe und Balken in `#1D1D1F` auf `#E5E5EA`.
- **Tab-Bar:** weiß mit Haarlinie, schwarze/graue Icons, kleine Beschriftung; Prime in der Mitte als schwarzer Kreis mit seinem Gesicht.
- **Typografie:** Inter; Überschriften moderat (Heute-Begrüßung 26 pt, Kartentitel 17 pt).

## Was sich auf den Screens geändert hat

- **Heute:**
  - Prime-Card mit der Today-Pose und seiner Tagesnachricht.
  - Fortschritt mit Start, Aktuell und Ziel (freiwillig), Training, Serie und Meilensteinen.
  - Der 3D-Body-Scan ist entfernt.
- **Gym:** dunkler Kopfbereich mit Prime. Die Pose wechselt:
  - trainieren (`gym`);
  - Erfolg nach dem Training (`success`);
  - Ruhetag (`recovery`).
- **Küche:** Kopfbereich „Meine Küche“ mit Prime (`kitchen`), Kalorien und gegessenen bzw. geplanten Mahlzeiten.
- **Prime-Chat:**
  - weißer Hintergrund;
  - ohne Unterhaltung groß Prime (`chat`), in der Unterhaltung nur ein kleiner Avatar;
  - beim Antworten die `thinking`-Pose;
  - Prime-Blasen grau, eigene Nachrichten schwarz.
- **Welcome:** Prime (`welcome`) randlos auf Schwarz, kleinere Wortmarke.
- **Onboarding:** Prime klein bei Schritt 1, Erinnerungen und Abschluss; Auswahl grau, Weiter-Buttons schwarz.
- **Paywall:**
  - weiß, mit Prime;
  - neu sind Links zu Nutzungsbedingungen und Datenschutzerklärung (Pflicht für Abos im App Store);
  - Produkte und Preise unverändert.
- **Profil:** gruppierte Listen wie in den iOS-Einstellungen.
  - Ich: persönliche Daten, Ziele, Ernährung, Essensfenster, Training, Fortschritt.
  - Prime: Gedächtnis, Aktivitäten.
  - Allgemein: Mitteilungen, Sprache, Einheiten.
  - PrimeMe+: Abo, Käufe wiederherstellen (startet die Wiederherstellung direkt).
  - Hilfe & Rechtliches.
  - Konto: Konto, Datenexport, Abmelden, Account löschen.
  - Entfernt: Avatar-Körper, der 3D-Test und der alte Instagram-Link (@minus30.app).
- **3D-Body-Scan:** Der Code ist erhalten, aber per `FEATURES.bodyVisualizer3D = false` (`src/config/features.ts`) abgeschaltet. `/body-journey` führt dann zum Verlauf.
