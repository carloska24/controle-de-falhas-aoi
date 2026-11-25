'use client';

import { useEffect, useRef, useState } from 'react';
import { COMPONENT_CATALOG } from './smd/catalog';
import ComponentFallback from './smd/ComponentFallback';

export default function SMDAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    // The form paints independently. All geometry, lighting and textures are local.
    import('./smd/scene').then(({ createComponentScene }) => {
      if (cancelled || !containerRef.current) return;
      dispose = createComponentScene(containerRef.current, {
        onReady: () => { if (!cancelled) setReady(true); },
        onUnavailable: () => { if (!cancelled) setReady(false); },
      });
    }).catch(() => { /* The local SVG fallback remains visible if 3D cannot load. */ });
    return () => { cancelled = true; dispose?.(); };
  }, []);

  return (
    <div ref={containerRef} aria-hidden="true"
      data-smd-renderer={ready ? 'webgl2' : 'svg'}
      data-smd-types={COMPONENT_CATALOG.map(component => component.id).join(',')}
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        zIndex: -10, pointerEvents: 'none', overflow: 'hidden', isolation: 'isolate' }}>
      <ComponentFallback hidden={ready} />
    </div>
  );
}
