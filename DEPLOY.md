# UDIE — Setup & Deploy Guide
## One command to run. No separate server needed.

---

## LOCAL DEVELOPMENT

### Step 1 — Install dependencies (once)
```bash
cd udie-app
npm install
```

### Step 2 — Add your API key
```bash
cp .env.example .env
```
Open `.env` and add your Anthropic key:
```
VITE_ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE
```
Get your key at: **console.anthropic.com** → API Keys

### Step 3 — Run the app
```bash
npm run dev
```
Open: **http://localhost:5174**

That's it. One command. No separate server needed.

---

## HOW THE AI WORKS

The app calls Anthropic Claude directly from your browser using:
```
anthropic-dangerous-direct-browser-access: true
```
This is an official Anthropic header that enables browser-to-API calls.

**Your API key is in VITE_ANTHROPIC_API_KEY** — it's bundled in the app.
This is fine for personal/demo use. For production, move to a server-side proxy.

---

## SUPABASE (optional — for user accounts & sync)

Without Supabase: app works in demo mode (localStorage only, no persistence)
With Supabase: real email auth + data synced across devices

### Set up Supabase:
1. Go to supabase.com → New Project
2. SQL Editor → Run:

```sql
create table company_profiles (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete cascade not null unique,
  company_name text default '',
  industry   text default '',
  stage      text default '',
  geography  text default '',
  priorities text default '',
  challenges text default '',
  updated_at timestamptz default now()
);

create table insights (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  mode       text,
  title      text,
  signal     text,
  context    text,
  impact     jsonb,
  actions    jsonb,
  urgency    text,
  data       jsonb,
  created_at timestamptz default now()
);

alter table company_profiles enable row level security;
alter table insights enable row level security;
create policy "own" on company_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own" on insights for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

3. Settings → API → copy URL and anon key
4. Add to `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON=eyJ...
```

---

## DEPLOY TO VERCEL

```bash
npm run build
npx vercel login
npx vercel --prod
```

Add env vars in Vercel Dashboard → Settings → Environment Variables:
```
VITE_ANTHROPIC_API_KEY = sk-ant-api03-...
VITE_SUPABASE_URL      = https://...          (optional)
VITE_SUPABASE_ANON     = eyJ...               (optional)
```

---

## DEMO MODE (no API key)
Without VITE_ANTHROPIC_API_KEY, the app shows demo placeholder insights
that explain how to set up the key. Full UI works — just no real AI.

## User Flow
1. Open app → Splash screen (3 seconds)
2. Sign in / Create account (demo: any email + 6+ char password)
3. Company profile setup (3 steps)
4. Home dashboard — intelligence briefing
5. Intelligence tab — ask any question, get structured insight
6. Tap any insight card → full analysis with actions
