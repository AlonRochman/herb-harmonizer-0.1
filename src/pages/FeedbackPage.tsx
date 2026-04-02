import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "@/context/AppContext";
import { strains, sideEffectOptions } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Star, MessageSquare } from "lucide-react";

const FeedbackPage = () => {
  const navigate = useNavigate();
  const { usageRecords, addFeedback } = useAppState();

  const [selectedUsageId, setSelectedUsageId] = useState("");
  const [effectiveness, setEffectiveness] = useState(0);
  const [sideEffect, setSideEffect] = useState("");
  const [comments, setComments] = useState("");

  const handleSubmit = () => {
    if (!selectedUsageId || effectiveness === 0) return;
    addFeedback({
      feedbackId: Date.now(),
      usageId: parseInt(selectedUsageId),
      effectivenessScore: effectiveness,
      sideEffects: sideEffect || "None",
      comments,
      createdAt: new Date().toISOString(),
    });
    navigate("/dashboard");
  };

  const getStrainName = (id: number) => strains.find((s) => s.strainId === id)?.name ?? "Unknown";

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-header px-6 py-8 text-primary-foreground">
        <div className="max-w-2xl mx-auto">
          <Button variant="ghost" size="sm" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 mb-2 -ml-2" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
          </Button>
          <h1 className="text-2xl font-display font-bold">Treatment Feedback</h1>
          <p className="text-sm opacity-90 mt-1">Rate your treatment experience</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 -mt-4 pb-12">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <CardTitle className="font-display">Submit Feedback</CardTitle>
              <p className="text-sm text-muted-foreground">Help us improve your treatment</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Usage Record</Label>
              <Select value={selectedUsageId} onValueChange={setSelectedUsageId}>
                <SelectTrigger><SelectValue placeholder="Select a usage record" /></SelectTrigger>
                <SelectContent>
                  {usageRecords.map((u) => (
                    <SelectItem key={u.usageId} value={u.usageId.toString()}>
                      {u.usageDate} — {getStrainName(u.strainId)} ({u.dosage})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Symptom Relief (1–5)</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setEffectiveness(n)}
                    className={`h-10 w-10 rounded-lg flex items-center justify-center transition-colors ${
                      n <= effectiveness
                        ? "gradient-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    <Star className={`h-5 w-5 ${n <= effectiveness ? "fill-current" : ""}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Adverse Effects</Label>
              <Select value={sideEffect} onValueChange={setSideEffect}>
                <SelectTrigger><SelectValue placeholder="Select if any" /></SelectTrigger>
                <SelectContent>
                  {sideEffectOptions.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes for Doctor</Label>
              <Textarea placeholder="Describe your experience..." value={comments} onChange={(e) => setComments(e.target.value)} />
            </div>

            <Button className="w-full" onClick={handleSubmit} disabled={!selectedUsageId || effectiveness === 0}>
              Submit Report
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default FeedbackPage;
