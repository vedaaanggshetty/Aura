type FaceApiGlobal = {
  nets: {
    tinyFaceDetector: { loadFromUri: (uri: string) => Promise<void> };
    faceExpressionNet: { loadFromUri: (uri: string) => Promise<void> };
  };
  TinyFaceDetectorOptions: new (options?: { inputSize?: number; scoreThreshold?: number }) => unknown;
  detectSingleFace: (input: HTMLVideoElement, options?: unknown) => {
    withFaceExpressions: () => Promise<{
      expressions: Record<string, number>;
    } | null>;
  };
};

export type CnnExpressions = {
  happy: number;
  sad: number;
  angry: number;
  fearful: number;
  disgusted: number;
  surprised: number;
  neutral: number;
};

export type AuraEmotionFromCnn = {
  calm: number;
  anxious: number;
  stressed: number;
  neutral: number;
};

export interface CnnEmotionResult {
  expressions: CnnExpressions;
  aura: AuraEmotionFromCnn;
  summary: string;
  timestamp: number;
}

export interface CnnEmotionConfig {
  faceApiScriptUrl: string;
  modelBaseUrl: string;
  inputSize: number;
  scoreThreshold: number;
}

const DEFAULT_CONFIG: CnnEmotionConfig = {
  faceApiScriptUrl: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js',
  modelBaseUrl: 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights',
  inputSize: 224,
  scoreThreshold: 0.5,
};

class CnnEmotionService {
  private config: CnnEmotionConfig = DEFAULT_CONFIG;
  private faceApiReady: Promise<void> | null = null;
  private modelsReady: Promise<void> | null = null;

  setConfig(config: Partial<CnnEmotionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async ensureReady(): Promise<void> {
    if (!this.faceApiReady) {
      this.faceApiReady = this.loadFaceApiScript();
    }
    await this.faceApiReady;

    if (!this.modelsReady) {
      this.modelsReady = this.loadModels();
    }
    await this.modelsReady;
  }

  async detect(video: HTMLVideoElement): Promise<CnnEmotionResult | null> {
    try {
      await this.ensureReady();
    } catch {
      return null;
    }

    const faceapi = (window as unknown as { faceapi?: FaceApiGlobal }).faceapi;
    if (!faceapi) return null;

    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: this.config.inputSize,
      scoreThreshold: this.config.scoreThreshold,
    });

    const res = await faceapi.detectSingleFace(video, options).withFaceExpressions();
    if (!res) return null;

    const e = res.expressions;

    const expressions: CnnExpressions = {
      happy: this.clamp01(e.happy ?? 0),
      sad: this.clamp01(e.sad ?? 0),
      angry: this.clamp01(e.angry ?? 0),
      fearful: this.clamp01(e.fearful ?? 0),
      disgusted: this.clamp01(e.disgusted ?? 0),
      surprised: this.clamp01(e.surprised ?? 0),
      neutral: this.clamp01(e.neutral ?? 0),
    };

    const aura = this.mapToAura(expressions);
    const summary = this.buildSummary(expressions);

    return {
      expressions,
      aura,
      summary,
      timestamp: Date.now(),
    };
  }

  private async loadFaceApiScript(): Promise<void> {
    const w = window as unknown as { faceapi?: FaceApiGlobal };
    if (w.faceapi) return;

    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector(`script[data-faceapi="true"]`) as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Failed to load face-api.js')));
        return;
      }

      const s = document.createElement('script');
      s.src = this.config.faceApiScriptUrl;
      s.async = true;
      s.defer = true;
      s.dataset.faceapi = 'true';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load face-api.js'));
      document.head.appendChild(s);
    });
  }

  private async loadModels(): Promise<void> {
    const faceapi = (window as unknown as { faceapi?: FaceApiGlobal }).faceapi;
    if (!faceapi) return;

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(this.config.modelBaseUrl),
      faceapi.nets.faceExpressionNet.loadFromUri(this.config.modelBaseUrl),
    ]);
  }

  private mapToAura(expressions: CnnExpressions): AuraEmotionFromCnn {
    const calm = expressions.happy + expressions.neutral;
    const anxious = expressions.fearful + expressions.surprised;
    const stressed = expressions.angry + expressions.disgusted;
    const neutral = expressions.neutral;

    const sum = calm + anxious + stressed + neutral;
    if (sum <= 0) {
      return { calm: 25, anxious: 25, stressed: 25, neutral: 25 };
    }

    return {
      calm: (calm / sum) * 100,
      anxious: (anxious / sum) * 100,
      stressed: (stressed / sum) * 100,
      neutral: (neutral / sum) * 100,
    };
  }

  private buildSummary(expressions: CnnExpressions): string {
    const entries = Object.entries(expressions)
      .map(([k, v]) => ({ k, v }))
      .sort((a, b) => b.v - a.v);

    const top = entries[0];
    const second = entries[1];

    const pct = (x: number) => `${Math.round(x * 100)}%`;
    if (!top || top.v <= 0) return 'CNN: no strong expression detected.';

    if (second && second.v > 0.15) {
      return `CNN: ${top.k} (${pct(top.v)}), ${second.k} (${pct(second.v)}).`;
    }

    return `CNN: ${top.k} (${pct(top.v)}).`;
  }

  private clamp01(n: number): number {
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(1, n));
  }
}

export const cnnEmotionService = new CnnEmotionService();
export type { CnnEmotionService };
