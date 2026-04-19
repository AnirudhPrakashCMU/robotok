import { useState, useEffect, useRef } from 'react';
import type { RankedClip, Detection } from '../lib/types';
import type { SceneAnalysis } from '../lib/api';

interface ScenePipelineProps {
  clip: RankedClip | null;
  frameDataUrl?: string | null;
  analysis?: SceneAnalysis | null;
  isAnalyzing?: boolean;
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

      setTimeout(() => {
        ctx.strokeStyle = det.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(px, py, pw, ph);

        const label = `${det.label} ${(det.confidence * 100).toFixed(0)}%`;
        ctx.font = '10px "JetBrains Mono", monospace';
        const metrics = ctx.measureText(label);
        ctx.fillStyle = det.color;
        ctx.fillRect(px, py - 14, metrics.width + 6, 14);

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

const RISK_COLORS: Record<string, string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#22C55E',
};

export function ScenePipeline({ clip, frameDataUrl, analysis, isAnalyzing }: ScenePipelineProps) {
  if (!clip) {
    return (
      <aside className="w-[280px] flex-shrink-0 border-r p-4 flex items-center justify-center" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>Waiting for clip...</span>
      </aside>
    );
  }

  const sceneText = analysis?.scene_understanding || clip.sceneDescription;
  const seedancePrompt = analysis?.seedance_prompt || clip.description;
  const behaviors = analysis?.object_behaviors || [];

  return (
    <aside className="w-[280px] flex-shrink-0 border-r overflow-y-auto" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      {/* Section label */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
          Scene Understanding
        </h2>
        {isAnalyzing && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
            <span className="text-[10px]" style={{ color: 'var(--accent)' }}>Analyzing with Claude...</span>
          </div>
        )}
      </div>

      {/* Video frame with YOLO overlay */}
      <div className="px-4 pt-3">
        <div className="relative rounded overflow-hidden" style={{ background: '#000', aspectRatio: '16/10' }}>
          {frameDataUrl ? (
            <img
              src={`data:image/jpeg;base64,${frameDataUrl}`}
              className="absolute inset-0 w-full h-full object-cover"
              alt="Captured frame"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #111827, #1A2332)' }}>
              <div className="text-center">
                <span className="text-2xl opacity-30">🎥</span>
                <p className="text-[9px] mt-1 opacity-40" style={{ color: 'var(--text-dim)' }}>
                  {clip.videoUrl ? 'Capturing frame...' : 'No video source'}
                </p>
              </div>
            </div>
          )}
          <DetectionCanvas
            detections={clip.detections}
            width={252}
            height={158}
          />
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

      {/* Object behaviors from Claude */}
      {behaviors.length > 0 && (
        <>
          <div className="mx-4 my-3 h-px" style={{ background: 'var(--border)' }} />
          <div className="px-4">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
              Behavior Analysis
            </h3>
            <div className="flex flex-col gap-2">
              {behaviors.map((b, i) => (
                <div key={i} className="text-xs rounded p-2" style={{ background: 'var(--bg)' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{b.label}</span>
                    <span className="text-[9px] px-1 rounded" style={{
                      background: `${RISK_COLORS[b.risk] || '#64748B'}20`,
                      color: RISK_COLORS[b.risk] || '#64748B'
                    }}>
                      {b.risk}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-muted)' }}>{b.behavior}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Divider */}
      <div className="mx-4 my-3 h-px" style={{ background: 'var(--border)' }} />

      {/* Scene description */}
      <div className="px-4 pb-3">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
          Scene Analysis
        </h3>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          <TypewriterScene text={sceneText} />
        </p>
      </div>

      {/* Divider */}
      <div className="mx-4 my-1 h-px" style={{ background: 'var(--border)' }} />

      {/* Seedance prompt - Claude-composed */}
      <div className="px-4 py-3">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
          Seedance Prompt
          {analysis?.seedance_prompt && (
            <span className="text-[8px] px-1 rounded" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>
              AI-COMPOSED
            </span>
          )}
        </h3>
        <div className="rounded p-2 text-xs font-mono leading-relaxed" style={{ background: 'var(--bg)', color: 'var(--accent)' }}>
          "{seedancePrompt}"
        </div>
      </div>
    </aside>
  );
}
