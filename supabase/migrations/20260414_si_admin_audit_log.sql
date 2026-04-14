-- Supericons admin audit log
-- Durable paper trail for destructive and sensitive admin actions

create table if not exists si_admin_audit_log (
  id           uuid primary key default gen_random_uuid(),
  action       text not null,
  target_id    text not null,
  target_email text,
  actor        text not null default 'admin',
  outcome      text not null default 'started',
  payload      jsonb,
  note         text,
  error_text   text,
  created_at   timestamptz not null default now()
);

alter table si_admin_audit_log enable row level security;

revoke all on table si_admin_audit_log from public;
grant select, insert, update on table si_admin_audit_log to service_role;

create index if not exists si_admin_audit_log_target_idx
  on si_admin_audit_log (target_id);

create index if not exists si_admin_audit_log_target_email_idx
  on si_admin_audit_log (target_email);

create index if not exists si_admin_audit_log_created_at_idx
  on si_admin_audit_log (created_at desc);

create index if not exists si_admin_audit_log_action_idx
  on si_admin_audit_log (action);

create index if not exists si_admin_audit_log_outcome_idx
  on si_admin_audit_log (outcome);
