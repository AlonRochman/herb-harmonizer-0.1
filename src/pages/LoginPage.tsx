import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAppState } from "@/context/AppContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Leaf, Loader2, Stethoscope, User,
  ShieldCheck, Sparkles, TrendingUp, AlertCircle,
} from "lucide-react";

// ─── Known demo UUIDs from the users table ────────────────────────────────────
// User 1 → d5186dd5-23f1-47ae-b7b1-7e0dc59776b0 (patient)
// User 2 → 8eddc5e3-3fd9-4890-868e-7c17e76b63df (patient)
// Doctors don't have users rows — we identify them via the doctors table
const DEMO_PATIENT_USER_ID = "d5186dd5-23f1-47ae-b7b1-7e0dc59776b0";
const DEMO_PATIENT_NAME    = "User 1";

// ─── Feature bullet ───────────────────────────────────────────────────────────
const Feature = ({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
  <div className="flex items-center gap-2.5 text-[13px] text-slate-500">
    <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
      <Icon className="h-3.5 w-3.5 text-emerald-600" />
    </div>
    {text}
  </div>
);

// ─── Role card ────────────────────────────────────────────────────────────────
const RoleCard = ({
  icon: Icon, title, desc, color, onClick, disabled,
}: {
  icon: React.ElementType; title: string; desc: string;
  color: "emerald" | "blue"; onClick: () => void; disabled: boolean;
}) => {
  const border = color === "emerald"
    ? "hover:border-emerald-300 hover:bg-emerald-50"
    : "hover:border-blue-300 hover:bg-blue-50";
  const iconBg = color === "emerald"
    ? "bg-emerald-100 text-emerald-700"
    : "bg-blue-100 text-blue-700";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group w-full flex flex-col items-center gap-3 p-5 rounded-xl border border-slate-200 transition-all disabled:opacity-50 ${border}`}
    >
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${iconBg}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-center">
        <p className="text-[14px] font-semibold text-slate-800">{title}</p>
        <p className="text-[12px] text-slate-400 mt-0.5">{desc}</p>
      </div>
    </button>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const LoginPage = () => {
  const navigate = useNavigate();
  const { setCurrentUser } = useAppState();

  const [isLoading, setIsLoading]     = useState(false);
  const [errorMsg, setErrorMsg]       = useState("");
  const [fullName, setFullName]       = useState("");
  const [email, setEmail]             = useState("");
  const [showSignup, setShowSignup]   = useState(false);

  // ── Demo patient login — resolves real UUID from DB ──────────────────────
  const loginAsPatient = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      // Step 1: get the real user row
      const { data: userRow, error } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("id", DEMO_PATIENT_USER_ID)
        .maybeSingle();

      if (error || !userRow) {
        // Fallback: grab any existing user
        const { data: anyUser } = await supabase
          .from("users")
          .select("id, full_name")
          .limit(1)
          .maybeSingle();

        if (!anyUser) throw new Error("No users found in DB");

        setCurrentUser({ id: anyUser.id, full_name: anyUser.full_name, role: "patient" });
      } else {
        setCurrentUser({ id: userRow.id, full_name: userRow.full_name, role: "patient" });
      }

      navigate("/");
    } catch (err) {
      setErrorMsg("Could not load demo patient. Check DB connection.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Demo doctor login — doctors don't have users rows, use a fixed name ──
  // Doctors are identified by the doctors table, not users.
  // We use a placeholder UUID that won't collide with real patient lookups.
  const loginAsDoctor = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      // Grab the first verified doctor from the doctors table
      const { data: doctorRow } = await supabase
        .from("doctors")
        .select("id, first_name, last_name")
        .eq("is_verified", true)
        .limit(1)
        .maybeSingle();

      const name = doctorRow
        ? `Dr. ${doctorRow.first_name} ${doctorRow.last_name}`
        : "Dr. Demo";

      // For doctors we use their doctors.id as the identifier
      // (isDoctor hook checks role, not user_id lookups)
      setCurrentUser({
        id:        doctorRow?.id ?? "doctor-demo",
        full_name: name,
        role:      "doctor",
      });

      navigate("/dashboard");
    } catch {
      setErrorMsg("Could not load demo doctor.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Signup — insert real user row, then login with returned UUID ──────────
  const handleSignup = async (role: "doctor" | "patient") => {
    if (!fullName.trim()) { setErrorMsg("Please enter your full name."); return; }
    if (!email.trim())    { setErrorMsg("Please enter your email."); return; }

    setIsLoading(true);
    setErrorMsg("");
    try {
      // Insert and return the real UUID
      const { data: newUser, error } = await supabase
        .from("users")
        .insert({ full_name: fullName.trim(), email: email.trim() })
        .select("id, full_name")
        .single();

      if (error || !newUser) throw new Error(error?.message ?? "Insert failed");

      // If patient: create the patients row too
      if (role === "patient") {
        const { data: newPatient } = await supabase
          .from("patients")
          .insert({ user_id: newUser.id })
          .select("id")
          .single();

        // Also seed an empty patient_profile so the dashboard doesn't crash
        if (newPatient?.id) {
          await supabase.from("patient_profiles").insert({
            patient_id:         newPatient.id,
            age:                null,
            gender:             null,
            medical_conditions: null,
            sensitivities:      null,
            preferences:        null,
          });
        }
      }

      setCurrentUser({ id: newUser.id, full_name: newUser.full_name, role });
      navigate(role === "doctor" ? "/dashboard" : "/");
    } catch (err: any) {
      setErrorMsg(err.message ?? "Signup failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-emerald-700 rounded-2xl flex items-center justify-center mb-3 shadow-sm">
            <Leaf className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">MediCanna</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">Clinical Decision Support System</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">

          {/* Error */}
          {errorMsg && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-4 animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-[12px] text-red-700">{errorMsg}</p>
            </div>
          )}

          {!showSignup ? (
            <>
              <p className="text-[13px] font-medium text-slate-600 mb-4 text-center">
                Enter as a demo user
              </p>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <RoleCard
                  icon={User}
                  title="Patient"
                  desc="View recommendations & log usage"
                  color="emerald"
                  onClick={loginAsPatient}
                  disabled={isLoading}
                />
                <RoleCard
                  icon={Stethoscope}
                  title="Doctor"
                  desc="Clinical dashboard & approvals"
                  color="blue"
                  onClick={loginAsDoctor}
                  disabled={isLoading}
                />
              </div>

              {isLoading && (
                <div className="flex items-center justify-center gap-2 text-[13px] text-slate-400 mb-4">
                  <Loader2 className="h-4 w-4 animate-spin" /> Initializing session…
                </div>
              )}

              <div className="border-t border-slate-100 pt-4">
                <button
                  className="w-full text-[12px] text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={() => { setShowSignup(true); setErrorMsg(""); }}
                >
                  Create a named account →
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-[13px] font-medium text-slate-600 mb-4">Create account</p>

              <div className="space-y-3 mb-4">
                <div className="space-y-1.5">
                  <Label className="text-[13px]">
                    Full name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Yoni Cohen"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px]">
                    Email <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-[13px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => handleSignup("patient")}
                  disabled={isLoading}
                  className="flex items-center justify-center h-10 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-[13px] font-semibold transition-colors disabled:opacity-60"
                >
                  {isLoading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : "As patient"
                  }
                </button>
                <button
                  onClick={() => handleSignup("doctor")}
                  disabled={isLoading}
                  className="flex items-center justify-center h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-semibold transition-colors disabled:opacity-60"
                >
                  {isLoading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : "As doctor"
                  }
                </button>
              </div>

              <button
                className="w-full text-[12px] text-slate-400 hover:text-slate-600 transition-colors"
                onClick={() => { setShowSignup(false); setErrorMsg(""); }}
              >
                ← Back
              </button>
            </>
          )}
        </div>

        {/* Feature list */}
        <div className="mt-6 space-y-2.5 px-1">
          <Feature icon={Sparkles}    text="AI-powered strain matching" />
          <Feature icon={ShieldCheck} text="Evidence-based clinical rules" />
          <Feature icon={TrendingUp}  text="Treatment efficacy tracking" />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
