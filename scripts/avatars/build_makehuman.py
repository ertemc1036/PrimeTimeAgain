#!/usr/bin/env python3
"""
Builds the Diet9 avatar bodies (assets/avatars/body-{male,female,neutral}.glb) from MakeHuman
assets. MakeHuman's base mesh, targets and skin weights are released under CC0 1.0
(https://github.com/makehumancommunity/makehuman, LICENSE.ASSETS.md). This script is our own
code; no MakeHuman program code is used.

Each GLB holds one mesh:
  POSITION          the "goal" (fit) body, in metres, feet on y = 0, centred
  morph target 0    the "start" body (heavier) as offsets from the goal body
  _HAIR  (byte4.x)  smooth field for the hair cap (> 0 = hair; 1 on the ponytail)
  _CLOTHMASK (byte4.xyz) where sportswear may appear: bottom, top, straps (> 0 = allowed)
                    Both are normalised bytes: value in metres / FIELD_RANGE (0.05).
  mesh extras.cloth band parameters; the app evaluates the band edges per pixel from the model
                    position (same formula as cloth_eval below), so edges are clean lines

Usage:
  python3 scripts/avatars/build_makehuman.py --data <makehuman checkout>/makehuman/data [--out assets/avatars]

The data folder needs: 3dobjs/base.obj, rigs/default_weights.mhw and targets/{macrodetails,
breast,torso,stomach,armslegs}.
"""
import argparse
import json
import os
import struct

import numpy as np

# ---------------------------------------------------------------------------------------------
# Bodies. Values are MakeHuman-style slider positions (0..1, 0.5 = average).

BODIES = {
    'male': {
        'gender': 1.0,
        'goal': {'muscle': 0.95, 'weight': 0.38, 'proportions': 1.0, 'height': 0.6,
                 'extra': {'torso/torso-vshape-incr': 0.7, 'torso/torso-muscle-pectoral-incr': 0.6,
                           'torso/torso-muscle-dorsi-incr': 0.5,
                           'armslegs/l-upperarm-shoulder-muscle-incr': 0.6, 'armslegs/r-upperarm-shoulder-muscle-incr': 0.6,
                           'armslegs/l-upperarm-muscle-incr': 0.5, 'armslegs/r-upperarm-muscle-incr': 0.5}},
        'start': {'muscle': 0.4, 'weight': 1.0, 'proportions': 0.5, 'height': 0.6,
                  'extra': {'stomach/stomach-pregnant-incr': 0.45, 'torso/torso-vshape-decr': 0.3,
                            'armslegs/l-upperarm-fat-incr': 0.5, 'armslegs/r-upperarm-fat-incr': 0.5}},
        'clothing': 'shorts',
        'hair': 'short',
    },
    'female': {
        'gender': 0.0,
        # Rounder, less pointed bust (as in a compression sports top): average firmness + breast-point-decr.
        'goal': {'muscle': 0.72, 'weight': 0.36, 'proportions': 1.0, 'height': 0.55, 'cup': 0.6, 'firmness': 0.5,
                 'extra': {'stomach/stomach-pregnant-decr': 0.3, 'breast/breast-point-decr': 1.0}},
        'start': {'muscle': 0.35, 'weight': 1.0, 'proportions': 0.5, 'height': 0.55, 'cup': 0.72, 'firmness': 0.4,
                  'extra': {'stomach/stomach-pregnant-incr': 0.35, 'armslegs/l-upperarm-fat-incr': 0.4, 'armslegs/r-upperarm-fat-incr': 0.4,
                            'breast/breast-point-decr': 1.0}},
        'clothing': 'shorts+top',
        'hair': 'ponytail',
    },
    'neutral': {
        'gender': 0.55,
        'goal': {'muscle': 0.8, 'weight': 0.38, 'proportions': 1.0, 'height': 0.55, 'extra': {'breast/breast-point-decr': 1.0}},
        'start': {'muscle': 0.4, 'weight': 1.0, 'proportions': 0.5, 'height': 0.55, 'extra': {'stomach/stomach-pregnant-incr': 0.4, 'breast/breast-point-decr': 1.0}},
        'clothing': 'shorts+top',
        'hair': 'short',
    },
}

