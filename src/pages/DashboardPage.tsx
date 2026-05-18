import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAppState } from "@/context/AppContext";
import { useIsDoctor } from "@/hooks/useIsDoctor";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Activity, Leaf, Loader2, TrendingUp,
  ClipboardList, MessageSquare, Sparkles,
  CheckCircle2, XCircle, Clock, AlertCircle,
  ChevronDown, ChevronUp, Stethoscope,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

// ─── Status config ────────────────────────────────────────────────────────────
type RecStatus = "pending" | "approved" | "rejected";

const STATUS_CONFIG: Record<RecStatus, {
  label: string; icon: typeof Clock;
  pill: string; dot: string; border: string;
}> = {
  pending:  {
    label: "Awaiting review",
    icon: Clock,
    pill:   "bg-amber-50  text-amber-700  border-amber-200",
    dot:    "bg-amber-400",
    border: "border-amber-200",
  },
  approved: {
    label: "Approved by doctor",
    icon: CheckCircle2,
    pill:   "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot:    "bg-emerald-500",
    border: "border-emerald-200",
  },
  rejected: {
    label: "Not recommended",
    icon: XCircle,
    pill:   "bg-red-50    text-red-700    border-red-200",
    dot:    "bg-red-400",
    border: "border-red-200",
  },
};

const StatusBadge = ({ status }: { status: RecStatus }) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${cfg.pill}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
};

