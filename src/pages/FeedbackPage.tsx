import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { read, readOr } from "@/lib/supabaseRead";
import LoadError from "@/components/LoadError";
import { useAppState } from "@/context/AppContext";
import { useIsDoctor } from "@/hooks/useIsDoctor";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, CheckCircle, AlertCircle, MessageSquare,
  Star, TrendingUp, Leaf, Clock, Users, History,
  ClipboardList, Stethoscope,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const SIDE_EFFECTS = [
  "None", "Dry mouth", "Dizziness", "Fatigue",
  "Nausea", "Anxiety", "Headache", "Increased appetite", "Sleepiness",
];

const SCORE_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "No relief",       color: "text-flag"    },
  2: { label: "Slight relief",   color: "text-flag/75" },
  3: { label: "Moderate relief", color: "text-ink/55"  },
  4: { label: "Significant",     color: "text-ink/75"  },
  5: { label: "Complete relief", color: "text-ink"     },
};

// ─── Score selector ───────────────────────────────────────────────────────────
const ScoreSelector = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <div className="space-y-2">
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`relative flex h-12 w-12 flex-col items-center justify-center gap-0.5 border transition-all ${
            value === n
              ? "border-ink bg-ink text-paper"
              : "border-rule bg-white text-ink/40 hover:border-ink/40 hover:text-ink/70"
          }`}>
          <Star className={`h-4 w-4 ${value === n ? "fill-paper" : "fill-none"}`} />
          <span className="font-data text-[10px] font-semibold leading-none">{n}</span>
        </button>
      ))}
    </div>
    {value > 0 && (
      <p className={`font-data text-[11px] uppercase tracking-[0.1em] ${SCORE_LABELS[value].color}`}>
        {SCORE_LABELS[value].label}
      </p>
    )}
  </div>
);

