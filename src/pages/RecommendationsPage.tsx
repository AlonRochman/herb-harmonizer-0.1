import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAppState } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import {
  AlertCircle, Info, CheckCircle2, Leaf, FlaskConical,
  Zap, Moon, Heart, Brain, Star, TrendingUp,
  Users, AlertTriangle, ClipboardList, X, Loader2,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { fetchFeedbackIndex, fetchConditionIndex, scoreStrains } from "@/lib/recommendationEngine";
import type { ScoredStrain } from "@/lib/recommendationEngine";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const parseTerpenes = (strain: ScoredStrain): string[] => {
  try {
    if (strain.terpenes) {
      const p = typeof strain.terpenes === "string"
        ? JSON.parse(strain.terpenes) : strain.terpenes;
      if (Array.isArray(p)) return p;
    }
  } catch {}
  if (strain.terpenes_profile)
    return strain.terpenes_profile.split(",").map((t) => t.trim()).filter(Boolean);
  return [];
};

const TERPENE_INFO: Record<string, { color: string; effect: string; icon: typeof Zap }> = {
  myrcene:       { color: "bg-green-50 text-green-700 border-green-200",    effect: "Sedating · muscle relaxant · earthy",     icon: Moon        },
  linalool:      { color: "bg-purple-50 text-purple-700 border-purple-200", effect: "Calming · anti-anxiety · floral",          icon: Heart       },
  limonene:      { color: "bg-yellow-50 text-yellow-700 border-yellow-200", effect: "Uplifting · mood-enhancing · citrus",      icon: Zap         },
  caryophyllene: { color: "bg-orange-50 text-orange-700 border-orange-200", effect: "Anti-inflammatory · pain relief · spicy",  icon: FlaskConical},
  pinene:        { color: "bg-teal-50 text-teal-700 border-teal-200",       effect: "Alertness · memory · pine",               icon: Brain       },
  terpinolene:   { color: "bg-blue-50 text-blue-700 border-blue-200",       effect: "Mildly sedating · antioxidant · fresh",   icon: Leaf        },
  humulene:      { color: "bg-rose-50 text-rose-700 border-rose-200",       effect: "Appetite suppressant · anti-inflammatory", icon: FlaskConical},
};
const getTerpeneInfo = (name: string) =>
  TERPENE_INFO[name.toLowerCase()] ?? { color: "bg-slate-50 text-slate-600 border-slate-200", effect: "Terpene with therapeutic properties", icon: Leaf };

const CAT_STYLE: Record<string, { pill: string; bar: string }> = {
  indica: { pill: "bg-purple-50 text-purple-700 border-purple-200", bar: "bg-purple-400" },
  sativa: { pill: "bg-amber-50  text-amber-700  border-amber-200",  bar: "bg-amber-400"  },
  hybrid: { pill: "bg-teal-50   text-teal-700   border-teal-200",   bar: "bg-teal-400"   },
};

const CONSUMPTION_METHODS = [
  "Vaporizer", "Oil drops", "Capsules", "Smoking", "Edibles", "Topical",
];

// ─── Log Usage Modal ──────────────────────────────────────────────────────────
const LogUsageModal = ({
  strain,
  patientId,
  onClose,
  onSaved,
}: {
  strain: ScoredStrain;
  patientId: string;
  onClose: () => void;
  onSaved: (usageId: string) => void;
}) => {
  const [dosage, setDosage]   = useState("");
  const [method, setMethod]   = useState("Vaporizer");
  const [date, setDate]       = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  const handleSave = async () => {
    if (!dosage.trim()) { setError("Please enter the dosage."); return; }
    setSaving(true); setError("");
    try {
      const { data, error: err } = await supabase
        .from("usage_records")
        .insert({
          patient_id:         patientId,
          strain_id:          strain.id,
          dosage:             dosage.trim(),
          consumption_method: method,
          usage_date:         date,
        })
        .select("id")
        .single();

      if (err || !data) throw new Error(err?.message ?? "Insert failed");
      onSaved(data.id);
    } catch (e: any) {
      setError(e.message ?? "Could not save. Try again.");
      setSaving(false);
    }
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl animate-in slide-in-from-bottom-4 duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <ClipboardList className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-slate-900">Log usage</p>
              <p className="text-[11px] text-slate-400">{strain.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-2.5">
              <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-[12px] text-red-700">{error}</p>
            </div>
          )}

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-slate-600 uppercase tracking-wide">Date of use</label>
            <input
              type="date"
              value={date}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-[13px] outline-none focus:ring-2 focus:ring-emerald-400/40 focus:bg-white"
            />
          </div>

          {/* Dosage */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-slate-600 uppercase tracking-wide">
              Dosage <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 0.2g, 3 drops, 1 capsule"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-[13px] outline-none focus:ring-2 focus:ring-emerald-400/40 focus:bg-white"
            />
          </div>

          {/* Method */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-slate-600 uppercase tracking-wide">Consumption method</label>
            <div className="grid grid-cols-3 gap-1.5">
              {CONSUMPTION_METHODS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`py-2 px-2 rounded-xl text-[11px] font-medium border-2 transition-all ${
                    method === m
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-slate-200 text-[13px] text-slate-500 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-10 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-[13px] font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {saving ? "Saving…" : "Save session"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Score ring ───────────────────────────────────────────────────────────────
const ScoreRing = ({ score, rank, animate }: { score: number; rank: number; animate: boolean }) => {
  const r = 24; const circ = 2 * Math.PI * r;
  const rankColors = ["bg-amber-400 text-amber-900", "bg-slate-200 text-slate-600", "bg-orange-200 text-orange-700"];
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
          <circle cx="28" cy="28" r={r} strokeWidth="4.5" fill="none" className="stroke-slate-100" />
          <circle cx="28" cy="28" r={r} strokeWidth="4.5" fill="none"
            strokeDasharray={circ} strokeDashoffset={animate ? circ - (circ * score) / 100 : circ}
            strokeLinecap="round" className="stroke-emerald-600"
            style={{ transition: animate ? "stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)" : "none" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[13px] font-bold text-slate-800 leading-none">{score}%</span>
          <span className="text-[9px] text-slate-400 tracking-wide mt-0.5">match</span>
        </div>
      </div>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rankColors[rank - 1] ?? "bg-slate-100 text-slate-500"}`}>
        #{rank}
      </span>
    </div>
  );
};

const LevelBar = ({ label, value, max = 30, barClass, textClass, animate, delay }: {
  label: string; value: number; max?: number; barClass: string;
  textClass: string; animate: boolean; delay: number;
}) => (
  <div className="space-y-1">
    <div className="flex justify-between">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</span>
      <span className={`text-[11px] font-bold ${textClass}`}>{value}%</span>
    </div>
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${barClass}`}
        style={{ width: animate ? `${Math.min((value / max) * 100, 100)}%` : "0%",
          transition: animate ? `width 0.9s cubic-bezier(0.34,1.2,0.64,1) ${delay}ms` : "none" }} />
    </div>
  </div>
);

const FeedbackBadge = ({ strain }: { strain: ScoredStrain }) => {
  if (!strain.feedbackCount || strain.avgEffectiveness === null) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 py-1">
        <Users className="h-3 w-3" />
        <span>No community data yet</span>
      </div>
    );
  }
  const avg = strain.avgEffectiveness;
  const stars = Math.round(avg);
  const barColor = avg >= 4 ? "bg-emerald-500" : avg >= 3 ? "bg-amber-400" : "bg-red-400";
  const scoreColor = avg >= 4 ? "text-emerald-700" : avg >= 3 ? "text-amber-600" : "text-red-600";
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Community efficacy</span>
        </div>
        <div className="flex items-center gap-0.5">
          {[1,2,3,4,5].map((i) => (
            <Star key={i} className={`h-3 w-3 ${i <= stars ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}`} />
          ))}
          <span className={`text-[12px] font-bold ml-1.5 ${scoreColor}`}>{avg.toFixed(1)}</span>
          <span className="text-[10px] text-slate-400">/5</span>
        </div>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${Math.round((avg / 5) * 100)}%` }} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-400 flex items-center gap-1">
          <Users className="h-2.5 w-2.5" />
          {strain.feedbackCount} report{strain.feedbackCount !== 1 ? "s" : ""} · same condition
        </span>
        {(strain.sideEffectRate ?? 0) > 0.3 && (
          <span className="text-[10px] text-amber-600 flex items-center gap-1">
            <AlertTriangle className="h-2.5 w-2.5" />
            {Math.round((strain.sideEffectRate ?? 0) * 100)}% side effects
          </span>
        )}
      </div>
    </div>
  );
};

