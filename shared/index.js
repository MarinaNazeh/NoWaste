// Registration input rules shared by the app (C-01) and the Account Service (C-03), US-01.
// Plain CommonJS so the server (Node, ts-jest) and the app (Metro, jest-expo) can use it without a build step.
'use strict';

// Password rules: decision D-11 in PROGRESS.md (closes TBD-4, needs team approval).
// At least 8 characters, at least one letter and at least one digit. Arabic letters and Arabic-Indic digits count.
const PASSWORD_RULES = Object.freeze({ minLength: 8 });
const LETTER = /\p{L}/u;
const DIGIT = /\p{Nd}/u;

// Phone format: decision D-12 in PROGRESS.md (the SRS gives no format).
// Egyptian mobile numbers: 11 digits starting 010, 011, 012 or 015. Stored as +20 followed by the last 10 digits.
const EGYPT_MOBILE = /^01[0125]\d{8}$/;

// One "@", something before it, and a domain with a dot after it. No spaces.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LANGUAGES = Object.freeze(['ar', 'en']);

/** Converts Arabic-Indic and Eastern Arabic-Indic digits to 0-9, so numbers typed on an Arabic keyboard work. */
function toLatinDigits(text) {
  return text.replace(/[٠-٩۰-۹]/g, (d) => String(d.charCodeAt(0) & 0x0f));
}

/** Which password rules the password meets. Used by the server check and by the live hints under the field. */
function checkPasswordRules(password) {
  const value = typeof password === 'string' ? password : '';
  return {
    minLength: [...value].length >= PASSWORD_RULES.minLength,
    hasLetter: LETTER.test(value),
    hasDigit: DIGIT.test(value),
  };
}

function isValidPassword(password) {
  const rules = checkPasswordRules(password);
  return rules.minLength && rules.hasLetter && rules.hasDigit;
}

function isValidEmail(email) {
  return typeof email === 'string' && EMAIL.test(email.trim());
}

/** Returns the phone in +20 form, or null if it is not a valid Egyptian mobile number. */
function normalizeEgyptianMobile(phone) {
  if (typeof phone !== 'string') return null;
  const digits = toLatinDigits(phone.trim());
  return EGYPT_MOBILE.test(digits) ? `+20${digits.slice(1)}` : null;
}

function isBlank(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

/**
 * Checks a consumer registration (FR-ACC-01, E-ACC-02).
 * Returns every invalid field, so the app and the server can mark all of them at once (IF-UI-06).
 */
function validateRegistration(input) {
  const fields = [];
  const hasEmail = !isBlank(input.email);
  const hasPhone = !isBlank(input.phone);

  if (!hasEmail && !hasPhone) {
    fields.push('email', 'phone');
  } else {
    if (hasEmail && !isValidEmail(input.email)) fields.push('email');
    if (hasPhone && normalizeEgyptianMobile(input.phone) === null) fields.push('phone');
  }
  if (!isValidPassword(input.password)) fields.push('password');
  if (!LANGUAGES.includes(input.language)) fields.push('language');

  if (fields.length > 0) {
    return { ok: false, fields };
  }
  return {
    ok: true,
    value: {
      email: hasEmail ? input.email.trim() : null,
      phone: hasPhone ? normalizeEgyptianMobile(input.phone) : null,
      password: input.password,
      language: input.language,
    },
  };
}

module.exports = {
  PASSWORD_RULES,
  LANGUAGES,
  checkPasswordRules,
  isValidPassword,
  isValidEmail,
  normalizeEgyptianMobile,
  validateRegistration,
};
