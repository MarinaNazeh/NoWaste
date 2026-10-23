-- Up Migration

-- SDD C-28: PostgreSQL with PostGIS (locations, distance queries) and citext (case-insensitive email, SDD 4.2 User.email).
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS citext;

-- SDD 4.2 Data Dictionary, entity "Settings": configuration values, including the rule times from SRS 5.5.
-- Code reads rule values from this table; it never hard-codes them.
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  description TEXT,
  source TEXT
);

-- One row per business rule in SRS 5.5 (BR-01 to BR-12), with the exact values from the SRS.
-- The description is the rule text from SRS 5.5; the source is the SRS requirement the rule comes from.
INSERT INTO settings (key, value, description, source) VALUES
  ('BR-01',
   '{"highly_perishable_max_hours": 6, "short_life_max_hours": 48}',
   'Perishability: Highly perishable <= 6 h, Short-life > 6 h to 48 h, Long-life > 48 h',
   'SRS 5.5 BR-01; FR-RTE-01'),
  ('BR-02',
   '{"hold_minutes": 45}',
   'No-card hold: 45 minutes from the later of reservation time or window start, capped at window end',
   'SRS 5.5 BR-02; FR-RES-03'),
  ('BR-03',
   '{"check_ins_allowed": 1, "extension_minutes": 20}',
   'One "I''m on my way" check-in: +20 minutes, capped at window end',
   'SRS 5.5 BR-03; FR-RES-04'),
  ('BR-04',
   '{"min_minutes_remaining": 30}',
   'A released bag goes to the waitlist only if at least 30 minutes remain',
   'SRS 5.5 BR-04; FR-RES-05'),
  ('BR-05',
   '{"accept_minutes": 10}',
   'Waitlist offer: 10 minutes to accept',
   'SRS 5.5 BR-05; FR-RES-06'),
  ('BR-06',
   '{"full_refund_within_minutes": 10}',
   'Card refund: full refund only if cancelled within 10 minutes of reserving',
   'SRS 5.5 BR-06; FR-RES-12'),
  ('BR-07',
   '{"no_shows": 3, "within_days": 30, "block_days": 14}',
   'No-show limit: 3 no-shows in 30 days blocks no-card reserving for 14 days',
   'SRS 5.5 BR-07; FR-RES-13'),
  ('BR-08',
   '{"no_shows": 3, "within_days": 30}',
   'Admin flag: 3 no-shows in 30 days flags the account',
   'SRS 5.5 BR-08; FR-TGI-04'),
  ('BR-09',
   '{"digits": 6}',
   'Pickup code: 6 digits',
   'SRS 5.5 BR-09; FR-RES-10'),
  ('BR-10',
   '{"minutes_before_window_end": null}',
   'Automatic charity offer: (TBD-5) minutes before window end. The value is open until TBD-5 is decided.',
   'SRS 5.5 BR-10; FR-RTE-11; TBD-5'),
  ('BR-11',
   '{"refund": "full"}',
   'Uncollected Zakat donation: full refund',
   'SRS 5.5 BR-11; FR-TGI-05, E-TGI-03'),
  ('BR-12',
   '{"ai_draft_time_limit_seconds": 10}',
   'AI draft time limit: 10 seconds',
   'SRS 5.5 BR-12; E-LST-01, NFR-02'),
  ('TBD-5',
   NULL,
   'How many minutes before the pickup window ends the automatic charity offer is made. Not yet decided (SRS Appendix C).',
   'SRS Appendix C TBD-5; FR-RTE-11, 4.3.2, BR-10');

-- Down Migration

DROP TABLE IF EXISTS settings;
DROP EXTENSION IF EXISTS citext;
DROP EXTENSION IF EXISTS postgis;
