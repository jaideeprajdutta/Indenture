create table if not exists deal_queue (
  id serial primary key,
  deal_name text not null,
  lender_name text not null,
  deal_size numeric,
  industry text,
  geography text,
  ebitda numeric,
  leverage numeric,
  source text,
  ai_decision text not null,
  evidence text not null,
  email_draft text not null,
  missing_info text,
  next_best_action text,
  mandate_checks jsonb,
  human_status text not null default 'PENDING',
  human_decision text,
  override_reason text,
  crm_provider text,
  crm_status text,
  crm_record_id text,
  crm_routed_at timestamptz,
  crm_error text,
  created_at timestamptz default now()
);

create table if not exists deal_history (
  id serial primary key,
  deal_queue_id integer not null references deal_queue(id) on delete cascade,
  deal_name text not null,
  lender_name text not null,
  event_type text not null,
  previous_decision text,
  new_decision text,
  reason text,
  created_at timestamptz default now()
);

create index if not exists idx_deal_history_deal_queue_id on deal_history(deal_queue_id);
create index if not exists idx_deal_history_deal_name_lender on deal_history(deal_name, lender_name);
