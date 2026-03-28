export const BASIS_API_URL = "https://basisprotocol.xyz";

export const GUARD_CONTRACT_ADDRESS =
  "0x0000000000000000000000000000000000000000"; // Update after deployment

export const GUARD_STORAGE_SLOT =
  "0x4a204f620c8c5ccdca3fd54d003badd85ba500436a431f0cbda4f558c93c34c8";

export const SCORE_THRESHOLDS = {
  good: 80,
  warning: 60,
} as const;

export const GRADE_MAP: Record<string, { min: number; label: string }> = {
  "A+": { min: 95, label: "A+" },
  A: { min: 90, label: "A" },
  "A-": { min: 85, label: "A-" },
  "B+": { min: 80, label: "B+" },
  B: { min: 75, label: "B" },
  "B-": { min: 70, label: "B-" },
  "C+": { min: 65, label: "C+" },
  C: { min: 60, label: "C" },
  "C-": { min: 55, label: "C-" },
  D: { min: 50, label: "D" },
  F: { min: 0, label: "F" },
};

export function scoreToGrade(score: number): string {
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 85) return "A-";
  if (score >= 80) return "B+";
  if (score >= 75) return "B";
  if (score >= 70) return "B-";
  if (score >= 65) return "C+";
  if (score >= 60) return "C";
  if (score >= 55) return "C-";
  if (score >= 50) return "D";
  return "F";
}

export function scoreColor(score: number): string {
  if (score >= 80) return "#12FF80";
  if (score >= 60) return "#FFB800";
  return "#FF5F72";
}
