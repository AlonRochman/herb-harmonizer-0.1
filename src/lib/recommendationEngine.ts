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
  avgEffectiveness: number | null;
  feedbackCount: number;
  sideEffectRate: number | null;
}

export type ConditionIndex = Map<string, {
  conditions: string[];
  primaryCondition: string | null;
  evidenceByCondition: Record<string, "strong" | "moderate" | "anecdotal">;
}>;

// ─── Condition index from strain_conditions table ─────────────────────────────

export async function fetchConditionIndex(): Promise<ConditionIndex> {
  const index: ConditionIndex = new Map();
  try {
    const { data, error } = await supabase
      .from("strain_conditions")
      .select("strain_id, condition, evidence_level, is_primary");

    if (error) {
      console.warn("[ConditionIndex] strain_conditions not available — using legacy fallback");
      return index;
    }

    for (const row of (data ?? [])) {
      const sid = row.strain_id as string;
      if (!index.has(sid)) index.set(sid, { conditions: [], primaryCondition: null, evidenceByCondition: {} });
      const entry = index.get(sid)!;
      entry.conditions.push(row.condition as string);
      entry.evidenceByCondition[row.condition as string] = row.evidence_level as "strong" | "moderate" | "anecdotal";
      if (row.is_primary) entry.primaryCondition = row.condition as string;
    }
  } catch (err) {
    console.error("[ConditionIndex] error:", err);
  }
  return index;
}

// ─── Feedback index ───────────────────────────────────────────────────────────

export async function fetchFeedbackIndex(
  condition: string
): Promise<Map<string, { avgScore: number; count: number; sideEffectRate: number }>> {
  const index = new Map<string, { avgScore: number; count: number; sideEffectRate: number }>();
  if (!condition.trim()) return index;

  try {
    const { data: profiles } = await supabase
      .from("patient_profiles")
      .select("patient_id")
      .ilike("medical_conditions", `%${condition}%`);

    if (!profiles?.length) return index;

    const { data: usageRows } = await supabase
      .from("usage_records")
      .select("id, strain_id, patient_id, feedback ( effectiveness_score, side_effects )")
      .in("patient_id", profiles.map((p) => p.patient_id));

    if (!usageRows) return index;

    const acc = new Map<string, { scores: number[]; sideEffectCount: number; total: number }>();
    for (const usage of usageRows) {
      const sid = usage.strain_id as string;
      if (!sid) continue;
      const fbs = Array.isArray(usage.feedback) ? usage.feedback : usage.feedback ? [usage.feedback] : [];
      for (const fb of fbs) {
        if (fb.effectiveness_score == null) continue;
        if (!acc.has(sid)) acc.set(sid, { scores: [], sideEffectCount: 0, total: 0 });
        const a = acc.get(sid)!;
        a.scores.push(fb.effectiveness_score as number);
        a.total += 1;
        const se = (fb.side_effects as string ?? "").toLowerCase().trim();
        if (se && se !== "none" && se !== "no" && se !== "אין") a.sideEffectCount += 1;
      }
    }

    for (const [sid, a] of acc.entries()) {
      if (!a.scores.length) continue;
      index.set(sid, {
        avgScore: a.scores.reduce((s, x) => s + x, 0) / a.scores.length,
        count: a.total,
        sideEffectRate: a.total > 0 ? a.sideEffectCount / a.total : 0,
      });
    }
  } catch (err) {
    console.error("[FeedbackIndex] error:", err);
  }
  return index;
}

// ─── Scoring constants ────────────────────────────────────────────────────────

const EVIDENCE_BONUS: Record<"strong" | "moderate" | "anecdotal", number> = {
  strong: 60, moderate: 40, anecdotal: 20,
};

