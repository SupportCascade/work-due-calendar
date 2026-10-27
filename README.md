# Work Due Calendar

A read-only calendar of work due dates and client report days, pulled live from Airtable. Next.js app hosted on Vercel, with email + password sign-in through NextAuth.

## How it works

- `src/app/page.tsx` shows the calendar to signed-in users and sends everyone else to `/login`.
- `src/app/api/calendar/route.ts` reads the Work Items, Team Members and Clients tables from Airtable (`src/lib/airtable.ts`) with `AIRTABLE_TOKEN`, for signed-in users only.
- `src/lib/auth.ts` is the NextAuth setup. There is no database: accounts are the `AUTH_USERS` setting, a list of emails with hashed passwords. Every request re-checks that list, so removing someone locks them out straight away.

## Managing accounts

1. Run `npm run hash-password -- someone@cascadewebsolutions.co` and type their password (12+ characters).
2. Add the printed `email=scrypt$...` line to `AUTH_USERS` in Vercel, comma-separated from the others. To change a password, replace that person's entry; to remove someone, delete it.
3. Redeploy (Vercel → Deployments → Redeploy) so the new setting takes effect.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev                  # http://localhost:3000
```

## Deploying

Pushes to `main` deploy automatically once the GitHub repo is connected to the Vercel project. See `.env.example` for the settings it needs.

Before building UI, read `DESIGN.md`, the app's design-system manifest.
