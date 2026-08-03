# MediCanna Health — Medical Cannabis Clinical Decision Support System (CDSS)

**Final-year capstone project — Industrial Engineering & Management, Afeka College of Engineering**
Team: Matan Tzeig, Alon Rochman, Alon Bahlul · Advisor: Tamar Brillant

MediCanna Health matches medical cannabis patients to suitable strains from their
medical condition, licensed clinical constraints (THC max / CBD min), age, and
accumulated patient feedback. Every recommendation is **explainable**: the engine
is a transparent rule sum, not a model, and each result carries the specific
reasons that produced it.

The system closes a loop: profile → recommendation → doctor review → usage log →
feedback → better scoring next time.

**Stack:** React 18 + TypeScript (Vite), Tailwind CSS, shadcn/ui, Supabase
(PostgreSQL + Auth) · **Deploy:** Vercel, auto-deploys from `main`

> Decision-support only. This system does not replace professional medical judgment.

---

## 🚀 Running locally

```bash
npm install
npm run dev          # http://localhost:8080
```

**No `.env` is needed.** The Supabase project URL and publishable anon key are
committed in [supabaseClient.ts](src/lib/supabaseClient.ts) — acceptable for this
prototype because the key is the public anon key and the schema holds only
fabricated data. A production deployment would move both to environment
variables and add real RLS policies (see **Known limitations** below).

```bash
npm run build        # production build (Vite)
npm run lint         # ESLint
npm test             # unit tests (Vitest)
npx tsc --noEmit     # type check — must pass before pushing to main
```

`main` auto-deploys to Vercel, so `npx tsc --noEmit` and `npm run build` must
both be clean before you push.

---

## 🧠 The recommendation algorithm — full walkthrough

This is the heart of the project. The engine lives in one file,
[src/lib/recommendationEngine.ts](src/lib/recommendationEngine.ts), and is
deliberately a **rule-based additive score** — no machine learning, no black box.
Every point added to a strain's total is traceable to a named rule, and the rules
that fired become the sentence the patient reads.

### Stage 0 — Inputs

