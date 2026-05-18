import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAppState } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { AlertCircle, Info, CheckCircle2, Leaf, FlaskConical, Zap, Moon, Heart, Brain } from "lucide-react";
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
  producer: string | null;
  matchScore: number;
  reasons: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toSearchString = (val: unknown): string => {
  if (!val) return "";
  if (Array.isArray(val)) return val.join(" ").toLowerCase();
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.join(" ").toLowerCase();
    } catch {}
    return val.toLowerCase();
  }
  return JSON.stringify(val).toLowerCase();
};

const parseTerpenes = (strain: ScoredStrain): string[] => {
  try {
    if (strain.terpenes) {
      const p = typeof strain.terpenes === "string"
        ? JSON.parse(strain.terpenes)
        : strain.terpenes;
      if (Array.isArray(p)) return p;
    }
  } catch {}
  if (strain.terpenes_profile) {
    return strain.terpenes_profile.split(",").map((t) => t.trim()).filter(Boolean);
  }
  return [];
};

// ─── Terpene knowledge base ───────────────────────────────────────────────────
const TERPENE_INFO: Record<string, { color: string; effect: string; icon: typeof Zap }> = {
  myrcene:       { color: "bg-green-50 text-green-700 border-green-200",   effect: "Sedating · muscle relaxant · earthy aroma",     icon: Moon   },
  linalool:      { color: "bg-purple-50 text-purple-700 border-purple-200",effect: "Calming · anti-anxiety · floral scent",          icon: Heart  },
  limonene:      { color: "bg-yellow-50 text-yellow-700 border-yellow-200",effect: "Uplifting · mood-enhancing · citrus aroma",      icon: Zap    },
  caryophyllene: { color: "bg-orange-50 text-orange-700 border-orange-200",effect: "Anti-inflammatory · pain relief · spicy aroma",  icon: FlaskConical },
  pinene:        { color: "bg-teal-50 text-teal-700 border-teal-200",      effect: "Alertness · memory · pine scent",                icon: Brain  },
  terpinolene:   { color: "bg-blue-50 text-blue-700 border-blue-200",      effect: "Mildly sedating · antioxidant · fresh aroma",   icon: Leaf   },
  humulene:      { color: "bg-rose-50 text-rose-700 border-rose-200",      effect: "Appetite suppressant · anti-inflammatory",      icon: FlaskConical },
};

const getTerpeneInfo = (name: string) =>
  TERPENE_INFO[name.toLowerCase()] ?? {
    color: "bg-slate-50 text-slate-600 border-slate-200",
    effect: "Terpene with various therapeutic properties",
    icon: Leaf,
  };

// ─── Category style ───────────────────────────────────────────────────────────
const CAT_STYLE: Record<string, { pill: string; bar: string }> = {
  indica: { pill: "bg-purple-50 text-purple-700 border-purple-200", bar: "bg-purple-400" },
  sativa: { pill: "bg-amber-50  text-amber-700  border-amber-200",  bar: "bg-amber-400"  },
  hybrid: { pill: "bg-teal-50   text-teal-700   border-teal-200",   bar: "bg-teal-400"   },
};

// ─── Animated score ring ──────────────────────────────────────────────────────
const ScoreRing = ({ score, rank, animate }: { score: number; rank: number; animate: boolean }) => {
  const r    = 24;
  const circ = 2 * Math.PI * r;
  const offset = animate ? circ - (circ * score) / 100 : circ;

  const rankColors = ["bg-amber-400 text-amber-900", "bg-slate-200 text-slate-600", "bg-orange-200 text-orange-700"];
  const rankLabel  = ["#1", "#2", "#3"];

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
          <circle cx="28" cy="28" r={r} strokeWidth="4.5" fill="none" className="stroke-slate-100" />
          <circle
            cx="28" cy="28" r={r} strokeWidth="4.5" fill="none"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="stroke-emerald-600"
            style={{ transition: animate ? "stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)" : "none" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[13px] font-bold text-slate-800 leading-none">{score}%</span>
          <span className="text-[9px] text-slate-400 tracking-wide mt-0.5">match</span>
        </div>
      </div>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rankColors[rank - 1] ?? "bg-slate-100 text-slate-500"}`}>
        {rankLabel[rank - 1] ?? `#${rank}`}
      </span>
    </div>
  );
};

