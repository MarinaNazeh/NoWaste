// Unit tests for @nowaste/shared, the one validator used by both the app and the server (US-01).
// Password rules: decision D-11 (TBD-4). Phone format: decision D-12.
import {
  PASSWORD_RULES,
  checkPasswordRules,
  isValidEmail,
  isValidPassword,
  normalizeEgyptianMobile,
  validateCardInput,
  validateRegistration,
} from '@nowaste/shared';

describe('E-ACC-02 shared password rules', () => {
  test('E-ACC-02 the minimum password length is 8 characters', () => {
    expect(PASSWORD_RULES.minLength).toBe(8);
  });

  test('E-ACC-02 checkPasswordRules reports each rule separately', () => {
    expect(checkPasswordRules('abc')).toEqual({ minLength: false, hasLetter: true, hasDigit: false });
    expect(checkPasswordRules('12345678')).toEqual({ minLength: true, hasLetter: false, hasDigit: true });
    expect(checkPasswordRules('abcd1234')).toEqual({ minLength: true, hasLetter: true, hasDigit: true });
  });

  test.each([
    ['abc1234', false],
    ['abcd1234', true],
    ['abcdefgh', false],
    ['12345678', false],
    ['كلمةسر١٢', true],
    ['كلمةسرطويلة', false],
    ['', false],
  ])('E-ACC-02 isValidPassword(%j) is %s', (password, expected) => {
    expect(isValidPassword(password)).toBe(expected);
  });

  test('E-ACC-02 a password that is not a string is invalid', () => {
    expect(isValidPassword(undefined)).toBe(false);
    expect(isValidPassword(12345678)).toBe(false);
  });
});

describe('E-ACC-02 shared email and phone rules', () => {
  test.each([
    ['mona@example.com', true],
    ['  mona@example.com  ', true],
    ['userexample.com', false],
    ['mona@example', false],
    ['mona @example.com', false],
    ['', false],
  ])('E-ACC-02 isValidEmail(%j) is %s', (email, expected) => {
    expect(isValidEmail(email)).toBe(expected);
  });

  test.each([
    ['01012345678', '+201012345678'],
    ['01112345678', '+201112345678'],
    ['01212345678', '+201212345678'],
    ['01512345678', '+201512345678'],
    [' 01012345678 ', '+201012345678'],
    ['٠١٠١٢٣٤٥٦٧٨', '+201012345678'],
    ['۰۱۰۱۲۳۴۵۶۷۸', '+201012345678'],
    ['01312345678', null],
    ['0101234567', null],
    ['010123456789', null],
    ['+201012345678', null],
    ['010 1234 5678', null],
  ])('E-ACC-02 normalizeEgyptianMobile(%j) is %j', (phone, expected) => {
    expect(normalizeEgyptianMobile(phone)).toBe(expected);
  });
});

describe('E-ACC-02 validateRegistration lists every invalid field', () => {
  test('E-ACC-02 neither email nor phone marks both fields', () => {
    expect(validateRegistration({ password: 'abcd1234', language: 'en' })).toEqual({
      ok: false,
      fields: ['email', 'phone'],
    });
  });

  test('E-ACC-02 every invalid field is listed in order', () => {
    expect(validateRegistration({ email: 'bad', phone: '013', password: 'x', language: 'fr' })).toEqual({
      ok: false,
      fields: ['email', 'phone', 'password', 'language'],
    });
  });

  test('FR-ACC-01 a valid registration is returned trimmed and with the phone in +20 form', () => {
    expect(
      validateRegistration({
        email: ' Mona@Example.com ',
        phone: '01012345678',
        password: 'abcd1234',
        language: 'ar',
      }),
    ).toEqual({
      ok: true,
      value: { email: 'Mona@Example.com', phone: '+201012345678', password: 'abcd1234', language: 'ar' },
    });
  });
});

// D-99 (Maryam, 2026-11-16): the card form of the pretend bank: an 8-digit number, the expiry as MM/YY and a 3-digit
// CVV. Only the format is checked here; whether the card exists, is expired or has money is the bank's answer.
describe('FR-RES-02 D-99 shared card format', () => {
  test('FR-RES-02 a well-formed card is returned with the expiry taken apart', () => {
    expect(validateCardInput({ number: ' 4000 0000 ', expiry: '12/30', cvv: '123' })).toEqual({
      ok: true,
      value: { number: '40000000', expiryMonth: 12, expiryYear: 2030, cvv: '123' },
    });
  });

  test('FR-RES-02 digits typed on an Arabic keyboard are accepted', () => {
    expect(validateCardInput({ number: '٤٠٠٠٠٠٠٠', expiry: '١٢/٣٠', cvv: '١٢٣' })).toMatchObject({
      ok: true,
      value: { number: '40000000', cvv: '123' },
    });
  });

  test.each([
    ['a 7-digit number', { number: '4000000' }, ['number']],
    ['a 9-digit number', { number: '400000000' }, ['number']],
    ['letters in the number', { number: '4000abcd' }, ['number']],
    ['month 13', { expiry: '13/30' }, ['expiry']],
    ['month 00', { expiry: '00/30' }, ['expiry']],
    ['no slash', { expiry: '1230' }, ['expiry']],
    ['a 2-digit CVV', { cvv: '12' }, ['cvv']],
    ['a 4-digit CVV', { cvv: '1234' }, ['cvv']],
    [
      'everything missing',
      { number: undefined, expiry: undefined, cvv: undefined },
      ['number', 'expiry', 'cvv'],
    ],
  ])('E-RES-01 %s is refused', (_case, change, fields) => {
    expect(validateCardInput({ number: '40000000', expiry: '12/30', cvv: '123', ...change })).toEqual({
      ok: false,
      fields,
    });
  });
});
