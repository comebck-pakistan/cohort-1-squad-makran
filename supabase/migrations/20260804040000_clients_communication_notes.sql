-- Resolves the open "communication style" question (handoff doc §6): user-editable per-client
-- notes, not LLM-generated. Keeps the pre-meeting briefing honest about what it actually knows
-- rather than guessing at tone from thin data.
alter table clients add column communication_notes text;
