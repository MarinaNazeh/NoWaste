// C-23 IPaymentGateway (SDD 3.2.3): charge(amount, token) -> approved or declined; refund(paymentId, amount).
// The app sends card details only to the gateway; the backend receives only the result and a reference
// (IF-SW-02, NFR-10). Sandbox mode only during the course (IF-SW-07).

export type ChargeResult = { status: 'approved'; paymentId: string } | { status: 'declined' };
export type RefundResult = { status: 'refunded' } | { status: 'failed' };

export interface IPaymentGateway {
  /** True while the gateway runs in sandbox mode (IF-SW-07). */
  readonly sandbox: boolean;
  /** Amount in Egyptian pounds; `token` is the gateway's one-time card token, never card details. */
  charge(amount: number, token: string): Promise<ChargeResult>;
  refund(paymentId: string, amount: number): Promise<RefundResult>;
}
