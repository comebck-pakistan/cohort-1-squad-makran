-- Outcome Capture modal's notes field, captured alongside outcome_reason/resolved_at but
-- reference-only (not used in insights aggregation).
alter table proposals add column outcome_notes text;
