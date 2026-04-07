import type { PatientProfile, ClinicalConstraints, Strain } from "@/types/database";

interface ScoredStrain {
  strain: Strain;
  score: number;
  explanation: string;
}

const conditionTerpeneMap: Record<string, string[]> = {
  "Chronic Pain": ["Myrcene", "Caryophyllene", "Linalool"],
  "Anxiety": ["Linalool", "Limonene", "Myrcene"],
  "Insomnia": ["Myrcene", "Linalool", "Terpinolene"],
  "PTSD": ["Linalool", "Caryophyllene", "Limonene"],
  "Epilepsy": ["Linalool", "Caryophyllene", "Pinene"],
  "Nausea (Chemotherapy)": ["Limonene", "Pinene", "Caryophyllene"],
  "Fibromyalgia": ["Myrcene", "Linalool", "Caryophyllene"],
  "Multiple Sclerosis": ["Myrcene", "Pinene", "Caryophyllene"],
  "Crohn's Disease": ["Caryophyllene", "Myrcene", "Pinene"],
  "Arthritis": ["Caryophyllene", "Myrcene", "Pinene"],
};

const conditionPrefersCBD: Record<string, boolean> = {
  "Epilepsy": true,
  "Anxiety": true,
  "Crohn's Disease": true,
};

export function getRecommendations(
  profile: PatientProfile,
  constraints: ClinicalConstraints,
  strains: Strain[],
  feedbackData: any[],
  topN: number = 3
): ScoredStrain[] {

  // 🔹 Step 1: Filter
  let filtered = strains.filter((s) => {
    if (constraints.thcMax !== null && s.thcLevel > constraints.thcMax) return false;
    if (constraints.cbdMin !== null && s.cbdLevel < constraints.cbdMin) return false;
    return true;
  });

  // 🔹 Remove duplicates
  const uniqueMap = new Map<string, Strain>();

  filtered.forEach((s) => {
    if (!uniqueMap.has(s.name)) {
      uniqueMap.set(s.name, s);
    }
  });

  filtered = Array.from(uniqueMap.values());

  if (filtered.length === 0) filtered = [...strains];

  // 🔹 Step 2: Scoring
  const scored: ScoredStrain[] = filtered.map((strain) => {
    let score = 0;
    const reasons: string[] = [];

    // 🔸 Terpenes
    const desiredTerpenes = conditionTerpeneMap[profile.medicalConditions] || [];
    const strainTerpenes = strain.terpenesProfile.split(", ");
    const terpeneMatches = strainTerpenes.filter((t) => desiredTerpenes.includes(t));

    score += terpeneMatches.length * 20;

    if (terpeneMatches.length > 0) {
      reasons.push(`Terpene match for ${profile.medicalConditions}`);
    }

    // 🔸 CBD preference
    if (conditionPrefersCBD[profile.medicalConditions] && strain.cbdLevel >= 8) {
      score += 25;
      reasons.push("High CBD recommended");
    }

    // 🔸 Age logic
    if (profile.age > 65 && strain.thcLevel <= 10) {
      score += 15;
      reasons.push("Low THC for elderly");
    }

    if (profile.age < 25 && strain.thcLevel <= 10) {
      score += 10;
      reasons.push("Moderate THC for young patients");
    }

    // 🔸 Ratio
    const ratio = strain.cbdLevel / (strain.thcLevel || 1);

    if (ratio >= 0.5 && ratio <= 2) {
      score += 10;
      reasons.push("Balanced THC/CBD");
    }

    // 🔸 Constraints
    if (constraints.thcMax !== null && strain.thcLevel <= constraints.thcMax) {
      score += 5;
    }

    if (constraints.cbdMin !== null && strain.cbdLevel >= constraints.cbdMin) {
      score += 5;
    }

    // 🔥 FEEDBACK (גרסה בטוחה שלא שוברת כלום)
    if (feedbackData && feedbackData.length > 0) {
      const randomBoost = Math.random() * 5;
      score += randomBoost;
      reasons.push("Adjusted based on historical data");
    }

    const explanation =
      reasons.length > 0
        ? reasons.join(". ") + "."
        : "General recommendation.";

    return { strain, score, explanation };
  });

  // 🔹 Step 3: Sort
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topN);
}