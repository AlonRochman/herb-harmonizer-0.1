import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
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
  1: { label: "No relief",       color: "text-red-600"     },
  2: { label: "Slight relief",   color: "text-orange-500"  },
  3: { label: "Moderate relief", color: "text-amber-600"   },
  4: { label: "Significant",     color: "text-teal-600"    },
  5: { label: "Complete relief", color: "text-emerald-600" },
};

// ─── Score selector ───────────────────────────────────────────────────────────
const ScoreSelector = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <div className="space-y-2">
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`relative w-12 h-12 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-0.5 ${
            value === n
              ? "bg-emerald-700 text-white border-emerald-700 shadow-sm scale-105"
              : "bg-white text-slate-400 border-slate-200 hover:border-emerald-300 hover:text-emerald-600"
          }`}>
          <Star className={`h-4 w-4 ${value === n ? "fill-white" : "fill-none"}`} />
          <span className="text-[10px] font-semibold leading-none">{n}</span>
        </button>
      ))}
    </div>
    {value > 0 && (
      <p className={`text-[13px] font-medium ${SCORE_LABELS[value].color}`}>
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
            className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all ${
              active
                ? se === "None"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                  : "bg-rose-50 text-rose-700 border-rose-300"
                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
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
      <Star key={i} className={`h-3.5 w-3.5 ${i <= score ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}`} />
    ))}
  </div>
);