// ─── Metric card ──────────────────────────────────────────────────────────────
const MetricCard = ({
  label, value, sub, icon: Icon, accent = "emerald",
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; accent?: string;
}) => {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-700",
    blue:    "bg-blue-50 text-blue-700",
    amber:   "bg-amber-50 text-amber-700",
    red:     "bg-red-50 text-red-600",
  };
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3">
      <div className={`p-2 rounded-lg ${colors[accent] ?? colors.emerald}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-2xl font-semibold text-slate-900 leading-none">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
};

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyState = ({
  icon: Icon, title, desc, cta, onCta,
}: {
  icon: React.ElementType; title: string; desc: string;
  cta?: string; onCta?: () => void;
}) => (
  <div className="flex flex-col items-center justify-center py-14 text-center">
    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
      <Icon className="h-5 w-5 text-slate-400" />
    </div>
    <p className="text-[14px] font-medium text-slate-700 mb-1">{title}</p>
    <p className="text-[13px] text-slate-400 max-w-xs mb-4">{desc}</p>
    {cta && onCta && (
      <Button size="sm" variant="outline" onClick={onCta}
        className="text-emerald-700 border-emerald-200 hover:bg-emerald-50">
        {cta}
      </Button>
    )}
  </div>
);

// ─── Doctor approval card ─────────────────────────────────────────────────────
const ApprovalCard = ({
  rec,
  onDecision,
}: {
  rec: any;
  onDecision: (id: string, status: "approved" | "rejected", note: string) => Promise<void>;
}) => {
  const [expanded, setExpanded]   = useState(false);
  const [note, setNote]           = useState("");
  const [saving, setSaving]       = useState<"approved" | "rejected" | null>(null);
  const status: RecStatus         = rec.status ?? "pending";
  const isPending                 = status === "pending";

  const handleAction = async (action: "approved" | "rejected") => {
    setSaving(action);
    await onDecision(rec.id, action, note);
    setSaving(null);
  };

  return (
    <div className={`bg-white border rounded-xl overflow-hidden transition-all ${
      isPending ? "border-amber-200 shadow-sm" : STATUS_CONFIG[status].border
    }`}>
      {/* Status bar */}
      <div className={`h-1 w-full ${STATUS_CONFIG[status].dot}`} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-slate-900 leading-tight">
              {rec.strains?.name ?? "Unknown strain"}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {new Date(rec.recommendation_date).toLocaleDateString("en-GB", {
                day: "2-digit", month: "short", year: "numeric",
              })} · {rec.match_score}% match
            </p>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Strain chips */}
        {rec.strains && (
          <div className="flex gap-2 mb-3">
            <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
              THC {rec.strains.thc_level}%
            </span>
            <span className="text-[11px] font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5">
              CBD {rec.strains.cbd_level}%
            </span>
            {rec.strains.category && (
              <span className="text-[11px] text-slate-500 bg-slate-100 rounded-full px-2 py-0.5 capitalize">
                {rec.strains.category}
              </span>
            )}
          </div>
        )}

        {/* Algorithm explanation */}
        {rec.explanation && (
          <p className="text-[12px] text-slate-500 bg-slate-50 rounded-lg px-3 py-2 mb-3 leading-relaxed border-l-2 border-emerald-300">
            {rec.explanation}
          </p>
        )}

        {/* Review note (if already decided) */}
        {!isPending && rec.review_note && (
          <div className={`flex gap-2 items-start rounded-lg px-3 py-2 mb-3 text-[12px] ${
            status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}>
            <Stethoscope className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{rec.review_note}</span>
          </div>
        )}

        {/* Approve / Reject actions (pending only) */}
        {isPending && (
          <>
            {/* Expandable note area */}
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 mb-2 transition-colors"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? "Hide note" : "Add clinical note (optional)"}
            </button>

            {expanded && (
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Clinical reasoning, dosage adjustment, contraindication…"
                rows={2}
                className="w-full text-[12px] bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400/40 resize-none mb-3"
              />
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handleAction("approved")}
                disabled={!!saving}
                className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[13px] font-semibold transition-colors disabled:opacity-60"
              >
                {saving === "approved"
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <CheckCircle2 className="h-3.5 w-3.5" />
                }
                Approve
              </button>
              <button
                onClick={() => handleAction("rejected")}
                disabled={!!saving}
                className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-white border-2 border-red-200 hover:bg-red-50 text-red-600 text-[13px] font-semibold transition-colors disabled:opacity-60"
              >
                {saving === "rejected"
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <XCircle className="h-3.5 w-3.5" />
                }
                Reject
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Patient recommendation row ───────────────────────────────────────────────
const PatientRecRow = ({ rec }: { rec: any }) => {
  const status: RecStatus = rec.status ?? "pending";
  return (
    <div className={`flex items-center justify-between py-3 gap-4 border-b border-slate-100 last:border-0 ${
      status === "approved" ? "bg-emerald-50/30 -mx-4 px-4 rounded-lg" : ""
    }`}>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-slate-800 truncate">
          {rec.strains?.name}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
          {rec.explanation}
        </p>
        {rec.review_note && (
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <Stethoscope className="h-3 w-3 shrink-0" />
            Doctor note: {rec.review_note}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
          {rec.match_score}%
        </span>
        <StatusBadge status={status} />
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const DashboardPage = () => {
  const { currentUser } = useAppState();
  const navigate        = useNavigate();
  const isDoctor        = useIsDoctor();

  const [patients, setPatients]                   = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [isLoading, setIsLoading]                 = useState(true);
  const [usageHistory, setUsageHistory]           = useState<any[]>([]);
  const [recommendations, setRecommendations]     = useState<any[]>([]);
  const [chartData, setChartData]                 = useState<any[]>([]);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        if (isDoctor) {
          const { data } = await supabase
            .from("patients").select("id, users(full_name)");
          setPatients(data || []);
        } else if (currentUser?.id) {
          // Resolve users.id → patients.id
          const { data: patientRow } = await supabase
            .from("patients").select("id")
            .eq("user_id", currentUser.id).maybeSingle();

          const pid = patientRow?.id;
          if (pid) await loadAnalytics(pid);
        }
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [currentUser, isDoctor]);

  // ── Load analytics ────────────────────────────────────────────────────────
  const loadAnalytics = useCallback(async (patientId: string) => {
    setSelectedPatientId(patientId);

    const [{ data: usage }, { data: recs }] = await Promise.all([
      supabase
        .from("usage_records")
        .select("id, usage_date, dosage, consumption_method, strains(name), feedback(effectiveness_score)")
        .eq("patient_id", patientId)
        .order("usage_date", { ascending: true }),
      supabase
        .from("recommendations")
        .select("id, recommendation_date, match_score, explanation, status, review_note, strains(name, thc_level, cbd_level, category)")
        .eq("patient_id", patientId)
        .order("recommendation_date", { ascending: false }),
    ]);

    setUsageHistory(usage || []);
    setRecommendations(recs || []);

    const chart = (usage || [])
      .filter((u: any) => u.feedback?.length > 0)
      .map((u: any) => ({
        date:   new Date(u.usage_date).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" }),
        score:  u.feedback[0].effectiveness_score,
        strain: u.strains?.name,
      }));
    setChartData(chart);
  }, []);

  // ── Approve / reject handler ──────────────────────────────────────────────
  const handleDecision = useCallback(async (
    recId: string,
    status: "approved" | "rejected",
    note: string,
  ) => {
    const { error } = await supabase
      .from("recommendations")
      .update({
        status,
        review_note: note || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", recId);

    if (!error) {
      // Optimistic update — no full reload needed
      setRecommendations((prev) =>
        prev.map((r) =>
          r.id === recId ? { ...r, status, review_note: note || null } : r
        )
      );
    }
  }, []);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const avgScore =
    chartData.length > 0
      ? (chartData.reduce((s, d) => s + d.score, 0) / chartData.length).toFixed(1)
      : "—";

  const pendingCount   = recommendations.filter((r) => (r.status ?? "pending") === "pending").length;
  const approvedCount  = recommendations.filter((r) => r.status === "approved").length;

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {isDoctor ? "Clinical dashboard" : "My dashboard"}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Treatment efficacy tracking</p>
        </div>

        {isDoctor && (
          <div className="w-full sm:w-64">
            <Select value={selectedPatientId} onValueChange={loadAnalytics}>
              <SelectTrigger className="bg-white text-[13px]">
                <SelectValue placeholder="Select a patient…" />
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
      </div>

      {/* Doctor: no patient selected */}
      {isDoctor && !selectedPatientId ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Activity}
              title="Select a patient"
              desc="Choose a patient from the dropdown above to review and approve their recommendations."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard icon={ClipboardList} label="Usage logs"      value={usageHistory.length}    accent="emerald" />
            <MetricCard icon={Sparkles}      label="Recommendations" value={recommendations.length} accent="blue"    />
            <MetricCard icon={TrendingUp}    label="Avg efficacy"    value={avgScore} sub="out of 5" accent="amber"  />
            {isDoctor
              ? <MetricCard icon={Clock}     label="Pending review"  value={pendingCount} accent={pendingCount > 0 ? "amber" : "emerald"} />
              : <MetricCard icon={CheckCircle2} label="Approved"     value={approvedCount} accent="emerald" />
            }
          </div>

          {/* ── DOCTOR: Approval queue ─────────────────────────────────── */}
          {isDoctor && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-[14px] font-semibold text-slate-700 flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-blue-600" />
                  Recommendation review queue
                  {pendingCount > 0 && (
                    <span className="ml-auto text-[11px] font-bold bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full">
                      {pendingCount} pending
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recommendations.length === 0 ? (
                  <EmptyState
                    icon={Sparkles}
                    title="No recommendations yet"
                    desc="This patient has not generated any strain recommendations yet."
                    cta="Generate recommendations"
                    onCta={() => navigate("/recommendations")}
                  />
                ) : (
                  <div className="space-y-3">
                    {/* Pending first, then others */}
                    {[...recommendations]
                      .sort((a, b) => {
                        const order = { pending: 0, approved: 1, rejected: 2 };
                        return (order[a.status as RecStatus] ?? 0) - (order[b.status as RecStatus] ?? 0);
                      })
                      .map((rec) => (
                        <ApprovalCard
                          key={rec.id}
                          rec={rec}
                          onDecision={handleDecision}
                        />
                      ))
                    }
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid lg:grid-cols-3 gap-6">

            {/* Efficacy chart */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-[14px] font-medium text-slate-700 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" /> Efficacy trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="eff" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#059669" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#059669" stopOpacity={0}    />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} />
                        <YAxis domain={[0, 5]} fontSize={11} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} />
                        <Tooltip contentStyle={{ borderRadius: "8px", border: "0.5px solid #e2e8f0", fontSize: 12 }} labelStyle={{ color: "#475569" }} />
                        <Area type="monotone" dataKey="score" stroke="#059669" strokeWidth={2} fill="url(#eff)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    icon={TrendingUp}
                    title="No efficacy data yet"
                    desc="Submit feedback after a usage session to see the trend graph."
                    cta="Log feedback"
                    onCta={() => navigate("/feedback")}
                  />
                )}
              </CardContent>
            </Card>

            {/* Quick actions */}
            <div className="space-y-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-[14px] font-medium text-slate-700">Quick actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {!isDoctor && (
                    <button onClick={() => navigate("/recommendations")}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 transition-colors text-left">
                      <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="text-[13px] font-medium text-slate-700">View recommendations</span>
                    </button>
                  )}
                  <button onClick={() => navigate("/feedback")}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-200 hover:bg-blue-50 hover:border-blue-200 transition-colors text-left">
                    <MessageSquare className="h-4 w-4 text-blue-600 shrink-0" />
                    <span className="text-[13px] font-medium text-slate-700">
                      {isDoctor ? "View patient feedback" : "Log feedback"}
                    </span>
                  </button>
                  <button onClick={() => navigate("/patient-input")}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-200 hover:bg-amber-50 hover:border-amber-200 transition-colors text-left">
                    <ClipboardList className="h-4 w-4 text-amber-600 shrink-0" />
                    <span className="text-[13px] font-medium text-slate-700">
                      {isDoctor ? "Patient profiling" : "Update profile"}
                    </span>
                  </button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ── PATIENT: Recommendations with status badges ─────────────── */}
          {/* ── DOCTOR: shown as sub-list after main queue ─────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[14px] font-medium text-slate-700 flex items-center gap-2">
                <Leaf className="h-4 w-4 text-emerald-600" />
                {isDoctor ? "All recommendations" : "My recommendations"}
                {/* Patient: approved badge hint */}
                {!isDoctor && approvedCount > 0 && (
                  <span className="ml-auto text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {approvedCount} approved
                  </span>
                )}
                {/* Patient: pending hint */}
                {!isDoctor && pendingCount > 0 && (
                  <span className="ml-2 text-[11px] font-medium text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {pendingCount} pending review
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recommendations.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {recommendations.map((rec) =>
                    isDoctor
                      ? (
                        // Doctor: compact list (full cards are in the queue above)
                        <div key={rec.id} className="flex items-center justify-between py-3 gap-4">
                          <p className="text-[13px] font-medium text-slate-700 truncate">
                            {rec.strains?.name}
                          </p>
                          <StatusBadge status={rec.status ?? "pending"} />
                        </div>
                      )
                      : <PatientRecRow key={rec.id} rec={rec} />
                  )}
                </div>
              ) : (
                <EmptyState
                  icon={Leaf}
                  title="No recommendations yet"
                  desc="Fill in your medical profile to receive strain recommendations."
                  cta="Get recommendations"
                  onCta={() => navigate("/recommendations")}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
