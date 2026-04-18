export type Category =
  | 'night_driving'
  | 'rain_weather'
  | 'pedestrians'
  | 'cyclists'
  | 'construction'
  | 'highway_merge';

export const CATEGORY_LABELS: Record<Category, string> = {
  night_driving: 'Night Driving',
  rain_weather: 'Rain / Weather',
  pedestrians: 'Pedestrians',
  cyclists: 'Cyclists',
  construction: 'Construction',
  highway_merge: 'Highway Merge',
};

export const CATEGORY_COLORS: Record<Category, string> = {
  night_driving: '#3B82F6',
  rain_weather: '#22D3EE',
  pedestrians: '#A78BFA',
  cyclists: '#F472B6',
  construction: '#FBBF24',
  highway_merge: '#34D399',
};

export interface Detection {
  label: string;
  confidence: number;
  bbox: [number, number, number, number]; // x, y, w, h (normalized 0-1)
  color: string;
}

export interface Clip {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  scenario: string;
  description: string;
  category: Category;
  tags: string[];
  isLive?: boolean;
  prompt?: string;
  detections: Detection[];
  sceneDescription: string;
  rosbagFrame?: string;
}

export interface ScoreBreakdown {
  relevance: number;
  novelty: number;
  trainingGap: number;
  diversity: number;
  total: number;
}

export interface RankedClip extends Clip {
  score: ScoreBreakdown;
  whyRecommended: string;
}

export interface AlgoState {
  shownClipIds: string[];
  categoryShownCounts: Record<Category, number>;
  totalShown: number;
  feedbackWeights: Record<string, number>; // tag -> weight modifier
  taskContext: string[]; // current robot task tags
  trainingProgress: Record<Category, number>; // 0-100
  overallProgress: number;
}

export interface GenerationState {
  status: 'idle' | 'generating' | 'generated' | 'timeout' | 'offline';
  prompt?: string;
  progress: number; // 0-100
  startedAt?: number;
}

export interface ProxyHealth {
  status: 'healthy' | 'unreachable' | 'recovered';
  lastCheck?: number;
}