// ─── THC / CBD progress bar ───────────────────────────────────────────────────
const LevelBar = ({
  label, value, max = 30, barClass, textClass, animate, delay,
}: {
  label: string; value: number; max?: number;
  barClass: string; textClass: string; animate: boolean; delay: number;
}) => {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</span>
        <span className={`text-[11px] font-bold ${textClass}`}>{value}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{
            width: animate ? `${pct}%` : "0%",
            transition: animate ? `width 0.9s cubic-bezier(0.34,1.2,0.64,1) ${delay}ms` : "none",
          }}
        />
      </div>
    </div>
  );
};

// ─── Terpene tag with tooltip ─────────────────────────────────────────────────
const TerpeneTag = ({ name }: { name: string }) => {
  const [show, setShow] = useState(false);
  const info = getTerpeneInfo(name);
  const Icon = info.icon;
  const ref  = useRef<HTMLDivElement>(null);

  return (
    <div className="relative" ref={ref}>
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border transition-all hover:shadow-sm cursor-default ${info.color}`}
      >
        <Icon className="h-2.5 w-2.5" aria-hidden />
        {name}
      </button>

      {/* Tooltip */}
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 pointer-events-none">
          <div className="bg-slate-900 text-white text-[11px] rounded-lg px-3 py-2 w-48 shadow-xl leading-relaxed whitespace-normal text-center">
            <p className="font-semibold mb-0.5 capitalize">{name}</p>
            <p className="text-slate-300 text-[10px]">{info.effect}</p>
          </div>
          {/* Arrow */}
          <div className="w-0 h-0 mx-auto border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
};

// ─── Reason icon mapper ───────────────────────────────────────────────────────
const reasonIcon = (reason: string) => {
  if (reason.toLowerCase().includes("terpene")) return <FlaskConical className="h-3 w-3 text-purple-500 shrink-0 mt-0.5" />;
  if (reason.toLowerCase().includes("cbd"))     return <Leaf className="h-3 w-3 text-teal-500 shrink-0 mt-0.5" />;
  if (reason.toLowerCase().includes("indica") || reason.toLowerCase().includes("sleep")) return <Moon className="h-3 w-3 text-indigo-400 shrink-0 mt-0.5" />;
  if (reason.toLowerCase().includes("sativa") || reason.toLowerCase().includes("mood"))  return <Zap className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />;
  return <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />;
};

// ─── Animated strain card ─────────────────────────────────────────────────────
const StrainCard = ({ strain, rank, revealDelay }: {
  strain: ScoredStrain; rank: number; revealDelay: number;
}) => {
  const navigate  = useNavigate();
  const [visible, setVisible] = useState(false);
  const [animate, setAnimate] = useState(false);
  const isTop     = rank === 1;
  const cat       = strain.category?.toLowerCase() ?? "";
  const catStyle  = CAT_STYLE[cat];
  const terpenes  = parseTerpenes(strain);

  // Staggered entrance animation
  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), revealDelay);
    const t2 = setTimeout(() => setAnimate(true), revealDelay + 100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [revealDelay]);

  return (
    <div
      className={`transition-all duration-700 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
    >
      <div className={`bg-white rounded-2xl overflow-hidden border transition-shadow hover:shadow-md ${
        isTop ? "border-emerald-300 shadow-sm" : "border-slate-200"
      }`}>

        {/* Top banner — #1 only */}
        {isTop && (
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-2 flex items-center gap-2">
            <span className="text-white text-xs">★</span>
            <span className="text-[11px] font-semibold text-white tracking-wide">
              Best therapeutic fit
            </span>
            <span className="ml-auto text-[10px] text-emerald-200 font-medium">
              Top recommendation
            </span>
          </div>
        )}

        {/* Category colour bar */}
        {catStyle && (
          <div className={`h-1 w-full ${catStyle.bar}`} />
        )}

        {/* Main body */}
        <div className="flex">

          {/* Left — score ring */}
          <div className={`w-[88px] shrink-0 flex flex-col items-center justify-center py-5 gap-1 border-r ${
            isTop ? "bg-emerald-50/40 border-emerald-100" : "bg-slate-50 border-slate-100"
          }`}>
            <ScoreRing score={strain.matchScore} rank={rank} animate={animate} />
          </div>

          {/* Right — content */}
          <div className="flex-1 p-4 space-y-3 min-w-0">

            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold text-slate-900 leading-tight">
                  {strain.name}
                </h3>
                {strain.producer && (
                  <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-slate-300 inline-block" />
                    {strain.producer}
                  </p>
                )}
              </div>
              {catStyle && strain.category && (
                <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize whitespace-nowrap ${catStyle.pill}`}>
                  {strain.category}
                </span>
              )}
            </div>

            {/* THC / CBD bars */}
            <div className="bg-slate-50 rounded-xl px-3 py-2.5 space-y-2">
              <LevelBar
                label="THC" value={strain.thc_level ?? 0}
                barClass="bg-gradient-to-r from-amber-400 to-amber-500"
                textClass="text-amber-700"
                animate={animate} delay={0}
              />
              <LevelBar
                label="CBD" value={strain.cbd_level ?? 0}
                max={20}
                barClass="bg-gradient-to-r from-teal-400 to-teal-500"
                textClass="text-teal-700"
                animate={animate} delay={150}
              />
            </div>

            {/* Clinical rationale */}
            {strain.reasons.length > 0 && (
              <div className="border border-emerald-100 bg-emerald-50/50 rounded-xl px-3 py-2.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 mb-2">
                  Clinical rationale
                </p>
                <ul className="space-y-1.5">
                  {strain.reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] text-slate-600 leading-snug">
                      {reasonIcon(r)}
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Terpene tags with tooltips */}
            {terpenes.length > 0 && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                  Terpene profile
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {terpenes.map((t) => (
                    <TerpeneTag key={t} name={t} />
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white text-xs h-8 rounded-xl font-semibold"
                onClick={() => navigate("/feedback")}
              >
                Log usage
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
                onClick={() => navigate("/strains")}
              >
                View in catalog
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const CardSkeleton = ({ delay }: { delay: number }) => (
  <div
    className="bg-white border border-slate-200 rounded-2xl overflow-hidden animate-pulse"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="h-1 bg-slate-200 w-full" />
    <div className="flex">
      <div className="w-[88px] bg-slate-50 border-r border-slate-100 flex items-center justify-center py-5">
        <div className="w-16 h-16 rounded-full bg-slate-200" />
      </div>
      <div className="flex-1 p-4 space-y-3">
        <div className="h-4 bg-slate-200 rounded w-2/5" />
        <div className="bg-slate-50 rounded-xl p-3 space-y-2">
          <div className="h-1.5 bg-slate-200 rounded-full w-3/4" />
          <div className="h-1.5 bg-slate-200 rounded-full w-1/2" />
        </div>
        <div className="h-16 bg-slate-100 rounded-xl" />
        <div className="flex gap-1">
          <div className="h-5 bg-slate-100 rounded-full w-16" />
          <div className="h-5 bg-slate-100 rounded-full w-20" />
          <div className="h-5 bg-slate-100 rounded-full w-14" />
        </div>
      </div>
    </div>
  </div>
);

// ─── Debug panel ──────────────────────────────────────────────────────────────
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
        let resolvedPatientId: string | null = null;
        let profile: Record<string, unknown> | null = null;

        if (patientProfile?.patientId && patientProfile.patientId !== "manual") {
          resolvedPatientId = String(patientProfile.patientId);
          const { data } = await supabase
            .from("patient_profiles").select("*")
            .eq("patient_id", resolvedPatientId).maybeSingle();
          profile = data;
        }

        if (!profile && currentUser?.id && currentUser.id !== "demo-id") {
          const { data: patientRow } = await supabase
            .from("patients").select("id")
            .eq("user_id", currentUser.id).maybeSingle();
          if (patientRow?.id) {
            resolvedPatientId = patientRow.id;
            const { data } = await supabase
              .from("patient_profiles").select("*")
              .eq("patient_id", resolvedPatientId).maybeSingle();
            profile = data;
          }
        }

        if (!profile) {
          const { data } = await supabase
            .from("patient_profiles").select("*").limit(1).maybeSingle();
          profile = data;
          resolvedPatientId = profile?.patient_id as string ?? null;
        }

        const conditions = (profile?.medical_conditions as string ?? "").toLowerCase();
        const age        = (profile?.age as number) ?? 40;
        setConditionLabel((profile?.medical_conditions as string) || "");

        const { data: allStrains } = await supabase.from("strains").select("*");

        setDebugInfo({ resolvedPatientId, conditions, age, strainsCount: allStrains?.length ?? 0 });
        if (!allStrains || allStrains.length === 0) return;

        const scored: ScoredStrain[] = allStrains.map((strain) => {
          let score = 0;
          const reasons: string[] = [];

          const medUses  = toSearchString(strain.medical_uses);
          const terpenes = toSearchString(strain.terpenes) || toSearchString(strain.terpenes_profile);
          const cat      = (strain.category ?? "").toLowerCase();

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

          if ((conditions.includes("pain") || conditions.includes("insomnia") || conditions.includes("ptsd")) && cat === "indica") {
            score += 20; reasons.push("Indica — supports relaxation & sleep");
          }
          if ((conditions.includes("depression") || conditions.includes("fatigue")) && cat === "sativa") {
            score += 20; reasons.push("Sativa — supports mood & energy");
          }
          if (conditions.includes("anxiety") && cat === "hybrid") {
            score += 15; reasons.push("Hybrid — balanced profile for anxiety");
          }

          const terpeneBonus: [string, string, string][] = [
            ["pain",         "myrcene",       "Terpene: Myrcene — analgesic"],
            ["anxiety",      "linalool",      "Terpene: Linalool — anxiolytic"],
            ["insomnia",     "myrcene",       "Terpene: Myrcene — sedative"],
            ["inflammation", "caryophyllene", "Terpene: Caryophyllene — anti-inflammatory"],
            ["depression",   "limonene",      "Terpene: Limonene — mood-elevating"],
            ["ptsd",         "pinene",        "Terpene: Pinene — promotes alertness"],
          ];
          for (const [cond, terp, label] of terpeneBonus) {
            if (conditions.includes(cond) && terpenes.includes(terp)) {
              score += 15; reasons.push(label);
            }
          }

          if ((conditions.includes("inflammation") || conditions.includes("anxiety") || conditions.includes("epilepsy")) && strain.cbd_level > 5) {
            score += 10; reasons.push("High CBD — reduced psychoactive burden");
          }

          if (age > 60 && strain.thc_level > 20) score -= 15;

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
    <div className="max-w-2xl mx-auto space-y-5 py-2">

      {/* Header */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-semibold rounded-full px-3 py-1 mb-3 uppercase tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
          Clinical engine · AI-powered
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1.5 tracking-tight">
          Your personalized matches
        </h1>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          {conditionLabel ? (
            <>
              Optimized for:
              <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 border border-teal-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                <Heart className="h-3 w-3" />
                {conditionLabel}
              </span>
            </>
          ) : (
            "Based on your medical profile"
          )}
        </div>
      </div>

      <DebugPanel info={debugInfo} />

      {/* Cards */}
      {loading ? (
        <div className="space-y-4">
          {[0, 150, 300].map((d) => <CardSkeleton key={d} delay={d} />)}
        </div>
      ) : recommendations.length === 0 ? (
        <Alert className="bg-blue-50 border-blue-200 rounded-2xl animate-in fade-in duration-500">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700 text-sm">
            No match found for your current profile. Try updating your medical profile with conditions like "Chronic Pain", "Insomnia", or "Anxiety".
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          {recommendations.map((strain, i) => (
            <StrainCard
              key={strain.id}
              strain={strain}
              rank={i + 1}
              revealDelay={i * 180}
            />
          ))}
        </div>
      )}

      {/* Terpene legend hint */}
      {!loading && recommendations.length > 0 && (
        <div className="animate-in fade-in duration-700 delay-700">
          <p className="text-[11px] text-slate-400 text-center">
            💡 Hover over terpene tags to see their therapeutic effects
          </p>
        </div>
      )}

      {/* Disclaimer */}
      {!loading && recommendations.length > 0 && (
        <div className="flex gap-3 items-start bg-amber-50 border border-amber-200 rounded-2xl p-3.5 animate-in fade-in duration-700">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong className="font-semibold">Medical disclaimer:</strong> These recommendations are generated by a rule-based clinical algorithm. Final treatment must be approved by your certified physician.
          </p>
        </div>
      )}
    </div>
  );
};

export default RecommendationsPage;
