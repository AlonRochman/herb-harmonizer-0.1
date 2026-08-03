# MediCanna Health — CDSS for Medical Cannabis

## Scope boundary (read first)

This repo is **studies only** — the Afeka capstone. It lives at
`~/Desktop/Alon/studies/herb-harmonizer-0.1` and its only remote is the public
GitHub repo `AlonRochman/herb-harmonizer-0.1`.

It is unrelated to the ~162 Votiro work repos under `~/Desktop/Alon/votiro oded/`,
which push to Azure DevOps and must never reach an external host. This project
was originally cloned *inside* that folder and was moved out on 2026-08-03 for
exactly that reason. Never run a git command spanning both trees, and never
reference Votiro code, tickets, or infrastructure here.

## Project

Fourth-year capstone project (Afeka College, Industrial Engineering & Management).
A Clinical Decision Support System matching patients to medical cannabis strains.
Students: Matan Tzeig, Alon Rochman, Alon Bahlul. Advisor: Tamar Brillant.
All DB data is fabricated; breaking things is acceptable. There is a formal
academic report (ספר הפרויקט) alongside this prototype — keep code and report
claims consistent.

## Stack

- React 18 + TypeScript + Vite, Tailwind, shadcn/ui
- Supabase: Postgres + Auth (project `vnjzmsrpjzvowqlpedas`)
- Deployed on Vercel from `main` (auto-deploy on push)
- Anon key is hardcoded in `src/lib/supabaseClient.ts` (fine for this prototype)

## Architecture map

- `src/lib/recommendationEngine.ts` — rule-based scoring core:
  THC/CBD constraint filtering, evidence-rated condition matching via the
  `strain_conditions` table (strong/moderate/anecdotal), terpene–condition
  bonuses, age-based THC adjustment, feedback-derived boosts.
  `persistRecommendations()` writes the generated top set to `recommendations`
  with `status='pending'` (replaces previous pending rows; never touches
  doctor-reviewed rows).
- `src/context/AppContext.tsx` — session management. Real Supabase Auth sessions
  (restored via `getSession` + `onAuthStateChange`, flagged `authUser: true`)
  coexist with demo identities persisted in `sessionStorage`
  (`mc_current_user`). `ensureUserRecords()` creates `users` + `patients` rows
  for any auth user on first sign-in.
- `src/pages/LoginPage.tsx` — email+password sign-in/sign-up + two demo buttons
  (Demo patient / Demo clinician) that use seeded rows without Auth.
- `src/pages/RecommendationsPage.tsx` — redesigned as a "clinical instrument"
  (see Design language). Computes top-3, persists them, enforces constraints.
- `src/pages/DashboardPage.tsx` — doctor view: pending recommendations,
  approve/reject writes `status`, `review_note`, `reviewed_at`.
- `src/pages/PatientInputPage.tsx` — medical profile form. A logged-in patient
  always updates their own record (`resolveOwnPatientId`); doctors can create
  patients manually. Prefills from existing profile.
- `src/pages/FeedbackPage.tsx` — rate past sessions + history. Strictly scoped
  to the resolved patient; never shows other patients' records.
- `src/lib/supabaseRead.ts` — `read()` / `readOr()`: the only sanctioned way to
  run a Supabase read. Returns `{ data, failed }` so callers can tell "loaded,
  genuinely empty" from "load failed".
- `src/components/Navbar.tsx` — nav + notification bell. **Verified by tests**
  (`src/test/notificationBell.test.tsx`, 2026-08-03): unread badge for an
  approved recommendation, refetch on open, failed read surfacing instead of an
  empty inbox, and read state surviving remount while staying per-patient. The
  bell derives
  notifications from DB state (nothing is stored), refetches when the dropdown
  opens so an approval made in another session appears without a reload, and
  persists dismissed IDs in `localStorage` under **`mc_notif_read`** — a map of
  `{ [patientId]: string[] }`, capped at 100 ids, following the `mc_*` key
  convention (`mc_a11y`, `mc_current_user`). Notification ids are stable and
  derived (`rec_<id>`, `fb_<id>`, `reminder_30`), which is what makes storing
  them viable. That was a deliberate choice over adding a DB column: read state
  is a prototype affordance, and it follows the `mc_a11y` pattern. Consequence:
  read state is per-device. There is no realtime subscription — rejected as one
  more thing to fail during a live demo.
- `src/components/AccessibilityWidget.tsx` — global widget (text size ×3, high
  contrast, reduce motion) persisted in `localStorage` (`mc_a11y`), applied as
  classes on `<html>` (CSS at the bottom of `src/index.css`).

## Database (public schema)

