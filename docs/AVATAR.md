# Diet9 3D avatar

An interactive 3D body at the top of **Today**: a real-time Three.js scene on `expo-gl`, not an
image or a video. Only this card uses the dark "body scan" look; the rest of the app keeps its
design.

## What it does

- **Bodies:** male, female or neutral (Profile → Avatar body, or the body button on the card).
  The choice is optional (default: neutral). It is stored in the profile (`avatarBody`), so it
  syncs with the account like other profile fields; no database or server change was needed.
- **Interaction:** drag sideways to turn 360° (with momentum), pinch to zoom (scroll wheel on
  web), double-tap or the scan button to reset the camera. Vertical swipes still scroll the page.
  VoiceOver: custom actions turn left/right and zoom in/out.
- **Look:** dark anthracite body with a neon rim, a scan band that follows two animated scan rings,
  fine scan lines, rotating dashed floor rings, rising light particles and soft neon rim lights.
- **Real data only:** start weight (profile, else first entry), current weight (latest entry),
  change since start, goal weight with progress ring and remaining distance, and the activity
  streak. Logic: `src/domain/bodyStats.ts` (tested). Without weight data the card offers
  "Add your weight".
- **Honest by design:** the body never changes with weight or height. A note on the card says
  the avatar is symbolic and that body shape, body fat and muscle mass can't be derived from
  weight.

## Files

| File | Role |
| --- | --- |
| `src/avatar/AvatarViewer.tsx` | GL view, render loop, gestures, loading state, error fallback with retry |
| `src/avatar/stage.ts` | Scene, camera framing, lights, rings, particles, per-frame animation |
| `src/avatar/hologram.ts` | Hologram material (extends `MeshStandardMaterial`; skinning and normal maps keep working) |
| `src/avatar/buildAvatar.ts` | Loads a rigged body or builds the neutral one, normalised to 1.78 m |
| `src/avatar/mannequin.ts` | Neutral body generated in code (no asset) |
| `src/avatar/models.ts` | The bundled Rocketbox assets |
| `src/avatar/loadAssets.ts`, `polyfills.ts` | Asset loading on web/native, `TextDecoder` for GLB parsing |
| `src/features/avatar/BodyHero.tsx` | The Today card (data cards, buttons, disclaimer) |
| `src/app/avatar-body.tsx` | Body picker |

Reused from commit `3eb4bc1` (earlier V2 avatar): asset loading, GLB parsing, `TextDecoder`
polyfill, the GL/renderer setup and gesture handling (adapted to scrolling inside Today and to
the new look), the Rocketbox build script and assets. Not reused: textured realistic presets,
avatar studio, lighting presets, onboarding avatar step.

## 3D assets and licence

| Body | Source | Files |
| --- | --- | --- |
| Male | Rocketbox `Male_Adult_09` (`m09`) | `model.glb` 320 KB, normal maps, hair alpha texture |
| Female | Rocketbox `Female_Adult_13` (`f13`) | `model.glb` 485 KB, normal maps, hair alpha texture |
| Idle animations | Rocketbox idle clips | `idle_m.glb`, `idle_f.glb` |
| Neutral | Generated in code | none |

Total ≈ 1.5 MB. Source: Microsoft Rocketbox Avatar Library, MIT License since 12/2020
(https://github.com/microsoft/Microsoft-Rocketbox). The licence text ships in
`assets/avatars/LICENSE-ROCKETBOX.txt` and is shown in the app (Profile → Licenses). The library
was first announced for research and academic use; the MIT licence allows commercial use, but
have it confirmed with the other legal items before release. Rebuild assets with
`scripts/avatars/build_avatars.py`.

## Performance

- Three.js loads lazily when the card is first shown (app start unaffected).
- One body in memory at a time; switching disposes the old meshes, materials and textures.
- About 7.4k (male) and 8.7k (female) triangles per rigged body, 10.7k for the neutral one; one draw call per mesh, no shadows or
  post-processing, no MSAA (the drawing buffer is already at screen density).
- The render loop stops completely when Today isn't focused or the app is in the background.
- "Reduce Motion": slower scan and rings, particles stand still, no spin momentum, weaker scan band.
- Tests check the triangle budget (< 15k) and the asset size budget (< 2 MB).

Measured here only in a browser with software rendering (no GPU), so frame rates from this
sandbox say nothing about an iPhone. Check smoothness on the device.

## Expo Go

`expo-gl` is part of Expo SDK 58 and included in Expo Go, and `three` is plain JavaScript, so the
avatar runs in Expo Go without a development build. If a model or WebGL fails on a device, the
card shows a message with "Retry" and the rest of Today keeps working.
