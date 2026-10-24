# 3D Avatar System — Technical Assessment

## 1. Decision

**Three.js (r186) rendering directly on `expo-gl`,** with rigged glTF characters from the
**Microsoft Rocketbox Avatar Library (MIT License)**.

| Option | Verdict |
| --- | --- |
| `three` + `expo-gl` (chosen) | Works in **Expo Go** (expo-gl is bundled). One dependency (`three`). Full control over loading on React Native. |
| React Three Fiber (`@react-three/fiber/native`) | Viable, but adds several dependencies and its native polyfills for textures are a common source of breakage. Not needed for one stage. |
| `expo-three` | Unmaintained. |
| Native engines (Filament, SceneKit, Unity as a library) | Best performance ceiling, but require a development build and native code. Reconsider only if profiling on devices demands it. |

## 2. What is implemented (and tested)

- 8 realistic, rigged full-body characters (4 men, 4 women, diverse skin tones and styles), real
  skinned geometry with body, head and hair materials, colour and normal textures.
- Idle animations (calm breathing, looking around) from Rocketbox's MIT animation set, cross-faded.
- Touch: drag to rotate 360° (with inertia), vertical drag tilts the camera, pinch (or mouse wheel on
  web) zooms from full body to head-and-shoulders, double tap resets. Smooth damping on all motion.
- Screen-reader accessible: adjustable element with rotate/zoom actions.
- Studio lighting (key, two rim lights, fill, hemisphere), ACES tone mapping, sRGB output,
  contact shadow and a glowing platform ring. Three lighting presets.
- Rendering pauses when the screen is not focused (battery). Avatars are disposed on change/unmount.
- Fallback: if WebGL or an asset fails, the preset's reference image is shown with a retry button,
  so the rest of the screen keeps working.
- Avatar Studio: character, idle animation, lighting; saved per user and shown in Prime Control.

**Verified:** in Chromium (WebGL via SwiftShader) at iPhone size, all 8 presets and both animations
load (~40–95 ms per preset after first load), drag rotation and zoom work. The iOS and Android
JavaScript bundles build.
**Not yet verified:** rendering on a physical iPhone / Android device (see §4). That is the first
thing to check in Expo Go.

## 3. Asset pipeline

`scripts/avatars/build_avatars.py` (development tool, not shipped):

1. FBX → glTF with FBX2glTF; embedded placeholder images removed; materials normalised.
2. GLB written with `gltf-transform` (UVs kept).
3. TGA textures → 1024 px JPEG (colour, normal), 1024×512 palettised PNG for hair cut-outs.
4. Idle animations converted at 30 fps; only rotation tracks are used.

Total ≈ 7.7 MB for 8 characters + 4 animations. Attribution: `assets/avatars/LICENSE-ROCKETBOX.txt`
and Settings → Licences.

Textures are deliberately **not** embedded in the GLB: React Native has no browser image decoder, so
textures load through `expo-asset` and are uploaded by expo-gl from `{ localUri }` (the approach used
by expo-three). On web, the normal Three.js `TextureLoader` is used.

## 4. iPhone performance plan

- Each character ≈ 20–30k triangles, 80 bones, 5 textures; one draw call per material (3).
- Expected to be comfortable on iPhone 11 and newer. To verify on device: frame rate in Prime Control,
  memory when switching presets, first-load time.
- If needed: lower texture size (512), use Rocketbox "midpoly" meshes, render at a reduced drawing
  buffer, or cap at 30 fps when idle.

## 5. Customisation roadmap and selfie avatars

**Available now:** full character presets, idle animation, lighting.

**Not available yet (needs licensed modular assets):** separate hairstyles, outfits, shoes,
accessories, face presets and poses. Rocketbox characters have clothing baked into their textures, so
true mix-and-match requires a modular character kit with a shared skeleton. Options to evaluate (all
require checking current licence terms and prices, which I could not verify from this environment):

- Commissioning a modular kit (artist-made, full ownership).
- Reallusion Character Creator 4 with an export licence (commercial use in apps is licence-dependent).
- CC0 stylised modular kits (e.g. Quaternius) — legally simple, but not realistic.

**Selfie-based face (future).** Honest limits: a single selfie cannot reconstruct an exact 3D head or
unseen geometry; services fit a parametric face and project texture. Candidates to evaluate:
Avaturn (photo-to-avatar, GLB export, commercial plans), Meshcapade (body/face models, commercial
API), Reallusion Headshot (desktop pipeline). Research models such as DECA/EMOCA are typically
non-commercial and unsuitable. Previously popular Ready Player Me should be re-checked for current
availability before considering it.

Requirements before any integration: explicit, revocable consent before a photo leaves the device;
clear processing location and retention; deletion on request; no claims of exact likeness.
Nothing is sent to any service today.
