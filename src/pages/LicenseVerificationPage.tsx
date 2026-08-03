import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { read } from "@/lib/supabaseRead";
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
// The four categories were amber/teal/blue/violet. Amber and teal are resin and
// clinic — and on this page, of all pages, a licence code tinted amber would
// read as a THC value. The code is a document reference, so it is set as data
// in ink; the actual THC and CBD numbers below it carry the cannabinoid colour.
const CATEGORY_INFO: Record<string, { desc: string }> = {
  "T22/C4":   { desc: "High THC — severe chronic pain, advanced insomnia" },
  "T20/C4":   { desc: "Standard — chronic pain, anxiety, PTSD"            },
  "T10/C10":  { desc: "Balanced — anxiety, inflammation, mild pain"       },
  "T1/CBD":   { desc: "Near-zero THC — epilepsy, children"                },
};

// ─── Step indicator ───────────────────────────────────────────────────────────
const Steps = ({ current }: { current: number }) => (
  <div className="mb-8 flex items-center gap-2">
    {["Enter ID", "Verify", "Confirmed"].map((label, i) => {
      const step = i + 1;
      const done   = current > step;
      const active = current === step;
      return (
        <div key={label} className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className={`flex h-6 w-6 items-center justify-center border font-data text-[11px] font-semibold transition-colors ${
              done   ? "border-ink bg-ink text-paper" :
              active ? "border-ink bg-white text-ink" :
                       "border-rule bg-white text-ink/35"
            }`}>
              {done ? "✓" : step}
            </div>
            <span className={`hidden font-data text-[10px] uppercase tracking-[0.1em] sm:block ${
              active ? "text-ink" : done ? "text-ink/60" : "text-ink/35"
            }`}>
              {label}
            </span>
          </div>
          {i < 2 && <div className="h-px w-8 bg-rule" />}
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
      // Otherwise a failed read reports "Patient record not found", which is
      // a different problem with a different fix.
      const { data: patientRow } = await read<{ id: string }>(
        "license: resolve patient for current user",
        supabase.from("patients").select("id")
          .eq("user_id", currentUser.id).maybeSingle());

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
      const { data: profile } = await read<{ medical_conditions: string | null }>(
        "license: existing medical_conditions",
        supabase.from("patient_profiles").select("medical_conditions")
          .eq("patient_id", patientId).maybeSingle());

      if (profile && !profile.medical_conditions) {
        // Unchecked write: this silently failed and still reported success.
        const { error: profErr } = await supabase.from("patient_profiles")
          .update({ medical_conditions: licenseData.condition })
          .eq("patient_id", patientId);
        if (profErr) throw profErr;
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
    <div className="mx-auto max-w-md py-2 animate-in fade-in duration-500">

      {/* ── MASTHEAD ─────────────────────────────────────────────────────── */}
      <header className="mb-6 border-b-2 border-ink pb-5">
        <p className="font-data text-[10px] uppercase tracking-[0.2em] text-ink/45">
          Ministry of Health · MOH verification
        </p>
        <h1 className="mt-2 flex items-center gap-2 font-display text-[26px] font-semibold leading-tight tracking-tight text-ink">
          <ShieldCheck className="h-5 w-5 shrink-0 text-ink/40" />
          Licence verification
        </h1>
        <p className="mt-1 text-[13px] leading-relaxed text-ink/50">
          Enter your Israeli ID to import your T/C cannabis licence category and set your clinical constraints.
        </p>
      </header>

      <Steps current={step} />

      {/* ── STEP 1: Enter ID ────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4 border border-rule bg-white p-5">

          <div className="flex items-start gap-3 border border-rule bg-paper p-3">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink/35" />
            <p className="text-[12px] leading-relaxed text-ink/55">
              Your ID is used only to verify your MOH cannabis licence. It is not stored in our system.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 border border-flag/40 border-l-2 border-l-flag bg-flag/5 p-3 animate-in fade-in duration-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-flag" />
              <p className="text-[12px] leading-relaxed text-flag">{error}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 font-data text-[10px] uppercase tracking-[0.14em] text-ink/45">
              <IdCard className="h-3 w-3" /> Israeli ID number (ת.ז)
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
              className="h-12 w-full border border-rule bg-white px-4 text-center font-data text-[18px] tracking-[0.2em] text-ink outline-none transition-colors placeholder:text-ink/20 focus:border-ink/40 focus:ring-1 focus:ring-ink/20"
            />
            <p className="text-center font-data text-[10px] text-ink/35">
              Demo IDs: 206320988 · 209049857 · 123456789
            </p>
          </div>

          <button
            onClick={handleVerify}
            disabled={idNumber.length < 9 || isChecking}
            className="flex h-11 w-full items-center justify-center gap-2 bg-ink font-data text-[11px] uppercase tracking-[0.12em] text-paper transition-colors hover:bg-ink/85 disabled:opacity-50"
          >
            {isChecking
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking with MOH…</>
              : <><ShieldCheck className="h-3.5 w-3.5" /> Verify licence</>
            }
          </button>
        </div>
      )}

      {/* ── STEP 2: Confirm licence data ────────────────────────────────── */}
      {step === 2 && licenseData && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-400">

          {/* MOH record — an official document, so it is ink, not blue */}
          <div className="bg-ink p-5 text-paper">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="mb-1 font-data text-[10px] uppercase tracking-[0.2em] text-paper/50">
                  Ministry of Health — cannabis licence
                </p>
                <p className="font-display text-[18px] font-semibold leading-tight">{licenseData.name}</p>
                <p className="mt-1 font-data text-[11px] text-paper/60">
                  Valid until {new Date(licenseData.valid_until).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <ShieldCheck className="mb-1 h-6 w-6 text-paper/70" />
                <p className="font-data text-[9px] uppercase tracking-[0.12em] text-paper/60">Verified</p>
              </div>
            </div>
          </div>

          {/* Licence details */}
          <div className="space-y-3 border border-rule bg-white p-4">
            <p className="font-data text-[10px] uppercase tracking-[0.14em] text-ink/40">Licence details</p>

            <div className="flex items-center justify-between">
              <span className="text-[13px] text-ink/60">Licence category</span>
              <span className="border border-ink/25 px-3 py-0.5 font-data text-[14px] font-semibold text-ink">
                {licenseData.category}
              </span>
            </div>
            {catInfo && (
              <p className="text-[12px] italic text-ink/50">{catInfo.desc}</p>
            )}

            {/* The two limits every recommendation is filtered against */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="border border-rule p-3 text-center">
                <p className="mb-0.5 font-data text-[9px] uppercase tracking-[0.12em] text-resin">Max THC</p>
                <p className="font-data text-[20px] font-semibold text-resin">{licenseData.thc_max}%</p>
              </div>
              <div className="border border-rule p-3 text-center">
                <p className="mb-0.5 font-data text-[9px] uppercase tracking-[0.12em] text-clinic">Min CBD</p>
                <p className="font-data text-[20px] font-semibold text-clinic">{licenseData.cbd_min}%</p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-rule pt-2">
              <span className="text-[12px] text-ink/50">Monthly quota</span>
              <span className="font-data text-[12px] font-semibold text-ink">{licenseData.monthly_quota_g} g / month</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-ink/50">Primary condition</span>
              <span className="border border-rule px-2.5 py-0.5 text-[12px] text-ink/70">
                {licenseData.condition}
              </span>
            </div>
          </div>

          {/* What will be updated */}
          <div className="flex items-start gap-2.5 border border-rule bg-paper p-3.5">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink/40" />
            <div className="space-y-1 text-[12px] leading-relaxed text-ink/65">
              <p className="font-data text-[10px] uppercase tracking-[0.12em] text-ink/50">Applying this will:</p>
              <p>• Set THC max to <span className="font-data font-semibold text-resin">{licenseData.thc_max}%</span> in your clinical constraints</p>
              <p>• Set CBD min to <span className="font-data font-semibold text-clinic">{licenseData.cbd_min}%</span></p>
              <p>• Filter recommendations to strains within your licence</p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 border border-flag/40 border-l-2 border-l-flag bg-flag/5 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-flag" />
              <p className="text-[12px] text-flag">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => { setStep(1); setLicenseData(null); setIdNumber(""); }}
              className="h-11 flex-1 border border-rule font-data text-[10px] uppercase tracking-[0.12em] text-ink/55 transition-colors hover:border-ink/35 hover:text-ink"
            >
              Back
            </button>
            <button
              onClick={handleApply}
              disabled={isSaving}
              className="flex h-11 flex-1 items-center justify-center gap-2 bg-ink font-data text-[10px] uppercase tracking-[0.12em] text-paper transition-colors hover:bg-ink/85 disabled:opacity-60"
            >
              {isSaving
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
                : <><CheckCircle2 className="h-3.5 w-3.5" /> Apply to my profile</>
              }
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Done ─────────────────────────────────────────────────── */}
      {step === 3 && licenseData && (
        <div className="flex flex-col items-center gap-5 py-8 animate-in fade-in duration-500">
          <CheckCircle2 className="h-8 w-8 text-ink" />
          <div className="space-y-1 text-center">
            <p className="font-display text-[16px] font-semibold text-ink">Licence verified ✓</p>
            <p className="text-[13px] text-ink/55">
              <span className="font-data">{licenseData.category}</span> limits applied to your profile.
            </p>
            <p className="font-data text-[11px] text-ink/45">
              Recommendations will now only include{" "}
              <span className="text-resin">THC ≤{licenseData.thc_max}%</span> ·{" "}
              <span className="text-clinic">CBD ≥{licenseData.cbd_min}%</span>
            </p>
          </div>
          <div className="flex w-full max-w-xs gap-3">
            <button
              onClick={() => navigate("/recommendations")}
              className="flex h-10 flex-1 items-center justify-center gap-1.5 bg-ink font-data text-[10px] uppercase tracking-[0.12em] text-paper transition-colors hover:bg-ink/85"
            >
              Get recommendations <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default LicenseVerificationPage;
