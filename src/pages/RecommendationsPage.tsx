import { useNavigate } from "react-router-dom";
import { useAppState } from "@/context/AppContext";
import { getRecommendations } from "@/lib/recommendationEngine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Leaf, FileText, Beaker } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const RecommendationsPage = () => {
  const [strains, setStrains] = useState<any[] | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const { data, error } = await supabase
        .from('strains')
        .select('*');

      if (error) {
        console.error(error);
      } else {
        const mappedData = (data || []).map((item: any) => ({
  strainId: item.id,
  name: item.name,
  thcLevel: item.thc_level,
  cbdLevel: item.cbd_level,
  terpenesProfile: item.terpenes_profile || "No data"
}));

setStrains(mappedData);
        console.log("STRAINS:", data);
      }
    };

    loadData();
  }, []);

  const navigate = useNavigate();
  const { patientProfile, clinicalConstraints, addRecommendation } = useAppState();

  if (!patientProfile || !clinicalConstraints) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-muted-foreground">No patient profile found. Please fill in your details first.</p>
            <Button onClick={() => navigate("/patient-input")}>Go to Patient Input</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  
  


if (!strains) {
  return <div>Loading...</div>;
}

console.log("STRAINS BEFORE ALGO:", strains);

const results = getRecommendations(patientProfile, clinicalConstraints, strains);

console.log("RESULTS:", results);

const handleAccept = (result: (typeof results)[0], rank: number) => {
  addRecommendation({
    recommendationId: Date.now(),
    patientId: patientProfile.patientId,
    strainId: result.strain.strainId,
    recommendationDate: new Date().toISOString().split("T")[0],
    explanation: result.explanation,
    createdAt: new Date().toISOString(),
  });
  navigate("/dashboard");
};

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-header px-6 py-8 text-primary-foreground">
        <div className="max-w-3xl mx-auto">
          <Button variant="ghost" size="sm" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 mb-2 -ml-2" onClick={() => navigate("/patient-input")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-2xl font-display font-bold">Recommended Strains</h1>
          <p className="text-sm opacity-90 mt-1">
            Top 3 matches for {patientProfile.medicalConditions} • THC ≤{clinicalConstraints.thcMax ?? "Any"}% • CBD ≥{clinicalConstraints.cbdMin ?? "Any"}%
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 -mt-4 pb-12 space-y-4">
        {results.map((result, i) => (
          <Card key={result.strain.strainId} className="shadow-lg overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-display font-bold text-sm ${
                    i === 0 ? "gradient-primary text-primary-foreground" : "bg-accent text-accent-foreground"
                  }`}>
                    #{i + 1}
                  </div>
                  <div>
                    <CardTitle className="font-display flex items-center gap-2">
                      <Leaf className="h-5 w-5 text-primary" />
                      {result.strain.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Match score: {result.score} pts</p>
                  </div>
                </div>
                {i === 0 && <Badge className="bg-primary text-primary-foreground">Best Match</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="stat-card">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">THC</span>
                  <span className="text-lg font-display font-bold">{result.strain.thcLevel}%</span>
                </div>
                <div className="stat-card">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">CBD</span>
                  <span className="text-lg font-display font-bold">{result.strain.cbdLevel}%</span>
                </div>
                <div className="stat-card">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Ratio</span>
                  <span className="text-lg font-display font-bold">
                    {result.strain.thcLevel}:{result.strain.cbdLevel}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-sm">
                <Beaker className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{result.strain.terpenesProfile}</span>
              </div>

              <div className="bg-accent/50 rounded-lg p-3 flex items-start gap-2">
                <FileText className="h-4 w-4 text-accent-foreground mt-0.5 shrink-0" />
                <p className="text-sm text-accent-foreground">{result.explanation}</p>
              </div>

              <Button className="w-full" variant={i === 0 ? "default" : "outline"} onClick={() => handleAccept(result, i)}>
                Accept Recommendation
              </Button>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
};

export default RecommendationsPage;
