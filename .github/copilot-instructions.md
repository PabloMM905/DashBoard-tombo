Project snapshot

- Framework: React + Vite (React 19, ESM `type: module`). See `package.json` and `vite.config.js`.
- Bundler / dev: `vite` — use `npm run dev` / `npm run build` / `npm run preview`.
- Data backend: Supabase (`@supabase/supabase-js`). Environment keys are provided via Vite `import.meta.env` (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY).

What matters for an AI coding agent

- Big picture: This is a small single-page dashboard that queries Supabase tables and renders charts with `recharts`.
  - Frontend entry: `src/main.jsx` → `src/App.jsx` (the main dashboard UI lives in `src/App.jsx`).
  - Supabase client: `src/supabase.ts` (TypeScript module creating `supabase` client via `createClient`). There is also an older/alternative client at `src/lib/supabaseClient.js` used by `src/testSupabase.js`.
  - Data flow: UI components call `supabase.from(...)` directly for counts and lists. Example queries in `src/App.jsx`:
    - Count rows: `.from("reports").select("*", { count: "exact", head: true })`
    - List and group: `.from("reports").select("*")` then client-side reduce to group by `report_type`
    - Latest items: `.from("reports").select("*").order("created_at", { ascending: false }).limit(5)`

Key files to reference when coding

- `src/App.jsx` — canonical example of how Supabase is queried and how results are transformed for UI and charts.
- `src/supabase.ts` — preferred single exported `supabase` client (used by App). Use this when adding new components/features.
- `src/lib/supabaseClient.js` & `src/testSupabase.js` — legacy helper and a small test function; read before removing or consolidating.
- `package.json` — scripts: `dev`, `build`, `preview`, and `lint` (ESLint). Use `npm run dev` locally.
- `vite.config.js` — plugin config uses `babel-plugin-react-compiler`; be cautious when changing Babel plugins or fast-refresh behavior.

Environment and local setup

- The app expects environment variables in a Vite `.env` file at project root (see `README.md`):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- To run locally:
  - `npm install` (if dependencies not present)
  - `npm run dev` — starts Vite dev server with HMR
  - `npm run build` — create production build

Patterns & conventions specific to this repo

- Direct-query pattern: components query Supabase directly inside `useEffect` and perform small transformations client-side (see `loadDashboard()` in `src/App.jsx`). Prefer small, explicit queries rather than introducing global abstractions unless adding many new pages.
- Table names used: `reports`, `comments`, `points`, and `profiles` (used in `testSupabase.js`). Follow these names when writing queries.
- Minimal state: Hooks + local state (no global state management). New components should accept data props or encapsulate their own `useEffect` for fetch logic.
- Two supabase client files exist: prefer `src/supabase.ts` for new work; if you change one, check for uses of the other (`testSupabase.js`) and port accordingly.

Code examples (copyable)

1) Create a client import (preferred):
```
import { supabase } from "./supabase";
const { data, error } = await supabase.from("reports").select("*").limit(5);
```

2) Count rows (pattern used in `src/App.jsx`):
```
const { count } = await supabase.from("comments").select("*", { count: "exact", head: true });
```

Developer workflows and gotchas

- Linting: `npm run lint` runs ESLint (project includes `@eslint/js` config). Follow existing code style (JSX in `.jsx` files, small inline styles used in `App.jsx`).
- Fast-refresh & compiler: `vite.config.js` includes `babel-plugin-react-compiler`; avoid large config changes that may break dev HMR performance.
- If changing env var names, update usage in both `src/supabase.ts` and `src/lib/supabaseClient.js`.

When you are uncertain, inspect these spots first

- `src/App.jsx` — how UI expects data shapes (e.g., `report_type`, `description`, `created_at`).
- `src/supabase.ts` — where the client is created (env var names and imports).
- `README.md` — contains a note to create a local `.env` with the Vite vars.

Questions for the maintainer (please clarify)

- Which supabase client should be canonical (`src/supabase.ts` or `src/lib/supabaseClient.js`)?
- Any plans for adding tests or CI scripts (none present today)?

If you'd like, I can:
- consolidate supabase client files into a single source-of-truth and update imports across the repo,
- add a tiny README snippet showing exact `.env` content and `npm` commands,
- or add a quick dev-check script that runs `testSupabase()` and prints connection status.