# Sports-top straps (female / neutral): distance of the strap centre line from the body axis and half width.
STRAP_X = 0.088
# Fields are stored as value / FIELD_RANGE in normalised bytes.
FIELD_RANGE = 0.05
STRAP_HALF = 0.017
KEEP_GROUPS = ('body', 'helper-l-eye', 'helper-r-eye')

# Arms are lowered from MakeHuman's A-pose to a relaxed stance that still leaves a gap to the body.
ARM_DROP_DEG = 24

# ---------------------------------------------------------------------------------------------
# Reading MakeHuman data


def read_obj(path):
    verts, faces = [], []
    group = None
    groups = {}
    with open(path) as f:
        for line in f:
            if line.startswith('v '):
                verts.append([float(x) for x in line.split()[1:4]])
            elif line.startswith('g '):
                group = line.split()[1]
            elif line.startswith('f '):
                idx = [int(p.split('/')[0]) - 1 for p in line.split()[1:]]
                groups.setdefault(group, set()).update(idx)
                if group in KEEP_GROUPS:
                    faces.append((idx, group))
    return np.array(verts, dtype=np.float64), faces, {k: np.array(sorted(v)) for k, v in groups.items()}


_target_cache = {}


def read_target(data, name):
    if name not in _target_cache:
        path = os.path.join(data, 'targets', name + '.target')
        if not os.path.exists(path):
            _target_cache[name] = None
        else:
            rows = [l.split() for l in open(path) if l.strip() and not l.startswith('#')]
            idx = np.array([int(r[0]) for r in rows], dtype=np.int64)
            d = np.array([[float(r[1]), float(r[2]), float(r[3])] for r in rows], dtype=np.float64).reshape(-1, 3)
            _target_cache[name] = (idx, d)
    return _target_cache[name]


def three_way(v, names=('min', 'average', 'max')):
    """Slider value 0..1 -> weights for (min, average, max) keyed by name."""
    v = min(1.0, max(0.0, v))
    if v < 0.5:
        lo = (0.5 - v) * 2
        return {names[0]: lo, names[1]: 1 - lo}
    hi = (v - 0.5) * 2
    return {names[2]: hi, names[1]: 1 - hi}


def shape(data, base, gender, s):
    """Apply macro, proportion, height, breast and extra targets for one body state."""
    out = base.copy()

    def add(name, w):
        if w <= 1e-6:
            return
        t = read_target(data, name)
        if t is None:
            return
        out[t[0]] += t[1] * w

    genders = {'female': 1 - gender, 'male': gender}
    muscles = three_way(s['muscle'], ('minmuscle', 'averagemuscle', 'maxmuscle'))
    weights = three_way(s['weight'], ('minweight', 'averageweight', 'maxweight'))
    for g, gw in genders.items():
        if gw <= 0:
            continue
        for race in ('african', 'asian', 'caucasian'):
            add(f'macrodetails/{race}-{g}-young', gw / 3)
        for m, mw in muscles.items():
            for w, ww in weights.items():
                combo = f'{g}-young-{m}-{w}'
                add(f'macrodetails/universal-{combo}', gw * mw * ww)
                add(f'macrodetails/proportions/{combo}-idealproportions', gw * mw * ww * s['proportions'])
                h = s['height']
                if h > 0.5:
                    add(f'macrodetails/height/{combo}-maxheight', gw * mw * ww * (h - 0.5) * 2)
                elif h < 0.5:
                    add(f'macrodetails/height/{combo}-minheight', gw * mw * ww * (0.5 - h) * 2)
                if g == 'female' and 'cup' in s:
                    cups = three_way(s['cup'], ('mincup', 'averagecup', 'maxcup'))
                    firm = three_way(s['firmness'], ('minfirmness', 'averagefirmness', 'maxfirmness'))
                    for c, cw in cups.items():
                        for fm, fw in firm.items():
                            if c == 'averagecup' and fm == 'averagefirmness':
                                continue
                            add(f'breast/{combo}-{c}-{fm}', gw * mw * ww * cw * fw)
    for name, w in s['extra'].items():
        add(name, w)
    return out


# ---------------------------------------------------------------------------------------------
# Geometry helpers


def triangulate(faces):
    tris, groups = [], []
    for idx, g in faces:
        for k in range(1, len(idx) - 1):
            tris.append((idx[0], idx[k], idx[k + 1]))
            groups.append(g)
    return np.array(tris, dtype=np.int64), groups


