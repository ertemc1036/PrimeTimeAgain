import * as THREE from 'three';

import { createDiagLog } from './diagnostics';
import { createRenderer } from './renderer';

/**
 * A stand-in for an expo-gl WebGL2 context with the same class hierarchy as expo-gl 58
 * (common/EXWebGLRenderer.cpp: WebGL2RenderingContext extends WebGLRenderingContext).
 * GL calls are stubs; this checks the JavaScript side of renderer creation and a first frame,
 * not GPU output.
 */
function expoGlLikeContext(opts: { webgl2?: boolean } = {}) {
  function WebGLRenderingContext() {}
  function WebGL2RenderingContext() {}
  Object.setPrototypeOf(WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype);
  const g = globalThis as Record<string, unknown>;
  g.WebGLRenderingContext = WebGLRenderingContext;
  g.WebGL2RenderingContext = WebGL2RenderingContext;

  const constants = new Map<string, number>();
  const constant = (name: string) => {
    if (!constants.has(name)) constants.set(name, 0x1000 + constants.size);
    return constants.get(name)!;
  };
  const calls: string[] = [];
  const target = Object.create(WebGL2RenderingContext.prototype) as Record<string, unknown>;
  Object.assign(target, { drawingBufferWidth: 390, drawingBufferHeight: 400, supportsWebGL2: opts.webgl2 ?? true });
  const stubs: Record<string, (...a: unknown[]) => unknown> = {
    getContextAttributes: () => ({ alpha: true, depth: true, stencil: true, antialias: false, premultipliedAlpha: false }),
    getParameter: (p) =>
      p === constant('VIEWPORT') || p === constant('SCISSOR_BOX')
        ? new Int32Array([0, 0, 390, 400])
        : p === constant('VERSION')
          ? 'WebGL 2.0 (OpenGL ES 3.0 Apple)'
          : p === constant('RENDERER')
            ? 'Apple GPU'
            : p === constant('SHADING_LANGUAGE_VERSION')
              ? 'WebGL GLSL ES 3.00'
              : 16,
    getShaderPrecisionFormat: () => ({ precision: 23, rangeMin: 127, rangeMax: 127 }),
    getExtension: () => null,
    getSupportedExtensions: () => [],
    getProgramParameter: (_prog, p) => (p === constant('LINK_STATUS') ? true : 0),
    getShaderParameter: () => true,
    getProgramInfoLog: () => '',
    getShaderInfoLog: () => '',
    getError: () => 0,
    isContextLost: () => false,
    checkFramebufferStatus: () => constant('FRAMEBUFFER_COMPLETE'),
  };
  const gl = new Proxy(target, {
    get(t, prop) {
      if (typeof prop !== 'string') return Reflect.get(t, prop);
      if (prop in t) return t[prop];
      if (/^[A-Z][A-Z0-9_]*$/.test(prop)) return constant(prop);
      return (...args: unknown[]) => {
        calls.push(prop);
        if (stubs[prop]) return stubs[prop](...args);
        if (prop.startsWith('create')) return {};
        return undefined;
      };
    },
  });
  return { gl, calls, cleanup: () => (delete g.WebGLRenderingContext, delete g.WebGL2RenderingContext) };
}

describe('three.js on an expo-gl WebGL2 context', () => {
  it('reproduces the iPhone failure: plain three.js rejects the context as "WebGL 1"', () => {
    const { gl, cleanup } = expoGlLikeContext();
    const canvas = { width: 1, height: 1, style: {}, addEventListener() {}, removeEventListener() {} } as unknown as HTMLCanvasElement;
    expect(() => new THREE.WebGLRenderer({ canvas, context: gl as unknown as WebGL2RenderingContext })).toThrow('WebGL 1 is not supported since r163');
    cleanup();
  });

  it('createRenderer works on the same context, restores the global and renders a first frame of a cube', () => {
    const { gl, calls, cleanup } = expoGlLikeContext();
    const before = (globalThis as Record<string, unknown>).WebGLRenderingContext;
    const log = createDiagLog();
    const renderer = createRenderer(gl as never, log);
    expect((globalThis as Record<string, unknown>).WebGLRenderingContext).toBe(before);
    expect(log.entries.map((e) => e.step)).toEqual(['GL context', 'expo-gl WebGL2 workaround']);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 10);
    camera.position.z = 3;
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshNormalMaterial()));
    renderer.render(scene, camera);
    expect(calls).toContain('compileShader');
    expect(calls).toContain('linkProgram');
    expect(calls.some((c) => c === 'drawElements' || c === 'drawArrays')).toBe(true);
    expect(log.entries.some((e) => e.status === 'fail')).toBe(false);
    renderer.dispose();
    cleanup();
  });

  it('gives a clear error on a WebGL 1-only device instead of a misleading one', () => {
    const { gl, cleanup } = expoGlLikeContext({ webgl2: false });
    expect(() => createRenderer(gl as never)).toThrow('three.js needs WebGL 2');
    cleanup();
  });
});
