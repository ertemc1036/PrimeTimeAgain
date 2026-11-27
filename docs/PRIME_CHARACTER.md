# Prime – Charakter-System und fehlende Assets

Prime ist das Gesicht von PrimeMe AI. Verbindlich ist das offizielle Referenzbild (`assets/prime/prime-reference.jpg`):
- runder grauer Kopf, schwarze glänzende Augen, minimalistisches Lächeln;
- schwarze, rückwärts getragene Cap, weißes Handtuch;
- schwarze Shorts, schwarz-weiße Sneaker, Smartwatch;
- monochromer 3D-Renderstil.

Neue Posen müssen genau so aussehen: gleiche Kopfform, Augen, Proportionen und derselbe Stil.

## Dateien

| Datei | Inhalt |
| --- | --- |
| `assets/prime/prime-reference.jpg` | Referenzbild, 1024 × 1024, dunkler Studiohintergrund (aus deiner Vorlage, nur verkleinert) |
| `assets/prime/prime-face.jpg` | Kopfausschnitt aus dem Referenzbild, 384 × 384, für kleine Kreise (Tab-Bar, Chat) |

## Komponenten

- **`PrimeCharacter`** (`src/features/prime/character/PrimeCharacter.tsx`): ganzer Charakter in einer Pose.
  - `variant`: welcome, today, gym, kitchen, thinking, chat, success, recovery, motivation.
  - `size`.
  - `motion`: `none`, `enter` (sanftes Einblenden) oder `idle` (Einblenden plus leichtes Schweben).
  - Bei „Bewegung reduzieren“ gibt es keine Animation.
- **`PrimeAvatar`** (`src/features/prime/PrimeAvatar.tsx`): Gesicht im schwarzen Kreis. Kurzes „Hallo“, wenn der Prime-Tab geöffnet wird; sanftes Atmen, solange Prime antwortet.
- **`PrimeHero`** (`src/features/prime/character/PrimeHero.tsx`): Kopfbereich für Gym und Küche.
- **Register** (`src/features/prime/character/assets.ts`): eine Zeile pro Pose. `missingPoses()` liefert die Posen, für die es noch kein eigenes Bild gibt.

## Wo welche Pose verwendet wird

| Pose | Verwendung in der App | Eigenes Bild vorhanden? |
| --- | --- | --- |
| `welcome` | Welcome-Screen, Onboarding Schritt 1 | **fehlt** – Referenzbild als Platzhalter |
| `today` | Prime-Card auf Heute | **ja** (das Referenzbild ist diese Pose: entspannt, Daumen hoch) |
| `gym` | Gym-Kopfbereich (noch nicht trainiert) | **fehlt** |
| `success` | Gym-Kopfbereich nach einem Training, Onboarding-Abschluss | **fehlt** |
| `recovery` | Gym-Kopfbereich am Ruhetag | **fehlt** |
| `kitchen` | Küche-Kopfbereich | **fehlt** |
| `chat` | Prime-Chat ohne Unterhaltung | **fehlt** |
| `thinking` | Prime-Chat, während Prime antwortet | **fehlt** |
| `motivation` | Paywall, Onboarding (Erinnerungen) | **fehlt** |

Solange eine Pose fehlt, erscheint überall das Referenzbild. Es werden keine anderen oder erfundenen Figuren verwendet.

## Neue Pose einbauen

1. **Datei anlegen:** nach `assets/prime/` legen, z. B. `prime-gym.png`.
   - Am besten **PNG oder WebP mit transparentem Hintergrund**, quadratisch, mindestens 1024 px.
   - Ohne Transparenz bleibt der dunkle Studiohintergrund (`#03010C`) wie beim Referenzbild.
2. **Eintragen:** in `assets.ts` den Eintrag ändern, z. B. `gym: { source: require('../../../../assets/prime/prime-gym.png'), provided: true, transparent: true }`.
3. **Mehr ist nicht nötig:** Alle Stellen, die diese Pose nutzen, zeigen danach automatisch das neue Bild.

## Was beim Referenzbild nicht möglich war

- Das Bild hat einen **dunklen Hintergrund ohne Transparenz**. Ein sauberes Freistellen ist nicht zuverlässig möglich, weil Cap, Shorts und Schuhe fast dieselbe Farbe haben wie der Hintergrund.
- Prime steht deshalb auf seinem dunklen „Studio“-Hintergrund:
  - auf dem Welcome-Screen randlos;
  - auf hellen Seiten als abgerundete dunkle Kachel.
- Mit freigestellten PNGs (`transparent: true`) kann er direkt auf weißen Flächen stehen.
- App-Icon und Splash-Bild sind noch die alten Bilder. Für ein neues Icon eignet sich der Kopfausschnitt; das ist eine Design-Entscheidung für dich, daher nicht geändert.
