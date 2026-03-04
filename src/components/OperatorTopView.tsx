import { useEffect, useMemo, useState } from 'react';
import type { BoxDimensions, Placement } from '../types';

interface OperatorTopViewProps {
  box: BoxDimensions;
  placements: Placement[];
  highlightedItemId?: string;
}

interface Layer {
  index: number;
  zCenter: number;
  items: Placement[];
}

function groupByLayer(placements: Placement[]): Layer[] {
  const shoes = placements
    .filter((item) => item.category === 'shoe-box')
    .sort((a, b) => a.position[2] - b.position[2]);

  const layers: Layer[] = [];
  shoes.forEach((item) => {
    const existing = layers.find((layer) => Math.abs(layer.zCenter - item.position[2]) < 0.01);
    if (existing) {
      existing.items.push(item);
      return;
    }

    layers.push({
      index: layers.length,
      zCenter: item.position[2],
      items: [item],
    });
  });

  return layers;
}

export function OperatorTopView({ box, placements, highlightedItemId }: OperatorTopViewProps) {
  const layers = useMemo(() => groupByLayer(placements), [placements]);
  const [activeLayer, setActiveLayer] = useState(0);

  useEffect(() => {
    setActiveLayer((prev) => Math.min(prev, Math.max(layers.length - 1, 0)));
  }, [layers.length]);

  useEffect(() => {
    if (!highlightedItemId || layers.length === 0) return;
    const layerIndex = layers.findIndex((layer) => layer.items.some((item) => item.id === highlightedItemId));
    if (layerIndex >= 0) {
      setActiveLayer(layerIndex);
    }
  }, [highlightedItemId, layers]);

  const current = layers[activeLayer];

  if (!current) {
    return <div className="operator-empty">Geen schoenendozen in dit recept.</div>;
  }

  return (
    <div className="operator-shell">
      <div className="operator-toolbar">
        <button className="layer-btn" onClick={() => setActiveLayer((value) => Math.max(value - 1, 0))} disabled={activeLayer === 0}>
          Vorige laag
        </button>
        <p>
          Laag <strong>{current.index + 1}</strong> van {layers.length} · {current.items.length} schoenendozen
        </p>
        <button
          className="layer-btn"
          onClick={() => setActiveLayer((value) => Math.min(value + 1, layers.length - 1))}
          disabled={activeLayer === layers.length - 1}
        >
          Volgende laag
        </button>
      </div>

      <svg className="operator-canvas" viewBox={`0 0 ${box.length} ${box.width}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Topdown laagindeling">
        <rect x="0" y="0" width={box.length} height={box.width} rx="2" fill="rgba(11, 18, 34, 0.8)" stroke="rgba(125, 183, 255, 0.42)" strokeWidth="0.6" />
        {current.items.map((item) => {
          const isHighlighted = item.id === highlightedItemId;
          const x = item.position[0] - item.size[0] / 2;
          const y = item.position[1] - item.size[1] / 2;
          return (
            <g key={item.id}>
              <rect
                x={x}
                y={y}
                width={item.size[0]}
                height={item.size[1]}
                rx="1.2"
                fill={isHighlighted ? 'rgba(124, 195, 255, 0.95)' : 'rgba(78, 140, 255, 0.72)'}
                stroke={isHighlighted ? 'rgba(255, 255, 255, 0.98)' : 'rgba(231, 241, 255, 0.82)'}
                strokeWidth={isHighlighted ? '0.7' : '0.45'}
              />
              <text x={x + item.size[0] / 2} y={y + item.size[1] / 2} textAnchor="middle" dominantBaseline="middle" fill="#eaf2ff" fontSize="2.2">
                {item.id.replace('shoe-', '#')}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="operator-hint">Plaats dozen links-naar-rechts en van voren-naar-achteren volgens nummering.</div>
    </div>
  );
}
