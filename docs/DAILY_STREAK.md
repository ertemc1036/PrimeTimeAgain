# Tagesabschluss und Serie

Einzige Quelle ist `src/domain/completion.ts` (`dayChecks`, `streakStats`, `calendarStatus`, `journeyStats`). Alles andere liest daraus:
- Heute-Dashboard, Serienkalender, Verlauf und Statistiken;
- Meilensteine (`achievements.ts`), Erinnerungen (`reminders.ts`);
- Prime-Briefing (`briefing.ts`) und Prime-Kontext (`coachContext.ts`).

## Regel (neu)

Ein Tag ist **abgeschlossen**, wenn beide Aufgaben erledigt sind:

| Aufgabe | erledigt, wenn | Status in der App |
| --- | --- | --- |
| **Ernährung** | mindestens eine Mahlzeit eingetragen **und** das Ernährungstagebuch für den Tag abgeschlossen | Noch offen → In Bearbeitung (Mahlzeiten da, nicht abgeschlossen) → Abgeschlossen |
| **Aktivität** | ein Training bzw. eine Aktivität (manuell, über Prime oder mit Foto) **oder** ein Ruhetag | Noch offen → Training abgeschlossen / Ruhetag eingetragen |

- **Fortschritt:** 0 von 2 = 0 %, 1 von 2 = 50 %, 2 von 2 = 100 %. Bei 100 % schließt sich der Ring, ein Haken erscheint, und Prime sagt: „Stark! Du hast deinen heutigen Tag abgeschlossen. Bis morgen!“
- **Morgen planen ist freiwillig.** Es zählt nicht, blockiert nichts und wird nie als offene Aufgabe angezeigt.
  - Auf Heute gibt es nur eine Zeile „Morgen planen · Optional – zählt nicht zur Serie“.
  - Die Planungserinnerung bleibt einstellbar und abschaltbar.
- **Was nicht bewertet wird:** Lebensmittel, Kalorien und Gewicht spielen für die Serie keine Rolle.
- **Fotos** sind nie Pflicht.
- **Nachtragen:** Einträge für gestern können bis heute 23:59 nachgetragen oder korrigiert werden (unverändert).

## Umgang mit historischen Daten

- **Nichts wird gespeichert, alles berechnet:** Abschlüsse werden nicht abgelegt. Sie werden bei jeder Anzeige aus den gespeicherten Einträgen berechnet (Mahlzeiten, Tagebuch-Abschluss, Trainings, Ruhetage).
- **Keine Migration nötig, keine Daten verändert.** Die neue Regel gilt automatisch auch rückwirkend.
- **Was das für frühere Tage heißt:**
  - Tage, die vorher abgeschlossen waren (3 von 3), bleiben abgeschlossen. Die neue Regel verlangt eine Teilmenge davon.
  - Tage, denen nur die Planung fehlte, zählen jetzt ebenfalls als abgeschlossen. Aktuelle und längste Serie können dadurch steigen, nie sinken.
  - Bereits erreichte Meilensteine bleiben gespeichert. Neue können freigeschaltet werden, wenn die neu gewerteten Tage sie erreichen.
- **Keine doppelte Wertung:** Ein Tag zählt höchstens einmal, egal wie viele Trainings, Ruhetage oder erneute Abschlüsse es gibt. Die Serie wird über eindeutige Kalendertage berechnet.
- **Datum:** Tage sind lokale Kalenderdaten (`YYYY-MM-DD`). Mitternacht, Zeitzonen und Zeitumstellung teilen keinen Tag.

## Tests (`src/domain/engine.test.ts`)

**Neue Fälle:**
- Nur Ernährung → nicht abgeschlossen.
- Nur Aktivität → nicht abgeschlossen.
- Mahlzeiten ohne Tagebuch-Abschluss → „In Bearbeitung“.
- Ernährung + Training → abgeschlossen.
- Ernährung + Ruhetag → abgeschlossen.
- Ernährung + Aktivität ohne Planung → abgeschlossen.
- Nur Planung → nicht abgeschlossen, Serie 0.
- Korrektur: Training löschen öffnet den Tag wieder, Ruhetag schließt ihn, Mahlzeit löschen öffnet ihn.
- Keine Doppelwertung.
- Historische Tage ohne Plan zählen.
- Abend-Check-in endet ohne Planung.

**Weiterhin getestet:**
- Nachtrag-Zeitfenster;
- Zeitumstellung sowie Monats- und Jahreswechsel.