def vertex_normals(pos, tris):
    n = np.zeros_like(pos)
    fn = np.cross(pos[tris[:, 1]] - pos[tris[:, 0]], pos[tris[:, 2]] - pos[tris[:, 0]])
    for k in range(3):
        np.add.at(n, tris[:, k], fn)
    return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)


def bone_parts(weights_path, nverts):
    """Dominant bone per vertex from the CC0 skin weights."""
    w = json.load(open(weights_path))['weights']
    best = np.zeros(nverts)
    part = np.array([''] * nverts, dtype=object)
    for bone, pairs in w.items():
        for vi, wt in pairs:
            if vi < nverts and wt > best[vi]:
                best[vi] = wt
                part[vi] = bone
    return part


def region_weights(weights_path, nverts, prefixes):
    """Sum of skin weights per vertex for bones starting with any prefix (smooth 0..1)."""
    w = json.load(open(weights_path))['weights']
    out = np.zeros(nverts)
    for bone, pairs in w.items():
        if bone.startswith(prefixes):
            for vi, wt in pairs:
                if vi < nverts:
                    out[vi] += wt
    return np.clip(out, 0, 1)


def smooth_region(pos, tris, amount, iterations=8):
    """Laplacian smoothing along the vertex normal only (flattens bumps, no sideways sliding),
    per vertex scaled by amount (0..1). Used under the sports top."""
    edges = np.concatenate([tris[:, [0, 1]], tris[:, [1, 2]], tris[:, [2, 0]]])
    edges = np.concatenate([edges, edges[:, ::-1]])
    deg = np.bincount(edges[:, 0], minlength=len(pos)).astype(float)
    p = pos.copy()
    for _ in range(iterations):
        avg = np.stack([np.bincount(edges[:, 0], weights=p[edges[:, 1], k], minlength=len(p)) for k in range(3)], 1) / np.maximum(deg, 1)[:, None]
        n = vertex_normals(p, tris)
        d = ((avg - p) * n).sum(1, keepdims=True) * n
        p = p + d * (0.6 * amount)[:, None]
    return p


def soften_bust(pos, tris, inside, radius=0.05, iterations=60):
    """Round off the bust apex under the sports top: full (not only normal) Laplacian smoothing,
    weighted by distance to the most forward point of each side, so the larger-scale point that
    MakeHuman's breast targets produce becomes a rounded, compressed shape."""
    amount = np.zeros(len(pos))
    for side in (1, -1):
        cand = np.where((inside > 0.5) & (np.sign(pos[:, 0]) == side))[0]
        if len(cand) == 0:
            continue
        tip = pos[cand[np.argmax(pos[cand, 2])]]
        d = np.linalg.norm(pos - tip, axis=1)
        amount = np.maximum(amount, (0.5 + 0.5 * np.cos(np.pi * np.clip(d / radius, 0, 1))) * inside)
    edges = np.concatenate([tris[:, [0, 1]], tris[:, [1, 2]], tris[:, [2, 0]]])
    edges = np.concatenate([edges, edges[:, ::-1]])
    deg = np.bincount(edges[:, 0], minlength=len(pos)).astype(float)
    p = pos.copy()
    for _ in range(iterations):
        avg = np.stack([np.bincount(edges[:, 0], weights=p[edges[:, 1], k], minlength=len(p)) for k in range(3)], 1) / np.maximum(deg, 1)[:, None]
        p = p + (avg - p) * (0.5 * amount)[:, None]
    return p


def smooth_scalar(values, tris, iterations=25):
    """Diffuse a per-vertex scalar over the mesh (removes noise in skin-weight borders)."""
    edges = np.concatenate([tris[:, [0, 1]], tris[:, [1, 2]], tris[:, [2, 0]]])
    edges = np.concatenate([edges, edges[:, ::-1]])
    deg = np.bincount(edges[:, 0], minlength=len(values)).astype(float)
    v = values.astype(float).copy()
    for _ in range(iterations):
        acc = np.bincount(edges[:, 0], weights=v[edges[:, 1]], minlength=len(v))
        v = 0.5 * v + 0.5 * acc / np.maximum(deg, 1)
    return v


def is_arm(b):
    return any(b.startswith(p) for p in ('clavicle', 'shoulder', 'upperarm', 'lowerarm', 'wrist', 'finger', 'metacarpal'))


