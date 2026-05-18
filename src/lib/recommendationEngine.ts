import { supabase } from "@/lib/supabaseClient";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StrainRow {
  id: string;
  name: string;
  thc_level: number;
  cbd_level: number;
  terpenes_profile: string | null;
  terpenes: string | null;
  producer: string | null;
  category: string | null;
  medical_uses: unknown;
}

export interface ScoredStrain extends StrainRow {
  matchScore: number;
  reasons: string[];
  // Feedback-derived fields — null means no data yet
  avgEffectiveness: number | null;
  feedbackCount: number;
  sideEffectRate: number | null; // 0–1 fraction of reports with side effects
}

// ─── Feedback intelligence ────────────────────────────────────────────────────

/**
 * Fetches aggregated feedback for every strain, restricted to patients
 * whose medical_conditions match the current patient's condition.
 *
 * Join path:
 *   feedback.usage_id → usage_records.id
 *   usage_records.strain_id → (strain filter)
 *   usage_records.patient_id → patient_profiles.patient_id
 *   patient_profiles.medical_conditions → condition filter
 *
 * Returns a map of strain_id → { avgScore, count, sideEffectRate }
 */
export async function fetchFeedbackIndex(
  condition: string
): Promise<Map<string, { avgScore: number; count: number; sideEffectRate: number }>> {
  const index = new Map<string, { avgScore: number; count: number; sideEffectRate: number }>();

  if (!condition.trim()) return index;

  try {
    // 1. Find patient_ids with the same (or similar) medical condition
    //    We use ilike for partial matching (e.g. "chronic pain" matches "pain")
    const { data: matchingProfiles, error: profileError } = await supabase
      .from("patient_profiles")
      .select("patient_id, medical_conditions")
      .ilike("medical_conditions", `%${condition}%`);

    if (profileError || !matchingProfiles || matchingProfiles.length === 0) {
      return index;
    }

    const patientIds = matchingProfiles.map((p) => p.patient_id);

    // 2. Fetch all usage_records for those patients, with embedded feedback
    const { data: usageRows, error: usageError } = await supabase
      .from("usage_records")
      .select(`
        id,
        strain_id,
        patient_id,
        feedback ( effectiveness_score, side_effects )
      `)
      .in("patient_id", patientIds);

    if (usageError || !usageRows) return index;

    // 3. Aggregate per strain_id
    const accumulator = new Map<
      string,
      { scores: number[]; sideEffectCount: number; total: number }
    >();

    for (const usage of usageRows) {
      const strainId = usage.strain_id as string;
      if (!strainId) continue;

      // feedback can be an array (Supabase returns [] if no rows)
      const feedbackRows = Array.isArray(usage.feedback)
        ? usage.feedback
        : usage.feedback
        ? [usage.feedback]
        : [];

      for (const fb of feedbackRows) {
        if (fb.effectiveness_score == null) continue;

        if (!accumulator.has(strainId)) {
          accumulator.set(strainId, { scores: [], sideEffectCount: 0, total: 0 });
        }

        const acc = accumulator.get(strainId)!;
        acc.scores.push(fb.effectiveness_score as number);
        acc.total += 1;

        // Side effects: treat anything that isn't "None" / empty as a side effect
        const se = (fb.side_effects as string ?? "").toLowerCase().trim();
        if (se && se !== "none" && se !== "no" && se !== "אין") {
          acc.sideEffectCount += 1;
        }
      }
    }

    // 4. Convert to the final map
    for (const [strainId, acc] of accumulator.entries()) {
      if (acc.scores.length === 0) continue;
      const avgScore =
        acc.scores.reduce((sum, s) => sum + s, 0) / acc.scores.length;
      index.set(strainId, {
        avgScore,
        count: acc.total,
        sideEffectRate: acc.total > 0 ? acc.sideEffectCount / acc.total : 0,
      });
    }
  } catch (err) {
    // Never crash the page — just return an empty index
    console.error("[FeedbackIndex] fetch error:", err);
  }

  return index;
}

