export interface BehaviorSnapshot {
  sampleCount: number;
  faceVisibility: number;
  attentionScore: number;
  engagementScore: number;
  malpracticeScore: number;
  tabSwitches: number;
  blurEvents: number;
  lookingAwayEvents: number;
  multipleFaceEvents: number;
}

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

/**
 * BehaviorMonitor analyzes the webcam feed locally and keeps only aggregate
 * numeric signals. Frames are drawn to a tiny canvas and immediately discarded;
 * no image or video data is stored or uploaded.
 */
export class BehaviorMonitor {
  private video: HTMLVideoElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private timer: number | null = null;
  private running = false;
  private prevGray: Float32Array | null = null;

  private sampleCount = 0;
  private presentSamples = 0;
  private centeredSamples = 0;
  private attentionSum = 0;
  private motionSum = 0;
  private freezeSamples = 0;
  private tabSwitches = 0;
  private blurEvents = 0;
  private lookingAwayEvents = 0;
  private multipleFaceEvents = 0;

  private faceDetector: any = null;

  private onVisibility = () => {
    if (document.hidden) this.tabSwitches += 1;
  };

  private onBlur = () => {
    this.blurEvents += 1;
  };

  constructor(video: HTMLVideoElement) {
    this.video = video;
    this.canvas = document.createElement('canvas');
    this.canvas.width = 64;
    this.canvas.height = 48;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    const FD = (window as any).FaceDetector;
    if (FD) {
      try {
        this.faceDetector = new FD({ fastMode: true, maxDetectedFaces: 4 });
      } catch {
        this.faceDetector = null;
      }
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('blur', this.onBlur);
    this.timer = window.setInterval(() => void this.sample(), 800);
  }

  stop() {
    this.running = false;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('blur', this.onBlur);
  }

  private async sample() {
    const v = this.video;
    if (!this.ctx || !v || v.readyState < 2 || !v.videoWidth) return;

    let present = false;
    let centered = false;
    let motion = 0;
    let multiple = 0;

    if (this.faceDetector) {
      try {
        const faces = await this.faceDetector.detect(v);
        multiple = Math.max(0, faces.length - 1);
        present = faces.length > 0;
        if (present) {
          const box = faces[0].boundingBox;
          const cx = (box.x + box.width / 2) / (v.videoWidth || 1);
          centered = cx > 0.32 && cx < 0.68;
        }
      } catch {
        present = false;
      }
      // motion estimate still useful
      motion = this.detectMotion();
    } else {
      const result = this.detectSkin();
      present = result.present;
      centered = result.centered;
      motion = result.motion;
    }

    this.sampleCount += 1;
    if (present) this.presentSamples += 1;
    if (centered) this.centeredSamples += 1;
    if (present && !centered) this.lookingAwayEvents += 1;
    this.multipleFaceEvents += multiple;

    const attention = present ? (centered ? 100 : 72) : 35;
    this.attentionSum += attention;
    this.motionSum += motion;
    if (motion < 0.008) this.freezeSamples += 1;
  }

  private detectMotion(): number {
    if (!this.ctx) return 0;
    const { width, height } = this.canvas;
    this.ctx.drawImage(this.video, 0, 0, width, height);
    const data = this.ctx.getImageData(0, 0, width, height).data;
    const gray = new Float32Array(width * height);
    for (let i = 0; i < gray.length; i += 1) {
      const o = i * 4;
      gray[i] = (data[o] * 0.299 + data[o + 1] * 0.587 + data[o + 2] * 0.114) / 255;
    }
    let motion = 0;
    if (this.prevGray) {
      let sum = 0;
      for (let i = 0; i < gray.length; i += 1) sum += Math.abs(gray[i] - this.prevGray[i]);
      motion = sum / gray.length;
    }
    this.prevGray = gray;
    return motion;
  }

  private detectSkin(): { present: boolean; centered: boolean; motion: number } {
    if (!this.ctx) return { present: false, centered: false, motion: 0 };
    const { width, height } = this.canvas;
    this.ctx.drawImage(this.video, 0, 0, width, height);
    const data = this.ctx.getImageData(0, 0, width, height).data;

    let skinCount = 0;
    let sx = 0;
    let sy = 0;
    const gray = new Float32Array(width * height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = y * width + x;
        const o = i * 4;
        const r = data[o];
        const g = data[o + 1];
        const b = data[o + 2];
        gray[i] = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const isSkin =
          r > 95 && g > 40 && b > 20 && max - min > 15 && Math.abs(r - g) > 15 && r > g && r > b;
        if (isSkin) {
          skinCount += 1;
          sx += x;
          sy += y;
        }
      }
    }

    let motion = 0;
    if (this.prevGray) {
      let sum = 0;
      for (let i = 0; i < gray.length; i += 1) sum += Math.abs(gray[i] - this.prevGray[i]);
      motion = sum / gray.length;
    }
    this.prevGray = gray;

    const ratio = skinCount / (width * height);
    const present = ratio > 0.04 && ratio < 0.75;
    let centered = false;
    if (present && skinCount > 0) {
      const cx = sx / skinCount / width;
      const cy = sy / skinCount / height;
      centered = cx > 0.32 && cx < 0.68 && cy < 0.7;
    }
    return { present, centered, motion };
  }

  /** Returns metrics since the previous snapshot and resets the counters. */
  takeSnapshot(): BehaviorSnapshot {
    const n = Math.max(1, this.sampleCount);
    const presenceRatio = this.presentSamples / n;
    const avgMotion = this.motionSum / n;
    const freezeRatio = this.freezeSamples / n;

    const faceVisibility = Math.round(presenceRatio * 100);
    const attentionScore = Math.round(this.attentionSum / n);
    const engagementScore = Math.round(
      clamp(presenceRatio * 65 + Math.min(1, avgMotion / 0.06) * 35 - freezeRatio * 30)
    );
    const malpracticeScore = Math.round(
      clamp(
        this.tabSwitches * 18 +
          this.blurEvents * 6 +
          this.lookingAwayEvents * 4 +
          this.multipleFaceEvents * 30 +
          (presenceRatio < 0.4 ? 20 : 0)
      )
    );

    const snapshot: BehaviorSnapshot = {
      sampleCount: this.sampleCount,
      faceVisibility,
      attentionScore,
      engagementScore,
      malpracticeScore,
      tabSwitches: this.tabSwitches,
      blurEvents: this.blurEvents,
      lookingAwayEvents: this.lookingAwayEvents,
      multipleFaceEvents: this.multipleFaceEvents,
    };

    this.resetCounters();
    return snapshot;
  }

  private resetCounters() {
    this.sampleCount = 0;
    this.presentSamples = 0;
    this.centeredSamples = 0;
    this.attentionSum = 0;
    this.motionSum = 0;
    this.freezeSamples = 0;
    this.tabSwitches = 0;
    this.blurEvents = 0;
    this.lookingAwayEvents = 0;
    this.multipleFaceEvents = 0;
  }
}
