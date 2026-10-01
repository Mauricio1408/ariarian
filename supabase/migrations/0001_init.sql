-- ════════════════════════════════════════════════════════════════
-- AriArian — Asset Lifecycle Management System
-- Schema derived from Obsidian Vault/AriArian/Data Model.md (11 entities)
-- Enumerations and thresholds from Business Rules.md
-- ════════════════════════════════════════════════════════════════

-- ── Enumerations (Business Rules.md § Enumerations) ──────────────
create type operational_status as enum
  ('In Use', 'Standby', 'Maintenance', 'Damaged', 'Decommissioned');
create type physical_condition as enum
  ('Excellent', 'Fair', 'Poor');
create type asset_category as enum
  ('Hardware', 'Software', 'Office', 'Vehicles', 'Appliances', 'Essentials', 'Others');
create type employee_status as enum
  ('Active', 'On Leave', 'Clearance', 'Cleared');
create type work_order_stage as enum
  ('reported', 'in_repair', 'resolved');
create type problem_type as enum
  ('Hardware Failure', 'Software Issue', 'Battery Issue', 'Physical Damage', 'Others');
create type priority_level as enum ('High', 'Medium', 'Low');
create type property_form_type as enum ('PAR', 'ICS');
create type disposal_status as enum ('requested', 'inspected', 'cleared', 'disposed');

-- ── AGENCY 1--n OFFICE ──────────────────────────────────────────
create table agency (
  agency_id text primary key,
  code      text not null unique,
  name      text not null
);

create table office (
  office_id text primary key,
  agency_id text not null references agency on delete restrict,
  name      text not null
);

-- ── OFFICE 1--n EMPLOYEE ────────────────────────────────────────
create table employee (
  employee_id text primary key,          -- DOST-YYYY-NNNN
  office_id   text not null references office on delete restrict,
  full_name   text not null,
  position    text not null,
  work_email  text not null unique,      -- firstname.lastname@dost.gov.ph
  status      employee_status not null default 'Active',
  photo_url   text
);

-- ── ASSET is the hub ────────────────────────────────────────────
create table asset (
  asset_id           text primary key,   -- DOST-YYYY-NNNN
  tag                text not null unique,
  name               text not null,
  category           asset_category not null,
  agency_id          text not null references agency on delete restrict,
  office_id          text not null references office on delete restrict,
  custodian_id       text references employee on delete set null,
  acquisition_cost   numeric(14,2) not null check (acquisition_cost >= 0),
  acquired_on        date not null,
  useful_life_months integer not null default 120,
  operational_status operational_status not null default 'In Use',
  physical_condition physical_condition not null default 'Excellent',
  photo_url          text
);

create index on asset (operational_status);
create index on asset (physical_condition);
create index on asset (agency_id);
create index on asset (custodian_id);

-- ── ASSET 1--n WARRANTY ─────────────────────────────────────────
create table warranty (
  warranty_id text primary key,
  asset_id    text not null references asset on delete cascade,
  provider    text not null,
  starts_on   date not null,
  ends_on     date not null
);
create index on warranty (ends_on);

-- ── ASSET 1--n WORK_ORDER ───────────────────────────────────────
create table work_order (
  work_order_id text primary key,
  asset_id      text not null references asset on delete cascade,
  problem_type  problem_type not null,
  priority      priority_level not null default 'Medium',
  technician    text,
  opened_on     date not null,
  promised_on   date,
  closed_on     date,
  cost          numeric(14,2),
  stage         work_order_stage not null default 'reported'
);
create index on work_order (stage);
create index on work_order (promised_on);

-- ── EMPLOYEE 1--n PROPERTY_FORM (PAR / ICS) ─────────────────────
create table property_form (
  form_id     text primary key,          -- DOST-PAR-YYYY-NNNN | DOST-ICS-YYYY-NNNN
  employee_id text not null references employee on delete restrict,
  type        property_form_type not null,
  issued_on   date not null
);

create table property_form_item (
  form_id  text not null references property_form on delete cascade,
  asset_id text not null references asset on delete cascade,
  primary key (form_id, asset_id)
);

-- ── ASSET 1--n TRANSFER (PTR) ───────────────────────────────────
create table transfer (
  transfer_id      text primary key,
  asset_id         text not null references asset on delete cascade,
  from_employee_id text references employee on delete set null,
  to_employee_id   text not null references employee on delete restrict,
  moved_on         date not null
);

-- ── ASSET 1--n DISPOSAL_REQUEST (IIRUP) ─────────────────────────
create table disposal_request (
  disposal_id    text primary key,
  asset_id       text not null references asset on delete cascade,
  requested_on   date not null,
  status         disposal_status not null default 'requested',
  coa_cleared_on date
);

