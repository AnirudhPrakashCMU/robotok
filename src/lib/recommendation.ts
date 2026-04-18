import type { Clip, RankedClip, ScoreBreakdown, AlgoState, Category } from './types';

const WEIGHTS = {
  relevance: 0.35,
  novelty: 0.25,
  trainingGap: 0.30,
  diversity: 0.10,
} as const;

/** Jaccard similarity between two tag sets */
export function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const tag of setA) {
    if (setB.has(tag)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Relevance: tag overlap with robot's current task context, boosted by feedback */
export function computeRelevance(
  clip: Clip,
  taskContext: string[],
  feedbackWeights: Record<string, number>
): number {
  const base = jaccard(clip.tags, taskContext);
  // Apply feedback boosts
  let boost = 0;
  for (const tag of clip.tags) {
    boost += feedbackWeights[tag] || 0;
  }
  return Math.min(1, Math.max(0, base + boost * 0.1));
}

/** Novelty: 1 - max overlap with any previously shown clip */
export function computeNovelty(clip: Clip, shownClips: Clip[]): number {
  if (shownClips.length === 0) return 1;
  let maxOverlap = 0;
  for (const shown of shownClips) {
    const overlap = jaccard(clip.tags, shown.tags);
    if (overlap > maxOverlap) maxOverlap = overlap;
  }
  return 1 - maxOverlap;
}

/** Training gap: how underrepresented is this category? */
export function computeTrainingGap(
  clip: Clip,
  categoryShownCounts: Record<Category, number>,
  totalShown: number
): number {
  if (totalShown === 0) return 1;
  const count = categoryShownCounts[clip.category] || 0;
  return 1 - count / totalShown;
}

/** Diversity: how different is this from the last 3 shown? */
export function computeDiversity(clip: Clip, lastThreeCategories: Category[]): number {
  const matches = lastThreeCategories.filter(c => c === clip.category).length;
  if (matches === 0) return 1.0;
  if (matches === 1) return 0.5;
  return 0.0;
}

/** Compute full score breakdown for a clip */
export function computeScore(clip: Clip, state: AlgoState, allClips: Clip[]): ScoreBreakdown {
  const shownClips = allClips.filter(c => state.shownClipIds.includes(c.id));
  const lastThree = state.shownClipIds.slice(-3).map(id => {
    const c = allClips.find(cl => cl.id === id);
    return c?.category;
  }).filter(Boolean) as Category[];

  const relevance = computeRelevance(clip, state.taskContext, state.feedbackWeights);
  const novelty = computeNovelty(clip, shownClips);
  const trainingGap = computeTrainingGap(clip, state.categoryShownCounts, state.totalShown);
  const diversity = computeDiversity(clip, lastThree);

  const total =
    relevance * WEIGHTS.relevance +
    novelty * WEIGHTS.novelty +
    trainingGap * WEIGHTS.trainingGap +
    diversity * WEIGHTS.diversity;

  return {
    relevance: Math.round(relevance * 100) / 100,
    novelty: Math.round(novelty * 100) / 100,
    trainingGap: Math.round(trainingGap * 100) / 100,
    diversity: Math.round(diversity * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

/** Rank all unshown clips by score */
export function rankClips(clips: Clip[], state: AlgoState): RankedClip[] {
  const unshown = clips.filter(c => !state.shownClipIds.includes(c.id));

  return unshown.map(clip => {
    const score = computeScore(clip, state, clips);
    const topFactor = score.relevance >= score.trainingGap ? 'relevance' : 'training gap';
    const whyRecommended =
      topFactor === 'relevance'
        ? `High relevance to current task (${score.relevance})`
        : `Fills training gap in ${clip.category.replace('_', ' ')} (${score.trainingGap})`;

    return { ...clip, score, whyRecommended };
  }).sort((a, b) => b.score.total - a.score.total);
}

/** Update algo state after a clip is consumed */
export function updateAlgoState(
  state: AlgoState,
  clip: Clip,
  feedback: 'use' | 'skip'
): AlgoState {
  const newState = {
    ...state,
    shownClipIds: [...state.shownClipIds, clip.id],
    totalShown: state.totalShown + 1,
    categoryShownCounts: {
      ...state.categoryShownCounts,
      [clip.category]: (state.categoryShownCounts[clip.category] || 0) + 1,
    },
    feedbackWeights: { ...state.feedbackWeights },
    trainingProgress: { ...state.trainingProgress },
    overallProgress: state.overallProgress,
  };

  if (feedback === 'use') {
    // Boost similar tags
    for (const tag of clip.tags) {
      newState.feedbackWeights[tag] = (newState.feedbackWeights[tag] || 0) + 1;
    }
    // Increase training progress for this category
    const current = newState.trainingProgress[clip.category] || 0;
    newState.trainingProgress[clip.category] = Math.min(100, current + 8 + Math.random() * 7);
  } else {
    // Decrease weight for these tags
    for (const tag of clip.tags) {
      newState.feedbackWeights[tag] = (newState.feedbackWeights[tag] || 0) - 0.5;
    }
    // Smaller progress bump even for skipped
    const current = newState.trainingProgress[clip.category] || 0;
    newState.trainingProgress[clip.category] = Math.min(100, current + 2);
  }

  // Recalculate overall progress
  const categories = Object.values(newState.trainingProgress);
  newState.overallProgress = categories.length > 0
    ? Math.round(categories.reduce((a, b) => a + b, 0) / 6)
    : 0;

  return newState;
}

/** Create initial algo state */
export function createInitialState(): AlgoState {
  return {
    shownClipIds: [],
    categoryShownCounts: {
      night_driving: 0,
      rain_weather: 0,
      pedestrians: 0,
      cyclists: 0,
      construction: 0,
      highway_merge: 0,
    },
    totalShown: 0,
    feedbackWeights: {},
    taskContext: ['urban', 'night', 'rain', 'pedestrian', 'safety', 'autonomous'],
    trainingProgress: {
      night_driving: 12,
      rain_weather: 8,
      pedestrians: 15,
      cyclists: 5,
      construction: 3,
      highway_merge: 10,
    },
    overallProgress: 9,
  };
}
