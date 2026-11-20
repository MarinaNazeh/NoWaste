// C-30 mock email and SMS for development and tests (SDD T-08, NFR-13). Nothing is sent; codes are kept in memory
// so a test (or a developer) can read them.
import { AdapterUnavailableError } from '../errors.js';
import type { IMessaging } from './IMessaging.js';

export class MockMessaging implements IMessaging {
  available = true;
  readonly sent: Array<{ to: string; code: string }> = [];

  sendCode(emailOrPhone: string, code: string): Promise<void> {
    if (!this.available) return Promise.reject(new AdapterUnavailableError('email-sms'));
    this.sent.push({ to: emailOrPhone, code });
    return Promise.resolve();
  }

  lastCodeFor(emailOrPhone: string): string | undefined {
    return this.sent.filter((m) => m.to === emailOrPhone).at(-1)?.code;
  }
}
