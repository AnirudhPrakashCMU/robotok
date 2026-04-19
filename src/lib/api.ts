const API_BASE = '';

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}

export async function generateClip(prompt: string): Promise<{ videoUrl?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (res.status === 429) return { error: 'Generation in progress' };
    return await res.json();
  } catch {
    return { error: 'Proxy unreachable' };
  }
}

export async function understandScene(image_base64: string, detections: object[]): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/api/understand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64, detections }),
    });
    const data = await res.json();
    return data.description;
  } catch {
    return 'Scene analysis unavailable';
  }
}

export interface SceneAnalysis {
  object_behaviors: { label: string; behavior: string; risk: string }[];
  scene_understanding: string;
  seedance_prompt: string;
  error?: string;
}

export async function analyzeScene(
  image_base64: string,
  detections: object[],
  scenario: string,
  scene_description: string
): Promise<SceneAnalysis> {
  try {
    const res = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64, detections, scenario, scene_description }),
    });
    return await res.json();
  } catch {
    return {
      object_behaviors: [],
      scene_understanding: 'Analysis unavailable',
      seedance_prompt: '',
      error: 'Proxy unreachable',
    };
  }
}

// Extract a frame from a video element as base64 JPEG
export function captureVideoFrame(video: HTMLVideoElement): string | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    return dataUrl.split(',')[1]; // strip data:image/jpeg;base64, prefix
  } catch {
    return null;
  }
}
