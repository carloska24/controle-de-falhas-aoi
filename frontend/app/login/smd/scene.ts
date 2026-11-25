import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { COMPONENT_CATALOG } from './catalog';
import { createComponentModels } from './models';

type SceneCallbacks = { onReady: () => void; onUnavailable: () => void };

export function createComponentScene(container: HTMLDivElement, callbacks: SceneCallbacks) {
  const initializationStarted = performance.now();
  let renderer: THREE.WebGLRenderer | undefined;
  let collection: ReturnType<typeof createComponentModels> | undefined;
  let environment: THREE.WebGLRenderTarget | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let disposeListeners = () => {};
  let frame = 0;
  let disposed = false;
  let lost = false;
  let ready = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    resizeObserver?.disconnect();
    disposeListeners();
    collection?.dispose();
    environment?.dispose();
    renderer?.dispose();
    renderer?.forceContextLoss();
    renderer?.domElement.remove();
  }

  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true,
      powerPreference: 'low-power', stencil: false, depth: true });
    const activeRenderer = renderer;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;opacity:0.88;pointer-events:none;';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.dataset.smdScene = 'true';
    container.appendChild(canvas);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 1600);
    camera.position.z = 800;
    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    try { environment = pmrem.fromScene(room, 0.035, 0.1, 100, { size: 128 }); }
    finally { room.dispose(); pmrem.dispose(); }
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.8;
    scene.add(new THREE.HemisphereLight('#e8f1fa', '#333d47', 1));
    const key = new THREE.DirectionalLight('#fff3dc', 2.4);
    key.position.set(-260, 420, 600); scene.add(key);
    const rim = new THREE.DirectionalLight('#a6c6e9', 1.2);
    rim.position.set(380, -160, 250); scene.add(rim);
    collection = createComponentModels();
    const instances = Array.from({ length: 18 }, (_, i) => {
      const spec = COMPONENT_CATALOG[i % COMPONENT_CATALOG.length];
      const object = new THREE.Group();
      const tilt = new THREE.Group();
      tilt.add(collection!.models[spec.id].clone(true));
      object.add(tilt);
      scene.add(object);
      return { object, tilt, spec, i, angle: i * 2.399, lane: [0.12, 0.84, 0.26, 0.94, 0.06, 0.76][i % 6],
        phase: (0.11 + i * 0.61803398875) % 1, depth: 0.76 + (i % 4) * 0.08 };
    });
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 1, height = 1, compact = false, lowQuality = false;
    let seconds = 0, previousStamp = 0, lastRender = 0, measuredAt = 0, renderedFrames = 0, meanDrawCost = 0;

    function pose() {
      for (const item of instances) {
        item.object.visible = !((compact || lowQuality) && item.i >= 12);
        const side = item.lane < 0.5 ? -1 : 1;
        // Keep the original centered form's footprint quiet, including narrow screens.
        const freeWidth = Math.max(0, width / 2 - 260);
        const laneOffset = freeWidth ? 260 + freeWidth * (0.18 + (item.i % 3) * 0.29) : width * (0.38 + (item.i % 2) * 0.08);
        const drift = Math.sin(seconds * 0.18 + item.angle) * (compact ? 3 : 9);
        const y = ((item.phase * (height + 140) + seconds * (10 + item.i % 4 * 1.7)) % (height + 140));
        item.object.position.set(side * laneOffset + drift, height / 2 + 70 - y, -item.i * 4);
        item.object.rotation.z = item.angle + seconds * (item.i % 2 ? -0.055 : 0.045);
        item.tilt.rotation.set(0.9 + Math.sin(seconds * 0.12 + item.angle) * 0.24,
          0.25 * Math.cos(seconds * 0.13 + item.angle), 0);
        if (item.spec.id === 'connector') item.tilt.rotation.x += 0.45;
        item.object.scale.setScalar(item.spec.size * item.depth * (compact ? 0.68 : 1));
      }
    }
    function paint() {
      if (disposed || lost || document.hidden) return;
      pose();
      const started = performance.now();
      activeRenderer.render(scene, camera);
      const drawCost = performance.now() - started;
      meanDrawCost = meanDrawCost ? meanDrawCost * 0.9 + drawCost * 0.1 : drawCost;
      canvas.dataset.smdRenderMs = drawCost.toFixed(2);
      if (!ready) {
        canvas.dataset.smdInitMs = (performance.now() - initializationStarted).toFixed(0);
        ready = true; callbacks.onReady();
      }
    }
    function resize() {
      const bounds = container.getBoundingClientRect();
      width = Math.max(1, bounds.width); height = Math.max(1, bounds.height);
      compact = width < 720;
      activeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact || lowQuality ? 1 : 1.5));
      activeRenderer.setSize(width, height, false);
      camera.left = -width / 2; camera.right = width / 2;
      camera.top = height / 2; camera.bottom = -height / 2;
      camera.updateProjectionMatrix();
      paint();
    }
    function animate(stamp: number) {
      if (disposed || lost || document.hidden || motion.matches) return;
      frame = requestAnimationFrame(animate);
      const interval = 1000 / (compact || lowQuality ? 24 : 30);
      if (stamp - lastRender < interval - 1) return;
      const delta = previousStamp ? Math.min((stamp - previousStamp) / 1000, 0.1) : 0;
      previousStamp = stamp;
      // Preserve fractional frame time (24Hz must not round down to 20Hz on 60Hz displays).
      lastRender = stamp - ((stamp - lastRender) % interval);
      seconds += delta;
      try { paint(); }
      catch { lost = true; callbacks.onUnavailable(); return; }
      renderedFrames++;
      if (!measuredAt) measuredAt = stamp;
      if (stamp - measuredAt >= 2000) {
        const fps = renderedFrames * 1000 / (stamp - measuredAt);
        canvas.dataset.smdFps = fps.toFixed(1);
        canvas.dataset.smdDrawCalls = String(activeRenderer.info.render.calls);
        canvas.dataset.smdTriangles = String(activeRenderer.info.render.triangles);
        canvas.dataset.smdPixelRatio = String(activeRenderer.getPixelRatio());
        // Occluded/minimized browser windows may throttle RAF to 1Hz without hiding
        // the document. Do not mistake that scheduler limit for expensive rendering.
        if (fps < 18 && meanDrawCost > 18 && !lowQuality && seconds > 3) { lowQuality = true; resize(); }
        measuredAt = stamp; renderedFrames = 0;
      }
    }
    function playback() {
      cancelAnimationFrame(frame);
      previousStamp = 0; lastRender = 0; measuredAt = 0; renderedFrames = 0;
      canvas.dataset.smdMotion = document.hidden ? 'paused' : motion.matches ? 'still' : 'animated';
      if (!document.hidden && !lost && !disposed) {
        paint();
        if (!motion.matches) frame = requestAnimationFrame(animate);
      }
    }
    function contextLost(event: Event) {
      event.preventDefault(); lost = true; ready = false;
      cancelAnimationFrame(frame);
      canvas.style.visibility = 'hidden';
      callbacks.onUnavailable();
    }
    function contextRestored() {
      lost = false; canvas.style.visibility = '';
      resize(); playback();
    }
    document.addEventListener('visibilitychange', playback);
    motion.addEventListener('change', playback);
    canvas.addEventListener('webglcontextlost', contextLost);
    canvas.addEventListener('webglcontextrestored', contextRestored);
    disposeListeners = () => {
      document.removeEventListener('visibilitychange', playback);
      motion.removeEventListener('change', playback);
      canvas.removeEventListener('webglcontextlost', contextLost);
      canvas.removeEventListener('webglcontextrestored', contextRestored);
    };
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize(); playback();
    return dispose;
  } catch {
    dispose();
    callbacks.onUnavailable();
    return () => {};
  }
}
