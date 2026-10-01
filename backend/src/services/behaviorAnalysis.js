function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Normalizes behavioral metrics captured in the browser into a single behavior score.
 * Higher is better. Only numeric aggregates/flags are received - never video frames.
 */
export function scoreBehaviorMetrics(metrics = {}) {
  const {
    attentionScore = 0,
    engagementScore = 0,
    malpracticeScore = 0,
    faceVisibility = 0,
  } = metrics;

  const integrity = clamp(100 - malpracticeScore);
  const behaviorScore = Math.round(
    attentionScore * 0.4 + engagementScore * 0.3 + integrity * 0.2 + faceVisibility * 0.1
  );

  return {
    behaviorScore: clamp(behaviorScore),
    attentionScore: clamp(Math.round(attentionScore)),
    engagementScore: clamp(Math.round(engagementScore)),
    malpracticeScore: clamp(Math.round(malpracticeScore)),
    integrityScore: Math.round(integrity),
  };
}
