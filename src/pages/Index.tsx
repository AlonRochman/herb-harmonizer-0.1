import { supabase } from '../lib/supabaseClient'
import { useEffect, useState } from 'react'
import { useNavigate } from "react-router-dom";
import { useAppState } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { 
  Leaf, ClipboardList, BarChart3, MessageSquare, 
  ArrowRight, Activity, Database, Heart, User 
} from "lucide-react";

const Index = () => {
  const [users, setUsers] = useState<any[]>([])
  const navigate = useNavigate();
  const { currentUser } = useAppState();
  const isDoctor = currentUser?.role === 'doctor';

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from('users').select('*').limit(4);
      if (data) setUsers(data);
    }
    fetchData()
  }, [])

  const features = isDoctor ? [
    { icon: ClipboardList, title: "Patient Profiling", desc: "Analyze clinical constraints", path: "/patient-input", color: "text-blue-600", bg: "bg-blue-100" },
    { icon: BarChart3, title: "Clinic Dashboard", desc: "Global analytics & trends", path: "/dashboard", color: "text-indigo-600", bg: "bg-indigo-100" },
    { icon: Database, title: "Strains Database", desc: "Manage cannabis genetics", path: "/strains", color: "text-purple-600", bg: "bg-purple-100" },
    { icon: MessageSquare, title: "Feedback Review", desc: "Monitor treatment efficacy", path: "/feedback", color: "text-orange-600", bg: "bg-orange-100" },
  ] : [
    { icon: Heart, title: "My Recommendations", desc: "AI-matched medical strains", path: "/recommendations", color: "text-rose-600", bg: "bg-rose-100" },
    { icon: ClipboardList, title: "Update Profile", desc: "Keep your symptoms current", path: "/patient-input", color: "text-blue-600", bg: "bg-blue-100" },
    { icon: MessageSquare, title: "Log Feedback", desc: "Report treatment success", path: "/feedback", color: "text-orange-600", bg: "bg-orange-100" },
    { icon: Database, title: "Strains Catalog", desc: "Explore medical varieties", path: "/strains", color: "text-purple-600", bg: "bg-purple-100" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-gradient-to-r from-green-700 to-green-900 rounded-3xl p-8 md:p-12 text-white shadow-lg relative overflow-hidden">
        <div className="max-w-3xl relative z-10">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-white/20 text-sm font-medium backdrop-blur-sm border border-white/10">
             Welcome, {currentUser?.full_name}
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">
            {isDoctor ? "Clinical Decision Support" : "Personalized Medical Support"}
          </h1>
          <p className="text-lg text-green-50 mb-8 opacity-90">
            Evidence-based medical cannabis platform.
          </p>
          <Button size="lg" className="bg-white text-green-900 hover:bg-slate-100 font-bold" onClick={() => navigate(isDoctor ? "/dashboard" : "/recommendations")}>
             Get Started <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
          {features.map((f) => (
            <Card key={f.title} className="shadow-sm hover:shadow-md transition-all cursor-pointer group" onClick={() => navigate(f.path)}>
              <CardContent className="p-6 flex items-start gap-4">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${f.bg}`}>
                  <f.icon className={`h-6 w-6 ${f.color}`} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg group-hover:text-green-700">{f.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{f.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-3 border-b"><CardTitle className="text-lg flex items-center gap-2"><Activity className="h-5 w-5 text-blue-600" /> Status</CardTitle></CardHeader>
          <CardContent className="pt-4 text-center">
             <p className="text-sm text-slate-600 font-medium">Session Active</p>
             <p className="text-xs text-slate-400 mt-1">Role: {currentUser?.role}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;