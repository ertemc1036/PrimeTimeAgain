import { Image } from 'expo-image';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View, type AccessibilityActionEvent } from 'react-native';
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures, useTapGesture } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';

import { buildAvatar, type LoadedAvatar } from './buildAvatar';
import { getPreset } from './presets';
import { CAMERA, createStage, frameCamera, type Stage } from './stage';
import type { AvatarConfig } from './types';

export interface AvatarViewerProps {
  config: AvatarConfig;
  /** Scene background; match the surrounding screen. */
  background?: string;
  /** Pause rendering (e.g. when the screen is not focused) to save battery. */
  active?: boolean;
  /** Allow rotate/zoom gestures. */
  interactive?: boolean;
  /** Start slightly turned and ease to the front, as an entrance. */
  intro?: boolean;
  /** Slowly turn the avatar when nobody is touching it. */
  autoRotate?: boolean;
  /** Called with load timing, for performance checks. */
  onReady?: (ms: number) => void;
}

type Status = 'loading' | 'ready' | 'error';

const ROTATE_SPEED = 0.012;
const DAMPING = 0.12;

/**
 * Real-time 3D avatar: rigged glTF character rendered with Three.js on expo-gl.
 * Drag to rotate 360°, pinch (or scroll on web) to zoom, double-tap to reset.
 * If WebGL or the asset fails, it shows the preset's reference image instead of blocking the screen.
 */
