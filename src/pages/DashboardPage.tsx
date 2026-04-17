import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAppState } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, Leaf, CheckCircle, Clock, PlusCircle, 
  Loader2, TrendingUp, Calendar, ClipboardList, Info, MessageSquare 
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';

const DashboardPage = () => {
  const { currentUser } = useAppState();
  const navigate = useNavigate();
  const isDoctor = currentUser?.role === 'doctor';

  const [patients, setPatients] = useState<any[]>([]);
  const [strains, setStrains] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [usageHistory, setUsageHistory] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        if (isDoctor) {
          const { data } = await supabase.from('patients').select('id, users(full_name)');
          if (data) setPatients(data);
        } else if (currentUser?.id) {
          loadPatientAnalytics(currentUser.id);
        }
        const { data: sData } = await supabase.from('strains').select('id, name');
        if (sData) setStrains(sData);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [currentUser]);

  const loadPatientAnalytics = async (patientId: string) => {
    if (!patientId) return;
    setSelectedPatientId(patientId);
    
    // מניעת שגיאת 400 במידה וזה משתמש דמו
    if (patientId === "demo-id") return;

    const { data: usage } = await supabase.from('usage_records').select(`
      id, usage_date, dosage, consumption_method, strains (name),
      feedback (effectiveness_score)
    `).eq('patient_id', patientId).order('usage_date', { ascending: true });

    const { data: recs } = await supabase.from('recommendations').select(`
      id, recommendation_date, match_score, explanation, strains (name)
    `).eq('patient_id', patientId).order('recommendation_date', { ascending: false });

    setUsageHistory(usage || []);
    setRecommendations(recs || []);

    const formattedData = usage
      ?.filter((u: any) => u.feedback && u.feedback.length > 0)
      .map((u: any) => ({
        date: new Date(u.usage_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }),
        score: u.feedback[0].effectiveness_score,
        strain: u.strains?.name
      })) || [];
    
    setChartData(formattedData);
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-green-600" /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{isDoctor ? "Clinical Dashboard" : "My Dashboard"}</h1>
          <p className="text-slate-500">Treatment efficacy tracking</p>
        </div>
        {isDoctor && (
          <div className="w-full md:w-80">
            <Select value={selectedPatientId} onValueChange={loadPatientAnalytics}>
              <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue placeholder="Select Patient..." /></SelectTrigger>
              <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.users?.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
      </div>

      {!selectedPatientId ? (
        <Card className="border-dashed border-2 h-64 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
          <Activity className="h-12 w-12 mb-2 opacity-20" />
          <p className="font-medium">Waiting for data selection...</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <Card className="shadow-sm">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5 text-blue-600" /> Efficacy Trend</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px] w-full mt-4">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis domain={[0, 5]} fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        <Area type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={3} fillOpacity={0.1} fill="#2563eb" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center bg-slate-50 rounded-lg border-dashed border border-slate-200">
                      <p className="text-sm text-slate-400">Not enough data to graph</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Leaf className="h-5 w-5 text-green-600" /> Recommendations</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {recommendations.length > 0 ? recommendations.map(rec => (
                  <div key={rec.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex justify-between">
                    <div>
                      <p className="font-bold">{rec.strains?.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{rec.explanation}</p>
                    </div>
                    <Badge className="bg-green-100 text-green-700 h-fit">{rec.match_score}%</Badge>
                  </div>
                )) : <p className="text-sm text-slate-400">No records found</p>}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-slate-900 text-white border-none">
              <CardContent className="pt-6">
                <p className="text-[10px] uppercase opacity-50 font-bold mb-4">Quick Stats</p>
                <div className="space-y-4">
                  <div><p className="text-2xl font-bold">{usageHistory.length}</p><p className="text-xs opacity-60">Usage Logs</p></div>
                  <div><p className="text-2xl font-bold">{recommendations.length}</p><p className="text-xs opacity-60">Recs</p></div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-blue-100">
              <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start gap-2" variant="outline" onClick={() => navigate("/feedback")}><MessageSquare className="h-4 w-4" /> Feedback</Button>
                <Button className="w-full justify-start gap-2" variant="outline" onClick={() => navigate("/patient-input")}><ClipboardList className="h-4 w-4" /> Profiling</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;