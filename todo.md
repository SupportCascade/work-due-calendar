# Work Due Calendar

- [x] Verify Airtable base, table schema, owner links, and current records.
- [x] Initialize the private Space and review its template/auth conventions.
- [x] Apply Cascade tokens and replace the starter dashboard with a responsive calendar.
- [x] Add authenticated, server-side Airtable reads with sanitized calendar output.
- [x] Restrict email sign-up to the verified Cascade company domain.
- [x] Add Playwright coverage for Airtable data, status visibility, views, and record links.
- [x] Run sync/build, e2e, scoped lint checks, and visual review across light/dark and mobile/desktop.
- [x] Deploy the internal app to production.
- [ ] Apply the requester's earlier approval to make this calendar's production URL public. `set_space_access` was rejected because the tool could not verify the requesting user's workspace membership; a verified Viktor workspace admin must change this Space's Access setting.

The production deployment remains authenticated and its calendar data action is restricted to `admin@cascadewebsolutions.co`; records categorized as Hiring are omitted under the current HR access rule.

## Landscape layout update

- [x] Expand the desktop calendar to use the full page width and move summary panels into a horizontal strip.
- [x] Verify build, responsive layouts, and calendar behavior; deploy the layout update.

## Monthly report schedule addition

- [x] Check Client Work Items for Reporting-type tasks and inspect the Clients report schedule.
- [x] Include active client report-day schedules in month/week calendar entries and a due-today/this-week/next-week card.
- [x] Show active clients with no report day as unscheduled, without implying report completion status.
- [x] Test the app action and report links; review responsive layouts.
- [x] Deploy the update without changing access settings.

## Calendar view filters

- [x] Make summary cards individually collapsible and collapsed by default.
- [x] Put the cards below the calendar and add an accessible filter beside Month/Week.
- [x] Split Client Due Dates (active client report schedules) from Deliverables (Client Work Items) into separate top-level views.
- [x] Scope each tab's calendar, summary cards, and controls to its own Airtable records.
- [x] Keep Airtable-backed reads refreshed on initial load and every 60 seconds; surface the latest sync time.
- [x] Default Deliverables to This & next week; verify tab separation, filter choices, links, and collapsible behavior.
- [x] Review mobile, tablet, desktop, and dark mode.
- [x] Deploy the update to production without changing access settings.

## Public read-only preview

- [x] Requester explicitly approved a link-accessible, anonymous, view-only calendar preview; do not deploy these changes to production without a separate request.
- [x] Switch the preview build to public routes and expose only the fixed, read-only calendar data action.
- [x] Build and sync the preview, verify unauthenticated Airtable data and calendar views, and pass responsive visual review.
- [x] Deploy the anonymous read-only app to the preview environment.
- [ ] Set the preview platform access gate to Public. The deployment could not apply `default_access=public` because the gate already exists, and `set_space_access` failed because workspace membership could not be verified. A verified Viktor workspace admin must change the preview Access setting.

## Todd's UI and stack refinement

- [x] Confirm supported deployment path without changing the public read-only preview's data or access configuration. The Space deployment invokes `vite build`; a local Next.js build succeeded, but the platform deploy failed because it requires Vite.
- [ ] Port to Next.js. Blocked until the Space deployment path supports Next.js; retain Vite for this preview rather than claiming an undeployable migration.
- [x] Keep Tailwind CSS and add shadcn/ui primitives for the calendar's shared controls and surfaces.
- [x] Constrain the calendar to a centered 1320px responsive container and a desktop viewport cap of `calc(100dvh - 24px)`; preserve internal scrolling and use a single-column week view on phones.
- [x] Verify the public build, mobile and desktop layouts, keyboard/accessibility review, and existing read-only data tests. Typecheck, targeted Biome, preview build, both calendar e2e tests, and access-contract tests passed. Design review had no blocking issues; Chrome logged a non-blocking mobile `beforeunload` warning.
- [x] Deploy the verified changes to preview only; production was not deployed.

The deployed preview URL still redirects anonymous visitors to Viktor sign-in because its platform-level Access gate remains restricted. The local public-mode build and read-only calendar tests passed; no access settings were changed. A verified Viktor workspace admin must change the preview gate before an anonymous visitor can open the URL.
