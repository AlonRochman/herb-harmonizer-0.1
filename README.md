# MediCanna Health — Medical Cannabis Clinical Decision Support System (CDSS)

**Final-year capstone project — Industrial Engineering & Management, Afeka College of Engineering**
Team: Matan Tzeig, Alon Rochman, Alon Bahlul · Advisor: Tamar Brillant

MediCanna Health is a full-stack web application that helps match medical cannabis patients to the most suitable strains, based on medical conditions, clinical constraints (THC max / CBD min), demographics, and accumulated patient feedback. The system produces ranked, **explainable** recommendations and supports a closed feedback loop: patient input → recommendation → usage logging → feedback → improved future scoring.

**Live demo:** deployed on Vercel · **Stack:** React (Vite + TypeScript), Tailwind CSS, shadcn/ui, Supabase (PostgreSQL)

---

## 🔑 Key Code Sections

> The links below point to the central algorithms and components of the system, with a short explanation of each one's role and importance.

### 1. Recommendation Engine (ליבת המערכת — מנוע ההמלצות)

| Code | Role & Importance |
|---|---|
| [`scoreStrains()`](src/lib/recommendationEngine.ts#L165) | **The core matching algorithm.** Scores every strain against the patient profile using weighted rules: evidence-rated condition matching, strain category (indica/sativa/hybrid), terpene–condition bonuses, high-CBD bonus, age-based THC safety penalty, and a feedback boost. Returns a ranked list with human-readable reasons — this is what makes the system *explainable*. |
| [`EVIDENCE_BONUS`](src/lib/recommendationEngine.ts#L114) | Weight table mapping clinical evidence levels (`strong` / `moderate` / `anecdotal`) from the `strain_conditions` pivot table to score points. Ensures strains with stronger clinical backing rank higher. |
| [`fetchConditionIndex()`](src/lib/recommendationEngine.ts#L33) | Builds an in-memory index from the `strain_conditions` table (strain → conditions, primary indication, evidence level). Primary, data-driven source for condition matching (with a legacy `medical_uses` fallback inside `scoreStrains`). |
| [`fetchFeedbackIndex()`](src/lib/recommendationEngine.ts#L61) | Aggregates real patient feedback per strain via a live DB join (`usage_records` → `feedback`): average effectiveness, report count, and side-effect rate. This is the system's **learning-from-data** component. |
| [`feedbackBonus()`](src/lib/recommendationEngine.ts#L151) | Converts aggregated feedback into a confidence-weighted score adjustment (small samples get proportionally less influence; a high side-effect rate applies a penalty). Prevents a single review from dominating the ranking. |
| [`TERPENE_BONUS`](src/lib/recommendationEngine.ts#L118) | Rule table mapping condition ↔ terpene pairs (e.g., anxiety ↔ linalool) to bonus points, based on the literature review in the project report. |

### 2. Recommendation Flow (זרימת ההמלצה מקצה לקצה)

| Code | Role & Importance |
|---|---|
| [`RecommendationsPage.tsx` — orchestration](src/pages/RecommendationsPage.tsx#L681) | End-to-end pipeline: loads strains + feedback index + condition index in parallel, applies the **hard clinical filter** (THC max / CBD min, [line 692](src/pages/RecommendationsPage.tsx#L692)), runs `scoreStrains`, then selects the **Top-3** results ([line 699](src/pages/RecommendationsPage.tsx#L699)) and renders each with its match score and reasoning. |
| [`PatientInputPage.tsx` — clinical constraints](src/pages/PatientInputPage.tsx#L205) | Structured medical intake form. Validates and persists the patient profile and clinical constraints (`thc_max`, `cbd_min`, contraindications) to Supabase — the safety boundary the engine must never violate. |

### 3. Data Layer (שכבת הנתונים)

| Code | Role & Importance |
|---|---|
| [`supabaseClient.ts`](src/lib/supabaseClient.ts) | Single configured Supabase client used across the app (auth + PostgreSQL access). |
| [`types/database.ts`](src/types/database.ts) | TypeScript definitions mirroring the DB schema (patients, patient_profiles, clinical_constraints, strains, usage_records, feedback, recommendations, doctors, medical_licenses) — keeps queries type-safe and consistent with the ERD in the project report. |
| [`context/AppContext.tsx`](src/context/AppContext.tsx) | Global app state (current patient, constraints, session) shared across the patient flow. |

### 4. Clinical & Supporting Features (רכיבים קליניים תומכים)

| Code | Role & Importance |
|---|---|
| [`useIsDoctor.ts`](src/hooks/useIsDoctor.ts) | Role detection hook — separates the physician workflow (verification, oversight) from the patient workflow. |
| [`LicenseVerificationPage.tsx`](src/pages/LicenseVerificationPage.tsx) | Verifies physician licenses against the `doctors` / `medical_licenses` tables — part of the regulatory/trust layer. |
| [`Treatmentreportbutton`](src/components/Treatmentreportbutton) | Generates a printable/PDF treatment summary (recommendation + usage + feedback) for the patient to share with their physician, including a medical disclaimer. |
| [`Strainreviews`](src/components/Strainreviews) | Displays per-strain patient reviews and effectiveness scores pulled from real feedback data. |
| [`Pharmacylocator`](src/components/Pharmacylocator) | Helps patients locate licensed pharmacies stocking the recommended strain. |
| [`DosageCalculatorPage.tsx`](src/pages/DosageCalculatorPage.tsx) | Supplementary dosage guidance tool based on patient parameters. |

---

## 🧠 How the Algorithm Works (summary)

1. **Hard filtering** — strains violating the patient's clinical constraints (THC max / CBD min) are removed before scoring.
2. **Rule-based scoring** — each remaining strain accumulates points from: condition match weighted by clinical **evidence level**, category fit, terpene profile, high-CBD relevance, and age safety adjustments.
3. **Feedback learning** — aggregated effectiveness ratings and side-effect rates from real usage records adjust the score with confidence weighting.
4. **Explainable output** — the Top-3 strains are returned with a 0–98 match score and up to 4 plain-language reasons per recommendation.

## 🚀 Running Locally

```bash
npm install
npm run dev
```

Requires a `.env` file with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

```bash
npm run build     # production build (Vite)
npm run test      # unit tests (Vitest)
```

## 📁 Project Structure

```
src/
├── lib/recommendationEngine.ts   # core scoring & matching algorithm
├── pages/                        # Patient input, Recommendations, Dashboard, Feedback, Login, ...
├── components/                   # Navbar, StrainReviews, PharmacyLocator, TreatmentReportButton, ui/
├── context/AppContext.tsx        # global state
├── hooks/                        # useIsDoctor, use-toast, use-mobile
└── types/database.ts             # DB schema types
```

---

*This system is a decision-support tool only and does not replace professional medical judgment.*
