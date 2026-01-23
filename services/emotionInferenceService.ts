export interface FacialMetrics {
  eyeFatigue: number; // 0–100
  browTension: number; // 0–100
  mouthOpenness: number; // 0–100
  headMovement: number; // 0–100
}

export interface EmotionState {
  calm: number;
  anxious: number;
  stressed: number;
  neutral: number;
  explanation: string;
}

export interface EmotionInferenceConfig {
  thresholds: {
    low: number;
    medium: number;
    high: number;
  };
  weights: {
    stressed: {
      browTension: number;
      eyeFatigue: number;
      headMovement: number;
      mouthOpenness: number;
    };
    anxious: {
      headMovement: number;
      mouthOpenness: number;
      eyeFatigue: number;
      browTension: number;
    };
    calm: {
      browTension: number;
      headMovement: number;
      mouthOpenness: number;
      eyeFatigue: number;
    };
    neutral: {
      midBandCenter: number;
      midBandWidth: number;
    };
  };
  mode: 'distribution' | 'independent';
}

export class EmotionInferenceService {
  private config: EmotionInferenceConfig;

  constructor(config?: Partial<EmotionInferenceConfig>) {
    const defaults: EmotionInferenceConfig = {
      thresholds: {
        low: 30,
        medium: 55,
        high: 70,
      },
      weights: {
        stressed: {
          browTension: 0.55,
          eyeFatigue: 0.25,
          headMovement: 0.1,
          mouthOpenness: 0.1,
        },
        anxious: {
          headMovement: 0.35,
          mouthOpenness: 0.3,
          eyeFatigue: 0.2,
          browTension: 0.15,
        },
        calm: {
          browTension: 0.55,
          headMovement: 0.2,
          mouthOpenness: 0.15,
          eyeFatigue: 0.1,
        },
        neutral: {
          midBandCenter: 50,
          midBandWidth: 20,
        },
      },
      mode: 'distribution',
    };

    this.config = {
      mode: config?.mode ?? defaults.mode,
      thresholds: {
        low: config?.thresholds?.low ?? defaults.thresholds.low,
        medium: config?.thresholds?.medium ?? defaults.thresholds.medium,
        high: config?.thresholds?.high ?? defaults.thresholds.high,
      },
      weights: {
        stressed: {
          browTension: config?.weights?.stressed?.browTension ?? defaults.weights.stressed.browTension,
          eyeFatigue: config?.weights?.stressed?.eyeFatigue ?? defaults.weights.stressed.eyeFatigue,
          headMovement: config?.weights?.stressed?.headMovement ?? defaults.weights.stressed.headMovement,
          mouthOpenness: config?.weights?.stressed?.mouthOpenness ?? defaults.weights.stressed.mouthOpenness,
        },
        anxious: {
          headMovement: config?.weights?.anxious?.headMovement ?? defaults.weights.anxious.headMovement,
          mouthOpenness: config?.weights?.anxious?.mouthOpenness ?? defaults.weights.anxious.mouthOpenness,
          eyeFatigue: config?.weights?.anxious?.eyeFatigue ?? defaults.weights.anxious.eyeFatigue,
          browTension: config?.weights?.anxious?.browTension ?? defaults.weights.anxious.browTension,
        },
        calm: {
          browTension: config?.weights?.calm?.browTension ?? defaults.weights.calm.browTension,
          headMovement: config?.weights?.calm?.headMovement ?? defaults.weights.calm.headMovement,
          mouthOpenness: config?.weights?.calm?.mouthOpenness ?? defaults.weights.calm.mouthOpenness,
          eyeFatigue: config?.weights?.calm?.eyeFatigue ?? defaults.weights.calm.eyeFatigue,
        },
        neutral: {
          midBandCenter: config?.weights?.neutral?.midBandCenter ?? defaults.weights.neutral.midBandCenter,
          midBandWidth: config?.weights?.neutral?.midBandWidth ?? defaults.weights.neutral.midBandWidth,
        },
      },
    };
  }

  setConfig(config: Partial<EmotionInferenceConfig>): void {
    this.config = new EmotionInferenceService({ ...this.config, ...config }).config;
  }

  getConfig(): EmotionInferenceConfig {
    return JSON.parse(JSON.stringify(this.config)) as EmotionInferenceConfig;
  }

