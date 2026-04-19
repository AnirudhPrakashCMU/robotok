import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { RankedClip, GenerationState } from '../lib/types';
import { ScoreOverlay } from './ScoreOverlay';

interface VideoCardProps {
  clip: RankedClip;
  isActive: boolean;
  generationState?: GenerationState;
  onFeedback: (clipId: string, feedback: 'use' | 'skip') => void;
  isScoreAnimating?: boolean;
  onVideoRef?: (el: HTMLVideoElement | null) => void;
}

function TypewriterText({ text, speed = 40 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useState(() => {
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(interval);
  });

  return (
    <span>
      {displayed}
      {!done && <span className="animate-pulse">|</span>}
    </span>
  );
}

// Animated dashcam-style visualization for clips without real video
function DashcamPlaceholder({ clip }: { clip: RankedClip }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 800;
    const H = 450;
    canvas.width = W;
    canvas.height = H;

    const isNight = clip.category === 'night_driving' || clip.tags?.includes('night');
    const isRain = clip.category === 'rain_weather' || clip.tags?.includes('rain');

    let t = 0;
    let animId: number;

    const rainDrops = isRain ? Array.from({ length: 80 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      speed: 4 + Math.random() * 6,
      len: 8 + Math.random() * 12,
    })) : [];

    function draw() {
      if (!ctx) return;
      t += 0.016;

      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.45);
      if (isNight) {
        skyGrad.addColorStop(0, '#0a0e17');
        skyGrad.addColorStop(1, '#151b2e');
      } else {
        skyGrad.addColorStop(0, '#1e293b');
        skyGrad.addColorStop(1, '#334155');
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H * 0.45);

      // Road surface
      const roadGrad = ctx.createLinearGradient(0, H * 0.45, 0, H);
      if (isRain) {
        roadGrad.addColorStop(0, '#1a2332');
        roadGrad.addColorStop(1, '#0f1520');
      } else {
        roadGrad.addColorStop(0, '#1e2530');
        roadGrad.addColorStop(1, '#111822');
      }
      ctx.fillStyle = roadGrad;
      ctx.fillRect(0, H * 0.45, W, H * 0.55);

      // Vanishing point
      const vpX = W * 0.5;
      const vpY = H * 0.42;

      // Road edges (converging to vanishing point)
      ctx.strokeStyle = isNight ? 'rgba(100,120,160,0.3)' : 'rgba(120,140,170,0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(vpX, vpY);
      ctx.lineTo(W * 0.05, H);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(vpX, vpY);
      ctx.lineTo(W * 0.95, H);
      ctx.stroke();

      // Dashed center line (animated, moving toward camera)
      ctx.strokeStyle = isNight ? 'rgba(200,200,100,0.5)' : 'rgba(220,220,120,0.6)';
      ctx.lineWidth = 2;
      const dashCount = 12;
      for (let i = 0; i < dashCount; i++) {
        const progress = ((i / dashCount) + t * 0.3) % 1;
        const p = progress * progress; // Perspective acceleration
        const y = vpY + (H - vpY) * p;
        const nextP = Math.min(1, p + 0.03);
        const y2 = vpY + (H - vpY) * nextP;
        if (y > vpY + 5) {
          ctx.globalAlpha = Math.min(1, progress * 3);
          ctx.beginPath();
          ctx.moveTo(vpX, y);
          ctx.lineTo(vpX, y2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // Detection bounding boxes from clip data
      if (clip.detections) {
        for (const det of clip.detections) {
          const [bx, by, bw, bh] = det.bbox;
          const x = bx * W;
          const y = by * H;
          const w = bw * W;
          const h = bh * H;

          // Pulsing box
          const pulse = 0.6 + 0.4 * Math.sin(t * 3 + bx * 10);
          ctx.strokeStyle = det.color || '#3B82F6';
          ctx.globalAlpha = pulse;
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, w, h);

          // Corner brackets
          const corner = Math.min(w, h) * 0.25;
          ctx.lineWidth = 2.5;
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.moveTo(x, y + corner); ctx.lineTo(x, y); ctx.lineTo(x + corner, y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x + w - corner, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + corner);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x + w, y + h - corner); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - corner, y + h);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x + corner, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - corner);
          ctx.stroke();

          // Label
          const label = det.label + ' ' + Math.round(det.confidence * 100) + '%';
          ctx.font = '10px monospace';
          const tw = ctx.measureText(label).width;
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(x, y - 14, tw + 6, 14);
          ctx.fillStyle = det.color || '#3B82F6';
          ctx.fillText(label, x + 3, y - 3);
        }
      }
      ctx.globalAlpha = 1;

      // Rain effect
      if (isRain) {
        ctx.strokeStyle = 'rgba(150,180,220,0.3)';
        ctx.lineWidth = 1;
        for (const drop of rainDrops) {
          ctx.beginPath();
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x - 1, drop.y + drop.len);
          ctx.stroke();
          drop.y += drop.speed;
          if (drop.y > H) { drop.y = -drop.len; drop.x = Math.random() * W; }
        }
      }

      // HUD overlay: timestamp
      ctx.font = '11px monospace';
      ctx.fillStyle = isNight ? 'rgba(0,255,136,0.7)' : 'rgba(0,200,100,0.8)';
      const ts = new Date().toISOString().slice(11, 19);
      ctx.fillText('REC ● ' + ts, 12, 20);

      // HUD: speed + heading
      ctx.fillText('SPD: ' + (25 + Math.round(Math.sin(t) * 5)) + ' mph', 12, H - 30);
      ctx.fillText('HDG: ' + (180 + Math.round(Math.sin(t * 0.3) * 8)) + '°', 12, H - 14);

      // Scan line
      const scanY = (t * 80) % H;
      ctx.fillStyle = 'rgba(0,255,136,0.03)';
      ctx.fillRect(0, scanY - 2, W, 4);

      // Night: headlight cones
      if (isNight) {
        const hlGrad = ctx.createRadialGradient(vpX, vpY + 20, 5, vpX, H * 0.7, H * 0.4);
        hlGrad.addColorStop(0, 'rgba(255,240,200,0.06)');
        hlGrad.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = hlGrad;
        ctx.fillRect(0, vpY, W, H - vpY);
      }

      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animId);
  }, [clip]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain"
        style={{ imageRendering: 'auto' }}
      />
      {/* Scene description overlay at bottom */}
      <div className="absolute bottom-16 left-4 right-16 px-3 py-2 rounded" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
        <p className="text-xs font-mono leading-relaxed" style={{ color: 'rgba(0,255,136,0.8)' }}>
          {clip.sceneDescription}
        </p>
      </div>
    </div>
  );
}

