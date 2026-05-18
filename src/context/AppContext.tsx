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

export function AppProvider({ children }: { children: ReactNode }) {
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [clinicalConstraints, setClinicalConstraints] = useState<ClinicalConstraints | null>(null);
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  
  // ה-State החדש של המשתמש המחובר
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

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
