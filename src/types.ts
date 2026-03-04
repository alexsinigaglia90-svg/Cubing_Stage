export type Category = 'shoe-box' | 'apparel' | 'accessory' | 'caps';

export interface BoxDimensions {
  length: number;
  width: number;
  height: number;
}

export interface OrderRecipe {
  totalUnits: number;
  shoeBoxes: number;
  apparel: number;
  accessories: number;
  caps: number;
}

export interface Placement {
  id: string;
  category: Category;
  visualType: 'shoe' | 'tshirt' | 'accessory' | 'cap';
  size: [number, number, number];
  position: [number, number, number];
  color: string;
  sequence?: number;
}

export interface BlueprintScores {
  stability: number;
  speed: number;
  ease: number;
  overall: number;
}

export interface PackingResult {
  placements: Placement[];
  fillRate: number;
  usedHeight: number;
  steps: string[];
  scores: BlueprintScores;
  rationale: string[];
  strategyLabel: string;
}
