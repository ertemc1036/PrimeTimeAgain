#!/usr/bin/env python3
"""
Builds the app's 3D avatar assets from the Microsoft Rocketbox Avatar Library (MIT License).

Pipeline per avatar:
  FBX --(FBX2glTF)--> glTF --(strip textures, tune materials)--> GLB (gltf-transform)
  TGA textures --(Pillow)--> resized JPG / PNG shipped next to the GLB

Textures are kept outside the GLB on purpose: React Native has no browser image decoder,
so the app loads them through expo-asset, which expo-gl can upload directly.

Usage:
  python3 scripts/avatars/build_avatars.py --rocketbox <checkout> --tools <dir with node_modules> [ids...]

Requires: Pillow, and in --tools: npm packages `fbx2gltf` and `@gltf-transform/cli`.
This script is a development tool and is not part of the app bundle.
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT_DIR = os.path.join(ROOT, 'assets', 'avatars')

# id -> (Rocketbox folder, idle animation key)
AVATARS = {
    'm09': ('Male_Adult_09', 'm'),
    'm12': ('Male_Adult_12', 'm'),
    'm17': ('Male_Adult_17', 'm'),
    'm04': ('Male_Adult_04', 'm'),
    'f13': ('Female_Adult_13', 'f'),
    'fp02': ('Female_Party_02', 'f'),
    'f04': ('Female_Adult_04', 'f'),
    'f12': ('Female_Adult_12', 'f'),
}
ANIMATIONS = {
    'idle_m': 'm_idle_breathe_01',
    'idle_f': 'f_idle_breathe_01',
    'look_m': 'm_idle_look_around_01',
    'look_f': 'f_idle_look_around_01',
}
TEXTURE_SIZE = 1024
NORMAL_SIZE = 1024


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL)


def find_texture(tex_dir, suffix):
    for name in os.listdir(tex_dir):
        if name.endswith(suffix + '.tga'):
            return os.path.join(tex_dir, name)
    raise FileNotFoundError(f'{suffix} in {tex_dir}')


def save_jpg(src, dst, size):
    Image.open(src).convert('RGB').resize((size, size), Image.LANCZOS).save(dst, quality=84, optimize=True)


def build_avatar(rocketbox, tools, avatar_id):
    folder, _ = AVATARS[avatar_id]
    base = os.path.join(rocketbox, 'Assets', 'Avatars', 'Adults', folder)
    out = os.path.join(OUT_DIR, avatar_id)
    os.makedirs(out, exist_ok=True)
    fbx2gltf = os.path.join(tools, 'node_modules', 'fbx2gltf', 'bin', 'Linux', 'FBX2glTF')
    gltf_transform = os.path.join(tools, 'node_modules', '.bin', 'gltf-transform')

    with tempfile.TemporaryDirectory() as tmp:
        run([fbx2gltf, '-i', os.path.join(base, 'Export', folder + '.fbx'), '-o', os.path.join(tmp, 'm')])
        gltf_path = os.path.join(tmp, 'm_out', 'm.gltf')
        g = json.load(open(gltf_path))
        # Drop embedded placeholder images; textures are loaded by the app per material role.
        for key in ('images', 'textures', 'samplers', 'animations'):
            g.pop(key, None)
        for mat in g['materials']:
            role = mat['name'].split('_')[-1]  # body | head | opacity
            mat['name'] = role
            mat.pop('normalTexture', None)
            mat.pop('extras', None)
            mat['pbrMetallicRoughness'] = {
                'baseColorFactor': [1, 1, 1, 1],
                'metallicFactor': 0.0,
                'roughnessFactor': 0.62 if role == 'head' else 0.82,
            }
            if role == 'opacity':
                mat['alphaMode'] = 'MASK'
                mat['alphaCutoff'] = 0.35
                mat['doubleSided'] = True
        json.dump(g, open(gltf_path, 'w'))
        glb = os.path.join(out, 'model.glb')
        run([gltf_transform, 'prune', '--keep-attributes', 'true', gltf_path, glb])

    tex = os.path.join(base, 'Textures')
    save_jpg(find_texture(tex, '_body_color'), os.path.join(out, 'body.jpg'), TEXTURE_SIZE)
    save_jpg(find_texture(tex, '_head_color'), os.path.join(out, 'head.jpg'), TEXTURE_SIZE)
    save_jpg(find_texture(tex, '_body_normal'), os.path.join(out, 'body_n.jpg'), NORMAL_SIZE)
    save_jpg(find_texture(tex, '_head_normal'), os.path.join(out, 'head_n.jpg'), NORMAL_SIZE // 2)
    try:
        hair = Image.open(find_texture(tex, '_opacity_color')).convert('RGBA')
        hair = hair.resize((TEXTURE_SIZE, TEXTURE_SIZE // 2), Image.LANCZOS)
        # Alpha is used as a cut-out mask, so a 256-colour palette keeps quality at a fraction of the size.
        hair.quantize(256, method=Image.Quantize.FASTOCTREE).save(os.path.join(out, 'hair.png'), optimize=True)
    except FileNotFoundError:
        pass  # some avatars have no separate hair/eyelash cards
    # Small preview for pickers and fallbacks (Rocketbox ships one per avatar).
    preview = Image.open(os.path.join(base, folder + '.png')).convert('RGB')
    w, h = preview.size
    preview.crop((w // 2 - h // 3, 0, w // 2 + h // 3, h)).resize((240, 360), Image.LANCZOS).save(
        os.path.join(out, 'preview.jpg'), quality=82
    )
    print('built', avatar_id, sum(os.path.getsize(os.path.join(out, f)) for f in os.listdir(out)) // 1024, 'KB')


def build_animation(rocketbox, tools, key):
    src = os.path.join(rocketbox, 'Assets', 'Animations', 'all_animations_max_motextr_static', ANIMATIONS[key] + '.max.fbx')
    fbx2gltf = os.path.join(tools, 'node_modules', 'fbx2gltf', 'bin', 'Linux', 'FBX2glTF')
    gltf_transform = os.path.join(tools, 'node_modules', '.bin', 'gltf-transform')
    out = os.path.join(OUT_DIR, 'animations')
    os.makedirs(out, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        run([fbx2gltf, '-b', '--anim-framerate', 'bake30', '-i', src, '-o', os.path.join(tmp, 'a')])
        run([gltf_transform, 'resample', os.path.join(tmp, 'a.glb'), os.path.join(out, key + '.glb')])
    print('built animation', key)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--rocketbox', required=True)
    ap.add_argument('--tools', required=True)
    ap.add_argument('ids', nargs='*')
    args = ap.parse_args()
    for key in ANIMATIONS:
        build_animation(args.rocketbox, args.tools, key)
    for avatar_id in args.ids or AVATARS:
        build_avatar(args.rocketbox, args.tools, avatar_id)
    shutil.copy(os.path.join(os.path.dirname(__file__), 'LICENSE-ROCKETBOX.txt'), os.path.join(OUT_DIR, 'LICENSE-ROCKETBOX.txt'))


if __name__ == '__main__':
    sys.exit(main())
