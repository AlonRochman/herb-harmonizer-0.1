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
- `src/pages/RecommendationsPage.tsx` — computes top-3, persists them, enforces
  constraints. Shows the rule sum via `ScoreBadge`; the % match ring it replaced
  is not coming back (see Design language).
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

## Design language (reverted 2026-08-03 — read this before restyling anything)

**The product uses the original emerald/slate + shadcn look. Do not reintroduce
the "clinical instrument" language.** It was rolled across the whole app and
then rolled back on the same day, at the user's request: the verdict was that it
read as generic, and was less legible and less pleasant to use than what it
replaced. Trust that verdict over the arguments in the commit messages — the
reasoning was self-consistent and still lost to how it actually felt.

The clinical tokens (`ink`, `paper`, `rule`, `resin`, `clinic`, `flag`) and
`font-data` are still declared in `tailwind.config.ts`. Nothing references them
now. Leave them or delete them, but do not treat their presence as intent.

What the current look is: white `rounded-xl`/`rounded-2xl` cards on `bg-slate-50`,
slate text ramp, emerald as the primary accent, per-feature accent hues (amber
THC / teal CBD chips, purple-amber-teal strain categories, coloured terpene and
notification tiles), shadcn `Card`/`Button`/`Input` used as-is.

Three things were **not** restored with it, deliberately, because they were
content or correctness problems rather than styling:

- **The catalogue's five-star rating.** Score and review count were both
  `Math.random()`, rerolled on every filter change. If a rating belongs there,
  build it from `AVG(feedback.effectiveness_score)`.
- **The % match ring on Recommendations.** `matchScore` is a clamped sum of rule
  weights, not a probability; "84% match" claimed a confidence the engine cannot
  back. The number is still shown in the same slot, labelled "rule sum".
  `ScoreBadge` in RecommendationsPage.tsx.
- **The Index storefront.** The marketing hero copy, the Flower/Oils/Joints/Mini
  tiles and the Popular/Price-drops/New-arrivals chips are gone. Their links
  were already broken — the tiles passed `/strains?cat=`, which the catalogue
  never reads, and the chips searched for words matching no strain. The emerald
  hero styling and the search box that does work were kept.

The Info Centre's engine documentation was also corrected and kept corrected
(rule-sum FAQ, real point values, feedback scoped to the one patient). See the
Testing section — that page is the thing most likely to go stale.

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

Done 2026-08-03 (fourth session) — the restyle rollout, SINCE REVERTED.
Kept here only for what it found; the styling described below is gone:
- App shell + Navbar + LoadError + AccessibilityWidget on the tokens. This was
  the actual reason the restyled pages looked like a different product.
- PatientInput, Dosage, Licence and Info Centre restyled. Every flow is
  untouched: the profile upsert, calculate(), validateIsraeliId and the
  constraints upsert are byte-identical.
- **Index was rebuilt, not restyled.** It was a storefront — marketing hero
  ("Online ordering"), Flower/Oils/Joints/Mini tiles, "Price drops / New
  arrivals" chips, a price-comparison feature strip and a "Subscribe to
  updates" CTA. None of it exists in this system. It is now masthead +
  formulary search + the role tool grid. The removed navigation was already
  broken: the tiles passed `/strains?cat=`, which the catalogue never reads,
  and the chips searched for the literal words "popular"/"price"/"new".
- **Info Centre content was corrected against the engine**, not just recoloured.
  It documented the deleted % match ring as a live feature ("70–98% Excellent"),
  quoted point values that do not exist (+50 condition, +15 terpene; really
  60/40/20 by evidence grade and 12), and claimed the engine surfaces strains
  that worked for *similar patients* — the feedback index is scoped to the one
  patient. If the engine's weights change, that FAQ is the thing that goes stale.

Done 2026-08-03 (fifth session) — the restyle was reverted:
- Every page and shared component is back on the original emerald/shadcn look,
  including Recommendations, Dashboard and Feedback from the earlier sessions.
  See Design language for why, and for the three things that stayed removed.
- The revert was styling-only. Nothing regressed: every Postgrest read still
  goes through read()/readOr(), <LoadError> is still rendered where an empty
  state could be a failure, the bell tests still pass, and every aria-label
  added during the restyle was kept.
- Recommendations was the one page needing a hand-merge: its restyle landed
  *before* the read-helper commit, so no single commit had both the old design
  and that QA. Markup from 149aac5, read-helper logic re-applied on top, routed
  through the page's own `constraintWarning` state instead of the `blocked`
  state the restyle had introduced.

Lesson worth keeping: a design argument that reads well in a commit message is
not evidence the result is pleasant to use. Roll a visual language onto ONE page
and get a verdict before spending sessions on the other ten.

Next candidates:
1. Leave the visual design alone unless asked. If a restyle is revisited, do one
   page and stop for a verdict (see Design language).
2. Real RLS policies per `auth.uid()` (requires deciding doctor identity — the
   demo clinician has no Auth account).
3. Role-guard the routes, and decide the doctor home (see Roles above).
4. Report gaps (ספר הפרויקט): real screenshots (exist in repo history),
   STR test-result tables, Gantt, poster, bibliography completion. The UI is
   settled now, so screenshots can be taken.

## Testing

- `npx tsc --noEmit` and `npx vite build` must pass before pushing to `main`
  (main auto-deploys).
- Headless E2E pattern used here: build, serve `dist/` with an SPA-fallback
  static server, drive with Playwright (`--ignore-certificate-errors` needed
  behind some proxies), assert on DOM text — not on screenshots.