[`scoreStrains()`](src/lib/recommendationEngine.ts#L175-L183) is a pure function.
It receives:

| Input | Source | Meaning |
|---|---|---|
| `strains` | `strains` table, already filtered (Stage 1) | the candidate pool |
| `conditions` | `patient_profiles.medical_conditions`, lower-cased | free-text indication, e.g. `"chronic pain"` |
| `age` | `patient_profiles.age` (default 40) | drives the safety penalty in group F |
| `thcMax`, `cbdMin` | `clinical_constraints` | the licensed window |
| `feedbackIndex` | [`fetchFeedbackIndex()`](src/lib/recommendationEngine.ts#L62-L120) | per-strain aggregate of real patient ratings |
| `conditionIndex` | [`fetchConditionIndex()`](src/lib/recommendationEngine.ts#L34-L58) | per-strain indications + evidence level |

Being pure matters: the scoring logic is testable without a database, and the two
indices are built by separate async functions so a failure in either degrades the
score rather than breaking the page.

### Stage 1 — Hard clinical filter (the safety gate)

Before any scoring, strains outside the patient's licensed window are removed in
[RecommendationsPage.tsx](src/pages/RecommendationsPage.tsx#L742-L746):

```ts
const pool = strains.filter((s) => {
  if (tMax !== null && s.thc_level > tMax) return false;   // over the THC ceiling
  if (cMin !== null && s.cbd_level < cMin) return false;   // under the CBD floor
  return true;
});
```

This is a filter, not a penalty — an over-limit strain cannot be rescued by
scoring well elsewhere. If the filter empties the pool, the system says so and
**refuses to widen it**
([lines 748-755](src/pages/RecommendationsPage.tsx#L748-L755)); it never falls
back to recommending something outside the licence.

### Stage 2 — The scoring formula

Each surviving strain starts at `score = 0` and accumulates points from eight
independent rule groups, labelled **A–H** in the source. The total is a plain sum:

```
score(strain) = A + B + C + D + E + F + G + H
```

| Group | Rule | Points | Source |
|---|---|---|---|
| **A** | Evidence-rated indication match via the `strain_conditions` pivot table. Stops at the **first** matching condition. | `strong` **+60**, `moderate` **+40**, `anecdotal` **+20** | [L190-L223](src/lib/recommendationEngine.ts#L190-L223), weights at [L124-L126](src/lib/recommendationEngine.ts#L124-L126) |
| **B** | Legacy fallback against the older `strains.medical_uses` JSON. Runs **only if A found nothing**, and may fire more than once. | **+40** per matched condition group | [L225-L250](src/lib/recommendationEngine.ts#L225-L250) |
| **C** | Category fit: pain/insomnia/PTSD ↔ indica, depression/fatigue ↔ sativa, anxiety ↔ hybrid. | **+18** / **+18** / **+14** | [L252-L261](src/lib/recommendationEngine.ts#L252-L261) |
| **D** | Terpene–condition pairs (myrcene↔pain, linalool↔anxiety, …). Cumulative — several can fire. | **+12** each | [L263-L268](src/lib/recommendationEngine.ts#L263-L268), table at [L128-L137](src/lib/recommendationEngine.ts#L128-L137) |
| **E** | High-CBD relevance: inflammation/anxiety/epilepsy **and** `cbd_level > 5`. | **+10** | [L270-L273](src/lib/recommendationEngine.ts#L270-L273) |
| **F** | Age safety: `age > 60` **and** `thc_level > 20`. The only geriatric adjustment. | **−15** | [L275-L276](src/lib/recommendationEngine.ts#L275-L276) |
| **G** | Feedback boost from real patient ratings, confidence-weighted. | **−20 … +30** | [L278-L290](src/lib/recommendationEngine.ts#L278-L290), maths at [L161-L171](src/lib/recommendationEngine.ts#L161-L171) |
| **H** | Constraint micro-bonus: rewards sitting comfortably inside the licensed window. | **+5** THC, **+5** CBD | [L292-L294](src/lib/recommendationEngine.ts#L292-L294) |

#### Group A in detail — why evidence level dominates

Group A is intentionally the heaviest term. A `strong`-evidence indication (+60)
outweighs every stylistic signal combined: for a single indication, groups C, D
and E can contribute at most **+36** together (the anxiety case: hybrid +14,
linalool +12, high-CBD +10). A strain backed by clinical evidence therefore
cannot be displaced by category and terpene coincidences alone. The evidence level comes from the `strain_conditions`
table (39 seeded rows, seed at
[supabase/seed_strain_conditions.sql](supabase/seed_strain_conditions.sql)) and is
indexed once per page load rather than per strain.

Matching is deliberately forgiving — exact substring, first-word prefix (≥ 4
chars), plus an explicit synonym list so `"epilepsy"` also matches a strain
indicated for `"seizures"`. One guard matters more than the rest
([L194-L196](src/lib/recommendationEngine.ts#L194-L196)):

```ts
// `"x".includes("")` is always true — an empty profile must never match everything
const condTrimmed = conditions.trim();
```

Without it, a patient with no recorded condition matched *every* strain at full
evidence weight. That was a real bug in this codebase.

#### Group G in detail — the learning component

This is the only part of the score that changes as the system is used.
[`fetchFeedbackIndex()`](src/lib/recommendationEngine.ts#L62-L120) finds all
patients whose profile mentions the same condition, joins their `usage_records`
to their `feedback`, and aggregates per strain: mean effectiveness, report count,
and side-effect rate. [`feedbackBonus()`](src/lib/recommendationEngine.ts#L161-L171)
then converts that into points:

```
raw        = 30 if avg ≥ 4.5 | 22 if ≥ 4.0 | 15 if ≥ 3.5 | 8 if ≥ 3.0 | 0 if ≥ 2.5 | −10 otherwise
confidence = min(count / 5, 1)
points     = round(raw × confidence)  +  (−10 if sideEffectRate > 0.5)
```

The `confidence` factor is the important detail: a single glowing review carries
one fifth of its nominal weight, and a strain needs five reports before feedback
counts fully. This stops one patient's experience from dominating the ranking —
and it means the engine's behaviour genuinely improves as feedback accumulates,
which is the closed loop the project sets out to demonstrate.

### Stage 3 — Clamp and explanation

[Line 298](src/lib/recommendationEngine.ts#L298):

```ts
matchScore: Math.min(Math.max(Math.round(score), 0), 98),
reasons: reasons.slice(0, 4),
```

The raw sum is clamped to **0–98** and at most four reasons are kept, so the
explanation stays readable. Note what the clamp implies: the sum is **not**
bounded above by design, so a strongly-indicated strain can exceed 98 and be
truncated. This is why the UI labels the figure a **rule sum** rather than a
percentage or a probability — it is an ordering device, not a likelihood. The
percentage ring that once displayed it was deliberately removed for that reason.

### Stage 4 — Rank and cut

[RecommendationsPage.tsx L758-L760](src/pages/RecommendationsPage.tsx#L758-L760):
strains scoring 0 are discarded, the rest sort descending, and the **top 3**
are shown.

### Stage 5 — Persist as pending

[`persistRecommendations()`](src/lib/recommendationEngine.ts#L310-L350) writes the
top set to `recommendations` with `status = 'pending'`. Two properties matter:

- It is **idempotent** — if the same pending set already exists it returns without
  writing ([L316-L328](src/lib/recommendationEngine.ts#L316-L328)), so refreshing
  the page does not churn rows.
- It only ever deletes **pending** rows
  ([L330-L336](src/lib/recommendationEngine.ts#L330-L336)). A recommendation a
  doctor has already approved or rejected is never overwritten by a regeneration.

### Stage 6 — Doctor review closes the loop

The clinician sees the pending queue on the dashboard and approves or rejects
each item, optionally with a clinical note:
[`handleDecision()`](src/pages/DashboardPage.tsx#L367-L389) writes `status`,
`review_note` and `reviewed_at`, then updates local state optimistically
([L382](src/pages/DashboardPage.tsx#L382)) so the queue responds immediately
without a refetch. An approval raises a notification on the patient's side
([NotificationBell](src/components/Navbar.tsx#L100)).

### Worked example

Patient: **chronic pain**, age 45, licence **THC ≤ 20%**, **CBD ≥ 2%**.
Candidate: indica, THC 18%, CBD 3%, myrcene present, `strain_conditions` lists
*chronic pain* as a **primary, strong-evidence** indication, with 3 feedback
reports averaging 4.2/5 and a 20% side-effect rate.

| Group | Fires? | Points | Why |
|---|---|---|---|
| A | ✅ | **+60** | primary indication, `strong` evidence |
| B | — | 0 | skipped, A already matched |
| C | ✅ | **+18** | `"chronic pain"` contains `pain`, category is indica |
| D | ✅ | **+12** | pain ↔ myrcene |
| E | — | 0 | condition is not inflammation/anxiety/epilepsy |
| F | — | 0 | age 45 ≤ 60 |
| G | ✅ | **+13** | `raw = 22` (avg ≥ 4.0) × `confidence = 3/5 = 0.6` → 13.2 → 13; no side-effect penalty (0.2 ≤ 0.5) |
| H | ✅ | **+10** | 18 ≤ 20 (+5) and 3 ≥ 2 (+5) |
| | | **113 → 98** | clamped |

Displayed reasons (first four): *Primary indication: chronic pain (strong
evidence)* · *Indica — supports relaxation & sleep* · *Terpene: Myrcene —
analgesic* · *Very effective (avg 4.2/5, 3 reports)*.

Note that this strain **saturates the clamp**. With only 15 strains seeded that
is uncommon, but it is the clearest illustration of why the number must not be
read as a percentage.

---

## 🔑 Key code sections

> Links point at the exact lines, with what each part does and why it matters.

### 1. Recommendation engine (ליבת המערכת — מנוע ההמלצות)

| Code | Role & importance |
|---|---|
| [`scoreStrains()`](src/lib/recommendationEngine.ts#L175) | The core matching algorithm — the eight rule groups above. Pure function, so it is testable without a database. Returns a ranked list with human-readable reasons, which is what makes the system explainable. |
| [`EVIDENCE_BONUS`](src/lib/recommendationEngine.ts#L124) | Weight table mapping `strong`/`moderate`/`anecdotal` to +60/+40/+20. Sets the deliberate dominance of clinical evidence over stylistic signals. |
| [`TERPENE_BONUS`](src/lib/recommendationEngine.ts#L128) | Eight condition-terpene pairs (+12 each), from the literature review in the project report. |
| [`feedbackBonus()`](src/lib/recommendationEngine.ts#L161) | Converts aggregated feedback into confidence-weighted points, so small samples cannot dominate. |
| [`fetchConditionIndex()`](src/lib/recommendationEngine.ts#L34) | Builds the strain to indication/evidence index from `strain_conditions`. Degrades to group B if the table is unavailable. |
| [`fetchFeedbackIndex()`](src/lib/recommendationEngine.ts#L62) | Aggregates real outcomes per strain across the matching-condition cohort — the learning-from-data component. |
| [`persistRecommendations()`](src/lib/recommendationEngine.ts#L310) | Writes the top set as `pending` for review, idempotently, without ever touching reviewed rows. |

### 2. Recommendation flow (זרימת ההמלצה מקצה לקצה)

| Code | Role & importance |
|---|---|
| [`RecommendationsPage.tsx` orchestration](src/pages/RecommendationsPage.tsx#L742-L765) | The end-to-end pipeline: resolve the patient, load strains, constraints and both indices in parallel, apply the hard filter, score, take the top 3, persist. |
| [`ChemotypeAxis`](src/pages/RecommendationsPage.tsx#L54) | The signature clinical element: places each strain on the real CBD-THC chemotype ratio (Type I/II/III) and shows licence headroom as "X% of Y% ceiling". Computed from actual cannabinoid values ([L30-L48](src/pages/RecommendationsPage.tsx#L30-L48)), not an invented index. |
| [`PatientInputPage.tsx`](src/pages/PatientInputPage.tsx#L231) | Medical intake. Note the `must()` wrapper at [L231](src/pages/PatientInputPage.tsx#L231): Supabase never throws, so every write is unwrapped through `must()`, which does. Silent write failures were a real bug class here. |
| [`DashboardPage.tsx` review queue](src/pages/DashboardPage.tsx#L127) | The clinician approve/reject workflow, with optimistic updates. |

### 3. Data integrity (שלמות הנתונים)

| Code | Role & importance |
|---|---|
| [`supabaseRead.ts`](src/lib/supabaseRead.ts#L25) | `read()` and `readOr()` wrap every Supabase read. Supabase resolves failures as data-null-plus-error rather than throwing, so destructuring only the data silently turns an RLS denial or a dropped connection into an empty result. Every read in the app goes through this helper. |
| [`LoadError`](src/components/LoadError.tsx) | The visible half of the same idea: where a read fails, the UI says so instead of rendering an innocent empty state. |
| [`supabaseClient.ts`](src/lib/supabaseClient.ts) | The single configured client (auth + PostgreSQL). |
| [`types/database.ts`](src/types/database.ts) | TypeScript definitions mirroring the schema, consistent with the ERD in the project report. |
| [`context/AppContext.tsx`](src/context/AppContext.tsx) | Session management. Real Supabase Auth sessions and sessionStorage-backed demo identities coexist; `ensureUserRecords()` creates the `users` and `patients` rows for an auth user on first sign-in. |

### 4. Clinical and supporting features (רכיבים תומכים)

| Code | Role & importance |
|---|---|
| [`useIsDoctor.ts`](src/hooks/useIsDoctor.ts) | Role detection, separating the clinician workflow from the patient workflow. |
| [`NotificationBell`](src/components/Navbar.tsx#L100) | Tells a patient when a recommendation was approved. Notifications are derived from DB state rather than stored; dismissed IDs persist in localStorage keyed by patient ([L70-L97](src/components/Navbar.tsx#L70-L97)). |
| [`LicenseVerificationPage.tsx`](src/pages/LicenseVerificationPage.tsx) | Captures the **patient's** licence and writes the resulting `thc_max` and `cbd_min` into `clinical_constraints` — the boundary Stage 1 enforces. |
| [`DosageCalculatorPage.tsx`](src/pages/DosageCalculatorPage.tsx) | Standalone titration guidance (start dose, onset, duration per consumption method). Guidance only: its suggested caps do **not** feed the engine, which filters against licence-derived constraints. |
| [`AccessibilityWidget.tsx`](src/components/AccessibilityWidget.tsx) | Text size, high contrast and reduced motion, persisted in localStorage and applied as classes on the html element. |
| [`StrainsCatalogPage.tsx`](src/pages/StrainsCatalogPage.tsx) | Browsable catalogue with THC/CBD range filters and sorting. |
| [`InfoCenterPage.tsx`](src/pages/InfoCenterPage.tsx) | Patient education: the Israeli licensing pathway and a lay explanation of the algorithm. |

### Roles

Patients get profile, recommendations, dosage, feedback, catalogue, licence and
info centre. Clinicians get a deliberately narrower set — dashboard, patient
profiling, catalogue, feedback review — defined in
[NAV_DOCTOR](src/components/Navbar.tsx#L30) and mirrored by `DOCTOR_ACTIONS` in
[Index.tsx](src/pages/Index.tsx#L42). The dosage calculator and info centre are
written in the second person for the patient and are not clinician tools.

---

## 🗄️ Database (public schema)

| Table | Notes |
|---|---|
| `users` | For auth users, `id` equals `auth.users.id`. |
| `patients` | `user_id` references `users`. |
| `patient_profiles` | age, gender, medical_conditions, sensitivities, preferences. |
| `clinical_constraints` | `thc_max`, `cbd_min`, contraindications. Raw doubles — always round for display. |
| `strains` | 15 seeded rows: cannabinoid levels, category, terpenes, producer. |
| `strain_conditions` | The evidence pivot: `strain_id`, `condition`, `evidence_level`, `is_primary`. 39 seeded rows. |
| `usage_records` | Logged sessions: dosage, consumption method, date. |
| `feedback` | `effectiveness_score` 1-5, side effects, comments — the input to group G. |
| `recommendations` | Generated set plus review state: `status`, `reviewed_by`, `reviewed_at`, `review_note`. |
| `doctors`, `medical_licenses` | Seeded; not tied to Auth (the demo clinician has no Auth account). |

---

## 🎨 Design language

The recommendations page and dashboard are built as a **clinical instrument**, not
a wellness app. Tokens live in [tailwind.config.ts](tailwind.config.ts#L16-L31):

- `ink` / `paper` / `rule` — the neutral system.
- `resin` **always means THC**, `clinic` **always means CBD**, `flag` means limit
  at risk. Colour carries information, never decoration.
- `font-data` (IBM Plex Mono) is used **only** for clinical data: cannabinoid
  values, evidence grades, ranks.

Rolling these tokens out to the remaining pages (feedback, catalogue, login,
info centre) is an open task.

---

## ⚠️ Known limitations

Stated plainly, because the project report should describe them honestly:

1. **RLS is effectively open.** The anon key can read and write across the schema.
   Real per-user policies are pending a decision on doctor identity — the demo
   clinician has no Auth account.
2. **The score is not a probability.** It is an unbounded rule sum clamped to
   0-98; ties among saturated strains are resolved only by sort order.
3. **Rule weights are literature-informed, not fitted.** No parameter was learned
   from outcomes; group G is the only data-driven term.
4. **The group G cohort is condition-matched, not otherwise controlled.** With
   fabricated data at this scale it demonstrates the mechanism, not efficacy.
5. **All data is fabricated.** No real patient information is present.
6. **Single-region catalogue.** 15 strains, one market.

---

## 📁 Project structure

```
src/
├── lib/
│   ├── recommendationEngine.ts   # the scoring algorithm (groups A-H)
│   ├── supabaseRead.ts           # read helper that surfaces errors
│   └── supabaseClient.ts         # configured client
├── pages/                        # Index, PatientInput, Recommendations, Dashboard,
│                                 # Feedback, StrainsCatalog, DosageCalculator,
│                                 # LicenseVerification, InfoCenter, Login
├── components/                   # Navbar (+ NotificationBell), AccessibilityWidget,
│                                 # LoadError, NavLink, ui/ (shadcn)
├── context/AppContext.tsx        # session + demo identities
├── hooks/                        # useIsDoctor, use-toast, use-mobile
└── types/database.ts             # schema types
supabase/
└── seed_strain_conditions.sql    # evidence pivot seed
```

---

*This system is a decision-support tool only and does not replace professional medical judgment.*
