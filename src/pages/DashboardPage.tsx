import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAppState } from "@/context/AppContext";
import { useIsDoctor } from "@/hooks/useIsDoctor";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity, Leaf, Loader2, TrendingUp,
  ClipboardList, MessageSquare, Sparkles,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

// ─── Small reusable metric card ───────────────────────────────────────────────
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
  };
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3">
      <div className={`p-2 rounded-lg ${colors[accent]}`}>
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
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
      <Icon className="h-5 w-5 text-slate-400" />
    </div>
    <p className="text-[14px] font-medium text-slate-700 mb-1">{title}</p>
    <p className="text-[13px] text-slate-400 max-w-xs mb-4">{desc}</p>
    {cta && onCta && (
      <Button size="sm" variant="outline" onClick={onCta} className="text-emerald-700 border-emerald-200 hover:bg-emerald-50">
        {cta}
      </Button>
    )}
  </div>
);

// ─── Main dashboard ───────────────────────────────────────────────────────────
const DashboardPage = () => {
  const { currentUser } = useAppState();
  const navigate = useNavigate();
  const isDoctor = useIsDoctor();

  const [patients, setPatients]             = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [isLoading, setIsLoading]           = useState(true);
  const [usageHistory, setUsageHistory]     = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [chartData, setChartData]           = useState<any[]>([]);

  // ── initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        if (isDoctor) {
          const { data } = await supabase
            .from("patients")
            .select("id, users(full_name)");
          if (data) setPatients(data);
        } else if (currentUser?.id) {
          await loadAnalytics(currentUser.id);
        }
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [currentUser]);

  // ── load analytics for a patient ─────────────────────────────────────────
  const loadAnalytics = async (patientId: string) => {
    if (!patientId || patientId === "demo-id") {
      setSelectedPatientId(patientId);
      return;
    }
    setSelectedPatientId(patientId);

    const [{ data: usage }, { data: recs }] = await Promise.all([
      supabase
        .from("usage_records")
        .select("id, usage_date, dosage, consumption_method, strains(name), feedback(effectiveness_score)")
        .eq("patient_id", patientId)
        .order("usage_date", { ascending: true }),
      supabase
        .from("recommendations")
        .select("id, recommendation_date, match_score, explanation, strains(name)")
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
  };

  // ── avg efficacy ─────────────────────────────────────────────────────────
  const avgScore =
    chartData.length > 0
      ? (chartData.reduce((s, d) => s + d.score, 0) / chartData.length).toFixed(1)
      : "—";

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">

      {/* ── Header ─────────────────────────────────────────────────────── */}
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

      {/* ── No selection (doctor) ───────────────────────────────────────── */}
      {isDoctor && !selectedPatientId ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Activity}
              title="Select a patient"
              desc="Choose a patient from the dropdown above to view their treatment analytics."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Metric cards ───────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MetricCard icon={ClipboardList} label="Usage logs"     value={usageHistory.length}     accent="emerald" />
            <MetricCard icon={Sparkles}      label="Recommendations" value={recommendations.length}  accent="blue" />
            <MetricCard icon={TrendingUp}    label="Avg efficacy"   value={avgScore}  sub="out of 5" accent="amber" />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">

            {/* ── Efficacy chart ─────────────────────────────────────────── */}
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
                            <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} />
                        <YAxis domain={[0, 5]} fontSize={11} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} />
                        <Tooltip
                          contentStyle={{ borderRadius: "8px", border: "0.5px solid #e2e8f0", fontSize: 12 }}
                          labelStyle={{ color: "#475569" }}
                        />
                        <Area
                          type="monotone" dataKey="score"
                          stroke="#059669" strokeWidth={2}
                          fill="url(#eff)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    icon={TrendingUp}
                    title="No efficacy data yet"
                    desc="Submit feedback after a usage session to see your trend graph."
                    cta="Log feedback"
                    onCta={() => navigate("/feedback")}
                  />
                )}
              </CardContent>
            </Card>

            {/* ── Quick actions ──────────────────────────────────────────── */}
            <div className="space-y-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-[14px] font-medium text-slate-700">Quick actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {!isDoctor && (
                    <button
                      onClick={() => navigate("/recommendations")}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 transition-colors text-left"
                    >
                      <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="text-[13px] font-medium text-slate-700">View recommendations</span>
                    </button>
                  )}
                  <button
                    onClick={() => navigate("/feedback")}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-200 hover:bg-blue-50 hover:border-blue-200 transition-colors text-left"
                  >
                    <MessageSquare className="h-4 w-4 text-blue-600 shrink-0" />
                    <span className="text-[13px] font-medium text-slate-700">Log feedback</span>
                  </button>
                  <button
                    onClick={() => navigate("/patient-input")}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-200 hover:bg-amber-50 hover:border-amber-200 transition-colors text-left"
                  >
                    <ClipboardList className="h-4 w-4 text-amber-600 shrink-0" />
                    <span className="text-[13px] font-medium text-slate-700">Update profile</span>
                  </button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ── Recommendations list ────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[14px] font-medium text-slate-700 flex items-center gap-2">
                <Leaf className="h-4 w-4 text-emerald-600" /> Past recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recommendations.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {recommendations.map((rec) => (
                    <div key={rec.id} className="flex items-center justify-between py-3 gap-4">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-slate-800 truncate">
                          {rec.strains?.name}
                        </p>
                        <p className="text-[12px] text-slate-400 mt-0.5 line-clamp-1">
                          {rec.explanation}
                        </p>
                      </div>
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0 font-medium">
                        {rec.match_score}%
                      </Badge>
                    </div>
                  ))}
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