// ─── Scoring helpers ──────────────────────────────────────────────────────────

const toStr = (val: unknown): string => {
  if (!val) return "";
  if (Array.isArray(val)) return val.join(" ").toLowerCase();
  if (typeof val === "string") {
    try {
      const p = JSON.parse(val);
      if (Array.isArray(p)) return p.join(" ").toLowerCase();
    } catch {}
    return val.toLowerCase();
  }
  return JSON.stringify(val).toLowerCase();
};

// ─── Feedback score → bonus points ───────────────────────────────────────────
//
// Scale: effectiveness_score is 1–5 (from DB).
// We convert avg into a bonus of -20 … +30 points:
//
//   avg ≥ 4.5  → +30   (outstanding)
//   avg ≥ 4.0  → +22   (great)
//   avg ≥ 3.5  → +15   (good)
//   avg ≥ 3.0  → +8    (moderate)
//   avg ≥ 2.5  → +0    (neutral)
//   avg < 2.5  → -10   (poor — mild penalty)
//
// An extra -10 penalty if sideEffectRate > 50 %.
// A confidence multiplier scales the bonus when count < 5 (few data points).

function feedbackBonus(
  avgScore: number,
  count: number,
  sideEffectRate: number
): { points: number; label: string } {
  // Raw bonus by average
  let raw: number;
  let label: string;

  if (avgScore >= 4.5) { raw = 30; label = `Highly effective (avg ${avgScore.toFixed(1)}/5, ${count} reports)`; }
  else if (avgScore >= 4.0) { raw = 22; label = `Very effective (avg ${avgScore.toFixed(1)}/5, ${count} reports)`; }
  else if (avgScore >= 3.5) { raw = 15; label = `Effective (avg ${avgScore.toFixed(1)}/5, ${count} reports)`; }
  else if (avgScore >= 3.0) { raw =  8; label = `Moderately effective (avg ${avgScore.toFixed(1)}/5, ${count} reports)`; }
  else if (avgScore >= 2.5) { raw =  0; label = `Mixed results (avg ${avgScore.toFixed(1)}/5, ${count} reports)`; }
  else { raw = -10; label = `Low efficacy reported (avg ${avgScore.toFixed(1)}/5, ${count} reports)`; }

  // Confidence scaling — fewer than 5 reports → reduce bonus proportionally
  const confidence = Math.min(count / 5, 1); // 0..1
  const points = Math.round(raw * confidence);

  // Side-effect penalty
  const sePenalty = sideEffectRate > 0.5 ? -10 : 0;

  return { points: points + sePenalty, label };
}

// ─── Main scoring function ────────────────────────────────────────────────────

