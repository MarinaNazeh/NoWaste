// C-20 IVision (SDD 3.2.3): classify(photo) -> {foodType, foodCategory, quantity, calorieRange?, draftTextAr,
// draftTextEn, confidence}. The result is a Draft the vendor confirms or edits (NFR-05a); it never says the food
// is safe.
import type { FoodCategory } from '@nowaste/shared';

export interface VisionDraft {
  foodType: string;
  foodCategory: FoodCategory;
  quantity: number;
  /** Estimate, in kcal (NFR-05a). */
  calorieRange?: { min: number; max: number };
  draftTextAr: string;
  draftTextEn: string;
  /** 0 to 1. */
  confidence: number;
}

export interface IVision {
  classify(photo: Buffer): Promise<VisionDraft>;
}
