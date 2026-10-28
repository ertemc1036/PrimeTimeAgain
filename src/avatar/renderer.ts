import * as THREE from 'three';

import type { DiagLog } from './diagnostics';

/** The parts of an expo-gl context the renderer setup needs (a WebGL2-style context on native). */
export interface GLContextLike {
  drawingBufferWidth: number;
  drawingBufferHeight: number;
  getParameter(pname: number): unknown;
  VERSION: number;
  RENDERER: number;
  SHADING_LANGUAGE_VERSION: number;
  endFrameEXP?: () => void;
  supportsWebGL2?: boolean;
}

/**
 * Create a three.js WebGLRenderer on an expo-gl context.
 *
 * Why the wrapper is needed: since three r163 the renderer rejects WebGL1 with
 * `context instanceof WebGLRenderingContext`. In expo-gl ≥ 56.0.5 (SDK 58: 58.0.3) the native
 * `WebGL2RenderingContext` *extends* `WebGLRenderingContext` (expo-gl CHANGELOG, PR #45871), so a
 * real WebGL2 context on iOS/Android passes that `instanceof` test and three throws
 * "WebGL 1 is not supported since r163". Browsers don't have this inheritance, which is why the web
 * build worked. We check for WebGL2 ourselves and hide the global constructor only for the
 * duration of the constructor call.
 */
export function createRenderer(gl: GLContextLike, log?: DiagLog): THREE.WebGLRenderer {
  if (gl.supportsWebGL2 === false) {
    throw new Error('This device only offers WebGL 1 (OpenGL ES 2); three.js needs WebGL 2 (OpenGL ES 3).');
  }
  log?.info(
    'GL context',
    `${gl.drawingBufferWidth}×${gl.drawingBufferHeight} px · WebGL2=${String(gl.supportsWebGL2 ?? 'n/a')} · ${String(gl.getParameter(gl.VERSION))} · ${String(gl.getParameter(gl.RENDERER))}`,
  );

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

  const g = globalThis as { WebGLRenderingContext?: unknown };
  const isWebGL2Subclass =
    typeof g.WebGLRenderingContext === 'function' &&
    typeof (globalThis as { WebGL2RenderingContext?: unknown }).WebGL2RenderingContext === 'function' &&
    gl instanceof (g.WebGLRenderingContext as new () => object) &&
    gl instanceof ((globalThis as { WebGL2RenderingContext?: unknown }).WebGL2RenderingContext as new () => object);
  const saved = g.WebGLRenderingContext;
  if (isWebGL2Subclass) g.WebGLRenderingContext = undefined;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, context: gl as unknown as WebGL2RenderingContext, antialias: false, powerPreference: 'low-power' });
  } finally {
    if (isWebGL2Subclass) g.WebGLRenderingContext = saved;
  }
  if (isWebGL2Subclass) log?.info('expo-gl WebGL2 workaround', 'WebGL2RenderingContext extends WebGLRenderingContext here; three.js WebGL1 check bypassed');

  renderer.setPixelRatio(1); // the drawing buffer already has the screen's pixel density
  renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Report GLSL compile/link errors with the driver's message instead of failing silently.
  renderer.debug.checkShaderErrors = true;
  renderer.debug.onShaderError = (glCtx, program, vertexShader, fragmentShader) => {
    const c = glCtx as WebGL2RenderingContext;
    const msg = [c.getProgramInfoLog(program), c.getShaderInfoLog(vertexShader), c.getShaderInfoLog(fragmentShader)].filter(Boolean).join('\n').slice(0, 1200);
    log?.fail('Shader compile', msg || 'unknown shader error');
  };
  return renderer;
}

/** Keep the renderer's buffer size in sync with the GL view (orientation, layout changes). */
export function syncSize(renderer: THREE.WebGLRenderer, gl: GLContextLike) {
  const canvas = renderer.domElement as unknown as { width: number; height: number };
  const w = gl.drawingBufferWidth;
  const h = gl.drawingBufferHeight;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    renderer.setSize(w, h, false);
  }
  return w / Math.max(1, h);
}
