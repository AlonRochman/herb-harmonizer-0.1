import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { read, readOr } from "@/lib/supabaseRead";
import LoadError from "@/components/LoadError";
import { useAppState } from "@/context/AppContext";
import { useIsDoctor } from "@/hooks/useIsDoctor";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

// Review state is information, so it is allowed colour — but not resin or
// clinic, which mean THC and CBD and nothing else. An undecided item is quiet
// ink, a decision is full-weight ink, and only the negative verdict takes flag.
const STATUS_CONFIG: Record<RecStatus, {
  label: string; icon: typeof Clock;
  pill: string; dot: string; border: string;
}> = {
  pending:  {
    label: "Awaiting review",
    icon: Clock,
    pill:   "border-rule text-ink/55",
    dot:    "bg-ink/25",
    border: "border-rule",
  },
  approved: {
    label: "Approved by doctor",
    icon: CheckCircle2,
    pill:   "border-ink/25 text-ink",
    dot:    "bg-ink",
    border: "border-ink/25",
  },
  rejected: {
    label: "Not recommended",
    icon: XCircle,
    pill:   "border-flag/35 text-flag",
    dot:    "bg-flag",
    border: "border-flag/35",
  },
};

const StatusBadge = ({ status }: { status: RecStatus }) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-data text-[10px] uppercase tracking-[0.1em] ${cfg.pill}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
};

// ─── Metric card ──────────────────────────────────────────────────────────────
// An instrument readout, not a stat card. The old version carried an
// emerald/blue/amber accent per metric, which encoded nothing — four colours
// for four counts. Values are font-data because they are clinical figures.
const MetricCard = ({
  label, value, sub, icon: Icon,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType;
}) => (
  <div className="border border-rule bg-white p-3.5">
    <div className="flex items-center gap-1.5 text-ink/40">
      <Icon className="h-3 w-3 shrink-0" />
      <p className="font-data text-[10px] uppercase tracking-[0.14em]">{label}</p>
    </div>
    <p className="mt-2 font-data text-[22px] font-semibold leading-none text-ink">{value}</p>
    {sub && <p className="mt-1 font-data text-[10px] text-ink/40">{sub}</p>}
  </div>
);

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyState = ({
  icon: Icon, title, desc, cta, onCta,
}: {
  icon: React.ElementType; title: string; desc: string;
  cta?: string; onCta?: () => void;
}) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <Icon className="h-5 w-5 text-ink/25 mb-3" />
    <p className="text-[14px] font-medium text-ink/80 mb-1">{title}</p>
    <p className="text-[13px] text-ink/45 max-w-xs mb-4">{desc}</p>
    {cta && onCta && (
      <button
        onClick={onCta}
        className="border border-ink/25 px-3 py-1.5 font-data text-[11px] uppercase tracking-[0.12em] text-ink transition-colors hover:bg-paper"
      >
        {cta}
      </button>
    )}
  </div>
);

