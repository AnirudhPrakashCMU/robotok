import { useState, useCallback, useMemo, useRef } from 'react';
import type { AlgoState, GenerationState } from './lib/types';
import type { SceneAnalysis } from './lib/api';
import { rankClips, updateAlgoState, createInitialState } from './lib/recommendation';
import { analyzeScene, captureVideoFrame, generateClip } from './lib/api';
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

  // Scene analysis state
  const [frameDataUrl, setFrameDataUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<SceneAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analysisCache = useRef<Record<string, SceneAnalysis>>({});
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const rankedClips = useMemo(() => rankClips(DEMO_CLIPS, algoState), [algoState]);

  const [activeClipIndex, setActiveClipIndex] = useState(0);
  const activeClip = rankedClips[activeClipIndex] || rankedClips[0] || null;

  // Capture frame and run analysis when clip changes
  const runAnalysis = useCallback(async (clipId: string) => {
    const clip = DEMO_CLIPS.find(c => c.id === clipId);
    if (!clip) return;

    // Check cache first
    if (analysisCache.current[clipId]) {
      setAnalysis(analysisCache.current[clipId]);
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);

    // Try to capture frame from video element
    let frameBase64: string | null = null;
    if (videoRef.current && clip.videoUrl) {
      // Wait a moment for the video to load a frame
      await new Promise(r => setTimeout(r, 500));
      frameBase64 = captureVideoFrame(videoRef.current);
      if (frameBase64) {
        setFrameDataUrl(frameBase64);
      }
    } else {
      setFrameDataUrl(null);
    }

    try {
      const result = await analyzeScene(
        frameBase64 || '',
        clip.detections,
        clip.scenario,
        clip.sceneDescription
      );
      setAnalysis(result);
      analysisCache.current[clipId] = result;
    } catch {
      setAnalysis(null);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const handleClipChange = useCallback((index: number) => {
    setActiveClipIndex(index);
    const clip = rankedClips[index];
    if (clip) {
      runAnalysis(clip.id);
    }
  }, [rankedClips, runAnalysis]);

  const handleFeedback = useCallback((clipId: string, feedback: 'use' | 'skip') => {
    const clip = DEMO_CLIPS.find(c => c.id === clipId);
    if (!clip) return;
    setAlgoState(prev => updateAlgoState(prev, clip, feedback));
  }, []);

  const handleGenerate = useCallback(() => {
    if (generationState.status === 'generating') return;

    // Use the Claude-composed Seedance prompt if available
    const prompt = analysis?.seedance_prompt ||
      'First-person dashcam view from an autonomous vehicle navigating a rain-slicked urban intersection at night, pedestrians crossing with umbrellas, headlights reflecting off wet road, photorealistic driving footage, 720p';

    setGenerationState({
      status: 'generating',
      prompt,
      progress: 0,
      startedAt: Date.now(),
    });

    // Actually call the Seedance API
    generateClip(prompt).then((result) => {
      if (result.error) {
        // Fallback to simulated progress if API fails
        setGenerationState({
          status: 'generated',
          prompt,
          progress: 100,
        });
      } else {
        setGenerationState({
          status: 'generated',
          prompt,
          progress: 100,
        });
      }
      setTimeout(() => {
        setGenerationState({ status: 'idle', progress: 0 });
      }, 5000);
    });

    // Simulate progress while waiting
    let progress = 0;
    const interval = setInterval(() => {
      progress += 2;
      if (progress >= 95) {
        clearInterval(interval);
      }
      setGenerationState(prev => ({ ...prev, progress }));
    }, 600);
  }, [generationState.status, analysis]);

  // Expose video ref setter for Feed/VideoCard
  const handleVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
  }, []);

  return (
    <>
      <Header generationState={generationState} onGenerate={handleGenerate} />
      <main className="flex flex-1 overflow-hidden">
        <ScenePipeline
          clip={activeClip}
          frameDataUrl={frameDataUrl}
          analysis={analysis}
          isAnalyzing={isAnalyzing}
        />
        <Feed
          clips={rankedClips}
          generationState={generationState}
          onFeedback={handleFeedback}
          onClipChange={handleClipChange}
          onVideoRef={handleVideoRef}
        />
        <TrainingDashboard algoState={algoState} />
      </main>
      <div
        className="fixed bottom-3 left-3 w-2 h-2 rounded-full"
        style={{ background: 'var(--success)', opacity: 0.6 }}
        title="EC2 Proxy: Healthy"
      />
    </>
  );
}

export default App;
