import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAppState } from "@/context/AppContext";
import {
  ShieldCheck, Loader2, AlertCircle, CheckCircle2,
  IdCard, Lock, ArrowRight, Info,
} from "lucide-react";

// ─── Simulated MOH license database ──────────────────────────────────────────
// In production: replace with real API call to MOH (יק"ר) system
const MOH_LICENSE_DB: Record<string, {
  name: string;
  category: string;
  thc_max: number;
  cbd_min: number;
  monthly_quota_g: number;
  valid_until: string;
  condition: string;
}> = {
  "206320988": { name: "מתן צאיג",    category: "T22/C4",  thc_max: 22, cbd_min: 4,  monthly_quota_g: 50, valid_until: "2026-12-01", condition: "Chronic Pain"  },
  "209049857": { name: "אלון רוכמן",  category: "T20/C4",  thc_max: 20, cbd_min: 4,  monthly_quota_g: 30, valid_until: "2027-03-15", condition: "Anxiety"       },
  "208910224": { name: "אלון בהלול",  category: "T10/C10", thc_max: 10, cbd_min: 10, monthly_quota_g: 40, valid_until: "2026-09-30", condition: "PTSD"          },
  "123456789": { name: "Demo Patient",category: "T20/C4",  thc_max: 20, cbd_min: 4,  monthly_quota_g: 30, valid_until: "2027-01-01", condition: "Anxiety"       },
  "111111111": { name: "Demo Patient",category: "T22/C4",  thc_max: 22, cbd_min: 4,  monthly_quota_g: 50, valid_until: "2027-06-01", condition: "Chronic Pain"  },
  "222222222": { name: "Test Patient",category: "T10/C10", thc_max: 10, cbd_min: 10, monthly_quota_g: 40, valid_until: "2026-11-30", condition: "PTSD"          },
};

// ─── T/C category info ────────────────────────────────────────────────────────
const CATEGORY_INFO: Record<string, { desc: string; color: string }> = {
  "T22/C4":   { desc: "High THC — severe chronic pain, advanced insomnia", color: "text-amber-700 bg-amber-50 border-amber-200"   },
  "T20/C4":   { desc: "Standard — chronic pain, anxiety, PTSD",            color: "text-teal-700   bg-teal-50   border-teal-200"   },
  "T10/C10":  { desc: "Balanced — anxiety, inflammation, mild pain",        color: "text-blue-700   bg-blue-50   border-blue-200"   },
  "T1/CBD":   { desc: "Near-zero THC — epilepsy, children",                 color: "text-purple-700 bg-purple-50 border-purple-200" },
};

