import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ComponentKind } from './catalog';

type Position = [number, number, number];

// Bake parts by material: even 32 bent leads become one draw call per package.
export function createComponentModels() {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const grainCanvas = document.createElement('canvas');
  grainCanvas.width = grainCanvas.height = 64;
  const grainContext = grainCanvas.getContext('2d');
  let grain: THREE.CanvasTexture | undefined;
  if (grainContext) {
    const pixels = grainContext.createImageData(64, 64);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const value = 120 + ((i * 17 + Math.floor(i / 31)) % 39);
      pixels.data.set([value, value, value, 255], i);
    }
    grainContext.putImageData(pixels, 0, 0);
    grain = new THREE.CanvasTexture(grainCanvas);
    grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
    textures.add(grain);
  }
  const standard = (color: string, roughness: number, metalness = 0) => {
    const material = new THREE.MeshStandardMaterial({ color, roughness, metalness,
      bumpMap: grain, bumpScale: metalness > 0.5 ? 0.004 : 0.011 });
    materials.add(material);
    return material;
  };
  const palette = {
    tin: standard('#c6ced4', 0.29, 0.88), aluminum: standard('#bec6cd', 0.38, 0.9),
    darkTin: standard('#5d6972', 0.37, 0.82), gold: standard('#c49743', 0.3, 0.8),
    copper: standard('#b96b35', 0.31, 0.78), mold: standard('#22272b', 0.79),
    dark: standard('#111518', 0.72), ceramic: standard('#bfa780', 0.84),
    tan: standard('#d3ab59', 0.63), ivory: standard('#ddd6bf', 0.65),
    ferrite: standard('#35383b', 0.88), white: standard('#c9cdc9', 0.72),
  };

  function model() {
    const parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
    function add(geometry: THREE.BufferGeometry, material: THREE.Material, position: Position = [0, 0, 0], rotation: Position = [0, 0, 0]) {
      const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...position),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(1, 1, 1));
      geometry.applyMatrix4(matrix);
      const list = parts.get(material) || [];
      list.push(geometry);
      parts.set(material, list);
    }
    function box(size: Position, position: Position, material = palette.mold, radius = 0.035) {
      add(new RoundedBoxGeometry(...size, 1, radius), material, position);
    }
    function cylinder(radius: number, height: number, position: Position, material: THREE.Material, segments = 24) {
      add(new THREE.CylinderGeometry(radius, radius, height, segments), material, position);
    }
    function label(text: string, width: number, depth: number, position: Position, color = '#b6b9b3') {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 128;
      const context = canvas.getContext('2d');
      if (!context) return;
      context.fillStyle = color;
      context.font = '500 46px monospace';
      context.textAlign = 'center'; context.textBaseline = 'middle';
      const lines = text.split('\n');
      lines.forEach((line, i) => context.fillText(line, 128, 64 + (i - (lines.length - 1) / 2) * 49, 238));
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      textures.add(texture);
      const material = new THREE.MeshStandardMaterial({ map: texture, transparent: true,
        alphaTest: 0.08, roughness: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
      materials.add(material);
      add(new THREE.PlaneGeometry(width, depth), material, position, [-Math.PI / 2, 0, 0]);
    }
    // Gull-wing profile: shoulder, slope and solder foot have visible volume.
    function lead(x: number, z: number, side: number, turn = 0, bodyEdge = 0.8, width = 0.15) {
      const shape = new THREE.Shape();
      shape.moveTo(bodyEdge, 0.18); shape.lineTo(bodyEdge + 0.18, 0.18);
      shape.lineTo(bodyEdge + 0.39, -0.17); shape.lineTo(bodyEdge + 0.63, -0.17);
      shape.lineTo(bodyEdge + 0.63, -0.27); shape.lineTo(bodyEdge + 0.32, -0.27);
      shape.lineTo(bodyEdge + 0.12, 0.06); shape.lineTo(bodyEdge, 0.06); shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
      geometry.translate(0, 0, -width / 2);
      if (side === -1) geometry.rotateY(Math.PI);
      geometry.rotateY(turn);
      add(geometry, palette.tin, [x, 0, z]);
    }
    function finish(name: string) {
      const group = new THREE.Group();
      group.name = name;
      parts.forEach((items, material) => {
        const normalized = items.map(item => item.index ? item.toNonIndexed() : item.clone());
        const geometry = mergeGeometries(normalized);
        items.forEach(item => item.dispose());
        normalized.forEach(item => item.dispose());
        if (!geometry) throw new Error('Could not assemble decorative model');
        geometries.add(geometry);
        group.add(new THREE.Mesh(geometry, material));
      });
      const bounds = new THREE.Box3().setFromObject(group);
      const center = bounds.getCenter(new THREE.Vector3());
      group.children.forEach(child => child.position.sub(center));
      const size = bounds.getSize(new THREE.Vector3());
      group.scale.setScalar(1 / Math.max(size.x, size.z, size.y));
      return group;
    }
    return { add, box, cylinder, label, lead, finish };
  }

  const models = {} as Record<ComponentKind, THREE.Group>;
  {
    const m = model();
    m.box([2.1, 0.42, 0.94], [0, 0, 0], palette.ivory);
    m.box([1.46, 0.08, 0.86], [0, 0.24, 0], palette.dark, 0.012);
    for (const side of [-1, 1]) m.box([0.39, 0.49, 0.98], [side * 0.9, 0, 0], palette.tin);
    m.label('103', 1.06, 0.55, [0, 0.289, 0]);
    models.resistor = m.finish('resistor');
  }
  {
    const m = model();
    m.box([1.8, 0.72, 1.04], [0, 0, 0], palette.ceramic, 0.1);
    for (const side of [-1, 1]) m.box([0.38, 0.76, 1.08], [side * 0.79, 0, 0], palette.tin, 0.07);
    models.mlcc = m.finish('mlcc');
  }
  {
    const m = model();
    m.box([2.18, 0.94, 1.34], [0, 0, 0], palette.tan, 0.12);
    for (const side of [-1, 1]) m.box([0.35, 0.1, 1.1], [side * 1.02, -0.43, 0], palette.tin);
    m.box([0.14, 0.012, 1.2], [-0.78, 0.478, 0], palette.mold, 0.005);
    m.label('107\n16V', 1.17, 0.93, [0.13, 0.48, 0], '#574721');
    models.tantalum = m.finish('tantalum');
  }
  {
    const m = model();
    m.box([1.78, 0.23, 1.78], [0, -0.63, 0], palette.dark, 0.1);
    m.cylinder(0.82, 1.54, [0, 0.18, 0], palette.aluminum, 32);
    m.cylinder(0.74, 0.02, [0, 0.961, 0], palette.tin, 32);
    m.cylinder(0.84, 0.12, [0, -0.48, 0], palette.darkTin, 32);
    for (const angle of [Math.PI / 4, -Math.PI / 4]) {
      m.add(new THREE.BoxGeometry(0.95, 0.009, 0.022), palette.darkTin, [0, 0.976, 0], [0, angle, 0]);
    }
    const polarity = new THREE.Shape();
    const markingAngle = Math.acos(-0.45 / 0.74);
    polarity.absarc(0, 0, 0.74, markingAngle, Math.PI * 2 - markingAngle, false);
    polarity.closePath();
    m.add(new THREE.ShapeGeometry(polarity, 20), palette.mold, [0, 0.979, 0], [-Math.PI / 2, 0, 0]);
    for (const side of [-1, 1]) m.box([0.5, 0.11, 0.42], [side * 0.83, -0.79, 0], palette.tin);
    models.electrolytic = m.finish('electrolytic');
  }
  {
    const m = model();
    m.box([2.15, 0.91, 1.32], [0, 0, 0], palette.mold, 0.12);
    for (const side of [-1, 1]) m.box([0.46, 0.25, 1.03], [side * 1.06, -0.39, 0], palette.tin);
    m.box([0.22, 0.012, 1.22], [-0.67, 0.461, 0], palette.white, 0.006);
    m.label('M7', 0.94, 0.68, [0.15, 0.465, 0]);
    models.diode = m.finish('diode');
  }
  {
    const m = model();
    m.box([1.7, 0.43, 1.5], [0, 0, 0], palette.ivory, 0.12);
    for (const side of [-1, 1]) m.box([0.35, 0.1, 1.3], [side * 0.73, -0.2, 0], palette.gold);
    m.cylinder(0.57, 0.14, [0, 0.25, 0], palette.gold);
    const lens = standard('#dcd698', 0.18, 0.06);
    lens.emissive.set('#bca537'); lens.emissiveIntensity = 0.12;
    m.add(new THREE.SphereGeometry(0.47, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), lens, [0, 0.32, 0]);
    m.box([0.22, 0.01, 0.28], [0.6, 0.221, 0.47], palette.mold, 0.005);
    models.led = m.finish('led');
  }
  {
    const m = model();
    m.box([1.95, 0.35, 1.84], [0, -0.49, 0], palette.ferrite, 0.08);
    m.cylinder(0.57, 0.98, [0, 0, 0], palette.ferrite);
    m.cylinder(0.93, 0.16, [0, -0.28, 0], palette.ferrite);
    const points = Array.from({ length: 145 }, (_, i) => {
      const angle = i / 144 * Math.PI * 2 * 7;
      return new THREE.Vector3(Math.cos(angle) * 0.68, -0.17 + i / 144 * 0.71, Math.sin(angle) * 0.68);
    });
    m.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 144, 0.048, 6, false), palette.copper);
    m.cylinder(0.78, 0.1, [0, 0.57, 0], palette.ferrite);
    m.label('4R7', 0.95, 0.54, [0, 0.627, 0]);
    for (const side of [-1, 1]) m.box([0.48, 0.1, 1.17], [side * 0.85, -0.7, 0], palette.tin);
    models.inductor = m.finish('inductor');
  }
  {
    const m = model();
    m.box([1.62, 0.61, 2.42], [0, 0.17, 0], palette.mold, 0.1);
    for (const side of [-1, 1]) for (let pin = 0; pin < 4; pin++) m.lead(0, (pin - 1.5) * 0.53, side);
    m.label('AOI\n358', 1.17, 1.42, [0, 0.481, 0]);
    m.cylinder(0.09, 0.006, [-0.48, 0.481, -0.85], palette.darkTin, 12);
    models.soic = m.finish('soic');
  }
  {
    const m = model();
    m.box([2.72, 0.44, 2.72], [0, 0.1, 0], palette.mold, 0.11);
    for (let edge = 0; edge < 4; edge++) for (let pin = 0; pin < 8; pin++) {
      const offset = (pin - 3.5) * 0.29;
      m.lead(edge % 2 ? offset : 0, edge % 2 ? 0 : offset, 1, edge * Math.PI / 2, 1.36, 0.13);
    }
    m.label('AOI\n32', 1.55, 1.4, [0, 0.326, 0]);
    m.cylinder(0.1, 0.006, [-0.97, 0.326, -0.97], palette.darkTin, 12);
    models.qfp = m.finish('qfp');
  }
  {
    const m = model();
    m.box([2.2, 0.2, 1.46], [0, -0.19, 0], palette.ivory, 0.1);
    m.box([2.23, 0.11, 1.49], [0, -0.05, 0], palette.darkTin, 0.15);
    m.box([2.08, 0.37, 1.33], [0, 0.15, 0], palette.aluminum, 0.15);
    for (const x of [-0.77, 0.77]) for (const z of [-0.45, 0.45]) m.box([0.37, 0.07, 0.38], [x, -0.32, z], palette.gold);
    m.label('16.000', 1.54, 0.63, [0, 0.341, 0], '#455158');
    models.crystal = m.finish('crystal');
  }
  {
    const m = model();
    m.box([1.17, 0.63, 2.08], [0, 0.16, 0], palette.mold, 0.1);
    m.lead(0, -0.64, 1, 0, 0.58, 0.25);
    m.lead(0, 0.64, 1, 0, 0.58, 0.25);
    m.lead(0, 0, -1, 0, 0.58, 0.25);
    m.label('1AM', 0.86, 1.31, [0, 0.481, 0]);
    models.transistor = m.finish('transistor');
  }
  {
    const m = model();
    const rounded = (shape: THREE.Shape | THREE.Path, width: number, height: number, radius: number) => {
      const x = -width / 2, y = -height / 2;
      shape.moveTo(x + radius, y); shape.lineTo(x + width - radius, y);
      shape.quadraticCurveTo(x + width, y, x + width, y + radius);
      shape.lineTo(x + width, y + height - radius);
      shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      shape.lineTo(x + radius, y + height);
      shape.quadraticCurveTo(x, y + height, x, y + height - radius);
      shape.lineTo(x, y + radius); shape.quadraticCurveTo(x, y, x + radius, y);
      return shape;
    };
    const shell = rounded(new THREE.Shape(), 2.77, 1.07, 0.43) as THREE.Shape;
    shell.holes.push(rounded(new THREE.Path(), 2.54, 0.84, 0.33) as THREE.Path);
    m.add(new THREE.ExtrudeGeometry(shell, { depth: 1.69, bevelEnabled: true,
      bevelSegments: 1, steps: 1, bevelSize: 0.018, bevelThickness: 0.018, curveSegments: 6 }), palette.aluminum, [0, 0, -0.845]);
    m.box([2.55, 0.87, 0.1], [0, 0, -0.79], palette.dark);
    m.box([2.04, 0.18, 1.34], [0, 0, 0.03], palette.dark, 0.07);
    for (let pin = 0; pin < 12; pin++) {
      const x = (pin - 5.5) * 0.147;
      m.box([0.07, 0.018, 0.57], [x, 0.1, 0.3], palette.gold, 0.006);
      m.box([0.07, 0.07, 0.51], [x, -0.4, -0.94], palette.gold, 0.006);
    }
    for (const side of [-1, 1]) m.box([0.25, 0.25, 0.6], [side * 1.41, -0.49, -0.45], palette.tin);
    for (const side of [-1, 1]) m.box([0.2, 0.007, 0.36], [side * 0.77, 0.54, 0.02], palette.darkTin, 0.01);
    models.connector = m.finish('connector');
  }

  return { models, dispose: () => {
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    textures.forEach(texture => texture.dispose());
  } };
}
