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
- **Start shape / goal shape:** a segmented control on the card ("Startform | Zielform") switches
  between a fuller start body and a fit, athletic goal body with one tap. The body morphs smoothly
  (0.9 s) while the scan rings flash. Both are example figures chosen by the toggle, never derived
  from the user's data.
- **Look:** dark anthracite body with a neon rim, a scan band that follows two animated scan rings,
  fine scan lines, rotating dashed floor rings, rising light particles and soft neon rim lights.
  Sportswear is matte black with a thin neon hem: men wear sports shorts only; women wear short
  sports pants and a sports top with straps; the neutral body wears both. Hair: short cap (male,
  neutral), sleek cap with ponytail (female). No nudity: tests check that the chest (female,
  neutral) and the pelvis (all) are covered in both shapes.
- **Real data only:** start weight (profile, else first entry), current weight (latest entry),
  change since start, goal weight with progress ring and remaining distance, and the activity
  streak. Logic: `src/domain/bodyStats.ts` (tested). Without weight data the card offers
  "Add your weight".
- **Honest by design:** the body never changes with weight or height. A note on the card says
  start and goal shapes are example figures and that body shape, body fat and muscle mass can't
  be derived from weight.

## Files

| File | Role |
| --- | --- |
| `src/avatar/AvatarViewer.tsx` | GL view, render loop, gestures, loading state, error fallback with retry |
| `src/avatar/stage.ts` | Scene, camera framing, lights, rings, particles, per-frame animation |
| `src/avatar/hologram.ts` | Body material: hologram skin, sportswear with neon hems, hair (per pixel) |
| `src/avatar/cloth.ts` | Sportswear band parameters, shader code and the same formula in TypeScript for tests |
| `src/avatar/buildAvatar.ts` | Loads a body GLB, blends start ↔ goal on the CPU (no morph textures), idle breathing |
| `src/avatar/models.ts` | The three body GLBs |
| `src/avatar/loadAssets.ts`, `polyfills.ts` | Asset loading on web/native, `TextDecoder` for GLB parsing |
| `scripts/avatars/build_makehuman.py` | Builds the GLBs from MakeHuman data (our own code) |
| `src/features/avatar/BodyHero.tsx` | The Today card (data cards, buttons, disclaimer) |
| `src/app/avatar-body.tsx` | Body picker |

Reused from commit `3eb4bc1` (earlier V2 avatar): asset loading, GLB parsing, `TextDecoder`
polyfill, the GL/renderer setup and gesture handling (adapted to scrolling inside Today and to
the new look). The Rocketbox bodies used until commit `2a0bb5b` were replaced by the MakeHuman
bodies below (they had fixed everyday clothes and only one body shape).

## 3D assets and licence

| Body | File | Goal (fit) shape | Start shape | Clothing / hair |
| --- | --- | --- | --- | --- |
| Male | `body-male.glb` (≈ 590 KB) | high muscle, low fat, V-taper, defined chest and shoulders | low muscle, max weight, belly | sports shorts (mid-thigh), short hair |
| Female | `body-female.glb` (≈ 600 KB) | athletic, slim waist, defined hips | fuller, belly, fuller arms | short sports pants + sports top, ponytail |
| Neutral | `body-neutral.glb` (≈ 590 KB) | androgynous athletic | fuller | sports pants + sports top, short hair |

Each body: about 13.5k vertices / 27k triangles, start shape stored as offsets, arms lowered from
MakeHuman's A-pose to a relaxed stance.

Source: **MakeHuman** (https://github.com/makehumancommunity/makehuman, data at commit
`a8bc2d5`): base mesh, macro targets (gender, muscle, weight, proportions, height, breast),
detail targets (V-taper, pectorals, shoulders, belly, arm fat, breast shape) and skin weights. The
MakeHuman project releases these assets under **CC0 1.0** (public domain; commercial use without
conditions, see `assets/avatars/LICENSE-MAKEHUMAN-ASSETS.md` and their `LICENSE.md` section C/D).
MakeHuman's program code (AGPL) is not used: `scripts/avatars/build_makehuman.py` is our own code
that reads the data files. Sportswear, hair, pose and shape settings were made for Diet9. Credit
is shown in Profile → Licenses.

