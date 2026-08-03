import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "@/context/AppContext";
import { useIsDoctor } from "@/hooks/useIsDoctor";
import { supabase } from "../lib/supabaseClient";
import { read, readOr } from "@/lib/supabaseRead";
import LoadError from "@/components/LoadError";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, ArrowLeft, Loader2, AlertCircle, User, Shield, Sparkles, Check } from "lucide-react";
import { medicalConditions } from "@/data/mockData";

// ─── Shared field styling ─────────────────────────────────────────────────────
// shadcn's Input/Textarea/SelectTrigger keep their rounded, ringed look, which
// is the single loudest way this page read as a different product. One class
// string squares them off onto rule/ink.
const fieldCls =
  "rounded-none border-rule bg-white text-[13px] text-ink placeholder:text-ink/25 " +
  "focus-visible:ring-1 focus-visible:ring-ink/20 focus-visible:border-ink/40";

const labelCls = "font-data text-[10px] uppercase tracking-[0.14em] text-ink/45";

// A required marker is a constraint on the form, not a clinical risk, so it is
// ink — flag stays reserved for a value that endangers a limit.
const Req = () => <span className="text-ink/35">*</span>;
const Opt = () => <span className="font-normal normal-case tracking-normal text-ink/30">optional</span>;

// ─── Step definitions ─────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Patient details",      icon: User },
  { id: 2, label: "Clinical constraints", icon: Shield },
  { id: 3, label: "Recommendations",      icon: Sparkles },
];

