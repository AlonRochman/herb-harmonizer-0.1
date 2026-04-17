import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAppState } from "@/context/AppContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Info, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ScoredStrain {
  id: string;
  name: string;
  thc_level: number;
  cbd_level: number;
  category: string | null;
  terpenes: string | null;
  terpenes_profile: string | null;
  medical_uses: unknown;
  matchScore: number;
  reasons: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * FIX BUG 2+3: medical_uses יכול להיות null, string, או JSON array מה-DB.
 * הפונקציה מחזירה תמיד string lowercase בטוח לחיפוש.
 */
const toSearchString = (val: unknown): string => {
  if (!val) return "";
  if (Array.isArray(val)) return val.join(" ").toLowerCase();
  if (typeof val === "string") {
    // אם זה JSON string כמו '["Pain","Sleep"]' — parse אותו
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.join(" ").toLowerCase();
    } catch {
      // לא JSON — החזר כ-string רגיל
    }
    return val.toLowerCase();
  }
  return JSON.stringify(val).toLowerCase();
};

// ─── Score ring ───────────────────────────────────────────────────────────────
const ScoreRing = ({ score, rank }: { score: number; rank: number }) => {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * score) / 100;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-14">
        <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
          <circle cx="28" cy="28" r={r} strokeWidth="5" fill="none" className="stroke-slate-200" />
          <circle
            cx="28" cy="28" r={r} strokeWidth="5" fill="none"
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round" className="stroke-emerald-700 transition-all duration-700"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-slate-800">
          {score}%
        </span>
      </div>
      <span className="text-[10px] text-slate-400 tracking-wide">match</span>
      <span className="text-[10px] font-medium text-slate-500 bg-white border border-slate-200 rounded px-1.5 py-0.5">
        #{rank}
      </span>
    </div>
  );
};

