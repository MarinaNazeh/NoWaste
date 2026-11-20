// C-23 mock gateway for development and tests (SDD T-05, NFR-13). No network. Any token is approved except
// MOCK_DECLINE_TOKEN; the token itself is never kept (NFR-10).
import { randomUUID } from 'node:crypto';
import { AdapterUnavailableError } from '../errors.js';
import type { ChargeResult, IPaymentGateway, RefundResult } from './IPaymentGateway.js';

export const MOCK_DECLINE_TOKEN = 'tok_mock_declined';

interface MockPayment {
  paymentId: string;
  amount: number;
  refunded: number;
}

export class MockPaymentGateway implements IPaymentGateway {
  readonly sandbox = true;
  /** Set to false to simulate the gateway being down (NFR-12). */
  available = true;
  readonly payments: MockPayment[] = [];

  charge(amount: number, token: string): Promise<ChargeResult> {
    if (!this.available) return Promise.reject(new AdapterUnavailableError('payment-gateway'));
    if (token === MOCK_DECLINE_TOKEN || !(amount > 0)) return Promise.resolve({ status: 'declined' });
    const paymentId = `mock_pay_${randomUUID()}`;
    this.payments.push({ paymentId, amount, refunded: 0 });
    return Promise.resolve({ status: 'approved', paymentId });
  }

  refund(paymentId: string, amount: number): Promise<RefundResult> {
    if (!this.available) return Promise.reject(new AdapterUnavailableError('payment-gateway'));
    const payment = this.payments.find((p) => p.paymentId === paymentId);
    if (!payment || !(amount > 0) || payment.refunded + amount > payment.amount) {
      return Promise.resolve({ status: 'failed' });
    }
    payment.refunded += amount;
    return Promise.resolve({ status: 'refunded' });
  }
}