`users` (id, full_name, email, phone) — for auth users, `id == auth.users.id`.
`patients` (id, user_id → users).
`patient_profiles` (patient_id, age, gender, medical_conditions, sensitivities, preferences).
`clinical_constraints` (patient_id, thc_max, cbd_min, contraindications) — values
  are raw doubles; ALWAYS round for display (`pctFmt` in RecommendationsPage).
`strains` (15 rows: name, thc_level, cbd_level, category, terpenes json,
  medical_uses json, terpenes_profile, producer, image_url).
`strain_conditions` (strain_id, condition lowercase, evidence_level
  strong|moderate|anecdotal, is_primary) — 39 seeded rows, seed lives at
  `supabase/seed_strain_conditions.sql`.
`usage_records` (patient_id, strain_id, dosage, consumption_method, usage_date).
`feedback` (usage_id, effectiveness_score 1–5, side_effects text, comments).
`recommendations` (patient_id, strain_id, match_score, explanation,
  status pending|approved|rejected, reviewed_by, reviewed_at, review_note).
`doctors`, `medical_licenses` — seeded, not tied to Auth (doctors are demo-only).

Patient conditions in seeded data are essentially "Chronic Pain" and "Anxiety".

## Conventions (follow these)

- **Supabase never throws.** Check `{ error }` on every write. Pattern in
  PatientInputPage: `must(await supabase...)` throws on error — reuse it.
  Silent write failures were a real bug class here.
- **`read()`/`readOr()` from `src/lib/supabaseRead.ts` are mandatory for every
  Supabase read; `<LoadError>` is mandatory wherever a failed read would show as
  an empty state.** Never destructure only `{ data }`. Same root cause: a failed
  query resolves as `{ data: null, error }`, so dropping `error` renders "no
  results" for "the query broke". All reads go through `read()` / `readOr()` in
  `src/lib/supabaseRead.ts`, which logs against a label naming the call site.
  Where emptiness is user-visible, render `<LoadError what="..." />` rather than
  an innocent empty state. Auth calls (getSession/onAuthStateChange) are exempt.
- **Never silently bypass clinical constraints.** If no strain passes
  thc_max/cbd_min, show an explicit message; do not widen the pool.
- **Empty-string matching:** `"x".includes("")` is true — guard any condition
  matching against empty profile strings (bug existed in the engine).
- Round all constraint percentages for display; DB holds 14-digit doubles.
- Keep patient data scoped: every usage/feedback/recommendation query filters
  by the resolved `patient_id`. No "fallback to any patient" for writes.

## Design language (Recommendations page; roll out gradually)

The product is a clinical instrument, not a wellness app. Tokens in
`tailwind.config.ts`: `ink #14201C`, `paper #F7F8F6`, `rule #D8DCD6`,
`resin #B4762A` (**always means THC**), `clinic #2F7A72` (**always means CBD**),
`flag #A63D2F` (limit at risk). Colour carries information, never decoration.
`font-data` = IBM Plex Mono, used ONLY for clinical data (values, grades, ranks).
Signature element: chemotype axis (real CBD/THC ratio, Type I/II/III) +
licence headroom meter ("X% of Y% ceiling"). The % match ring was deliberately
removed — a normalised rule sum is not a probability; don't bring it back.
The dashboard now follows the same language: a local `Panel` replaces shadcn
`Card`, THC/CBD chips use resin/clinic, review status uses ink weight with flag
reserved for the negative verdict, and the efficacy chart is ink (efficacy is not
a cannabinoid, so clinic would have been wrong). `match_score` is labelled "rule
sum", never "%". Feedback followed on 2026-08-03 (efficacy on the ink scale with
flag at the poor end; THC/CBD chips moved off amber/teal, which were close
enough to resin/clinic to mislead). Login and the strain catalogue followed on
2026-08-03. Login carries no clinical values at all, so font-data there is only
the small-caps chrome (labels, actions) and never the headings or prose; a
blocked sign-in takes flag, and the demo patient/clinician buttons are neutral
ink because which role you demo is a route, not a clinical reading. The
catalogue moved THC to resin and CBD to clinic, and dropped both hue maps: the
indica/sativa/hybrid colours were purple/amber/teal, and amber/teal sat close
enough to resin/clinic to read as THC and CBD on a card showing both, while a
terpene is neither a cannabinoid nor a risk. Its five-star rating was **deleted,
not restyled** — score and count were both `Math.random()`, rerolled on every
filter change, and the mono face on that page now means "measured". Same call as
the % match ring. **Still on the old emerald/shadcn look: InfoCenterPage,
Index.** Those are the only pages left to roll the tokens onto.

## Roles

