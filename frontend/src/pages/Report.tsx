import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { api } from '../api/client';
import type { InterviewSession } from '../api/types';

function ScoreBar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="score-bar">
      <div className="score-bar-head">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className={`bar-track ${tone}`}>
        <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

const recClass = (r?: string) => (r === 'Hire' ? 'ok' : r === 'Improve' ? 'warn' : 'bad');

export default function Report() {
  const { id = '' } = useParams();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getSession(id)
      .then(({ session: s }) => setSession(s))
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="page-loading">{error}</div>;
  if (!session) return <div className="page-loading">Loading report...</div>;
  if (!session.report) return <div className="page-loading">Report not available yet.</div>;

  const r = session.report;

  return (
    <div className="app-shell">
      <Navbar />
      <main className="container">
        <div className="report-head">
          <div>
            <Link to="/" className="muted small">
              ← Back to dashboard
            </Link>
            <h1>Interview Report</h1>
            <p className="muted">
              {session.categoryName} · {session.level} ·{' '}
              {session.completedAt ? new Date(session.completedAt).toLocaleString() : ''}
            </p>
          </div>
          <div className="grade-badge">
            <span className={`grade grade-${r.grade}`}>{r.grade}</span>
            <span className="grade-sub">Overall {r.overallRating}/100</span>
            <span className={`badge ${recClass(r.recommendation)}`}>{r.recommendation}</span>
          </div>
        </div>

        <section className="panel">
          <h2>Score breakdown</h2>
          <div className="score-grid">
            <ScoreBar label="Correctness" value={r.correctnessScore} tone="tone-blue" />
            <ScoreBar label="Confidence" value={r.confidenceScore} tone="tone-violet" />
            <ScoreBar label="Behavior" value={r.behaviorScore} tone="tone-green" />
            <ScoreBar label="Overall" value={r.overallRating} tone="tone-amber" />
          </div>
          <p className="summary-text">{r.summary}</p>
        </section>

        <section className="two-col">
          <div className="panel">
            <h2>Strengths</h2>
            {r.strengths.length ? (
              <ul className="list-good">
                {r.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">No standout strengths detected.</p>
            )}
          </div>
          <div className="panel">
            <h2>Areas to improve</h2>
            {r.weaknesses.length ? (
              <ul className="list-bad">
                {r.weaknesses.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">No major weaknesses detected.</p>
            )}
          </div>
        </section>

        <section className="panel">
          <h2>Question-by-question</h2>
          <div className="qa-list">
            {session.questions.map((q) => {
              const a = session.answers.find((x) => x.questionId === q.questionId);
              const e = a?.evaluation;
              return (
                <details key={q.questionId} className="qa-item" open={false}>
                  <summary>
                    <span className="qa-index">Q{q.order}</span>
                    <span className="qa-question">{q.text}</span>
                    <span className="qa-metrics">
                      <span className="chip neutral">{q.type === 'programming' ? 'Code' : 'Theory'}</span>
                      {e ? (
                        <>
                          <span className={`badge ${e.correctnessLevel === 'High' ? 'ok' : e.correctnessLevel === 'Medium' ? 'warn' : 'bad'}`}>
                            {e.correctnessScore}
                          </span>
                          <span className="badge neutral">conf {e.textConfidence}</span>
                        </>
                      ) : (
                        <span className="badge neutral">Not answered</span>
                      )}
                    </span>
                  </summary>
                  <div className="qa-body">
                    {a?.text && (
                      <div className="qa-answer">
                        <span className="field-label">Your answer</span>
                        <pre className="answer-pre">{a.text}</pre>
                      </div>
                    )}
                    {e && (
                      <>
                        <div className="metric-chips">
                          <span>Semantic match: {Math.round((e.semanticSimilarity ?? 0) * 100)}%</span>
                          <span>Keyword coverage: {e.keywordCoverage === null ? 'n/a' : `${Math.round(e.keywordCoverage * 100)}%`}</span>
                          <span>Clarity: {e.clarity}</span>
                          <span>Structure: {e.structure}</span>
                          <span>Completeness: {e.completeness}</span>
                          {e.evaluator && <span>Evaluator: {e.evaluator}</span>}
                        </div>
                        <p>{e.feedback}</p>
                        <div className="two-col tight">
                          {e.strengths?.length > 0 && (
                            <div>
                              <span className="field-label">Strengths</span>
                              <ul className="list-good">
                                {e.strengths.map((s, i) => <li key={i}>{s}</li>)}
                              </ul>
                            </div>
                          )}
                          {e.improvements?.length > 0 && (
                            <div>
                              <span className="field-label">Improvements</span>
                              <ul className="list-bad">
                                {e.improvements.map((s, i) => <li key={i}>{s}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                    {a?.voice?.durationSec ? (
                      <div className="metric-chips">
                        <span>Speech: {a.voice.durationSec}s</span>
                        <span>Voiced: {Math.round((a.voice.speechRatio || 0) * 100)}%</span>
                        <span>Pauses: {a.voice.pauseCount}</span>
                        <span>Pace: {a.voice.wordsPerMinute} wpm</span>
                        <span>Voice confidence: {a.voice.confidenceScore ?? '--'}</span>
                      </div>
                    ) : null}
                    {a?.behavior?.attentionScore ? (
                      <div className="metric-chips">
                        <span>Attention: {a.behavior.attentionScore}</span>
                        <span>Engagement: {a.behavior.engagementScore}</span>
                        <span>Malpractice risk: {a.behavior.malpracticeScore}</span>
                        <span>Tab switches: {a.behavior.tabSwitches}</span>
                        <span>Looking away: {a.behavior.lookingAwayEvents}</span>
                      </div>
                    ) : null}
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
