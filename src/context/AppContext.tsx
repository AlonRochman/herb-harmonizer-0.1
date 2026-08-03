import { createContext, useContext, useState, type ReactNode } from "react";
import type {
  PatientProfile,
  ClinicalConstraints,
  UsageRecord,
  Feedback,
  Recommendation,
} from "@/types/database";


// הגדרת טיפוס למשתמש המחובר (סימולציה)
interface CurrentUser {
  id?: string;
  full_name: string;
  role: 'doctor' | 'patient';
}

interface AppState {
  patientProfile: PatientProfile | null;
  clinicalConstraints: ClinicalConstraints | null;
  usageRecords: UsageRecord[];
  feedbacks: Feedback[]; 
  recommendations: Recommendation[];
  // משתני ה-Auth החדשים
  currentUser: CurrentUser | null;
  setCurrentUser: (user: CurrentUser | null) => void;
  // פונקציות העדכון הקיימות
  setPatientProfile: (p: PatientProfile) => void;
  setClinicalConstraints: (c: ClinicalConstraints) => void;
  addUsageRecord: (u: UsageRecord) => void;
  addFeedback: (f: Feedback) => void;
  addRecommendation: (r: Recommendation) => void;
}

const AppContext = createContext<AppState | null>(null);

// ─── Session persistence (fixes login/profile loss on page refresh) ─────────
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [patientProfile, setPatientProfileState] = useState<PatientProfile | null>(
    () => readSession<PatientProfile>("mc_patient_profile"),
  );
  const [clinicalConstraints, setClinicalConstraints] = useState<ClinicalConstraints | null>(null);
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  // המשתמש המחובר — משוחזר מ-sessionStorage כדי לשרוד רענון דף
  const [currentUser, setCurrentUserState] = useState<CurrentUser | null>(
    () => readSession<CurrentUser>("mc_current_user"),
  );

  const setCurrentUser = (user: CurrentUser | null) => {
    setCurrentUserState(user);
    writeSession("mc_current_user", user);
    if (user === null) {
      // logout — clear everything user-scoped
      setPatientProfileState(null);
      writeSession("mc_patient_profile", null);
    }
  };

  const setPatientProfile = (p: PatientProfile) => {
    setPatientProfileState(p);
    writeSession("mc_patient_profile", p);
  };

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
