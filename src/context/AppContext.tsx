import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import { read } from "@/lib/supabaseRead";
import type {
  PatientProfile,
  ClinicalConstraints,
  UsageRecord,
  Feedback,
  Recommendation,
} from "@/types/database";

// המשתמש המחובר — דמו (רופא/מטופל) או חשבון Supabase Auth אמיתי
interface CurrentUser {
  id?: string;
  full_name: string;
  role: "doctor" | "patient";
  /** true when the identity comes from Supabase Auth rather than a demo button */
  authUser?: boolean;
}

interface AppState {
  patientProfile: PatientProfile | null;
  clinicalConstraints: ClinicalConstraints | null;
  usageRecords: UsageRecord[];
  feedbacks: Feedback[];
  recommendations: Recommendation[];
  currentUser: CurrentUser | null;
  authReady: boolean;
  setCurrentUser: (user: CurrentUser | null) => void;
  setPatientProfile: (p: PatientProfile) => void;
  setClinicalConstraints: (c: ClinicalConstraints) => void;
  addUsageRecord: (u: UsageRecord) => void;
  addFeedback: (f: Feedback) => void;
  addRecommendation: (r: Recommendation) => void;
}

const AppContext = createContext<AppState | null>(null);

// ─── Session persistence for demo users (auth users persist via supabase-js) ──
function readSession<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeSession(key: string, value: unknown | null) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// ─── Ensure a signed-up auth user has users + patients rows ───────────────────
// Every authenticated person owns their own patient record, so feedback,
// usage logs and recommendations are stored per user in the DB.
export async function ensureUserRecords(
  authId: string,
  email: string | undefined,
  fullName: string,
): Promise<void> {
  const { error: uErr } = await supabase
    .from("users")
    .upsert({ id: authId, full_name: fullName, email: email ?? null }, { onConflict: "id" });
  if (uErr) throw new Error(uErr.message);

  const { data: existing, error: pSelErr } = await supabase
    .from("patients").select("id").eq("user_id", authId).maybeSingle();
  if (pSelErr) throw new Error(pSelErr.message);

  if (!existing?.id) {
    const { error: pErr } = await supabase.from("patients").insert({ user_id: authId });
    if (pErr) throw new Error(pErr.message);
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [patientProfile, setPatientProfileState] = useState<PatientProfile | null>(
    () => readSession<PatientProfile>("mc_patient_profile"),
  );
  const [clinicalConstraints, setClinicalConstraints] = useState<ClinicalConstraints | null>(null);
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [authReady, setAuthReady] = useState(false);

  const [currentUser, setCurrentUserState] = useState<CurrentUser | null>(
    () => readSession<CurrentUser>("mc_current_user"),
  );

  const setCurrentUser = (user: CurrentUser | null) => {
    setCurrentUserState(user);
    // Demo identities persist in sessionStorage; auth identities are restored
    // by supabase-js itself, so they are not duplicated there.
    writeSession("mc_current_user", user?.authUser ? null : user);
    if (user === null) {
      setPatientProfileState(null);
      writeSession("mc_patient_profile", null);
    }
  };

  const setPatientProfile = (p: PatientProfile) => {
    setPatientProfileState(p);
    writeSession("mc_patient_profile", p);
  };

  // ── Restore a real Supabase Auth session on load, keep it in sync ──────────
  useEffect(() => {
    let cancelled = false;

    const hydrate = async (authId: string, email?: string, metaName?: string) => {
      let name = metaName ?? "";
      try {
        const { data } = await read<{ full_name: string }>(
          "auth hydrate: users.full_name",
          supabase.from("users").select("full_name").eq("id", authId).maybeSingle(),
        );
        if (data?.full_name) name = data.full_name;
        else await ensureUserRecords(authId, email, name || email || "Patient");
      } catch {}
      if (!cancelled) {
        setCurrentUserState({
          id: authId,
          full_name: name || email || "Patient",
          role: "patient",
          authUser: true,
        });
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        hydrate(
          session.user.id,
          session.user.email ?? undefined,
          (session.user.user_metadata?.full_name as string) ?? undefined,
        ).finally(() => { if (!cancelled) setAuthReady(true); });
      } else {
        if (!cancelled) setAuthReady(true);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        hydrate(
          session.user.id,
          session.user.email ?? undefined,
          (session.user.user_metadata?.full_name as string) ?? undefined,
        );
      }
      if (event === "SIGNED_OUT") {
        setCurrentUserState((prev) => (prev?.authUser ? null : prev));
      }
    });

    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  const addUsageRecord = (u: UsageRecord) => setUsageRecords((prev) => [...prev, u]);
  const addFeedback = (f: Feedback) => setFeedbacks((prev) => [...prev, f]);
  const addRecommendation = (r: Recommendation) => setRecommendations((prev) => [...prev, r]);

  return (
    <AppContext.Provider
      value={{
        patientProfile,
        clinicalConstraints,
        usageRecords,
        feedbacks,
        recommendations,
        currentUser,
        authReady,
        setCurrentUser,
        setPatientProfile,
        setClinicalConstraints,
        addUsageRecord,
        addFeedback,
        addRecommendation,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppState must be used within AppProvider");
  return ctx;
}
