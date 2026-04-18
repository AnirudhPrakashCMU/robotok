import { motion } from 'framer-motion';
import type { AlgoState } from '../lib/types';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../lib/types';

interface TrainingDashboardProps {
  algoState: AlgoState;
}

function ProgressCircle({ value }: { value: number }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative w-28 h-28 mx-auto mb-4">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--border)" strokeWidth="4" />
        <motion.circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {Math.round(value)}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>% trained</span>
      </div>
    </div>
  );
}

function CategoryBar({ category, value, color }: { category: string; value: number; color: string }) {
  const statusColor = value > 70 ? 'var(--success)' : value > 40 ? 'var(--warning)' : color;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] w-24 truncate" style={{ color: 'var(--text-muted)' }}>
        {category}
      </span>
      <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--border)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: statusColor }}
          initial={{ width: '0%' }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
      <span className="font-mono text-[11px] w-8 text-right" style={{ color: 'var(--text-primary)' }}>
        {Math.round(value)}%
      </span>
    </div>
  );
}

export function TrainingDashboard({ algoState }: TrainingDashboardProps) {
  const categories = Object.entries(algoState.trainingProgress) as [keyof typeof CATEGORY_LABELS, number][];

  return (
    <aside className="w-[300px] flex-shrink-0 border-l overflow-y-auto" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      {/* Section label */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
          Training Confidence
        </h2>
      </div>

      {/* Progress circle */}
      <div className="px-4 pt-4">
        <ProgressCircle value={algoState.overallProgress} />
      </div>

      {/* Category bars */}
      <div className="px-4 flex flex-col gap-3">
        {categories.map(([cat, value]) => (
          <CategoryBar
            key={cat}
            category={CATEGORY_LABELS[cat]}
            value={value}
            color={CATEGORY_COLORS[cat]}
          />
        ))}
      </div>

      {/* Divider */}
      <div className="mx-4 my-4 h-px" style={{ background: 'var(--border)' }} />

      {/* Algo stats */}
      <div className="px-4 pb-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-dim)' }}>
          Algorithm Stats
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <AlgoStat label="Clips Shown" value={algoState.totalShown.toString()} />
          <AlgoStat label="Categories Hit" value={`${Object.values(algoState.categoryShownCounts).filter(v => v > 0).length}/6`} />
          <AlgoStat label="Feedback Signals" value={Object.keys(algoState.feedbackWeights).length.toString()} />
          <AlgoStat label="Task Context" value={algoState.taskContext.length.toString()} />
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 my-1 h-px" style={{ background: 'var(--border)' }} />

      {/* Active task context */}
      <div className="px-4 py-3">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
          Robot Task Context
        </h3>
        <div className="flex flex-wrap gap-1">
          {algoState.taskContext.map(tag => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: 'var(--bg)', color: 'var(--accent)', border: '1px solid var(--border)' }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}

function AlgoStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        {value}
      </div>
      <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{label}</div>
    </div>
  );
}
