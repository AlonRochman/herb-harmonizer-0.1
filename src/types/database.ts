// Database types strictly following the PDF ERD specification

export interface Patient {
  patientId: number;
  age: number;
  gender: string;
  medicalConditions: string;
  sensitivities: string;
}

export interface PatientProfile {
  patientId: number;
  age: number;
  gender: string;
  medicalConditions: string;
  sensitivities: string;
  preferences: string;
}

export interface ClinicalConstraints {
  patientId: number;
  thcMax: number | null;
  cbdMin: number | null;
  contraindications: string;
}

export interface Strain {
  strainId: number;
  name: string;
  thcLevel: number;
  cbdLevel: number;
  terpenesProfile: string;
}

export interface UsageRecord {
  usageId: number;
  patientId: number;
  strainId: number;
  dosage: string;
  consumptionMethod: string;
  usageDate: string;
  createdAt: string;
}

export interface Feedback {
  feedbackId: number;
  usageId: number;
  effectivenessScore: number;
  sideEffects: string;
  comments: string;
  createdAt: string;
}

export interface Recommendation {
  recommendationId: number;
  patientId: number;
  strainId: number;
  recommendationDate: string;
  explanation: string;
  createdAt: string;
}
