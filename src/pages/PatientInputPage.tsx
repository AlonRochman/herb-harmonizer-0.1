import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "@/context/AppContext";
import { useIsDoctor } from "@/hooks/useIsDoctor";
import { supabase } from "../lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, ArrowLeft, Loader2, AlertCircle, User, Shield, Sparkles, Check } from "lucide-react";
import { medicalConditions } from "@/data/mockData";

// ─── Step definitions ─────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Patient details",      icon: User },
  { id: 2, label: "Clinical constraints", icon: Shield },
  { id: 3, label: "Recommendations",      icon: Sparkles },
];

// ─── Progress stepper ─────────────────────────────────────────────────────────
const Stepper = ({ current }: { current: number }) => (
  <div className="flex items-center gap-0 mb-8">
    {STEPS.map((step, i) => {
      const done    = current > step.id;
      const active  = current === step.id;
      const Icon    = step.icon;
      return (
        <div key={step.id} className="flex items-center flex-1 last:flex-none">
          {/* Circle */}
          <div className="flex flex-col items-center gap-1.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold border-2 transition-all duration-300 ${
              done   ? "bg-emerald-700 border-emerald-700 text-white" :
              active ? "bg-white border-emerald-700 text-emerald-700" :
                       "bg-white border-slate-200 text-slate-400"
            }`}>
              {done ? <Check className="h-3.5 w-3.5" /> : step.id}
            </div>
            <span className={`text-[11px] font-medium whitespace-nowrap hidden sm:block ${
              active ? "text-emerald-700" : done ? "text-slate-600" : "text-slate-400"
            }`}>
              {step.label}
            </span>
          </div>
          {/* Connector line */}
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 mb-5 transition-all duration-300 ${
              current > step.id ? "bg-emerald-700" : "bg-slate-200"
            }`} />
          )}
        </div>
      );
    })}
  </div>
);

