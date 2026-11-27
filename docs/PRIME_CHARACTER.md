# Prime – Charakter-System und fehlende Assets

Prime ist das Gesicht von PrimeMe AI. Verbindlich ist das offizielle Aussehen aus den bereitgestellten Bildern:
- runder grauer Kopf, schwarze glänzende Augen, minimalistisches Lächeln;
- schwarze, rückwärts getragene Cap, weißes Handtuch;
- schwarze Shorts, schwarz-weiße Sneaker, Smartwatch;
- monochromer 3D-Renderstil.

Neue Posen müssen genau so aussehen: gleiche Kopfform, Augen, Proportionen und derselbe Stil.

## Dateien (`assets/images/prime`, WebP 1024 px, ca. 30–90 KB)

| Datei | Motiv | Pose(n) in der App |
| --- | --- | --- |
| `prime-default.webp` | neutrale Pose (Hände an der Hüfte) | `welcome` (Welcome, Onboarding), `today` (Heute), `chat` (Prime-Chat), `motivation` (PrimeMe+, Onboarding) |
| `prime-gym.webp` | mit Hantel | `gym`: Gym-Start, solange nichts geplant und noch nicht trainiert |
| `prime-workout.webp` | Bankdrücken | `workout`: Gym, wenn ein Training geplant ist (Workout-Start) |
| `prime-thumbsup.webp` | Daumen hoch (erstes Referenzbild) | `success`: Gym nach einem Training, Onboarding-Abschluss |
| `prime-shake.webp` | mit Proteinshake | `nutrition`: Küche vor der ersten Mahlzeit (Ernährung, Planung) |
| `prime-kitchen.webp` | mit Snack in der Küche | `kitchen`: Küche, sobald Mahlzeiten eingetragen sind (Ernährungstagebuch) |
| `prime-face.webp` | Kopfausschnitt der neutralen Pose | Tab-Bar, Chat-Avatar |

Je Bildschirm erscheint höchstens eine Prime-Illustration; Gym und Küche wechseln die Pose je nach Tagesstand. Die Bilder haben dunkle Szenen-Hintergründe und stehen deshalb bewusst als abgerundete Kachel in einer dunklen Karte (Gym, Küche) bzw. randlos auf dem dunklen Welcome-Screen.

## Komponenten

- `PrimeCharacter` (`src/features/prime/character/PrimeCharacter.tsx`): ganzer Charakter, `variant`, `size`, `motion` (`none` / `enter` / `idle`), keine Animation bei „Bewegung reduzieren“.
- `PrimeAvatar` (`src/features/prime/PrimeAvatar.tsx`): Gesicht im schwarzen Kreis.
- `PrimeHero` (`src/features/prime/character/PrimeHero.tsx`): dunkle Kopfkarte für Gym und Küche.
- Register: `src/features/prime/character/assets.ts`.

## Noch ohne eigenes Bild

| Pose | Verwendung | Platzhalter |
| --- | --- | --- |
| `thinking` | Prime-Chat, während Prime antwortet | neutrale Pose |
| `recovery` | Gym am Ruhetag | neutrale Pose |

## Neue Pose einbauen

1. **Datei anlegen:** nach `assets/images/prime/` legen, z. B. `prime-thinking.webp`.
   - Am besten **PNG oder WebP mit transparentem Hintergrund**, quadratisch, mindestens 1024 px.
   - Ohne Transparenz steht das Bild als Kachel auf dunklem Hintergrund (`#03010C`).
2. **Eintragen:** in `assets.ts` den Eintrag ändern, z. B. `thinking: pose(require('../../../../assets/images/prime/prime-thinking.webp'))`.
3. **Mehr ist nicht nötig:** Alle Stellen, die diese Pose nutzen, zeigen danach automatisch das neue Bild.

## Hinweise

- Die Bilder haben keinen transparenten Hintergrund. Freigestellte PNG/WebP-Dateien (`transparent: true`) könnten direkt auf weißen Flächen stehen.
- WebP wird von iOS (ab iOS 14) und Android nativ angezeigt. Bitte auf dem iPhone kurz prüfen, ob alle Bilder erscheinen.
- App-Icon und Splash-Bild sind noch die alten Bilder (Design-Entscheidung, nicht geändert).
