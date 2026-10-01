export type Role = 'candidate' | 'admin';
export type Level = 'Fresher' | 'Mid-Level' | 'Senior';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type QuestionType = 'theory' | 'programming';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  headline?: string;
  createdAt?: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description: string;
  active: boolean;
  questionCount?: number;
}

export interface Question {
  _id: string;
  category: Category | string;
  text: string;
  type: QuestionType;
  difficulty: Difficulty;
  level: Level;
  expectedAnswer: string;
  keywords: string[];
  language?: string;
  active: boolean;
}

export interface VoiceMetrics {
  durationSec: number;
  speechRatio: number;
  pauseCount: number;
  longestPauseSec: number;
  energyVariance: number;
  pitchVariance: number;
  wordsPerMinute: number;
  confidenceScore?: number;
  confidenceLevel?: string;
}

export interface BehaviorMetrics {
  sampleCount: number;
  faceVisibility: number;
  attentionScore: number;
  engagementScore: number;
  malpracticeScore: number;
  tabSwitches: number;
  blurEvents: number;
  lookingAwayEvents: number;
  multipleFaceEvents: number;
}

export interface Evaluation {
  correctnessScore: number;
  correctnessLevel: string;
  confidenceScore: number;
  semanticSimilarity: number | null;
  keywordCoverage: number | null;
  textConfidence: number;
  clarity: number;
  structure: number;
  completeness: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  evaluator: string;
}

export interface SessionQuestion {
  questionId: string;
  order: number;
  text: string;
  type: QuestionType;
  difficulty: Difficulty;
  language?: string;
}

export interface SessionAnswer {
  questionId: string;
  order: number;
  text: string;
  voice: VoiceMetrics;
  behavior: BehaviorMetrics;
  evaluation: Evaluation;
  submittedAt?: string;
}

export interface Report {
  correctnessScore: number;
  confidenceScore: number;
  behaviorScore: number;
  overallRating: number;
  grade: string;
  overallLevel?: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: 'Hire' | 'Improve' | 'Reject' | string;
  summary: string;
  generatedAt?: string;
}

export interface InterviewSession {
  id: string;
  categoryName: string;
  categoryId: string;
  level: Level;
  status: 'in_progress' | 'completed';
  startedAt: string;
  completedAt?: string;
  questions: SessionQuestion[];
  answers: SessionAnswer[];
  report: Report | null;
  progress: { answered: number; total: number; remaining: number };
}

export interface SessionSummary {
  _id: string;
  categoryName: string;
  level: Level;
  status: string;
  report?: Report;
  createdAt: string;
  completedAt?: string;
}

export interface AdminStats {
  counts: {
    candidates: number;
    categories: number;
    questions: number;
    completedSessions: number;
    activeSessions: number;
  };
  averages: { correctness: number; confidence: number; behavior: number; overall: number };
  recommendationDist: Record<string, number>;
  categoryDist: Record<string, number>;
  levelDist: Record<string, number>;
  scoreBuckets: Record<string, number>;
}

export interface AdminReportRow {
  sessionId: string;
  candidate: { _id: string; name: string; email: string } | null;
  categoryName: string;
  level: Level;
  completedAt: string;
  report: Report;
}
