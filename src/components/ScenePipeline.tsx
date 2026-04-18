import { useState, useEffect, useRef } from 'react';
import type { RankedClip, Detection } from '../lib/types';

interface ScenePipelineProps {
  clip: RankedClip | null;
}

function DetectionCanvas({ detections, width, height }: { detections: Detection[]; width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    detections.forEach((det, i) => {
      const [x, y, w, h] = det.bbox;
      const px = x * width;
      const py = y * height;
      const pw = w * width;
      const ph = h * height;

      // Stagger animation
      setTimeout(() => {
        // Box
        ctx.strokeStyle = det.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(px, py, pw, ph);

        // Label background
        const label = `${det.label} ${(det.confidence * 100).toFixed(0)}%`;
        ctx.font = '10px "JetBrains Mono", monospace';
        const metrics = ctx.measureText(label);
        ctx.fillStyle = det.color;
        ctx.fillRect(px, py - 14, metrics.width + 6, 14);

        // Label text
        ctx.fillStyle = '#0A0E17';
        ctx.fillText(label, px + 3, py - 3);
      }, i * 100);
    });
  }, [detections, width, height]);

  return <canvas ref={canvasRef} className="absolute inset-0" style={{ width, height }} />;
}

function TypewriterScene({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, 15);
    return () => clearInterval(interval);
  }, [text]);

  return <span>{displayed}</span>;
}

export function ScenePipeline({ clip }: ScenePipelineProps) {
  if (!clip) {
    return (
      <aside className="w-[280px] flex-shrink-0 border-r p-4 flex items-center justify-center" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>Waiting for clip...</span>
      </aside>
    );
  }

  return (
    <aside className="w-[280px] flex-shrink-0 border-r overflow-y-auto" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      {/* Section label */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
          Scene Understanding
        </h2>
      </div>

      {/* Rosbag frame with YOLO overlay */}
      <div className="px-4 pt-3">
        <div className="relative rounded overflow-hidden" style={{ background: '#000', aspectRatio: '16/10' }}>
          {/* Placeholder frame */}
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #111827, #1A2332)' }}>
            <span className="text-3xl opacity-20">📷</span>
          </div>
          <DetectionCanvas
            detections={clip.detections}
            width={252}
            height={158}
          />
          {/* Frame label */}
          <div className="absolute bottom-1 left-1 text-[9px] font-mono px-1 rounded" style={{ background: 'rgba(0,0,0,0.7)', color: 'var(--text-dim)' }}>
            rosbag_frame_{clip.id.split('-')[1]}
          </div>
        </div>
      </div>

      {/* Detection list */}
      <div className="px-4 pt-3">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
          Detections ({clip.detections.length})
        </h3>
        <div className="flex flex-col gap-1">
          {clip.detections.map((det, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-sm" style={{ background: det.color }} />
              <span style={{ color: 'var(--text-primary)' }}>{det.label}</span>
              <span className="font-mono ml-auto" style={{ color: 'var(--text-muted)' }}>
                {(det.confidence * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 my-3 h-px" style={{ background: 'var(--border)' }} />

      {/* Scene description */}
      <div className="px-4 pb-3">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
          Scene Analysis
        </h3>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          <TypewriterScene text={clip.sceneDescription} />
        </p>
      </div>

      {/* Divider */}
      <div className="mx-4 my-1 h-px" style={{ background: 'var(--border)' }} />

      {/* Generated prompt */}
      <div className="px-4 py-3">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
          Seedance Prompt
        </h3>
        <div className="rounded p-2 text-xs font-mono leading-relaxed" style={{ background: 'var(--bg)', color: 'var(--accent)' }}>
          "{clip.description}"
        </div>
      </div>
    </aside>
  );
}