def is_leg(b):
    return any(b.startswith(p) for p in ('upperleg', 'lowerleg', 'foot', 'toe'))


def joint(verts_all, groups_index, name):
    return verts_all[groups_index[name]].mean(axis=0)


def clothing_layout(pos_m, part, kind, gender, arm_w, head_w, neck_low_w, arm_w_soft):
    """Sportswear layout on the goal body.

    The band edges are analytic functions of the model position (see cloth_eval), evaluated per
    pixel in the app, so hems, waistband and straps are clean lines regardless of mesh density.
    Per vertex we only store smooth masks that say where clothing may appear (not on arms/head):
      mb  bottom (shorts), mt  top body, ms  straps   (metres, > 0 = allowed)
    """
    x, y, z = pos_m[:, 0], pos_m[:, 1], pos_m[:, 2]
    med = lambda prefix: float(np.median(y[np.array([b.startswith(prefix) for b in part])]))
    hip_y, knee_y, pelvis_y = med('upperleg01'), med('lowerleg01'), med('pelvis')
    leg = np.array([is_leg(b) for b in part])
    male = gender > 0.75
    params = {
        'hem': knee_y + (hip_y - knee_y) * (0.6 if male else 0.8),
        'waist': pelvis_y + abs(pelvis_y - hip_y) * (0.62 if male else 0.5),
        'waistDrop': 0.012,
        'top': 'top' in kind,
        'under': 0.0, 'upper': 0.0, 'scoop': 0.03, 'bustY': 0.0,
        'strapX': STRAP_X, 'strapHalf': STRAP_HALF, 'strapRise': 0.2,
    }
    # Soft limits from the skin weights: the edge sits where a vertex is half arm / half body.
    mb = np.minimum((0.5 - arm_w) * 0.06, (0.5 - head_w) * 0.06)
    mt = np.full(len(pos_m), -0.05)
    ms = np.full(len(pos_m), -0.05)
    if params['top']:
        breast = np.array([b.startswith('breast') for b in part])
        bust_y = float(np.median(y[breast])) if breast.any() else pelvis_y + 0.36
        params.update(bustY=bust_y, under=bust_y - 0.095, upper=bust_y + 0.085)
        # Armhole: a heavily smoothed arm weight gives a clean curve.
        mt = np.minimum((0.35 - arm_w_soft) * 0.06, np.where(leg, -0.05, 0.05))
        ms = np.where(leg, -0.05, (0.5 - np.clip(head_w - neck_low_w, 0, 1)) * 0.06)
    clip = lambda a: np.clip(a, -0.05, 0.05)
    return clip(mb), clip(mt), clip(ms), {k: (round(float(v), 5) if not isinstance(v, bool) else v) for k, v in params.items()}


def cloth_eval(pos_m, mb, mt, ms, c):
    """Same formula as the app's shader (src/avatar/hologram.ts): signed distance to the nearest
    sportswear edge, > 0 = covered."""
    x, y, z = pos_m[:, 0], pos_m[:, 1], pos_m[:, 2]
    front = np.clip(z / 0.12, 0, 1)
    fb = np.minimum(y - c['hem'], c['waist'] - c['waistDrop'] * front - y)
    field = np.minimum(fb, mb)
    if c['top']:
        ft = np.minimum(y - c['under'], c['upper'] - c['scoop'] * np.exp(-(x / 0.07) ** 2) * front - y)
        fs = np.minimum(c['strapHalf'] - np.abs(np.abs(x) - c['strapX']), np.minimum(y - c['bustY'], c['bustY'] + c['strapRise'] - y))
        field = np.maximum.reduce([field, np.minimum(ft, mt), np.minimum(fs, ms)])
    return np.clip(field, -0.05, 0.05)


def hair_field(pos_m, part, eyes_m, style):
    """Smooth field (m) for a sleek hair cap: > 0 on the scalp above the hairline."""
    if style is None:
        return np.full(len(pos_m), -0.05)
    head = np.array([b.startswith(('head', 'neck03', 'temporalis', 'special')) for b in part])
    e = eyes_m.mean(axis=0)
    dy = pos_m[:, 1] - e[1]
    back = np.clip(-(pos_m[:, 2] - e[2]) / 0.12, 0, 1)
    if style == 'short':
        line = 0.055 - 0.085 * back  # forehead hairline, down to the nape at the back
    else:
        line = 0.045 - 0.115 * back
    f = dy - line
    return np.clip(np.where(head, f, -0.05), -0.05, 0.05)


