import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "@/context/AppContext";
import {
  Scale, Zap, Droplets, Wind, Pill, Leaf,
  ChevronRight, ChevronLeft, AlertCircle, Info,
  Clock, Timer, TrendingUp, ShieldCheck, BookOpen,
  RotateCcw, ArrowRight, CheckCircle2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type ExperienceLevel = "none" | "low" | "moderate" | "experienced";
type ConsumptionMethod = "vaporizer" | "oil" | "capsules" | "smoking" | "edibles" | "topical";

interface DosageResult {
  startDose: string;
  unit: string;
  frequency: string;
  titrationStep: string;
  titrationInterval: string;
  onsetTime: string;
  duration: string;
  warnings: string[];
  tips: string[];
  thcCap: number;   // suggested max THC %
  cbdFloor: number; // suggested min CBD %
}

// ─── Clinical data tables ─────────────────────────────────────────────────────

// Base start doses per method (mg THC equivalent)
const BASE_DOSES: Record<ConsumptionMethod, { amount: number; unit: string }> = {
  vaporizer: { amount: 1,   unit: "mg (inhaled)"       },
  oil:       { amount: 2.5, unit: "mg (sublingual)"    },
  capsules:  { amount: 2.5, unit: "mg"                  },
  smoking:   { amount: 1,   unit: "puff"                },
  edibles:   { amount: 2.5, unit: "mg"                  },
  topical:   { amount: 0,   unit: "thin layer (topical)" },
};

// Onset & duration per method
const METHOD_KINETICS: Record<ConsumptionMethod, { onset: string; duration: string }> = {
  vaporizer: { onset: "5–15 min",  duration: "2–3 hours"  },
  oil:       { onset: "15–45 min", duration: "4–6 hours"  },
  capsules:  { onset: "30–90 min", duration: "6–8 hours"  },
  smoking:   { onset: "5–10 min",  duration: "2–3 hours"  },
  edibles:   { onset: "45–120 min",duration: "6–10 hours" },
  topical:   { onset: "30–60 min", duration: "2–4 hours"  },
};

// Experience multipliers for starting dose
const EXP_MULTIPLIER: Record<ExperienceLevel, number> = {
  none:       1.0,
  low:        1.5,
  moderate:   2.5,
  experienced: 4.0,
};

// Experience THC cap
const EXP_THC_CAP: Record<ExperienceLevel, number> = {
  none:        10,
  low:         15,
  moderate:    20,
  experienced: 30,
};

// Weight bands adjust the dose slightly
const weightMultiplier = (kg: number): number => {
  if (kg < 55) return 0.85;
  if (kg < 75) return 1.0;
  if (kg < 95) return 1.15;
  return 1.25;
};

// ─── Calculator logic ─────────────────────────────────────────────────────────
function calculate(
  weightKg: number,
  experience: ExperienceLevel,
  method: ConsumptionMethod,
  age: number,
  hasAnxiety: boolean,
  hasHeartCondition: boolean,
): DosageResult {
  const base    = BASE_DOSES[method];
  const kinetics = METHOD_KINETICS[method];
  const expMult  = EXP_MULTIPLIER[experience];
  const wMult    = weightMultiplier(weightKg);

  let startAmount = base.amount * expMult * wMult;

  // Age safety reduction
  const isElderly = age >= 65;
  const isYoung   = age < 25;
  if (isElderly) startAmount *= 0.6;
  if (isYoung)   startAmount *= 0.8;

  // Topical is fixed — no psychoactive, no weight calc
  const isTopical = method === "topical";
  if (isTopical) startAmount = 0;

  // Round nicely
  const roundedStart = isTopical ? 0 :
    startAmount < 2   ? Math.round(startAmount * 4) / 4  // 0.25 steps
    : startAmount < 5 ? Math.round(startAmount * 2) / 2  // 0.5 steps
    : Math.round(startAmount);

  // Titration step ≈ 25–50% of starting dose
  const titrationStep = isTopical ? "n/a" :
    roundedStart <= 2.5 ? `${(roundedStart * 0.5).toFixed(1)} ${base.unit}`
    : `${Math.round(roundedStart * 0.5)} ${base.unit}`;

  // Frequency
  const freq: Record<ConsumptionMethod, string> = {
    vaporizer: "1–2 puffs, once daily (evening)",
    oil:       "Once daily, sublingual",
    capsules:  "Once daily with food",
    smoking:   "1–2 puffs, as needed",
    edibles:   "Once daily (evening recommended)",
    topical:   "2–3× daily, as needed",
  };

  // THC cap
  let thcCap = EXP_THC_CAP[experience];
  if (isElderly) thcCap = Math.min(thcCap, 10);
  if (hasAnxiety) thcCap = Math.min(thcCap, 12);

  // CBD floor
  const cbdFloor = (hasAnxiety || experience === "none") ? 5 : 2;

  // Warnings
  const warnings: string[] = [];
  if (isElderly)          warnings.push("Start at minimum dose — elderly patients have higher sensitivity and slower metabolism.");
  if (isYoung)            warnings.push("Under-25 patients: developing brain may be more vulnerable. Lower THC preferred.");
  if (experience === "none") warnings.push("First-time patients: never redose before the full onset time has passed.");
  if (hasAnxiety)         warnings.push("Anxiety patients: high THC can worsen symptoms. Prioritise CBD-dominant or balanced strains.");
  if (hasHeartCondition)  warnings.push("Cardiac history: consult your physician before use. THC can temporarily increase heart rate.");
  if (method === "edibles") warnings.push("Edibles have highly variable absorption. Wait the full onset window before any redosing.");
  if (method === "smoking") warnings.push("Smoking poses respiratory risk — vaporizer is clinically preferred for regular use.");

  // Tips
  const tips: string[] = [
    `Wait the full ${kinetics.onset} onset window before assessing effect.`,
    `Keep a session journal: dose · time · effect · side effects.`,
    `Titrate upward by ${titrationStep} no more than every ${experience === "none" ? "7" : "3–5"} days.`,
    "Never drive or operate machinery for at least 4 hours after use.",
  ];
  if (method === "oil") tips.push("Hold oil under tongue for 60–90 seconds before swallowing for best absorption.");
  if (method === "capsules") tips.push("Take with a small fatty meal — cannabinoids are fat-soluble and absorb better.");

  return {
    startDose: isTopical ? "Thin layer" : `${roundedStart} ${base.unit}`,
    unit: base.unit,
    frequency: freq[method],
    titrationStep,
    titrationInterval: experience === "none" ? "every 7 days" : "every 3–5 days",
    onsetTime: kinetics.onset,
    duration: kinetics.duration,
    warnings,
    tips,
    thcCap,
    cbdFloor,
  };
}

// ─── Method card data ─────────────────────────────────────────────────────────
const METHODS: { id: ConsumptionMethod; label: string; icon: typeof Wind; sub: string; badge?: string }[] = [
  { id: "vaporizer", label: "Vaporizer",  icon: Wind,     sub: "Fast onset, precise",  badge: "Preferred" },
  { id: "oil",       label: "Oil drops",  icon: Droplets, sub: "Consistent, discreet"               },
  { id: "capsules",  label: "Capsules",   icon: Pill,     sub: "Precise, long-lasting"               },
  { id: "smoking",   label: "Smoking",    icon: Wind,     sub: "Fast, not recommended"               },
  { id: "edibles",   label: "Edibles",    icon: Leaf,     sub: "Slow, variable"                      },
  { id: "topical",   label: "Topical",    icon: Zap,      sub: "Local only, no high"                 },
];

const EXPERIENCE_OPTS: { id: ExperienceLevel; label: string; sub: string; color: string }[] = [
  { id: "none",       label: "None",       sub: "Never used cannabis",        color: "border-slate-300 bg-slate-50  text-slate-700" },
  { id: "low",        label: "Low",        sub: "A few times, months ago",    color: "border-teal-300  bg-teal-50   text-teal-800"  },
  { id: "moderate",   label: "Moderate",   sub: "Regular use in past year",   color: "border-amber-300 bg-amber-50  text-amber-800" },
  { id: "experienced",label: "Experienced",sub: "Current regular user",       color: "border-purple-300 bg-purple-50 text-purple-800" },
];

// ─── Animated number ──────────────────────────────────────────────────────────
const AnimatedBadge = ({ children, color }: { children: React.ReactNode; color: string }) => {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 80); return () => clearTimeout(t); }, []);
  return (
    <div className={`transition-all duration-500 ${show ? "opacity-100 scale-100" : "opacity-0 scale-90"} ${color}`}>
      {children}
    </div>
  );
};

