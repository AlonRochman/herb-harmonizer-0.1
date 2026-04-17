import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare, User, Leaf, Star, Loader2, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const FeedbackPage = () => {
  const navigate = useNavigate();

  // DB States
  const [patients, setPatients] = useState<any[]>([]);
  const [usageRecords, setUsageRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form States
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedUsageId, setSelectedUsageId] = useState("");
  const [score, setScore] = useState<string>("");
  const [sideEffects, setSideEffects] = useState("");
  const [comments, setComments] = useState("");
  
  // UI States
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // 1. Fetch Patients on load
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('id, users (full_name, email)');
        if (error) throw error;
        setPatients(data || []);
      } catch (error) {
        console.error("Error fetching patients:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPatients();
  }, []);

  // 2. Fetch Usage Records when a patient is selected
  useEffect(() => {
    if (!selectedPatientId) return;

    const fetchUsage = async () => {
      setSelectedUsageId(""); // Reset usage selection
      try {
        const { data, error } = await supabase
          .from('usage_records')
          .select(`
            id, 
            usage_date, 
            dosage,
            strains (name)
          `)
          .eq('patient_id', selectedPatientId)
          .order('usage_date', { ascending: false });
          
        if (error) throw error;
        setUsageRecords(data || []);
      } catch (error) {
        console.error("Error fetching usage records:", error);
      }
    };
    fetchUsage();
  }, [selectedPatientId]);

  // 3. Submit Feedback to Supabase
  const handleSubmit = async () => {
    if (!selectedUsageId || !score) {
      setErrorMsg("Please select a treatment record and provide an effectiveness score.");
      return;
    }

    setIsSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { error } = await supabase.from('feedback').insert({
        usage_id: selectedUsageId,
        effectiveness_score: parseInt(score),
        side_effects: sideEffects || "None",
        comments: comments
      });

      if (error) throw error;

      setSuccessMsg("Feedback submitted successfully! Thank you for helping the system learn.");
      
      // Clear form after 2 seconds and go to dashboard
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);

    } catch (error) {
      console.error("Error saving feedback:", error);
      setErrorMsg("Failed to save feedback to the database.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 animate-in fade-in duration-500">
      <div className="mb-8 text-center space-y-2">
        <h2 className="text-3xl font-bold text-slate-800">Treatment Feedback</h2>
        <p className="text-slate-500">Help the AI engine learn what works best for you</p>
      </div>

      <Card className="shadow-md border-slate-200">
        <CardHeader className="bg-orange-50/50 border-b pb-4 flex flex-row items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
            <MessageSquare className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <CardTitle className="text-xl">Log Experience</CardTitle>
            <CardDescription>Rate your recent cannabis treatment</CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6 pt-6">
          
          {errorMsg && (
            <Alert variant="destructive" className="bg-red-50 text-red-900 border-red-200">
              <AlertDescription className="font-medium">{errorMsg}</AlertDescription>
            </Alert>
          )}

          {successMsg && (
            <Alert className="bg-green-50 text-green-900 border-green-200 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="font-medium">{successMsg}</AlertDescription>
            </Alert>
          )}

          {/* Step 1: Identify User */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><User className="h-4 w-4" /> Who is logging feedback?</Label>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 h-10"><Loader2 className="h-4 w-4 animate-spin" /> Loading patients...</div>
            ) : (
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger><SelectValue placeholder="Select your profile..." /></SelectTrigger>
                <SelectContent>
                  {patients.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.users?.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Step 2: Select Treatment */}
          {selectedPatientId && (
            <div className="space-y-2 animate-in slide-in-from-top-2">
              <Label className="flex items-center gap-2"><Leaf className="h-4 w-4" /> Which treatment are you rating?</Label>
              <Select value={selectedUsageId} onValueChange={setSelectedUsageId}>
                <SelectTrigger>
                  <SelectValue placeholder={usageRecords.length === 0 ? "No previous treatments found" : "Select a recent treatment..."} />
                </SelectTrigger>
                <SelectContent>
                  {usageRecords.map(record => (
                    <SelectItem key={record.id} value={record.id}>
                      {record.strains?.name} - {new Date(record.usage_date).toLocaleDateString()} (Dose: {record.dosage})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Step 3: The Feedback Form */}
          {selectedUsageId && (
            <div className="space-y-5 border-t pt-5 mt-5 animate-in slide-in-from-top-2">
              
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Star className="h-4 w-4" /> Effectiveness Score (1-5) <span className="text-red-500">*</span></Label>
                <Select value={score} onValueChange={setScore}>
                  <SelectTrigger><SelectValue placeholder="Rate 1 (Poor) to 5 (Excellent)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Poor (No relief)</SelectItem>
                    <SelectItem value="2">2 - Fair (Slight relief)</SelectItem>
                    <SelectItem value="3">3 - Good (Moderate relief)</SelectItem>
                    <SelectItem value="4">4 - Very Good (Significant relief)</SelectItem>
                    <SelectItem value="5">5 - Excellent (Complete relief)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Side Effects Experienced</Label>
                <Textarea 
                  placeholder="e.g. Dry mouth, dizziness, none..." 
                  value={sideEffects} 
                  onChange={(e) => setSideEffects(e.target.value)} 
                />
              </div>

              <div className="space-y-2">
                <Label>General Comments</Label>
                <Textarea 
                  placeholder="How did this strain make you feel overall?" 
                  value={comments} 
                  onChange={(e) => setComments(e.target.value)} 
                />
              </div>

              <Button 
                className="w-full bg-orange-600 hover:bg-orange-700 text-white" 
                onClick={handleSubmit}
                disabled={isSaving || !!successMsg}
              >
                {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Submit Feedback"}
              </Button>
            </div>
          )}
          
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackPage;