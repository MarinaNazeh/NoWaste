-- Up Migration

-- D-102 (Maryam, 2026-11-17): a listing is Closed once its pickup has ended (the SDD lifecycle Active → Closed). From now
-- on the worker and every read close them; this closes the ones that ended before.
UPDATE listings SET status = 'Closed' WHERE status IN ('Active', 'Fully reserved') AND pickup_end <= now();

-- Down Migration

-- Nothing to undo: an ended listing cannot be bought, whatever its status.
SELECT 1;
