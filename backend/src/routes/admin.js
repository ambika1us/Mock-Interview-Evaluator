import { Router } from 'express';
import { z } from 'zod';
import { Category } from '../models/Category.js';
import { Question, DIFFICULTIES, QUESTION_TYPES, LEVELS } from '../models/Question.js';
import { Session } from '../models/Session.js';
import { User } from '../models/User.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

function slugify(name) {
  return String(name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/* ----------------------------- Categories ----------------------------- */

router.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const categories = await Category.find().sort({ name: 1 }).lean();
    const counts = await Question.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]);
    const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
    res.json({
      categories: categories.map((c) => ({ ...c, questionCount: countMap.get(String(c._id)) || 0 })),
    });
  })
);

const categorySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().default(''),
  active: z.boolean().optional(),
});

router.post(
  '/categories',
  asyncHandler(async (req, res) => {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, 'Category name is required');
    const { name, description, active } = parsed.data;

    const slug = slugify(name);
    const dup = await Category.findOne({ $or: [{ name }, { slug }] });
    if (dup) throw new HttpError(409, 'A category with this name already exists');

    const category = await Category.create({ name, slug, description, active: active ?? true });
    res.status(201).json({ category });
  })
);

router.put(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!category) throw new HttpError(404, 'Category not found');
    res.json({ category });
  })
);

router.delete(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    const category = await Category.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
    if (!category) throw new HttpError(404, 'Category not found');
    res.json({ category, archived: true });
  })
);

/* ----------------------------- Questions ------------------------------ */

router.get(
  '/questions',
  asyncHandler(async (req, res) => {
    const { category, type, difficulty, level, q } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (type) filter.type = type;
    if (difficulty) filter.difficulty = difficulty;
    if (level) filter.level = level;
    if (q) filter.text = { $regex: String(q), $options: 'i' };

    const questions = await Question.find(filter)
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ questions });
  })
);

const questionSchema = z.object({
  category: z.string().min(1),
  text: z.string().min(5),
  type: z.enum(QUESTION_TYPES).default('theory'),
  difficulty: z.enum(DIFFICULTIES).default('Easy'),
  level: z.enum(LEVELS).default('Fresher'),
  expectedAnswer: z.string().optional().default(''),
  keywords: z.array(z.string()).optional().default([]),
  language: z.string().optional().default(''),
  active: z.boolean().optional(),
});

router.post(
  '/questions',
  asyncHandler(async (req, res) => {
    const parsed = questionSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);
    const category = await Category.findById(parsed.data.category);
    if (!category) throw new HttpError(404, 'Category not found');
    const question = await Question.create(parsed.data);
    res.status(201).json({ question });
  })
);

router.put(
  '/questions/:id',
  asyncHandler(async (req, res) => {
    const question = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!question) throw new HttpError(404, 'Question not found');
    res.json({ question });
  })
);

router.delete(
  '/questions/:id',
  asyncHandler(async (req, res) => {
    const question = await Question.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
    if (!question) throw new HttpError(404, 'Question not found');
    res.json({ question, archived: true });
  })
);

/* ------------------------------ Reports ------------------------------- */

router.get(
  '/reports',
  asyncHandler(async (req, res) => {
    const { category, recommendation, level } = req.query;
    const filter = { status: 'completed' };
    if (category) filter.category = category;
    if (level) filter.level = level;
    if (recommendation) filter['report.recommendation'] = recommendation;

    const sessions = await Session.find(filter)
      .populate('candidate', 'name email')
      .sort({ completedAt: -1 })
      .select('candidate categoryName level report completedAt')
      .lean();
    res.json({
      reports: sessions.map((s) => ({
        sessionId: s._id,
        candidate: s.candidate,
        categoryName: s.categoryName,
        level: s.level,
        completedAt: s.completedAt,
        report: s.report,
      })),
    });
  })
);

router.get(
  '/reports/:id',
  asyncHandler(async (req, res) => {
    const session = await Session.findById(req.params.id).populate('candidate', 'name email headline').lean();
    if (!session) throw new HttpError(404, 'Session not found');
    res.json({ session });
  })
);

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const [candidates, categories, questions, completedSessions, activeSessions] = await Promise.all([
      User.countDocuments({ role: 'candidate' }),
      Category.countDocuments({ active: true }),
      Question.countDocuments({ active: true }),
      Session.countDocuments({ status: 'completed' }),
      Session.countDocuments({ status: 'in_progress' }),
    ]);

    const completed = await Session.find({ status: 'completed' })
      .select('level categoryName report')
      .lean();

    const avg = (key) =>
      completed.length
        ? Math.round(completed.reduce((s, c) => s + (c.report?.[key] || 0), 0) / completed.length)
        : 0;

    const recommendationDist = { Hire: 0, Improve: 0, Reject: 0 };
    const categoryDist = {};
    const levelDist = { Fresher: 0, 'Mid-Level': 0, Senior: 0 };
    const scoreBuckets = { '0-49': 0, '50-64': 0, '65-79': 0, '80-100': 0 };

    for (const c of completed) {
      const rec = c.report?.recommendation;
      if (rec in recommendationDist) recommendationDist[rec] += 1;
      categoryDist[c.categoryName] = (categoryDist[c.categoryName] || 0) + 1;
      if (c.level in levelDist) levelDist[c.level] += 1;
      const overall = c.report?.overallRating || 0;
      if (overall < 50) scoreBuckets['0-49'] += 1;
      else if (overall < 65) scoreBuckets['50-64'] += 1;
      else if (overall < 80) scoreBuckets['65-79'] += 1;
      else scoreBuckets['80-100'] += 1;
    }

    res.json({
      counts: { candidates, categories, questions, completedSessions, activeSessions },
      averages: {
        correctness: avg('correctnessScore'),
        confidence: avg('confidenceScore'),
        behavior: avg('behaviorScore'),
        overall: avg('overallRating'),
      },
      recommendationDist,
      categoryDist,
      levelDist,
      scoreBuckets,
    });
  })
);

export default router;
