import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { BehaviorMonitor, type BehaviorSnapshot } from '../lib/behavior';

export interface BehaviorCameraHandle {
  takeSnapshot: () => BehaviorSnapshot;
  isActive: () => boolean;
}

export const EMPTY_BEHAVIOR: BehaviorSnapshot = {
  sampleCount: 0,
  faceVisibility: 0,
  attentionScore: 0,
  engagementScore: 0,
  malpracticeScore: 0,
  tabSwitches: 0,
  blurEvents: 0,
  lookingAwayEvents: 0,
  multipleFaceEvents: 0,
};

const BehaviorCamera = forwardRef<BehaviorCameraHandle, { onStatus?: (s: string) => void }>(
  ({ onStatus }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const monitorRef = useRef<BehaviorMonitor | null>(null);
    const [status, setStatus] = useState('starting');
    const onStatusRef = useRef(onStatus);
    onStatusRef.current = onStatus;

    useEffect(() => {
      let stream: MediaStream | null = null;
      let cancelled = false;

      (async () => {
        try {
          if (!navigator.mediaDevices?.getUserMedia) throw new Error('no-media-api');
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240, facingMode: 'user' },
            audio: false,
          });
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          const video = videoRef.current;
          if (video) {
            video.srcObject = stream;
            await video.play().catch(() => {});
            monitorRef.current = new BehaviorMonitor(video);
            monitorRef.current.start();
          }
          setStatus('active');
          onStatusRef.current?.('active');
        } catch {
          setStatus('denied');
          onStatusRef.current?.('denied');
        }
      })();

      return () => {
        cancelled = true;
        monitorRef.current?.stop();
        monitorRef.current = null;
        stream?.getTracks().forEach((t) => t.stop());
      };
    }, []);

    useImperativeHandle(ref, () => ({
      takeSnapshot: () => monitorRef.current?.takeSnapshot() ?? EMPTY_BEHAVIOR,
      isActive: () => status === 'active',
    }));

    return (
      <div className="camera-panel">
        <video ref={videoRef} muted playsInline className="camera-video" />
        {status !== 'active' && (
          <div className="camera-overlay">
            {status === 'starting' ? 'Starting camera...' : 'Camera unavailable - behavior analysis off'}
          </div>
        )}
        <div className={`camera-dot ${status === 'active' ? 'live' : ''}`} />
        <span className="camera-label">Behavior monitor</span>
      </div>
    );
  }
);

BehaviorCamera.displayName = 'BehaviorCamera';
export default BehaviorCamera;
