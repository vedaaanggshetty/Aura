import type { EmotionState } from './emotionInferenceService';
import type { AuraEmotionFromCnn } from './cnnEmotionService';

export type VisionFusionSnapshot = {
  timestamp: number;
  rule: EmotionState | null;
  fused: {
    final: AuraEmotionFromCnn;
    dominant: keyof AuraEmotionFromCnn;
    confidence: number;
    disagreement: boolean;
    ruleExplanation: string;
    cnnSummary: string;
  } | null;
};

type Subscriber = (snapshot: VisionFusionSnapshot) => void;

class VisionEmotionStore {
  private snapshot: VisionFusionSnapshot = {
    timestamp: Date.now(),
    rule: null,
    fused: null,
  };

  private subscribers = new Set<Subscriber>();

  getSnapshot(): VisionFusionSnapshot {
    return this.snapshot;
  }

  setSnapshot(next: VisionFusionSnapshot): void {
    this.snapshot = next;
    this.subscribers.forEach((fn) => fn(this.snapshot));
  }

  subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn);
    return () => {
      this.subscribers.delete(fn);
    };
  }
}

export const visionEmotionStore = new VisionEmotionStore();