  infer(metrics: FacialMetrics): EmotionState {
    const m = this.sanitize(metrics);
    const signals = this.computeSignals(m);

    const stressedRaw =
      this.config.weights.stressed.browTension * m.browTension +
      this.config.weights.stressed.eyeFatigue * m.eyeFatigue +
      this.config.weights.stressed.headMovement * m.headMovement +
      this.config.weights.stressed.mouthOpenness * m.mouthOpenness;

    const anxiousRaw =
      this.config.weights.anxious.headMovement * m.headMovement +
      this.config.weights.anxious.mouthOpenness * m.mouthOpenness +
      this.config.weights.anxious.eyeFatigue * m.eyeFatigue +
      this.config.weights.anxious.browTension * m.browTension;

    const calmRaw =
      this.config.weights.calm.browTension * (100 - m.browTension) +
      this.config.weights.calm.headMovement * (100 - m.headMovement) +
      this.config.weights.calm.mouthOpenness * (100 - m.mouthOpenness) +
      this.config.weights.calm.eyeFatigue * (100 - m.eyeFatigue);

    const neutralRaw = this.computeNeutral(m);

    let calm = this.clamp01(calmRaw);
    let anxious = this.clamp01(anxiousRaw);
    let stressed = this.clamp01(stressedRaw);
    let neutral = this.clamp01(neutralRaw);

    if (this.config.mode === 'distribution') {
      const sum = calm + anxious + stressed + neutral;
      if (sum > 0) {
        calm = (calm / sum) * 100;
        anxious = (anxious / sum) * 100;
        stressed = (stressed / sum) * 100;
        neutral = (neutral / sum) * 100;
      }
    }

    calm = this.round2(calm);
    anxious = this.round2(anxious);
    stressed = this.round2(stressed);
    neutral = this.round2(neutral);

    const explanation = this.buildExplanation({ calm, anxious, stressed, neutral }, signals);

    return { calm, anxious, stressed, neutral, explanation };
  }

  private sanitize(m: FacialMetrics): FacialMetrics {
    return {
      eyeFatigue: this.clamp100(m.eyeFatigue),
      browTension: this.clamp100(m.browTension),
      mouthOpenness: this.clamp100(m.mouthOpenness),
      headMovement: this.clamp100(m.headMovement),
    };
  }

  private computeSignals(m: FacialMetrics): string[] {
    const t = this.config.thresholds;
    const signals: string[] = [];

    if (m.browTension >= t.high) signals.push('High brow tension');
    else if (m.browTension >= t.medium) signals.push('Moderate brow tension');
    else if (m.browTension <= t.low) signals.push('Low brow tension');

    if (m.eyeFatigue >= t.high) signals.push('High eye fatigue');
    else if (m.eyeFatigue >= t.medium) signals.push('Elevated eye fatigue');
    else if (m.eyeFatigue <= t.low) signals.push('Low eye fatigue');

    if (m.mouthOpenness >= t.high) signals.push('High mouth openness');
    else if (m.mouthOpenness >= t.medium) signals.push('Elevated mouth openness');
    else if (m.mouthOpenness <= t.low) signals.push('Low mouth openness');

    if (m.headMovement >= t.high) signals.push('High head movement');
    else if (m.headMovement >= t.medium) signals.push('Elevated head movement');
    else if (m.headMovement <= t.low) signals.push('Low head movement');

    return signals;
  }

  private computeNeutral(m: FacialMetrics): number {
    const { midBandCenter: c, midBandWidth: w } = this.config.weights.neutral;
    const scoreFor = (x: number) => {
      const d = Math.abs(x - c);
      const half = w / 2;
      if (d >= half) return 0;
      return (1 - d / half) * 100;
    };

    return 0.25 * (scoreFor(m.eyeFatigue) + scoreFor(m.browTension) + scoreFor(m.mouthOpenness) + scoreFor(m.headMovement));
  }

  private buildExplanation(
    scores: Omit<EmotionState, 'explanation'>,
    signals: string[]
  ): string {
    const ordered = [
      { name: 'calm', v: scores.calm },
      { name: 'anxious', v: scores.anxious },
      { name: 'stressed', v: scores.stressed },
      { name: 'neutral', v: scores.neutral },
    ].sort((a, b) => b.v - a.v);

    const primary = ordered[0];

    const pickedSignals = signals.slice(0, 2);

    if (pickedSignals.length === 0) {
      return 'No strong indicators detected; metrics remain within a mid-range band.';
    }

    if (primary.name === 'stressed') {
      return `${pickedSignals.join(' + ')} suggests increased strain; stress score is dominant.`;
    }

    if (primary.name === 'anxious') {
      return `${pickedSignals.join(' + ')} suggests restlessness/arousal; anxiety score is dominant.`;
    }

    if (primary.name === 'calm') {
      return `${pickedSignals.join(' + ')} suggests settled facial activity; calm score is dominant.`;
    }

    return `${pickedSignals.join(' + ')} with no strong extremes; neutral score is dominant.`;
  }

  private clamp100(n: number): number {
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, n));
  }

  private clamp01(n: number): number {
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, n));
  }

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }
}

export const emotionInferenceService = new EmotionInferenceService();