**`DOCTOR_ACTIONS` in Index.tsx is the single source of truth for what a
clinician can do.** `NAV_DOCTOR` in Navbar.tsx mirrors it; if the two disagree,
DOCTOR_ACTIONS wins and the nav is the bug. Adding a clinician tool means adding
it to DOCTOR_ACTIONS first.
Dosage and Info Centre were removed from the doctor nav (2026-08-03): both are
written in the second person for the patient and neither touches a patient
record. Profiling stays — it is where a clinician enters a patient's profile and
constraints, and the closed loop starts there.

`src/components/RequireRole.tsx` guards the three routes with **no** clinician
branch: /dosage, /info, /license (patient-only; doctors redirect to /dashboard).
Deliberately NOT guarded, because they render per role and guarding them would
delete working features:

- `/` — Index renders DOCTOR_ACTIONS ("Clinical tools") for doctors. This *is*
  the doctor home, and NAV_DOCTOR now links it.
- `/dashboard` — patients see "My treatment record" with their approved/pending
  recommendations, and FeedbackPage sends a patient here after submitting.
- `/feedback` — clinicians get the patient-review tab, which is in DOCTOR_ACTIONS.
- `/patient-input` — doctors create patients; patients edit their own profile.

The guard takes one allowed role and redirects. There is no permission model and
there should not be one in this prototype.

## Operational gotchas

- Supabase built-in mailer ≈ 2 emails/hour → signups with "Confirm email" ON
  hit `email rate limit exceeded` fast. For demos: disable Confirm email
  (Authentication → Sign In / Providers → Email) or create users in the
  dashboard with "Auto Confirm User". The login code handles both modes.
- `strain_conditions` had RLS enabled with no policies → anon reads returned
  empty *silently*. RLS is now disabled on it. If a table "has data but the app
  sees none", suspect RLS first.
- RLS is effectively open across the DB (anon can read/write). Fine for the
  prototype; the report should describe this honestly as a prototype limitation.
- Linux/Vercel is case-sensitive: filename case mismatches build fine locally
  on Windows and fail silently on Vercel.
- Vite/PostCSS: CSS `@import` must precede `@tailwind` directives; Google Fonts
  belong in `index.html` as `<link>`, not CSS imports.

## State (as of 2026-08-03)

Done: closed recommendation loop (generate → persist pending → doctor
approve/reject), real Auth, per-user data persistence, accessibility widget,
constraint safety, profile upsert (no more orphan patients), session survival
across refresh, evidence engine live (strain_conditions seeded), Recommendations
page redesigned, dead component files removed.

Done 2026-08-03 (second session):
- Minimal role guards (`RequireRole`) on /dosage, /info, /license; doctor home
  linked from NAV_DOCTOR. See Roles for what is deliberately unguarded.
- Notification bell fixed and put under test — it had never worked: both
  reads dropped `error`, it fetched once per mount so a cross-session approval
  needed a reload, and read state died on refresh. Now refetches on open, with
  read state in `localStorage` (`mc_notif_read`).
- Every Supabase read routed through `src/lib/supabaseRead.ts` (27 call sites);
  user-visible empty states that could be failures now render `<LoadError>`.
  RecommendationsPage no longer falls back to a seeded stranger's profile when
  the own-profile read *fails*, and a failed constraints read blocks
  recommendation instead of scoring against unconfirmed limits.
- Dashboard and Feedback restyled in the clinical language; the approve/reject
  and feedback-submit flows were left untouched.
- Doctor nav scoped to clinician tools; dosage page no longer claims its caps
  pre-fill clinical_constraints (they never did).
- README rewritten around the algorithm with verified line links.
- bun.lock / bun.lockb deleted; npm is the single lockfile.

Done 2026-08-03 (third session):
- Login and the strain catalogue restyled in the clinical language. Shell only:
  every auth path (validate, signUp, signInWithPassword, ensureUserRecords, both
  demo reads) and the catalogue's filter/sort/count useMemos are unchanged. See
  Design language for the two colour fixes and the one deletion.
- The catalogue's four range inputs gained aria-labels; they had none.

Next candidates:
1. Roll the clinical design language onto Info Centre, then Index — the last two
   (Recommendations, Dashboard, Feedback, Login and Catalog are done). Shell
   only — the flows in these pages are working and should not be refactored.
2. Real RLS policies per `auth.uid()` (requires deciding doctor identity — the
   demo clinician has no Auth account).
3. Role-guard the routes, and decide the doctor home (see Roles above).
4. Report gaps (ספר הפרויקט): real screenshots (exist in repo history),
   STR test-result tables, Gantt, poster, bibliography completion. Take
   screenshots *after* the remaining pages are restyled, not before.

## Testing

- `npx tsc --noEmit` and `npx vite build` must pass before pushing to `main`
  (main auto-deploys).
- Headless E2E pattern used here: build, serve `dist/` with an SPA-fallback
  static server, drive with Playwright (`--ignore-certificate-errors` needed
  behind some proxies), assert on DOM text — not on screenshots.
