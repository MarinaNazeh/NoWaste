// C-25 mock push for development and tests (NFR-13). Keeps every sent message in `sent`.
import type { IPush, PushPayload } from './IPush.js';

export class MockPush implements IPush {
  available = true;
  readonly sent: Array<{ deviceToken: string; payload: PushPayload }> = [];

  send(deviceToken: string, payload: PushPayload): Promise<{ delivered: boolean }> {
    if (!this.available) return Promise.resolve({ delivered: false });
    this.sent.push({ deviceToken, payload });
    return Promise.resolve({ delivered: true });
  }
}
