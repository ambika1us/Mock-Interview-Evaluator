import { useEffect, useRef, useState } from 'react';
import { analyzeAudioBlob, type VoiceResult } from '../lib/voice';

interface Props {
  onMetrics: (m: VoiceResult | null) => void;
  disabled?: boolean;
}

function pickMimeType(): string | undefined {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(c)) return c;
  }
  return undefined;
}

export default function VoiceRecorder({ onMetrics, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [metrics, setMetrics] = useState<VoiceResult | null>(null);
  const [error, setError] = useState('');

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef(0);

  const cleanup = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
  };

  useEffect(() => cleanup, []);

  const meter = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i += 1) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    setLevel(Math.min(1, Math.sqrt(sum / data.length) * 3));
    rafRef.current = requestAnimationFrame(meter);
  };

  const start = async () => {
    setError('');
    setMetrics(null);
    onMetrics(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const AudioCtx: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      analyserRef.current = analyser;
      meter();

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        cleanup();
        setRecording(false);
        if (!blob.size) return;
        setAnalyzing(true);
        try {
          const result = await analyzeAudioBlob(blob);
          setMetrics(result);
          onMetrics(result);
        } catch {
          setError('Could not analyze the recording. You can still submit the written answer.');
        } finally {
          setAnalyzing(false);
        }
      };
      recorderRef.current = recorder;
      startRef.current = Date.now();
      setElapsed(0);
      setRecording(true);
      timerRef.current = window.setInterval(
        () => setElapsed((Date.now() - startRef.current) / 1000),
        100
      );
      recorder.start();
    } catch {
      cleanup();
      setRecording(false);
      setError('Microphone unavailable. Type your answer instead.');
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
  };

  const reset = () => {
    setMetrics(null);
    onMetrics(null);
    setElapsed(0);
    setError('');
  };

  return (
    <div className="voice-recorder">
      <div className="voice-head">
        <span className="field-label">Voice capture (optional)</span>
        <span className="muted small">
          Analyzed locally for tone, pauses &amp; hesitation. Audio is never stored or uploaded.
        </span>
      </div>

      <div className="voice-controls">
        {!recording && !metrics && (
          <button type="button" className="btn btn-secondary" onClick={start} disabled={disabled || analyzing}>
            {analyzing ? 'Analyzing...' : '● Record answer'}
          </button>
        )}
        {recording && (
          <>
            <button type="button" className="btn btn-danger" onClick={stop}>
              ■ Stop ({elapsed.toFixed(1)}s)
            </button>
            <div className="level-meter">
              <span style={{ width: `${Math.round(level * 100)}%` }} />
            </div>
          </>
        )}
        {metrics && !recording && (
          <>
            <span className="badge ok">Analyzed</span>
            <span className="muted small">
              {metrics.durationSec}s speech · {(metrics.speechRatio * 100).toFixed(0)}% voiced ·{' '}
              {metrics.pauseCount} pauses (longest {metrics.longestPauseSec}s)
            </span>
            <button type="button" className="btn btn-ghost sm" onClick={reset}>
              Re-record
            </button>
          </>
        )}
      </div>
      {error && <div className="alert warn small">{error}</div>}
    </div>
  );
}
