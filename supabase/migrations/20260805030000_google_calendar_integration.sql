-- Real Google Calendar meeting detection: OAuth token storage (refresh flow, unlike GitHub's
-- non-expiring token) and calendar-event linkage on meetings.

alter table integrations add column refresh_token text;
alter table integrations add column token_expires_at timestamptz;

alter table meetings add column google_event_id text;
alter table meetings add column meeting_url text;
create unique index idx_meetings_owner_google_event on meetings(owner_id, google_event_id) where google_event_id is not null;

alter table meetings drop constraint meetings_status_check;
alter table meetings add constraint meetings_status_check
  check (status in ('scheduled', 'in_progress', 'processing', 'ready', 'failed', 'dismissed'));
