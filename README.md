# Daily Table Plan

A simple web app for teachers to create, save, update, and review daily inside and outside table plans.

## Features

- Date-based daily planning
- Inside and outside plan sections
- Teacher selection for each section
- Two teachers can be selected for inside and outside each day
- Activity notes for each table or area
- Optional photo upload for activity setup
- Evaluation notes for inside and outside
- Save, update, clear, and copy yesterday's plan
- Supabase database support for shared multi-device updates
- Teacher login with username/email and password

## Inside Areas

- Art table
- Playdough table
- Tea table
- Welcome table

## Outside Areas

- Carpentry table
- Water trough
- Sandpit
- Corner table
- Climbing box area table
- Easel

## Teachers

- Fleur
- Jinhee
- Nikita
- Hannah
- Felix

## Run Locally

Open `index.html` directly in a browser, or start a local server:

```bash
python3 -m http.server 4173
```

Then visit:

```text
http://127.0.0.1:4173/index.html
```

## Supabase Setup

This app is designed to save plans to Supabase so teachers can update the same plan from different phones or computers.

Create a Supabase project, then run this SQL in the Supabase SQL editor:

```sql
create table daily_plans (
  date date primary key,
  plan jsonb not null,
  updated_at timestamptz default now()
);

alter table daily_plans enable row level security;

create policy "Teachers can read plans"
on daily_plans
for select
using (auth.role() = 'authenticated');

create policy "Teachers can insert plans"
on daily_plans
for insert
with check (auth.role() = 'authenticated');

create policy "Teachers can update plans"
on daily_plans
for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "Teachers can delete plans"
on daily_plans
for delete
using (auth.role() = 'authenticated');
```

## Login Setup

In Supabase, go to `Authentication` -> `Users` and create one shared staff user:

```text
Email: peekaboo@tableplan.local
Password: Peek4b00
```

Teachers can log in by typing:

```text
Username: Peekaboo
Password: Peek4b00
```

The app converts `Peekaboo` into `peekaboo@tableplan.local` for Supabase login.

Recommended Supabase Auth settings:

- Turn off public sign-ups if available for your project.
- Create the shared account manually.
- Share the password only with staff.

Then open `script.js` and fill in:

```js
const SUPABASE_URL = "your-project-url";
const SUPABASE_PUBLISHABLE_KEY = "your-publishable-or-anon-key";
```

The app uses the official Supabase JavaScript client from the browser CDN.

Only logged-in Supabase users can read or edit plans.
