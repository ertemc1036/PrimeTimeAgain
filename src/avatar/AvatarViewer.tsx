import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View, type AccessibilityActionEvent } from 'react-native';
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures, useTapGesture } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';

import type { AvatarBody } from '@/domain/types';

import { buildAvatar, type LoadedAvatar } from './buildAvatar';
import { HOLO } from './hologram';
import { createStage, frameCamera, type Stage } from './stage';

export interface AvatarViewerProps {
  body: AvatarBody;
  /** Render only while visible (screen focused, app in foreground) to save battery. */
  active: boolean;
  /** Fewer and slower animations (system "Reduce Motion"). */
  reducedMotion?: boolean;
  /** Change the number to ease the camera back to the default view. */
  resetSignal?: number;
  /** Load time in ms once the body is shown (performance check). */
  onReady?: (ms: number) => void;
}

type Status = 'loading' | 'ready' | 'error';

const ROTATE_SPEED = 0.011;
const DAMPING = 0.12;
const START_YAW = -0.7;

interface Engine {
  renderer: THREE.WebGLRenderer;
  stage: Stage;
  avatar: LoadedAvatar | null;
  frame: number;
  running: boolean;
  tick: () => void;
}

/**
 * Real-time 3D body: Three.js on expo-gl (works in Expo Go; no development build needed).
 * Drag sideways to turn 360° (with momentum), pinch or scroll-wheel to zoom, double-tap to reset.
 * Vertical drags are left to the page so Today keeps scrolling. If WebGL or a model fails, a
 * message with a retry button replaces the canvas; the rest of the screen keeps working.
 */
