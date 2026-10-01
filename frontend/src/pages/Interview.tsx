import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BehaviorCamera, { EMPTY_BEHAVIOR, type BehaviorCameraHandle } from '../components/BehaviorCamera';
import VoiceRecorder from '../components/VoiceRecorder';
import { api } from '../api/client';
import type { InterviewSession } from '../api/types';
import type { VoiceResult } from '../lib/voice';

const DIFF_CLASS: Record<string, string> = { Easy: 'diff-easy', Medium: 'diff-medium', Hard: 'diff-hard' };

export default function Interview() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const behaviorRef = useRef<BehaviorCameraHandle>(null);

  const [session, setSession] = useState<InterviewSession | null>(null);
  const [index, setIndex] = useState(0);
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [voices, setVoices] = useState<Record<string, VoiceResult>>({});
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState('');
  const [cameraStatus, setCameraStatus] = useState('starting');

  useEffect(() => {
    api
      .getSession(id)
      .then(({ session: s }) => {
        if (s.status === 'completed') {
          navigate(`/report/${id}`, { replace: true });
          return;
        }
        setSession(s);
        const t: Record<string, string> = {};
        const v: Record<string, VoiceResult> = {};
        s.answers.forEach((a) => {
          if (a.text) t[a.questionId] = a.text;
          if (a.voice?.durationSec) v[a.questionId] = a.voice as VoiceResult;
        });
        setTexts(t);
        setVoices(v);
        const firstUnanswered = s.questions.findIndex((q) => !s.answers.some((a) => a.questionId === q.questionId));
        if (firstUnanswered > -1) setIndex(firstUnanswered);
      })
      .catch((e) => setError(e.message));
  }, [id, navigate]);

  const current = session?.questions[index];
  const answeredIds = useMemo(
    () => new Set((session?.answers || []).map((a) => a.questionId)),
    [session]
  );
  const currentAnswer = session?.answers.find((a) => a.questionId === current?.questionId);

  const saveAnswer = async () => {
    if (!session || !current) return;
    const text = (texts[current.questionId] || '').trim();
    const voice = voices[current.questionId];
    if (!text && !voice) {
      setError('Provide a written answer or record a voice response before saving.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
      const voicePayload = voice
        ? { ...voice, wordsPerMinute: voice.durationSec > 0 && words > 0 ? Math.round(words / (voice.durationSec / 60)) : 0 }
        : {};
      const behavior = behaviorRef.current?.takeSnapshot() ?? EMPTY_BEHAVIOR;
      const { answer } = await api.submitAnswer(session.id, {
        questionId: current.questionId,
        text,
        voice: voicePayload,
        behavior,
      });
      setSession((prev) => {
        if (!prev) return prev;
        const answers = prev.answers.filter((a) => a.questionId !== current.questionId);
        answers.push(answer as any);
        return { ...prev, answers };
      });
      if (index < session.questions.length - 1) {
        setTimeout(() => setIndex((i) => Math.min(session.questions.length - 1, i + 1)), 350);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save answer');
    } finally {
      setSaving(false);
    }
  };

  const finish = async () => {
    if (!session) return;
    const unanswered = session.questions.length - session.answers.length;
    if (unanswered > 0 && !window.confirm(`${unanswered} question(s) are unanswered. Finish and generate the report anyway?`)) {
      return;
    }
    setFinishing(true);
    try {
      await api.completeInterview(session.id);
      navigate(`/report/${session.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to finish interview');
      setFinishing(false);
    }
  };

  if (!session) {
    return <div className="page-loading">{error || 'Loading interview...'}</div>;
  }

  return (
    <div className="interview-shell">
      <aside className="interview-sidebar">
        <div className="sidebar-head">
          <div className="eyebrow">{session.categoryName}</div>
          <h2>{session.level}</h2>
          <div className="progress-bar">
            <span style={{ width: `${(session.answers.length / session.questions.length) * 100}%` }} />
          </div>
          <div className="muted small">
            {session.answers.length} of {session.questions.length} answered
          </div>
        </div>
        <ol className="question-nav">
          {session.questions.map((q, i) => (
            <li key={q.questionId}>
              <button
                className={`qnav-item ${i === index ? 'active' : ''} ${answeredIds.has(q.questionId) ? 'done' : ''}`}
                onClick={() => setIndex(i)}
              >
                <span className="qnav-num">{answeredIds.has(q.questionId) ? '✓' : i + 1}</span>
                <span className="qnav-body">
                  <span className="qnav-type">
                    {q.type === 'programming' ? 'Code' : 'Theory'}
                    <span className={`chip ${DIFF_CLASS[q.difficulty] || ''}`}>{q.difficulty}</span>
                  </span>
                  <span className="qnav-text">{q.text}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        <button className="btn btn-primary block" onClick={finish} disabled={finishing}>
          {finishing ? 'Generating report...' : 'Finish & generate report'}
        </button>
      </aside>

      <main className="interview-main">
        <div className="question-head">
          <span className="pill">Question {index + 1} / {session.questions.length}</span>
          <span className={`chip ${DIFF_CLASS[current?.difficulty || ''] || ''}`}>{current?.difficulty}</span>
          <span className="chip neutral">{current?.type === 'programming' ? `Programming${current?.language ? ` · ${current.language}` : ''}` : 'Theory'}</span>
        </div>

        <h2 className="question-text">{current?.text}</h2>

        <label className="field-label" htmlFor="answer">
          Your written answer
        </label>
        <textarea
          id="answer"
          className="answer-input"
          rows={current?.type === 'programming' ? 12 : 8}
          placeholder={
            current?.type === 'programming'
              ? 'Write your code / approach here...'
              : 'Type a structured answer explaining your reasoning...'
          }
          value={texts[current!.questionId] || ''}
          onChange={(e) => setTexts({ ...texts, [current!.questionId]: e.target.value })}
          spellCheck={current?.type !== 'programming'}
        />

        <VoiceRecorder
          key={current!.questionId}
          onMetrics={(m) => {
            setVoices((prev) => {
              const next = { ...prev };
              if (m) next[current!.questionId] = m;
              else delete next[current!.questionId];
              return next;
            });
          }}
        />

        {error && <div className="alert error">{error}</div>}

        {currentAnswer?.evaluation && (
          <div className="answer-feedback">
            <div className="feedback-row">
              <span className={`badge ${currentAnswer.evaluation.correctnessLevel === 'High' ? 'ok' : currentAnswer.evaluation.correctnessLevel === 'Medium' ? 'warn' : 'bad'}`}>
                Correctness: {currentAnswer.evaluation.correctnessLevel} ({currentAnswer.evaluation.correctnessScore})
              </span>
              <span className="badge neutral">Confidence: {currentAnswer.evaluation.textConfidence}</span>
              <span className="badge neutral">Behavior: {currentAnswer.behavior?.attentionScore ?? '--'}</span>
            </div>
            <p className="muted small">{currentAnswer.evaluation.feedback}</p>
          </div>
        )}

        <div className="interview-actions">
          <button
            className="btn btn-ghost"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
          >
            Previous
          </button>
          <button className="btn btn-primary" onClick={saveAnswer} disabled={saving}>
            {saving ? 'Evaluating...' : answeredIds.has(current!.questionId) ? 'Update answer' : 'Save & evaluate'}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => setIndex((i) => Math.min(session.questions.length - 1, i + 1))}
            disabled={index === session.questions.length - 1}
          >
            Next
          </button>
        </div>

        <BehaviorCamera ref={behaviorRef} onStatus={setCameraStatus} />
        {cameraStatus === 'denied' && (
          <p className="muted small">
            Camera access is off, so behavioral metrics will default to neutral. Enable it for engagement
            and malpractice detection.
          </p>
        )}
      </main>
    </div>
  );
}
