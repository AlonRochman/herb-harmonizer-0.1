import type { Strain, UsageRecord, Feedback, Recommendation } from "@/types/database";

export const strains: Strain[] = [
  { strainId: 1, name: "Eran Almog", thcLevel: 22, cbdLevel: 0.5, terpenesProfile: "Myrcene, Linalool, Caryophyllene" },
  { strainId: 2, name: "Avidekel", thcLevel: 1, cbdLevel: 16, terpenesProfile: "Pinene, Myrcene, Limonene" },
  { strainId: 3, name: "Midnight", thcLevel: 5, cbdLevel: 12, terpenesProfile: "Myrcene, Pinene, Terpinolene" },
  { strainId: 4, name: "Alaska", thcLevel: 18, cbdLevel: 1, terpenesProfile: "Limonene, Caryophyllene, Humulene" },
  { strainId: 5, name: "Paris OG", thcLevel: 20, cbdLevel: 0.3, terpenesProfile: "Myrcene, Limonene, Linalool" },
  { strainId: 6, name: "Roma", thcLevel: 3, cbdLevel: 14, terpenesProfile: "Caryophyllene, Myrcene, Pinene" },
  { strainId: 7, name: "Dorit", thcLevel: 10, cbdLevel: 8, terpenesProfile: "Linalool, Myrcene, Limonene" },
  { strainId: 8, name: "Rafael", thcLevel: 15, cbdLevel: 3, terpenesProfile: "Pinene, Caryophyllene, Myrcene" },
  { strainId: 9, name: "Topaz", thcLevel: 8, cbdLevel: 10, terpenesProfile: "Myrcene, Pinene, Linalool" },
  { strainId: 10, name: "Jasmine", thcLevel: 12, cbdLevel: 6, terpenesProfile: "Limonene, Linalool, Terpinolene" },
];

export const sampleUsageRecords: UsageRecord[] = [
  { usageId: 1, patientId: 1, strainId: 2, dosage: "0.5g", consumptionMethod: "Vaporizer", usageDate: "2026-03-15", createdAt: "2026-03-15T10:00:00Z" },
  { usageId: 2, patientId: 1, strainId: 3, dosage: "0.3g", consumptionMethod: "Oil drops", usageDate: "2026-03-18", createdAt: "2026-03-18T09:00:00Z" },
  { usageId: 3, patientId: 1, strainId: 7, dosage: "0.4g", consumptionMethod: "Vaporizer", usageDate: "2026-03-22", createdAt: "2026-03-22T20:00:00Z" },
  { usageId: 4, patientId: 1, strainId: 9, dosage: "0.5g", consumptionMethod: "Oil drops", usageDate: "2026-03-28", createdAt: "2026-03-28T08:00:00Z" },
];

export const sampleFeedback: Feedback[] = [
  { feedbackId: 1, usageId: 1, effectivenessScore: 4, sideEffects: "None", comments: "Good pain relief", createdAt: "2026-03-16T10:00:00Z" },
  { feedbackId: 2, usageId: 2, effectivenessScore: 3, sideEffects: "Dry mouth", comments: "Moderate improvement", createdAt: "2026-03-19T09:00:00Z" },
  { feedbackId: 3, usageId: 3, effectivenessScore: 5, sideEffects: "None", comments: "Excellent for sleep", createdAt: "2026-03-23T08:00:00Z" },
  { feedbackId: 4, usageId: 4, effectivenessScore: 4, sideEffects: "Mild dizziness", comments: "Helpful for anxiety", createdAt: "2026-03-29T10:00:00Z" },
];

export const sampleRecommendations: Recommendation[] = [
  { recommendationId: 1, patientId: 1, strainId: 2, recommendationDate: "2026-03-14", explanation: "High CBD, low THC — suitable for pain without psychoactive effects", createdAt: "2026-03-14T10:00:00Z" },
  { recommendationId: 2, patientId: 1, strainId: 7, recommendationDate: "2026-03-20", explanation: "Balanced THC:CBD ratio with Linalool for anxiety relief", createdAt: "2026-03-20T10:00:00Z" },
];

export const medicalConditions = [
  "Chronic Pain", "Anxiety", "Insomnia", "PTSD", "Epilepsy",
  "Nausea (Chemotherapy)", "Fibromyalgia", "Multiple Sclerosis",
  "Crohn's Disease", "Arthritis",
];

export const consumptionMethods = [
  "Vaporizer", "Oil drops", "Capsules", "Smoking", "Edibles", "Topical",
];

export const sideEffectOptions = [
  "None", "Dry mouth", "Dizziness", "Fatigue", "Anxiety", "Nausea", "Headache", "Appetite changes",
];
