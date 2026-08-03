import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { read } from "@/lib/supabaseRead";
import { useAppState, ensureUserRecords } from "@/context/AppContext";
import {
  Leaf, Loader2, Stethoscope, User, Eye, EyeOff, MailCheck,
} from "lucide-react";

// Known demo patient (seeded data) for the exhibition walkthrough
const DEMO_PATIENT_USER_ID = "d5186dd5-23f1-47ae-b7b1-7e0dc59776b0";

type Mode = "signin" | "signup";

const Field = ({
  label, children,
}: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="text-[12px] font-semibold text-slate-600">{label}</span>
    <div className="mt-1">{children}</div>
  </label>
);

const inputCls =
  "w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-[13px] text-slate-900 " +
  "placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400";

const LoginPage = () => {
  const navigate = useNavigate();
  const { setCurrentUser } = useAppState();

  const [mode, setMode]           = useState<Mode>("signin");
  const [fullName, setFullName]   = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [errorMsg, setErrorMsg]   = useState("");
  const [awaitConfirm, setAwaitConfirm] = useState(false);

  const validate = (): boolean => {
    if (mode === "signup" && fullName.trim().length < 2) {
      setErrorMsg("Enter your full name."); return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErrorMsg("Enter a valid email address."); return false;
    }
    if (password.length < 8) {
      setErrorMsg("Password needs at least 8 characters."); return false;
    }
    return true;
  };

  // ── Create account ─────────────────────────────────────────────────────────
  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true); setErrorMsg("");
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (error) throw new Error(error.message);

      if (data.session && data.user) {
        // Email confirmation is off — signed in immediately.
        await ensureUserRecords(data.user.id, data.user.email ?? undefined, fullName.trim());
        setCurrentUser({
          id: data.user.id, full_name: fullName.trim(), role: "patient", authUser: true,
        });
        navigate("/patient-input"); // first stop: build the medical profile
      } else {
        // Email confirmation is on — account created, waiting for the link.
        setAwaitConfirm(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message ?? "Could not create the account. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Sign in ────────────────────────────────────────────────────────────────
  const handleSignin = async () => {
    if (!validate()) return;
    setLoading(true); setErrorMsg("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(), password,
      });
      if (error) throw new Error(
        error.message === "Invalid login credentials"
          ? "Email or password is incorrect."
          : error.message === "Email not confirmed"
            ? "This email has not been confirmed yet. Check your inbox for the confirmation link."
            : error.message,
      );
      const name =
        (data.user?.user_metadata?.full_name as string) || data.user?.email || "Patient";
      await ensureUserRecords(data.user!.id, data.user!.email ?? undefined, name);
      setCurrentUser({ id: data.user!.id, full_name: name, role: "patient", authUser: true });
      navigate("/");
    } catch (err: any) {
      setErrorMsg(err.message ?? "Could not sign in. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Demo access (seeded data for the exhibition) ───────────────────────────
  const demoPatient = async () => {
    setLoading(true); setErrorMsg("");
    try {
      // Without logging, a failed read here surfaces as "No seeded users in
      // the database", which sends you looking at the wrong thing entirely.
      const { data: userRow } = await read<{ id: string; full_name: string }>(
        "login: seeded demo patient",
        supabase.from("users").select("id, full_name")
          .eq("id", DEMO_PATIENT_USER_ID).maybeSingle());
      const row = userRow ?? (await read<{ id: string; full_name: string }>(
        "login: any seeded user (demo fallback)",
        supabase.from("users").select("id, full_name").limit(1).maybeSingle())).data;
      if (!row) throw new Error("No seeded users in the database.");
      setCurrentUser({ id: row.id, full_name: row.full_name, role: "patient" });
      navigate("/");
    } catch {
      setErrorMsg("Could not load the demo patient.");
    } finally {
      setLoading(false);
    }
  };

  const demoDoctor = async () => {
    setLoading(true); setErrorMsg("");
    try {
      const { data: doc } = await read<{ id: string; first_name: string; last_name: string }>(
        "login: seeded verified doctor",
        supabase.from("doctors").select("id, first_name, last_name")
          .eq("is_verified", true).limit(1).maybeSingle());
      setCurrentUser({
        id: doc?.id ?? "doctor-demo",
        full_name: doc ? `Dr. ${doc.first_name} ${doc.last_name}` : "Dr. Demo",
        role: "doctor",
      });
      navigate("/dashboard");
    } catch {
      setErrorMsg("Could not load the demo clinician.");
    } finally {
      setLoading(false);
    }
  };

  const submit = mode === "signup" ? handleSignup : handleSignin;

  // ── Post-signup confirmation screen ────────────────────────────────────────
  if (awaitConfirm) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 flex items-center justify-center">
          <MailCheck className="h-6 w-6 text-emerald-600" />
        </div>
        <h2 className="text-[16px] font-semibold text-slate-900">Confirm your email</h2>
        <p className="text-[13px] text-slate-500 leading-relaxed">
          We sent a confirmation link to <span className="font-medium text-slate-700">{email}</span>.
          Open it, then sign in here.
        </p>
        <button
          onClick={() => { setAwaitConfirm(false); setMode("signin"); }}
          className="text-[13px] font-semibold text-emerald-700 hover:text-emerald-600"
        >
          Back to sign in
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-7">
          <div className="w-12 h-12 bg-emerald-700 rounded-2xl flex items-center justify-center mb-3 shadow-sm">
            <Leaf className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">MediCanna</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">Clinical Decision Support System</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">

          {/* Mode switch */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {(["signin", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setErrorMsg(""); }}
                className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                  mode === m ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {errorMsg && (
            <p className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {errorMsg}
            </p>
          )}

          {mode === "signup" && (
            <Field label="Full name">
              <input
                className={inputCls} value={fullName} autoComplete="name"
                placeholder="Dana Levi" onChange={(e) => setFullName(e.target.value)}
              />
            </Field>
          )}

          <Field label="Email">
            <input
              className={inputCls} type="email" value={email} autoComplete="email"
              placeholder="you@example.com" onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <Field label="Password">
            <div className="relative">
              <input
                className={inputCls + " pr-10"}
                type={showPw ? "text" : "password"}
                value={password}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>

          <button
            onClick={submit}
            disabled={loading}
            className="w-full h-11 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-[14px] font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </div>

        {/* Demo access — seeded data for the exhibition */}
        <div className="mt-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[11px] uppercase tracking-wider text-slate-400">Demo access</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={demoPatient} disabled={loading}
              className="flex items-center justify-center gap-2 h-10 rounded-xl border border-slate-200 bg-white text-[12px] font-medium text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 transition-all disabled:opacity-50"
            >
              <User className="h-3.5 w-3.5 text-emerald-600" /> Demo patient
            </button>
            <button
              onClick={demoDoctor} disabled={loading}
              className="flex items-center justify-center gap-2 h-10 rounded-xl border border-slate-200 bg-white text-[12px] font-medium text-slate-600 hover:border-blue-300 hover:bg-blue-50 transition-all disabled:opacity-50"
            >
              <Stethoscope className="h-3.5 w-3.5 text-blue-600" /> Demo clinician
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
