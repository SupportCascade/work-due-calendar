# Work Due Calendar

A read-only calendar of work due dates and client report days, pulled live from Airtable. Hosted on Vercel: a Vite + React frontend plus a few Vercel functions in `api/`.

## How it works

- `api/calendar.ts` reads the Work Items, Team Members and Clients tables from Airtable with `AIRTABLE_TOKEN` and returns them to signed-in users only.
- Sign-in is by emailed link. `api/auth/request-link.ts` emails a 15-minute link (via Resend) to addresses on `AUTH_ALLOWED_EMAILS`; `api/auth/verify.ts` turns it into a 30-day session cookie. Links and cookies are signed with `AUTH_SECRET`; there is no database.
- Every request re-checks the approved list, so removing an address locks that person out straight away.

## Settings

See `.env.example` for every setting and what it does. Set them in the Vercel project; nothing secret goes in the repo.

## Local development

```bash
npm install
vercel env pull .env.local   # copy the project's settings down
vercel dev                   # site + api/ functions on http://localhost:3000
```

`npm run dev` runs the frontend alone (no `api/`, so you'll only see the sign-in page).

## Deploying

Pushes to `main` deploy automatically once the GitHub repo is connected to the Vercel project.

Before building UI, read `DESIGN.md` — the app's design-system manifest.
