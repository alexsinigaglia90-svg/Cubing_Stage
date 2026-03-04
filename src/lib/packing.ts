import type { BlueprintScores, BoxDimensions, OrderRecipe, PackingResult, Placement } from '../types';
import { SHOEBOX_SIZE } from '../data/presets';

const VOLUME_COLORS = {
  shoes: '#4e8cff',
  apparel: '#22d3ee',
  accessories: '#f59e0b',
  caps: '#a78bfa',
};

interface Orientation {
  l: number;
  w: number;
  h: number;
}

type PickPattern = 'linear' | 'serpentine';

interface Candidate {
  label: string;
  orientation: Orientation;
  pattern: PickPattern;
  placements: Placement[];
  usedHeight: number;
  perLayer: number;
  layers: number;
  scores: BlueprintScores;
  rationale: string[];
  steps: string[];
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function computeScores(params: {
  box: BoxDimensions;
  placements: Placement[];
  usedHeight: number;
  perLayer: number;
  layers: number;
  pattern: PickPattern;
}): BlueprintScores {
  const { box, placements, usedHeight, perLayer, layers, pattern } = params;
  const shoeItems = placements.filter((placement) => placement.category === 'shoe-box');
  const baseCount = Math.min(shoeItems.length, perLayer);
  const baseCoverage = perLayer > 0 ? baseCount / perLayer : 0;
  const heightRatio = usedHeight / box.height;

  const centerX = shoeItems.reduce((sum, item) => sum + item.position[0], 0) / Math.max(shoeItems.length, 1);
  const centerY = shoeItems.reduce((sum, item) => sum + item.position[1], 0) / Math.max(shoeItems.length, 1);
  const dx = Math.abs(centerX - box.length / 2) / (box.length / 2);
  const dy = Math.abs(centerY - box.width / 2) / (box.width / 2);
  const centerPenalty = (dx + dy) * 12;

  const stability = clampScore(100 * (0.58 * baseCoverage + 0.42 * (1 - heightRatio)) - centerPenalty);
  const speed = clampScore(100 - (layers - 1) * 10 + (pattern === 'serpentine' ? 6 : 0) + (perLayer >= 6 ? 4 : 0));
  const ease = clampScore(88 - Math.max(layers - 2, 0) * 9 + (pattern === 'serpentine' ? 7 : 0));
  const overall = clampScore(stability * 0.45 + speed * 0.3 + ease * 0.25);

  return { stability, speed, ease, overall };
}

function getShoeOrientations(): Orientation[] {
  return [
    { l: SHOEBOX_SIZE[0], w: SHOEBOX_SIZE[1], h: SHOEBOX_SIZE[2] },
    { l: SHOEBOX_SIZE[1], w: SHOEBOX_SIZE[0], h: SHOEBOX_SIZE[2] },
  ];
}

function createShoePlacements(
  count: number,
  box: BoxDimensions,
  orientation: Orientation,
  pattern: PickPattern,
): { placements: Placement[]; usedHeight: number; steps: string[]; perLayer: number; layers: number } {
  const nx = Math.floor(box.length / orientation.l);
  const ny = Math.floor(box.width / orientation.w);
  const perLayer = Math.max(nx * ny, 1);
  const layers = Math.ceil(count / perLayer);

  const placements: Placement[] = [];
  const steps: string[] = [];

  let placed = 0;
  let sequence = 1;
  for (let z = 0; z < layers; z += 1) {
    for (let y = 0; y < ny; y += 1) {
      const xIndices = Array.from({ length: nx }, (_, index) => index);
      if (pattern === 'serpentine' && y % 2 === 1) {
        xIndices.reverse();
      }

      for (const x of xIndices) {
        if (placed >= count) break;
        const id = `shoe-${placed + 1}`;
        const px = x * orientation.l + orientation.l / 2;
        const py = y * orientation.w + orientation.w / 2;
        const pz = z * orientation.h + orientation.h / 2;
        placements.push({
          id,
          category: 'shoe-box',
          size: [orientation.l, orientation.w, orientation.h],
          position: [px, py, pz],
          color: VOLUME_COLORS.shoes,
          sequence,
        });
        placed += 1;
        sequence += 1;
      }
      if (placed >= count) break;
    }
    const inLayer = Math.min(perLayer, count - z * perLayer);
    steps.push(`Laag ${z + 1}: plaats ${inLayer} schoenendozen in raster ${nx}×${ny}.`);
  }

  return {
    placements,
    usedHeight: layers * orientation.h,
    steps,
    perLayer,
    layers,
  };
}

function buildCandidates(count: number, box: BoxDimensions): Candidate[] {
  const candidates: Candidate[] = [];
  const patterns: PickPattern[] = ['linear', 'serpentine'];

  getShoeOrientations().forEach((orientation) => {
    patterns.forEach((pattern) => {
      const nx = Math.floor(box.length / orientation.l);
      const ny = Math.floor(box.width / orientation.w);
      const maxLayers = Math.floor(box.height / orientation.h);
      const maxUnits = nx * ny * maxLayers;
      if (maxUnits < count || nx === 0 || ny === 0) {
        return;
      }

      const shoe = createShoePlacements(count, box, orientation, pattern);
      const scores = computeScores({
        box,
        placements: shoe.placements,
        usedHeight: shoe.usedHeight,
        perLayer: shoe.perLayer,
        layers: shoe.layers,
        pattern,
      });

      const rationale = [
        `Raster ${nx}×${ny} met ${shoe.layers} laag/lagen maximaliseert bodemstabiliteit.`,
        pattern === 'serpentine'
          ? 'Serpentine pick-volgorde minimaliseert handbewegingen tussen links/rechts.'
          : 'Lineaire pick-volgorde ondersteunt standaard links-naar-rechts routines.',
        `Geprojecteerde score: stabiliteit ${scores.stability}, snelheid ${scores.speed}, ease ${scores.ease}.`,
      ];

      const label = `Raster ${orientation.l}×${orientation.w} · ${pattern === 'serpentine' ? 'serpentine' : 'lineair'}`;
      candidates.push({
        label,
        orientation,
        pattern,
        placements: shoe.placements,
        usedHeight: shoe.usedHeight,
        perLayer: shoe.perLayer,
        layers: shoe.layers,
        scores,
        rationale,
        steps: shoe.steps,
      });
    });
  });

  return candidates;
}

function createSoftGoodsZones(recipe: OrderRecipe, box: BoxDimensions, usedHeight: number): Placement[] {
  const remainingHeight = Math.max(box.height - usedHeight, 0);
  if (remainingHeight <= 0) return [];

  const zones: Placement[] = [];
  const zoneHeight = Math.max(remainingHeight * 0.9, 4);
  const zCenter = usedHeight + zoneHeight / 2;

  const columns = 3;
  const colLength = box.length / columns;

  if (recipe.apparel > 0) {
    zones.push({
      id: 'zone-apparel',
      category: 'apparel',
      size: [colLength, box.width, zoneHeight],
      position: [colLength / 2, box.width / 2, zCenter],
      color: VOLUME_COLORS.apparel,
    });
  }

  if (recipe.accessories > 0) {
    zones.push({
      id: 'zone-accessories',
      category: 'accessory',
      size: [colLength, box.width, zoneHeight],
      position: [colLength * 1.5, box.width / 2, zCenter],
      color: VOLUME_COLORS.accessories,
    });
  }

  if (recipe.caps > 0) {
    zones.push({
      id: 'zone-caps',
      category: 'caps',
      size: [colLength, box.width, zoneHeight],
      position: [colLength * 2.5, box.width / 2, zCenter],
      color: VOLUME_COLORS.caps,
    });
  }

  return zones;
}

export function buildPackingBlueprint(recipe: OrderRecipe, box: BoxDimensions): PackingResult {
  const candidates = buildCandidates(recipe.shoeBoxes, box);
  const fallbackOrientation = getShoeOrientations()[0];
  const fallbackShoe = createShoePlacements(recipe.shoeBoxes, box, fallbackOrientation, 'linear');

  const best =
    candidates.sort((a, b) => b.scores.overall - a.scores.overall)[0] ?? {
      label: 'Fallback raster',
      orientation: fallbackOrientation,
      pattern: 'linear' as PickPattern,
      placements: fallbackShoe.placements,
      usedHeight: fallbackShoe.usedHeight,
      perLayer: fallbackShoe.perLayer,
      layers: fallbackShoe.layers,
      scores: computeScores({
        box,
        placements: fallbackShoe.placements,
        usedHeight: fallbackShoe.usedHeight,
        perLayer: fallbackShoe.perLayer,
        layers: fallbackShoe.layers,
        pattern: 'linear',
      }),
      rationale: ['Fallback layout actief omdat kandidaatselectie geen geldige optie vond.'],
      steps: fallbackShoe.steps,
    };

  const softZones = createSoftGoodsZones(recipe, box, best.usedHeight);

  const placements = [...best.placements, ...softZones];

  const shoeVol = best.placements.reduce((acc, item) => acc + item.size[0] * item.size[1] * item.size[2], 0);
  const fillApprox = shoeVol / (box.length * box.width * box.height);

  const steps = [
    ...best.steps,
    'Vul daarna kleding in de cyaan zone voor drukverdeling.',
    'Gebruik amber zone voor accessoires zodat pick-volgorde logisch blijft.',
    'Plaats caps als laatste in paarse zone om vervorming te voorkomen.',
  ];

  return {
    placements,
    fillRate: Math.min(fillApprox, 1),
    usedHeight: best.usedHeight,
    steps,
    scores: best.scores,
    rationale: best.rationale,
    strategyLabel: best.label,
  };
}

export function generateRandomRecipe(): OrderRecipe {
  const totalUnits = 16 + Math.floor(Math.random() * 4);
  const shoeBoxes = 6 + Math.floor(Math.random() * 3);
  const remaining = Math.max(totalUnits - shoeBoxes, 0);
  const apparel = Math.max(Math.floor(remaining * 0.55), 1);
  const accessories = Math.max(Math.floor(remaining * 0.3), 1);
  const caps = Math.max(remaining - apparel - accessories, 0);

  return {
    totalUnits,
    shoeBoxes,
    apparel,
    accessories,
    caps,
  };
}
