import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures, useTapGesture } from 'react-native-gesture-handler';
import * as THREE from 'three';

import { parseGlb, readBody } from './buildAvatar';
import type { DiagLog } from './diagnostics';
import { loadArrayBuffer } from './loadAssets';
import { BODY_MODELS } from './models';
import { createRenderer, syncSize } from './renderer';

export type GLTestMode = 'cube' | 'model' | 'touch';

/**
 * Minimal 3D checks for a real phone, each in its own GL context:
 * - cube:  renderer + one rotating cube (MeshNormalMaterial: no lights, textures or custom shaders)
 * - model: a Diet9 body GLB (goal shape) with a plain standard material and lights
 * - touch: the same body with drag-to-turn and pinch zoom (live values shown)
 */
export function GLTestStage({ mode, body, log }: { mode: GLTestMode; body: 'male' | 'female' | 'neutral'; log: DiagLog }) {
  const [fps, setFps] = useState<number | null>(null);
  const [view, setView] = useState({ yaw: 0, zoom: 0 });
  const state = useRef({ yaw: 0, targetYaw: 0, zoom: 0, targetZoom: 0 });
  const cleanup = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanup.current?.(), []);

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    let frame = 0;
    let disposed = false;
    try {
      const renderer = log.step('Renderer', () => createRenderer(gl, log));
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#0A0C0D');
      const camera = new THREE.PerspectiveCamera(mode === 'cube' ? 50 : 30, 1, 0.05, 50);
      const turntable = new THREE.Group();
      scene.add(turntable);

      if (mode === 'cube') {
        turntable.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshNormalMaterial()));
        camera.position.set(0, 0, 3);
        camera.lookAt(0, 0, 0);
        log.ok('Cube scene');
      } else {
        scene.add(new THREE.HemisphereLight(0xffffff, 0x202020, 1.4));
        const key = new THREE.DirectionalLight(0xffffff, 2.2);
        key.position.set(1.5, 2.5, 2.5);
        scene.add(key);
        const file = `body-${body}.glb`;
        const buffer = await log.stepAsync(`Model ${file} download/read`, () => loadArrayBuffer(BODY_MODELS[body]));
        log.info('Model size', `${Math.round(buffer.byteLength / 1024)} KB`);
        const gltf = await log.stepAsync('GLTFLoader parse', () => parseGlb(buffer));
        if (disposed) return;
        const data = log.step('Read body (goal + start shape)', () => readBody(gltf));
        // Plain grey goal body: checks the model itself, without the hologram shader or morphing.
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(data.goal, 3));
        geo.setIndex(data.index);
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x9aa39f, roughness: 0.6, metalness: 0.1 }));
        mesh.frustumCulled = false;
        turntable.add(mesh);
        log.ok('Body in scene', `${data.goal.length / 3} vertices, ${data.index.count / 3} triangles`);
      }

      const timer = new THREE.Timer();
      let frames = 0;
      let windowStart = Date.now();
      let windowFrames = 0;
      const tick = () => {
        if (disposed) return;
        frame = requestAnimationFrame(tick);
        try {
          timer.update();
          const dt = Math.min(timer.getDelta(), 0.1);
          const v = state.current;
          if (mode === 'cube') {
            turntable.rotation.x += dt * 0.7;
            turntable.rotation.y += dt * 1.0;
          } else {
            if (mode === 'model') v.targetYaw += dt * 0.5;
            v.yaw += (v.targetYaw - v.yaw) * 0.15;
            v.zoom += (v.targetZoom - v.zoom) * 0.15;
            turntable.rotation.y = v.yaw;
            const dist = THREE.MathUtils.lerp(5.2, 2.2, v.zoom);
            const target = THREE.MathUtils.lerp(0.9, 1.4, v.zoom);
            camera.position.set(0, target + 0.25, dist);
            camera.lookAt(0, target, 0);
          }
          camera.aspect = syncSize(renderer, gl);
          camera.updateProjectionMatrix();
          renderer.render(scene, camera);
          gl.endFrameEXP();
          frames++;
          windowFrames++;
          if (frames === 1) log.ok('First frame drawn');
          if (Date.now() - windowStart >= 1000) {
            setFps(Math.round((windowFrames * 1000) / (Date.now() - windowStart)));
            if (mode === 'touch') setView({ yaw: Math.round(THREE.MathUtils.radToDeg(v.yaw)), zoom: Math.round(v.zoom * 100) });
            windowStart = Date.now();
            windowFrames = 0;
          }
        } catch (e) {
          cancelAnimationFrame(frame);
          log.fail(`Frame ${frames + 1}`, e);
        }
      };
      tick();
      cleanup.current = () => {
        disposed = true;
        cancelAnimationFrame(frame);
        scene.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          m.geometry.dispose();
          (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose());
        });
        renderer.dispose();
      };
    } catch (e) {
      if (!log.entries.some((x) => x.status === 'fail')) log.fail('GL setup', e);
    }
  };

  const pan = usePanGesture({
    runOnJS: true,
    enabled: mode === 'touch',
    onUpdate: (e) => {
      state.current.targetYaw += e.changeX * 0.011;
    },
  });
  const pinch = usePinchGesture({
    runOnJS: true,
    enabled: mode === 'touch',
    onUpdate: (e) => {
      const v = state.current;
      v.targetZoom = THREE.MathUtils.clamp(v.targetZoom + (e.scaleChange - 1) * 1.5, 0, 1);
    },
  });
  const doubleTap = useTapGesture({
    runOnJS: true,
    enabled: mode === 'touch',
    numberOfTaps: 2,
    onActivate: () => {
      state.current.targetYaw = 0;
      state.current.targetZoom = 0;
    },
  });
  const gestures = useSimultaneousGestures(pan, pinch, doubleTap);

  return (
    <View style={styles.root}>
      <GestureDetector gesture={gestures}>
        <View style={styles.fill}>
          <GLView style={styles.fill} onContextCreate={(gl) => void onContextCreate(gl)} />
        </View>
      </GestureDetector>
      <View style={styles.badge} pointerEvents="none">
        <Text style={styles.badgeText}>{fps === null ? '… fps' : `${fps} fps`}</Text>
        {mode === 'touch' ? <Text style={styles.badgeText}>{`yaw ${view.yaw}° · zoom ${view.zoom}%`}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { height: 360, borderRadius: 16, overflow: 'hidden', backgroundColor: '#0A0C0D' },
  fill: { flex: 1 },
  badge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { color: '#C8FF2E', fontSize: 12, fontFamily: 'Inter_600SemiBold', fontVariant: ['tabular-nums'] },
});