def ponytail(pos_m, part, eyes_m, rings=18, segs=14):
    """A tapered, gently curved ponytail tube starting at the back of the head."""
    e = eyes_m.mean(axis=0)
    head = np.array([b.startswith('head') for b in part])
    hp = pos_m[head]
    band = hp[np.abs(hp[:, 1] - (e[1] + 0.03)) < 0.02]
    back_z = band[:, 2].min()
    anchor = np.array([0.0, e[1] + 0.035, back_z + 0.012])
    verts = []
    for i in range(rings + 1):
        t = i / rings
        cy = anchor[1] - 0.26 * t - 0.02 * t * t
        cz = anchor[2] - 0.045 * np.sin(min(t * 1.6, 1.0) * np.pi / 2) + 0.02 * t * t
        r = 0.028 * (1 - t) ** 0.7 + 0.004 if i < rings else 0.002
        r *= 1.0 + 0.25 * np.exp(-((t - 0.12) / 0.1) ** 2)  # slight fullness below the tie
        for k in range(segs):
            a = 2 * np.pi * k / segs
            verts.append([np.cos(a) * r * 1.1, cy, cz + np.sin(a) * r])
    tris = []
    for i in range(rings):
        for k in range(segs):
            a, b = i * segs + k, i * segs + (k + 1) % segs
            c, d = a + segs, b + segs
            tris += [(a, c, b), (b, c, d)]
    return np.array(verts), np.array(tris, dtype=np.int64)


def pose_arms(v, part_all, groups_index, weights, angle_deg):
    """Lower both arms by rotating the arm chain about the shoulder joint (linear blend skinning)."""
    out = v.copy()
    for side in ('L', 'R'):
        jname = 'joint-l-shoulder' if side == 'L' else 'joint-r-shoulder'
        c = joint(v, groups_index, jname)
        w = np.zeros(len(v))
        for bone, pairs in weights.items():
            if not bone.endswith('.' + side):
                continue
            k = 1.0 if bone.startswith(('upperarm', 'lowerarm', 'wrist', 'finger', 'metacarpal')) else 0.45 if bone.startswith('shoulder01') else 0.0
            if k == 0:
                continue
            for vi, wt in pairs:
                w[vi] += wt * k
        w = np.clip(w, 0, 1)
        hand = joint(v, groups_index, 'joint-l-hand' if side == 'L' else 'joint-r-hand')
        # Rotate in the frontal plane towards the body: choose the sign that brings the hand inwards.
        for sign in (1, -1):
            a = np.radians(angle_deg) * sign
            rel = hand - c
            hx = rel[0] * np.cos(a) - rel[1] * np.sin(a)
            if abs(hx) < abs(rel[0]):
                break
        ca, sa = np.cos(a), np.sin(a)
        rel = out - c
        rx = rel[:, 0] * ca - rel[:, 1] * sa
        ry = rel[:, 0] * sa + rel[:, 1] * ca
        rotated = np.stack([rx + c[0], ry + c[1], out[:, 2]], 1)
        out = out + (rotated - out) * w[:, None]
    return out


# ---------------------------------------------------------------------------------------------
# GLB writer (glTF 2.0, one mesh, one primitive, one morph target)


