import { useState, useEffect, useRef } from 'react';
import type { ScoreBreakdown } from '../lib/types';

interface ScoreOverlayProps {
  score: ScoreBreakdown;
  whyRecommended: string;
  isAnimating?: boolean;
}

const LABELS = [
  { key: 'relevance' as const, label: 'Rel' },
  { key: 'novelty' as const, label: 'Nov' },
  { key: 'trainingGap' as const, label: 'Gap' },
  { key: 'diversity' as const, label: 'Div' },
];

function AnimatedNumber({ value, animating }: { value: number; animating: boolean }) {
  const [display, setDisplay] = useState(value);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (animating) {
      // Slot machine effect: cycle random numbers for 500ms
      let elapsed = 0;
      intervalRef.current = setInterval(() => {
        setDisplay(Math.round(Math.random() * 100) / 100);
        elapsed += 50;
        if (elapsed >= 400) {
          clearInterval(intervalRef.current);
          setDisplay(value);
        }
      }, 50);
      return () => clearInterval(intervalRef.current);
    } else {
      setDisplay(value);
    }
  }, [value, animating]);

  return <span className="font-mono text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{display.toFixed(2)}</span>;
}

export function ScoreOverlay({ score, whyRecommended, isAnimating = false }: ScoreOverlayProps) {
  const totalDisplay = (score.total * 10).toFixed(1);

  return (
    <div
      className="absolute bottom-4 left-4 right-4 rounded-lg p-3"
      style={{
        background: 'rgba(10, 14, 23, 0.85)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex items-start gap-4">
        {/* Total score */}
        <div className="flex flex-col items-center">
          <span
            className="font-mono text-2xl font-bold leading-none"
            style={{ color: 'var(--text-primary)' }}
          >
            {totalDisplay}
          </span>
          <span className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>/10</span>
        </div>

        {/* Mini bars */}
        <div className="flex-1 flex flex-col gap-1.5">
          {LABELS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[10px] w-6 text-right uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {label}
              </span>
              <div className="flex-1 h-[3px] rounded-full" style={{ background: 'var(--border)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${score[key] * 100}%`,
                    background: 'var(--accent)',
                  }}
                />
              </div>
              <AnimatedNumber value={score[key]} animating={isAnimating} />
            </div>
          ))}
        </div>
      </div>

      {/* Why recommended */}
      <p className="text-xs mt-2 leading-snug" style={{ color: 'var(--text-muted)' }}>
        {whyRecommended}
      </p>
    </div>
  );
}
