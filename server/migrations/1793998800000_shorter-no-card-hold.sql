-- Up Migration

-- Decision D-89 (Maryam, 2026-11-14): shorter no-card hold and check-in.
-- BR-02 / FR-RES-03: the no-card hold is 15 minutes (was 45 in SRS 5.5).
-- BR-03 / FR-RES-04: "I'm on my way" adds 10 minutes (was 20 in SRS 5.5), still once and capped at the window end.
UPDATE settings
SET value = '{"hold_minutes": 15}',
    description = 'No-card hold: 15 minutes from the later of reservation time or window start, capped at window end',
    source = 'SRS 5.5 BR-02; FR-RES-03; decision D-89'
WHERE key = 'BR-02';

UPDATE settings
SET value = '{"check_ins_allowed": 1, "extension_minutes": 10}',
    description = 'One "I''m on my way" check-in: +10 minutes, capped at window end',
    source = 'SRS 5.5 BR-03; FR-RES-04; decision D-89'
WHERE key = 'BR-03';

-- Down Migration

UPDATE settings
SET value = '{"hold_minutes": 45}',
    description = 'No-card hold: 45 minutes from the later of reservation time or window start, capped at window end',
    source = 'SRS 5.5 BR-02; FR-RES-03'
WHERE key = 'BR-02';

UPDATE settings
SET value = '{"check_ins_allowed": 1, "extension_minutes": 20}',
    description = 'One "I''m on my way" check-in: +20 minutes, capped at window end',
    source = 'SRS 5.5 BR-03; FR-RES-04'
WHERE key = 'BR-03';
