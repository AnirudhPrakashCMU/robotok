const API_BASE = 'http://34.235.111.61:3002';

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