// ─── Progress stepper ─────────────────────────────────────────────────────────
// Rank marks in the instrument language: a completed step is solid ink, the
// current step is outlined, and the rest are rule.
const Stepper = ({ current }: { current: number }) => (
  <div className="mb-8 flex items-center gap-0">
    {STEPS.map((step, i) => {
      const done    = current > step.id;
      const active  = current === step.id;
      return (
        <div key={step.id} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <div className={`flex h-8 w-8 items-center justify-center border font-data text-[12px] font-semibold transition-colors ${
              done   ? "border-ink bg-ink text-paper" :
              active ? "border-ink bg-white text-ink" :
                       "border-rule bg-white text-ink/35"
            }`}>
              {done ? <Check className="h-3.5 w-3.5" /> : step.id}
            </div>
            <span className={`hidden whitespace-nowrap font-data text-[10px] uppercase tracking-[0.1em] sm:block ${
              active ? "text-ink" : done ? "text-ink/60" : "text-ink/35"
            }`}>
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`mx-2 mb-5 h-px flex-1 transition-colors ${
              current > step.id ? "bg-ink" : "bg-rule"
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
      className={`${fieldCls} mb-2`}
    />
    <datalist id="conditions-list">
      {medicalConditions.map((c) => <option key={c} value={c} />)}
    </datalist>
    <div className="mt-2 flex flex-wrap gap-1.5">
      {medicalConditions.slice(0, 6).map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`border px-2.5 py-1 text-[11px] transition-colors ${
            value === c
              ? "border-ink bg-ink text-paper"
              : "border-rule bg-white text-ink/55 hover:border-ink/35 hover:text-ink"
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
  msg ? <p className="mt-1 font-data text-[10px] uppercase tracking-[0.1em] text-flag">{msg}</p> : null;

// ─── Main page ────────────────────────────────────────────────────────────────
const PatientInputPage = () => {
  const navigate = useNavigate();
  const { setPatientProfile, setClinicalConstraints, currentUser } = useAppState();
  const isDoctor = useIsDoctor();

  // DB
  const [dbPatients, setDbPatients]   = useState<any[]>([]);
  const [patientsFailed, setPatientsFailed] = useState(false);
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
        const { data, failed } = await readOr<any[]>(
          "patient input: existing patients", [],
          supabase.from("patients").select(`
            id,
            users (full_name, email),
            patient_profiles (age, gender, medical_conditions, sensitivities, preferences),
            medical_licenses (category_approved, status)
          `),
        );
        setPatientsFailed(failed);
        setDbPatients(data);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // ── prefill for a logged-in patient (edit own profile, not create new) ─────
  useEffect(() => {
    if (isDoctor || !currentUser?.id) return;
    const prefill = async () => {
      const { data: patientRow } = await read<{ id: string }>(
        "patient input: resolve own patient row",
        supabase.from("patients").select("id")
          .eq("user_id", currentUser.id).maybeSingle(),
      );
      if (!patientRow?.id) return;

      // A failure here leaves the form blank instead of showing the saved
      // profile, which reads as "no profile yet" - so it gets logged.
      const [{ data: profile }, { data: constraints }] = await Promise.all([
        read<Record<string, any>>("patient input: prefill profile",
          supabase.from("patient_profiles").select("*")
            .eq("patient_id", patientRow.id).maybeSingle()),
        read<Record<string, any>>("patient input: prefill constraints",
          supabase.from("clinical_constraints").select("thc_max, cbd_min, contraindications")
            .eq("patient_id", patientRow.id).maybeSingle()),
      ]);
      if (profile) {
        setAge(profile.age != null ? String(profile.age) : "");
        setGender(profile.gender || "");
        setCondition(profile.medical_conditions || "");
        setSensitivities(profile.sensitivities || "");
        setPreferences(profile.preferences || "");
      }
      if (constraints) {
        setThcMax(constraints.thc_max != null ? String(constraints.thc_max) : "");
        setCbdMin(constraints.cbd_min != null ? String(constraints.cbd_min) : "");
        setContraindications(constraints.contraindications || "");
      }
    };
    prefill();
  }, [isDoctor, currentUser]);

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
  // Supabase never throws — it returns { error }. This helper makes silent
  // write failures impossible (previously "Profile saved" showed even on failure).
  const must = <T,>(res: { data: T; error: { message: string } | null }): T => {
    if (res.error) throw new Error(res.error.message);
    return res.data;
  };

  // Resolve (or create) the patients.id that belongs to the logged-in user,
  // so a patient updates their own record instead of creating orphan rows.
  const resolveOwnPatientId = async (): Promise<string> => {
    if (!currentUser?.id) throw new Error("Not logged in");
    const existing = must(await supabase
      .from("patients").select("id")
      .eq("user_id", currentUser.id).maybeSingle());
    if (existing?.id) return existing.id;
    const created = must(await supabase
      .from("patients").insert({ user_id: currentUser.id }).select("id").single());
    return created!.id;
  };

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
        if (!isDoctor && currentUser?.id) {
          // Logged-in patient → always write to their own record
          finalId = await resolveOwnPatientId();
        } else {
          // Doctor creating a brand-new patient manually
          const u  = must(await supabase.from("users")
            .insert({ full_name: `Patient (${age}yo)` }).select("id").single());
          const pt = must(await supabase.from("patients")
            .insert({ user_id: u!.id }).select("id").single());
          finalId = pt!.id;
        }
      }

      // Upsert profile: update if a row exists for this patient, otherwise insert
      const existingProfile = must(await supabase
        .from("patient_profiles").select("id")
        .eq("patient_id", finalId).maybeSingle());

      const profilePayload = {
        age: +age, gender, medical_conditions: condition, sensitivities, preferences,
      };
      if (existingProfile?.id) {
        must(await supabase.from("patient_profiles")
          .update(profilePayload).eq("patient_id", finalId));
      } else {
        must(await supabase.from("patient_profiles")
          .insert({ patient_id: finalId, ...profilePayload }));
      }

      // Replace clinical constraints
      must(await supabase.from("clinical_constraints").delete().eq("patient_id", finalId));
      must(await supabase.from("clinical_constraints").insert({
        patient_id: finalId, thc_max: +thcMax, cbd_min: +cbdMin, contraindications,
      }));

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
    <div className="mx-auto max-w-xl py-2 animate-in fade-in duration-500">

      {/* Stepper */}
      <Stepper current={step} />

      {/* ── Step 3 — success ─────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <Check className="h-6 w-6 text-ink" />
          <p className="text-[15px] font-medium text-ink">Profile saved</p>
          <p className="font-data text-[10px] uppercase tracking-[0.12em] text-ink/40">
            Generating your recommendations…
          </p>
        </div>
      )}

      {/* ── Step 1 — patient details ──────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          <header className="border-b-2 border-ink pb-4">
            <p className="font-data text-[10px] uppercase tracking-[0.2em] text-ink/45">
              Step 1 of 2
            </p>
            <h1 className="mt-2 font-display text-[26px] font-semibold leading-tight tracking-tight text-ink">
              Patient details
            </h1>
            <p className="mt-1 text-[13px] text-ink/50">
              Basic medical profile for the recommendation engine
            </p>
          </header>

          {/* Load existing — only shown for doctors */}
          {isDoctor && (
            <div className="space-y-2 border border-rule bg-white p-4">
              <p className={labelCls}>Load existing patient</p>
              {patientsFailed && <LoadError what="the patient list" />}
              {isLoading ? (
                <div className="flex items-center gap-2 font-data text-[11px] text-ink/40">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading patients…
                </div>
              ) : (
                <Select value={selectedPatientId} onValueChange={handleSelectPatient}>
                  <SelectTrigger className={fieldCls}>
                    <SelectValue placeholder="Select patient or enter manually…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual" className="font-data text-[12px]">
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
              <Label className={labelCls}>Age <Req /></Label>
              <Input
                type="number" placeholder="e.g. 45"
                value={age} onChange={(e) => setAge(e.target.value)}
                className={`${fieldCls} font-data ${errors.age ? "border-flag" : ""}`}
              />
              <FieldError msg={errors.age} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>Gender <Req /></Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className={`${fieldCls} ${errors.gender ? "border-flag" : ""}`}>
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
            <Label className={labelCls}>Primary medical condition <Req /></Label>
            <ConditionPicker value={condition} onChange={setCondition} />
            <FieldError msg={errors.condition} />
          </div>

          {/* Sensitivities */}
          <div className="space-y-1.5">
            <Label className={labelCls}>Known allergies / sensitivities <Opt /></Label>
            <Textarea
              placeholder="e.g. Latex, certain terpenes…"
              value={sensitivities}
              onChange={(e) => setSensitivities(e.target.value)}
              className={`${fieldCls} resize-none`} rows={2}
            />
          </div>

          {/* Preferences */}
          <div className="space-y-1.5">
            <Label className={labelCls}>Treatment preferences <Opt /></Label>
            <Textarea
              placeholder="e.g. Non-smoking, evening use only…"
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              className={`${fieldCls} resize-none`} rows={2}
            />
          </div>

          <button
            className="flex h-10 w-full items-center justify-center gap-2 bg-ink font-data text-[11px] uppercase tracking-[0.12em] text-paper transition-colors hover:bg-ink/85"
            onClick={handleNext}
          >
            Continue <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Step 2 — clinical constraints ────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-5">
          <header className="border-b-2 border-ink pb-4">
            <p className="font-data text-[10px] uppercase tracking-[0.2em] text-ink/45">
              Step 2 of 2
            </p>
            <h1 className="mt-2 font-display text-[26px] font-semibold leading-tight tracking-tight text-ink">
              Clinical constraints
            </h1>
            <p className="mt-1 text-[13px] text-ink/50">
              Set safe limits for the recommendation engine
            </p>
          </header>

          {/* License badge — a licence is a document, not a cannabinoid */}
          {licenseInfo && (
            <div className="flex items-center gap-2 border border-rule bg-white px-4 py-2.5">
              <Shield className="h-3.5 w-3.5 shrink-0 text-ink/45" />
              <p className="font-data text-[11px] text-ink/70">{licenseInfo} — limits auto-applied</p>
            </div>
          )}

          {/* Global submit error */}
          {errors.submit && (
            <div className="flex items-start gap-2 border border-flag/40 border-l-2 border-l-flag bg-flag/5 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-flag" />
              <p className="text-[13px] text-flag">{errors.submit}</p>
            </div>
          )}

          {/* THC / CBD — the two ceilings the engine filters on */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className={`${labelCls} text-resin`}>Max THC (%) <Req /></Label>
              <Input
                type="number" placeholder="e.g. 20"
                value={thcMax} onChange={(e) => setThcMax(e.target.value)}
                className={`${fieldCls} font-data ${errors.thcMax ? "border-flag" : ""}`}
              />
              <FieldError msg={errors.thcMax} />
            </div>
            <div className="space-y-1.5">
              <Label className={`${labelCls} text-clinic`}>Min CBD (%) <Req /></Label>
              <Input
                type="number" placeholder="e.g. 4"
                value={cbdMin} onChange={(e) => setCbdMin(e.target.value)}
                className={`${fieldCls} font-data ${errors.cbdMin ? "border-flag" : ""}`}
              />
              <FieldError msg={errors.cbdMin} />
            </div>
          </div>

          {/* Contraindications */}
          <div className="space-y-1.5">
            <Label className={labelCls}>Contraindications <Opt /></Label>
            <Textarea
              placeholder="e.g. Cardiovascular conditions, psychosis history…"
              value={contraindications}
              onChange={(e) => setContraindications(e.target.value)}
              className={`${fieldCls} resize-none`} rows={3}
            />
          </div>

          {/* Summary — the values that will be written, set as data */}
          <div className="border border-rule bg-white p-4">
            <p className={`${labelCls} mb-2`}>Summary</p>
            <dl className="grid grid-cols-2 gap-y-1 text-[12px]">
              <dt className="text-ink/45">Condition</dt>
              <dd className="truncate font-data text-ink">{condition || "—"}</dd>
              <dt className="text-ink/45">Age</dt>
              <dd className="font-data text-ink">{age || "—"}</dd>
              <dt className="text-ink/45">Max THC</dt>
              <dd className="font-data text-resin">{thcMax ? `${thcMax}%` : "—"}</dd>
              <dt className="text-ink/45">Min CBD</dt>
              <dd className="font-data text-clinic">{cbdMin ? `${cbdMin}%` : "—"}</dd>
            </dl>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              className="flex h-10 w-1/3 items-center justify-center gap-1.5 border border-rule font-data text-[11px] uppercase tracking-[0.12em] text-ink/65 transition-colors hover:border-ink/35 hover:text-ink disabled:opacity-60"
              onClick={() => { setStep(1); setErrors({}); }}
              disabled={isSaving}
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <button
              className="flex h-10 w-2/3 items-center justify-center gap-2 bg-ink font-data text-[11px] uppercase tracking-[0.12em] text-paper transition-colors hover:bg-ink/85 disabled:opacity-60"
              onClick={handleSubmit}
              disabled={isSaving}
            >
              {isSaving
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
                : <>Save &amp; generate <ArrowRight className="h-3.5 w-3.5" /></>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientInputPage;
