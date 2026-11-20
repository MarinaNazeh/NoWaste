// E-LST-01 / IF-SW-04: if classification fails or takes longer than the limit, the vendor enters the listing
// manually. The caller passes the limit read from the settings row BR-12 (ai_draft_time_limit_seconds), never a
// constant.
import type { IVision, VisionDraft } from './IVision.js';

export type VisionOutcome =
  { status: 'draft'; draft: VisionDraft } | { status: 'manual'; reason: 'timeout' | 'failed' };

export async function classifyWithTimeLimit(
  vision: IVision,
  photo: Buffer,
  limitSeconds: number,
): Promise<VisionOutcome> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<VisionOutcome>((resolve) => {
    timer = setTimeout(() => {
      resolve({ status: 'manual', reason: 'timeout' });
    }, limitSeconds * 1000);
  });
  const classify = vision.classify(photo).then(
    (draft): VisionOutcome => ({ status: 'draft', draft }),
    (): VisionOutcome => ({ status: 'manual', reason: 'failed' }),
  );
  try {
    return await Promise.race([classify, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
