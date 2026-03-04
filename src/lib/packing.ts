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

interface SoftPlacementResult {
  placements: Placement[];
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
          visualType: 'shoe',
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

function placeGridItems(params: {
  count: number;
  idPrefix: string;
  size: [number, number, number];
  xStart: number;
  yStart: number;
  zoneLength: number;
  zoneWidth: number;
  zCenter: number;
  color: string;
  category: Placement['category'];
  visualType: Placement['visualType'];
}): Placement[] {
  const { count, idPrefix, size, xStart, yStart, zoneLength, zoneWidth, zCenter, color, category, visualType } = params;
  if (count <= 0 || zoneLength < size[0] || zoneWidth < size[1]) {
    return [];
  }

  const nx = Math.max(Math.floor(zoneLength / size[0]), 1);
  const ny = Math.max(Math.floor(zoneWidth / size[1]), 1);
  const items: Placement[] = [];
  let index = 1;

  for (let y = 0; y < ny; y += 1) {
    for (let x = 0; x < nx; x += 1) {
      if (index > count) {
        return items;
      }
      const px = xStart + x * size[0] + size[0] / 2;
      const py = yStart + y * size[1] + size[1] / 2;
      items.push({
        id: `${idPrefix}-${index}`,
        category,
        visualType,
        size,
        position: [px, py, zCenter],
        color,
      });
      index += 1;
    }
  }

  return items;
}

function createSoftGoodsPlacements(recipe: OrderRecipe, box: BoxDimensions, shoePlacements: Placement[], usedHeight: number): SoftPlacementResult {
  const placements: Placement[] = [];
  const steps: string[] = [];

  if (shoePlacements.length === 0) {
    return { placements, steps };
  }

  const usedLength = shoePlacements.reduce((max, item) => Math.max(max, item.position[0] + item.size[0] / 2), 0);
  const usedWidth = shoePlacements.reduce((max, item) => Math.max(max, item.position[1] + item.size[1] / 2), 0);

  const sideStripLength = Math.max(box.length - usedLength, 0);
  const backStripWidth = Math.max(box.width - usedWidth, 0);

  const tshirtSize: [number, number, number] = [12, 8, 3.5];
  let apparelLeft = recipe.apparel;

  const apparelSide = placeGridItems({
    count: apparelLeft,
    idPrefix: 'tee',
    size: tshirtSize,
    xStart: usedLength,
    yStart: 0,
    zoneLength: sideStripLength,
    zoneWidth: box.width,
    zCenter: tshirtSize[2] / 2,
    color: VOLUME_COLORS.apparel,
    category: 'apparel',
    visualType: 'tshirt',
  });
  placements.push(...apparelSide);
  apparelLeft -= apparelSide.length;

  const apparelBack = placeGridItems({
    count: apparelLeft,
    idPrefix: 'tee',
    size: tshirtSize,
    xStart: 0,
    yStart: usedWidth,
    zoneLength: usedLength,
    zoneWidth: backStripWidth,
    zCenter: tshirtSize[2] / 2,
    color: VOLUME_COLORS.apparel,
    category: 'apparel',
    visualType: 'tshirt',
  });
  placements.push(...apparelBack);
  apparelLeft -= apparelBack.length;

  const apparelTop = placeGridItems({
    count: apparelLeft,
    idPrefix: 'tee',
    size: tshirtSize,
    xStart: 2,
    yStart: 2,
    zoneLength: Math.max(usedLength - 4, 0),
    zoneWidth: Math.max(usedWidth - 4, 0),
    zCenter: Math.min(usedHeight + tshirtSize[2] / 2, box.height - tshirtSize[2] / 2),
    color: VOLUME_COLORS.apparel,
    category: 'apparel',
    visualType: 'tshirt',
  });
  placements.push(...apparelTop);

  const accessorySize: [number, number, number] = [8, 6, 4];
  const accessoryPlacements = placeGridItems({
    count: recipe.accessories,
    idPrefix: 'acc',
    size: accessorySize,
    xStart: Math.max(usedLength - 2 * accessorySize[0], 0),
    yStart: Math.max(usedWidth - accessorySize[1], 0),
    zoneLength: Math.max(box.length - Math.max(usedLength - 2 * accessorySize[0], 0), accessorySize[0]),
    zoneWidth: Math.max(box.width - Math.max(usedWidth - accessorySize[1], 0), accessorySize[1]),
    zCenter: Math.min(usedHeight + accessorySize[2] / 2, box.height - accessorySize[2] / 2),
    color: VOLUME_COLORS.accessories,
    category: 'accessory',
    visualType: 'accessory',
  });
  placements.push(...accessoryPlacements);

  const capBaseX = Math.min(box.length - 10, Math.max(usedLength + 5, 10));
  const capBaseY = Math.min(box.width - 10, Math.max(usedWidth + 5, 10));
  const capBaseZ = Math.min(usedHeight + 4, box.height - 10);

  for (let i = 0; i < recipe.caps; i += 1) {
    placements.push({
      id: `cap-${i + 1}`,
      category: 'caps',
      visualType: 'cap',
      size: [13, 13, 8],
      position: [
        Math.min(capBaseX + i * 1.3, box.length - 6),
        Math.min(capBaseY + i * 0.9, box.width - 6),
        Math.min(capBaseZ + i * 2.2, box.height - 4),
      ],
      color: VOLUME_COLORS.caps,
    });
  }

  if (recipe.apparel > 0) {
    steps.push('Plaats t-shirts als gevouwen bundels in de vrije tussenruimtes langs de zijkanten en achterzijde.');
  }
  if (recipe.accessories > 0) {
    steps.push('Vul accessoires compact in de resterende pockets boven/naast de schoenendozen.');
  }
  if (recipe.caps > 0) {
    steps.push('Nestel petjes in elkaar in de vrije hoekzone om volume te besparen.');
  }

  return { placements, steps };
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

  const softGoods = createSoftGoodsPlacements(recipe, box, best.placements, best.usedHeight);

  const placements = [...best.placements, ...softGoods.placements];

  const shoeVol = best.placements.reduce((acc, item) => acc + item.size[0] * item.size[1] * item.size[2], 0);
  const fillApprox = shoeVol / (box.length * box.width * box.height);

  const steps = [
    ...best.steps,
    ...softGoods.steps,
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