const TerpeneTag = ({ name }: { name: string }) => {
  const [show, setShow] = useState(false);
  const info = getTerpeneInfo(name);
  const Icon = info.icon;
  return (
    <div className="relative">
      <button onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)} onBlur={() => setShow(false)}
        className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border cursor-default hover:shadow-sm transition-all ${info.color}`}>
        <Icon className="h-2.5 w-2.5" aria-hidden />{name}
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 pointer-events-none">
          <div className="bg-slate-900 text-white text-[11px] rounded-lg px-3 py-2 w-44 shadow-xl text-center leading-relaxed">
            <p className="font-semibold mb-0.5 capitalize">{name}</p>
            <p className="text-slate-300 text-[10px]">{info.effect}</p>
          </div>
          <div className="w-0 h-0 mx-auto border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
};

const reasonIcon = (r: string) => {
  const s = r.toLowerCase();
  if (s.includes("terpene"))                             return <FlaskConical className="h-3 w-3 text-purple-500 shrink-0 mt-0.5" />;
  if (s.includes("cbd"))                                 return <Leaf className="h-3 w-3 text-teal-500 shrink-0 mt-0.5" />;
  if (s.includes("indica") || s.includes("sleep"))      return <Moon className="h-3 w-3 text-indigo-400 shrink-0 mt-0.5" />;
  if (s.includes("sativa") || s.includes("mood"))       return <Zap className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />;
  if (s.includes("effective") || s.includes("efficac")) return <Star className="h-3 w-3 text-amber-400 shrink-0 mt-0.5 fill-amber-400" />;
  return <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />;
};

// ─── Inline feedback form (shown after logging usage) ────────────────────────
const SIDE_EFFECTS_SHORT = ["None","Dry mouth","Dizziness","Fatigue","Nausea","Anxiety","Headache","Sleepiness"];

const InlineFeedbackForm = ({
  usageId, strainName, onDone,
}: { usageId: string; strainName: string; onDone: () => void }) => {
  const [score,      setScore]      = useState(0);
  const [sideEffects,setSideEffects]= useState<string[]>([]);
  const [comments,   setComments]   = useState("");
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");

  const toggleSE = (item: string) => {
    if (item === "None") { setSideEffects(["None"]); return; }
    const next = sideEffects.filter((s) => s !== "None");
    setSideEffects(next.includes(item) ? next.filter((s) => s !== item) : [...next, item]);
  };

  const handleSubmit = async () => {
    if (score === 0)          { setError("Please select a score."); return; }
    if (!sideEffects.length)  { setError("Please select side effects (or 'None')."); return; }
    setSaving(true); setError("");
    try {
      const { error: err } = await supabase.from("feedback").insert({
        usage_id:            usageId,
        effectiveness_score: score,
        side_effects:        sideEffects.join(", ") || "None",
        comments,
      });
      if (err) throw err;
      onDone();
    } catch {
      setError("Could not save. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="border-t border-amber-100 bg-amber-50/40 px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-300">
      <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700">
        Rate: {strainName}
      </p>

      {error && (
        <div className="flex items-center gap-1.5 text-[11px] text-red-600">
          <AlertCircle className="h-3 w-3 shrink-0" />{error}
        </div>
      )}

      {/* Score — star buttons */}
      <div>
        <p className="text-[11px] text-slate-500 mb-1.5">Effectiveness <span className="text-red-400">*</span></p>
        <div className="flex gap-1.5">
          {[1,2,3,4,5].map((n) => (
            <button key={n} onClick={() => setScore(n)}
              className={`w-10 h-10 rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all ${
                score === n
                  ? "bg-emerald-700 border-emerald-700 text-white scale-105 shadow-sm"
                  : "bg-white border-slate-200 text-slate-400 hover:border-emerald-300"
              }`}>
              <Star className={`h-3.5 w-3.5 ${score === n ? "fill-white" : "fill-none"}`} />
              <span className="text-[9px] font-bold">{n}</span>
            </button>
          ))}
          {score > 0 && (
            <span className={`self-center text-[11px] font-medium ml-1 ${
              score >= 4 ? "text-emerald-600" : score >= 3 ? "text-amber-600" : "text-red-500"
            }`}>
              {["","No relief","Slight","Moderate","Significant","Complete relief"][score]}
            </span>
          )}
        </div>
      </div>

      {/* Side effects */}
      <div>
        <p className="text-[11px] text-slate-500 mb-1.5">Side effects <span className="text-red-400">*</span></p>
        <div className="flex flex-wrap gap-1.5">
          {SIDE_EFFECTS_SHORT.map((se) => {
            const active = sideEffects.includes(se);
            return (
              <button key={se} onClick={() => toggleSE(se)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                  active
                    ? se === "None"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : "bg-rose-50 text-rose-700 border-rose-300"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                }`}>
                {se}
              </button>
            );
          })}
        </div>
      </div>

      {/* Optional note */}
      <textarea
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        placeholder="Optional note for your doctor…"
        rows={2}
        className="w-full text-[12px] bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400/40 resize-none"
      />

      {/* Submit */}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 h-9 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          {saving ? "Saving…" : "Submit feedback"}
        </button>
        <button onClick={onDone}
          className="px-4 h-9 rounded-xl border border-slate-200 text-slate-500 text-[12px] hover:bg-slate-50 transition-colors">
          Skip
        </button>
      </div>
    </div>
  );
};