export function scoreStrains(
  strains: StrainRow[],
  conditions: string,
  age: number,
  thcMax: number | null,
  cbdMin: number | null,
  feedbackIndex: Map<string, { avgScore: number; count: number; sideEffectRate: number }>
): ScoredStrain[] {
  const conditionMap: [string, string[]][] = [
    ["pain",         ["pain"]],
    ["chronic pain", ["pain", "severe pain", "mild pain"]],
    ["insomnia",     ["insomnia", "sleep"]],
    ["anxiety",      ["anxiety", "stress"]],
    ["inflammation", ["inflammation"]],
    ["depression",   ["depression", "mood"]],
    ["nausea",       ["nausea"]],
    ["ptsd",         ["ptsd", "stress", "anxiety"]],
    ["epilepsy",     ["seizures", "epilepsy"]],
    ["fibromyalgia", ["pain", "inflammation"]],
    ["fatigue",      ["fatigue", "focus"]],
    ["appetite",     ["appetite loss"]],
  ];

  const terpeneBonus: [string, string, string][] = [
    ["pain",         "myrcene",       "Terpene: Myrcene — analgesic"],
    ["anxiety",      "linalool",      "Terpene: Linalool — anxiolytic"],
    ["insomnia",     "myrcene",       "Terpene: Myrcene — sedative"],
    ["inflammation", "caryophyllene", "Terpene: Caryophyllene — anti-inflammatory"],
    ["depression",   "limonene",      "Terpene: Limonene — mood-elevating"],
    ["ptsd",         "pinene",        "Terpene: Pinene — promotes alertness"],
  ];

  return strains.map((strain) => {
    let score = 0;
    const reasons: string[] = [];

    const medUses  = toStr(strain.medical_uses);
    const terpenes = toStr(strain.terpenes) || toStr(strain.terpenes_profile);
    const cat      = (strain.category ?? "").toLowerCase();

    // ── Step A: condition → medical_uses match (+50) ──────────────────────
    for (const [userCond, keywords] of conditionMap) {
      if (conditions.includes(userCond)) {
        for (const kw of keywords) {
          if (medUses.includes(kw)) {
            score += 50;
            reasons.push(`Matched for ${userCond}`);
            break;
          }
        }
      }
    }

    // ── Step B: category bonus (+15–20) ───────────────────────────────────
    if ((conditions.includes("pain") || conditions.includes("insomnia") || conditions.includes("ptsd")) && cat === "indica") {
      score += 20; reasons.push("Indica — supports relaxation & sleep");
    }
    if ((conditions.includes("depression") || conditions.includes("fatigue")) && cat === "sativa") {
      score += 20; reasons.push("Sativa — supports mood & energy");
    }
    if (conditions.includes("anxiety") && cat === "hybrid") {
      score += 15; reasons.push("Hybrid — balanced profile for anxiety");
    }

    // ── Step C: terpene bonus (+15 each) ─────────────────────────────────
    for (const [cond, terp, label] of terpeneBonus) {
      if (conditions.includes(cond) && terpenes.includes(terp)) {
        score += 15; reasons.push(label);
      }
    }

    // ── Step D: high CBD for specific conditions (+10) ────────────────────
    if (
      (conditions.includes("inflammation") ||
        conditions.includes("anxiety") ||
        conditions.includes("epilepsy")) &&
      strain.cbd_level > 5
    ) {
      score += 10;
      reasons.push("High CBD — reduced psychoactive burden");
    }

    // ── Step E: age safety adjustment ────────────────────────────────────
    if (age > 60 && strain.thc_level > 20) {
      score -= 15;
    }

    // ── Step F: fallback for zero-score strains ───────────────────────────
    if (score === 0 && (terpenes || cat)) {
      if (conditions.includes("pain") && (terpenes.includes("myrcene") || cat === "indica")) {
        score += 25; reasons.push("Terpene/category profile aligns with pain relief");
      }
      if (conditions.includes("anxiety") && (terpenes.includes("linalool") || cat === "hybrid")) {
        score += 25; reasons.push("Terpene/category profile aligns with anxiety relief");
      }
      if (conditions.includes("insomnia") && cat === "indica") {
        score += 25; reasons.push("Indica category supports sleep");
      }
    }

    // ── Step G: REAL FEEDBACK BOOST (replaces randomBoost) ───────────────
    const fbData = feedbackIndex.get(strain.id);
    let avgEffectiveness: number | null = null;
    let feedbackCount = 0;
    let sideEffectRate: number | null = null;

    if (fbData) {
      avgEffectiveness = fbData.avgScore;
      feedbackCount    = fbData.count;
      sideEffectRate   = fbData.sideEffectRate;

      const { points, label } = feedbackBonus(
        fbData.avgScore,
        fbData.count,
        fbData.sideEffectRate
      );

      if (points !== 0) {
        score += points;
        reasons.push(label);
      }
    }

    // ── Step H: constraint satisfaction micro-bonus (+5 each) ─────────────
    if (thcMax !== null && strain.thc_level <= thcMax) score += 5;
    if (cbdMin !== null && strain.cbd_level >= cbdMin) score += 5;

    return {
      ...strain,
      matchScore: Math.min(Math.max(Math.round(score), 0), 98),
      reasons: reasons.slice(0, 4),
      avgEffectiveness,
      feedbackCount,
      sideEffectRate,
    };
  });
}