-- ── AUDIT_EVENT — no silent mutation ────────────────────────────
create table audit_event (
  event_id          bigserial primary key,
  entity            text not null,       -- asset | transfer | work_order | disposal_request
  entity_id         text not null,
  action            text not null,       -- insert | update | delete
  actor_employee_id text references employee on delete set null,
  occurred_at       timestamptz not null default now(),
  payload           jsonb
);
create index on audit_event (entity, entity_id);

-- ── EMPLOYEE 1--n NOTIFICATION ──────────────────────────────────
create table notification (
  notification_id       bigserial primary key,
  recipient_employee_id text not null references employee on delete cascade,
  kind                  text not null,
  body                  text not null,
  created_at            timestamptz not null default now(),
  read_at               timestamptz
);

-- ════════════════════════════════════════════════════════════════
-- Reporting date
-- The dataset of record is stated "as of 2026-03-14" and the case
-- study quotes book values at that date. Depreciation is therefore
-- computed against as_of, not current_date, so the figures on screen
-- reproduce the ones in the write-up. Change this row to re-date the
-- whole system.
-- ════════════════════════════════════════════════════════════════
create table app_config (
  id    boolean primary key default true check (id),
  as_of date not null default date '2026-03-14'
);
insert into app_config (id) values (true);

create function reporting_date() returns date
  language sql stable
  as $fn$ select as_of from app_config where id $fn$;

-- ════════════════════════════════════════════════════════════════
-- Derivations — held in SQL so the app never recomputes them ad hoc
-- Straight-line, 120 months, residual 0.
-- NOTE: the Government Accounting Manual prescribes 5% residual and
-- useful lives by asset class. Residual 0 is a prototype simplification.
-- ════════════════════════════════════════════════════════════════
create view asset_valued as
select
  a.*,
  round(a.acquisition_cost / a.useful_life_months, 2) as monthly_depreciation,
  least(
    round((a.acquisition_cost / a.useful_life_months) * months_elapsed, 2),
    a.acquisition_cost
  ) as accumulated_depreciation,
  a.acquisition_cost - least(
    round((a.acquisition_cost / a.useful_life_months) * months_elapsed, 2),
    a.acquisition_cost
  ) as net_book_value,
  -- Capitalisation threshold: PHP 50,000 (COA Circular 2022-004)
  (a.acquisition_cost >= 50000) as is_capital
from asset a
cross join lateral (
  select greatest(0,
    (date_part('year',  reporting_date()) - date_part('year',  a.acquired_on)) * 12
  + (date_part('month', reporting_date()) - date_part('month', a.acquired_on))
  )::numeric as months_elapsed
) m;

-- Clearance invariant: closes only when assets_held = 0
create view employee_accountability as
select
  e.employee_id,
  e.office_id,
  e.full_name,
  e.position,
  e.work_email,
  e.status,
  e.photo_url,
  count(a.asset_id)                                   as assets_held,
  coalesce(sum(a.acquisition_cost), 0)::numeric(14,2) as accountable_value
from employee e
left join asset a on a.custodian_id = e.employee_id
group by e.employee_id, e.office_id, e.full_name, e.position,
         e.work_email, e.status, e.photo_url;

-- ════════════════════════════════════════════════════════════════
-- Row Level Security
-- DEMO POSTURE: anon may READ reference data; nobody may write
-- through the anon key. Writes require an authenticated session or
-- the service role. Tighten before handling real DOST records.
-- ════════════════════════════════════════════════════════════════
alter table app_config         enable row level security;
alter table agency             enable row level security;
alter table office             enable row level security;
alter table employee           enable row level security;
alter table asset              enable row level security;
alter table warranty           enable row level security;
alter table work_order         enable row level security;
alter table property_form      enable row level security;
alter table property_form_item enable row level security;
alter table transfer           enable row level security;
alter table disposal_request   enable row level security;
alter table audit_event        enable row level security;
alter table notification       enable row level security;

create policy read_app_config         on app_config         for select to anon, authenticated using (true);
create policy read_agency             on agency             for select to anon, authenticated using (true);
create policy read_office             on office             for select to anon, authenticated using (true);
create policy read_employee           on employee           for select to anon, authenticated using (true);
create policy read_asset              on asset              for select to anon, authenticated using (true);
create policy read_warranty           on warranty           for select to anon, authenticated using (true);
create policy read_work_order         on work_order         for select to anon, authenticated using (true);
create policy read_property_form      on property_form      for select to anon, authenticated using (true);
create policy read_property_form_item on property_form_item for select to anon, authenticated using (true);
create policy read_transfer           on transfer           for select to anon, authenticated using (true);
create policy read_disposal_request   on disposal_request   for select to anon, authenticated using (true);

-- audit_event and notification stay closed to anon.
create policy read_audit_event  on audit_event  for select to authenticated using (true);
create policy read_notification on notification for select to authenticated using (true);