// ─── Strain card ──────────────────────────────────────────────────────────────
const StrainCard = ({
  strain, rank, revealDelay, patientId,
}: {
  strain: ScoredStrain; rank: number; revealDelay: number; patientId: string;
}) => {
  const navigate = useNavigate();
  const [visible, setVisible]             = useState(false);
  const [animate, setAnimate]             = useState(false);
  const [showLogModal, setShowLogModal]   = useState(false);
  const [loggedUsageId, setLoggedUsageId] = useState<string | null>(null);
  const [showFeedback, setShowFeedback]   = useState(false);
  const [feedbackDone, setFeedbackDone]   = useState(false);

  const isTop    = rank === 1;
  const cat      = strain.category?.toLowerCase() ?? "";
  const catStyle = CAT_STYLE[cat];
  const terpenes = parseTerpenes(strain);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), revealDelay);
    const t2 = setTimeout(() => setAnimate(true), revealDelay + 100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [revealDelay]);

  const handleLogSaved = (usageId: string) => {
    setLoggedUsageId(usageId);
    setShowLogModal(false);
    setShowFeedback(true); // ← open inline form immediately
  };

  return (
    <>
      <div className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <div className={`bg-white rounded-2xl overflow-hidden border hover:shadow-md transition-shadow ${isTop ? "border-emerald-300 shadow-sm" : "border-slate-200"}`}>
          {isTop && (
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-2 flex items-center gap-2">
              <span className="text-white text-xs">★</span>
              <span className="text-[11px] font-semibold text-white tracking-wide">Best therapeutic fit</span>
              <span className="ml-auto text-[10px] text-emerald-200">Top recommendation</span>
            </div>
          )}
          {catStyle && <div className={`h-1 w-full ${catStyle.bar}`} />}

          <div className="flex">
            <div className={`w-[88px] shrink-0 flex flex-col items-center justify-center py-5 border-r ${isTop ? "bg-emerald-50/40 border-emerald-100" : "bg-slate-50 border-slate-100"}`}>
              <ScoreRing score={strain.matchScore} rank={rank} animate={animate} />
            </div>

            <div className="flex-1 p-4 space-y-3 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold text-slate-900 leading-tight">{strain.name}</h3>
                  {strain.producer && (
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-slate-300 inline-block" />{strain.producer}
                    </p>
                  )}
                </div>
                {catStyle && strain.category && (
                  <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize whitespace-nowrap ${catStyle.pill}`}>
                    {strain.category}
                  </span>
                )}
              </div>

              <div className="bg-slate-50 rounded-xl px-3 py-2.5 space-y-2">
                <LevelBar label="THC" value={strain.thc_level ?? 0} barClass="bg-gradient-to-r from-amber-400 to-amber-500" textClass="text-amber-700" animate={animate} delay={0} />
                <LevelBar label="CBD" value={strain.cbd_level ?? 0} max={20} barClass="bg-gradient-to-r from-teal-400 to-teal-500" textClass="text-teal-700" animate={animate} delay={150} />
              </div>

              <FeedbackBadge strain={strain} />

              {strain.reasons.length > 0 && (
                <div className="border border-emerald-100 bg-emerald-50/50 rounded-xl px-3 py-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 mb-2">Clinical rationale</p>
                  <ul className="space-y-1.5">
                    {strain.reasons.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] text-slate-600 leading-snug">
                        {reasonIcon(r)}<span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {terpenes.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Terpene profile</p>
                  <div className="flex flex-wrap gap-1.5">
                    {terpenes.map((t) => <TerpeneTag key={t} name={t} />)}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                {feedbackDone ? (
                  <div className="flex-1 flex items-center gap-1.5 h-8 text-[11px] text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Feedback saved — thank you!
                  </div>
                ) : loggedUsageId && !showFeedback ? (
                  <button
                    onClick={() => setShowFeedback(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-xl bg-amber-50 border border-amber-300 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors animate-in fade-in duration-300"
                  >
                    <Star className="h-3.5 w-3.5" />
                    Rate this session
                  </button>
                ) : !loggedUsageId ? (
                  <button
                    onClick={() => setShowLogModal(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
                  >
                    <ClipboardList className="h-3.5 w-3.5" />
                    Log usage
                  </button>
                ) : null}
                {!feedbackDone && (
                  <Button size="sm" variant="outline"
                    className="text-xs h-8 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
                    onClick={() => navigate("/strains")}>
                    Catalog
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Inline feedback form — opens after Log Usage */}
          {showFeedback && loggedUsageId && !feedbackDone && (
            <InlineFeedbackForm
              usageId={loggedUsageId}
              strainName={strain.name}
              onDone={() => { setShowFeedback(false); setFeedbackDone(true); }}
            />
          )}
        </div>
      </div>

      {/* Log Usage Modal */}
      {showLogModal && patientId && (
        <LogUsageModal
          strain={strain}
          patientId={patientId}
          onClose={() => setShowLogModal(false)}
          onSaved={handleLogSaved}
        />
      )}
    </>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const CardSkeleton = ({ delay }: { delay: number }) => (
  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden animate-pulse" style={{ animationDelay: `${delay}ms` }}>
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
        <div className="h-14 bg-slate-100 rounded-xl" />
        <div className="h-16 bg-slate-100 rounded-xl" />
      </div>
    </div>
  </div>
);

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
  const [loading, setLoading]                   = useState(true);
  const [recommendations, setRecommendations]   = useState<ScoredStrain[]>([]);
  const [conditionLabel, setConditionLabel]     = useState("");
  const [feedbackCoverage, setFeedbackCoverage] = useState(0);
  const [resolvedPatientId, setResolvedPatientId] = useState("");
  const [debugInfo, setDebugInfo]               = useState<Record<string, unknown>>({});

  useEffect(() => {
    const generate = async () => {
      setLoading(true);
      try {
        let pid: string | null = null;
        let profile: Record<string, unknown> | null = null;

        if (patientProfile?.patientId && patientProfile.patientId !== "manual") {
          pid = String(patientProfile.patientId);
          const { data } = await supabase.from("patient_profiles").select("*")
            .eq("patient_id", pid).maybeSingle();
          profile = data;
        }

        if (!profile && currentUser?.id && currentUser.id !== "demo-id") {
          const { data: patientRow } = await supabase.from("patients").select("id")
            .eq("user_id", currentUser.id).maybeSingle();
          if (patientRow?.id) {
            pid = patientRow.id;
            const { data } = await supabase.from("patient_profiles").select("*")
              .eq("patient_id", pid).maybeSingle();
            profile = data;
          }
        }

        if (!profile) {
          const { data } = await supabase.from("patient_profiles").select("*").limit(1).maybeSingle();
          profile = data;
          pid = profile?.patient_id as string ?? null;
        }

        if (pid) setResolvedPatientId(pid);

        const conditions = (profile?.medical_conditions as string ?? "").toLowerCase();
        const age        = (profile?.age as number) ?? 40;
        setConditionLabel((profile?.medical_conditions as string) || "");

        const [{ data: allStrains }, { data: constraintsRow }, feedbackIndex, conditionIndex] = await Promise.all([
          supabase.from("strains").select("*"),
          pid ? supabase.from("clinical_constraints").select("thc_max, cbd_min")
                  .eq("patient_id", pid).maybeSingle()
              : Promise.resolve({ data: null }),
          fetchFeedbackIndex(conditions),
          fetchConditionIndex(),
        ]);

        const thcMax: number | null = (constraintsRow as any)?.thc_max ?? null;
        const cbdMin: number | null = (constraintsRow as any)?.cbd_min ?? null;

        setDebugInfo({ pid, conditions, age, thcMax, cbdMin, strainsCount: allStrains?.length ?? 0, feedbackIndexSize: feedbackIndex.size });

        if (!allStrains?.length) return;

        const pool = allStrains.filter((s) => {
          if (thcMax !== null && s.thc_level > thcMax) return false;
          if (cbdMin !== null && s.cbd_level < cbdMin) return false;
          return true;
        });

        const scored = scoreStrains(pool.length > 0 ? pool : allStrains, conditions, age, thcMax, cbdMin, feedbackIndex, conditionIndex);
        const top3   = scored.filter((s) => s.matchScore > 0).sort((a, b) => b.matchScore - a.matchScore).slice(0, 3);

        setFeedbackCoverage(top3.filter((s) => s.feedbackCount > 0).length);
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
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-semibold rounded-full px-3 py-1 mb-3 uppercase tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
          Clinical engine · feedback-enhanced
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1.5 tracking-tight">Your personalised matches</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          {conditionLabel ? (
            <>Optimised for:
              <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 border border-teal-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                <Heart className="h-3 w-3" />{conditionLabel}
              </span>
            </>
          ) : "Based on your medical profile"}
          {feedbackCoverage > 0 && !loading && (
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-medium px-2.5 py-0.5 rounded-full">
              <Star className="h-3 w-3 fill-amber-400" />
              {feedbackCoverage} of 3 enhanced by community data
            </span>
          )}
        </div>
      </div>

      <DebugPanel info={debugInfo} />

      {loading ? (
        <div className="space-y-4">{[0,150,300].map((d) => <CardSkeleton key={d} delay={d} />)}</div>
      ) : recommendations.length === 0 ? (
        <Alert className="bg-blue-50 border-blue-200 rounded-2xl animate-in fade-in duration-500">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700 text-sm">
            No match found. Try updating your medical profile with conditions like "Chronic Pain", "Insomnia", or "Anxiety".
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
              patientId={resolvedPatientId}
            />
          ))}
        </div>
      )}

      {!loading && recommendations.length > 0 && (
        <>
          <p className="text-[11px] text-slate-400 text-center animate-in fade-in duration-700">
            💡 Log a usage session after using a strain, then rate it in Feedback
          </p>
          <div className="flex gap-3 items-start bg-amber-50 border border-amber-200 rounded-2xl p-3.5 animate-in fade-in duration-700">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong className="font-semibold">Medical disclaimer:</strong> Recommendations are generated by a clinical algorithm enhanced with anonymised community feedback. Final treatment decisions require physician approval.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default RecommendationsPage;
