const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'of', 'to', 'in', 'on', 'at',
  'for', 'with', 'about', 'as', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they',
  'them', 'his', 'her', 'our', 'their', 'my', 'your', 'me', 'us', 'so', 'such', 'than',
  'too', 'very', 'can', 'will', 'would', 'should', 'could', 'do', 'does', 'did', 'have',
  'has', 'had', 'not', 'no', 'yes', 'from', 'into', 'over', 'under', 'again', 'more',
  'most', 'some', 'any', 'each', 'few', 'other', 'own', 'same', 'which', 'who', 'whom',
]);

const FILLERS = ['um', 'uh', 'erm', 'like', 'basically', 'honestly', 'actually', 'literally', 'kinda', 'sorta', 'you know', 'i mean', 'stuff', 'things'];

export function tokenize(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s+#.]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && t.length > 1 && !STOPWORDS.has(t))
    .map(stem);
}

function stem(word) {
  if (word.length > 5 && word.endsWith('ing')) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith('ed')) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith('es')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s')) return word.slice(0, -1);
  return word;
}

function termFrequency(tokens) {
  const tf = new Map();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  return tf;
}

/** Cosine similarity between two token bags in [0, 1]. */
export function cosineSimilarity(a, b) {
  const tfA = termFrequency(a);
  const tfB = termFrequency(b);
  if (tfA.size === 0 || tfB.size === 0) return 0;
  let dot = 0;
  for (const [term, count] of tfA) {
    if (tfB.has(term)) dot += count * tfB.get(term);
  }
  const magA = Math.sqrt([...tfA.values()].reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt([...tfB.values()].reduce((s, v) => s + v * v, 0));
  if (!magA || !magB) return 0;
  return dot / (magA * magB);
}

/** Fraction of expected keywords mentioned by the candidate. */
export function keywordCoverage(answerText, keywords = []) {
  if (!keywords.length) return null;
  const normalized = ` ${String(answerText).toLowerCase().replace(/[^a-z0-9+#\s.]/g, ' ')} `;
  let hit = 0;
  for (const kw of keywords) {
    const needle = ` ${String(kw).toLowerCase().trim()} `;
    const parts = String(kw).toLowerCase().split(/\s+/);
    const found = normalized.includes(needle.trim()) || parts.every((p) => normalized.includes(` ${p}`) || normalized.includes(`${p} `));
    if (found) hit += 1;
  }
  return hit / keywords.length;
}

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function countFillers(text) {
  const lower = ` ${String(text).toLowerCase()} `;
  let count = 0;
  for (const f of FILLERS) {
    const matches = lower.split(` ${f} `).length - 1;
    count += Math.max(0, matches);
  }
  return count;
}

function splitSentences(text) {
  return String(text)
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Derives a text-quality confidence profile (0-100 per dimension plus overall).
 */
export function analyzeTextConfidence(text, keywords = []) {
  const raw = String(text || '').trim();
  const words = raw.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const sentences = splitSentences(raw);
  const sentenceCount = Math.max(1, sentences.length);
  const avgSentenceLength = wordCount / sentenceCount;
  const fillers = countFillers(raw);
  const tokens = tokenize(raw);
  const richness = tokens.length ? new Set(tokens).size / tokens.length : 0;
  const coverage = keywordCoverage(raw, keywords);

  const lengthScore =
    wordCount === 0 ? 0
      : wordCount < 15 ? 35
        : wordCount < 40 ? 65
          : wordCount <= 220 ? 100
            : wordCount <= 400 ? 85
              : 70;

  const structureScore = clamp(
    100 - Math.abs(avgSentenceLength - 16) * 3 - Math.max(0, 2 - sentenceCount) * 12
  );
  const fillerPenalty = Math.min(45, (fillers / Math.max(1, wordCount)) * 900);
  const clarityScore = clamp(92 - fillerPenalty + richness * 20 - (sentenceCount === 1 && wordCount > 60 ? 15 : 0));
  const completeness = coverage === null
    ? clamp(lengthScore * 0.5 + structureScore * 0.5)
    : clamp(coverage * 70 + lengthScore * 0.3);

  const overall = clamp(
    lengthScore * 0.25 + structureScore * 0.2 + clarityScore * 0.3 + completeness * 0.25
  );

  return {
    wordCount,
    sentenceCount,
    avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    fillerCount: fillers,
    richness: Math.round(richness * 100) / 100,
    clarity: Math.round(clarityScore),
    structure: Math.round(structureScore),
    completeness: Math.round(completeness),
    confidenceScore: Math.round(overall),
  };
}

export function levelFromScore(score) {
  if (score >= 70) return 'High';
  if (score >= 45) return 'Medium';
  return 'Low';
}