// ─── Step indicator ───────────────────────────────────────────────────────────
const Steps = ({ current }: { current: number }) => (
  <div className="flex items-center gap-2 mb-8">
    {["Enter ID", "Verify", "Confirmed"].map((label, i) => {
      const step = i + 1;
      const done   = current > step;
      const active = current === step;
      return (
        <div key={label} className="flex items-center gap-2">
          <div className={`flex items-center gap-2 ${active ? "opacity-100" : done ? "opacity-70" : "opacity-30"}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
              done   ? "bg-emerald-600 text-white" :
              active ? "bg-slate-900   text-white" :
                       "bg-slate-200   text-slate-500"
            }`}>
              {done ? "✓" : step}
            </div>
            <span className="text-[12px] font-medium text-slate-600 hidden sm:block">{label}</span>
          </div>
          {i < 2 && <div className="w-8 h-px bg-slate-200" />}
        </div>
      );
    })}
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
const LicenseVerificationPage = () => {
  const navigate   = useNavigate();
  const { currentUser } = useAppState();

  const [step,        setStep]       = useState(1);
  const [idNumber,    setIdNumber]   = useState("");
  const [isChecking,  setIsChecking] = useState(false);
  const [error,       setError]      = useState("");
  const [licenseData, setLicenseData] = useState<typeof MOH_LICENSE_DB[string] | null>(null);
  const [isSaving,    setIsSaving]   = useState(false);
  const [saved,       setSaved]      = useState(false);

  // ── Validate Israeli ID (Luhn-like check) ────────────────────────────────
  const validateIsraeliId = (id: string): boolean => {
    if (id.length !== 9 || !/^\d+$/.test(id)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      let d = parseInt(id[i]) * (i % 2 === 0 ? 1 : 2);
      if (d > 9) d -= 9;
      sum += d;
    }
    return sum % 10 === 0;
  };

  // ── Step 1 → 2: check ID ─────────────────────────────────────────────────
  const handleVerify = async () => {
    setError("");
    const clean = idNumber.replace(/\D/g, "");

    if (clean.length !== 9) { setError("ID must be exactly 9 digits."); return; }
    // Note: Israeli ID Luhn check — we allow bypass for demo IDs
    const isDemo = clean in MOH_LICENSE_DB;
    if (!isDemo && !validateIsraeliId(clean)) {
      setError("Invalid Israeli ID number. Please check and try again.");
      return;
    }

    setIsChecking(true);
    // Simulate API latency
    await new Promise((r) => setTimeout(r, 1400));

    const data = MOH_LICENSE_DB[clean];
    if (!data) {
      setError("No active medical cannabis license found for this ID. If you believe this is an error, contact the Ministry of Health (MOH).");
      setIsChecking(false);
      return;
    }

    setLicenseData(data);
    setIsChecking(false);
    setStep(2);
  };

  // ── Step 2 → 3: apply constraints ────────────────────────────────────────
  const handleApply = async () => {
    if (!licenseData || !currentUser?.id) return;
    setIsSaving(true);

    try {
      // Resolve patient_id
      const { data: patientRow } = await supabase
        .from("patients").select("id")
        .eq("user_id", currentUser.id).maybeSingle();

      const patientId = patientRow?.id;
      if (!patientId) throw new Error("Patient record not found.");

      // Upsert clinical_constraints
      const { error: err } = await supabase
        .from("clinical_constraints")
        .upsert({
          patient_id:        patientId,
          thc_max:           licenseData.thc_max,
          cbd_min:           licenseData.cbd_min,
          contraindications: null,
        }, { onConflict: "patient_id" });

      if (err) throw err;

      // Also update patient_profile medical_conditions if empty
      const { data: profile } = await supabase
        .from("patient_profiles").select("medical_conditions")
        .eq("patient_id", patientId).maybeSingle();

      if (profile && !profile.medical_conditions) {
        await supabase.from("patient_profiles")
          .update({ medical_conditions: licenseData.condition })
          .eq("patient_id", patientId);
      }

      setSaved(true);
      setStep(3);
    } catch (e: any) {
      setError(e.message ?? "Could not save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const catInfo = licenseData ? CATEGORY_INFO[licenseData.category] : null;

  return (
    <div className="max-w-md mx-auto py-4 space-y-2 animate-in fade-in duration-500">

      {/* Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-semibold rounded-full px-3 py-1 mb-3 uppercase tracking-wide">
          <ShieldCheck className="h-3 w-3" />
          Ministry of Health · MOH Verification
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-1">License verification</h1>
        <p className="text-[13px] text-slate-400 leading-relaxed">
          Enter your Israeli ID to automatically import your T/C cannabis license category and set your clinical constraints.
        </p>
      </div>

      <Steps current={step} />

      {/* ── STEP 1: Enter ID ────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">

          <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
            <Lock className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-[12px] text-slate-500 leading-relaxed">
              Your ID is used only to verify your MOH cannabis license. It is not stored in our system.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-[12px] text-red-700 leading-relaxed">{error}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
              <IdCard className="h-3.5 w-3.5" /> Israeli ID number (ת.ז)
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={9}
              placeholder="000000000"
              value={idNumber}
              onChange={(e) => {
                setIdNumber(e.target.value.replace(/\D/g, ""));
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 text-[18px] font-mono tracking-[0.2em] text-center outline-none focus:ring-2 focus:ring-blue-400/40 focus:bg-white transition-all"
            />
            <p className="text-[11px] text-slate-400 text-center">
              Demo IDs: 206320988 · 209049857 · 123456789
            </p>
          </div>

          <button
            onClick={handleVerify}
            disabled={idNumber.length < 9 || isChecking}
            className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[14px] font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {isChecking
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking with MOH…</>
              : <><ShieldCheck className="h-4 w-4" /> Verify license</>
            }
          </button>
        </div>
      )}

      {/* ── STEP 2: Confirm license data ────────────────────────────────── */}
      {step === 2 && licenseData && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-400">

          {/* MOH badge */}
          <div className="bg-gradient-to-r from-blue-700 to-blue-800 rounded-2xl p-5 text-white relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/5" />
            <div className="flex items-start justify-between gap-3 relative z-10">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-200 mb-1">
                  Ministry of Health — Cannabis License
                </p>
                <p className="text-[18px] font-bold leading-tight">{licenseData.name}</p>
                <p className="text-[13px] text-blue-200 mt-1">
                  Valid until: {new Date(licenseData.valid_until).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
              </div>
              <div className="text-right shrink-0">
                <ShieldCheck className="h-8 w-8 text-blue-300 mb-1" />
                <p className="text-[10px] text-blue-300 font-medium">VERIFIED</p>
              </div>
            </div>
          </div>

          {/* Category card */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">License details</p>

            <div className="flex items-center justify-between">
              <span className="text-[13px] text-slate-600">License category</span>
              {catInfo && (
                <span className={`font-mono font-bold text-[14px] px-3 py-1 rounded-full border ${catInfo.color}`}>
                  {licenseData.category}
                </span>
              )}
            </div>
            {catInfo && (
              <p className="text-[12px] text-slate-500 italic">{catInfo.desc}</p>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 mb-0.5">Max THC</p>
                <p className="text-[20px] font-bold text-amber-700">{licenseData.thc_max}%</p>
              </div>
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-600 mb-0.5">Min CBD</p>
                <p className="text-[20px] font-bold text-teal-700">{licenseData.cbd_min}%</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[12px] text-slate-500">Monthly quota</span>
              <span className="text-[13px] font-semibold text-slate-700">{licenseData.monthly_quota_g}g / month</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-slate-500">Primary condition</span>
              <span className="text-[12px] font-medium text-slate-700 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
                {licenseData.condition}
              </span>
            </div>
          </div>

          {/* What will be updated */}
          <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
            <Info className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-[12px] text-emerald-700 leading-relaxed space-y-1">
              <p className="font-semibold">Applying this will automatically:</p>
              <p>• Set THC max to <strong>{licenseData.thc_max}%</strong> in your clinical constraints</p>
              <p>• Set CBD min to <strong>{licenseData.cbd_min}%</strong></p>
              <p>• Filter recommendations to strains within your license</p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-[12px] text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => { setStep(1); setLicenseData(null); setIdNumber(""); }}
              className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-500 text-[13px] hover:bg-slate-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleApply}
              disabled={isSaving}
              className="flex-1 h-11 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              {isSaving
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                : <><CheckCircle2 className="h-4 w-4" /> Apply to my profile</>
              }
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Done ─────────────────────────────────────────────────── */}
      {step === 3 && licenseData && (
        <div className="flex flex-col items-center py-8 gap-5 animate-in fade-in duration-500">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-[16px] font-bold text-slate-900">License verified ✓</p>
            <p className="text-[13px] text-slate-500">
              {licenseData.category} limits applied to your profile.
            </p>
            <p className="text-[12px] text-slate-400">
              Your recommendations will now only include strains within THC ≤{licenseData.thc_max}% · CBD ≥{licenseData.cbd_min}%
            </p>
          </div>
          <div className="flex gap-3 w-full max-w-xs">
            <button
              onClick={() => navigate("/recommendations")}
              className="flex-1 h-10 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              Get recommendations <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default LicenseVerificationPage;
