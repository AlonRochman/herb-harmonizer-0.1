import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAppState } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Leaf, ThumbsUp, Info, AlertCircle, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const RecommendationsPage = () => {
  const { currentUser } = useAppState();
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [patientData, setPatientData] = useState<any>(null);

  useEffect(() => {
    const generateRecommendations = async () => {
      setLoading(true);
      try {
        // 1. שליפת פרופיל המטופל (המחלות שלו)
        const { data: profile } = await supabase
          .from('patient_profiles')
          .select('*')
          .eq('patient_id', currentUser?.id)
          .single();

        setPatientData(profile);
        const conditions = profile?.medical_conditions?.toLowerCase() || "";

        // 2. שליפת כל הזנים מה-DB
        const { data: allStrains } = await supabase.from('strains').select('*');

        if (!allStrains) return;

        // 3. אלגוריתם ההתאמה (The Matching Logic)
        const scoredStrains = allStrains.map((strain: any) => {
          let score = 0;
          let reasons = [];

          // בדיקת התאמה לפי עמודת medical_uses ב-DB
          const medicalUses = strain.medical_uses ? JSON.stringify(strain.medical_uses).toLowerCase() : "";
          
          if (conditions.includes("pain") && medicalUses.includes("pain")) {
             score += 50;
             reasons.push("Proven efficacy for pain relief");
          }
          if (conditions.includes("insomnia") && medicalUses.includes("insomnia")) {
             score += 50;
             reasons.push("Strong sedative properties for sleep");
          }
          if (conditions.includes("inflammation") && medicalUses.includes("inflammation")) {
             score += 40;
             reasons.push("High anti-inflammatory profile");
          }

          // בדיקה לפי קטגוריה (Indica/Sativa)
          if ((conditions.includes("pain") || conditions.includes("sleep")) && strain.category === "Indica") {
            score += 20;
            reasons.push("Indica variety suitable for relaxation");
          }
          if (conditions.includes("depression") && strain.category === "Sativa") {
            score += 20;
            reasons.push("Sativa variety for mood elevation");
          }

          // בדיקת טרפנים (Terpenes)
          const terpenes = strain.terpenes ? JSON.stringify(strain.terpenes).toLowerCase() : "";
          if (conditions.includes("pain") && terpenes.includes("myrcene")) {
            score += 15;
            reasons.push("Contains Myrcene (Analgesic)");
          }

          return { ...strain, matchScore: Math.min(score, 98), explanation: reasons.slice(0, 2).join(", ") };
        });

        // מיון לפי הציון הגבוה ביותר ולקיחת ה-3 הכי טובים
        const top3 = scoredStrains
          .filter(s => s.matchScore > 0)
          .sort((a, b) => b.matchScore - a.matchScore)
          .slice(0, 3);

        setRecommendations(top3);
      } catch (err) {
        console.error("Recommendation Error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) generateRecommendations();
  }, [currentUser]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 space-y-4">
      <Loader2 className="h-10 w-10 animate-spin text-green-600" />
      <p className="text-slate-500 font-medium animate-pulse">AI is analyzing medical data & terpene profiles...</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header Section */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="h-3 w-3" /> AI-Powered Analysis
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900">Your Personalized Matches</h1>
        <p className="text-slate-500 max-w-xl mx-auto">
          Based on your medical condition ({patientData?.medical_conditions || "Not set"}), our clinical engine recommends the following strains.
        </p>
      </div>

      {recommendations.length === 0 ? (
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            We couldn't find an exact match. Please try updating your medical profile with more specific symptoms like "Pain" or "Insomnia".
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-6">
          {recommendations.map((strain, index) => (
            <Card key={strain.id} className={`overflow-hidden border-l-8 transition-all hover:shadow-xl ${index === 0 ? 'border-l-green-600 ring-2 ring-green-100' : 'border-l-slate-300'}`}>
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  {/* Match Score Circle */}
                  <div className="bg-slate-50 p-8 flex flex-col items-center justify-center border-r border-slate-100 md:w-48 shrink-0">
                    <div className="relative h-24 w-24 flex items-center justify-center">
                      <svg className="h-full w-full transform -rotate-90">
                        <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-200" />
                        <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={251} strokeDashoffset={251 - (251 * strain.matchScore) / 100} className="text-green-600" />
                      </svg>
                      <span className="absolute text-2xl font-black">{strain.matchScore}%</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tighter">Match Score</span>
                  </div>

                  {/* Info Section */}
                  <div className="p-6 flex-1 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                           <h2 className="text-2xl font-bold text-slate-900">{strain.name}</h2>
                           <Badge variant="outline" className="text-xs">{strain.category}</Badge>
                        </div>
                        <p className="text-sm text-slate-500 flex items-center gap-1">
                          <Leaf className="h-3 w-3" /> THC: {strain.thc_level}% | CBD: {strain.cbd_level}%
                        </p>
                      </div>
                      {index === 0 && <Badge className="bg-green-600">Best Therapeutic Fit</Badge>}
                    </div>

                    <div className="bg-green-50/50 p-4 rounded-lg border border-green-100">
                      <h4 className="text-xs font-bold text-green-800 uppercase mb-2 flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" /> Clinical Rationale
                      </h4>
                      <p className="text-sm text-green-900 leading-relaxed italic">
                        "{strain.explanation || "Matches your chemical profile needs."}"
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                       {strain.terpenes && JSON.parse(strain.terpenes).map((t: string) => (
                         <Badge key={t} variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-none">
                           {t}
                         </Badge>
                       ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Safety Notice */}
      <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3 items-start">
        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 leading-normal">
          <strong>Medical Disclaimer:</strong> These recommendations are generated by a clinical decision support algorithm based on chemical profiles. Final treatment should always be approved by your certified physician.
        </div>
      </div>

    </div>
  );
};

export default RecommendationsPage;