// ─── Strain card ──────────────────────────────────────────────────────────────
const StrainCard = ({ strain, rank }: { strain: ScoredStrain; rank: number }) => {
  const navigate = useNavigate();
  const isTop = rank === 1;

  // terpenes יכול להיות JSON string, array, או terpenes_profile כ-string פשוט
  let terpeneList: string[] = [];
  try {
    if (strain.terpenes) {
      const parsed = typeof strain.terpenes === "string"
        ? JSON.parse(strain.terpenes)
        : strain.terpenes;
      terpeneList = Array.isArray(parsed) ? parsed : [];
    } else if (strain.terpenes_profile) {
      terpeneList = strain.terpenes_profile.split(",").map((t: string) => t.trim());
    }
  } catch {
    terpeneList = strain.terpenes_profile
      ? strain.terpenes_profile.split(",").map((t: string) => t.trim())
      : [];
  }

  return (
    <div className={`bg-white rounded-xl overflow-hidden ${
      isTop ? "border border-emerald-300 shadow-sm" : "border border-slate-200"
    }`}>
      {isTop && (
        <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-1.5 flex items-center gap-1.5">
          <span className="text-emerald-600 text-xs">★</span>
          <span className="text-[11px] font-medium text-emerald-800 tracking-wide">
            Best therapeutic fit
          </span>
        </div>
      )}
      <div className="flex">
        <div className="w-24 flex-shrink-0 bg-slate-50 border-r border-slate-100 flex items-center justify-center py-5">
          <ScoreRing score={strain.matchScore} rank={rank} />
        </div>
        <div className="flex-1 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-base font-medium text-slate-900">{strain.name}</span>
            {strain.category && (
              <span className="text-[11px] text-slate-500 bg-slate-100 rounded px-2 py-0.5 whitespace-nowrap">
                {strain.category}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <span className="text-[12px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
              THC {strain.thc_level}%
            </span>
            <span className="text-[12px] font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2.5 py-0.5">
              CBD {strain.cbd_level}%
            </span>
          </div>
          {strain.reasons.length > 0 && (
            <div className="bg-slate-50 border-l-2 border-emerald-300 rounded-r px-3 py-2">
              <p className="text-[10px] font-medium text-emerald-700 tracking-wider mb-1 uppercase">
                Clinical rationale
              </p>
              <p className="text-[13px] text-slate-600 leading-relaxed">
                {strain.reasons.join(". ")}
              </p>
            </div>
          )}
          {terpeneList.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {terpeneList.map((t) => (
                <span key={t} className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5">
                  {t}
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-8"
              onClick={() => navigate("/feedback")}
            >
              Log usage
            </Button>
            <Button
              size="sm" variant="outline"
              className="text-xs h-8 text-slate-600"
              onClick={() => navigate("/strains")}
            >
              View in catalog
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const CardSkeleton = () => (
  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden animate-pulse">
    <div className="flex">
      <div className="w-24 bg-slate-100 flex items-center justify-center py-5">
        <div className="w-14 h-14 rounded-full bg-slate-200" />
      </div>
      <div className="flex-1 p-4 space-y-3">
        <div className="h-4 bg-slate-200 rounded w-1/3" />
        <div className="flex gap-2">
          <div className="h-5 bg-slate-100 rounded-full w-16" />
          <div className="h-5 bg-slate-100 rounded-full w-16" />
        </div>
        <div className="h-12 bg-slate-100 rounded" />
      </div>
    </div>
  </div>
);

// ─── Debug panel (dev only) ───────────────────────────────────────────────────
const DebugPanel = ({ info }: { info: Record<string, unknown> }) => {
  if (import.meta.env.PROD) return null;
  return (
    <details className="bg-slate-900 text-green-400 rounded-lg p-3 text-[11px] font-mono">
      <summary className="cursor-pointer text-slate-400 mb-2">🔍 Debug info</summary>
      <pre className="whitespace-pre-wrap break-all">{JSON.stringify(info, null, 2)}</pre>
    </details>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const RecommendationsPage = () => {
  const { currentUser, patientProfile } = useAppState();
  const [loading, setLoading]           = useState(true);
  const [recommendations, setRecommendations] = useState<ScoredStrain[]>([]);
  const [conditionLabel, setConditionLabel]   = useState("");
  const [debugInfo, setDebugInfo]             = useState<Record<string, unknown>>({});

  useEffect(() => {
    const generate = async () => {
      setLoading(true);
      try {
        // ── FIX BUG 1: מציאת patient_id אמיתי ───────────────────────────
        // currentUser.id = "demo-id" — לא עובד עם .eq()
        // הפתרון: נשתמש ב-patientProfile.patientId מה-context אם קיים,
        // אחרת ניקח את הפרופיל הראשון מה-DB (demo mode)
        let resolvedPatientId: string | null = null;
        let profile: Record<string, unknown> | null = null;

        // Option A: יש patientId ב-context (אחרי PatientInputPage)
        if (patientProfile?.patientId && patientProfile.patientId !== "manual") {
          resolvedPatientId = String(patientProfile.patientId);
          const { data } = await supabase
            .from("patient_profiles")
            .select("*")
            .eq("patient_id", resolvedPatientId)
            .maybeSingle();
          profile = data;
        }

        // Option B: currentUser.id הוא UUID אמיתי (לא demo-id)
        if (!profile && currentUser?.id && currentUser.id !== "demo-id") {
          // מחפש דרך טבלת patients → patient_profiles
          const { data: patientRow } = await supabase
            .from("patients")
            .select("id")
            .eq("user_id", currentUser.id)
            .maybeSingle();

          if (patientRow?.id) {
            resolvedPatientId = patientRow.id;
            const { data } = await supabase
              .from("patient_profiles")
              .select("*")
              .eq("patient_id", resolvedPatientId)
              .maybeSingle();
            profile = data;
          }
        }

        // Option C: demo mode — קח את הפרופיל הראשון הזמין ב-DB
        if (!profile) {
          const { data } = await supabase
            .from("patient_profiles")
            .select("*")
            .limit(1)
            .maybeSingle();
          profile = data;
          resolvedPatientId = profile?.patient_id as string ?? null;
        }

        const conditions = (profile?.medical_conditions as string ?? "").toLowerCase();
        const age        = (profile?.age as number) ?? 40;
        setConditionLabel((profile?.medical_conditions as string) || "");

        // ── שליפת זנים ────────────────────────────────────────────────────
        const { data: allStrains } = await supabase.from("strains").select("*");

        setDebugInfo({
          resolvedPatientId,
          conditions,
          age,
          strainsCount: allStrains?.length ?? 0,
          profileFound: !!profile,
        });

        if (!allStrains || allStrains.length === 0) return;

        // ── FIX BUG 2+3: אלגוריתם עמיד לנתוני null ───────────────────────
        const scored: ScoredStrain[] = allStrains.map((strain) => {
          let score = 0;
          const reasons: string[] = [];

          const medUses  = toSearchString(strain.medical_uses);
          const terpenes = toSearchString(strain.terpenes) || toSearchString(strain.terpenes_profile);
          const cat      = (strain.category ?? "").toLowerCase();

          // מיפוי מחלות → מילות מפתח ב-medical_uses
          const conditionMap: [string, string[]][] = [
            ["pain",        ["pain"]],
            ["chronic pain",["pain", "severe pain", "mild pain"]],
            ["insomnia",    ["insomnia", "sleep"]],
            ["anxiety",     ["anxiety", "stress"]],
            ["inflammation",["inflammation"]],
            ["depression",  ["depression", "mood"]],
            ["nausea",      ["nausea"]],
            ["ptsd",        ["ptsd", "stress", "anxiety"]],
            ["epilepsy",    ["seizures", "epilepsy"]],
            ["fibromyalgia",["pain", "inflammation"]],
            ["fatigue",     ["fatigue", "focus"]],
            ["appetite",    ["appetite loss"]],
          ];

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

          // קטגוריה
          if ((conditions.includes("pain") || conditions.includes("insomnia") || conditions.includes("ptsd")) && cat === "indica") {
            score += 20;
            reasons.push("Indica — supports relaxation & sleep");
          }
          if ((conditions.includes("depression") || conditions.includes("fatigue")) && cat === "sativa") {
            score += 20;
            reasons.push("Sativa — supports mood & energy");
          }
          if (conditions.includes("anxiety") && cat === "hybrid") {
            score += 15;
            reasons.push("Hybrid — balanced profile for anxiety");
          }

          // טרפנים
          const terpeneBonus: [string, string, string][] = [
            ["pain",        "myrcene",       "Myrcene — analgesic terpene"],
            ["anxiety",     "linalool",      "Linalool — anxiolytic terpene"],
            ["insomnia",    "myrcene",       "Myrcene — sedative terpene"],
            ["inflammation","caryophyllene", "Caryophyllene — anti-inflammatory"],
            ["depression",  "limonene",      "Limonene — mood-elevating terpene"],
            ["ptsd",        "pinene",        "Pinene — promotes alertness"],
          ];
          for (const [cond, terp, label] of terpeneBonus) {
            if (conditions.includes(cond) && terpenes.includes(terp)) {
              score += 15;
              reasons.push(label);
            }
          }

          // CBD גבוה לדלקת / חרדה
          if ((conditions.includes("inflammation") || conditions.includes("anxiety") || conditions.includes("epilepsy")) && strain.cbd_level > 5) {
            score += 10;
            reasons.push("High CBD — reduced psychoactive burden");
          }

          // ניקוי ציון לגיל מבוגר
          if (age > 60 && strain.thc_level > 20) {
            score -= 15;
          }

          // אם אין התאמה ישירה ב-medical_uses, בדוק לפחות לפי קטגוריה+טרפנים
          // זה מונע אפס המלצות לזנים ללא medical_uses מוגדר
          if (score === 0 && (terpenes || cat)) {
            if (conditions.includes("pain") && (terpenes.includes("myrcene") || cat === "indica")) {
              score += 25;
              reasons.push("Terpene/category profile aligns with pain relief");
            }
            if (conditions.includes("anxiety") && (terpenes.includes("linalool") || cat === "hybrid")) {
              score += 25;
              reasons.push("Terpene/category profile aligns with anxiety relief");
            }
            if (conditions.includes("insomnia") && cat === "indica") {
              score += 25;
              reasons.push("Indica category supports sleep");
            }
          }

          return {
            ...strain,
            matchScore: Math.min(Math.round(score), 98),
            reasons: reasons.slice(0, 3),
          };
        });

        const top3 = scored
          .filter((s) => s.matchScore > 0)
          .sort((a, b) => b.matchScore - a.matchScore)
          .slice(0, 3);

        setRecommendations(top3);
      } catch (err) {
        console.error("Recommendation error:", err);
      } finally {
        setLoading(false);
      }
    };

    generate();
  }, [currentUser, patientProfile]);

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-2 animate-in fade-in slide-in-from-bottom-2 duration-500">

      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-medium rounded-full px-3 py-1 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
          Clinical engine
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-1.5">
          Your personalized matches
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          {conditionLabel
            ? <>Condition: <span className="bg-teal-50 text-teal-700 text-xs font-medium px-2 py-0.5 rounded mx-1">{conditionLabel}</span></>
            : "Based on your medical profile"}
        </p>
      </div>

      {/* Debug panel — hidden in production */}
      <DebugPanel info={debugInfo} />

      {/* Cards / loading / empty */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
        </div>
      ) : recommendations.length === 0 ? (
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700 text-sm">
            No match found for your current profile. Try updating your medical profile with conditions like "Chronic Pain", "Insomnia", or "Anxiety".
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-3">
          {recommendations.map((strain, i) => (
            <StrainCard key={strain.id} strain={strain} rank={i + 1} />
          ))}
        </div>
      )}

      {/* Disclaimer */}
      {!loading && recommendations.length > 0 && (
        <div className="flex gap-3 items-start bg-amber-50 border border-amber-200 rounded-xl p-3.5">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong className="font-medium">Medical disclaimer:</strong> These recommendations are generated by a rule-based clinical algorithm. Final treatment must be approved by your certified physician.
          </p>
        </div>
      )}

    </div>
  );
};

export default RecommendationsPage;