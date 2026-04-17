import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "@/context/AppContext";
import { supabase } from "../lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, Shield, ArrowRight, Loader2, FileText, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { medicalConditions } from "@/data/mockData";

const PatientInputPage = () => {
  const navigate = useNavigate();
  const { setPatientProfile, setClinicalConstraints } = useAppState();

  // DB States
  const [dbPatients, setDbPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingDB, setIsSavingDB] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form States
  const [step, setStep] = useState(1);
  const [selectedPatientId, setSelectedPatientId] = useState("manual");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [condition, setCondition] = useState("");
  const [sensitivities, setSensitivities] = useState("");
  const [preferences, setPreferences] = useState("");
  
  // Constraints States
  const [thcMax, setThcMax] = useState("");
  const [cbdMin, setCbdMin] = useState("");
  const [contraindications, setContraindications] = useState("");
  const [licenseInfo, setLicenseInfo] = useState("");

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const { data, error } = await supabase
          .from('patients')
          .select(`
            id,
            users ( full_name, email ),
            patient_profiles ( age, gender, medical_conditions, sensitivities, preferences ),
            medical_licenses ( category_approved, status )
          `);

        if (error) throw error;
        setDbPatients(data || []);
      } catch (error) {
        console.error("Error fetching patients:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPatients();
  }, []);

  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    setErrorMsg("");
    
    if (patientId === "manual") {
      setAge(""); setGender(""); setCondition("");
      setSensitivities(""); setPreferences("");
      setThcMax(""); setCbdMin(""); setLicenseInfo("");
      return;
    }

    const patient = dbPatients.find(p => p.id === patientId);
    if (patient && patient.patient_profiles && patient.patient_profiles.length > 0) {
      const profile = patient.patient_profiles[0];
      setAge(profile.age?.toString() || "");
      setGender(profile.gender || "");
      setCondition(profile.medical_conditions || "");
      setSensitivities(profile.sensitivities || "");
      setPreferences(profile.preferences || "");

      const activeLicense = patient.medical_licenses?.find((lic: any) => lic.status === 'active');
      if (activeLicense && activeLicense.category_approved) {
        setLicenseInfo(`Active License: ${activeLicense.category_approved}`);
        const match = activeLicense.category_approved.match(/T(\d+)\/C(\d+)/);
        if (match) {
          setThcMax(match[1]);
          setCbdMin(match[2]);
        }
      } else {
        setLicenseInfo("");
        setThcMax("");
        setCbdMin("");
      }
    }
  };

  // Validation for Step 1
  const handleNextStep = () => {
    if (!age || !gender || !condition) {
      setErrorMsg("Please fill in Age, Gender, and Medical Condition before proceeding.");
      return;
    }
    setErrorMsg("");
    setStep(2);
  };

  // Validation and DB Save for Step 2
  const handleSubmit = async () => {
    if (!thcMax || !cbdMin) {
      setErrorMsg("Please define Max THC and Min CBD limits.");
      return;
    }
    
    setErrorMsg("");
    setIsSavingDB(true);

    try {
      let finalPatientId = selectedPatientId;

      // If manual entry -> INSERT new records to DB
      if (finalPatientId === "manual") {
        // 1. Create User
        const { data: newUser, error: uError } = await supabase.from('users').insert({
          full_name: `New Patient (${age}yo)`
        }).select('id').single();
        if (uError) throw uError;

        // 2. Create Patient
        const { data: newPatient, error: pError } = await supabase.from('patients').insert({
          user_id: newUser.id
        }).select('id').single();
        if (pError) throw pError;
        finalPatientId = newPatient.id;

        // 3. Create Profile
        await supabase.from('patient_profiles').insert({
          patient_id: finalPatientId,
          age: parseInt(age),
          gender,
          medical_conditions: condition,
          sensitivities,
          preferences
        });

        // 4. Create Constraints
        await supabase.from('clinical_constraints').insert({
          patient_id: finalPatientId,
          thc_max: parseFloat(thcMax),
          cbd_min: parseFloat(cbdMin),
          contraindications
        });

      } else {
        // If existing patient -> UPDATE their records in DB based on UI changes
        await supabase.from('patient_profiles')
          .update({
            age: parseInt(age),
            gender,
            medical_conditions: condition,
            sensitivities,
            preferences
          }).eq('patient_id', finalPatientId);

        // Delete old constraints and insert new ones (safer than update if they didn't exist)
        await supabase.from('clinical_constraints').delete().eq('patient_id', finalPatientId);
        await supabase.from('clinical_constraints').insert({
          patient_id: finalPatientId,
          thc_max: parseFloat(thcMax),
          cbd_min: parseFloat(cbdMin),
          contraindications
        });
      }

      // Save to global context for the Recommendations page
      setPatientProfile({
        patientId: finalPatientId,
        age: parseInt(age),
        gender,
        medicalConditions: condition,
        sensitivities,
        preferences,
      });
      
      setClinicalConstraints({
        patientId: finalPatientId,
        thcMax: parseFloat(thcMax),
        cbdMin: parseFloat(cbdMin),
        contraindications,
      });
      
      navigate("/recommendations");
      
    } catch (error) {
      console.error("Database Save Error:", error);
      setErrorMsg("Failed to sync with database. Check console for details.");
    } finally {
      setIsSavingDB(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 animate-in fade-in duration-500">
      <div className="mb-8 text-center space-y-2">
        <h2 className="text-3xl font-bold text-slate-800">Diagnosis & Constraints</h2>
        <p className="text-slate-500">Step {step} of 2 - Define the clinical parameters</p>
      </div>

      {errorMsg && (
        <Alert variant="destructive" className="mb-6 bg-red-50 text-red-900 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="font-medium ml-2">{errorMsg}</AlertDescription>
        </Alert>
      )}

      {step === 1 && (
        <Card className="shadow-md border-slate-200">
          <CardHeader className="flex flex-row items-center gap-4 bg-slate-50/50 border-b pb-4">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Patient Details</CardTitle>
              <CardDescription>Select a patient from the database or enter details manually</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            
            <div className="space-y-2 bg-green-50 p-4 rounded-lg border border-green-100">
              <Label htmlFor="patient-select" className="text-green-800 font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" /> Load Existing Patient
              </Label>
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500 h-10">
                  <Loader2 className="h-4 w-4 animate-spin" /> Syncing with Database...
                </div>
              ) : (
                <Select value={selectedPatientId} onValueChange={handleSelectPatient}>
                  <SelectTrigger id="patient-select" className="bg-white">
                    <SelectValue placeholder="Select patient..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual" className="font-bold text-blue-600">
                      + Enter New Patient Manually
                    </SelectItem>
                    {dbPatients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.users?.full_name} {p.users?.email ? `(${p.users.email})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age <span className="text-red-500">*</span></Label>
                <Input id="age" type="number" placeholder="e.g. 45" value={age} onChange={(e) => setAge(e.target.value)} className={!age && errorMsg ? "border-red-300" : ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender <span className="text-red-500">*</span></Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger id="gender" className={!gender && errorMsg ? "border-red-300" : ""}><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Primary Medical Condition <span className="text-red-500">*</span></Label>
              <Input 
                placeholder="e.g. Oncology Pain, PTSD" 
                value={condition} 
                onChange={(e) => setCondition(e.target.value)} 
                list="conditions-list"
                className={!condition && errorMsg ? "border-red-300" : ""}
              />
              <datalist id="conditions-list">
                {medicalConditions.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            
            <div className="space-y-2">
              <Label>Known Allergies / Sensitivities</Label>
              <Textarea placeholder="Optional: List any known allergies..." value={sensitivities} onChange={(e) => setSensitivities(e.target.value)} />
            </div>
            
            <div className="space-y-2">
              <Label>Treatment Preferences</Label>
              <Textarea placeholder="Optional: Prefer non-smoking, evening use..." value={preferences} onChange={(e) => setPreferences(e.target.value)} />
            </div>
            
            <Button className="w-full bg-slate-900 hover:bg-slate-800" onClick={handleNextStep}>
              Next Step: Clinical Constraints <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="shadow-md border-slate-200">
          <CardHeader className="flex flex-row items-center gap-4 bg-slate-50/50 border-b pb-4">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Clinical Constraints</CardTitle>
              <CardDescription>Set system limits to ensure safe recommendations</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            
            {licenseInfo && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-md text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {licenseInfo} - Limits auto-applied.
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="thcMax">Max THC Level (%) <span className="text-red-500">*</span></Label>
                <Input id="thcMax" type="number" placeholder="e.g. 20" value={thcMax} onChange={(e) => setThcMax(e.target.value)} className={!thcMax && errorMsg ? "border-red-300" : ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cbdMin">Min CBD Level (%) <span className="text-red-500">*</span></Label>
                <Input id="cbdMin" type="number" placeholder="e.g. 4" value={cbdMin} onChange={(e) => setCbdMin(e.target.value)} className={!cbdMin && errorMsg ? "border-red-300" : ""} />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Contraindications</Label>
              <Textarea placeholder="Optional: Heart conditions..." value={contraindications} onChange={(e) => setContraindications(e.target.value)} />
            </div>
            
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" className="w-1/3" onClick={() => { setStep(1); setErrorMsg(""); }} disabled={isSavingDB}>
                Back
              </Button>
              <Button className="w-2/3 bg-green-600 hover:bg-green-700 text-white" onClick={handleSubmit} disabled={isSavingDB}>
                {isSavingDB ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving to Database...</>
                ) : (
                  <>Generate & Save <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PatientInputPage;