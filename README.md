# SalaryCalc

Quick local app for calculating and recording tray-based salaries.

Run locally

```bash
npm install
npm start
```

Open in browser: http://localhost:3000

Database

- The frontend reads/writes data directly in Supabase (via `supabaseClient.js`).
- The backend API (used by downloads/fallbacks) must point to the **same Supabase Postgres** database, otherwise deleted/edited items can “reappear”.
- Set `DATABASE_URL` in `.env` to your Supabase Postgres connection string (Project Settings → Database → Connection string), for example:

```bash
DATABASE_URL="postgresql://postgres:<SUPABASE_DB_PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres?schema=public&sslmode=require"
```

Authentication (demo)

- The app uses a simple client-side sign-in. Open `/login.html` and enter any username/password. This stores a local flag in `localStorage`.
 - Authentication: server-side login/register using JWT. Use `/login.html` to sign in or create an account. Password reset is available via the "Forgot password" flow (demo returns a reset link). UI actions (Sign in, Create account, Forgot password, Logout, Dashboard) use the same button styling for consistency.

UI features

- Dashboard: manage employees.
- Records: view month-wise salary records per employee.
- Months button: on the dashboard and within each employee group on the records page you can open a small dropdown listing available months — clicking a month scrolls to that month's record.

Notes

- This is a demo/local app. Client-side auth is not secure. For production, replace with proper server-side authentication and session handling.
