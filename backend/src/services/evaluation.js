import { analyzeTextConfidence, cosineSimilarity, keywordCoverage, levelFromScore, tokenize } from './nlp.js';
import { llmEvaluateAnswer } from './llm.js';
import { scoreVoiceMetrics } from './voiceAnalysis.js';

const CODE_SIGNALS = ['function', 'return', 'if', 'else', 'for', 'while', 'class', 'def', 'const', 'let', 'var', 'select', 'from', 'where', 'join', 'index', 'import'];

function offlineCorrectness({ question, answerText, expectedAnswer, keywords }) {
  const answerTokens = tokenize(answerText || '');
  const referenceTokens = tokenize(`${expectedAnswer || ''} ${(keywords || []).join(' ')}`);
  const similarity = cosineSimilarity(answerTokens, referenceTokens);
  const coverage = keywordCoverage(answerText, keywords);

  const lengthFactor = answerTokens.length === 0 ? 0
    : answerTokens.length < 5 ? 0.35
      : answerTokens.length < 20 ? 0.7
        : 1;

  let score = similarity * 45 + (coverage ?? similarity) * 45 + lengthFactor * 10;

  if (question.type === 'programming') {
    const lower = String(answerText || '').toLowerCase();
    const hits = CODE_SIGNALS.filter((s) => lower.includes(s)).length;
    score = score * 0.85 + Math.min(1, hits / 4) * 15;
  }

  const correctnessScore = Math.max(0, Math.min(100, Math.round(score)));
  return {
    correctnessScore,
    semanticSimilarity: Math.round(similarity * 100) / 100,
    keywordCoverage: coverage === null ? null : Math.round(coverage * 100) / 100,
  };
}

function buildOfflineFeedback({ correctnessScore, coverage, textProfile }) {
  const strengths = [];
  const improvements = [];
  if (correctnessScore >= 65) strengths.push('Answer aligned well with the expected concepts.');
  if (coverage !== null && coverage !== undefined && coverage >= 0.6) strengths.push('Covered most of the key points.');
  if (textProfile.clarity >= 70) strengths.push('Clear and readable explanation.');
  if (textProfile.completeness >= 65) strengths.push('Answer was reasonably complete.');

  if (correctnessScore < 65) improvements.push('Elaborate on the core concepts and correct any misconceptions.');
  if (coverage !== null && coverage !== undefined && coverage < 0.5) improvements.push('Include the missing key terms the interviewer expects.');
  if (textProfile.clarity < 70) improvements.push('Reduce filler words and tighten sentence structure.');
  if (textProfile.completeness < 65) improvements.push('Provide a more complete answer with examples or steps.');

  return {
    feedback:
      correctnessScore >= 70
        ? 'Solid answer that addresses the question well.'
        : correctnessScore >= 45
          ? 'Partially correct answer with room to add depth.'
          : 'Answer is missing key concepts; needs significant improvement.',
    strengths: strengths.slice(0, 4),
    improvements: improvements.slice(0, 4),
  };
}

/**
 * Full per-answer evaluation: correctness (LLM when configured, else offline),
 * text confidence, and voice-derived confidence.
 */
export async function evaluateAnswer({ question, text, keywords, expectedAnswer, voiceMetrics }) {
  const textProfile = analyzeTextConfidence(text, keywords || []);

  let correctness = offlineCorrectness({
    question,
    answerText: text,
    expectedAnswer,
    keywords: keywords || [],
  });
  let feedback = buildOfflineFeedback({
    correctnessScore: correctness.correctnessScore,
    coverage: correctness.keywordCoverage,
    textProfile,
  });
  let evaluator = 'offline-semantic';

  const llm = await llmEvaluateAnswer({ question, answerText: text, expectedAnswer, keywords });
  if (llm) {
    correctness = {
      ...correctness,
      correctnessScore: llm.correctnessScore,
      semanticSimilarity: llm.semanticSimilarity ?? correctness.semanticSimilarity,
    };
    if (llm.feedback || llm.strengths.length || llm.improvements.length) {
      feedback = {
        feedback: llm.feedback || feedback.feedback,
        strengths: llm.strengths.length ? llm.strengths : feedback.strengths,
        improvements: llm.improvements.length ? llm.improvements : feedback.improvements,
      };
    }
    evaluator = llm.evaluator;
  }

  const voiceProfile = voiceMetrics && voiceMetrics.durationSec
    ? scoreVoiceMetrics(voiceMetrics)
    : null;

  const confidenceScore = voiceProfile
    ? Math.round(textProfile.confidenceScore * 0.6 + voiceProfile.confidenceScore * 0.4)
    : textProfile.confidenceScore;

  return {
    correctnessScore: correctness.correctnessScore,
    correctnessLevel: levelFromScore(correctness.correctnessScore),
    semanticSimilarity: correctness.semanticSimilarity,
    keywordCoverage: correctness.keywordCoverage,
    textConfidence: textProfile.confidenceScore,
    clarity: textProfile.clarity,
    structure: textProfile.structure,
    completeness: textProfile.completeness,
    feedback: feedback.feedback,
    strengths: feedback.strengths,
    improvements: feedback.improvements,
    evaluator,
    confidenceScore,
    voice: voiceProfile,
  };
}