Rebuild:

```bash
git clone --depth 1 --filter=blob:none --sparse https://github.com/makehumancommunity/makehuman.git mh
cd mh && git sparse-checkout set makehuman/data/3dobjs makehuman/data/rigs makehuman/data/targets/{macrodetails,breast,torso,stomach,armslegs} && cd ..
python3 scripts/avatars/build_makehuman.py --data mh/makehuman/data
```

## Performance

- Three.js loads lazily when the card is first shown (app start unaffected).
- One body in memory at a time; switching disposes the old meshes, materials and textures.
- About 27k triangles per body, one draw call, no shadows or post-processing, no MSAA (the
  drawing buffer is already at screen density). The start ↔ goal blend runs on the CPU only during
  the 0.9 s transition (13.5k vertices); otherwise the geometry is static.
- The render loop stops completely when Today isn't focused or the app is in the background.
- "Reduce Motion": slower scan and rings, particles stand still, no spin momentum, weaker scan band.
- Tests check the triangle budget (< 30k per body) and the asset size budget (< 2 MB for all three).

Measured here only in a browser with software rendering (no GPU), so frame rates from this
sandbox say nothing about an iPhone. Check smoothness on the device.

## Expo Go and the iPhone failure (fixed in this branch)

**What happened:** on an iPhone the card showed "The 3D view can't be shown on this device right
now". Cause, found in the library sources:

- three.js ≥ r163 refuses WebGL1 with `context instanceof WebGLRenderingContext`
  (`three/src/renderers/WebGLRenderer.js`).
- expo-gl ≥ 56.0.5 (SDK 58 ships 58.0.3) makes the native `WebGL2RenderingContext` *extend*
  `WebGLRenderingContext` (`expo-gl/CHANGELOG.md`, PR #45871; `common/EXWebGLRenderer.cpp`).
- So a real WebGL2 context on iOS (OpenGL ES 3) is taken for WebGL1 and the renderer throws
  "THREE.WebGLRenderer: WebGL 1 is not supported since r163". Browsers don't have this
  inheritance, which is why the web build worked.

Reproduced two ways: a Jest test with an expo-gl-shaped context (`src/avatar/renderer.test.ts`),
and the previous build (`1ca1a09`) in a browser where the expo-gl class hierarchy was recreated:
it shows exactly the iPhone message, with the error above in the console.

**Fix:** `src/avatar/renderer.ts` (`createRenderer`) checks for WebGL2 itself and hides the global
`WebGLRenderingContext` only while the renderer is constructed. Every 3D view uses it.

**Diagnostics:** each step (GL context, renderer, scene, first frame, model download, GLB parse,
textures, animation, shader errors, every frame) is logged (`src/avatar/diagnostics.ts`). On an
error the card shows "Details" (open by default in development / Expo Go) with the exact failing
step and message, and "Share diagnostics" to send the log as text.

## 3D test screen

`/3d-test` (Profile → 3D test, development / Expo Go only; also linked from the error card):

1. **Cube** – renderer + rotating cube (no lights, textures or custom shaders).
2. **Body model** – a Diet9 body GLB (male, female or neutral) with a plain grey material and lights.
3. **Touch** – drag to turn, pinch to zoom, double-tap to reset, live yaw/zoom values.
4. **Diet9 look** – the full avatar with hologram material, lights and scan rings; start/goal toggle.

Each step runs in a fresh GL context with its own log and an on-device FPS counter.

`expo-gl` is part of Expo SDK 58 and included in Expo Go, and `three` is plain JavaScript; the fix
is JavaScript only, so Expo Go is enough. If a device still fails in Expo Go, a development build
is prepared (`eas.json` profile `development`, `expo-dev-client` installed):
`npx eas-cli@latest build --profile development --platform ios` (needs an Apple Developer account;
not run from here).
