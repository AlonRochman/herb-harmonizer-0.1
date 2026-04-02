import type { PatientProfile, ClinicalConstraints, Strain } from "@/types/database";
import { strains } from "@/data/mockData";

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
  topN: number = 3
): ScoredStrain[] {
  // Step 1: Filter strains based on clinical constraints
  let filtered = strains.filter((s) => {
    if (constraints.thcMax !== null && s.thcLevel > constraints.thcMax) return false;
    if (constraints.cbdMin !== null && s.cbdLevel < constraints.cbdMin) return false;
    return true;
  });

  if (filtered.length === 0) filtered = [...strains]; // fallback

  // Step 2: Score each strain
  const scored: ScoredStrain[] = filtered.map((strain) => {
    let score = 0;
    const reasons: string[] = [];

    // Terpene match
    const desiredTerpenes = conditionTerpeneMap[profile.medicalConditions] || [];
    const strainTerpenes = strain.terpenesProfile.split(", ");
    const terpeneMatches = strainTerpenes.filter((t) => desiredTerpenes.includes(t));
    score += terpeneMatches.length * 20;
    if (terpeneMatches.length > 0) {
      reasons.push(`Terpene profile (${terpeneMatches.join(", ")}) targets ${profile.medicalConditions}`);
    }

    // CBD preference for certain conditions
    if (conditionPrefersCBD[profile.medicalConditions] && strain.cbdLevel >= 8) {
      score += 25;
      reasons.push("High CBD content recommended for this condition");
    }

    // THC safety for elderly/young
    if (profile.age > 65 && strain.thcLevel <= 10) {
      score += 15;
      reasons.push("Lower THC suitable for patient age group");
    }
    if (profile.age < 25 && strain.thcLevel <= 10) {
      score += 10;
      reasons.push("Moderate THC level appropriate for younger patients");
    }

    // Balanced ratio bonus
    const ratio = strain.cbdLevel / (strain.thcLevel || 1);
    if (ratio >= 0.5 && ratio <= 2) {
      score += 10;
      reasons.push("Balanced THC:CBD ratio for therapeutic effect");
    }

    // Constraint compliance bonus
    if (constraints.thcMax !== null && strain.thcLevel <= constraints.thcMax) {
      score += 5;
    }
    if (constraints.cbdMin !== null && strain.cbdLevel >= constraints.cbdMin) {
      score += 5;
    }

    const explanation = reasons.length > 0
      ? reasons.join(". ") + "."
      : "General purpose strain within clinical constraints.";

    return { strain, score, explanation };
  });

  // Step 3: Sort by score descending and return top N
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN);
}
