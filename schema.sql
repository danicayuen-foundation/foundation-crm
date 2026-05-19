-- Foundation GTM CRM Supabase schema

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  company text not null,
  industry text,
  plants text,
  locations text,
  stage text default 'Researching',
  heat text default 'Cold',
  trigger text,
  next_action text,
  notes text
);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  name text not null,
  company text,
  title text,
  linkedin text,
  email text,
  status text default 'Researching',
  last_touch date,
  next_follow_up date,
  reply text default 'No',
  notes text
);

create table if not exists outreach_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  log_date date default current_date,
  contact text,
  company text,
  channel text,
  action text,
  notes text
);

alter table companies enable row level security;
alter table contacts enable row level security;
alter table outreach_log enable row level security;

create policy "Authenticated users can read companies"
on companies for select
to authenticated
using (true);

create policy "Authenticated users can insert companies"
on companies for insert
to authenticated
with check (true);

create policy "Authenticated users can update companies"
on companies for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete companies"
on companies for delete
to authenticated
using (true);

create policy "Authenticated users can read contacts"
on contacts for select
to authenticated
using (true);

create policy "Authenticated users can insert contacts"
on contacts for insert
to authenticated
with check (true);

create policy "Authenticated users can update contacts"
on contacts for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete contacts"
on contacts for delete
to authenticated
using (true);

create policy "Authenticated users can read outreach_log"
on outreach_log for select
to authenticated
using (true);

create policy "Authenticated users can insert outreach_log"
on outreach_log for insert
to authenticated
with check (true);

insert into companies (company, industry, plants, locations, stage, heat, trigger, next_action, notes)
values
('BorgWarner', 'Auto Components', '80+ sites', 'US, Germany, Italy', 'Outreach Active', 'Hot', 'EV expansion / thermal management growth', 'Follow up with VP Operations', 'Strong fit for material handling and line-side logistics.'),
('Gentex', 'Automotive Electronics', '10+ sites', 'Michigan, US', 'Discovery', 'Warm', 'Automation and manufacturing optimization', 'Prepare pilot use case', 'Good fit for repetitive manufacturing support.'),
('Dana Incorporated', 'Powertrain / Drivetrain', '130+ facilities', 'US, Italy, UK', 'Researching', 'Cold', 'Operational efficiency focus', 'Find automation decision maker', 'Need stronger contact mapping.')
on conflict do nothing;

insert into contacts (name, company, title, linkedin, email, status, last_touch, next_follow_up, reply, notes)
values
('Andrew Mickus', 'BorgWarner', 'Director Shared Services and Facilities', '', '', 'LinkedIn Sent', current_date, current_date + interval '5 days', 'No', 'Potential facilities/ops angle.'),
('Neil Boehm', 'Gentex', 'COO & CTO', '', 'neil.boehm@gentex.com', 'Connected', current_date, current_date + interval '2 days', 'No', 'Strong senior target.')
on conflict do nothing;