// ─── Condition pill picker ────────────────────────────────────────────────────
const ConditionPicker = ({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) => (
  <div>
    <Input
      placeholder="Type or pick a condition…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      list="conditions-list"
      className="text-[13px] mb-2"
    />
    <datalist id="conditions-list">
      {medicalConditions.map((c) => <option key={c} value={c} />)}
    </datalist>
    <div className="flex flex-wrap gap-1.5 mt-2">
      {medicalConditions.slice(0, 6).map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all ${
            value === c
              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
              : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  </div>
);

// ─── Inline field error ───────────────────────────────────────────────────────
const FieldError = ({ msg }: { msg?: string }) =>
  msg ? <p className="text-[11px] text-red-500 mt-1">{msg}</p> : null;

// ─── Main page ────────────────────────────────────────────────────────────────
const PatientInputPage = () => {
  const navigate = useNavigate();
  const { setPatientProfile, setClinicalConstraints, currentUser } = useAppState();
  const isDoctor = useIsDoctor();

  // DB
  const [dbPatients, setDbPatients]   = useState<any[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [isSaving, setIsSaving]       = useState(false);

  // Steps
  const [step, setStep]               = useState(1);

  // Step 1
  const [selectedPatientId, setSelectedPatientId] = useState("manual");
  const [age, setAge]                 = useState("");
  const [gender, setGender]           = useState("");
  const [condition, setCondition]     = useState("");
  const [sensitivities, setSensitivities] = useState("");
  const [preferences, setPreferences] = useState("");

  // Step 2
  const [thcMax, setThcMax]           = useState("");
  const [cbdMin, setCbdMin]           = useState("");
  const [contraindications, setContraindications] = useState("");
  const [licenseInfo, setLicenseInfo] = useState("");

  // Errors (per-field)
  const [errors, setErrors]           = useState<Record<string, string>>({});

  // ── load existing patients (doctor) ────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase.from("patients").select(`
          id,
          users (full_name, email),
          patient_profiles (age, gender, medical_conditions, sensitivities, preferences),
          medical_licenses (category_approved, status)
        `);
        setDbPatients(data || []);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // ── auto-fill when picking a patient ───────────────────────────────────────
  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    setErrors({});
    if (patientId === "manual") {
      setAge(""); setGender(""); setCondition("");
      setSensitivities(""); setPreferences("");
      setThcMax(""); setCbdMin(""); setLicenseInfo("");
      return;
    }
    const p = dbPatients.find((x) => x.id === patientId);
    if (p?.patient_profiles?.[0]) {
      const pr = p.patient_profiles[0];
      setAge(pr.age?.toString() || "");
      setGender(pr.gender || "");
      setCondition(pr.medical_conditions || "");
      setSensitivities(pr.sensitivities || "");
      setPreferences(pr.preferences || "");
    }
    const lic = p?.medical_licenses?.find((l: any) => l.status === "active");
    if (lic?.category_approved) {
      setLicenseInfo(`Active license: ${lic.category_approved}`);
      const m = lic.category_approved.match(/T(\d+)\/C(\d+)/);
      if (m) { setThcMax(m[1]); setCbdMin(m[2]); }
    } else {
      setLicenseInfo(""); setThcMax(""); setCbdMin("");
    }
  };

  // ── step 1 validation ───────────────────────────────────────────────────────
  const handleNext = () => {
    const e: Record<string, string> = {};
    if (!age)       e.age       = "Required";
    if (!gender)    e.gender    = "Required";
    if (!condition) e.condition = "Required";
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setStep(2);
  };

  // ── submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const e: Record<string, string> = {};
    if (!thcMax) e.thcMax = "Required";
    if (!cbdMin) e.cbdMin = "Required";
    if (Object.keys(e).length) { setErrors(e); return; }

    setIsSaving(true);
    setErrors({});
    try {
      let finalId = selectedPatientId;

      if (finalId === "manual") {
        const { data: u }  = await supabase.from("users").insert({ full_name: `Patient (${age}yo)` }).select("id").single();
        const { data: pt } = await supabase.from("patients").insert({ user_id: u!.id }).select("id").single();
        finalId = pt!.id;
        await supabase.from("patient_profiles").insert({
          patient_id: finalId, age: +age, gender,
          medical_conditions: condition, sensitivities, preferences,
        });
        await supabase.from("clinical_constraints").insert({
          patient_id: finalId, thc_max: +thcMax, cbd_min: +cbdMin, contraindications,
        });
      } else {
        await supabase.from("patient_profiles").update({
          age: +age, gender, medical_conditions: condition, sensitivities, preferences,
        }).eq("patient_id", finalId);
        await supabase.from("clinical_constraints").delete().eq("patient_id", finalId);
        await supabase.from("clinical_constraints").insert({
          patient_id: finalId, thc_max: +thcMax, cbd_min: +cbdMin, contraindications,
        });
      }

      setPatientProfile({ patientId: finalId, age: +age, gender, medicalConditions: condition, sensitivities, preferences });
      setClinicalConstraints({ patientId: finalId, thcMax: +thcMax, cbdMin: +cbdMin, contraindications });

      // show step 3 briefly then navigate
      setStep(3);
      setTimeout(() => navigate("/recommendations"), 1200);
    } catch (err) {
      console.error(err);
      setErrors({ submit: "Failed to save. Check console for details." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-2 animate-in fade-in duration-500">

      {/* Stepper */}
      <Stepper current={step} />

      {/* ── Step 3 — success ─────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
            <Check className="h-7 w-7 text-emerald-600" />
          </div>
          <p className="text-[15px] font-medium text-slate-800">Profile saved</p>
          <p className="text-[13px] text-slate-400">Generating your recommendations…</p>
        </div>
      )}

      {/* ── Step 1 — patient details ──────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Patient details</h1>
            <p className="text-sm text-slate-400 mt-0.5">Basic medical profile for the recommendation engine</p>
          </div>

          {/* Load existing — only shown for doctors */}
          {isDoctor && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-2">
              <p className="text-[12px] font-medium text-emerald-700">Load existing patient</p>
              {isLoading ? (
                <div className="flex items-center gap-2 text-[13px] text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading patients…
                </div>
              ) : (
                <Select value={selectedPatientId} onValueChange={handleSelectPatient}>
                  <SelectTrigger className="bg-white text-[13px]">
                    <SelectValue placeholder="Select patient or enter manually…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual" className="text-emerald-700 font-medium">
                      + New patient (manual)
                    </SelectItem>
                    {dbPatients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.users?.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Age + Gender */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[13px]">Age <span className="text-red-400">*</span></Label>
              <Input
                type="number" placeholder="e.g. 45"
                value={age} onChange={(e) => setAge(e.target.value)}
                className={`text-[13px] ${errors.age ? "border-red-300" : ""}`}
              />
              <FieldError msg={errors.age} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Gender <span className="text-red-400">*</span></Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className={`text-[13px] ${errors.gender ? "border-red-300" : ""}`}>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FieldError msg={errors.gender} />
            </div>
          </div>

          {/* Condition */}
          <div className="space-y-1.5">
            <Label className="text-[13px]">Primary medical condition <span className="text-red-400">*</span></Label>
            <ConditionPicker value={condition} onChange={setCondition} />
            <FieldError msg={errors.condition} />
          </div>

          {/* Sensitivities */}
          <div className="space-y-1.5">
            <Label className="text-[13px]">
              Known allergies / sensitivities{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Textarea
              placeholder="e.g. Latex, certain terpenes…"
              value={sensitivities}
              onChange={(e) => setSensitivities(e.target.value)}
              className="text-[13px] resize-none" rows={2}
            />
          </div>

          {/* Preferences */}
          <div className="space-y-1.5">
            <Label className="text-[13px]">
              Treatment preferences{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Textarea
              placeholder="e.g. Non-smoking, evening use only…"
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              className="text-[13px] resize-none" rows={2}
            />
          </div>

          <Button
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white"
            onClick={handleNext}
          >
            Continue <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* ── Step 2 — clinical constraints ────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Clinical constraints</h1>
            <p className="text-sm text-slate-400 mt-0.5">Set safe limits for the recommendation engine</p>
          </div>

          {/* License badge */}
          {licenseInfo && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
              <Shield className="h-4 w-4 text-blue-600 shrink-0" />
              <p className="text-[12px] font-medium text-blue-700">{licenseInfo} — limits auto-applied</p>
            </div>
          )}

          {/* Global submit error */}
          {errors.submit && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-[13px] text-red-700">{errors.submit}</p>
            </div>
          )}

          {/* THC / CBD */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[13px]">Max THC (%) <span className="text-red-400">*</span></Label>
              <Input
                type="number" placeholder="e.g. 20"
                value={thcMax} onChange={(e) => setThcMax(e.target.value)}
                className={`text-[13px] ${errors.thcMax ? "border-red-300" : ""}`}
              />
              <FieldError msg={errors.thcMax} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Min CBD (%) <span className="text-red-400">*</span></Label>
              <Input
                type="number" placeholder="e.g. 4"
                value={cbdMin} onChange={(e) => setCbdMin(e.target.value)}
                className={`text-[13px] ${errors.cbdMin ? "border-red-300" : ""}`}
              />
              <FieldError msg={errors.cbdMin} />
            </div>
          </div>

          {/* Contraindications */}
          <div className="space-y-1.5">
            <Label className="text-[13px]">
              Contraindications{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Textarea
              placeholder="e.g. Cardiovascular conditions, psychosis history…"
              value={contraindications}
              onChange={(e) => setContraindications(e.target.value)}
              className="text-[13px] resize-none" rows={3}
            />
          </div>

          {/* Summary box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">Summary</p>
            <div className="grid grid-cols-2 gap-y-1 text-[13px]">
              <span className="text-slate-500">Condition</span>
              <span className="font-medium text-slate-800 truncate">{condition || "—"}</span>
              <span className="text-slate-500">Age</span>
              <span className="font-medium text-slate-800">{age || "—"}</span>
              <span className="text-slate-500">Max THC</span>
              <span className="font-medium text-slate-800">{thcMax ? `${thcMax}%` : "—"}</span>
              <span className="text-slate-500">Min CBD</span>
              <span className="font-medium text-slate-800">{cbdMin ? `${cbdMin}%` : "—"}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline" className="w-1/3 text-[13px]"
              onClick={() => { setStep(1); setErrors({}); }}
              disabled={isSaving}
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
            </Button>
            <Button
              className="w-2/3 bg-emerald-700 hover:bg-emerald-800 text-white text-[13px]"
              onClick={handleSubmit}
              disabled={isSaving}
            >
              {isSaving
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
                : <>Save & generate <ArrowRight className="ml-2 h-3.5 w-3.5" /></>
              }
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientInputPage;
