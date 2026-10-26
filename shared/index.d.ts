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
/** Egyptian mobile (D-12) or landline (D-26) number in +20 form, or null. */
export declare function normalizeEgyptianPhone(phone: unknown): string | null;

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

export type SignUpRole = 'consumer' | 'vendor' | 'charity' | 'composting';
export type PartnerRole = 'charity' | 'composting';
export type VendorType = 'formal' | 'informal';
export type FoodCategory =
  | 'bread_and_baked_goods'
  | 'cooked_meals'
  | 'fruit_and_vegetables'
  | 'dairy_and_eggs'
  | 'meat_poultry_and_fish'
  | 'packaged_and_dry_food';

export declare const SIGN_UP_ROLES: readonly SignUpRole[];
export declare const PARTNER_ROLES: readonly PartnerRole[];
export declare const VENDOR_TYPES: readonly VendorType[];
export declare const FOOD_CATEGORIES: readonly FoodCategory[];
export declare const TEXT_LIMITS: Readonly<{ name: number; address: number; description: number }>;

export type ProfileField =
  | 'role'
  | 'shopName'
  | 'vendorType'
  | 'organisationName'
  | 'address'
  | 'latitude'
  | 'longitude'
  | 'contact'
  | 'acceptedFoodTypes'
  | 'description';
export type SignUpField = RegistrationField | ProfileField;

export interface SignUpInput extends RegistrationInput {
  role?: unknown;
  vendorProfile?: unknown;
  partnerProfile?: unknown;
}

export interface VendorProfile {
  shopName: string;
  vendorType: VendorType;
  address: string;
  latitude: number;
  longitude: number;
  /** Egyptian mobile or landline; returned by validateSignUp in +20 form. */
  contact: string;
  /** Optional; validateSignUp returns null when it is missing or blank. */
  description?: string | null;
}

export interface PartnerProfile {
  organisationName: string;
  address: string;
  latitude: number;
  longitude: number;
  acceptedFoodTypes: FoodCategory[];
}

export interface ValidSignUp extends ValidRegistration {
  role: SignUpRole;
  vendorProfile: VendorProfile | null;
  partnerProfile: PartnerProfile | null;
}

export type SignUpValidation = { ok: true; value: ValidSignUp } | { ok: false; fields: SignUpField[] };

export declare function validateSignUp(input: SignUpInput): SignUpValidation;
