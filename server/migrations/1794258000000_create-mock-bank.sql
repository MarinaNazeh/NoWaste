-- Up Migration

-- US-27 card reservation, decision D-99 (Maryam, 2026-11-16).

-- SDD 4.2 Payment: what NoWaste keeps about a card payment: the result and the gateway's reference, never card data
-- (NFR-10, IF-SW-02).
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations (id) ON DELETE CASCADE,
  gateway_reference TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL CHECK (status IN ('Approved', 'Declined', 'Refunded')),
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX payments_reservation ON payments (reservation_id);

-- IF-SW-03, E-RES-01: how long NoWaste waits for the bank's answer before the payment counts as failed (1 minute).
INSERT INTO settings (key, value, description, source) VALUES
  ('PAYMENT-TIMEOUT', '{"seconds": 60}',
   'Card payment: the gateway must answer within 60 seconds, otherwise the payment fails and the bag is released',
   'Decision D-99; E-RES-01, IF-SW-03');

-- The pretend bank: it stands in for the payment gateway's sandbox (SRS 2.5, IF-SW-07) and is NOT part of NoWaste's
-- data. It has its own schema; only the Payment Gateway Adapter (C-23) and the bank's card page use it. Card numbers and
-- CVVs are kept only as SHA-256 hashes. The test cards are listed in docs/test-cards.md.
CREATE SCHEMA mock_bank;

CREATE TABLE mock_bank.cards (
  id SERIAL PRIMARY KEY,
  number_hash TEXT NOT NULL UNIQUE,
  cvv_hash TEXT NOT NULL,
  expiry_month INT NOT NULL CHECK (expiry_month BETWEEN 1 AND 12),
  expiry_year INT NOT NULL,
  balance NUMERIC(10, 2) NOT NULL CHECK (balance >= 0),
  -- The balance the card starts with, so tests and demos can put the bank back.
  seeded_balance NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  -- 'no_answer': the bank never answers for this card (to test the payment timeout).
  behaviour TEXT NOT NULL DEFAULT 'normal' CHECK (behaviour IN ('normal', 'no_answer')),
  note TEXT NOT NULL
);

-- What the customer typed on the bank's card page, as hashes, behind a one-time token.
CREATE TABLE mock_bank.tokens (
  token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number_hash TEXT NOT NULL,
  cvv_hash TEXT NOT NULL,
  expiry_month INT NOT NULL,
  expiry_year INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ
);

CREATE TABLE mock_bank.charges (
  reference UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID NOT NULL REFERENCES mock_bank.tokens (token) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('approved', 'declined')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO mock_bank.cards (number_hash, cvv_hash, expiry_month, expiry_year, balance, seeded_balance, status, behaviour, note)
SELECT encode(sha256(c.number::bytea), 'hex'), encode(sha256(c.cvv::bytea), 'hex'), c.month, c.year, c.balance,
       c.balance, c.status, c.behaviour, c.note
FROM (VALUES
  ('40000000', '123', 12, 2030, 10000, 'active', 'normal', 'approved'),
  ('40000001', '123', 12, 2030, 10000, 'active', 'normal', 'approved (a second card, for two phones)'),
  ('40000002', '123', 12, 2030, 10000, 'blocked', 'normal', 'declined: the card is blocked'),
  ('40000003', '123', 12, 2030, 5, 'active', 'normal', 'declined: not enough money (5 EGP)'),
  ('40000004', '123', 10, 2026, 10000, 'active', 'normal', 'declined: expired in October 2026'),
  ('40000005', '123', 12, 2030, 10000, 'active', 'no_answer', 'no answer: the payment times out')
) AS c (number, cvv, month, year, balance, status, behaviour, note);

-- Down Migration

DROP SCHEMA mock_bank CASCADE;
DELETE FROM settings WHERE key = 'PAYMENT-TIMEOUT';
DROP TABLE payments;
