import { useState } from 'react';
import { motion } from 'framer-motion';
import type { RankedClip, GenerationState } from '../lib/types';
import { ScoreOverlay } from './ScoreOverlay';

interface VideoCardProps {
  clip: RankedClip;
  isActive: boolean;
  generationState?: GenerationState;
  onFeedback: (clipId: string, feedback: 'use' | 'skip') => void;
  isScoreAnimating?: boolean;
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

export function VideoCard({ clip, isActive, generationState, onFeedback, isScoreAnimating }: VideoCardProps) {
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
            className="w-full h-full object-contain"
            src={clip.videoUrl}
            autoPlay={isActive}
            loop
            muted
            playsInline
          />
        ) : (
          // Placeholder (no video yet, show scenario visualization)
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8" style={{ background: 'linear-gradient(180deg, #0A0E17 0%, #111827 50%, #0A0E17 100%)' }}>
            <div className="text-6xl mb-4 opacity-30">
              {clip.category === 'night_driving' ? '🌙' :
               clip.category === 'rain_weather' ? '🌧️' :
               clip.category === 'pedestrians' ? '🚶' :
               clip.category === 'cyclists' ? '🚴' :
               clip.category === 'construction' ? '🚧' : '🛣️'}
            </div>
            <p className="text-sm text-center max-w-md" style={{ color: 'var(--text-muted)' }}>
              {clip.description}
            </p>
          </div>
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
