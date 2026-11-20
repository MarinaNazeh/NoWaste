// C-20 mock vision for development and tests (SDD T-08, NFR-13). Returns a fixed draft; `delayMs` and
// `available` simulate a slow or failing AI service (E-LST-01).
import { AdapterUnavailableError } from '../errors.js';
import type { IVision, VisionDraft } from './IVision.js';

export class MockVision implements IVision {
  available = true;
  delayMs = 0;
  draft: VisionDraft = {
    foodType: 'Bread',
    foodCategory: 'bread_and_baked_goods',
    quantity: 1,
    calorieRange: { min: 200, max: 300 },
    draftTextAr: 'مسودة: خبز',
    draftTextEn: 'Draft: bread',
    confidence: 0.9,
  };

  async classify(_photo: Buffer): Promise<VisionDraft> {
    if (this.delayMs > 0) await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    if (!this.available) throw new AdapterUnavailableError('ai-vision');
    return { ...this.draft };
  }
}
