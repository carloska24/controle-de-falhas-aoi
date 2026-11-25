import { useId } from 'react';
import { COMPONENT_CATALOG, type ComponentKind } from './catalog';

const positions = [[11, 12], [84, 19], [26, 34], [94, 43], [6, 58], [76, 65],
  [23, 81], [88, 87], [10, 93], [82, 6], [5, 35], [94, 60]];

function Shape({ kind, prefix }: { kind: ComponentKind; prefix: string }) {
  const metal = `url(#${prefix}-metal)`;
  if (kind === 'electrolytic') return <><path d="M24 29h52v37H24z" fill="#282e34" /><path d="M27 24h46v33c-10 10-36 10-46 0z" fill={metal} /><ellipse cx="50" cy="24" rx="23" ry="13" fill={metal} /><path d="m39 18 22 12m0-12L39 30" stroke="#68737a" strokeWidth="2" /></>;
  if (kind === 'inductor') return <><rect x="23" y="21" width="54" height="46" rx="6" fill="#363e43" /><ellipse cx="50" cy="39" rx="21" ry="15" fill="#242b2f" />{[38, 43, 48, 53].map(y => <ellipse key={y} cx="50" cy={y} rx="19" ry="11" fill="none" stroke="#ac713e" strokeWidth="3" />)}<ellipse cx="50" cy="34" rx="20" ry="12" fill="#4b5050" /></>;
  if (kind === 'led') return <><rect x="24" y="28" width="52" height="33" rx="5" fill="#b99a4e" /><path d="M27 23h46v32H27z" fill="#dfd9c3" /><ellipse cx="50" cy="38" rx="15" ry="12" fill="#ad995c" /><ellipse cx="48" cy="35" rx="11" ry="8" fill="#e2dbab" /></>;
  if (kind === 'qfp' || kind === 'soic' || kind === 'transistor') return <>
    {Array.from({ length: kind === 'qfp' ? 8 : kind === 'soic' ? 4 : 2 }, (_, i) => <g key={i} fill={metal}>
      <rect x="17" y={24 + i * (kind === 'qfp' ? 5 : 10)} width="14" height="3" />
      {(kind !== 'transistor' || i === 0) && <rect x="69" y={24 + i * (kind === 'qfp' ? 5 : 10)} width="14" height="3" />}
      {kind === 'qfp' && <><rect x={29 + i * 5} y="14" width="3" height="14" /><rect x={29 + i * 5} y="61" width="3" height="12" /></>}
    </g>)}<rect x="28" y="22" width="44" height="43" rx="3" fill="#171e24" /><path d="m28 22 6-5h44l-6 5z" fill="#47525a" /><circle cx="35" cy="30" r="2" fill="#7b8286" /><text x="50" y="48" fill="#969c9d" fontSize="10" textAnchor="middle">{kind === 'qfp' ? '32' : kind === 'soic' ? '358' : '1AM'}</text>
  </>;
  if (kind === 'connector') return <><rect x="17" y="25" width="68" height="37" rx="11" fill={metal} /><rect x="22" y="31" width="58" height="25" rx="8" fill="#182128" /><rect x="27" y="40" width="48" height="7" rx="3" fill="#3b4143" />{[31, 37, 43, 49, 55, 61, 67, 73].map(x => <rect key={x} x={x} y="39" width="2" height="3" fill="#bd974e" />)}</>;
  const body = kind === 'mlcc' ? '#bca888' : kind === 'tantalum' ? '#c4a052' : kind === 'crystal' ? metal : '#282f34';
  return <><path d="m19 32 9-9h54l-9 9z" fill={kind === 'tantalum' ? '#dec077' : '#7f898e'} /><path d="m73 32 9-9v29l-9 9z" fill="#50595f" /><rect x="19" y="32" width="54" height="29" rx="3" fill={body} />
    {kind !== 'crystal' && <><rect x="17" y="33" width="10" height="29" rx="2" fill={metal} /><rect x="67" y="33" width="10" height="29" rx="2" fill={metal} /></>}
    {(kind === 'diode' || kind === 'tantalum') && <rect x="29" y="33" width="4" height="27" fill={kind === 'diode' ? '#b9bfbd' : '#5b4b2d'} />}
    {kind !== 'mlcc' && <text x="49" y="52" fontSize="10" fill={kind === 'crystal' || kind === 'tantalum' ? '#4b5352' : '#b8bdbb'} textAnchor="middle">{kind === 'resistor' ? '103' : kind === 'crystal' ? '16.0' : kind === 'diode' ? 'M7' : '107'}</text>}
  </>;
}

// An immediate local illustration also covers WebGL unavailable/context-lost cases.
export default function ComponentFallback({ hidden }: { hidden: boolean }) {
  const prefix = useId().replace(/:/g, '');
  return <div data-smd-fallback="true" style={{ position: 'absolute', inset: 0, display: hidden ? 'none' : undefined }}>
    {COMPONENT_CATALOG.map((component, i) => <svg key={component.id} viewBox="0 0 100 80" data-smd-component={component.id}
      style={{ position: 'absolute', left: `${positions[i][0]}%`, top: `${positions[i][1]}%`,
        width: component.size, height: component.size * 0.8, opacity: 0.6,
        transform: `translate(-50%, -50%) rotate(${(i * 47) % 90 - 45}deg)` }}>
      <defs><linearGradient id={`${prefix}-${i}-metal`} x2="0.9" y2="1"><stop stopColor="#d8dfe0" /><stop offset="0.45" stopColor="#9aa6ad" /><stop offset="0.6" stopColor="#d1d6d8" /><stop offset="1" stopColor="#67737c" /></linearGradient></defs>
      <Shape kind={component.id} prefix={`${prefix}-${i}`} />
    </svg>)}
  </div>;
}