export function VideoCard({ clip, isActive, generationState, onFeedback, isScoreAnimating, onVideoRef }: VideoCardProps) {
  const isLiveGenerating = clip.isLive && generationState?.status === 'generating';

  return (
    <div className="relative w-full h-full flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      {/* Video or generation state */}
      <div className="relative w-full h-full max-w-[800px] mx-auto" style={{ background: '#000' }}>
        {isLiveGenerating ? (
          // Live generation in progress
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8">
            <div className="flex items-center gap-2 mb-6">
              <span className="w-2 h-2 rounded-full live-pulse" style={{ background: 'var(--live)' }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--live)' }}>
                LIVE
              </span>
            </div>
            <p className="font-mono text-sm leading-relaxed text-center" style={{ color: 'var(--text-muted)' }}>
              <TypewriterText text={generationState.prompt || 'Generating training scenario...'} />
            </p>
            {/* Progress bar */}
            <div className="w-full max-w-xs h-0.5 mt-6 rounded-full" style={{ background: 'var(--border)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'var(--accent)' }}
                initial={{ width: '0%' }}
                animate={{ width: `${generationState.progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        ) : clip.videoUrl ? (
          // Real video
          <video
            ref={(el) => onVideoRef?.(el)}
            className="w-full h-full object-contain"
            src={clip.videoUrl}
            autoPlay={isActive}
            loop
            muted
            playsInline
            crossOrigin="anonymous"
          />
        ) : (
          // Animated dashcam visualization (no video yet)
          <DashcamPlaceholder clip={clip} />
        )}

        {/* Scenario label */}
        <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
          <h3
            className="text-[15px] font-semibold"
            style={{
              color: 'var(--text-primary)',
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
            }}
          >
            {clip.scenario}
          </h3>
          {clip.isLive && generationState?.status !== 'generating' && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase" style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--live)' }}>
              <span className="w-1.5 h-1.5 rounded-full live-pulse" style={{ background: 'var(--live)' }} />
              LIVE
            </span>
          )}
        </div>

        {/* Action buttons (right side) */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3">
          <button
            onClick={() => onFeedback(clip.id, 'use')}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)' }}
            title="Train on this"
          >
            <span className="text-lg">👍</span>
          </button>
          <button
            onClick={() => onFeedback(clip.id, 'skip')}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
            title="Skip"
          >
            <span className="text-lg">👎</span>
          </button>
          <button
            onClick={() => onFeedback(clip.id, 'use')}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)' }}
            title="Train on this"
          >
            <span className="text-sm">🎯</span>
          </button>
        </div>

        {/* Score overlay */}
        <ScoreOverlay
          score={clip.score}
          whyRecommended={clip.whyRecommended}
          isAnimating={isScoreAnimating}
        />
      </div>
    </div>
  );
}
