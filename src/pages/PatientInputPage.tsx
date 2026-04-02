import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { medicalConditions } from "@/data/mockData";
import { User, Shield, ArrowRight } from "lucide-react";

const PatientInputPage = () => {
  const navigate = useNavigate();
  const { setPatientProfile, setClinicalConstraints } = useAppState();

  const [step, setStep] = useState(1);
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [condition, setCondition] = useState("");
  const [sensitivities, setSensitivities] = useState("");
  const [preferences, setPreferences] = useState("");
  const [thcMax, setThcMax] = useState("");
  const [cbdMin, setCbdMin] = useState("");
  const [contraindications, setContraindications] = useState("");

  const handleSubmit = () => {
    const profile = {
      patientId: 1,
      age: parseInt(age) || 30,
      gender,
      medicalConditions: condition,
      sensitivities,
      preferences,
    };
    const constraints = {
      patientId: 1,
      thcMax: thcMax ? parseFloat(thcMax) : null,
      cbdMin: cbdMin ? parseFloat(cbdMin) : null,
      contraindications,
    };
    setPatientProfile(profile);
    setClinicalConstraints(constraints);
    navigate("/recommendations");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-header px-6 py-8 text-primary-foreground">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-display font-bold">MediCanna Health</h1>
          <p className="text-sm opacity-90 mt-1">Patient Profile — Step {step} of 2</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 -mt-4 pb-12">
        {step === 1 && (
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                <User className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <CardTitle className="font-display">Patient Details</CardTitle>
                <p className="text-sm text-muted-foreground">Enter your medical context</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input id="age" type="number" placeholder="e.g. 45" value={age} onChange={(e) => setAge(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger id="gender"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Primary Medical Condition</Label>
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger>
                  <SelectContent>
                    {medicalConditions.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Known Allergies / Sensitivities</Label>
                <Textarea placeholder="List any known allergies or sensitivities..." value={sensitivities} onChange={(e) => setSensitivities(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Treatment Preferences</Label>
                <Textarea placeholder="e.g. prefer non-smoking, evening use..." value={preferences} onChange={(e) => setPreferences(e.target.value)} />
              </div>
              <Button className="w-full" onClick={() => setStep(2)}>
                Next Step <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                <Shield className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <CardTitle className="font-display">Clinical Constraints</CardTitle>
                <p className="text-sm text-muted-foreground">Set THC/CBD limits</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="thcMax">Max THC Level (%)</Label>
                  <Input id="thcMax" type="number" placeholder="e.g. 15" value={thcMax} onChange={(e) => setThcMax(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cbdMin">Min CBD Level (%)</Label>
                  <Input id="cbdMin" type="number" placeholder="e.g. 5" value={cbdMin} onChange={(e) => setCbdMin(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Contraindications</Label>
                <Textarea placeholder="Any contraindications to note..." value={contraindications} onChange={(e) => setContraindications(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                <Button className="flex-1" onClick={handleSubmit}>
                  Get Recommendations <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default PatientInputPage;