const TERPENE_BONUS: [string, string, string][] = [
  ["pain",         "myrcene",       "Terpene: Myrcene — analgesic"],
  ["anxiety",      "linalool",      "Terpene: Linalool — anxiolytic"],
  ["insomnia",     "myrcene",       "Terpene: Myrcene — sedative"],
  ["inflammation", "caryophyllene", "Terpene: Caryophyllene — anti-inflammatory"],
  ["depression",   "limonene",      "Terpene: Limonene — mood-elevating"],
  ["ptsd",         "pinene",        "Terpene: Pinene — promotes alertness"],
  ["fatigue",      "terpinolene",   "Terpene: Terpinolene — energising"],
  ["stress",       "limonene",      "Terpene: Limonene — stress relief"],
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toTerpStr = (val: unknown): string => {
  if (!val) return "";
  if (Array.isArray(val)) return val.join(" ").toLowerCase();
  if (typeof val === "string") {
    try { const p = JSON.parse(val); if (Array.isArray(p)) return p.join(" ").toLowerCase(); } catch {}
    return val.toLowerCase();
  }
  return "";
};

const toLegacyStr = (val: unknown): string => {
  if (!val) return "";
  if (Array.isArray(val)) return val.join(" ").toLowerCase();
  if (typeof val === "string") {
    try { const p = JSON.parse(val); if (Array.isArray(p)) return p.join(" ").toLowerCase(); } catch {}
    return val.toLowerCase();
  }
  return JSON.stringify(val).toLowerCase();
};

function feedbackBonus(avg: number, count: number, seRate: number): { points: number; label: string } {
  let raw: number; let label: string;
  if      (avg >= 4.5) { raw = 30;  label = `Highly effective (avg ${avg.toFixed(1)}/5, ${count} reports)`; }
  else if (avg >= 4.0) { raw = 22;  label = `Very effective (avg ${avg.toFixed(1)}/5, ${count} reports)`; }
  else if (avg >= 3.5) { raw = 15;  label = `Effective (avg ${avg.toFixed(1)}/5, ${count} reports)`; }
  else if (avg >= 3.0) { raw =  8;  label = `Moderately effective (avg ${avg.toFixed(1)}/5, ${count} reports)`; }
  else if (avg >= 2.5) { raw =  0;  label = `Mixed results (avg ${avg.toFixed(1)}/5, ${count} reports)`; }
  else                 { raw = -10; label = `Low efficacy reported (avg ${avg.toFixed(1)}/5, ${count} reports)`; }
  const confidence = Math.min(count / 5, 1);
  return { points: Math.round(raw * confidence) + (seRate > 0.5 ? -10 : 0), label };
}

// ─── Main scoring ─────────────────────────────────────────────────────────────

export function scoreStrains(
  strains: StrainRow[],
  conditions: string,
  age: number,
  thcMax: number | null,
  cbdMin: number | null,
  feedbackIndex: Map<string, { avgScore: number; count: number; sideEffectRate: number }>,
  conditionIndex: ConditionIndex,
): ScoredStrain[] {
  return strains.map((strain) => {
    let score = 0;
    const reasons: string[] = [];
    const terpenes = toTerpStr(strain.terpenes) || toTerpStr(strain.terpenes_profile);
    const cat = (strain.category ?? "").toLowerCase();

    // ── A: strain_conditions table (primary, evidence-rated) ─────────────────
    const scEntry = conditionIndex.get(strain.id);
    let matchedViaTable = false;

    if (scEntry?.conditions.length) {
      for (const dbCond of scEntry.conditions) {
        const d = dbCond.toLowerCase();
        const hit =
          conditions.includes(d) || d.includes(conditions.split(" ")[0]) ||
          (conditions.includes("pain")        && d.includes("pain"))       ||
          (conditions.includes("anxiety")     && d === "anxiety")          ||
          (conditions.includes("insomnia")    && d === "insomnia")         ||
          (conditions.includes("ptsd")        && d === "ptsd")             ||
          (conditions.includes("epilepsy")    && (d === "epilepsy" || d === "seizures")) ||
          (conditions.includes("depression")  && d === "depression")       ||
          (conditions.includes("fatigue")     && d === "fatigue")          ||
          (conditions.includes("inflammation")&& d === "inflammation")     ||
          (conditions.includes("nausea")      && d === "nausea")           ||
          (conditions.includes("stress")      && d === "stress");

        if (hit) {
          const ev = scEntry.evidenceByCondition[dbCond] ?? "anecdotal";
          score += EVIDENCE_BONUS[ev];
          const isPrimary = scEntry.primaryCondition === dbCond;
          reasons.push(`${isPrimary ? "Primary" : "Secondary"} indication: ${dbCond} (${ev} evidence)`);
          matchedViaTable = true;
          break;
        }
      }
    }

    // ── B: legacy medical_uses fallback (if migration not yet run) ───────────
    if (!matchedViaTable) {
      const legacyUses = toLegacyStr(strain.medical_uses);
      const legacyMap: [string, string[]][] = [
        ["pain",         ["pain", "severe pain", "mild pain"]],
        ["chronic pain", ["pain", "severe pain"]],
        ["insomnia",     ["insomnia", "sleep"]],
        ["anxiety",      ["anxiety", "stress"]],
        ["inflammation", ["inflammation"]],
        ["depression",   ["depression", "mood"]],
        ["nausea",       ["nausea"]],
        ["ptsd",         ["ptsd", "stress"]],
        ["epilepsy",     ["seizures", "epilepsy"]],
        ["fatigue",      ["fatigue", "focus"]],
        ["appetite",     ["appetite loss"]],
      ];
      for (const [uc, kws] of legacyMap) {
        if (conditions.includes(uc)) {
          for (const kw of kws) {
            if (legacyUses.includes(kw)) {
              score += 40; reasons.push(`Matched for ${uc}`); break;
            }
          }
        }
      }
    }

    // ── C: category bonus ────────────────────────────────────────────────────
    if ((conditions.includes("pain") || conditions.includes("insomnia") || conditions.includes("ptsd")) && cat === "indica") {
      score += 18; reasons.push("Indica — supports relaxation & sleep");
    }
    if ((conditions.includes("depression") || conditions.includes("fatigue")) && cat === "sativa") {
      score += 18; reasons.push("Sativa — supports mood & energy");
    }
    if (conditions.includes("anxiety") && cat === "hybrid") {
      score += 14; reasons.push("Hybrid — balanced profile for anxiety");
    }

    // ── D: terpene bonus ─────────────────────────────────────────────────────
    for (const [cond, terp, label] of TERPENE_BONUS) {
      if (conditions.includes(cond) && terpenes.includes(terp)) {
        score += 12; reasons.push(label);
      }
    }

    // ── E: high CBD bonus ────────────────────────────────────────────────────
    if ((conditions.includes("inflammation") || conditions.includes("anxiety") || conditions.includes("epilepsy")) && strain.cbd_level > 5) {
      score += 10; reasons.push("High CBD — reduced psychoactive burden");
    }

    // ── F: age safety ────────────────────────────────────────────────────────
    if (age > 60 && strain.thc_level > 20) score -= 15;

    // ── G: feedback boost ────────────────────────────────────────────────────
    const fb = feedbackIndex.get(strain.id);
    let avgEffectiveness: number | null = null;
    let feedbackCount = 0;
    let sideEffectRate: number | null = null;

    if (fb) {
      avgEffectiveness = fb.avgScore;
      feedbackCount    = fb.count;
      sideEffectRate   = fb.sideEffectRate;
      const { points, label } = feedbackBonus(fb.avgScore, fb.count, fb.sideEffectRate);
      if (points !== 0) { score += points; reasons.push(label); }
    }

    // ── H: constraint micro-bonus ────────────────────────────────────────────
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