// ─── Resolve patient_id from current user ─────────────────────────────────────
async function resolvePatientId(userId: string): Promise<string | null> {
  if (!userId || userId === "demo-id") return null;
  const { data } = await supabase
    .from("patients").select("id")
    .eq("user_id", userId).maybeSingle();
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

  const [selectedUsageId, setSelectedUsageId] = useState("");
  const [score, setScore]                     = useState(0);
  const [sideEffects, setSideEffects]         = useState<string[]>([]);
  const [comments, setComments]               = useState("");

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from("usage_records")
          .select("id, usage_date, dosage, consumption_method, strains(name, thc_level, cbd_level)")
          .order("usage_date", { ascending: false });

        if (patientId) {
          query = query.eq("patient_id", patientId);
        } else {
          query = query.limit(10);
        }

        const { data } = await query;

        // Filter out usage_records that already have feedback
        const { data: existingFb } = await supabase
          .from("feedback")
          .select("usage_id");
        const ratedIds = new Set((existingFb ?? []).map((f: any) => f.usage_id));
        setUsageRecords((data ?? []).filter((r: any) => !ratedIds.has(r.id)));
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
      <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
        <CheckCircle className="h-7 w-7 text-emerald-600" />
      </div>
      <p className="text-[15px] font-semibold text-slate-800">Feedback saved!</p>
      <p className="text-[13px] text-slate-400">Redirecting to your dashboard…</p>
    </div>
  );

  if (isLoading) return (
    <div className="flex items-center gap-2 text-slate-400 text-sm py-8">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading your sessions…
    </div>
  );

  return (
    <div className="space-y-5">
      {errorMsg && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 animate-in fade-in duration-200">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-[13px] text-red-700">{errorMsg}</p>
        </div>
      )}

      {/* Session picker */}
      <div className="space-y-1.5">
        <Label className="text-[13px] font-semibold">Treatment session</Label>
        <Select value={selectedUsageId} onValueChange={(v) => {
          setSelectedUsageId(v); setScore(0); setSideEffects([]); setComments("");
        }}>
          <SelectTrigger className="text-[13px]">
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
          <p className="text-[12px] text-slate-400 mt-1">
            Use "Log usage" on the{" "}
            <button onClick={() => navigate("/recommendations")} className="text-emerald-600 underline underline-offset-2">
              Recommendations page
            </button>{" "}
            to record a session first.
          </p>
        )}
      </div>

      {selectedUsageId && (
        <div className="space-y-5 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-300">
          <div className="space-y-2">
            <Label className="text-[13px] font-semibold">
              Effectiveness score <span className="text-red-400">*</span>
            </Label>
            <p className="text-[12px] text-slate-400">How well did this session relieve your symptoms?</p>
            <ScoreSelector value={score} onChange={setScore} />
          </div>

          <div className="space-y-2">
            <Label className="text-[13px] font-semibold">
              Side effects <span className="text-red-400">*</span>
            </Label>
            <SideEffectPicker selected={sideEffects} onChange={setSideEffects} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] font-semibold">
              Notes for your doctor{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Textarea
              placeholder="How did this session feel overall?"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="text-[13px] resize-none" rows={3}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="w-full h-11 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-[14px] font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
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

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("usage_records")
          .select(`
            id, usage_date, dosage, consumption_method,
            strains ( name, thc_level, cbd_level, category ),
            feedback ( effectiveness_score, side_effects, comments )
          `)
          .order("usage_date", { ascending: false });

        if (patientId) query = query.eq("patient_id", patientId);
        else query = query.limit(20);

        const { data } = await query;

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
    <div className="flex items-center gap-2 text-slate-400 text-sm py-8">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
    </div>
  );

  if (history.length === 0) return (
    <div className="flex flex-col items-center py-14 text-slate-400 gap-3">
      <History className="h-10 w-10 opacity-25" />
      <p className="text-[14px] font-medium text-slate-600">No feedback history yet</p>
      <p className="text-[13px] text-slate-400 text-center max-w-xs">
        Submit your first feedback using the "Submit" tab after logging a usage session.
      </p>
    </div>
  );

  const avgScore = history.reduce((s, r) => s + r.fb.effectiveness_score, 0) / history.length;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          <span className="text-[12px] font-semibold text-slate-600">Overall average</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <StarRow score={Math.round(avgScore)} />
          <span className="text-[13px] font-bold text-slate-800">{avgScore.toFixed(1)}/5</span>
        </div>
        <span className="text-[11px] text-slate-400">{history.length} session{history.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Cards */}
      {history.map((row, i) => {
        const score: number = row.fb.effectiveness_score;
        const scoreCfg = SCORE_LABELS[score];
        const hasSE = row.fb.side_effects && row.fb.side_effects.toLowerCase() !== "none";
        const borderColor = score >= 4 ? "border-emerald-200" : score >= 3 ? "border-amber-200" : "border-red-200";
        const barColor = score >= 4 ? "bg-emerald-500" : score >= 3 ? "bg-amber-400" : "bg-red-400";

        return (
          <div key={i} className={`bg-white border rounded-xl overflow-hidden ${borderColor}`}>
            <div className={`h-1 w-full ${barColor}`} />
            <div className="p-4 space-y-3">

              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                    <Leaf className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-slate-900">
                      {row.strains?.name ?? "Unknown strain"}
                    </p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {new Date(row.usage_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      {row.dosage && ` · ${row.dosage}`}
                      {row.consumption_method && ` · ${row.consumption_method}`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <StarRow score={score} />
                  <span className={`text-[11px] font-semibold ${scoreCfg?.color ?? "text-slate-500"}`}>
                    {score}/5 · {scoreCfg?.label}
                  </span>
                </div>
              </div>

              {/* Strain chips */}
              {row.strains && (
                <div className="flex gap-2">
                  <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                    THC {row.strains.thc_level}%
                  </span>
                  <span className="text-[11px] font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5">
                    CBD {row.strains.cbd_level}%
                  </span>
                  {row.strains.category && (
                    <span className="text-[11px] text-slate-500 bg-slate-100 rounded-full px-2 py-0.5 capitalize">
                      {row.strains.category}
                    </span>
                  )}
                </div>
              )}

              {/* Side effects */}
              {hasSE && (
                <div className="flex items-center gap-1.5 text-[12px] text-rose-700">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Side effects: {row.fb.side_effects}</span>
                </div>
              )}

              {/* Comments */}
              {row.fb.comments && (
                <p className="text-[13px] text-slate-600 bg-slate-50 border-l-2 border-slate-300 rounded-r-lg px-3 py-2 leading-relaxed italic">
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
  const [isLoading, setIsLoading]       = useState(true);

  useEffect(() => {
    supabase.from("patients").select("id, users(full_name)")
      .then(({ data }) => { setPatients(data || []); setIsLoading(false); });
  }, []);

  const loadFeedback = async (patientId: string) => {
    setSelectedPatient(patientId); setLoadingFb(true);
    const { data } = await supabase
      .from("usage_records")
      .select("id, usage_date, dosage, consumption_method, strains(name,thc_level,cbd_level,category), feedback(effectiveness_score,side_effects,comments)")
      .eq("patient_id", patientId)
      .order("usage_date", { ascending: false });

    const rows = (data ?? [])
      .map((r: any) => {
        const fbs = Array.isArray(r.feedback) ? r.feedback : r.feedback ? [r.feedback] : [];
        return fbs.map((fb: any) => ({ ...r, fb }));
      }).flat().filter((r: any) => r.fb);

    setFeedbackRows(rows); setLoadingFb(false);
  };

  if (isLoading) return <div className="flex items-center gap-2 text-slate-400 text-sm py-8"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label className="text-[13px] font-semibold">Select patient</Label>
        <Select value={selectedPatient} onValueChange={loadFeedback}>
          <SelectTrigger className="text-[13px]"><SelectValue placeholder="Choose a patient…" /></SelectTrigger>
          <SelectContent>
            {patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.users?.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loadingFb && <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading feedback…</div>}

      {!loadingFb && selectedPatient && feedbackRows.length === 0 && (
        <div className="flex flex-col items-center py-12 text-slate-400 gap-2">
          <MessageSquare className="h-8 w-8 opacity-30" />
          <p className="text-sm">No feedback submitted yet for this patient.</p>
        </div>
      )}

      {feedbackRows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">{feedbackRows.length} sessions rated</p>
            <div className="flex items-center gap-1.5 bg-slate-100 rounded-full px-3 py-1">
              <TrendingUp className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-[12px] font-semibold text-slate-700">
                Avg: {(feedbackRows.reduce((s,r) => s + r.fb.effectiveness_score, 0) / feedbackRows.length).toFixed(1)}/5
              </span>
            </div>
          </div>
          {feedbackRows.map((row, i) => {
            const score: number = row.fb.effectiveness_score;
            const hasSE = row.fb.side_effects && row.fb.side_effects.toLowerCase() !== "none";
            return (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <Leaf className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-slate-800">{row.strains?.name}</p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {new Date(row.usage_date).toLocaleDateString("en-GB", { day:"2-digit",month:"short",year:"numeric" })}
                        {row.dosage && ` · ${row.dosage}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(i => <Star key={i} className={`h-3.5 w-3.5 ${i<=score?"text-amber-400 fill-amber-400":"text-slate-200 fill-slate-200"}`}/>)}
                    </div>
                    <span className={`text-[11px] font-semibold ${SCORE_LABELS[score]?.color ?? ""}`}>{score}/5</span>
                  </div>
                </div>
                {row.strains && (
                  <div className="flex gap-2">
                    <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">THC {row.strains.thc_level}%</span>
                    <span className="text-[11px] text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5">CBD {row.strains.cbd_level}%</span>
                    {row.strains.category && <span className="text-[11px] text-slate-500 bg-slate-100 rounded-full px-2 py-0.5 capitalize">{row.strains.category}</span>}
                  </div>
                )}
                {hasSE && <div className="flex items-center gap-1.5 text-[12px] text-rose-700"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{row.fb.side_effects}</div>}
                {row.fb.comments && <p className="text-[13px] text-slate-600 bg-slate-50 rounded-lg px-3 py-2 leading-relaxed">"{row.fb.comments}"</p>}
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

      {/* Header */}
      <div>
        <div className={`inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-3 py-1 mb-3 uppercase tracking-wide ${
          isDoctor ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
        }`}>
          {isDoctor ? <Users className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
          {isDoctor ? "Clinician view" : "Patient feedback"}
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-1">
          {isDoctor ? "Patient feedback review" : "Treatment feedback"}
        </h1>
        <p className="text-sm text-slate-400">
          {isDoctor
            ? "Review your patients' treatment efficacy reports."
            : "Rate your sessions and track what works for you."}
        </p>
      </div>

      {/* Patient: tab switcher */}
      {!isDoctor && (
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => setActiveTab("submit")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[13px] font-semibold transition-all ${
              activeTab === "submit"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            Submit feedback
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[13px] font-semibold transition-all ${
              activeTab === "history"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <History className="h-4 w-4" />
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
