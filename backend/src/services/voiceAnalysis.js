import { levelFromScore } from './nlp.js';

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Computes a voice confidence score from metrics extracted in the browser.
 * No raw audio is ever transmitted or stored - only these numeric metrics.
 */
export function scoreVoiceMetrics(metrics = {}) {
  const {
    durationSec = 0,
    speechRatio = 0,
    pauseCount = 0,
    longestPauseSec = 0,
    wordsPerMinute = 0,
    pitchVariance = 0,
  } = metrics;

  if (!durationSec || durationSec < 1) {
    return { confidenceScore: 0, confidenceLevel: 'Low' };
  }

  // Speaking fluency: too little speech (hesitant) or constant noise both hurt.
  const fluency = clamp(speechRatio * 120 - (speechRatio > 0.95 ? 15 : 0));

  // Pauses: a few natural pauses are fine, long gaps suggest hesitation.
  const pausesPerMin = (pauseCount / durationSec) * 60;
  const pauseScore = clamp(100 - Math.abs(pausesPerMin - 8) * 6 - longestPauseSec * 8);

  // Pace: 110-160 wpm is comfortable for interviews.
  const paceScore = wordsPerMinute
    ? clamp(100 - Math.abs(wordsPerMinute - 135) * 0.9)
    : 60;

  // Prosody: monotone delivery (very low variance) reads as low confidence.
  const prosodyScore = clamp(40 + Math.min(1, pitchVariance) * 60);

  const confidenceScore = Math.round(
    fluency * 0.3 + pauseScore * 0.3 + paceScore * 0.2 + prosodyScore * 0.2
  );

  return {
    confidenceScore: clamp(confidenceScore),
    confidenceLevel: levelFromScore(confidenceScore),
    fluency: Math.round(fluency),
    pauseScore: Math.round(pauseScore),
    paceScore: Math.round(paceScore),
    prosodyScore: Math.round(prosodyScore),
  };
}
