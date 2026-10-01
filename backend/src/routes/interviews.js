import { Router } from 'express';
import { z } from 'zod';
import { Category } from '../models/Category.js';
import { Session } from '../models/Session.js';
import { LEVELS } from '../models/Question.js';
import { generateQuestionSet } from '../services/interviewEngine.js';
import { evaluateAnswer } from '../services/evaluation.js';
import { scoreBehaviorMetrics } from '../services/behaviorAnalysis.js';
import { buildReport } from '../services/report.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 1000) / 1000 : 0);

function sanitizeVoice(v = {}) {
  return {
    durationSec: num(v.durationSec),
    speechRatio: num(v.speechRatio),
    pauseCount: num(v.pauseCount),
    longestPauseSec: num(v.longestPauseSec),
    energyVariance: num(v.energyVariance),
    pitchVariance: num(v.pitchVariance),
    wordsPerMinute: num(v.wordsPerMinute),
  };
}

function sanitizeBehavior(b = {}) {
  return {
    sampleCount: num(b.sampleCount),
    faceVisibility: num(b.faceVisibility),
    attentionScore: num(b.attentionScore),
    engagementScore: num(b.engagementScore),
    malpracticeScore: num(b.malpracticeScore),
    tabSwitches: num(b.tabSwitches),
    blurEvents: num(b.blurEvents),
    lookingAwayEvents: num(b.lookingAwayEvents),
    multipleFaceEvents: num(b.multipleFaceEvents),
  };
}

router.get('/meta', (req, res) => {
  res.json({ levels: LEVELS });
});

const startSchema = z.object({
  categoryId: z.string().min(1),
  level: z.enum(LEVELS),
});

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = startSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, 'A valid category and experience level are required');
    const { categoryId, level } = parsed.data;

    const category = await Category.findById(categoryId);
    if (!category || !category.active) throw new HttpError(404, 'Category not found');

    const questions = await generateQuestionSet({ categoryId, level });
    if (!questions.length) throw new HttpError(400, 'No questions available for this category yet');

    const session = await Session.create({
      candidate: req.user._id,
      category: category._id,
      categoryName: category.name,
      level,
      questions,
      answers: [],
      status: 'in_progress',
    });

    res.status(201).json({ session: publicSession(session) });
  })
);

router.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const sessions = await Session.find({ candidate: req.user._id })
      .sort({ createdAt: -1 })
      .select('categoryName level status report.overallRating report.recommendation createdAt completedAt')
      .lean();
    res.json({ sessions });
  })
);

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const session = await loadSession(req);
    res.json({ session: publicSession(session) });
  })
);

const answerSchema = z.object({
  questionId: z.string().min(1),
  text: z.string().default(''),
  voice: z.object({}).passthrough().optional().default({}),
  behavior: z.object({}).passthrough().optional().default({}),
});

router.post(
  '/:id/answers',
  requireAuth,
  asyncHandler(async (req, res) => {
    const session = await loadSession(req);
    if (session.status === 'completed') throw new HttpError(400, 'This interview is already completed');

    const parsed = answerSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, 'Invalid answer payload');
    const { questionId, text, voice, behavior } = parsed.data;

    const question = session.questions.find((q) => String(q.questionId) === String(questionId));
    if (!question) throw new HttpError(404, 'Question does not belong to this session');

    const voiceMetrics = sanitizeVoice(voice);
    const behaviorMetrics = sanitizeBehavior(behavior);
    // Behavior scoring is normalized server-side; reject nothing, just derive.
    const behaviorScores = scoreBehaviorMetrics(behaviorMetrics);

    const evaluation = await evaluateAnswer({
      question: {
        text: question.text,
        type: question.type,
        difficulty: question.difficulty,
      },
      text,
      keywords: question.keywords,
      expectedAnswer: question.expectedAnswer,
      voiceMetrics,
    });

    const answerDoc = {
      question: question.questionId,
      order: question.order,
      text: text || '',
      voice: { ...voiceMetrics, confidenceScore: evaluation.voice?.confidenceScore ?? 0, confidenceLevel: evaluation.voice?.confidenceLevel ?? 'Low' },
      behavior: {
        ...behaviorMetrics,
        attentionScore: behaviorScores.attentionScore,
        engagementScore: behaviorScores.engagementScore,
        malpracticeScore: behaviorScores.malpracticeScore,
      },
      evaluation: {
        correctnessScore: evaluation.correctnessScore,
        correctnessLevel: evaluation.correctnessLevel,
        confidenceScore: evaluation.confidenceScore,
        semanticSimilarity: evaluation.semanticSimilarity,
        keywordCoverage: evaluation.keywordCoverage,
        textConfidence: evaluation.textConfidence,
        clarity: evaluation.clarity,
        structure: evaluation.structure,
        completeness: evaluation.completeness,
        feedback: evaluation.feedback,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        evaluator: evaluation.evaluator,
      },
      submittedAt: new Date(),
    };

    const existing = session.answers.find((a) => String(a.question) === String(questionId));
    if (existing) Object.assign(existing, answerDoc);
    else session.answers.push(answerDoc);

    await session.save();
    res.json({ answer: answerDoc, progress: progressOf(session) });
  })
);

router.post(
  '/:id/complete',
  requireAuth,
  asyncHandler(async (req, res) => {
    const session = await loadSession(req);
    const report = buildReport(session);
    session.report = report;
    session.status = 'completed';
    session.completedAt = new Date();
    await session.save();
    res.json({ report, session: publicSession(session) });
  })
);

router.get(
  '/:id/report',
  requireAuth,
  asyncHandler(async (req, res) => {
    const session = await loadSession(req);
    if (!session.report) throw new HttpError(404, 'Report not generated yet');
    res.json({ report: session.report, session: publicSession(session) });
  })
);

async function loadSession(req) {
  const session = await Session.findById(req.params.id);
  if (!session) throw new HttpError(404, 'Interview session not found');
  if (String(session.candidate) !== String(req.user._id) && req.user.role !== 'admin') {
    throw new HttpError(403, 'You do not have access to this session');
  }
  return session;
}

function progressOf(session) {
  return {
    answered: session.answers.length,
    total: session.questions.length,
    remaining: Math.max(0, session.questions.length - session.answers.length),
  };
}

function publicSession(session) {
  const obj = session.toObject ? session.toObject() : session;
  return {
    id: obj._id.toString(),
    categoryName: obj.categoryName,
    categoryId: obj.category?.toString?.() || obj.category,
    level: obj.level,
    status: obj.status,
    startedAt: obj.startedAt,
    completedAt: obj.completedAt,
    questions: (obj.questions || []).map((q) => ({
      questionId: q.questionId?.toString?.() || q.questionId,
      order: q.order,
      text: q.text,
      type: q.type,
      difficulty: q.difficulty,
      language: q.language,
    })),
    answers: (obj.answers || []).map((a) => ({
      questionId: a.question?.toString?.() || a.question,
      order: a.order,
      text: a.text,
      voice: a.voice,
      behavior: a.behavior,
      evaluation: a.evaluation,
      submittedAt: a.submittedAt,
    })),
    report: obj.report || null,
    progress: {
      answered: (obj.answers || []).length,
      total: (obj.questions || []).length,
      remaining: Math.max(0, (obj.questions || []).length - (obj.answers || []).length),
    },
  };
}

export default router;
