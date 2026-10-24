// Types for shared/index.js. Keep both files in step.

export type Language = 'ar' | 'en';
export type RegistrationField = 'email' | 'phone' | 'password' | 'language';

export declare const PASSWORD_RULES: Readonly<{ minLength: number }>;
export declare const LANGUAGES: readonly Language[];

export interface PasswordRuleResult {
  minLength: boolean;
  hasLetter: boolean;
  hasDigit: boolean;
}

export declare function checkPasswordRules(password: unknown): PasswordRuleResult;
export declare function isValidPassword(password: unknown): boolean;
export declare function isValidEmail(email: unknown): boolean;
export declare function normalizeEgyptianMobile(phone: unknown): string | null;

export interface RegistrationInput {
  email?: unknown;
  phone?: unknown;
  password?: unknown;
  language?: unknown;
}

export interface ValidRegistration {
  email: string | null;
  phone: string | null;
  password: string;
  language: Language;
}

export type RegistrationValidation =
  { ok: true; value: ValidRegistration } | { ok: false; fields: RegistrationField[] };

export declare function validateRegistration(input: RegistrationInput): RegistrationValidation;