// ─── Result panel ─────────────────────────────────────────────────────────────
const ResultPanel = ({ result, method }: { result: DosageResult; method: ConsumptionMethod }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-500">

      {/* Primary dose card */}
      <div className="bg-gradient-to-br from-emerald-700 to-emerald-800 rounded-2xl p-5 text-white relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full opacity-10 bg-white" />
        <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-200 mb-2">
          Recommended starting dose
        </p>
        <div className="flex items-end gap-3 mb-3">
          <span className="text-4xl font-extrabold tracking-tight leading-none">
            {result.startDose}
          </span>
        </div>
        <p className="text-[13px] text-emerald-100 leading-relaxed">
          {result.frequency}
        </p>
      </div>

      {/* Kinetics row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Clock,      label: "Onset",      value: result.onsetTime,          color: "bg-blue-50  border-blue-200  text-blue-700"   },
          { icon: Timer,      label: "Duration",   value: result.duration,            color: "bg-purple-50 border-purple-200 text-purple-700" },
          { icon: TrendingUp, label: "Titrate",    value: result.titrationStep,       color: "bg-amber-50 border-amber-200  text-amber-700"  },
        ].map(({ icon: Icon, label, value, color }) => (
          <AnimatedBadge key={label} color="">
            <div className={`border rounded-xl p-3 text-center ${color}`}>
              <Icon className="h-4 w-4 mx-auto mb-1 opacity-70" />
              <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60 mb-0.5">{label}</p>
              <p className="text-[12px] font-semibold leading-tight">{value}</p>
            </div>
          </AnimatedBadge>
        ))}
      </div>

      {/* Strain guidance */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Strain guidance based on your profile
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">Max THC</span>
              <span className="text-[13px] font-bold text-amber-700">{result.thcCap}%</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-300 to-amber-500 rounded-full transition-all duration-700"
                style={{ width: `${(result.thcCap / 30) * 100}%` }}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-teal-700 uppercase tracking-wide">Min CBD</span>
              <span className="text-[13px] font-bold text-teal-700">{result.cbdFloor}%</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-300 to-teal-500 rounded-full transition-all duration-700"
                style={{ width: `${(result.cbdFloor / 20) * 100}%` }}
              />
            </div>
          </div>
        </div>
        <p className="text-[12px] text-slate-500 leading-relaxed">
          These limits will pre-fill your clinical constraints when you request a recommendation.
        </p>
      </div>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Safety notes</p>
          {result.warnings.map((w, i) => (
            <div key={i} className="flex gap-2.5 items-start bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[12px] text-amber-800 leading-relaxed">{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tips */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Practical tips</p>
        <div className="bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-100">
          {result.tips.map((tip, i) => (
            <div key={i} className="flex gap-2.5 items-start px-3 py-2.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-[12px] text-slate-600 leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Titration schedule */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
          Titration schedule
        </p>
        <div className="relative">
          <div className="absolute left-3.5 top-0 bottom-0 w-px bg-slate-200" />
          {[
            { week: "Week 1",    dose: result.startDose,          note: "Baseline — observe effects carefully" },
            { week: "Week 2–3",  dose: `+ ${result.titrationStep}`, note: `Only if week 1 was well tolerated` },
            { week: "Ongoing",   dose: "Adjust with physician",   note: "Review every 4–8 weeks" },
          ].map(({ week, dose, note }, i) => (
            <div key={i} className="flex gap-4 mb-3 last:mb-0 relative pl-8">
              <div className="absolute left-2.5 top-1 w-2 h-2 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-300" />
              <div>
                <p className="text-[11px] font-semibold text-slate-500">{week}</p>
                <p className="text-[13px] font-semibold text-slate-800">{dose}</p>
                <p className="text-[11px] text-slate-400">{note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTAs */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          onClick={() => navigate("/recommendations")}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-700 hover:bg-emerald-600 text-white text-[13px] font-semibold rounded-xl transition-colors"
        >
          <Leaf className="h-4 w-4" />
          Find matching strains
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => navigate("/info")}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[13px] font-semibold rounded-xl transition-colors"
        >
          <BookOpen className="h-4 w-4" />
          Learn more
        </button>
      </div>

      {/* Disclaimer */}
      <div className="flex gap-2.5 items-start bg-slate-50 border border-slate-200 rounded-xl px-3 py-3">
        <Info className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-500 leading-relaxed">
          This calculator provides evidence-based starting point guidance only. Individual response to cannabis varies widely. Always discuss with your prescribing physician before adjusting your treatment plan.
        </p>
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const DosageCalculatorPage = () => {
  const navigate = useNavigate();
  const { patientProfile } = useAppState();
  const resultRef = useRef<HTMLDivElement>(null);

  // Form state
  const [weight,       setWeight]       = useState(patientProfile?.age ? "" : "");
  const [experience,   setExperience]   = useState<ExperienceLevel | "">("");
  const [method,       setMethod]       = useState<ConsumptionMethod | "">("");
  const [age,          setAge]          = useState(patientProfile?.age?.toString() ?? "");
  const [hasAnxiety,   setHasAnxiety]   = useState(
    patientProfile?.medicalConditions?.toLowerCase().includes("anxiety") ?? false
  );
  const [hasHeart,     setHasHeart]     = useState(false);

  const [result, setResult] = useState<DosageResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const canCalculate = weight && experience && method && age;

  const handleCalculate = () => {
    const e: Record<string, string> = {};
    if (!weight)     e.weight     = "Required";
    if (!age)        e.age        = "Required";
    if (!experience) e.experience = "Select experience level";
    if (!method)     e.method     = "Select a method";
    if (Object.keys(e).length) { setErrors(e); return; }

    const r = calculate(
      parseFloat(weight),
      experience as ExperienceLevel,
      method as ConsumptionMethod,
      parseInt(age),
      hasAnxiety,
      hasHeart,
    );
    setResult(r);
    setErrors({});
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  const handleReset = () => {
    setWeight(""); setExperience(""); setMethod("");
    setAge(""); setHasAnxiety(false); setHasHeart(false);
    setResult(null); setErrors({});
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-2 animate-in fade-in duration-500">

      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-700 border border-teal-100 text-[11px] font-semibold rounded-full px-3 py-1 mb-3 uppercase tracking-wide">
          <Scale className="h-3 w-3" />
          Dosage calculator
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1.5">
          Starting dose estimator
        </h1>
        <p className="text-[14px] text-slate-500 leading-relaxed max-w-lg">
          Evidence-based starting doses tailored to your body weight, experience level, and consumption method.
        </p>
      </div>

      {/* Form card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-6">

        {/* Weight + Age */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
              <Scale className="h-3.5 w-3.5 text-slate-400" /> Body weight (kg)
            </label>
            <input
              type="number" min="30" max="200" placeholder="e.g. 72"
              value={weight}
              onChange={(e) => { setWeight(e.target.value); setResult(null); }}
              className={`w-full h-10 px-3 rounded-xl border text-[14px] outline-none transition-colors focus:ring-2 focus:ring-emerald-400/40 ${errors.weight ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50 focus:bg-white"}`}
            />
            {errors.weight && <p className="text-[11px] text-red-500">{errors.weight}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-slate-600 uppercase tracking-wide">
              Age
            </label>
            <input
              type="number" min="18" max="100" placeholder="e.g. 45"
              value={age}
              onChange={(e) => { setAge(e.target.value); setResult(null); }}
              className={`w-full h-10 px-3 rounded-xl border text-[14px] outline-none transition-colors focus:ring-2 focus:ring-emerald-400/40 ${errors.age ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50 focus:bg-white"}`}
            />
            {errors.age && <p className="text-[11px] text-red-500">{errors.age}</p>}
          </div>
        </div>

        {/* Experience level */}
        <div className="space-y-2">
          <label className="text-[12px] font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-slate-400" /> Prior cannabis experience
          </label>
          {errors.experience && <p className="text-[11px] text-red-500">{errors.experience}</p>}
          <div className="grid grid-cols-2 gap-2">
            {EXPERIENCE_OPTS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => { setExperience(opt.id); setResult(null); }}
                className={`flex items-start gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${
                  experience === opt.id
                    ? opt.color + " border-current shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {experience === opt.id
                  ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  : <div className="w-4 h-4 rounded-full border-2 border-current opacity-30 shrink-0 mt-0.5" />
                }
                <div>
                  <p className="text-[13px] font-semibold leading-tight">{opt.label}</p>
                  <p className="text-[11px] opacity-70 mt-0.5">{opt.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Consumption method */}
        <div className="space-y-2">
          <label className="text-[12px] font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
            <Wind className="h-3.5 w-3.5 text-slate-400" /> Consumption method
          </label>
          {errors.method && <p className="text-[11px] text-red-500">{errors.method}</p>}
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map((m) => {
              const Icon = m.icon;
              const isActive = method === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => { setMethod(m.id); setResult(null); }}
                  className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all ${
                    isActive
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {m.badge && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full whitespace-nowrap">
                      {m.badge}
                    </span>
                  )}
                  <Icon className={`h-5 w-5 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                  <p className="text-[12px] font-semibold leading-tight">{m.label}</p>
                  <p className="text-[10px] opacity-60 leading-tight">{m.sub}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Condition flags */}
        <div className="space-y-2">
          <label className="text-[12px] font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> Medical considerations
            <span className="font-normal text-slate-400 normal-case">(optional)</span>
          </label>
          <div className="flex flex-col gap-2">
            {[
              { id: "anxiety", label: "Anxiety or panic disorder", sub: "Lowers THC cap, increases CBD floor", val: hasAnxiety, set: setHasAnxiety },
              { id: "heart",   label: "Cardiac condition",         sub: "Adds safety warning",                 val: hasHeart,   set: setHasHeart   },
            ].map(({ id, label, sub, val, set }) => (
              <button
                key={id}
                onClick={() => { set(!val); setResult(null); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                  val
                    ? "border-rose-300 bg-rose-50 text-rose-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${val ? "bg-rose-500 border-rose-500" : "border-slate-300"}`}>
                  {val && <CheckCircle2 className="h-3 w-3 text-white" />}
                </div>
                <div>
                  <p className="text-[13px] font-semibold">{label}</p>
                  <p className="text-[11px] opacity-60">{sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleCalculate}
          disabled={!canCalculate}
          className={`w-full h-12 rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 transition-all ${
            canCalculate
              ? "bg-emerald-700 hover:bg-emerald-600 text-white shadow-sm hover:shadow"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          }`}
        >
          <Scale className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
          Calculate starting dose
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Result */}
      {result && (
        <div ref={resultRef}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-bold text-slate-900">Your personalised dose</h2>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-700 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
          <ResultPanel result={result} method={method as ConsumptionMethod} />
        </div>
      )}
    </div>
  );
};

export default DosageCalculatorPage;
