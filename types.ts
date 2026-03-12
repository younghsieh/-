export interface Scores {
  chinese: number;
  english: number;
  mathA: number;
  mathB: number;
  social: number;
  science: number;
  apcsConcept: number;
  apcsPractice: number;
}

export interface Recommendation {
  university: string;
  department: string;
  universityType: '一般大學' | '科技大學';
  probability: number;
  reason: string;
  riskLevel: '安全區' | '落點區' | '夢幻區';
  description: string;
  coreCourses: string;
  futureCareer: string;
}