export function AvatarViewer({
  config,
  background = '#08090B',
  active = true,
  interactive = true,
  intro = true,
  autoRotate = false,
  onReady,
}: AvatarViewerProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>('loading');
  const [attempt, setAttempt] = useState(0);

  // Interaction state lives in refs so the render loop reads it without React re-renders.
  const view = useRef({ yaw: intro ? -0.9 : 0, targetYaw: 0, spin: 0, zoom: 0, targetZoom: 0, pitch: 0.06, targetPitch: 0.06 });
  const engine = useRef<{
    renderer: THREE.WebGLRenderer;
    stage: Stage;
    avatar: LoadedAvatar | null;
    frame: number;
    gl: ExpoWebGLRenderingContext;
  } | null>(null);
  const activeRef = useRef(active);
  const autoRotateRef = useRef(autoRotate);
  const lastTouch = useRef(0);
  const configRef = useRef(config);
  const onReadyRef = useRef(onReady);
  const loadToken = useRef(0);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  const loadPreset = async (presetId: string) => {
    const e = engine.current;
    if (!e) return;
    const token = ++loadToken.current;
    const started = Date.now();
    setStatus('loading');
    try {
      const avatar = await buildAvatar(getPreset(presetId));
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
      avatar.play(configRef.current.pose);
      setStatus('ready');
      onReadyRef.current?.(Date.now() - started);
    } catch (err) {
      if (__DEV__) console.warn('[avatar] load failed', err);
      if (token === loadToken.current) setStatus('error');
    }
  };

  // React to customisation changes without recreating the GL context.
  useEffect(() => {
    const previous = configRef.current;
    configRef.current = config;
    const e = engine.current;
    if (!e) return;
    if (previous.presetId !== config.presetId) void loadPreset(config.presetId);
    else e.avatar?.play(config.pose);
    e.stage.setLighting(config.lighting);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.presetId, config.pose, config.lighting]);

  useEffect(
    () => () => {
      loadToken.current++;
      const e = engine.current;
      if (!e) return;
      cancelAnimationFrame(e.frame);
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
      const renderer = new THREE.WebGLRenderer({ canvas, context: gl as unknown as WebGL2RenderingContext, antialias: true });
      renderer.setPixelRatio(1);
      renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;

      const stage = createStage(background);
      stage.setLighting(configRef.current.lighting);
      const timer = new THREE.Timer();
      engine.current = { renderer, stage, avatar: null, frame: 0, gl };

      const tick = () => {
        const e = engine.current;
        if (!e) return;
        e.frame = requestAnimationFrame(tick);
        timer.update();
        const dt = Math.min(timer.getDelta(), 0.1);
        if (!activeRef.current) return;
        const v = view.current;
        if (autoRotateRef.current && Date.now() - lastTouch.current > 4000) v.targetYaw += dt * 0.25;
        v.targetYaw += v.spin;
        v.spin *= 0.92;
        v.yaw += (v.targetYaw - v.yaw) * DAMPING;
        v.zoom += (v.targetZoom - v.zoom) * DAMPING;
        v.pitch += (v.targetPitch - v.pitch) * DAMPING;
        e.stage.turntable.rotation.y = v.yaw;
        const w = gl.drawingBufferWidth;
        const h = gl.drawingBufferHeight;
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
          renderer.setSize(w, h, false);
        }
        e.stage.camera.aspect = w / h;
        e.stage.camera.updateProjectionMatrix();
        frameCamera(e.stage.camera, v.zoom, v.pitch);
        e.avatar?.mixer.update(dt);
        renderer.render(e.stage.scene, e.stage.camera);
        gl.endFrameEXP?.();
      };
      tick();
      void loadPreset(configRef.current.presetId);
    } catch (err) {
      if (__DEV__) console.warn('[avatar] GL init failed', err);
      setStatus('error');
    }
  };

  const pan = usePanGesture({
    runOnJS: true,
    enabled: interactive,
    onUpdate: (e) => {
      const v = view.current;
      lastTouch.current = Date.now();
      v.targetYaw += e.changeX * ROTATE_SPEED;
      v.targetPitch = THREE.MathUtils.clamp(v.targetPitch + e.changeY * 0.004, CAMERA.minPitch, CAMERA.maxPitch);
    },
    onDeactivate: (e) => {
      view.current.spin = THREE.MathUtils.clamp((e.velocityX ?? 0) * 0.00025, -0.12, 0.12);
    },
  });
  const pinch = usePinchGesture({
    runOnJS: true,
    enabled: interactive,
    onUpdate: (e) => {
      const v = view.current;
      lastTouch.current = Date.now();
      v.targetZoom = THREE.MathUtils.clamp(v.targetZoom + (e.scaleChange - 1) * 1.4, 0, 1);
    },
  });
  const doubleTap = useTapGesture({
    runOnJS: true,
    enabled: interactive,
    numberOfTaps: 2,
    onActivate: () => {
      const v = view.current;
      v.targetYaw = Math.round(v.targetYaw / (Math.PI * 2)) * Math.PI * 2;
      v.targetZoom = 0;
      v.targetPitch = 0.06;
    },
  });
  const gestures = useSimultaneousGestures(pan, pinch, doubleTap);

  // Screen reader and keyboard alternatives to the gestures.
  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    const v = view.current;
    if (e.nativeEvent.actionName === 'rotateLeft') v.targetYaw -= Math.PI / 4;
    if (e.nativeEvent.actionName === 'rotateRight') v.targetYaw += Math.PI / 4;
    if (e.nativeEvent.actionName === 'increment') v.targetZoom = Math.min(v.targetZoom + 0.34, 1);
    if (e.nativeEvent.actionName === 'decrement') v.targetZoom = Math.max(v.targetZoom - 0.34, 0);
  };

  const webWheel =
    Platform.OS === 'web' && interactive
      ? {
          onWheel: (e: { deltaY: number; preventDefault?: () => void }) => {
            const v = view.current;
            v.targetZoom = THREE.MathUtils.clamp(v.targetZoom - e.deltaY * 0.0015, 0, 1);
          },
        }
      : {};

  const preset = getPreset(config.presetId);

  return (
    <View
      style={[styles.root, { backgroundColor: background }]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={t('avatar.a11yLabel')}
      accessibilityHint={interactive ? t('avatar.a11yHint') : undefined}
      accessibilityActions={
        interactive
          ? [
              { name: 'rotateLeft', label: t('avatar.rotateLeft') },
              { name: 'rotateRight', label: t('avatar.rotateRight') },
              { name: 'increment', label: t('avatar.zoomIn') },
              { name: 'decrement', label: t('avatar.zoomOut') },
            ]
          : undefined
      }
      onAccessibilityAction={onAccessibilityAction}>
      {status === 'error' ? (
        <View style={styles.fallback}>
          <Image source={preset.preview} style={styles.preview} contentFit="contain" accessible={false} />
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
          <ActivityIndicator color="#B7B7B7" />
          <Text style={styles.loadingText}>{t('avatar.loading')}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  fill: { flex: 1 },
  loading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: '#B7B7B7', fontSize: 13, letterSpacing: 0.5 },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16 },
  preview: { width: '70%', flex: 1, maxHeight: 420, opacity: 0.85 },
  fallbackText: { color: '#B7B7B7', fontSize: 13, textAlign: 'center' },
  retry: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: '#B7B7B7' },
  retryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
