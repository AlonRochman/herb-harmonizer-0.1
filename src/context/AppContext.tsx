import { createContext, useContext, useState, type ReactNode } from "react";
import type {
  PatientProfile,
  ClinicalConstraints,
  UsageRecord,
  Feedback,
  Recommendation,
} from "@/types/database";
import {
  sampleUsageRecords,
  sampleFeedback,
  sampleRecommendations,
} from "@/data/mockData";

interface AppState {
  patientProfile: PatientProfile | null;
  clinicalConstraints: ClinicalConstraints | null;
  usageRecords: UsageRecord[];
  feedbacks: Feedback[];
  recommendations: Recommendation[];
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
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>(sampleUsageRecords);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>(sampleFeedback);
  const [recommendations, setRecommendations] = useState<Recommendation[]>(sampleRecommendations);

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
