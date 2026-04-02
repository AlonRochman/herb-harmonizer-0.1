import { useNavigate } from "react-router-dom";
import { useAppState } from "@/context/AppContext";
import { strains } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, ClipboardList, MessageSquare, Plus, TrendingUp, Calendar, Leaf } from "lucide-react";

const DashboardPage = () => {
  const navigate = useNavigate();
  const { patientProfile, usageRecords, feedbacks, recommendations } = useAppState();

  const getStrainName = (id: number) => strains.find((s) => s.strainId === id)?.name ?? "Unknown";

  const avgEffectiveness = feedbacks.length > 0
    ? (feedbacks.reduce((sum, f) => sum + f.effectivenessScore, 0) / feedbacks.length).toFixed(1)
    : "—";

  const sideEffectCounts: Record<string, number> = {};
  feedbacks.forEach((f) => {
    if (f.sideEffects && f.sideEffects !== "None") {
      sideEffectCounts[f.sideEffects] = (sideEffectCounts[f.sideEffects] || 0) + 1;
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-header px-6 py-8 text-primary-foreground">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-display font-bold">MediCanna Dashboard</h1>
          <p className="text-sm opacity-90 mt-1">
            {patientProfile ? `Welcome back • ${patientProfile.medicalConditions}` : "Overview of your treatment journey"}
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 -mt-4 pb-12 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="stat-card shadow-sm">
            <ClipboardList className="h-4 w-4 text-primary" />
            <span className="text-2xl font-display font-bold">{recommendations.length}</span>
            <span className="text-xs text-muted-foreground">Recommendations</span>
          </div>
          <div className="stat-card shadow-sm">
            <Activity className="h-4 w-4 text-info" />
            <span className="text-2xl font-display font-bold">{usageRecords.length}</span>
            <span className="text-xs text-muted-foreground">Usage Records</span>
          </div>
          <div className="stat-card shadow-sm">
            <MessageSquare className="h-4 w-4 text-success" />
            <span className="text-2xl font-display font-bold">{feedbacks.length}</span>
            <span className="text-xs text-muted-foreground">Feedback Given</span>
          </div>
          <div className="stat-card shadow-sm">
            <TrendingUp className="h-4 w-4 text-warning" />
            <span className="text-2xl font-display font-bold">{avgEffectiveness}</span>
            <span className="text-xs text-muted-foreground">Avg. Effectiveness</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button className="h-auto py-4 flex flex-col gap-1" onClick={() => navigate("/patient-input")}>
            <Plus className="h-5 w-5" />
            <span className="text-sm">New Recommendation</span>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex flex-col gap-1" onClick={() => navigate("/feedback")}>
            <MessageSquare className="h-5 w-5" />
            <span className="text-sm">Submit Feedback</span>
          </Button>
        </div>

        {/* Past Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" /> Past Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recommendations yet.</p>
            ) : (
              recommendations.map((rec) => (
                <div key={rec.recommendationId} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                  <Leaf className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{getStrainName(rec.strainId)}</p>
                    <p className="text-xs text-muted-foreground truncate">{rec.explanation}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    {rec.recommendationDate}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Usage History */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-info" /> Usage History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-muted-foreground font-medium">Date</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Strain</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Dosage</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {usageRecords.map((u) => (
                    <tr key={u.usageId} className="border-b last:border-0">
                      <td className="py-2">{u.usageDate}</td>
                      <td className="py-2 font-medium">{getStrainName(u.strainId)}</td>
                      <td className="py-2">{u.dosage}</td>
                      <td className="py-2">{u.consumptionMethod}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Feedback Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" /> Feedback Trends
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Effectiveness Over Time</p>
              <div className="flex items-end gap-2 h-24">
                {feedbacks.map((f) => (
                  <div key={f.feedbackId} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-md gradient-primary"
                      style={{ height: `${(f.effectivenessScore / 5) * 100}%` }}
                    />
                    <span className="text-xs text-muted-foreground">{f.effectivenessScore}/5</span>
                  </div>
                ))}
              </div>
            </div>
            {Object.keys(sideEffectCounts).length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Reported Side Effects</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(sideEffectCounts).map(([effect, count]) => (
                    <Badge key={effect} variant="secondary">
                      {effect} ({count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DashboardPage;
