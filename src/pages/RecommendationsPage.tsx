import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { read, readOr } from "@/lib/supabaseRead";
import { useAppState } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle, CheckCircle2, X, Loader2, ClipboardList, ArrowRight,
} from "lucide-react";
import {
  fetchFeedbackIndex, fetchConditionIndex, scoreStrains, persistRecommendations,
} from "@/lib/recommendationEngine";
import type { ScoredStrain } from "@/lib/recommendationEngine";

// ─── Motion preference ────────────────────────────────────────────────────────
const useReducedMotion = () => {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const h = () => setReduced(mq.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return reduced;
};

// ─── Chemotype maths ──────────────────────────────────────────────────────────
// Position on the CBD↔THC axis is the real chemotype ratio, not an invented score.
const chemotypePosition = (thc: number, cbd: number) => {
  const total = (thc ?? 0) + (cbd ?? 0);
  return total <= 0 ? 0.5 : (thc ?? 0) / total;
};

// Constraint values arrive as raw doubles (e.g. 5.68691800470861%). Never show
// more precision than a licence actually carries.
const pctFmt = (n: number | null): string => {
  if (n === null || Number.isNaN(n)) return "—";
  const r = Math.round(n * 10) / 10;
  return `${Number.isInteger(r) ? r : r.toFixed(1)}%`;
};

const chemotypeLabel = (pos: number) =>
  pos >= 0.7 ? "Type I · THC-dominant"
  : pos >= 0.3 ? "Type II · balanced"
  : "Type III · CBD-dominant";

// ─── SIGNATURE: chemotype axis + licence headroom ────────────────────────────
// The axis places the strain on the real CBD↔THC chemotype ratio, so the three
// cards can be compared at a glance. Underneath, the headroom meter answers the
// question a licensed patient actually asks: how close is this to my limit?
const ChemotypeAxis = ({
  thc, cbd, thcMax, cbdMin, animate,
}: {
  thc: number; cbd: number;
  thcMax: number | null; cbdMin: number | null; animate: boolean;
}) => {
  const pos = chemotypePosition(thc, cbd);
  const used = thcMax !== null && thcMax > 0 ? Math.min((thc ?? 0) / thcMax, 1) : null;
  const meetsFloor = cbdMin !== null ? (cbd ?? 0) >= cbdMin : null;

  return (
    <div className="pt-1">
      <div className="flex items-baseline justify-between mb-2.5">
        <span className="font-data text-[10px] font-medium uppercase tracking-[0.14em] text-ink/40">
          Chemotype
        </span>
        <span className="font-data text-[10px] font-medium text-ink/55">
          {chemotypeLabel(pos)}
        </span>
      </div>

      {/* the ratio axis */}
      <div className="relative h-6">
        <div className="absolute left-0 right-0 top-[15px] h-px bg-rule" />
        <div
          className="absolute top-[8px] h-[15px] w-[2px] bg-ink"
          style={{
            left: `${Math.min(Math.max(pos, 0), 1) * 100}%`,
            transform: "translateX(-1px)",
            transition: animate ? "left 900ms cubic-bezier(0.22,1,0.36,1)" : "none",
          }}
        />
        <span className="absolute left-0 top-0 font-data text-[9px] uppercase tracking-wider text-clinic">CBD</span>
        <span className="absolute right-0 top-0 font-data text-[9px] uppercase tracking-wider text-resin">THC</span>
      </div>

      {/* licence headroom — one row per cannabinoid, mono so digits align */}
      <div className="mt-3 space-y-1.5 font-data text-[11px]">
        <div className="flex items-center gap-2.5">
          <span className="text-resin w-[68px] shrink-0">
            THC <span className="font-semibold">{(thc ?? 0).toFixed(1)}%</span>
          </span>
          {used !== null ? (
            <>
              <span className="flex-1 h-[3px] bg-rule relative">
                <span
                  className={`absolute inset-y-0 left-0 ${used >= 0.9 ? "bg-flag" : "bg-resin"}`}
                  style={{
                    width: `${used * 100}%`,
                    transition: animate ? "width 800ms cubic-bezier(0.22,1,0.36,1) 120ms" : "none",
                  }}
                />
              </span>
              <span className={`shrink-0 ${used >= 0.9 ? "text-flag" : "text-ink/40"}`}>
                {Math.round(used * 100)}% of {pctFmt(thcMax)} ceiling
              </span>
            </>
          ) : (
            <span className="text-ink/30">no ceiling on your licence</span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-clinic w-[68px] shrink-0">
            CBD <span className="font-semibold">{(cbd ?? 0).toFixed(1)}%</span>
          </span>
          <span className={meetsFloor === false ? "text-flag" : "text-ink/40"}>
            {meetsFloor === null
              ? "no floor on your licence"
              : meetsFloor
                ? `meets your ${pctFmt(cbdMin)} floor`
                : `below your ${pctFmt(cbdMin)} floor`}
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Evidence ladder ─────────────────────────────────────────────────────────
// Parses the engine's rationale strings into indication / grade so the grade can
// be set in mono and right-aligned, the way a guideline table reads.
const GRADE_WEIGHT: Record<string, string> = {
  strong: "text-ink font-semibold",
  moderate: "text-ink/70 font-medium",
  anecdotal: "text-ink/45",
};

const EvidenceLadder = ({ reasons }: { reasons: string[] }) => {
  // Feedback-derived lines live in Reported outcomes; showing them here too
  // would state the same number twice.
  const clinical = reasons.filter((r) => !/\d\/5,|\breports\)/i.test(r));
  if (clinical.length === 0) return null;
  const parsed = clinical.map((r) => {
    const m = r.match(/^(Primary|Secondary) indication:\s*(.+?)\s*\((strong|moderate|anecdotal) evidence\)$/i);
    if (m) return { label: m[2], rank: m[1].toLowerCase(), grade: m[3].toLowerCase() };
    return { label: r, rank: null as string | null, grade: null as string | null };
  });

  return (
    <div className="pt-1">
      <span className="font-data text-[10px] font-medium uppercase tracking-[0.14em] text-ink/40">
        Why this strain
      </span>
      <ul className="mt-2 border-l border-rule">
        {parsed.map((p, i) => (
          <li key={i} className="flex items-baseline gap-3 pl-3 py-[5px]">
            <span className="flex-1 text-[13px] leading-snug text-ink/80">
              {p.rank ? <span className="capitalize">{p.label}</span> : p.label}
            </span>
            {p.rank && (
              <span className="font-data text-[9px] uppercase tracking-wider text-ink/35 shrink-0">
                {p.rank}
              </span>
            )}
            {p.grade && (
              <span className={`font-data text-[10px] shrink-0 ${GRADE_WEIGHT[p.grade]}`}>
                {p.grade}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

// ─── Reported outcomes ───────────────────────────────────────────────────────
const Outcomes = ({ strain }: { strain: ScoredStrain }) => {
  const has = strain.feedbackCount > 0 && strain.avgEffectiveness !== null;
  return (
    <div className="pt-1">
      <div className="flex items-baseline justify-between">
        <span className="font-data text-[10px] font-medium uppercase tracking-[0.14em] text-ink/40">
          Reported outcomes
        </span>
        {has ? (
          <span className="font-data text-[11px] text-ink/70">
            <span className="font-semibold text-ink">{strain.avgEffectiveness!.toFixed(1)}</span>
            <span className="text-ink/35">/5</span>
            <span className="text-ink/35"> · {strain.feedbackCount} rated</span>
          </span>
        ) : (
          <span className="font-data text-[10px] text-ink/30">not yet rated</span>
        )}
      </div>
      {has && (
        <div className="mt-2 flex gap-[3px]" aria-hidden>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`h-[3px] flex-1 ${
                i <= Math.round(strain.avgEffectiveness!) ? "bg-ink/70" : "bg-rule"
              }`}
            />
          ))}
        </div>
      )}
      {has && (strain.sideEffectRate ?? 0) > 0.3 && (
        <p className="mt-1.5 font-data text-[10px] text-flag">
          side effects in {Math.round((strain.sideEffectRate ?? 0) * 100)}% of reports
        </p>
      )}
    </div>
  );
};

// ─── Terpenes ────────────────────────────────────────────────────────────────
const parseTerpenes = (strain: ScoredStrain): string[] => {
  try {
    if (strain.terpenes) {
      const p = typeof strain.terpenes === "string" ? JSON.parse(strain.terpenes) : strain.terpenes;
      if (Array.isArray(p)) return p as string[];
    }
  } catch {}
  if (strain.terpenes_profile)
    return strain.terpenes_profile.split(",").map((t) => t.trim()).filter(Boolean);
  return [];
};

const TERPENE_EFFECT: Record<string, string> = {
  myrcene:       "sedating, muscle relaxant",
  linalool:      "calming, anxiolytic",
  limonene:      "mood-elevating",
  caryophyllene: "anti-inflammatory",
  pinene:        "alertness, memory",
  terpinolene:   "energising",
  humulene:      "appetite suppressant",
};

const Terpenes = ({ names }: { names: string[] }) => {
  if (names.length === 0) return null;
  return (
    <div className="pt-1">
      <span className="font-data text-[10px] font-medium uppercase tracking-[0.14em] text-ink/40">
        Terpenes
      </span>
      <dl className="mt-1.5 space-y-1">
        {names.map((n) => (
          <div key={n} className="flex items-baseline gap-2 text-[12px]">
            <dt className="font-data text-ink/75 lowercase">{n}</dt>
            <dd className="text-ink/40">{TERPENE_EFFECT[n.toLowerCase()] ?? "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

// ─── Log a session ───────────────────────────────────────────────────────────
const METHODS = ["Vaporizer", "Oil drops", "Capsules", "Smoking", "Edibles", "Topical"];

const LogSessionModal = ({
  strain, patientId, onClose, onSaved,
}: {
  strain: ScoredStrain; patientId: string;
  onClose: () => void; onSaved: (usageId: string) => void;
}) => {
  const [dosage, setDosage] = useState("");
  const [method, setMethod] = useState("Vaporizer");
  const [date, setDate]     = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const save = async () => {
    if (!dosage.trim()) { setError("Enter the dose you took, for example 0.2g or 3 drops."); return; }
    setSaving(true); setError("");
    const { data, error: err } = await supabase
      .from("usage_records")
      .insert({
        patient_id: patientId, strain_id: strain.id,
        dosage: dosage.trim(), consumption_method: method, usage_date: date,
      })
      .select("id").single();
    if (err || !data) {
      setError(err?.message ?? "The session did not save. Try again.");
      setSaving(false);
      return;
    }
    onSaved(data.id);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog" aria-modal="true" aria-label={`Log a session with ${strain.name}`}
    >
      <div className="bg-white w-full max-w-sm border border-rule">
        <div className="flex items-center justify-between px-5 py-4 border-b border-rule">
          <div>
            <p className="font-data text-[10px] uppercase tracking-[0.14em] text-ink/40">Log a session</p>
            <p className="text-[15px] font-display font-semibold text-ink mt-0.5">{strain.name}</p>
          </div>
          <button
            onClick={onClose} aria-label="Close"
            className="p-1.5 text-ink/40 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {error && (
            <p className="font-data text-[11px] text-flag border-l-2 border-flag pl-2.5">{error}</p>
          )}

          <label className="block">
            <span className="font-data text-[10px] uppercase tracking-[0.14em] text-ink/40">Date</span>
            <input
              type="date" value={date} max={new Date().toISOString().split("T")[0]}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1.5 w-full h-10 px-3 border border-rule bg-paper font-data text-[13px] text-ink outline-none focus-visible:border-ink"
            />
          </label>

          <label className="block">
            <span className="font-data text-[10px] uppercase tracking-[0.14em] text-ink/40">Dose</span>
            <input
              type="text" placeholder="0.2g · 3 drops · 1 capsule" value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              className="mt-1.5 w-full h-10 px-3 border border-rule bg-paper font-data text-[13px] text-ink placeholder:text-ink/25 outline-none focus-visible:border-ink"
            />
          </label>

          <fieldset>
            <legend className="font-data text-[10px] uppercase tracking-[0.14em] text-ink/40">Method</legend>
            <div className="mt-1.5 grid grid-cols-3 gap-px bg-rule border border-rule">
              {METHODS.map((m) => (
                <button
                  key={m} onClick={() => setMethod(m)}
                  aria-pressed={method === m}
                  className={`py-2 px-1 text-[11px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink ${
                    method === m ? "bg-ink text-paper" : "bg-white text-ink/60 hover:bg-paper"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 h-10 border border-rule text-[13px] text-ink/60 hover:bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
          >
            Cancel
          </button>
          <button
            onClick={save} disabled={saving}
            className="flex-1 h-10 bg-ink text-paper text-[13px] font-medium disabled:opacity-50 flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? "Saving" : "Save session"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Rate a session ──────────────────────────────────────────────────────────
const SIDE_EFFECTS = ["None", "Dry mouth", "Dizziness", "Fatigue", "Nausea", "Anxiety", "Headache", "Sleepiness"];
const RELIEF = ["", "No relief", "Slight", "Moderate", "Significant", "Full relief"];

const RateSession = ({
  usageId, strainName, onDone,
}: { usageId: string; strainName: string; onDone: () => void }) => {
  const [score, setScore] = useState(0);
  const [effects, setEffects] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggle = (item: string) => {
    if (item === "None") { setEffects(["None"]); return; }
    const next = effects.filter((s) => s !== "None");
    setEffects(next.includes(item) ? next.filter((s) => s !== item) : [...next, item]);
  };

  const save = async () => {
    if (score === 0)        { setError("Choose how much relief you felt, from 1 to 5."); return; }
    if (!effects.length)    { setError("Choose a side effect, or None."); return; }
    setSaving(true); setError("");
    const { error: err } = await supabase.from("feedback").insert({
      usage_id: usageId, effectiveness_score: score,
      side_effects: effects.join(", "), comments: notes,
    });
    if (err) {
      setError("The rating did not save. Try again.");
      setSaving(false);
      return;
    }
    onDone();
  };

  return (
    <div className="border-t border-rule bg-paper px-5 py-4 space-y-4">
      <p className="font-data text-[10px] uppercase tracking-[0.14em] text-ink/45">
        Rate {strainName}
      </p>

      {error && <p className="font-data text-[11px] text-flag border-l-2 border-flag pl-2.5">{error}</p>}

      <div>
        <span className="font-data text-[10px] uppercase tracking-[0.14em] text-ink/40">Relief</span>
        <div className="mt-1.5 flex items-center gap-px bg-rule border border-rule w-fit">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n} onClick={() => setScore(n)} aria-pressed={score === n}
              className={`w-10 h-9 font-data text-[13px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink ${
                score === n ? "bg-ink text-paper" : "bg-white text-ink/50 hover:bg-paper"
              }`}
            >
              {n}
            </button>
          ))}
          {score > 0 && (
            <span className="pl-3 text-[12px] text-ink/60 bg-transparent">{RELIEF[score]}</span>
          )}
        </div>
      </div>

      <div>
        <span className="font-data text-[10px] uppercase tracking-[0.14em] text-ink/40">Side effects</span>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {SIDE_EFFECTS.map((se) => {
            const on = effects.includes(se);
            return (
              <button
                key={se} onClick={() => toggle(se)} aria-pressed={on}
                className={`px-2.5 py-1 text-[11px] border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink ${
                  on
                    ? se === "None"
                      ? "border-ink bg-ink text-paper"
                      : "border-flag bg-flag/10 text-flag"
                    : "border-rule bg-white text-ink/55 hover:border-ink/30"
                }`}
              >
                {se}
              </button>
            );
          })}
        </div>
      </div>

      <label className="block">
        <span className="font-data text-[10px] uppercase tracking-[0.14em] text-ink/40">
          Note for your doctor
        </span>
        <textarea
          value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          placeholder="Optional"
          className="mt-1.5 w-full border border-rule bg-white px-3 py-2 text-[12px] text-ink placeholder:text-ink/25 outline-none focus-visible:border-ink resize-none"
        />
      </label>

      <div className="flex gap-2">
        <button
          onClick={save} disabled={saving}
          className="h-9 px-4 bg-ink text-paper text-[12px] font-medium disabled:opacity-50 flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {saving ? "Saving" : "Save rating"}
        </button>
        <button
          onClick={onDone}
          className="h-9 px-4 border border-rule text-[12px] text-ink/55 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
        >
          Later
        </button>
      </div>
    </div>
  );
};

// ─── Strain card ─────────────────────────────────────────────────────────────
const StrainCard = ({
  strain, rank, thcMax, cbdMin, patientId, revealDelay, reduced,
}: {
  strain: ScoredStrain; rank: number;
  thcMax: number | null; cbdMin: number | null;
  patientId: string; revealDelay: number; reduced: boolean;
}) => {
  const navigate = useNavigate();
  const [shown, setShown]       = useState(reduced);
  const [animate, setAnimate]   = useState(reduced);
  const [modal, setModal]       = useState(false);
  const [usageId, setUsageId]   = useState<string | null>(null);
  const [rating, setRating]     = useState(false);
  const [rated, setRated]       = useState(false);

  useEffect(() => {
    if (reduced) return;
    const a = setTimeout(() => setShown(true), revealDelay);
    const b = setTimeout(() => setAnimate(true), revealDelay + 220);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [revealDelay, reduced]);

  const lead = rank === 1;

  return (
    <>
      <article
        className={`bg-white border ${lead ? "border-ink" : "border-rule"} ${
          reduced ? "" : "transition-all duration-500"
        } ${shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
      >
        {/* Header: rank is an ordinal — these are genuinely ranked by fit */}
        <header
          className={`flex items-baseline gap-3 px-5 py-3 border-b ${
            lead ? "bg-ink border-ink" : "bg-white border-rule"
          }`}
        >
          <span className={`font-data text-[11px] font-medium ${lead ? "text-paper/50" : "text-ink/30"}`}>
            {String(rank).padStart(2, "0")}
          </span>
          <h2 className={`flex-1 font-display text-[17px] font-semibold leading-none ${lead ? "text-paper" : "text-ink"}`}>
            {strain.name}
          </h2>
          {strain.category && (
            <span className={`font-data text-[10px] uppercase tracking-wider ${lead ? "text-paper/55" : "text-ink/40"}`}>
              {strain.category}
            </span>
          )}
        </header>

        <div className="px-5 py-4 space-y-4">
          <ChemotypeAxis
            thc={strain.thc_level} cbd={strain.cbd_level}
            thcMax={thcMax} cbdMin={cbdMin} animate={animate}
          />
          <div className="h-px bg-rule" />
          <EvidenceLadder reasons={strain.reasons} />
          <Outcomes strain={strain} />
          <Terpenes names={parseTerpenes(strain)} />
          {strain.producer && (
            <p className="font-data text-[10px] text-ink/30 pt-1">Grown by {strain.producer}</p>
          )}
        </div>

        <footer className="px-5 pb-5 flex items-center gap-2">
          {rated ? (
            <p className="flex items-center gap-1.5 font-data text-[11px] text-ink/60">
              <CheckCircle2 className="h-3.5 w-3.5" /> Rating saved
            </p>
          ) : usageId && !rating ? (
            <button
              onClick={() => setRating(true)}
              className="h-9 px-4 border border-ink text-ink text-[12px] font-medium hover:bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Rate this session
            </button>
          ) : !usageId ? (
            <button
              onClick={() => setModal(true)}
              disabled={!patientId}
              title={patientId ? undefined : "Complete your profile to log sessions"}
              className="h-9 px-4 bg-ink text-paper text-[12px] font-medium flex items-center gap-2 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <ClipboardList className="h-3.5 w-3.5" /> Log a session
            </button>
          ) : null}
          <button
            onClick={() => navigate("/strains")}
            className="ml-auto font-data text-[11px] text-ink/45 hover:text-ink inline-flex items-center gap-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
          >
            Catalogue <ArrowRight className="h-3 w-3" />
          </button>
        </footer>

        {rating && usageId && !rated && (
          <RateSession
            usageId={usageId} strainName={strain.name}
            onDone={() => { setRating(false); setRated(true); }}
          />
        )}
      </article>

      {modal && patientId && (
        <LogSessionModal
          strain={strain} patientId={patientId}
          onClose={() => setModal(false)}
          onSaved={(id) => { setUsageId(id); setModal(false); setRating(true); }}
        />
      )}
    </>
  );
};

// ─── Skeleton ────────────────────────────────────────────────────────────────
const Skeleton = () => (
  <div className="bg-white border border-rule">
    <div className="px-5 py-3 border-b border-rule flex gap-3">
      <div className="h-3 w-5 bg-rule" />
      <div className="h-3 w-28 bg-rule" />
    </div>
    <div className="px-5 py-5 space-y-4">
      <div className="h-px bg-rule" />
      <div className="h-2 w-full bg-rule/60" />
      <div className="h-2 w-2/3 bg-rule/60" />
      <div className="h-2 w-1/2 bg-rule/60" />
    </div>
  </div>
);

// ─── Page ────────────────────────────────────────────────────────────────────
const RecommendationsPage = () => {
  const { currentUser, patientProfile } = useAppState();
  const reduced = useReducedMotion();

  const [loading, setLoading]         = useState(true);
  const [results, setResults]         = useState<ScoredStrain[]>([]);
  const [condition, setCondition]     = useState("");
  const [thcMax, setThcMax]           = useState<number | null>(null);
  const [cbdMin, setCbdMin]           = useState<number | null>(null);
  const [patientId, setPatientId]     = useState("");
  const [blocked, setBlocked]         = useState("");
  const [ratedCount, setRatedCount]   = useState(0);
  const [screened, setScreened]       = useState(0);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        let pid: string | null = null;
        let profile: Record<string, unknown> | null = null;
        // Tracks whether a profile read *failed*, as opposed to finding
        // nothing. The two must not be conflated: see the fallback below.
        let profileReadFailed = false;

        if (patientProfile?.patientId && patientProfile.patientId !== "manual") {
          pid = String(patientProfile.patientId);
          const r = await read<Record<string, unknown>>(
            "recommendations: profile for selected patient",
            supabase.from("patient_profiles").select("*")
              .eq("patient_id", pid).maybeSingle());
          profileReadFailed = profileReadFailed || r.failed;
          profile = r.data;
        }

        if (!profile && currentUser?.id && currentUser.id !== "demo-id") {
          const rowRes = await read<{ id: string }>(
            "recommendations: resolve own patient row",
            supabase.from("patients").select("id")
              .eq("user_id", currentUser.id).maybeSingle());
          profileReadFailed = profileReadFailed || rowRes.failed;
          if (rowRes.data?.id) {
            pid = rowRes.data.id;
            const r = await read<Record<string, unknown>>(
              "recommendations: own profile",
              supabase.from("patient_profiles").select("*")
                .eq("patient_id", pid).maybeSingle());
            profileReadFailed = profileReadFailed || r.failed;
            profile = r.data;
          }
        }

        let own = !!profile;
        // Demo fallback: show *some* seeded profile so the exhibition build has
        // something to display. Deliberately skipped when a read failed — it
        // would silently present another patient's clinical data as if it were
        // yours, which is the one outcome worse than an empty screen.
        if (!profile && !profileReadFailed) {
          const r = await read<Record<string, unknown>>(
            "recommendations: demo fallback profile",
            supabase.from("patient_profiles").select("*").limit(1).maybeSingle());
          profile = r.data;
          pid = (profile?.patient_id as string) ?? null;
          own = false;
        }

        if (!profile && profileReadFailed) {
          setBlocked(
            "Your clinical profile could not be loaded, so no recommendation was generated. This is a connection or permissions failure, not an empty profile — reload the page, and check the browser console if it persists.",
          );
          setResults([]);
          return;
        }
        if (pid && own) setPatientId(pid);

        const conditions = ((profile?.medical_conditions as string) ?? "").toLowerCase();
        const age = (profile?.age as number) ?? 40;
        setCondition((profile?.medical_conditions as string) || "");

        const [strainsRes, consRes, feedbackIndex, conditionIndex] = await Promise.all([
          readOr<any[]>("recommendations: strain catalogue", [],
            supabase.from("strains").select("*")),
          pid
            ? read<{ thc_max: number | null; cbd_min: number | null }>(
                "recommendations: clinical constraints",
                supabase.from("clinical_constraints").select("thc_max, cbd_min")
                  .eq("patient_id", pid).maybeSingle())
            : Promise.resolve({ data: null, failed: false }),
          fetchFeedbackIndex(conditions),
          fetchConditionIndex(),
        ]);
        const strains = strainsRes.data;
        const cons = consRes.data;

        // Constraints drive the safety filter. If that read failed we cannot
        // assert the licensed window holds, so we refuse rather than score
        // against limits we could not confirm.
        if (consRes.failed) {
          setBlocked(
            "Your licence limits could not be loaded, so no recommendation was generated. Recommending without confirming your THC ceiling would not be safe — reload the page to try again.",
          );
          setResults([]);
          return;
        }

        if (strainsRes.failed) {
          setBlocked(
            "The strain catalogue could not be loaded, so no recommendation was generated. This is a connection failure rather than an empty catalogue — reload the page to try again.",
          );
          setResults([]);
          return;
        }

        const tMax = (cons as any)?.thc_max ?? null;
        const cMin = (cons as any)?.cbd_min ?? null;
        setThcMax(tMax); setCbdMin(cMin);

        if (!strains?.length) return;
        setScreened(strains.length);

        const pool = strains.filter((s) => {
          if (tMax !== null && s.thc_level > tMax) return false;
          if (cMin !== null && s.cbd_level < cMin) return false;
          return true;
        });

        // Clinical safety: constraints are never silently bypassed.
        if (pool.length === 0) {
          setBlocked(
            `No strain in the catalogue sits inside your licensed window of THC ≤ ${pctFmt(tMax)} and CBD ≥ ${pctFmt(cMin)}. Ask your doctor to review the limits on your licence.`,
          );
          setResults([]);
          return;
        }
        setBlocked("");

        const scored = scoreStrains(pool, conditions, age, tMax, cMin, feedbackIndex, conditionIndex);
        const top = scored.filter((s) => s.matchScore > 0)
          .sort((a, b) => b.matchScore - a.matchScore).slice(0, 3);

        setRatedCount(top.filter((s) => s.feedbackCount > 0).length);
        setResults(top);

        if (pid && own) await persistRecommendations(pid, top);
      } catch (err) {
        console.error("Recommendation error:", err);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [currentUser, patientProfile]);

  return (
    <div className="max-w-xl mx-auto py-2">
      {/* Masthead — reads like the header of a clinical report */}
      <header className="pb-5 mb-6 border-b-2 border-ink">
        <p className="font-data text-[10px] uppercase tracking-[0.2em] text-ink/45">
          Decision support · rule-based
        </p>
        <h1 className="mt-2 font-display text-[26px] font-semibold leading-tight tracking-tight text-ink">
          Strains that fit your profile
        </h1>
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-data text-[11px]">
          {condition && (
            <div className="flex gap-2">
              <dt className="text-ink/40">Indication</dt>
              <dd className="text-ink/75 capitalize">{condition}</dd>
            </div>
          )}
          {(thcMax !== null || cbdMin !== null) && (
            <div className="flex gap-2">
              <dt className="text-ink/40">Licence</dt>
              <dd className="text-ink/75">
                {thcMax !== null && <span className="text-resin">THC ≤ {pctFmt(thcMax)}</span>}
                {thcMax !== null && cbdMin !== null && <span className="text-ink/30"> · </span>}
                {cbdMin !== null && <span className="text-clinic">CBD ≥ {pctFmt(cbdMin)}</span>}
              </dd>
            </div>
          )}
          {!loading && results.length > 0 && (
            <>
              <div className="flex gap-2">
                <dt className="text-ink/40">Matches</dt>
                <dd className="text-ink/75">
                  {results.length} of {screened} screened
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-ink/40">With patient reports</dt>
                <dd className="text-ink/75">{ratedCount}</dd>
              </div>
            </>
          )}
        </dl>
      </header>

      {loading ? (
        <div className="space-y-4"><Skeleton /><Skeleton /><Skeleton /></div>
      ) : blocked ? (
        <div className="border-l-2 border-flag pl-4 py-1">
          <p className="font-data text-[10px] uppercase tracking-[0.14em] text-flag">Outside your licence</p>
          <p className="mt-2 text-[14px] leading-relaxed text-ink/75">{blocked}</p>
        </div>
      ) : results.length === 0 ? (
        <div className="border-l-2 border-rule pl-4 py-1">
          <p className="font-data text-[10px] uppercase tracking-[0.14em] text-ink/40">Nothing to show yet</p>
          <p className="mt-2 text-[14px] leading-relaxed text-ink/75">
            The engine needs an indication to match against. Add one to your profile —
            chronic pain, anxiety and insomnia are the best supported today.
          </p>
          <a
            href="/patient-input"
            className="mt-3 inline-flex items-center gap-1.5 font-data text-[11px] text-ink underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
          >
            Edit your profile <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((s, i) => (
            <StrainCard
              key={s.id} strain={s} rank={i + 1}
              thcMax={thcMax} cbdMin={cbdMin}
              patientId={patientId} revealDelay={i * 140} reduced={reduced}
            />
          ))}
        </div>
      )}

      {!loading && results.length > 0 && (
        <footer className="mt-6 pt-4 border-t border-rule flex gap-3">
          <AlertCircle className="h-3.5 w-3.5 text-ink/35 shrink-0 mt-0.5" />
          <p className="text-[12px] leading-relaxed text-ink/50">
            These matches come from clinical rules and ratings other patients have submitted.
            They go to your doctor for approval before you act on them.
          </p>
        </footer>
      )}
    </div>
  );
};

export default RecommendationsPage;
