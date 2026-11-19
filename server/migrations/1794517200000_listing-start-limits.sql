-- Up Migration

-- D-104 (Maryam, 2026-11-17): a listing's pickup start may not be in the past nor more than 7 days ahead, for full
-- listings and Quick Posts. A start up to 5 minutes in the past is still allowed (the time spent filling the form) and
-- is saved as given (a Quick Post's start is then taken as now). A Draft is checked when saved and when published.
INSERT INTO settings (key, value, description, source) VALUES
  ('LISTING-START', '{"max_days_ahead": 7, "past_grace_minutes": 5}',
   'Pickup start: from 5 minutes ago up to 7 days ahead',
   'Decision D-104; FR-LST-01, FR-LST-02, E-LST-04');

-- Down Migration

DELETE FROM settings WHERE key = 'LISTING-START';
