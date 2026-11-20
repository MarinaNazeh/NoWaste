// C-30 IMessaging (SDD 3.2.3): sendCode(emailOrPhone, code) for password reset (FR-ACC-05).

export interface IMessaging {
  sendCode(emailOrPhone: string, code: string): Promise<void>;
}
