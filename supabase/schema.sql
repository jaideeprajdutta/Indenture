create table if not exists deal_queue (
  id serial primary key,
  deal_name text not null,
  lender_name text not null,
  ai_decision text not null,
  evidence text not null,
  email_draft text not null,
  human_status text not null default 'PENDING'
);
