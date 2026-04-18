import { useState, useCallback, useMemo } from 'react';
import type { AlgoState, GenerationState } from './lib/types';
import { rankClips, updateAlgoState, createInitialState } from './lib/recommendation';
import { DEMO_CLIPS } from './data/clips';
import { Header } from './components/Header';
import { Feed } from './components/Feed';
import { ScenePipeline } from './components/ScenePipeline';
import { TrainingDashboard } from './components/TrainingDashboard';

function App() {
  const [algoState, setAlgoState] = useState<AlgoState>(createInitialState);
  const [generationState, setGenerationState] = useState<GenerationState>({
    status: 'idle',
    progress: 0,
  });

  // Rank clips based on current algo state
  const rankedClips = useMemo(() => rankClips(DEMO_CLIPS, algoState), [algoState]);

  // Current clip for scene pipeline (first in ranked list that's being shown)
  const [activeClipIndex, setActiveClipIndex] = useState(0);
  const activeClip = rankedClips[activeClipIndex] || rankedClips[0] || null;

  const handleFeedback = useCallback((clipId: string, feedback: 'use' | 'skip') => {
    const clip = DEMO_CLIPS.find(c => c.id === clipId);
    if (!clip) return;
    setAlgoState(prev => updateAlgoState(prev, clip, feedback));
    setActiveClipIndex(i => Math.min(i + 1, rankedClips.length - 1));
  }, [rankedClips.length]);

  const handleGenerate = useCallback(() => {
    if (generationState.status === 'generating') return;

    const prompt = 'Autonomous vehicle navigating a flooded urban intersection at dusk, emergency vehicles with flashing lights, pedestrians on elevated sidewalks, cinematic drone view, photorealistic';

    setGenerationState({
      status: 'generating',
      prompt,
      progress: 0,
      startedAt: Date.now(),
    });

    // Simulate progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 4;
      if (progress >= 80) {
        clearInterval(interval);
        // Simulate completion after "generation"
        setTimeout(() => {
          setGenerationState({
            status: 'generated',
            prompt,
            progress: 100,
          });
          // Reset after showing for a bit
          setTimeout(() => {
            setGenerationState({ status: 'idle', progress: 0 });
          }, 5000);
        }, 3000);
      }
      setGenerationState(prev => ({ ...prev, progress }));
    }, 500);
  }, [generationState.status]);

  return (
    <>
      <Header generationState={generationState} onGenerate={handleGenerate} />
      <main className="flex flex-1 overflow-hidden">
        <ScenePipeline clip={activeClip} />
        <Feed
          clips={rankedClips}
          generationState={generationState}
          onFeedback={handleFeedback}
        />
        <TrainingDashboard algoState={algoState} />
      </main>
      {/* Health indicator */}
      <div
        className="fixed bottom-3 left-3 w-2 h-2 rounded-full"
        style={{ background: 'var(--success)', opacity: 0.6 }}
        title="EC2 Proxy: Healthy"
      />
    </>
  );
}

export default App;
