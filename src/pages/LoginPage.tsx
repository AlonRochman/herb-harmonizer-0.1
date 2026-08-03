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

// Nothing on this page is clinical data, so font-data appears only as the
// small-caps instrument chrome the restyled pages use for labels and actions —
// never on the headings or the prose.
const Field = ({
  label, children,
}: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="font-data text-[10px] uppercase tracking-[0.14em] text-ink/45">{label}</span>
    <div className="mt-1.5">{children}</div>
  </label>
);

const inputCls =
  "w-full h-10 px-3 border border-rule bg-white text-[13px] text-ink " +
  "placeholder:text-ink/25 outline-none focus:border-ink/40 focus:ring-1 focus:ring-ink/20";

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
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-3 border border-rule bg-white p-6 text-center">
        <MailCheck className="mx-auto h-6 w-6 text-ink/45" />
        <h2 className="font-display text-[16px] font-semibold text-ink">Confirm your email</h2>
        <p className="text-[13px] leading-relaxed text-ink/55">
          We sent a confirmation link to <span className="font-medium text-ink">{email}</span>.
          Open it, then sign in here.
        </p>
        <button
          onClick={() => { setAwaitConfirm(false); setMode("signin"); }}
          className="font-data text-[10px] uppercase tracking-[0.12em] text-ink/60 underline underline-offset-4 transition-colors hover:text-ink"
        >
          Back to sign in
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Masthead — the same rule-under-title header the report pages carry */}
        <div className="mb-6 border-b-2 border-ink pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-ink">
              <Leaf className="h-4 w-4 text-paper" />
            </span>
            <div>
              <h1 className="font-display text-[22px] font-semibold leading-none tracking-tight text-ink">
                MediCanna
              </h1>
              <p className="mt-1.5 font-data text-[10px] uppercase tracking-[0.2em] text-ink/45">
                Clinical Decision Support
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 border border-rule bg-white p-5">

          {/* Mode switch — an underlined register, not a pill toggle */}
          <div className="flex gap-5 border-b border-rule">
            {(["signin", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setErrorMsg(""); }}
                className={`-mb-px border-b-2 pb-2 font-data text-[10px] uppercase tracking-[0.12em] transition-colors ${
                  mode === m
                    ? "border-ink text-ink"
                    : "border-transparent text-ink/40 hover:text-ink/70"
                }`}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {/* A blocked sign-in is the negative verdict on this page, so flag. */}
          {errorMsg && (
            <p className="border-l-2 border-flag bg-flag/5 px-3 py-2 text-[12px] text-flag">
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
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink/35 transition-colors hover:text-ink/70"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>

          <button
            onClick={submit}
            disabled={loading}
            className="flex h-10 w-full items-center justify-center gap-2 bg-ink font-data text-[11px] uppercase tracking-[0.12em] text-paper transition-colors hover:bg-ink/85 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </div>

        {/* Demo access — seeded data for the exhibition */}
        <div className="mt-5">
          <div className="mb-3 flex items-center gap-3">
            <div className="h-px flex-1 bg-rule" />
            <span className="font-data text-[10px] uppercase tracking-[0.14em] text-ink/40">Demo access</span>
            <div className="h-px flex-1 bg-rule" />
          </div>
          {/* Both roles are neutral ink: patient vs clinician is a route, not a
              clinical reading, so neither earns a colour of its own. */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={demoPatient} disabled={loading}
              className="flex h-10 items-center justify-center gap-2 border border-rule bg-white font-data text-[10px] uppercase tracking-[0.1em] text-ink/65 transition-colors hover:border-ink/35 hover:text-ink disabled:opacity-50"
            >
              <User className="h-3.5 w-3.5" /> Demo patient
            </button>
            <button
              onClick={demoDoctor} disabled={loading}
              className="flex h-10 items-center justify-center gap-2 border border-rule bg-white font-data text-[10px] uppercase tracking-[0.1em] text-ink/65 transition-colors hover:border-ink/35 hover:text-ink disabled:opacity-50"
            >
              <Stethoscope className="h-3.5 w-3.5" /> Demo clinician
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