// ─── Side effect picker ───────────────────────────────────────────────────────
const SideEffectPicker = ({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) => {
  const toggle = (item: string) => {
    if (item === "None") { onChange(["None"]); return; }
    const next = selected.filter((s) => s !== "None");
    onChange(next.includes(item) ? next.filter((s) => s !== item) : [...next, item]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {SIDE_EFFECTS.map((se) => {
        const active = selected.includes(se);
        return (
          <button key={se} type="button" onClick={() => toggle(se)}
            className={`border px-3 py-1.5 text-[12px] font-medium transition-all ${
              active
                ? se === "None"
                  ? "border-ink/30 bg-paper text-ink"
                  : "border-flag/40 bg-flag/5 text-flag"
                : "border-rule bg-white text-ink/55 hover:border-ink/30"
            }`}>{se}
          </button>
        );
      })}
    </div>
  );
};

// ─── Helper: star display ─────────────────────────────────────────────────────
const StarRow = ({ score }: { score: number }) => (
  <div className="flex gap-0.5">
    {[1,2,3,4,5].map((i) => (
      <Star key={i} className={`h-3.5 w-3.5 ${i <= score ? "text-ink fill-ink" : "text-rule fill-rule"}`} />
    ))}
  </div>
);

// ─── Resolve patient_id from current user ─────────────────────────────────────
async function resolvePatientId(userId: string): Promise<string | null> {
  if (!userId || userId === "demo-id") return null;
  const { data } = await read<{ id: string }>(
    "feedback: resolve patient for current user",
    supabase.from("patients").select("id")
      .eq("user_id", userId).maybeSingle(),
  );
  return data?.id ?? null;
}

// ─── TAB A: Submit feedback form ──────────────────────────────────────────────
const SubmitTab = ({ patientId }: { patientId: string | null }) => {
  const navigate = useNavigate();

  const [usageRecords, setUsageRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [isSaving, setIsSaving]         = useState(false);
  const [done, setDone]                 = useState(false);
  const [errorMsg, setErrorMsg]         = useState("");
  const [loadFailed, setLoadFailed]     = useState(false);

  const [selectedUsageId, setSelectedUsageId] = useState("");
  const [score, setScore]                     = useState(0);
  const [sideEffects, setSideEffects]         = useState<string[]>([]);
  const [comments, setComments]               = useState("");

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        // Never show other patients' sessions — if we can't resolve the
        // patient, show an empty list (the UI guides them to complete a profile).
        if (!patientId) { setUsageRecords([]); return; }

        const { data, failed } = await readOr<any[]>(
          "feedback: sessions available to rate", [],
          supabase
            .from("usage_records")
            .select("id, usage_date, dosage, consumption_method, strains(name, thc_level, cbd_level)")
            .eq("patient_id", patientId)
            .order("usage_date", { ascending: false }),
        );
        setLoadFailed(failed);

        const ids = data.map((r: any) => r.id);
        if (ids.length === 0) { setUsageRecords([]); return; }

        // Filter out sessions that already have feedback — scoped, not the whole table
        const { data: existingFb, failed: fbFailed } = await readOr<any[]>(
          "feedback: already-rated sessions", [],
          supabase
            .from("feedback")
            .select("usage_id")
            .in("usage_id", ids),
        );
        // Without this list every session looks unrated, so a failure here
        // would offer duplicate ratings rather than show nothing.
        if (fbFailed) { setLoadFailed(true); setUsageRecords([]); return; }
        const ratedIds = new Set(existingFb.map((f: any) => f.usage_id));
        setUsageRecords(data.filter((r: any) => !ratedIds.has(r.id)));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [patientId]);

  const handleSubmit = async () => {
    if (!selectedUsageId) { setErrorMsg("Please select a treatment session."); return; }
    if (score === 0)       { setErrorMsg("Please give an effectiveness score (1–5)."); return; }
    if (!sideEffects.length){ setErrorMsg("Please select at least one side effect option."); return; }

    setIsSaving(true); setErrorMsg("");
    try {
      const { error } = await supabase.from("feedback").insert({
        usage_id:            selectedUsageId,
        effectiveness_score: score,
        side_effects:        sideEffects.join(", ") || "None",
        comments,
      });
      if (error) throw error;
      setDone(true);
      setTimeout(() => navigate("/dashboard"), 2200);
    } catch {
      setErrorMsg("Failed to save feedback. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (done) return (
    <div className="flex flex-col items-center justify-center h-48 gap-4 animate-in fade-in duration-500">
      <CheckCircle className="h-7 w-7 text-ink" />
      <p className="font-display text-[15px] font-semibold text-ink">Feedback saved</p>
      <p className="font-data text-[11px] uppercase tracking-[0.1em] text-ink/45">
        Returning to your record…
      </p>
    </div>
  );

  if (isLoading) return (
    <div className="flex items-center gap-2 py-8 font-data text-[11px] uppercase tracking-[0.1em] text-ink/45">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading your sessions…
    </div>
  );

  return (
    <div className="space-y-5">
      {errorMsg && (
        <div className="flex items-start gap-2 border-l-2 border-flag/40 bg-flag/5 px-3 py-2 animate-in fade-in duration-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-flag" />
          <p className="text-[13px] text-flag">{errorMsg}</p>
        </div>
      )}

      {loadFailed && <LoadError what="your treatment sessions" />}

      {/* Session picker */}
      <div className="space-y-1.5">
        <Label className="font-data text-[10px] uppercase tracking-[0.14em] text-ink/55">Treatment session</Label>
        <Select value={selectedUsageId} onValueChange={(v) => {
          setSelectedUsageId(v); setScore(0); setSideEffects([]); setComments("");
        }}>
          <SelectTrigger className="rounded-none border-rule text-[13px]">
            <SelectValue placeholder={
              usageRecords.length === 0
                ? "No unrated sessions — log usage first"
                : "Select a session to rate…"
            } />
          </SelectTrigger>
          <SelectContent>
            {usageRecords.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.strains?.name ?? "Unknown"} —{" "}
                {new Date(r.usage_date).toLocaleDateString("en-GB")}
                {r.dosage ? ` · ${r.dosage}` : ""}
                {r.consumption_method ? ` · ${r.consumption_method}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {usageRecords.length === 0 && (
          <p className="mt-1 text-[12px] text-ink/45">
            Use "Log usage" on the{" "}
            <button onClick={() => navigate("/recommendations")} className="text-ink underline underline-offset-2">
              Recommendations page
            </button>{" "}
            to record a session first.
          </p>
        )}
      </div>

      {selectedUsageId && (
        <div className="space-y-5 border-t border-rule pt-4 animate-in fade-in slide-in-from-top-1 duration-300">
          <div className="space-y-2">
            <Label className="font-data text-[10px] uppercase tracking-[0.14em] text-ink/55">
              Effectiveness score <span className="text-flag">*</span>
            </Label>
            <p className="text-[12px] text-ink/45">How well did this session relieve your symptoms?</p>
            <ScoreSelector value={score} onChange={setScore} />
          </div>

          <div className="space-y-2">
            <Label className="font-data text-[10px] uppercase tracking-[0.14em] text-ink/55">
              Side effects <span className="text-flag">*</span>
            </Label>
            <SideEffectPicker selected={sideEffects} onChange={setSideEffects} />
          </div>

          <div className="space-y-1.5">
            <Label className="font-data text-[10px] uppercase tracking-[0.14em] text-ink/55">
              Notes for your doctor{" "}
              <span className="font-normal text-ink/40">(optional)</span>
            </Label>
            <Textarea
              placeholder="How did this session feel overall?"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="resize-none rounded-none border-rule bg-paper text-[13px]" rows={3}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex h-11 w-full items-center justify-center gap-2 bg-ink font-data text-[11px] uppercase tracking-[0.12em] text-paper transition-colors hover:bg-ink/85 disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            {isSaving ? "Saving…" : "Submit feedback"}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── TAB B: My feedback history ───────────────────────────────────────────────
const HistoryTab = ({ patientId }: { patientId: string | null }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyFailed, setHistoryFailed] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (!patientId) { setHistory([]); return; }

        const { data, failed } = await readOr<any[]>(
          "feedback: treatment history", [],
          supabase
            .from("usage_records")
            .select(`
              id, usage_date, dosage, consumption_method,
              strains ( name, thc_level, cbd_level, category ),
              feedback ( effectiveness_score, side_effects, comments )
            `)
            .eq("patient_id", patientId)
            .order("usage_date", { ascending: false }),
        );
        setHistoryFailed(failed);

        // Keep only rows that have at least one feedback
        const rows = (data ?? [])
          .map((r: any) => {
            const fbs = Array.isArray(r.feedback) ? r.feedback : r.feedback ? [r.feedback] : [];
            return fbs.map((fb: any) => ({ ...r, fb }));
          })
          .flat()
          .filter((r: any) => r.fb?.effectiveness_score != null);

        setHistory(rows);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [patientId]);

  if (loading) return (
    <div className="flex items-center gap-2 py-8 font-data text-[11px] uppercase tracking-[0.1em] text-ink/45">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
    </div>
  );

  if (historyFailed) return <LoadError what="your treatment history" />;

  if (history.length === 0) return (
    <div className="flex flex-col items-center gap-3 py-14 text-ink/45">
      <History className="h-8 w-8 text-ink/25" />
      <p className="text-[14px] font-medium text-ink/70">No feedback history yet</p>
      <p className="max-w-xs text-center text-[13px] text-ink/45">
        Submit your first feedback using the "Submit" tab after logging a usage session.
      </p>
    </div>
  );

  const avgScore = history.reduce((s, r) => s + r.fb.effectiveness_score, 0) / history.length;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-4 border border-rule bg-paper px-4 py-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-ink/40" />
          <span className="font-data text-[10px] uppercase tracking-[0.14em] text-ink/55">Overall average</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <StarRow score={Math.round(avgScore)} />
          <span className="font-data text-[13px] font-semibold text-ink">{avgScore.toFixed(1)}/5</span>
        </div>
        <span className="font-data text-[10px] text-ink/40">
          {history.length} session{history.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Cards */}
      {history.map((row, i) => {
        const score: number = row.fb.effectiveness_score;
        const scoreCfg = SCORE_LABELS[score];
        const hasSE = row.fb.side_effects && row.fb.side_effects.toLowerCase() !== "none";
        const borderColor = score >= 4 ? "border-ink/25" : score >= 3 ? "border-rule" : "border-flag/35";
        const barColor    = score >= 4 ? "bg-ink" : score >= 3 ? "bg-ink/25" : "bg-flag";

        return (
          <div key={i} className={`overflow-hidden border bg-white ${borderColor}`}>
            <div className={`h-0.5 w-full ${barColor}`} />
            <div className="space-y-3 p-4">

              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <Leaf className="h-4 w-4 shrink-0 text-ink/35" />
                  <div>
                    <p className="font-display text-[14px] font-semibold text-ink">
                      {row.strains?.name ?? "Unknown strain"}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 font-data text-[10px] text-ink/45">
                      <Clock className="h-3 w-3" />
                      {new Date(row.usage_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      {row.dosage && ` · ${row.dosage}`}
                      {row.consumption_method && ` · ${row.consumption_method}`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <StarRow score={score} />
                  <span className={`font-data text-[10px] uppercase tracking-[0.1em] ${scoreCfg?.color ?? "text-ink/55"}`}>
                    {score}/5 · {scoreCfg?.label}
                  </span>
                </div>
              </div>

              {/* Strain chips */}
              {row.strains && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-data text-[11px]">
                  <span className="text-resin">THC {row.strains.thc_level}%</span>
                  <span className="text-clinic">CBD {row.strains.cbd_level}%</span>
                  {row.strains.category && (
                    <span className="capitalize text-ink/45">{row.strains.category}</span>
                  )}
                </div>
              )}

              {/* Side effects */}
              {hasSE && (
                <div className="flex items-center gap-1.5 text-[12px] text-flag">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Side effects: {row.fb.side_effects}</span>
                </div>
              )}

              {/* Comments */}
              {row.fb.comments && (
                <p className="border-l-2 border-ink/20 bg-paper px-3 py-2 text-[13px] italic leading-relaxed text-ink/65">
                  "{row.fb.comments}"
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Doctor view ──────────────────────────────────────────────────────────────
const DoctorFeedbackView = () => {
  const [patients, setPatients]         = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [feedbackRows, setFeedbackRows] = useState<any[]>([]);
  const [loadingFb, setLoadingFb]       = useState(false);
  const [patientsFailed, setPatientsFailed] = useState(false);
  const [fbFailed, setFbFailed]         = useState(false);
  const [isLoading, setIsLoading]       = useState(true);

  useEffect(() => {
    readOr<any[]>("feedback review: patient list", [],
      supabase.from("patients").select("id, users(full_name)"),
    ).then(({ data, failed }) => {
      setPatients(data);
      setPatientsFailed(failed);
      setIsLoading(false);
    });
  }, []);

  const loadFeedback = async (patientId: string) => {
    setSelectedPatient(patientId); setLoadingFb(true);
    const { data, failed } = await readOr<any[]>(
      "feedback review: patient sessions", [],
      supabase
        .from("usage_records")
        .select("id, usage_date, dosage, consumption_method, strains(name,thc_level,cbd_level,category), feedback(effectiveness_score,side_effects,comments)")
        .eq("patient_id", patientId)
        .order("usage_date", { ascending: false }),
    );
    setFbFailed(failed);

    const rows = (data ?? [])
      .map((r: any) => {
        const fbs = Array.isArray(r.feedback) ? r.feedback : r.feedback ? [r.feedback] : [];
        return fbs.map((fb: any) => ({ ...r, fb }));
      }).flat().filter((r: any) => r.fb);

    setFeedbackRows(rows); setLoadingFb(false);
  };

  if (isLoading) return <div className="flex items-center gap-2 py-8 font-data text-[11px] uppercase tracking-[0.1em] text-ink/45"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label className="font-data text-[10px] uppercase tracking-[0.14em] text-ink/55">Select patient</Label>
        <Select value={selectedPatient} onValueChange={loadFeedback}>
          <SelectTrigger className="rounded-none border-rule text-[13px]"><SelectValue placeholder="Choose a patient…" /></SelectTrigger>
          <SelectContent>
            {patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.users?.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {patientsFailed && <LoadError what="the patient list" />}
      {fbFailed && <LoadError what="this patient's feedback" />}

      {loadingFb && <div className="flex items-center gap-2 font-data text-[11px] uppercase tracking-[0.1em] text-ink/45"><Loader2 className="h-4 w-4 animate-spin" /> Loading feedback…</div>}

      {!loadingFb && !fbFailed && selectedPatient && feedbackRows.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12">
          <MessageSquare className="h-6 w-6 text-ink/25" />
          <p className="text-[13px] text-ink/50">No feedback submitted yet for this patient.</p>
        </div>
      )}

      {feedbackRows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-data text-[10px] uppercase tracking-[0.14em] text-ink/55">{feedbackRows.length} sessions rated</p>
            <div className="flex items-center gap-1.5 border border-rule bg-paper px-3 py-1">
              <TrendingUp className="h-3.5 w-3.5 text-ink/40" />
              <span className="font-data text-[11px] font-semibold text-ink">
                Avg: {(feedbackRows.reduce((s,r) => s + r.fb.effectiveness_score, 0) / feedbackRows.length).toFixed(1)}/5
              </span>
            </div>
          </div>
          {feedbackRows.map((row, i) => {
            const score: number = row.fb.effectiveness_score;
            const hasSE = row.fb.side_effects && row.fb.side_effects.toLowerCase() !== "none";
            return (
              <div key={i} className="space-y-3 border border-rule bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Leaf className="h-4 w-4 shrink-0 text-ink/35" />
                    <div>
                      <p className="font-display text-[14px] font-semibold text-ink">{row.strains?.name}</p>
                      <p className="mt-0.5 flex items-center gap-1 font-data text-[10px] text-ink/45">
                        <Clock className="h-3 w-3" />
                        {new Date(row.usage_date).toLocaleDateString("en-GB", { day:"2-digit",month:"short",year:"numeric" })}
                        {row.dosage && ` · ${row.dosage}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(i => <Star key={i} className={`h-3.5 w-3.5 ${i<=score?"text-ink fill-ink":"text-rule fill-rule"}`}/>)}
                    </div>
                    <span className={`font-data text-[10px] ${SCORE_LABELS[score]?.color ?? "text-ink/55"}`}>{score}/5</span>
                  </div>
                </div>
                {row.strains && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-data text-[11px]">
                    <span className="text-resin">THC {row.strains.thc_level}%</span>
                    <span className="text-clinic">CBD {row.strains.cbd_level}%</span>
                    {row.strains.category && <span className="capitalize text-ink/45">{row.strains.category}</span>}
                  </div>
                )}
                {hasSE && <div className="flex items-center gap-1.5 text-[12px] text-flag"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{row.fb.side_effects}</div>}
                {row.fb.comments && <p className="border-l-2 border-ink/20 bg-paper px-3 py-2 text-[13px] leading-relaxed text-ink/65">"{row.fb.comments}"</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const FeedbackPage = () => {
  const { currentUser } = useAppState();
  const isDoctor = useIsDoctor();
  const [activeTab, setActiveTab] = useState<"submit" | "history">("submit");
  const [patientId, setPatientId] = useState<string | null>(null);

  useEffect(() => {
    if (!isDoctor && currentUser?.id) {
      resolvePatientId(currentUser.id).then(setPatientId);
    }
  }, [currentUser, isDoctor]);

  return (
    <div className="max-w-xl mx-auto py-2 space-y-6 animate-in fade-in duration-500">

      {/* Masthead — same clinical-report header as recommendations and dashboard */}
      <header className="border-b-2 border-ink pb-5">
        <p className="flex items-center gap-1.5 font-data text-[10px] uppercase tracking-[0.2em] text-ink/45">
          {isDoctor ? <Users className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
          {isDoctor ? "Clinician view · efficacy reports" : "Treatment record · self-reported"}
        </p>
        <h1 className="mt-2 font-display text-[26px] font-semibold leading-tight tracking-tight text-ink">
          {isDoctor ? "Patient feedback review" : "Treatment feedback"}
        </h1>
        <p className="mt-2 text-[13px] text-ink/55">
          {isDoctor
            ? "Review your patients' treatment efficacy reports."
            : "Rate your sessions and track what works for you."}
        </p>
      </header>

      {/* Patient: tab switcher */}
      {!isDoctor && (
        <div className="flex border-b border-rule">
          <button
            onClick={() => setActiveTab("submit")}
            className={`-mb-px flex flex-1 items-center justify-center gap-2 border-b-2 py-2.5 font-data text-[11px] uppercase tracking-[0.12em] transition-colors ${
              activeTab === "submit"
                ? "border-ink text-ink"
                : "border-transparent text-ink/40 hover:text-ink/70"
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Submit feedback
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`-mb-px flex flex-1 items-center justify-center gap-2 border-b-2 py-2.5 font-data text-[11px] uppercase tracking-[0.12em] transition-colors ${
              activeTab === "history"
                ? "border-ink text-ink"
                : "border-transparent text-ink/40 hover:text-ink/70"
            }`}
          >
            <History className="h-3.5 w-3.5" />
            My history
          </button>
        </div>
      )}

      {/* Content */}
      {isDoctor
        ? <DoctorFeedbackView />
        : activeTab === "submit"
          ? <SubmitTab patientId={patientId} />
          : <HistoryTab patientId={patientId} />
      }
    </div>
  );
};

export default FeedbackPage;
