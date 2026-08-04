alter table notifications drop constraint notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in ('pr-ready', 'needs-human', 'briefing', 'repo-created'));
