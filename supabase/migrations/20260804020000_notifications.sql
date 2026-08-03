-- In-app notification center. Mirrors notify.ts/briefing.ts's 3 trigger types (pr-ready,
-- needs-human, briefing), gated by the existing prReadyInApp/stuckInApp/briefingInApp prefs
-- in user_metadata.notification_prefs. Written alongside the email send, not instead of it.
create table notifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('pr-ready', 'needs-human', 'briefing')),
  title text not null,
  body text not null,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;

create policy "owner_all_notifications" on notifications
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

grant select, insert, update, delete on notifications to authenticated;
grant all on notifications to service_role;

create index idx_notifications_owner_id on notifications(owner_id, created_at desc);
