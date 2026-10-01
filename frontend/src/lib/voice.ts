export interface VoiceResult {
  durationSec: number;
  speechRatio: number;
  pauseCount: number;
  longestPauseSec: number;
  energyVariance: number;
  pitchVariance: number;
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
  return sorted[idx];
}

function autoCorrelate(buf: Float32Array, sampleRate: number): number {
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i += 1) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.008) return -1;

  let r1 = 0;
  let r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i += 1) {
    if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  }
  for (let i = 1; i < SIZE / 2; i += 1) {
    if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
  }
  const trimmed = buf.slice(r1, r2);
  const n = trimmed.length;
  if (n < 64) return -1;

  const c = new Float32Array(n).fill(0);
  for (let lag = 0; lag < n; lag += 1) {
    let sum = 0;
    for (let i = 0; i < n - lag; i += 1) sum += trimmed[i] * trimmed[i + lag];
    c[lag] = sum;
  }

  let d = 0;
  while (d < n - 1 && c[d] > c[d + 1]) d += 1;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < n; i += 1) {
    if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  }
  const t0 = maxpos;
  if (t0 <= 0) return -1;
  const x1 = c[t0 - 1] ?? 0;
  const x2 = c[t0];
  const x3 = c[t0 + 1] ?? 0;
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  const lag = a ? t0 - b / (2 * a) : t0;
  const f0 = sampleRate / lag;
  return f0 > 60 && f0 < 500 ? f0 : -1;
}

/**
 * Extracts tone/hesitation metrics entirely in the browser.
 * The raw audio blob never leaves the client - only these numbers are sent.
 */
export async function analyzeAudioBlob(blob: Blob): Promise<VoiceResult> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx: typeof AudioContext =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioCtx();
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    ctx.close();
  }

  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;
  const channels = audioBuffer.numberOfChannels;
  const mix = new Float32Array(length);
  for (let c = 0; c < channels; c += 1) {
    const data = audioBuffer.getChannelData(c);
    for (let i = 0; i < length; i += 1) mix[i] += data[i] / channels;
  }

  const durationSec = length / sampleRate;
  const frame = 1024;
  const hop = 512;
  const rms: number[] = [];

  for (let start = 0; start + frame <= length; start += hop) {
    let sum = 0;
    for (let i = 0; i < frame; i += 1) sum += mix[start + i] * mix[start + i];
    rms.push(Math.sqrt(sum / frame));
  }

  if (!rms.length) {
    return { durationSec, speechRatio: 0, pauseCount: 0, longestPauseSec: durationSec, energyVariance: 0, pitchVariance: 0 };
  }

  const noiseFloor = percentile(rms, 15);
  const threshold = Math.max(noiseFloor * 2.2, 0.008);
  const voiced = rms.map((v) => v > threshold);
  const voicedCount = voiced.filter(Boolean).length;
  const speechRatio = voicedCount / rms.length;
  const frameSec = hop / sampleRate;

  let pauseCount = 0;
  let longestPauseSec = 0;
  let gapStart = -1;
  for (let i = 0; i < voiced.length; i += 1) {
    if (!voiced[i] && gapStart === -1 && i > 0 && voiced[i - 1]) gapStart = i;
    if (voiced[i] && gapStart !== -1) {
      const gap = (i - gapStart) * frameSec;
      if (gap > 0.35) {
        pauseCount += 1;
        longestPauseSec = Math.max(longestPauseSec, gap);
      }
      gapStart = -1;
    }
  }
  if (gapStart !== -1) {
    const gap = (voiced.length - gapStart) * frameSec;
    if (gap > 0.35) { pauseCount += 1; longestPauseSec = Math.max(longestPauseSec, gap); }
  }

  const voicedRms = rms.filter((_, i) => voiced[i]);
  const meanRms = voicedRms.reduce((s, v) => s + v, 0) / Math.max(1, voicedRms.length);
  const varRms = voicedRms.reduce((s, v) => s + (v - meanRms) ** 2, 0) / Math.max(1, voicedRms.length);
  const energyVariance = meanRms ? Math.min(1, Math.sqrt(varRms) / meanRms) : 0;

  const pitches: number[] = [];
  const step = Math.max(1, Math.floor(voiced.length / 40));
  for (let i = 0; i < voiced.length; i += step) {
    if (!voiced[i]) continue;
    const start = Math.min(mix.length - frame, i * hop);
    const f0 = autoCorrelate(mix.subarray(start, start + frame), sampleRate);
    if (f0 > 0) pitches.push(f0);
  }
  let pitchVariance = 0;
  if (pitches.length > 2) {
    const mean = pitches.reduce((s, v) => s + v, 0) / pitches.length;
    const std = Math.sqrt(pitches.reduce((s, v) => s + (v - mean) ** 2, 0) / pitches.length);
    pitchVariance = mean ? Math.min(1, std / mean) : 0;
  }

  return {
    durationSec: Math.round(durationSec * 100) / 100,
    speechRatio: Math.round(speechRatio * 1000) / 1000,
    pauseCount,
    longestPauseSec: Math.round(longestPauseSec * 100) / 100,
    energyVariance: Math.round(energyVariance * 1000) / 1000,
    pitchVariance: Math.round(pitchVariance * 1000) / 1000,
  };
}
