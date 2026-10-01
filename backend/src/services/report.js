import { levelFromScore } from './nlp.js';

function avg(nums) {
  const valid = nums.filter((n) => typeof n === 'number' && !Number.isNaN(n));
  if (!valid.length) return 0;
  return valid.reduce((s, n) => s + n, 0) / valid.length;
}

function gradeFor(score) {
  if (score >= 85) return 'A';
  if (score >= 75) return 'B';
  if (score >= 65) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

/**
 * Aggregates per-answer evaluations into a structured, storable report.
 */
export function buildReport(session) {
  const questions = session.questions || [];
  const answers = session.answers || [];

  const perAnswer = questions.map((q) => {
    const a = answers.find((x) => String(x.question) === String(q.questionId)) || {};
    const e = a.evaluation || {};
    const b = a.behavior || {};
    const behaviorScore =
      typeof b.malpracticeScore === 'number'
        ? Math.max(0, Math.min(100, Math.round(
            (b.attentionScore || 0) * 0.4 + (b.engagementScore || 0) * 0.3 + (100 - b.malpracticeScore) * 0.3
          )))
        : null;
    return {
      questionId: q.questionId,
      order: q.order,
      text: q.text,
      type: q.type,
      difficulty: q.difficulty,
      correctnessScore: typeof e.correctnessScore === 'number' ? e.correctnessScore : 0,
      correctnessLevel: e.correctnessLevel || 'Low',
      confidenceScore: typeof e.confidenceScore === 'number' ? e.confidenceScore : 0,
      behaviorScore,
      feedback: e.feedback || '',
      strengths: e.strengths || [],
      improvements: e.improvements || [],
      answered: Boolean(a.text && a.text.trim()) || Boolean(a.voice && a.voice.durationSec),
    };
  });

  const correctnessScore = Math.round(avg(perAnswer.map((a) => a.correctnessScore)));
  const confidenceScore = Math.round(avg(perAnswer.map((a) => a.confidenceScore)));
  const behaviorScore = Math.round(avg(perAnswer.map((a) => a.behaviorScore).filter((n) => typeof n === 'number')));

  const overallRating = Math.round(correctnessScore * 0.5 + confidenceScore * 0.25 + behaviorScore * 0.25);

  const strengths = [];
  const weaknesses = [];

  const weakAnswers = perAnswer.filter((a) => a.correctnessScore < 55);
  const strongAnswers = perAnswer.filter((a) => a.correctnessScore >= 70);

  if (strongAnswers.length) strengths.push(`Answered ${strongAnswers.length}/${perAnswer.length} questions strongly.`);
  if (correctnessScore >= 70) strengths.push('Strong conceptual correctness across the interview.');
  if (confidenceScore >= 70) strengths.push('Communicated with high confidence and clarity.');
  if (behaviorScore >= 80) strengths.push('Maintained good attention and engagement throughout.');

  if (weakAnswers.length) weaknesses.push(`Needs improvement on ${weakAnswers.length}/${perAnswer.length} questions.`);
  if (correctnessScore < 60) weaknesses.push('Core technical correctness is below expectations.');
  if (confidenceScore < 60) weaknesses.push('Delivery showed hesitation or low confidence.');
  if (behaviorScore && behaviorScore < 70) weaknesses.push('Behavioral signals indicate reduced attention or engagement.');

  const programming = perAnswer.filter((a) => a.type === 'programming');
  if (programming.length && avg(programming.map((a) => a.correctnessScore)) < 60) {
    weaknesses.push('Coding/programming answers need stronger problem-solving depth.');
  }

  let recommendation = 'Reject';
  if (overallRating >= 75 && correctnessScore >= 65) recommendation = 'Hire';
  else if (overallRating >= 55) recommendation = 'Improve';

  const summary =
    `Overall ${gradeFor(overallRating)} (${overallRating}/100). ` +
    `Correctness ${correctnessScore}, Confidence ${confidenceScore}, Behavior ${behaviorScore}. ` +
    `Recommendation: ${recommendation}.`;

  return {
    correctnessScore,
    confidenceScore,
    behaviorScore,
    overallRating,
    grade: gradeFor(overallRating),
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 5),
    recommendation,
    summary,
    overallLevel: levelFromScore(overallRating),
    generatedAt: new Date(),
  };
}
