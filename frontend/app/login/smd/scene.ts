import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { COMPONENT_CATALOG, COMPONENT_SCALE } from './catalog';
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
  let interactionFrame = 0;
  let disposed = false;
  let lost = false;
  let ready = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    cancelAnimationFrame(interactionFrame);
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
      return { object, tilt, spec, i, offset: new THREE.Vector2(), angle: i * 2.399, lane: [0.12, 0.84, 0.26, 0.94, 0.06, 0.76][i % 6],
        phase: (0.11 + i * 0.61803398875) % 1, depth: 0.76 + (i % 4) * 0.08 };
    });
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 1, height = 1, compact = false, lowQuality = false;
    let seconds = 0, previousStamp = 0, lastRender = 0, measuredAt = 0, renderedFrames = 0, meanDrawCost = 0;
    const surface = container.closest<HTMLElement>('[data-login-surface]') || container.parentElement!;
    const originalCursor = surface.style.cursor;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const natural = new THREE.Vector3();
    type Instance = typeof instances[number];
    let drag: { item: Instance; pointerId: number; dx: number; dy: number; startX: number; startY: number; moved: boolean } | null = null;
    let lastHoverAt = 0;
    let suppressClickUntil = 0;

    function naturalPosition(item: Instance, target: THREE.Vector3) {
      const side = item.lane < 0.5 ? -1 : 1;
      const freeWidth = Math.max(0, width / 2 - 260);
      const laneOffset = freeWidth ? 260 + freeWidth * (0.18 + (item.i % 3) * 0.29) : width * (0.38 + (item.i % 2) * 0.08);
      const drift = Math.sin(seconds * 0.18 + item.angle) * (compact ? 3 : 9);
      const y = ((item.phase * (height + 140) + seconds * (10 + item.i % 4 * 1.7)) % (height + 140));
      return target.set(side * laneOffset + drift, height / 2 + 70 - y, -item.i * 4);
    }

    function pose() {
      for (const item of instances) {
        item.object.visible = !((compact || lowQuality) && item.i >= 12);
        if (drag?.item !== item) {
          naturalPosition(item, natural);
          const margin = item.spec.size * COMPONENT_SCALE / 2;
          const y = THREE.MathUtils.euclideanModulo(natural.y + item.offset.y + height / 2 + 70, height + 140) - height / 2 - 70;
          item.object.position.set(THREE.MathUtils.clamp(natural.x + item.offset.x, -width / 2 + margin, width / 2 - margin), y, natural.z);
        }
        item.object.rotation.z = item.angle + seconds * (item.i % 2 ? -0.055 : 0.045);
        item.tilt.rotation.set(0.9 + Math.sin(seconds * 0.12 + item.angle) * 0.24,
          0.25 * Math.cos(seconds * 0.13 + item.angle), 0);
        if (item.spec.id === 'connector') item.tilt.rotation.x += 0.45;
        item.object.scale.setScalar(item.spec.size * item.depth * COMPONENT_SCALE * (compact ? 0.68 : 1));
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
      finishDrag();
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
      finishDrag();
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
      finishDrag();
      cancelAnimationFrame(frame);
      canvas.style.visibility = 'hidden';
      callbacks.onUnavailable();
    }
    function contextRestored() {
      lost = false; canvas.style.visibility = '';
      resize(); playback();
    }

    function isBackground(event: PointerEvent) {
      return event.target instanceof Element && surface.contains(event.target)
        && !event.target.closest('[data-login-card], input, textarea, button, a, select, [contenteditable]');
    }
    function pointerPosition(event: PointerEvent) {
      const bounds = canvas.getBoundingClientRect();
      return pointer.set((event.clientX - bounds.left) / bounds.width * width - width / 2,
        height / 2 - (event.clientY - bounds.top) / bounds.height * height);
    }
    function pick(event: PointerEvent): Instance | undefined {
      if (!ready || lost || disposed || !isBackground(event)) return;
      const point = pointerPosition(event);
      raycaster.setFromCamera(new THREE.Vector2(point.x / (width / 2), point.y / (height / 2)), camera);
      const candidates = instances.filter(item => item.object.visible);
      scene.updateMatrixWorld(true);
      const hit = raycaster.intersectObjects(candidates.map(item => item.object), true)[0];
      if (hit) return candidates.find(item => {
        let object: THREE.Object3D | null = hit.object;
        while (object) { if (object === item.object) return true; object = object.parent; }
        return false;
      });
      // Small packages still get a reasonable mouse target, without covering the form.
      return candidates.map(item => ({ item, distance: Math.hypot(point.x - item.object.position.x, point.y - item.object.position.y) }))
        .filter(({ item, distance }) => distance < Math.max(11, item.spec.size * item.depth * COMPONENT_SCALE * 0.45 * (compact ? 0.68 : 1)))
        .sort((a, b) => a.distance - b.distance)[0]?.item;
    }
    function requestInteractionPaint() {
      if (interactionFrame) return;
      interactionFrame = requestAnimationFrame(() => { interactionFrame = 0; paint(); });
    }
    function pointerDown(event: PointerEvent) {
      if (event.pointerType !== 'mouse' || event.button !== 0 || !event.isPrimary || drag) return;
      const item = pick(event);
      if (!item) return;
      const point = pointerPosition(event);
      drag = { item, pointerId: event.pointerId, dx: item.object.position.x - point.x,
        dy: item.object.position.y - point.y, startX: event.clientX, startY: event.clientY, moved: false };
      surface.setPointerCapture(event.pointerId);
      surface.style.cursor = 'grabbing';
      canvas.dataset.smdInteraction = 'dragging';
      event.preventDefault();
    }
    function pointerMove(event: PointerEvent) {
      if (drag && drag.pointerId === event.pointerId) {
        const point = pointerPosition(event);
        const margin = drag.item.spec.size * COMPONENT_SCALE / 2;
        drag.item.object.position.x = THREE.MathUtils.clamp(point.x + drag.dx, -width / 2 + margin, width / 2 - margin);
        drag.item.object.position.y = THREE.MathUtils.clamp(point.y + drag.dy, -height / 2 + margin, height / 2 - margin);
        drag.moved ||= Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 3;
        event.preventDefault();
        requestInteractionPaint();
        return;
      }
      if (event.pointerType !== 'mouse' || event.buttons) return;
      if (!isBackground(event)) { surface.style.cursor = originalCursor; return; }
      const now = performance.now();
      if (now - lastHoverAt < 50) return;
      lastHoverAt = now;
      surface.style.cursor = pick(event) ? 'grab' : originalCursor;
    }
    function finishDrag() {
      if (!drag) { surface.style.cursor = originalCursor; return; }
      const previous = drag;
      drag = null;
      naturalPosition(previous.item, natural);
      previous.item.offset.set(previous.item.object.position.x - natural.x, previous.item.object.position.y - natural.y);
      if (previous.moved) suppressClickUntil = performance.now() + 350;
      if (surface.hasPointerCapture(previous.pointerId)) surface.releasePointerCapture(previous.pointerId);
      surface.style.cursor = originalCursor;
      canvas.dataset.smdInteraction = 'idle';
      canvas.dataset.smdLastDrag = previous.item.spec.id;
      canvas.dataset.smdDrop = JSON.stringify({ x: Math.round(previous.item.object.position.x), y: Math.round(previous.item.object.position.y) });
    }
    function pointerUp(event: PointerEvent) {
      if (drag?.pointerId !== event.pointerId) return;
      event.preventDefault();
      finishDrag();
    }
    function suppressDropClick(event: MouseEvent) {
      if (performance.now() >= suppressClickUntil) return;
      suppressClickUntil = 0;
      event.preventDefault(); event.stopPropagation();
    }
    function pointerLeft(event: PointerEvent) { if (!event.relatedTarget && !drag) surface.style.cursor = originalCursor; }

    window.addEventListener('pointerdown', pointerDown, true);
    window.addEventListener('pointermove', pointerMove, { passive: false });
    window.addEventListener('pointerup', pointerUp, true);
    window.addEventListener('pointercancel', pointerUp, true);
    window.addEventListener('click', suppressDropClick, true);
    window.addEventListener('pointerout', pointerLeft);
    window.addEventListener('blur', finishDrag);
    surface.addEventListener('lostpointercapture', finishDrag);
    document.addEventListener('visibilitychange', playback);
    motion.addEventListener('change', playback);
    canvas.addEventListener('webglcontextlost', contextLost);
    canvas.addEventListener('webglcontextrestored', contextRestored);
    disposeListeners = () => {
      finishDrag();
      window.removeEventListener('pointerdown', pointerDown, true);
      window.removeEventListener('pointermove', pointerMove);
      window.removeEventListener('pointerup', pointerUp, true);
      window.removeEventListener('pointercancel', pointerUp, true);
      window.removeEventListener('click', suppressDropClick, true);
      window.removeEventListener('pointerout', pointerLeft);
      window.removeEventListener('blur', finishDrag);
      surface.removeEventListener('lostpointercapture', finishDrag);
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
