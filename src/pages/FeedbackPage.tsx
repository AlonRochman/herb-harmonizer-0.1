import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAppState } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

const SIDE_EFFECTS = ["Dry mouth", "Dizziness", "Fatigue", "Nausea", "Anxiety", "Headache", "None"];

const SCORE_LABELS: Record<number, string> = {
  1: "No relief",
  2: "Slight relief",
  3: "Moderate relief",
  4: "Significant relief",
  5: "Complete relief",
};

// ─── Star / number rating ─────────────────────────────────────────────────────
const ScoreSelector = ({
  value, onChange,
}: {
  value: number; onChange: (v: number) => void;
}) => (
  <div className="flex gap-2">
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        onClick={() => onChange(n)}
        className={`w-10 h-10 rounded-lg text-[14px] font-semibold border transition-all ${
          value === n
            ? "bg-emerald-700 text-white border-emerald-700"
            : "bg-white text-slate-500 border-slate-200 hover:border-emerald-300 hover:text-emerald-700"
        }`}
      >
        {n}
      </button>
    ))}
    {value > 0 && (
      <span className="self-center text-[13px] text-slate-500 ml-1">
        — {SCORE_LABELS[value]}
      </span>
    )}
  </div>
);

// ─── Side effect checkboxes ───────────────────────────────────────────────────
const SideEffectPicker = ({
  selected, onChange,
}: {
  selected: string[]; onChange: (v: string[]) => void;
}) => {
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
          <button
            key={se}
            type="button"
            onClick={() => toggle(se)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all ${
              active
                ? "bg-rose-50 text-rose-700 border-rose-300"
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

// ─── Main page ────────────────────────────────────────────────────────────────
const FeedbackPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAppState();

  const [patients, setPatients]             = useState<any[]>([]);
  const [usageRecords, setUsageRecords]     = useState<any[]>([]);
  const [isLoading, setIsLoading]           = useState(true);
  const [isSaving, setIsSaving]             = useState(false);
  const [done, setDone]                     = useState(false);
  const [errorMsg, setErrorMsg]             = useState("");

  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedUsageId, setSelectedUsageId]     = useState("");
  const [score, setScore]                         = useState(0);
  const [sideEffects, setSideEffects]             = useState<string[]>([]);
  const [comments, setComments]                   = useState("");

  // ── load patients ─────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        // if patient is logged in, auto-select them
        if (currentUser?.id && currentUser.role === "patient") {
          setSelectedPatientId(currentUser.id);
          await loadUsage(currentUser.id);
        } else {
          const { data } = await supabase
            .from("patients")
            .select("id, users(full_name)");
          setPatients(data || []);
        }
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [currentUser]);

  // ── load usage records for selected patient ───────────────────────────────
  const loadUsage = async (patientId: string) => {
    setSelectedPatientId(patientId);
    setSelectedUsageId("");
    const { data } = await supabase
      .from("usage_records")
      .select("id, usage_date, dosage, strains(name)")
      .eq("patient_id", patientId)
      .order("usage_date", { ascending: false });
    setUsageRecords(data || []);
  };

  // ── submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedUsageId || score === 0) {
      setErrorMsg("Please select a treatment session and give an effectiveness score.");
      return;
    }
    setIsSaving(true);
    setErrorMsg("");
    try {
      const { error } = await supabase.from("feedback").insert({
        usage_id:           selectedUsageId,
        effectiveness_score: score,
        side_effects:        sideEffects.join(", ") || "None",
        comments,
      });
      if (error) throw error;
      setDone(true);
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch {
      setErrorMsg("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── success state ─────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 animate-in fade-in duration-500">
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
          <CheckCircle className="h-7 w-7 text-emerald-600" />
        </div>
        <p className="text-[15px] font-medium text-slate-800">Feedback saved!</p>
        <p className="text-[13px] text-slate-400">Redirecting to your dashboard…</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-2 space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900 mb-1">Treatment feedback</h1>
        <p className="text-sm text-slate-400">Rate a recent session so the algorithm can improve.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-5">

          {/* Error */}
          {errorMsg && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-[13px] text-red-700">{errorMsg}</p>
            </div>
          )}

          {/* Patient select — only shown for doctors / demo */}
          {currentUser?.role !== "patient" && (
            <div className="space-y-1.5">
              <Label className="text-[13px]">Patient</Label>
              <Select value={selectedPatientId} onValueChange={loadUsage}>
                <SelectTrigger className="text-[13px]">
                  <SelectValue placeholder="Select patient…" />
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
          )}

          {/* Usage session select */}
          {selectedPatientId && (
            <div className="space-y-1.5">
              <Label className="text-[13px]">Treatment session</Label>
              <Select value={selectedUsageId} onValueChange={setSelectedUsageId}>
                <SelectTrigger className="text-[13px]">
                  <SelectValue placeholder={
                    usageRecords.length === 0 ? "No sessions found" : "Select a session…"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {usageRecords.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.strains?.name} — {new Date(r.usage_date).toLocaleDateString()} ({r.dosage})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Feedback form — shown once session is picked */}
          {selectedUsageId && (
            <div className="space-y-5 pt-2 border-t border-slate-100">

              {/* Score */}
              <div className="space-y-2">
                <Label className="text-[13px]">Effectiveness score</Label>
                <ScoreSelector value={score} onChange={setScore} />
              </div>

              {/* Side effects */}
              <div className="space-y-2">
                <Label className="text-[13px]">Side effects experienced</Label>
                <SideEffectPicker selected={sideEffects} onChange={setSideEffects} />
              </div>

              {/* Comments */}
              <div className="space-y-1.5">
                <Label className="text-[13px]">Additional notes <span className="text-slate-400 font-normal">(optional)</span></Label>
                <Textarea
                  placeholder="How did this session make you feel overall?"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="text-[13px] resize-none"
                  rows={3}
                />
              </div>

              {/* Submit */}
              <Button
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white"
                onClick={handleSubmit}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Submit feedback
              </Button>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default FeedbackPage;