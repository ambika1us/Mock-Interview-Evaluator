import { env, llmEnabled } from '../config/env.js';

const SYSTEM_PROMPT = `You are a strict, fair technical interview evaluator.
Evaluate the candidate's answer against the reference answer and expected keywords.
Return ONLY compact JSON with this shape:
{
  "correctnessScore": <integer 0-100>,
  "semanticSimilarity": <number 0-1>,
  "feedback": "<2-3 sentence assessment>",
  "strengths": ["..."],
  "improvements": ["..."]
}
Do not include markdown fences or extra text.`;

async function chatJson(messages, { timeoutMs = 20000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${env.llm.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.llm.apiKey}`,
      },
      body: JSON.stringify({
        model: env.llm.model,
        temperature: 0.2,
        messages,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`LLM request failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? '{}';
    return JSON.parse(stripFences(content));
  } finally {
    clearTimeout(timer);
  }
}

function stripFences(text) {
  return String(text).replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
}

/**
 * Attempts LLM-based evaluation. Returns null when no key is configured or on failure,
 * so callers can fall back to the offline evaluator.
 */
export async function llmEvaluateAnswer({ question, answerText, expectedAnswer, keywords }) {
  if (!llmEnabled()) return null;
  const userPrompt = [
    `Question type: ${question.type} (${question.difficulty})`,
    `Question: ${question.text}`,
    expectedAnswer ? `Reference answer: ${expectedAnswer}` : '',
    keywords?.length ? `Expected keywords: ${keywords.join(', ')}` : '',
    `Candidate answer:\n${answerText || '(no answer provided)'}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  try {
    const parsed = await chatJson([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ]);
    if (typeof parsed?.correctnessScore !== 'number') return null;
    return {
      correctnessScore: Math.max(0, Math.min(100, Math.round(parsed.correctnessScore))),
      semanticSimilarity: typeof parsed.semanticSimilarity === 'number'
        ? Math.max(0, Math.min(1, parsed.semanticSimilarity))
        : null,
      feedback: parsed.feedback || '',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 4) : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 4) : [],
      evaluator: `llm:${env.llm.model}`,
    };
  } catch (err) {
    console.warn('[llm] evaluation failed, falling back to offline evaluator:', err.message);
    return null;
  }
}
