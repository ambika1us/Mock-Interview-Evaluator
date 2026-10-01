import mongoose from 'mongoose';

const questionSnapshotSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    order: Number,
    text: String,
    type: { type: String, enum: ['theory', 'programming'] },
    difficulty: String,
    expectedAnswer: String,
    keywords: [String],
    language: String,
  },
  { _id: false }
);

const voiceMetricsSchema = new mongoose.Schema(
  {
    durationSec: Number,
    speechRatio: Number,
    pauseCount: Number,
    longestPauseSec: Number,
    energyVariance: Number,
    pitchVariance: Number,
    wordsPerMinute: Number,
    confidenceScore: Number,
    confidenceLevel: String,
  },
  { _id: false }
);

const behaviorMetricsSchema = new mongoose.Schema(
  {
    sampleCount: Number,
    faceVisibility: Number,
    attentionScore: Number,
    engagementScore: Number,
    malpracticeScore: Number,
    tabSwitches: Number,
    blurEvents: Number,
    lookingAwayEvents: Number,
    multipleFaceEvents: Number,
  },
  { _id: false }
);

const evaluationSchema = new mongoose.Schema(
  {
    correctnessScore: Number,
    correctnessLevel: String,
    confidenceScore: Number,
    semanticSimilarity: Number,
    keywordCoverage: Number,
    textConfidence: Number,
    clarity: Number,
    structure: Number,
    completeness: Number,
    feedback: String,
    strengths: [String],
    improvements: [String],
    evaluator: String,
  },
  { _id: false }
);

const answerSchema = new mongoose.Schema(
  {
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    order: Number,
    text: { type: String, default: '' },
    voice: { type: voiceMetricsSchema, default: () => ({}) },
    behavior: { type: behaviorMetricsSchema, default: () => ({}) },
    evaluation: { type: evaluationSchema, default: () => ({}) },
    submittedAt: Date,
  },
  { _id: false }
);

const reportSchema = new mongoose.Schema(
  {
    correctnessScore: Number,
    confidenceScore: Number,
    behaviorScore: Number,
    overallRating: Number,
    grade: String,
    strengths: [String],
    weaknesses: [String],
    recommendation: String,
    summary: String,
    generatedAt: Date,
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
  {
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    categoryName: String,
    level: { type: String, enum: ['Fresher', 'Mid-Level', 'Senior'], required: true },
    status: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' },
    questions: [questionSnapshotSchema],
    answers: [answerSchema],
    report: { type: reportSchema, default: null },
    startedAt: { type: Date, default: Date.now },
    completedAt: Date,
  },
  { timestamps: true }
);

sessionSchema.methods.answerFor = function answerFor(questionId) {
  return this.answers.find((a) => a.question && a.question.toString() === String(questionId));
};

export const Session = mongoose.model('Session', sessionSchema);