export function AvatarViewer({ body, active, reducedMotion = false, resetSignal = 0, onReady }: AvatarViewerProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>('loading');
  const [attempt, setAttempt] = useState(0);

  // Interaction state lives in refs so the render loop reads it without React re-renders.
  const view = useRef({ yaw: START_YAW - 0.9, targetYaw: START_YAW, spin: 0, zoom: 0, targetZoom: 0 });
  const engine = useRef<Engine | null>(null);
  const activeRef = useRef(active);
  const reducedRef = useRef(reducedMotion);
  const bodyRef = useRef(body);
  const onReadyRef = useRef(onReady);
  const loadToken = useRef(0);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);
  useEffect(() => {
    reducedRef.current = reducedMotion;
  }, [reducedMotion]);
  useEffect(() => {
    activeRef.current = active;
    const e = engine.current;
    if (active && e && !e.running) e.tick(); // resume the loop
  }, [active]);
  useEffect(() => {
    if (!resetSignal) return;
    const v = view.current;
    v.targetYaw = Math.round((v.targetYaw - START_YAW) / (Math.PI * 2)) * Math.PI * 2 + START_YAW;
    v.targetZoom = 0;
    v.spin = 0;
  }, [resetSignal]);

  const loadBody = async (next: AvatarBody) => {
    const e = engine.current;
    if (!e) return;
    const token = ++loadToken.current;
    const started = Date.now();
    setStatus('loading');
    try {
      const avatar = await buildAvatar(next, e.stage.uniforms);
      if (token !== loadToken.current || !engine.current) {
        avatar.dispose();
        return;
      }
      if (e.avatar) {
        e.stage.turntable.remove(e.avatar.root);
        e.avatar.dispose();
      }
      e.avatar = avatar;
      e.stage.turntable.add(avatar.root);
      setStatus('ready');
      onReadyRef.current?.(Date.now() - started);
    } catch (err) {
      if (__DEV__) console.warn('[avatar] load failed', err);
      if (token === loadToken.current) setStatus('error');
    }
  };

  // Swap the body without recreating the GL context.
  useEffect(() => {
    if (bodyRef.current === body) return;
    bodyRef.current = body;
    void loadBody(body);
  }, [body]);

  // Free GPU memory when the view goes away or is recreated after an error.
  useEffect(
    () => () => {
      loadToken.current++;
      const e = engine.current;
      if (!e) return;
      cancelAnimationFrame(e.frame);
      e.running = false;
      e.avatar?.dispose();
      e.stage.dispose();
      e.renderer.dispose();
      engine.current = null;
    },
    [attempt],
  );

  const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
    try {
      const canvas = {
        width: gl.drawingBufferWidth,
        height: gl.drawingBufferHeight,
        style: {},
        addEventListener: () => {},
        removeEventListener: () => {},
        clientWidth: gl.drawingBufferWidth,
        clientHeight: gl.drawingBufferHeight,
        getContext: () => gl,
      } as unknown as HTMLCanvasElement;
      // The drawing buffer already has the screen's pixel density; antialiasing would only cost
      // fill rate on a retina display.
      const renderer = new THREE.WebGLRenderer({ canvas, context: gl as unknown as WebGL2RenderingContext, antialias: false, powerPreference: 'low-power' });
      renderer.setPixelRatio(1);
      renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;

      const stage = createStage();
      const timer = new THREE.Timer();
      let elapsed = 0;
      const e: Engine = {
        renderer,
        stage,
        avatar: null,
        frame: 0,
        running: false,
        tick: () => {
          const cur = engine.current;
          if (!cur) return;
          if (!activeRef.current) {
            // Stop the loop entirely while hidden; the `active` effect restarts it.
            cur.running = false;
            return;
          }
          cur.running = true;
          cur.frame = requestAnimationFrame(cur.tick);
          timer.update();
          const dt = Math.min(timer.getDelta(), 0.1);
          elapsed += dt;
          const reduced = reducedRef.current;
          const v = view.current;
          v.targetYaw += v.spin;
          v.spin *= 0.93;
          if (Math.abs(v.spin) < 0.0001) v.spin = 0;
          v.yaw += (v.targetYaw - v.yaw) * (reduced ? 0.3 : DAMPING);
          v.zoom += (v.targetZoom - v.zoom) * DAMPING;
          stage.turntable.rotation.y = v.yaw;
          const w = gl.drawingBufferWidth;
          const h = gl.drawingBufferHeight;
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
            renderer.setSize(w, h, false);
          }
          stage.camera.aspect = w / h;
          stage.camera.updateProjectionMatrix();
          frameCamera(stage.camera, v.zoom);
          stage.update(elapsed, dt, reduced);
          cur.avatar?.update(dt, elapsed, reduced);
          renderer.render(stage.scene, stage.camera);
          gl.endFrameEXP?.();
        },
      };
      engine.current = e;
      // The timer starts on the first update; reset it so the first frame doesn't jump.
      timer.update();
      e.tick();
      void loadBody(bodyRef.current);
    } catch (err) {
      if (__DEV__) console.warn('[avatar] GL init failed', err);
      setStatus('error');
    }
  };

  const pan = usePanGesture({
    runOnJS: true,
    // Horizontal drags turn the body; vertical drags fail fast so the page scrolls.
    activeOffsetX: [-10, 10],
    failOffsetY: [-14, 14],
    onUpdate: (ev) => {
      const v = view.current;
      v.targetYaw += ev.changeX * ROTATE_SPEED;
      v.spin = 0;
    },
    onDeactivate: (ev) => {
      if (reducedRef.current) return;
      view.current.spin = THREE.MathUtils.clamp((ev.velocityX ?? 0) * 0.00022, -0.11, 0.11);
    },
  });
  const pinch = usePinchGesture({
    runOnJS: true,
    onUpdate: (ev) => {
      const v = view.current;
      v.targetZoom = THREE.MathUtils.clamp(v.targetZoom + (ev.scaleChange - 1) * 1.5, 0, 1);
    },
  });
  const doubleTap = useTapGesture({
    runOnJS: true,
    numberOfTaps: 2,
    onActivate: () => {
      const v = view.current;
      v.targetYaw = Math.round((v.targetYaw - START_YAW) / (Math.PI * 2)) * Math.PI * 2 + START_YAW;
      v.targetZoom = 0;
      v.spin = 0;
    },
  });
  const gestures = useSimultaneousGestures(pan, pinch, doubleTap);

  // Screen reader alternatives to the gestures.
  const onAccessibilityAction = (ev: AccessibilityActionEvent) => {
    const v = view.current;
    if (ev.nativeEvent.actionName === 'rotateLeft') v.targetYaw -= Math.PI / 4;
    if (ev.nativeEvent.actionName === 'rotateRight') v.targetYaw += Math.PI / 4;
    if (ev.nativeEvent.actionName === 'increment') v.targetZoom = Math.min(v.targetZoom + 0.34, 1);
    if (ev.nativeEvent.actionName === 'decrement') v.targetZoom = Math.max(v.targetZoom - 0.34, 0);
  };

  const webWheel =
    Platform.OS === 'web'
      ? {
          onWheel: (ev: { deltaY: number }) => {
            const v = view.current;
            v.targetZoom = THREE.MathUtils.clamp(v.targetZoom - ev.deltaY * 0.0015, 0, 1);
          },
        }
      : {};

  return (
    <View
      style={styles.root}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={t('avatar.a11yLabel')}
      accessibilityHint={t('avatar.a11yHint')}
      accessibilityActions={[
        { name: 'rotateLeft', label: t('avatar.rotateLeft') },
        { name: 'rotateRight', label: t('avatar.rotateRight') },
        { name: 'increment', label: t('avatar.zoomIn') },
        { name: 'decrement', label: t('avatar.zoomOut') },
      ]}
      onAccessibilityAction={onAccessibilityAction}>
      {status === 'error' ? (
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>{t('avatar.unavailable')}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setStatus('loading');
              setAttempt((a) => a + 1);
            }}
            style={styles.retry}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <GestureDetector gesture={gestures}>
          <View style={styles.fill} {...webWheel}>
            <GLView key={attempt} style={styles.fill} onContextCreate={onContextCreate} />
          </View>
        </GestureDetector>
      )}
      {status === 'loading' ? (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator color={HOLO.neon} />
          <Text style={styles.loadingText}>{t('avatar.loading')}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden', backgroundColor: HOLO.background },
  fill: { flex: 1 },
  loading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: '#9AA39F', fontSize: 13, letterSpacing: 0.5, fontFamily: 'Inter_500Medium' },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  fallbackText: { color: '#C9D1CD', fontSize: 14, textAlign: 'center', fontFamily: 'Inter_500Medium' },
  retry: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: HOLO.neon },
  retryText: { color: HOLO.neon, fontSize: 14, fontFamily: 'Inter_700Bold' },
});
