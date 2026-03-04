import type { BoxDimensions, OrderRecipe } from '../types';

export const WTS_BOX: BoxDimensions = {
  length: 70,
  width: 50,
  height: 45,
};

export const DEFAULT_RECIPE: OrderRecipe = {
  totalUnits: 17,
  shoeBoxes: 7,
  apparel: 6,
  accessories: 3,
  caps: 1,
};

export const SHOEBOX_SIZE: [number, number, number] = [33, 20, 12];