// ─── Panel ────────────────────────────────────────────────────────────────────
// Replaces the shadcn Card here: a titled block closed by a hairline rule, so
// the page reads like the sections of a clinical report rather than a set of
// floating cards.
const Panel = ({
  title, icon: Icon, aside, children,
}: {
  title: string; icon?: React.ElementType;
  aside?: React.ReactNode; children: React.ReactNode;
}) => (
  <section className="border border-rule bg-white">
    <header className="flex items-center gap-2 border-b border-rule px-4 py-2.5">
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-ink/40" />}
      <h2 className="font-data text-[10px] uppercase tracking-[0.14em] text-ink/55">{title}</h2>
      {aside && <div className="ml-auto">{aside}</div>}
    </header>
    <div className="p-4">{children}</div>
  </section>
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
    <div className={`overflow-hidden border bg-white transition-all ${
      isPending ? "border-ink/30" : STATUS_CONFIG[status].border
    }`}>
      {/* Status rule */}
      <div className={`h-0.5 w-full ${STATUS_CONFIG[status].dot}`} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="font-display text-[15px] font-semibold leading-tight text-ink">
              {rec.strains?.name ?? "Unknown strain"}
            </p>
            <p className="mt-0.5 font-data text-[10px] text-ink/45">
              {new Date(rec.recommendation_date).toLocaleDateString("en-GB", {
                day: "2-digit", month: "short", year: "numeric",
              })} · rule sum {rec.match_score}
            </p>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Strain chips */}
        {rec.strains && (
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-data text-[11px]">
            <span className="text-resin">THC {rec.strains.thc_level}%</span>
            <span className="text-clinic">CBD {rec.strains.cbd_level}%</span>
            {rec.strains.category && (
              <span className="capitalize text-ink/45">{rec.strains.category}</span>
            )}
          </div>
        )}

        {/* Algorithm explanation */}
        {rec.explanation && (
          <p className="mb-3 border-l-2 border-ink/20 bg-paper px-3 py-2 text-[12px] leading-relaxed text-ink/65">
            {rec.explanation}
          </p>
        )}

        {/* Review note (if already decided) */}
        {!isPending && rec.review_note && (
          <div className={`mb-3 flex items-start gap-2 border-l-2 px-3 py-2 text-[12px] ${
            status === "approved" ? "border-ink/30 bg-paper text-ink/75" : "border-flag/40 bg-flag/5 text-flag"
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
              className="mb-2 flex items-center gap-1 font-data text-[10px] uppercase tracking-[0.1em] text-ink/40 transition-colors hover:text-ink/70"
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
                className="mb-3 w-full resize-none border border-rule bg-paper px-3 py-2 text-[12px] outline-none focus:border-ink/40 focus:ring-1 focus:ring-ink/20"
              />
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handleAction("approved")}
                disabled={!!saving}
                className="flex h-9 flex-1 items-center justify-center gap-1.5 bg-ink font-data text-[11px] uppercase tracking-[0.12em] text-paper transition-colors hover:bg-ink/85 disabled:opacity-60"
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
                className="flex h-9 flex-1 items-center justify-center gap-1.5 border border-flag/40 bg-white font-data text-[11px] uppercase tracking-[0.12em] text-flag transition-colors hover:bg-flag/5 disabled:opacity-60"
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
    <div className={`flex items-center justify-between gap-4 border-b border-rule py-3 last:border-0 ${
      status === "approved" ? "-mx-4 bg-paper px-4" : ""
    }`}>
      <div className="min-w-0">
        <p className="truncate font-display text-[13px] font-semibold text-ink">
          {rec.strains?.name}
        </p>
        <p className="mt-0.5 line-clamp-1 text-[11px] text-ink/45">
          {rec.explanation}
        </p>
        {rec.review_note && (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-ink/60">
            <Stethoscope className="h-3 w-3 shrink-0" />
            Doctor note: {rec.review_note}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="font-data text-[11px] text-ink/55">
          {rec.match_score}
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
  const [loadError, setLoadError]                 = useState<string | null>(null);
  const [reloadKey, setReloadKey]                 = useState(0);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        setLoadError(null);
        if (isDoctor) {
          const { data, failed } = await readOr<any[]>(
            "dashboard: patient list", [],
            supabase.from("patients").select("id, users(full_name)"),
          );
          if (failed) setLoadError("the patient list");
          setPatients(data);
        } else if (currentUser?.id) {
          // Resolve users.id → patients.id
          const { data: patientRow, failed } = await read<{ id: string }>(
            "dashboard: resolve patient for current user",
            supabase.from("patients").select("id")
              .eq("user_id", currentUser.id).maybeSingle(),
          );
          if (failed) setLoadError("your patient record");

          const pid = patientRow?.id;
          if (pid) await loadAnalytics(pid);
        }
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [currentUser, isDoctor, reloadKey]);

  // ── Load analytics ────────────────────────────────────────────────────────
  const loadAnalytics = useCallback(async (patientId: string) => {
    setSelectedPatientId(patientId);

    // The recommendations read backs the approve/reject queue: if it fails,
    // "no pending recommendations" would be a lie.
    const [usageRes, recsRes] = await Promise.all([
      readOr<any[]>("dashboard: usage history", [],
        supabase
          .from("usage_records")
          .select("id, usage_date, dosage, consumption_method, strains(name), feedback(effectiveness_score)")
          .eq("patient_id", patientId)
          .order("usage_date", { ascending: true })),
      readOr<any[]>("dashboard: recommendations", [],
        supabase
          .from("recommendations")
          .select("id, recommendation_date, match_score, explanation, status, review_note, strains(name, thc_level, cbd_level, category)")
          .eq("patient_id", patientId)
          .order("recommendation_date", { ascending: false })),
    ]);

    const usage = usageRes.data;
    if (usageRes.failed || recsRes.failed) {
      setLoadError(recsRes.failed ? "this patient's recommendations" : "this patient's usage history");
    }

    setUsageHistory(usage);
    setRecommendations(recsRes.data);

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
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-ink/40" />
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl py-2 animate-in fade-in duration-500">

      {/* Masthead — same clinical-report header as the recommendations page */}
      <header className="mb-6 border-b-2 border-ink pb-5">
        <p className="font-data text-[10px] uppercase tracking-[0.2em] text-ink/45">
          {isDoctor ? "Clinical review · rule-based" : "Treatment record"}
        </p>
        <h1 className="mt-2 font-display text-[26px] font-semibold leading-tight tracking-tight text-ink">
          {isDoctor ? "Recommendations for review" : "My treatment record"}
        </h1>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <dl className="flex flex-wrap gap-x-6 gap-y-1 font-data text-[11px]">
            {isDoctor && (
              <div className="flex gap-2">
                <dt className="text-ink/40">Awaiting review</dt>
                <dd className={pendingCount > 0 ? "text-ink" : "text-ink/60"}>{pendingCount}</dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt className="text-ink/40">Sessions</dt>
              <dd className="text-ink/75">{usageHistory.length}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-ink/40">Mean efficacy</dt>
              <dd className="text-ink/75">{avgScore} / 5</dd>
            </div>
          </dl>

          {isDoctor && (
            <div className="w-full sm:w-64">
              <Select value={selectedPatientId} onValueChange={loadAnalytics}>
                <SelectTrigger className="rounded-none border-rule bg-white font-data text-[11px]">
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
      </header>

      <div className="space-y-6">

      {loadError && (
        <LoadError what={loadError} onRetry={() => { setIsLoading(true); setReloadKey((k) => k + 1); }} />
      )}

      {/* Doctor: no patient selected */}
      {isDoctor && !selectedPatientId ? (
        <div className="border border-rule bg-white">
          <EmptyState
            icon={Activity}
            title="Select a patient"
            desc="Choose a patient from the dropdown above to review and approve their recommendations."
          />
        </div>
      ) : (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard icon={ClipboardList} label="Usage logs"      value={usageHistory.length} />
            <MetricCard icon={Sparkles}      label="Recommendations" value={recommendations.length} />
            <MetricCard icon={TrendingUp}    label="Mean efficacy"   value={avgScore} sub="out of 5" />
            {isDoctor
              ? <MetricCard icon={Clock}        label="Awaiting review" value={pendingCount} />
              : <MetricCard icon={CheckCircle2} label="Approved"        value={approvedCount} />
            }
          </div>

          {/* ── DOCTOR: Approval queue ─────────────────────────────────── */}
          {isDoctor && (
            <Panel
              title="Recommendation review queue"
              icon={Stethoscope}
              aside={pendingCount > 0 ? (
                <span className="border border-ink/25 px-2 py-0.5 font-data text-[10px] uppercase tracking-[0.1em] text-ink">
                  {pendingCount} awaiting
                </span>
              ) : undefined}
            >
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
            </Panel>
          )}

          <div className="grid gap-6 lg:grid-cols-3">

            {/* Efficacy chart */}
            <div className="lg:col-span-2">
              <Panel title="Efficacy trend" icon={TrendingUp}>
                {chartData.length > 0 ? (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="eff" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#14201C" stopOpacity={0.12} />
                            <stop offset="95%" stopColor="#14201C" stopOpacity={0}    />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 3" vertical={false} stroke="#D8DCD6" />
                        <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false}
                          tick={{ fill: "#14201C", opacity: 0.45, fontFamily: "IBM Plex Mono, monospace" }} />
                        <YAxis domain={[0, 5]} fontSize={10} tickLine={false} axisLine={false}
                          tick={{ fill: "#14201C", opacity: 0.45, fontFamily: "IBM Plex Mono, monospace" }} />
                        <Tooltip
                          contentStyle={{ borderRadius: 0, border: "1px solid #D8DCD6", fontSize: 11, fontFamily: "IBM Plex Mono, monospace" }}
                          labelStyle={{ color: "#14201C" }} />
                        <Area type="monotone" dataKey="score" stroke="#14201C" strokeWidth={1.5} fill="url(#eff)" />
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
              </Panel>
            </div>

            {/* Quick actions */}
            <div className="space-y-3">
              <Panel title="Quick actions">
                <div className="space-y-2">
                  {!isDoctor && (
                    <button onClick={() => navigate("/recommendations")}
                      className="flex w-full items-center gap-3 border border-rule px-3 py-2.5 text-left transition-colors hover:bg-paper">
                      <Sparkles className="h-4 w-4 shrink-0 text-ink/45" />
                      <span className="text-[13px] font-medium text-ink/80">View recommendations</span>
                    </button>
                  )}
                  <button onClick={() => navigate("/feedback")}
                    className="flex w-full items-center gap-3 border border-rule px-3 py-2.5 text-left transition-colors hover:bg-paper">
                    <MessageSquare className="h-4 w-4 shrink-0 text-ink/45" />
                    <span className="text-[13px] font-medium text-ink/80">
                      {isDoctor ? "View patient feedback" : "Log feedback"}
                    </span>
                  </button>
                  <button onClick={() => navigate("/patient-input")}
                    className="flex w-full items-center gap-3 border border-rule px-3 py-2.5 text-left transition-colors hover:bg-paper">
                    <ClipboardList className="h-4 w-4 shrink-0 text-ink/45" />
                    <span className="text-[13px] font-medium text-ink/80">
                      {isDoctor ? "Patient profiling" : "Update profile"}
                    </span>
                  </button>
                </div>
              </Panel>
            </div>
          </div>

          {/* ── PATIENT: Recommendations with status badges ─────────────── */}
          {/* ── DOCTOR: shown as sub-list after main queue ─────────────── */}
          <Panel
            title={isDoctor ? "All recommendations" : "My recommendations"}
            icon={Leaf}
            aside={!isDoctor && (approvedCount > 0 || pendingCount > 0) ? (
              <div className="flex items-center gap-3 font-data text-[10px] uppercase tracking-[0.1em]">
                {approvedCount > 0 && <span className="text-ink">{approvedCount} approved</span>}
                {pendingCount > 0 && (
                  <span className="flex items-center gap-1 text-ink/55">
                    <AlertCircle className="h-3 w-3" /> {pendingCount} awaiting review
                  </span>
                )}
              </div>
            ) : undefined}
          >
              {recommendations.length > 0 ? (
                <div className="divide-y divide-rule">
                  {recommendations.map((rec) =>
                    isDoctor
                      ? (
                        // Doctor: compact list (full cards are in the queue above)
                        <div key={rec.id} className="flex items-center justify-between gap-4 py-3">
                          <p className="truncate font-display text-[13px] font-medium text-ink/85">
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
          </Panel>
        </>
      )}
      </div>
    </div>
  );
};

export default DashboardPage;