def write_glb(path, positions, start_delta, indices, masks, hair, cloth_params, name):
    def pad(b, fill=b'\x00'):
        return b + fill * ((4 - len(b) % 4) % 4)

    chunks, views, accessors = [], [], []
    offset = 0

    def add(data, target=None, comp=5126, typ='VEC3', count=None, minmax=None, normalized=False):
        nonlocal offset
        raw = pad(data.tobytes())
        view = {'buffer': 0, 'byteOffset': offset, 'byteLength': len(data.tobytes())}
        if target:
            view['target'] = target
        views.append(view)
        acc = {'bufferView': len(views) - 1, 'componentType': comp, 'count': count, 'type': typ}
        if normalized:
            acc['normalized'] = True
        if minmax:
            acc['min'], acc['max'] = minmax
        accessors.append(acc)
        chunks.append(raw)
        offset += len(raw)
        return len(accessors) - 1

    p = positions.astype(np.float32)
    d = start_delta.astype(np.float32)
    a_pos = add(p, 34962, count=len(p), minmax=(p.min(0).tolist(), p.max(0).tolist()))
    a_delta = add(d, 34962, count=len(d), minmax=(d.min(0).tolist(), d.max(0).tolist()))
    # Masks and hair are ±0.05 m fields: stored as normalised signed bytes (value / 0.05), padded
    # to 4 bytes per vertex as glTF requires for vertex attributes.
    q = lambda a: np.round(np.clip(np.asarray(a) / FIELD_RANGE, -1, 1) * 127).astype(np.int8)
    mask4 = np.zeros((len(masks[0]), 4), dtype=np.int8)
    mask4[:, :3] = np.stack([q(m) for m in masks], 1)
    hair4 = np.zeros((len(hair), 4), dtype=np.int8)
    hair4[:, 0] = q(hair)
    a_masks = add(mask4, 34962, comp=5120, typ='VEC4', count=len(mask4), normalized=True)
    a_hair = add(hair4, 34962, comp=5120, typ='VEC4', count=len(hair4), normalized=True)
    a_idx = add(indices.astype(np.uint16).ravel(), 34963, comp=5123, typ='SCALAR', count=indices.size)

    gltf = {
        'asset': {'version': '2.0', 'generator': 'Diet9 build_makehuman.py', 'copyright': 'Body shapes from MakeHuman assets (CC0 1.0)'},
        'scene': 0,
        'scenes': [{'nodes': [0]}],
        'nodes': [{'mesh': 0, 'name': name}],
        'meshes': [{
            'name': name,
            'primitives': [{
                'attributes': {'POSITION': a_pos, '_CLOTHMASK': a_masks, '_HAIR': a_hair},
                'indices': a_idx,
                'targets': [{'POSITION': a_delta}],
                'mode': 4,
            }],
            'weights': [0.0],
            'extras': {'targetNames': ['start'], 'cloth': cloth_params},
        }],
        'buffers': [{'byteLength': offset}],
        'bufferViews': views,
        'accessors': accessors,
    }
    js = pad(json.dumps(gltf, separators=(',', ':')).encode(), b' ')
    binary = b''.join(chunks)
    total = 12 + 8 + len(js) + 8 + len(binary)
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, total))
        f.write(struct.pack('<II', len(js), 0x4E4F534A) + js)
        f.write(struct.pack('<II', len(binary), 0x004E4942) + binary)


# ---------------------------------------------------------------------------------------------


