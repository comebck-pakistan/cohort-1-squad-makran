-- M4: the already-designed Meeting Draft Review screen (Screen 7) shows the transcript
-- alongside draft tickets while the user reviews/edits them. Processing is async (webhook fires,
-- ticketize runs, user reviews later), so the transcript needs to persist at least until review
-- is confirmed or discarded. Kept separate from `draft_tickets` (the permanent digest, per
-- handoff's "no auto-generated summaries" rule): this is transient working data, cleared once
-- promoteDraftTickets/discardDraftTickets runs.
alter table meetings add column transcript_text text;
