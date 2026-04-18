import type { GenerationState } from '../lib/types';

interface HeaderProps {
  generationState: GenerationState;
  onGenerate: () => void;
}

export function Header({ generationState, onGenerate }: HeaderProps) {
  const isGenerating = generationState.status === 'generating';
  const isOffline = generationState.status === 'offline';

  return (
    <header className="h-12 flex items-center justify-between px-5 border-b" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          RoboTok
        </h1>
        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
          Training Data on Demand
        </span>
      </div>

      <button
        onClick={onGenerate}
        disabled={isGenerating || isOffline}
        className={`h-9 px-4 rounded text-sm font-medium flex items-center gap-2 transition-all ${
          isGenerating
            ? 'opacity-70 cursor-wait'
            : isOffline
            ? 'opacity-40 cursor-not-allowed'
            : 'btn-pulse hover:brightness-110 cursor-pointer'
        }`}
        style={{
          background: isOffline ? 'var(--border-active)' : 'var(--accent)',
          color: 'white',
        }}
        title={isOffline ? 'Live generation offline' : undefined}
      >
        {isGenerating && (
          <span className="w-1.5 h-1.5 rounded-full live-pulse" style={{ background: 'var(--live)' }} />
        )}
        {isGenerating ? 'Generating...' : 'Generate New'}
      </button>
    </header>
  );
}
