import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RankedClip, GenerationState } from '../lib/types';
import { VideoCard } from './VideoCard';

interface FeedProps {
  clips: RankedClip[];
  generationState: GenerationState;
  onFeedback: (clipId: string, feedback: 'use' | 'skip') => void;
  onClipChange?: (index: number) => void;
}

export function Feed({ clips, generationState, onFeedback, onClipChange }: FeedProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isScoreAnimating, setIsScoreAnimating] = useState(false);

  const currentClip = clips[currentIndex];

  const goNext = useCallback(() => {
    if (currentIndex < clips.length - 1) {
      setDirection(1);
      setCurrentIndex(i => i + 1);
    }
  }, [currentIndex, clips.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(i => i - 1);
    }
  }, [currentIndex]);

  const handleFeedback = useCallback((clipId: string, feedback: 'use' | 'skip') => {
    setIsScoreAnimating(true);
    onFeedback(clipId, feedback);
    // After animation, advance to next clip
    setTimeout(() => {
      setIsScoreAnimating(false);
      goNext();
    }, 800);
  }, [onFeedback, goNext]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'j') goNext();
      if (e.key === 'ArrowUp' || e.key === 'k') goPrev();
      if (e.key === ' ') { e.preventDefault(); handleFeedback(currentClip?.id, 'use'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev, handleFeedback, currentClip]);

  // Notify parent of clip change
  useEffect(() => {
    onClipChange?.(currentIndex);
  }, [currentIndex, onClipChange]);

  // Auto-advance timer (6s)
  useEffect(() => {
    if (isScoreAnimating) return;
    const timer = setTimeout(goNext, 6000);
    return () => clearTimeout(timer);
  }, [currentIndex, isScoreAnimating, goNext]);

  // Touch/scroll handling
  const [touchStart, setTouchStart] = useState(0);

  if (!currentClip) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-dim)' }}>
        No clips available
      </div>
    );
  }

  return (
    <div
      className="flex-1 relative overflow-hidden"
      onTouchStart={e => setTouchStart(e.touches[0].clientY)}
      onTouchEnd={e => {
        const diff = touchStart - e.changedTouches[0].clientY;
        if (diff > 50) goNext();
        if (diff < -50) goPrev();
      }}
      onWheel={e => {
        if (e.deltaY > 30) goNext();
        if (e.deltaY < -30) goPrev();
      }}
    >
      <AnimatePresence mode="popLayout" initial={false} custom={direction}>
        <motion.div
          key={currentClip.id}
          custom={direction}
          initial={{ y: direction >= 0 ? '100%' : '-100%', opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: direction >= 0 ? '-100%' : '100%', opacity: 0.5 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="absolute inset-0"
        >
          <VideoCard
            clip={currentClip}
            isActive
            generationState={currentClip.isLive ? generationState : undefined}
            onFeedback={handleFeedback}
            isScoreAnimating={isScoreAnimating}
          />
        </motion.div>
      </AnimatePresence>

      {/* Clip counter */}
      <div className="absolute top-4 right-4 z-10 text-xs font-mono px-2 py-1 rounded" style={{ background: 'rgba(10, 14, 23, 0.7)', color: 'var(--text-dim)' }}>
        {currentIndex + 1}/{clips.length}
      </div>
    </div>
  );
}