def build(data, out_dir, only=None):
    base, faces, groups = read_obj(os.path.join(data, '3dobjs', 'base.obj'))
    tris_all, _ = triangulate(faces)
    weights = json.load(open(os.path.join(data, 'rigs', 'default_weights.mhw')))['weights']
    wpath = os.path.join(data, 'rigs', 'default_weights.mhw')
    part = bone_parts(wpath, len(base))
    arm_w = region_weights(wpath, len(base), ('upperarm', 'lowerarm', 'wrist', 'finger', 'metacarpal'))
    head_w = region_weights(wpath, len(base), ('head', 'neck', 'jaw', 'eye', 'oculi', 'oris', 'orbicularis', 'levator', 'risorius', 'tongue', 'special', 'temporalis'))
    neck_low_w = region_weights(wpath, len(base), ('neck01',))
    used = np.unique(tris_all)
    remap = -np.ones(len(base), dtype=np.int64)
    remap[used] = np.arange(len(used))
    tris = remap[tris_all]
    os.makedirs(out_dir, exist_ok=True)
    report = {}
    for name, spec in BODIES.items():
        if only and name not in only:
            continue
        posed = {}
        for state in ('goal', 'start'):
            full = shape(data, base, spec['gender'], spec[state])
            posed[state] = pose_arms(full, part, groups, weights, ARM_DROP_DEG)[used]
        goal, start = posed['goal'], posed['start']
        p_used = part[used]
        # MakeHuman units are decimetres: metres, feet on the floor, centred on x/z (goal body).
        scale = 0.1
        floor = goal[:, 1].min()
        cx, cz = (goal[:, 0].min() + goal[:, 0].max()) / 2, (goal[:, 2].min() + goal[:, 2].max()) / 2
        to_m = lambda v: np.stack([(v[:, 0] - cx) * scale, (v[:, 1] - floor) * scale, (v[:, 2] - cz) * scale], 1)
        goal_m, start_m = to_m(goal), to_m(start)
        layout_args = (p_used, spec['clothing'], spec['gender'], smooth_scalar(arm_w[used], tris, 8), smooth_scalar(head_w[used], tris, 8), neck_low_w[used], smooth_scalar(arm_w[used], tris, 60))
        mb, mt, ms, cloth_params = clothing_layout(goal_m, *layout_args)
        field = cloth_eval(goal_m, mb, mt, ms, cloth_params)
        if 'top' in spec['clothing']:
            # A sports top smooths the chest (no anatomical detail shows through), then the
            # clothing edges are computed again on the smoothed body.
            # Only the front of the top (above the under-band): small bumps vanish quickly under
            # curvature flow, the overall shape changes little.
            inside = np.clip(field / 0.01, 0, 1) * np.clip(goal_m[:, 2] / 0.04, 0, 1) * (goal_m[:, 1] > 0.9)
            goal_m = soften_bust(soften_bust(smooth_region(goal_m, tris, inside, iterations=30), tris, inside), tris, inside, 0.03, 150)
            start_m = soften_bust(soften_bust(smooth_region(start_m, tris, inside, iterations=30), tris, inside), tris, inside, 0.03, 150)
            mb, mt, ms, cloth_params = clothing_layout(goal_m, *layout_args)
            field = cloth_eval(goal_m, mb, mt, ms, cloth_params)
        eye_idx = {k: remap[groups[k]] for k in ('helper-l-eye', 'helper-r-eye')}
        eyes_goal = np.concatenate([goal_m[v] for v in eye_idx.values()])
        hair = hair_field(goal_m, p_used, eyes_goal, spec.get('hair'))
        # Sportswear sits a few millimetres above the skin; hair a little more. Both fade in.
        lift = 0.003 * np.clip(field / 0.006, 0, 1) + (0.006 if spec.get('hair') == 'ponytail' else 0.0025) * np.clip(hair / 0.015, 0, 1)
        goal_m = goal_m + vertex_normals(goal_m, tris) * lift[:, None]
        start_m = start_m + vertex_normals(start_m, tris) * lift[:, None]
        tris_out = tris
        if spec.get('hair') == 'ponytail':
            eyes_start = np.concatenate([start_m[v] for v in eye_idx.values()])
            tail_g, tail_t = ponytail(goal_m, p_used, eyes_goal)
            tail_s, _ = ponytail(start_m, p_used, eyes_start)
            n0 = len(goal_m)
            goal_m = np.concatenate([goal_m, tail_g])
            start_m = np.concatenate([start_m, tail_s])
            no = np.full(len(tail_g), -0.05)
            mb, mt, ms = np.concatenate([mb, no]), np.concatenate([mt, no]), np.concatenate([ms, no])
            hair = np.concatenate([hair, np.full(len(tail_g), 0.05)])
            tris_out = np.concatenate([tris, tail_t + n0])
        path = os.path.join(out_dir, f'body-{name}.glb')
        write_glb(path, goal_m, start_m - goal_m, tris_out, (mb, mt, ms), hair, cloth_params, f'diet9-{name}')
        report[name] = {
            'vertices': int(len(goal_m)),
            'triangles': int(len(tris_out)),
            'height_goal_m': round(float(goal_m[:, 1].max()), 3),
            'width_goal_m': round(float(np.ptp(goal_m[:, 0])), 3),
            'waist_depth_goal_m': round(float(np.ptp(goal_m[(goal_m[:, 1] > 1.0) & (goal_m[:, 1] < 1.1), 2])), 3),
            'waist_depth_start_m': round(float(np.ptp(start_m[(goal_m[:, 1] > 1.0) & (goal_m[:, 1] < 1.1), 2])), 3),
            'cloth_vertices': int((field > 0).sum()),
            'bytes': os.path.getsize(path),
        }
    return report


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', required=True)
    ap.add_argument('--out', default=os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'avatars'))
    ap.add_argument('only', nargs='*')
    a = ap.parse_args()
    print(json.dumps(build(a.data, a.out, a.only), indent=1))
