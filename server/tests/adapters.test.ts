// SCRUM-78: adapter skeletons with mock mode (SDD 3.1.1, 3.2.3; NFR-12, NFR-13). These tests need no database
// and no network: every adapter is created in mock mode.
import { createAdapters, loadAdapterMode } from '../src/adapters/index.js';
import { AdapterUnavailableError } from '../src/adapters/errors.js';
import {
  MockPaymentGateway,
  MOCK_DECLINE_TOKEN,
} from '../src/adapters/payment-gateway/mockPaymentGateway.js';
import { MockVision } from '../src/adapters/ai-vision/mockVision.js';
import { classifyWithTimeLimit } from '../src/adapters/ai-vision/timeLimit.js';
import { MockPush } from '../src/adapters/push/mockPush.js';
import { MockMessaging } from '../src/adapters/email-sms/mockMessaging.js';

describe('NFR-13 adapter mode', () => {
  test('NFR-13 mock mode is the default when ADAPTER_MODE is not set', () => {
    expect(loadAdapterMode({})).toBe('mock');
  });

  test('NFR-13 ADAPTER_MODE=mock creates the four server mock adapters', () => {
    const adapters = createAdapters('mock');
    expect(adapters.paymentGateway).toBeInstanceOf(MockPaymentGateway);
    expect(adapters.vision).toBeInstanceOf(MockVision);
    expect(adapters.push).toBeInstanceOf(MockPush);
    expect(adapters.messaging).toBeInstanceOf(MockMessaging);
  });

  test('NFR-13 an unknown ADAPTER_MODE is refused', () => {
    expect(() => loadAdapterMode({ ADAPTER_MODE: 'prod' })).toThrow(/ADAPTER_MODE/);
  });

  test('NFR-13 live mode is refused until the providers are chosen (TBD-2)', () => {
    expect(() => createAdapters('live')).toThrow(/TBD-2/);
  });
});

describe('IF-SW-07 IPaymentGateway mock (C-23)', () => {
  test('IF-SW-07 the mock gateway reports sandbox mode', () => {
    expect(new MockPaymentGateway().sandbox).toBe(true);
  });

  test('IF-SW-02 charge with a test token is approved and returns only a result and a reference', async () => {
    const result = await new MockPaymentGateway().charge(50, 'tok_test_visa');
    expect(result).toEqual({ status: 'approved', paymentId: expect.any(String) as string });
  });

  test('E-RES-01 charge with the decline token is declined', async () => {
    const result = await new MockPaymentGateway().charge(50, MOCK_DECLINE_TOKEN);
    expect(result.status).toBe('declined');
  });

  test('NFR-10 the mock never keeps the card token', async () => {
    const gateway = new MockPaymentGateway();
    await gateway.charge(50, 'tok_secret_123');
    expect(JSON.stringify(gateway.payments)).not.toContain('tok_secret_123');
  });

  test('IF-SW-02 refund of an approved payment succeeds up to the charged amount', async () => {
    const gateway = new MockPaymentGateway();
    const charge = await gateway.charge(50, 'tok_test_visa');
    if (charge.status !== 'approved') throw new Error('expected approved');
    await expect(gateway.refund(charge.paymentId, 50)).resolves.toEqual({ status: 'refunded' });
  });

  test('IF-SW-02 refund above the charged amount or of an unknown payment is refused', async () => {
    const gateway = new MockPaymentGateway();
    const charge = await gateway.charge(50, 'tok_test_visa');
    if (charge.status !== 'approved') throw new Error('expected approved');
    await expect(gateway.refund(charge.paymentId, 51)).resolves.toEqual({ status: 'failed' });
    await expect(gateway.refund('unknown', 1)).resolves.toEqual({ status: 'failed' });
  });

  test('NFR-12 an unavailable gateway throws AdapterUnavailableError', async () => {
    const gateway = new MockPaymentGateway();
    gateway.available = false;
    await expect(gateway.charge(50, 'tok_test_visa')).rejects.toBeInstanceOf(AdapterUnavailableError);
  });
});

describe('E-LST-01 IVision mock (C-20)', () => {
  const photo = Buffer.from('photo');

  test('FR-LST-03 classify returns a draft with every SDD 3.2.3 field', async () => {
    const result = await new MockVision().classify(photo);
    expect(result).toEqual(
      expect.objectContaining({
        foodType: expect.any(String) as string,
        foodCategory: expect.any(String) as string,
        quantity: expect.any(Number) as number,
        draftTextAr: expect.any(String) as string,
        draftTextEn: expect.any(String) as string,
        confidence: expect.any(Number) as number,
      }),
    );
  });

  test('E-LST-01 a draft within the time limit is returned', async () => {
    const outcome = await classifyWithTimeLimit(new MockVision(), photo, 10);
    expect(outcome.status).toBe('draft');
  });

  test('E-LST-01 a draft slower than the time limit falls back to manual entry', async () => {
    jest.useFakeTimers();
    try {
      const vision = new MockVision();
      vision.delayMs = 11_000;
      const pending = classifyWithTimeLimit(vision, photo, 10);
      await jest.advanceTimersByTimeAsync(10_000);
      await expect(pending).resolves.toEqual({ status: 'manual', reason: 'timeout' });
    } finally {
      jest.useRealTimers();
    }
  });

  test('E-LST-01 a failing AI service falls back to manual entry', async () => {
    const vision = new MockVision();
    vision.available = false;
    await expect(classifyWithTimeLimit(vision, photo, 10)).resolves.toEqual({
      status: 'manual',
      reason: 'failed',
    });
  });
});

describe('FR-RES-11 IPush mock (C-25)', () => {
  test('FR-RES-11 send records the message and reports it delivered', async () => {
    const push = new MockPush();
    await expect(push.send('device-1', { type: 'reservation_confirmed' })).resolves.toEqual({
      delivered: true,
    });
    expect(push.sent).toEqual([{ deviceToken: 'device-1', payload: { type: 'reservation_confirmed' } }]);
  });

  test('IF-SW-06 an unavailable push service reports not delivered instead of throwing', async () => {
    const push = new MockPush();
    push.available = false;
    await expect(push.send('device-1', { type: 'x' })).resolves.toEqual({ delivered: false });
    expect(push.sent).toEqual([]);
  });
});

describe('FR-ACC-05 IMessaging mock (C-30)', () => {
  test('FR-ACC-05 sendCode records the code for the email or phone', async () => {
    const messaging = new MockMessaging();
    await messaging.sendCode('a@example.com', '123456');
    expect(messaging.lastCodeFor('a@example.com')).toBe('123456');
  });

  test('NFR-12 an unavailable email and SMS service throws AdapterUnavailableError', async () => {
    const messaging = new MockMessaging();
    messaging.available = false;
    await expect(messaging.sendCode('+201000000000', '123456')).rejects.toBeInstanceOf(
      AdapterUnavailableError,
    );
  });
});
