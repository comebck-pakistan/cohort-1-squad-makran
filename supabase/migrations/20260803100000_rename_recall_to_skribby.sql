-- Swap meeting-bot vendor from Recall.ai to Skribby (Recall.ai requires a business email to
-- sign up, which the account owner doesn't have; Skribby has no such wall and matches the
-- same bot-join API shape).

alter table meetings rename column recall_bot_id to skribby_bot_id;

update meetings set source = 'bot_skribby' where source = 'bot_recall';

alter table meetings drop constraint meetings_source_check;
alter table meetings add constraint meetings_source_check
  check (source in ('bot_skribby', 'manual_paste', 'manual_upload'));
