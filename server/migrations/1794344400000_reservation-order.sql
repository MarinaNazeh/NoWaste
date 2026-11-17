-- Up Migration

-- D-101 (US-32): the order in which reservations were made, for the vendor's reservation numbers (#1, #2, ...). An
-- always-increasing counter, so two reservations made in the same millisecond still have a fixed order.
ALTER TABLE reservations ADD COLUMN seq BIGINT GENERATED ALWAYS AS IDENTITY;

-- Down Migration

ALTER TABLE reservations DROP COLUMN seq;
