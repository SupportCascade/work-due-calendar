# Design System

This file is the manifest for this app's design system. It is the source of
truth for visual decisions: read it before building UI, and keep it updated
as the system evolves. The template ships a deliberately neutral baseline —
**it is a starting point, not a look**. Every app should evolve it into its
own design system before shipping product UI.

## Status

- [x] Customized — Cascade navy and blue, Poppins, a clear calendar grid,
  restrained status accents, and white/off-white surfaces.

## Workspace brand

This file is **app-scoped**. If the Viktor workspace keeps a brand spec at
`/work/brand/DESIGN.md` (tokens for the company's colors, typography, voice,
plus binaries in `/work/brand/assets/`), treat it as the upstream source when
this app should look like the company: derive the app tokens from the brand
tokens, use the exact brand assets, and record the derivation below. Internal
tools may deliberately diverge — note that too. Never edit the workspace brand
spec from inside an app.

## References

Ideate before deciding: name 2–3 real products or sites this audience already
trusts for this kind of interface, extract concrete attributes from each
(palette temperature, type pairing, density, layout structure, one signature
element worth adapting), and record them here. Anchors are for attribute
extraction, never for copying a screen.

| Reference | What it does well | Attributes borrowed |
| --- | --- | --- |
| Google Calendar | Familiar month/week navigation and clear date hierarchy | Compact weekday labels, navigable grid, calm neutral surfaces |
| Linear | Dense work item scanning with clear status cues | Status labels paired with a restrained color accent |
| Airtable Calendar | Direct relationship between records and scheduled dates | Date-first grouping and links back to source records |

## Design decisions

Record the app's decisions here as you make them:

| Decision | Value |
| --- | --- |
| Site vs app surfaces | Public, read-only calendar preview; restrained product interface |
| Direction | Clear, work-focused calendar in a centered, bounded workspace with a light Cascade brand treatment |
| Display font (`--font-display`) | Poppins 600–700 |
| Body font (`--font-body`) | Poppins 400–500 |
| Contrast pattern | White/off-white surfaces, navy structure, Cascade Blue actions, status accents |
| Palette idea | Cascade Navy `#1E3B55`, Cascade Blue `#2966CC`, Off-White `#F6F8F7` |
| Radius / shadow language | 12px cards, 6px buttons, restrained navy-tinted shadows |
| Signature element | Status-colored work-item edges paired with labels; Cascade Blue report cards marked with a file icon |
| Frontend stack | Vite + React, Tailwind CSS v4, shadcn/ui components built on Base UI |
| Container and viewport | Centered 1320px max-width calendar window; desktop height capped at `calc(100dvh - 24px)` with internal scrolling; mobile remains full-width and touch-friendly |

## Where the system lives

| Layer | Location | Rule |
| --- | --- | --- |
| Tokens | `src/index.css` | All colors, fonts, radii live here as CSS variables. Never hardcode palette values (`text-white`, hex codes) in components — always go through semantic tokens (`bg-primary`, `text-muted-foreground`, …). |
| Primitives | `src/components/ui/` | shadcn/ui controls and surfaces. Keep their styling token-based and extend only where the calendar needs it. |
| Shared app styles | `src/components/controlStyles.ts` | Reusable button and input styles for the starter. Customize them once for the app; use `cn()` for local overrides. |
| Behavior | `@base-ui/react` | Headless, accessible components (dialog, menu, switch, and ~35 more). Unstyled by design: you own every pixel. |

## Customizing the system

1. **Typography** (highest leverage): use the supplied Poppins files in
   `public/fonts/`, then set `--font-display` / `--font-body` in
   `src/index.css`.
2. **Color**: pick a contrast pattern first (value, saturation, cold–warm,
   or complementary), build the lightness ladder, then place hue — all
   neutrals on one temperature, soft colors (borders, tints) re-derived from
   the ladder rather than opacity-faded. Then edit the token values in
   `:root` and `.dark` in `src/index.css`. Change the *values*, keep the
   *names* — everything downstream reads the semantic tokens.
3. **Shape and depth**: choose radius, border, shadow, and spacing using the
   tokens. Shared app styles keep repeated controls consistent; surfaces own layout.
4. **Reuse with restraint**: save generation and editing tokens by sharing
   repeated markup, interaction setup, and styles behind small APIs. Keep the
   starter's core small; add app-specific patterns as needed, with styling and
   composition open to change.

## Pulling more headless components on demand

The starter helpers are optional. For interactions such as selects, tooltips,
menus, tabs, accordions, comboboxes, sliders, or toasts:

1. All of Base UI is already installed — one package, tree-shaken. Import the
   part: `import { Select } from "@base-ui/react/select";`
2. Read the component's docs for anatomy and data attributes:
   `https://base-ui.com/react/components/<name>` (each page has a
   "View as Markdown" link — fetch
   `https://base-ui.com/react/components/<name>.md` for the raw version).
   Style states via data attributes: `data-open`, `data-highlighted`,
   `data-checked`, and animate with `data-starting-style` /
   `data-ending-style`.
3. Compose the parts where they are used, with styles from the app tokens.
   Extract a local wrapper only when repetition makes it useful; preserve
   access to Base UI's parts.
4. If Base UI doesn't cover the need, prefer other headless libraries
   (styleable, accessible) over pre-styled component kits — the app's look
   must come from this design system, not from a library's defaults.

## Non-negotiables

- Semantic tokens only in components; raw palette values live in
  `src/index.css` alone.
- Both themes: check every change in light and dark mode.
- Keep focus states visible and keyboard interaction working (Base UI gives
  you this — don't hand-roll popups from divs).
- Responsive from the start; verify mobile and desktop.

## Validating

After UI changes, run `bun run design:review` (see README). It renders the key
routes at four viewports into `tmp/design-review/latest/` — a contact sheet
(plus a grayscale variant) and deterministic checks (overflow, WCAG contrast,
console errors, token discipline). Fix blocking issues, then judge the contact
sheet against this file: does every screen carry the direction recorded above,
and does hierarchy still read on `contact-sheet-gray.png` with color removed?
