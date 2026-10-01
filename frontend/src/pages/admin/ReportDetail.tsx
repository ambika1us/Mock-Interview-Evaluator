import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client';

const recClass = (r?: string) => (r === 'Hire' ? 'ok' : r === 'Improve' ? 'warn' : 'bad');

export default function ReportDetail() {
  const { id = '' } = useParams();
  const [session, setSession] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.adminReport(id).then(({ session: s }) => setSession(s)).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="alert error">{error}</div>;
  if (!session) return <div className="page-loading">Loading report...</div>;

  const r = session.report || {};
  const answerFor = (questionId: string) =>
    (session.answers || []).find((a: any) => String(a.question) === String(questionId));

  return (
    <div className="stack-lg">
      <div className="report-head">
        <div>
          <Link to="/admin/reports" className="muted small">← Back to reports</Link>
          <h1>{session.candidate?.name || 'Candidate'}</h1>
          <p className="muted">
            {session.candidate?.email} · {session.categoryName} · {session.level} ·{' '}
            {session.completedAt ? new Date(session.completedAt).toLocaleString() : ''}
          </p>
        </div>
        <div className="grade-badge">
          <span className={`grade grade-${r.grade}`}>{r.grade}</span>
          <span className="grade-sub">Overall {r.overallRating}/100</span>
          <span className={`badge ${recClass(r.recommendation)}`}>{r.recommendation}</span>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card"><span className="stat-value">{r.correctnessScore}</span><span className="stat-label">Correctness</span></div>
        <div className="stat-card"><span className="stat-value">{r.confidenceScore}</span><span className="stat-label">Confidence</span></div>
        <div className="stat-card"><span className="stat-value">{r.behaviorScore}</span><span className="stat-label">Behavior</span></div>
        <div className="stat-card"><span className="stat-value">{r.overallRating}</span><span className="stat-label">Overall</span></div>
      </div>

      <div className="two-col">
        <div className="panel">
          <h2>Strengths</h2>
          <ul className="list-good">{(r.strengths || []).map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
          {!(r.strengths || []).length && <p className="muted">—</p>}
        </div>
        <div className="panel">
          <h2>Weaknesses</h2>
          <ul className="list-bad">{(r.weaknesses || []).map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
          {!(r.weaknesses || []).length && <p className="muted">—</p>}
        </div>
      </div>

      <div className="panel">
        <h2>Questions &amp; answers</h2>
        <div className="qa-list">
          {(session.questions || []).map((q: any) => {
            const a = answerFor(q.questionId);
            const e = a?.evaluation;
            return (
              <details key={q.questionId} className="qa-item">
                <summary>
                  <span className="qa-index">Q{q.order}</span>
                  <span className="qa-question">{q.text}</span>
                  <span className="qa-metrics">
                    <span className="chip neutral">{q.type}</span>
                    {e ? (
                      <span className={`badge ${e.correctnessLevel === 'High' ? 'ok' : e.correctnessLevel === 'Medium' ? 'warn' : 'bad'}`}>
                        {e.correctnessScore}
                      </span>
                    ) : <span className="badge neutral">No answer</span>}
                  </span>
                </summary>
                <div className="qa-body">
                  <div className="qa-answer">
                    <span className="field-label">Expected answer</span>
                    <p className="muted small">{q.expectedAnswer || '—'}</p>
                  </div>
                  <div className="qa-answer">
                    <span className="field-label">Candidate answer</span>
                    <pre className="answer-pre">{a?.text || '(no written answer)'}</pre>
                  </div>
                  {e && (
                    <>
                      <div className="metric-chips">
                        <span>Semantic: {Math.round((e.semanticSimilarity ?? 0) * 100)}%</span>
                        <span>Keywords: {e.keywordCoverage === null ? 'n/a' : `${Math.round(e.keywordCoverage * 100)}%`}</span>
                        <span>Clarity: {e.clarity}</span>
                        <span>Structure: {e.structure}</span>
                        <span>Completeness: {e.completeness}</span>
                        <span>Evaluator: {e.evaluator}</span>
                      </div>
                      <p>{e.feedback}</p>
                    </>
                  )}
                  {a?.behavior && (
                    <div className="metric-chips">
                      <span>Attention: {a.behavior.attentionScore}</span>
                      <span>Engagement: {a.behavior.engagementScore}</span>
                      <span>Malpractice: {a.behavior.malpracticeScore}</span>
                      <span>Tab switches: {a.behavior.tabSwitches}</span>
                      <span>Looking away: {a.behavior.lookingAwayEvents}</span>
                      <span>Faces &gt;1: {a.behavior.multipleFaceEvents}</span>
                    </div>
                  )}
                  {a?.voice?.durationSec ? (
                    <div className="metric-chips">
                      <span>Speech: {a.voice.durationSec}s</span>
                      <span>Pauses: {a.voice.pauseCount}</span>
                      <span>Pace: {a.voice.wordsPerMinute} wpm</span>
                      <span>Voice confidence: {a.voice.confidenceScore}</span>
                    </div>
                  ) : null}
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </div>
  );
}
