import { Question } from '../models/Question.js';

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pick(pool, count, level) {
  const levelMatch = shuffle(pool.filter((q) => q.level === level));
  const rest = shuffle(pool.filter((q) => q.level !== level));
  return [...levelMatch, ...rest].slice(0, count);
}

/**
 * Builds the question set for an interview: 5 theory (Easy/Medium/Hard mix)
 * plus 1-2 programming questions, tuned to the selected category and level.
 */
export async function generateQuestionSet({ categoryId, level }) {
  const pool = await Question.find({ category: categoryId, active: true }).lean();
  if (!pool.length) return [];

  const theory = pool.filter((q) => q.type === 'theory');
  const programming = pool.filter((q) => q.type === 'programming');

  const byDifficulty = (list, d) => list.filter((q) => q.difficulty === d);

  const selectedTheory = [
    ...pick(byDifficulty(theory, 'Easy'), 2, level),
    ...pick(byDifficulty(theory, 'Medium'), 2, level),
    ...pick(byDifficulty(theory, 'Hard'), 1, level),
  ];

  // Backfill if the bank lacks certain difficulties.
  if (selectedTheory.length < 5) {
    const chosenIds = new Set(selectedTheory.map((q) => String(q._id)));
    const extra = shuffle(theory.filter((q) => !chosenIds.has(String(q._id))));
    selectedTheory.push(...extra.slice(0, 5 - selectedTheory.length));
  }

  const programmingCount = programming.length >= 2 ? 2 : programming.length;
  const selectedProgramming = pick(programming, programmingCount, level);

  const ordered = shuffle([...selectedTheory.slice(0, 5), ...selectedProgramming]);

  return ordered.map((q, index) => ({
    questionId: q._id,
    order: index + 1,
    text: q.text,
    type: q.type,
    difficulty: q.difficulty,
    expectedAnswer: q.expectedAnswer || '',
    keywords: q.keywords || [],
    language: q.language || '',
  }));
}
