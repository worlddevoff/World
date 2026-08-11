import React from 'react';

// Tiny crisp pixel icons drawn as SVG rects. 16x16 viewBox, no smoothing.
type IconName =
  | 'ride' | 'coaster' | 'path' | 'scenery' | 'shop' | 'parkinfo'
  | 'finances' | 'research' | 'guests' | 'ridelist' | 'save' | 'staff'
  | 'bulldoze' | 'pointer';

const P = ({ x, y, c, w = 1, h = 1 }: { x: number; y: number; c: string; w?: number; h?: number }) => (
  <rect x={x} y={y} width={w} height={h} fill={c} />
);

export function PixelIcon({ name, size = 24 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" style={{ imageRendering: 'pixelated' }}>
      {ICONS[name]}
    </svg>
  );
}

const ICONS: Record<IconName, React.ReactNode> = {
  pointer: (<>
    <P x={4} y={3} c="#fff" w={1} h={9} /><P x={5} y={4} c="#fff" w={1} h={7} />
    <P x={6} y={6} c="#fff" w={1} h={4} /><P x={7} y={8} c="#fff" w={2} h={1} />
    <P x={4} y={3} c="#000" /><P x={9} y={9} c="#000" />
  </>),
  ride: (<>
    <P x={2} y={11} c="#8a5a2b" w={12} h={2} />
    <P x={7} y={3} c="#e0a020" w={2} h={8} />
    <P x={4} y={5} c="#d94b4b" w={2} h={2} /><P x={10} y={5} c="#2f8fce" w={2} h={2} />
    <P x={4} y={8} c="#3f9b52" w={2} h={2} /><P x={10} y={8} c="#7a53c9" w={2} h={2} />
    <P x={3} y={4} c="#555" /><P x={12} y={4} c="#555" />
  </>),
  coaster: (<>
    <P x={1} y={10} c="#c23b3b" w={3} h={1} /><P x={4} y={8} c="#c23b3b" w={2} h={1} />
    <P x={6} y={5} c="#c23b3b" w={2} h={1} /><P x={8} y={3} c="#c23b3b" w={2} h={1} />
    <P x={10} y={5} c="#c23b3b" w={2} h={1} /><P x={12} y={8} c="#c23b3b" w={3} h={1} />
    <P x={2} y={11} c="#777" w={1} h={3} /><P x={7} y={6} c="#777" w={1} h={8} />
    <P x={13} y={9} c="#777" w={1} h={5} /><P x={9} y={2} c="#ffcc00" w={2} h={2} />
  </>),
  path: (<>
    <P x={2} y={5} c="#c9b48a" w={12} h={6} />
    <P x={2} y={5} c="#a9925f" w={12} h={1} /><P x={2} y={10} c="#a9925f" w={12} h={1} />
    <P x={5} y={7} c="#8a7550" /><P x={9} y={8} c="#8a7550" /><P x={11} y={6} c="#8a7550" />
  </>),
  scenery: (<>
    <P x={7} y={9} c="#5a3b1e" w={2} h={5} />
    <P x={4} y={4} c="#2f7d2f" w={8} h={5} /><P x={5} y={2} c="#3f9b3f" w={6} h={3} />
    <P x={6} y={3} c="#5abf5a" w={2} h={1} />
  </>),
  shop: (<>
    <P x={3} y={7} c="#d98b2b" w={10} h={7} />
    <P x={2} y={5} c="#fff" w={12} h={2} />
    <P x={3} y={5} c="#d94b4b" w={2} h={2} /><P x={7} y={5} c="#d94b4b" w={2} h={2} /><P x={11} y={5} c="#d94b4b" w={2} h={2} />
    <P x={6} y={9} c="#7a5020" w={4} h={5} />
  </>),
  parkinfo: (<>
    <P x={3} y={2} c="#3f9b52" w={10} h={10} /><P x={3} y={2} c="#2c7a3c" w={10} h={1} />
    <P x={7} y={4} c="#fff" w={2} h={2} /><P x={7} y={7} c="#fff" w={2} h={4} />
    <P x={5} y={13} c="#8a5a2b" w={6} h={1} />
  </>),
  finances: (<>
    <P x={2} y={4} c="#0a6b1f" w={12} h={8} /><P x={2} y={4} c="#0d8a28" w={12} h={1} />
    <P x={6} y={6} c="#ffe680" w={4} h={4} /><P x={7} y={5} c="#ffe680" w={2} h={6} />
  </>),
  research: (<>
    <P x={6} y={2} c="#ffe680" w={4} h={5} /><P x={5} y={5} c="#ffe680" w={6} h={2} />
    <P x={6} y={7} c="#aaa" w={4} h={2} /><P x={6} y={9} c="#888" w={4} h={2} />
    <P x={7} y={11} c="#555" w={2} h={2} />
  </>),
  guests: (<>
    <P x={4} y={3} c="#f0c090" w={2} h={2} /><P x={3} y={5} c="#d94b4b" w={4} h={3} /><P x={3} y={8} c="#2b3a55" w={4} h={4} />
    <P x={10} y={4} c="#f0c090" w={2} h={2} /><P x={9} y={6} c="#2f8fce" w={4} h={3} /><P x={9} y={9} c="#333" w={4} h={3} />
  </>),
  ridelist: (<>
    <P x={2} y={3} c="#fff" w={12} h={10} /><P x={2} y={3} c="#888" w={12} h={1} />
    <P x={4} y={5} c="#d94b4b" w={2} h={2} /><P x={7} y={5} c="#333" w={5} h={1} />
    <P x={4} y={8} c="#2f8fce" w={2} h={2} /><P x={7} y={8} c="#333" w={5} h={1} />
    <P x={4} y={11} c="#3f9b52" w={2} h={1} /><P x={7} y={11} c="#333" w={5} h={1} />
  </>),
  save: (<>
    <P x={3} y={3} c="#2b3a55" w={10} h={10} /><P x={5} y={3} c="#ccc" w={6} h={4} />
    <P x={8} y={4} c="#d94b4b" w={2} h={2} /><P x={5} y={9} c="#fff" w={6} h={3} />
  </>),
  staff: (<>
    <P x={6} y={2} c="#fff" w={4} h={2} /><P x={6} y={4} c="#f0c090" w={4} h={2} />
    <P x={4} y={6} c="#2b5aa0" w={8} h={4} /><P x={5} y={10} c="#333" w={6} h={3} />
    <P x={11} y={7} c="#aaa" w={2} h={2} />
  </>),
  bulldoze: (<>
    <P x={2} y={9} c="#333" w={10} h={3} /><P x={3} y={12} c="#111" w={2} h={2} /><P x={9} y={12} c="#111" w={2} h={2} />
    <P x={11} y={4} c="#e0a020" w={3} h={5} /><P x={9} y={6} c="#e0a020" w={3} h={2} />
  </>),
};
