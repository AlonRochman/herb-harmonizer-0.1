import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "@/context/AppContext";
import {
  Scale, Zap, Droplets, Wind, Pill, Leaf,
  ChevronRight, AlertCircle, Info,
  Clock, Timer, TrendingUp, ShieldCheck, BookOpen,
  RotateCcw, ArrowRight, CheckCircle2,
} from "lucide-react";

// ─── Shared field styling ─────────────────────────────────────────────────────
const fieldCls =
  "h-10 w-full border px-3 font-data text-[14px] text-ink outline-none transition-colors " +
  "placeholder:text-ink/25 focus:border-ink/40 focus:ring-1 focus:ring-ink/20";

const labelCls =
  "flex items-center gap-1.5 font-data text-[10px] uppercase tracking-[0.14em] text-ink/45";

const sectionCls = "font-data text-[10px] uppercase tracking-[0.14em] text-ink/40";
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

// Experience level is a nominal category, not a measurement — the old
// slate/teal/amber/violet ramp implied an ordered clinical scale it does not
// have, and two of its hues were resin and clinic at a glance. Selection is
// carried by ink weight instead.
const EXPERIENCE_OPTS: { id: ExperienceLevel; label: string; sub: string }[] = [
  { id: "none",        label: "None",        sub: "Never used cannabis"      },
  { id: "low",         label: "Low",         sub: "A few times, months ago"  },
  { id: "moderate",    label: "Moderate",    sub: "Regular use in past year" },
  { id: "experienced", label: "Experienced", sub: "Current regular user"     },
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

      {/* Primary dose — the one figure this page exists to produce */}
      <div className="bg-ink p-5 text-paper">
        <p className="mb-2 font-data text-[10px] uppercase tracking-[0.2em] text-paper/50">
          Recommended starting dose
        </p>
        <p className="font-data text-[34px] font-semibold leading-none tracking-tight">
          {result.startDose}
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-paper/70">
          {result.frequency}
        </p>
      </div>

      {/* Kinetics row — times are measured values, so mono */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Clock,      label: "Onset",    value: result.onsetTime    },
          { icon: Timer,      label: "Duration", value: result.duration     },
          { icon: TrendingUp, label: "Titrate",  value: result.titrationStep },
        ].map(({ icon: Icon, label, value }) => (
          <AnimatedBadge key={label} color="">
            <div className="border border-rule bg-white p-3 text-center">
              <Icon className="mx-auto mb-1 h-3.5 w-3.5 text-ink/35" />
              <p className="mb-0.5 font-data text-[9px] uppercase tracking-[0.12em] text-ink/40">{label}</p>
              <p className="font-data text-[12px] font-semibold leading-tight text-ink">{value}</p>
            </div>
          </AnimatedBadge>
        ))}
      </div>

      {/* Strain guidance — the only two cannabinoid figures on this page */}
      <div className="space-y-3 border border-rule bg-white p-4">
        <p className={sectionCls}>Strain guidance based on your profile</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between font-data text-[11px]">
              <span className="uppercase tracking-[0.1em] text-resin">Max THC</span>
              <span className="font-semibold text-resin">{result.thcCap}%</span>
            </div>
            <div className="h-[3px] bg-rule">
              <div className="h-full bg-resin transition-all duration-700"
                style={{ width: `${(result.thcCap / 30) * 100}%` }} />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between font-data text-[11px]">
              <span className="uppercase tracking-[0.1em] text-clinic">Min CBD</span>
              <span className="font-semibold text-clinic">{result.cbdFloor}%</span>
            </div>
            <div className="h-[3px] bg-rule">
              <div className="h-full bg-clinic transition-all duration-700"
                style={{ width: `${(result.cbdFloor / 20) * 100}%` }} />
            </div>
          </div>
        </div>
        <p className="text-[12px] leading-relaxed text-ink/55">
          Guidance only. Recommendations are filtered against the THC/CBD limits on
          your licence, not against these figures — bring them to your doctor if you
          think your licensed window should change.
        </p>
      </div>

      {/* Warnings — genuine safety risk, which is what flag is for */}
      {result.warnings.length > 0 && (
        <div className="space-y-2">
          <p className={sectionCls}>Safety notes</p>
          {result.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2.5 border border-flag/40 border-l-2 border-l-flag bg-flag/5 px-3 py-2.5">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-flag" />
              <p className="text-[12px] leading-relaxed text-flag">{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tips */}
      <div className="space-y-2">
        <p className={sectionCls}>Practical tips</p>
        <div className="divide-y divide-rule border border-rule bg-white">
          {result.tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-2.5 px-3 py-2.5">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink/40" />
              <p className="text-[12px] leading-relaxed text-ink/65">{tip}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Titration schedule */}
      <div className="border border-rule bg-white p-4">
        <p className={`${sectionCls} mb-3`}>Titration schedule</p>
        <div className="relative">
          <div className="absolute bottom-0 left-[3px] top-0 w-px bg-rule" />
          {[
            { week: "Week 1",    dose: result.startDose,            note: "Baseline — observe effects carefully" },
            { week: "Week 2–3",  dose: `+ ${result.titrationStep}`, note: `Only if week 1 was well tolerated` },
            { week: "Ongoing",   dose: "Adjust with physician",     note: "Review every 4–8 weeks" },
          ].map(({ week, dose, note }, i) => (
            <div key={i} className="relative mb-3 flex gap-4 pl-6 last:mb-0">
              <span className="absolute left-0 top-1.5 h-[7px] w-[7px] bg-ink" />
              <div>
                <p className="font-data text-[10px] uppercase tracking-[0.12em] text-ink/45">{week}</p>
                <p className="font-data text-[13px] font-semibold text-ink">{dose}</p>
                <p className="text-[11px] text-ink/45">{note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTAs */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          onClick={() => navigate("/recommendations")}
          className="flex h-10 items-center justify-center gap-2 bg-ink font-data text-[10px] uppercase tracking-[0.12em] text-paper transition-colors hover:bg-ink/85"
        >
          <Leaf className="h-3.5 w-3.5" />
          Find matching strains
          <ArrowRight className="h-3 w-3" />
        </button>
        <button
          onClick={() => navigate("/info")}
          className="flex h-10 items-center justify-center gap-2 border border-rule bg-white font-data text-[10px] uppercase tracking-[0.12em] text-ink/65 transition-colors hover:border-ink/35 hover:text-ink"
        >
          <BookOpen className="h-3.5 w-3.5" />
          Learn more
        </button>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2.5 border border-rule bg-white px-3 py-3">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink/35" />
        <p className="text-[11px] leading-relaxed text-ink/50">
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
    <div className="mx-auto max-w-2xl py-2 animate-in fade-in duration-500">

      {/* ── MASTHEAD ─────────────────────────────────────────────────────── */}
      <header className="mb-6 border-b-2 border-ink pb-5">
        <p className="font-data text-[10px] uppercase tracking-[0.2em] text-ink/45">
          Dosage · guidance only
        </p>
        <h1 className="mt-2 flex items-center gap-2 font-display text-[26px] font-semibold leading-tight tracking-tight text-ink">
          <Scale className="h-5 w-5 shrink-0 text-ink/40" />
          Starting dose estimator
        </h1>
        <p className="mt-1 max-w-lg text-[13px] leading-relaxed text-ink/50">
          Evidence-based starting doses tailored to your body weight, experience level, and consumption method.
        </p>
      </header>

      <div className="space-y-6">

      {/* Form */}
      <div className="space-y-6 border border-rule bg-white p-5">

        {/* Weight + Age */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={labelCls}>
              <Scale className="h-3 w-3 text-ink/35" /> Body weight (kg)
            </label>
            <input
              type="number" min="30" max="200" placeholder="e.g. 72"
              value={weight}
              onChange={(e) => { setWeight(e.target.value); setResult(null); }}
              className={`${fieldCls} ${errors.weight ? "border-flag bg-flag/5" : "border-rule bg-white"}`}
            />
            {errors.weight && <p className="font-data text-[10px] uppercase tracking-[0.1em] text-flag">{errors.weight}</p>}
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Age</label>
            <input
              type="number" min="18" max="100" placeholder="e.g. 45"
              value={age}
              onChange={(e) => { setAge(e.target.value); setResult(null); }}
              className={`${fieldCls} ${errors.age ? "border-flag bg-flag/5" : "border-rule bg-white"}`}
            />
            {errors.age && <p className="font-data text-[10px] uppercase tracking-[0.1em] text-flag">{errors.age}</p>}
          </div>
        </div>

        {/* Experience level */}
        <div className="space-y-2">
          <label className={labelCls}>
            <TrendingUp className="h-3 w-3 text-ink/35" /> Prior cannabis experience
          </label>
          {errors.experience && <p className="font-data text-[10px] uppercase tracking-[0.1em] text-flag">{errors.experience}</p>}
          <div className="grid grid-cols-2 gap-2">
            {EXPERIENCE_OPTS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => { setExperience(opt.id); setResult(null); }}
                className={`flex items-start gap-2.5 border p-3 text-left transition-colors ${
                  experience === opt.id
                    ? "border-ink bg-ink text-paper"
                    : "border-rule bg-white text-ink/65 hover:border-ink/35"
                }`}
              >
                {experience === opt.id
                  ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  : <span className="mt-0.5 h-4 w-4 shrink-0 border border-rule" />
                }
                <span>
                  <span className="block text-[13px] font-semibold leading-tight">{opt.label}</span>
                  <span className="mt-0.5 block text-[11px] opacity-70">{opt.sub}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Consumption method */}
        <div className="space-y-2">
          <label className={labelCls}>
            <Wind className="h-3 w-3 text-ink/35" /> Consumption method
          </label>
          {errors.method && <p className="font-data text-[10px] uppercase tracking-[0.1em] text-flag">{errors.method}</p>}
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map((m) => {
              const Icon = m.icon;
              const isActive = method === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => { setMethod(m.id); setResult(null); }}
                  className={`relative flex flex-col items-center gap-1.5 border p-3 text-center transition-colors ${
                    isActive
                      ? "border-ink bg-ink text-paper"
                      : "border-rule bg-white text-ink/65 hover:border-ink/35"
                  }`}
                >
                  {m.badge && (
                    <span className={`absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap border px-1.5 py-0.5 font-data text-[8px] uppercase tracking-[0.1em] ${
                      isActive ? "border-paper/40 bg-ink text-paper" : "border-rule bg-white text-ink/50"
                    }`}>
                      {m.badge}
                    </span>
                  )}
                  <Icon className={`h-4 w-4 ${isActive ? "text-paper" : "text-ink/35"}`} />
                  <p className="text-[12px] font-semibold leading-tight">{m.label}</p>
                  <p className="text-[10px] leading-tight opacity-60">{m.sub}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Condition flags — selecting one tightens the THC cap, so flag */}
        <div className="space-y-2">
          <label className={labelCls}>
            <ShieldCheck className="h-3 w-3 text-ink/35" /> Medical considerations
            <span className="font-normal normal-case tracking-normal text-ink/30">optional</span>
          </label>
          <div className="flex flex-col gap-2">
            {[
              { id: "anxiety", label: "Anxiety or panic disorder", sub: "Lowers THC cap, increases CBD floor", val: hasAnxiety, set: setHasAnxiety },
              { id: "heart",   label: "Cardiac condition",         sub: "Adds safety warning",                 val: hasHeart,   set: setHasHeart   },
            ].map(({ id, label, sub, val, set }) => (
              <button
                key={id}
                onClick={() => { set(!val); setResult(null); }}
                className={`flex items-center gap-3 border px-4 py-3 text-left transition-colors ${
                  val
                    ? "border-flag/50 bg-flag/5 text-flag"
                    : "border-rule bg-white text-ink/65 hover:border-ink/35"
                }`}
              >
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
                  val ? "border-flag bg-flag" : "border-rule"
                }`}>
                  {val && <CheckCircle2 className="h-3 w-3 text-white" />}
                </span>
                <span>
                  <span className="block text-[13px] font-semibold">{label}</span>
                  <span className="block text-[11px] opacity-60">{sub}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleCalculate}
          disabled={!canCalculate}
          className={`flex h-11 w-full items-center justify-center gap-2 font-data text-[11px] uppercase tracking-[0.12em] transition-colors ${
            canCalculate
              ? "bg-ink text-paper hover:bg-ink/85"
              : "cursor-not-allowed bg-rule/50 text-ink/30"
          }`}
        >
          <Scale className="h-3.5 w-3.5" />
          Calculate starting dose
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Result */}
      {result && (
        <div ref={resultRef}>
          <div className="mb-4 flex items-center justify-between border-b border-rule pb-2">
            <h2 className="font-data text-[10px] uppercase tracking-[0.14em] text-ink/55">
              Your personalised dose
            </h2>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 font-data text-[10px] uppercase tracking-[0.1em] text-ink/45 transition-colors hover:text-ink"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          </div>
          <ResultPanel result={result} method={method as ConsumptionMethod} />
        </div>
      )}
      </div>
    </div>
  );
};

export default DosageCalculatorPage;
