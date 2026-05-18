import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAppState } from "@/context/AppContext";
import { useIsDoctor } from "@/hooks/useIsDoctor";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, CheckCircle, AlertCircle, MessageSquare,
  Star, TrendingUp, Leaf, Clock, Users,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const SIDE_EFFECTS = [
  "None", "Dry mouth", "Dizziness", "Fatigue",
  "Nausea", "Anxiety", "Headache", "Increased appetite", "Sleepiness",
];

const SCORE_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "No relief",        color: "text-red-600"    },
  2: { label: "Slight relief",    color: "text-orange-500" },
  3: { label: "Moderate relief",  color: "text-amber-600"  },
  4: { label: "Significant",      color: "text-teal-600"   },
  5: { label: "Complete relief",  color: "text-emerald-600"},
};

// ─── Score selector ───────────────────────────────────────────────────────────
const ScoreSelector = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <div className="space-y-2">
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((n) => {
        const isActive = value === n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`relative w-12 h-12 rounded-xl text-[15px] font-bold border-2 transition-all flex flex-col items-center justify-center ${
              isActive
                ? "bg-emerald-700 text-white border-emerald-700 shadow-sm scale-105"
                : "bg-white text-slate-400 border-slate-200 hover:border-emerald-300 hover:text-emerald-600"
            }`}
          >
            <Star className={`h-4 w-4 mb-0.5 ${isActive ? "fill-white" : "fill-none"}`} />
            <span className="text-[10px] font-semibold leading-none">{n}</span>
          </button>
        );
      })}
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
            }`}
          >
            {se}
          </button>
        );
      })}
    </div>
  );
};

// ─── Doctor view: past feedback list ─────────────────────────────────────────
const DoctorFeedbackView = () => {
  const [patients, setPatients]         = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [feedbackRows, setFeedbackRows] = useState<any[]>([]);
  const [loadingFb, setLoadingFb]       = useState(false);
  const [isLoading, setIsLoading]       = useState(true);

  useEffect(() => {
    supabase
      .from("patients")
      .select("id, users(full_name)")
      .then(({ data }) => { setPatients(data || []); setIsLoading(false); });
  }, []);

  const loadFeedback = async (patientId: string) => {
    setSelectedPatient(patientId);
    setLoadingFb(true);
    // Join: usage_records → feedback → strains
    const { data } = await supabase
      .from("usage_records")
      .select(`
        id, usage_date, dosage, consumption_method,
        strains ( name, thc_level, cbd_level, category ),
        feedback ( effectiveness_score, side_effects, comments )
      `)
      .eq("patient_id", patientId)
      .order("usage_date", { ascending: false });

    // Flatten: only rows that have at least one feedback entry
    const withFeedback = (data || [])
      .map((r: any) => {
        const fbs = Array.isArray(r.feedback) ? r.feedback : r.feedback ? [r.feedback] : [];
        return fbs.map((fb: any) => ({ ...r, fb }));
      })
      .flat()
      .filter((r: any) => r.fb);

    setFeedbackRows(withFeedback);
    setLoadingFb(false);
  };

  if (isLoading) return (
    <div className="flex items-center gap-2 text-slate-400 text-sm py-8">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading patients…
    </div>
  );

  const scoreColor = (s: number) =>
    s >= 4 ? "text-emerald-700 bg-emerald-50" :
    s >= 3 ? "text-amber-700  bg-amber-50"   :
             "text-red-700    bg-red-50";

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label className="text-[13px] font-semibold">Select patient</Label>
        <Select value={selectedPatient} onValueChange={loadFeedback}>
          <SelectTrigger className="text-[13px]">
            <SelectValue placeholder="Choose a patient to view feedback…" />
          </SelectTrigger>
          <SelectContent>
            {patients.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.users?.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loadingFb && (
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading feedback…
        </div>
      )}

      {!loadingFb && selectedPatient && feedbackRows.length === 0 && (
        <div className="flex flex-col items-center py-12 text-slate-400 gap-2">
          <MessageSquare className="h-8 w-8 opacity-30" />
          <p className="text-sm">No feedback submitted yet for this patient.</p>
        </div>
      )}

      {feedbackRows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">
              {feedbackRows.length} session{feedbackRows.length !== 1 ? "s" : ""} with feedback
            </p>
            {/* Avg score badge */}
            <div className="flex items-center gap-1.5 bg-slate-100 rounded-full px-3 py-1">
              <TrendingUp className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-[12px] font-semibold text-slate-700">
                Avg: {(feedbackRows.reduce((s, r) => s + r.fb.effectiveness_score, 0) / feedbackRows.length).toFixed(1)}/5
              </span>
            </div>
          </div>

          {feedbackRows.map((row, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                    <Leaf className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-slate-800">
                      {row.strains?.name ?? "Unknown strain"}
                    </p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {new Date(row.usage_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      · {row.dosage}
                      {row.consumption_method && ` · ${row.consumption_method}`}
                    </p>
                  </div>
                </div>
                <span className={`text-[12px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${scoreColor(row.fb.effectiveness_score)}`}>
                  {row.fb.effectiveness_score}/5 · {SCORE_LABELS[row.fb.effectiveness_score]?.label}
                </span>
              </div>

              {/* Star display */}
              <div className="flex gap-1">
                {[1,2,3,4,5].map((s) => (
                  <Star key={s}
                    className={`h-4 w-4 ${s <= row.fb.effectiveness_score ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}`}
                  />
                ))}
              </div>

              {/* Side effects + comments */}
              {row.fb.side_effects && row.fb.side_effects !== "None" && (
                <div className="flex items-center gap-1.5 text-[12px] text-rose-700">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Side effects: {row.fb.side_effects}</span>
                </div>
              )}
              {row.fb.comments && (
                <p className="text-[13px] text-slate-600 bg-slate-50 rounded-lg px-3 py-2 leading-relaxed">
                  "{row.fb.comments}"
                </p>
              )}

              {/* Strain info chips */}
              {row.strains && (
                <div className="flex gap-2 pt-1">
                  <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                    THC {row.strains.thc_level}%
                  </span>
                  <span className="text-[11px] font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5">
                    CBD {row.strains.cbd_level}%
                  </span>
                  {row.strains.category && (
                    <span className="text-[11px] font-medium text-slate-500 bg-slate-100 rounded-full px-2 py-0.5 capitalize">
                      {row.strains.category}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Patient submit view ──────────────────────────────────────────────────────
const PatientFeedbackForm = () => {
  const navigate     = useNavigate();
  const { currentUser } = useAppState();

  const [usageRecords, setUsageRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [isSaving, setIsSaving]         = useState(false);
  const [done, setDone]                 = useState(false);
  const [errorMsg, setErrorMsg]         = useState("");

  const [selectedUsageId, setSelectedUsageId] = useState("");
  const [score, setScore]                     = useState(0);
  const [sideEffects, setSideEffects]         = useState<string[]>([]);
  const [comments, setComments]               = useState("");

  // ── Resolve patient_id from users.id, then load their usage records ───────
  useEffect(() => {
    const loadSessions = async () => {
      setIsLoading(true);
      try {
        if (!currentUser?.id) return;

        // Step 1: users.id → patients.id
        // The patients table links to users via user_id
        const { data: patientRow } = await supabase
          .from("patients")
          .select("id")
          .eq("user_id", currentUser.id)
          .maybeSingle();

        // Fallback for demo accounts: no real user_id — get first patient
        const patientId = patientRow?.id ?? null;

        let query = supabase
          .from("usage_records")
          .select("id, usage_date, dosage, consumption_method, strains(name, thc_level, cbd_level)")
          .order("usage_date", { ascending: false });

        if (patientId) {
          query = query.eq("patient_id", patientId);
        } else {
          // demo mode: show all (first 10)
          query = query.limit(10);
        }

        const { data } = await query;
        setUsageRecords(data || []);
      } finally {
        setIsLoading(false);
      }
    };
    loadSessions();
  }, [currentUser]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedUsageId) { setErrorMsg("Please select a treatment session."); return; }
    if (score === 0)       { setErrorMsg("Please give an effectiveness score (1–5)."); return; }
    if (sideEffects.length === 0) { setErrorMsg("Please select at least one side effect option (or 'None')."); return; }

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
    <div className="flex flex-col items-center justify-center h-56 gap-4 animate-in fade-in duration-500">
      <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
        <CheckCircle className="h-7 w-7 text-emerald-600" />
      </div>
      <p className="text-[15px] font-semibold text-slate-800">Feedback saved!</p>
      <p className="text-[13px] text-slate-400">Thank you — redirecting to your dashboard…</p>
    </div>
  );

  if (isLoading) return (
    <div className="flex items-center gap-2 text-slate-400 text-sm py-8">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading your sessions…
    </div>
  );

  return (
    <div className="space-y-5">

      {/* Error */}
      {errorMsg && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 animate-in fade-in duration-200">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-[13px] text-red-700">{errorMsg}</p>
        </div>
      )}

      {/* Session selector */}
      <div className="space-y-1.5">
        <Label className="text-[13px] font-semibold">Treatment session</Label>
        <Select value={selectedUsageId} onValueChange={(v) => { setSelectedUsageId(v); setScore(0); setSideEffects([]); setComments(""); }}>
          <SelectTrigger className="text-[13px]">
            <SelectValue placeholder={
              usageRecords.length === 0
                ? "No sessions logged yet — use 'Log usage' first"
                : "Select a session to rate…"
            } />
          </SelectTrigger>
          <SelectContent>
            {usageRecords.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.strains?.name ?? "Unknown"} — {new Date(r.usage_date).toLocaleDateString("en-GB")}
                {r.dosage ? ` · ${r.dosage}` : ""}
                {r.consumption_method ? ` · ${r.consumption_method}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {usageRecords.length === 0 && (
          <p className="text-[12px] text-slate-400 mt-1">
            You need to log a usage session before submitting feedback.{" "}
            <button onClick={() => navigate("/patient-input")} className="text-emerald-600 underline underline-offset-2">
              Update profile
            </button>
          </p>
        )}
      </div>

      {/* Feedback form — shown once session is picked */}
      {selectedUsageId && (
        <div className="space-y-5 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-300">

          {/* Score */}
          <div className="space-y-2">
            <Label className="text-[13px] font-semibold">
              Effectiveness score <span className="text-red-400">*</span>
            </Label>
            <p className="text-[12px] text-slate-400">How well did this session relieve your symptoms?</p>
            <ScoreSelector value={score} onChange={setScore} />
          </div>

          {/* Side effects */}
          <div className="space-y-2">
            <Label className="text-[13px] font-semibold">
              Side effects experienced <span className="text-red-400">*</span>
            </Label>
            <SideEffectPicker selected={sideEffects} onChange={setSideEffects} />
          </div>

          {/* Comments */}
          <div className="space-y-1.5">
            <Label className="text-[13px] font-semibold">
              Notes for your doctor{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Textarea
              placeholder="How did this session feel? Any specific observations?"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="text-[13px] resize-none"
              rows={3}
            />
          </div>

          {/* Submit */}
          <Button
            className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-semibold h-11 rounded-xl"
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Submit feedback
          </Button>
        </div>
      )}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const FeedbackPage = () => {
  const isDoctor = useIsDoctor();

  return (
    <div className="max-w-xl mx-auto py-2 space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div>
        <div className={`inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-3 py-1 mb-3 uppercase tracking-wide ${
          isDoctor
            ? "bg-blue-50 text-blue-700 border border-blue-100"
            : "bg-emerald-50 text-emerald-700 border border-emerald-100"
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
            : "Rate a recent session so the algorithm can improve your future recommendations."}
        </p>
      </div>

      {isDoctor ? <DoctorFeedbackView /> : <PatientFeedbackForm />}

    </div>
  );
};

export default FeedbackPage;
