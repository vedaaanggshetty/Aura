import React, { useRef, useEffect, useState } from 'react';
import { Camera, AlertCircle, Play, Pause, Eye } from 'lucide-react';
import { Button, GlassCard } from './ui/LayoutComponents';
import { FaceMesh, Results } from '@mediapipe/face_mesh';
import { Camera as MediaPipeCamera } from '@mediapipe/camera_utils';
import { emotionInferenceService, EmotionState, FacialMetrics } from '../services/emotionInferenceService';
import { cnnEmotionService, AuraEmotionFromCnn, CnnEmotionResult } from '../services/cnnEmotionService';
import { visionEmotionStore } from '../services/visionEmotionStore';

export const VisionCapture: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const mpCameraRef = useRef<MediaPipeCamera | null>(null);
  const lastNoseRef = useRef<{ x: number; y: number } | null>(null);
  const debugFrameRef = useRef(0);
  const lastCnnAtRef = useRef<number>(0);
  const baselineStartAtRef = useRef<number | null>(null);
  const baselineCountRef = useRef<number>(0);
  const baselineCnnSumRef = useRef<AuraEmotionFromCnn>({ calm: 0, anxious: 0, stressed: 0, neutral: 0 });
  const baselineMetricsSumRef = useRef<FacialMetrics>({ eyeFatigue: 0, browTension: 0, mouthOpenness: 0, headMovement: 0 });
  const baselineCnnMeanRef = useRef<AuraEmotionFromCnn | null>(null);
  const baselineMetricsMeanRef = useRef<FacialMetrics | null>(null);
  const lastCnnResultRef = useRef<CnnEmotionResult | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [logs, setLogs] = useState<string[]>(['System initialized.']);
  const [emotionState, setEmotionState] = useState<EmotionState | null>(null);
  const [fusionState, setFusionState] = useState<{
    final: AuraEmotionFromCnn;
    dominant: keyof AuraEmotionFromCnn;
    confidence: number;
    disagreement: boolean;
    ruleExplanation: string;
    cnnSummary: string;
  } | null>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-4), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const getDominantAura = (e: AuraEmotionFromCnn) => {
    const entries = [
      ['calm', e.calm],
      ['anxious', e.anxious],
      ['stressed', e.stressed],
      ['neutral', e.neutral],
    ] as const;
    return entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  };

  const clamp100 = (n: number) => Math.max(0, Math.min(100, n));

  const normalizeAura = (e: AuraEmotionFromCnn): AuraEmotionFromCnn => {
    const sum = e.calm + e.anxious + e.stressed + e.neutral;
    if (sum <= 0) return { calm: 25, anxious: 25, stressed: 25, neutral: 25 };
    return {
      calm: (e.calm / sum) * 100,
      anxious: (e.anxious / sum) * 100,
      stressed: (e.stressed / sum) * 100,
      neutral: (e.neutral / sum) * 100,
    };
  };

  const applyCnnBaseline = (curr: AuraEmotionFromCnn): AuraEmotionFromCnn => {
    const base = baselineCnnMeanRef.current;
    if (!base) return curr;
    const eps = 1e-6;
    return normalizeAura({
      calm: (curr.calm + eps) / (base.calm + eps),
      anxious: (curr.anxious + eps) / (base.anxious + eps),
      stressed: (curr.stressed + eps) / (base.stressed + eps),
      neutral: (curr.neutral + eps) / (base.neutral + eps),
    });
  };

  const applyMetricsBaseline = (curr: FacialMetrics): FacialMetrics => {
    const base = baselineMetricsMeanRef.current;
    if (!base) return curr;
    return {
      eyeFatigue: clamp100(curr.eyeFatigue - base.eyeFatigue + 50),
      browTension: clamp100(curr.browTension - base.browTension + 50),
      mouthOpenness: clamp100(curr.mouthOpenness - base.mouthOpenness + 50),
      headMovement: clamp100(curr.headMovement - base.headMovement + 50),
    };
  };

  const maybeAccumulateBaseline = (cnnAura: AuraEmotionFromCnn, metricsRaw: FacialMetrics) => {
    const start = baselineStartAtRef.current;
    if (!start) return;

    const elapsed = Date.now() - start;
    if (elapsed > 10_000) {
      if (!baselineCnnMeanRef.current && baselineCountRef.current > 0) {
        const c = baselineCountRef.current;
        baselineCnnMeanRef.current = {
          calm: baselineCnnSumRef.current.calm / c,
          anxious: baselineCnnSumRef.current.anxious / c,
          stressed: baselineCnnSumRef.current.stressed / c,
          neutral: baselineCnnSumRef.current.neutral / c,
        };
        baselineMetricsMeanRef.current = {
          eyeFatigue: baselineMetricsSumRef.current.eyeFatigue / c,
          browTension: baselineMetricsSumRef.current.browTension / c,
          mouthOpenness: baselineMetricsSumRef.current.mouthOpenness / c,
          headMovement: baselineMetricsSumRef.current.headMovement / c,
        };
      }
      return;
    }

    baselineCountRef.current += 1;
    baselineCnnSumRef.current = {
      calm: baselineCnnSumRef.current.calm + cnnAura.calm,
      anxious: baselineCnnSumRef.current.anxious + cnnAura.anxious,
      stressed: baselineCnnSumRef.current.stressed + cnnAura.stressed,
      neutral: baselineCnnSumRef.current.neutral + cnnAura.neutral,
    };
    baselineMetricsSumRef.current = {
      eyeFatigue: baselineMetricsSumRef.current.eyeFatigue + metricsRaw.eyeFatigue,
      browTension: baselineMetricsSumRef.current.browTension + metricsRaw.browTension,
      mouthOpenness: baselineMetricsSumRef.current.mouthOpenness + metricsRaw.mouthOpenness,
      headMovement: baselineMetricsSumRef.current.headMovement + metricsRaw.headMovement,
    };
  };

  const fuse = (rule: EmotionState, cnn: AuraEmotionFromCnn) => {
    const ruleAura: AuraEmotionFromCnn = {
      calm: rule.calm,
      anxious: rule.anxious,
      stressed: rule.stressed,
      neutral: rule.neutral,
    };

    const fused = normalizeAura({
      calm: 0.65 * cnn.calm + 0.35 * ruleAura.calm,
      anxious: 0.65 * cnn.anxious + 0.35 * ruleAura.anxious,
      stressed: 0.65 * cnn.stressed + 0.35 * ruleAura.stressed,
      neutral: 0.65 * cnn.neutral + 0.35 * ruleAura.neutral,
    });

    const dominant = getDominantAura(fused);
    const confidence = Math.round(dominant[1]);
    const cnnTop = getDominantAura(cnn)[0];
    const ruleTop = getDominantAura(ruleAura)[0];

    const nextFusion = {
      final: fused,
      dominant: dominant[0],
      confidence,
      disagreement: cnnTop !== ruleTop,
      ruleExplanation: rule.explanation,
      cnnSummary: lastCnnResultRef.current?.summary ?? 'CNN: (no recent result)',
    };

    setFusionState(nextFusion);
    visionEmotionStore.setSnapshot({
      timestamp: Date.now(),
      rule,
      fused: nextFusion,
    });
  };

  const fuseRuleOnly = (rule: EmotionState, cnnSummary: string) => {
    const ruleAura: AuraEmotionFromCnn = {
      calm: rule.calm,
      anxious: rule.anxious,
      stressed: rule.stressed,
      neutral: rule.neutral,
    };

    const fused = normalizeAura(ruleAura);
    const dominant = getDominantAura(fused);
    const confidence = Math.round(dominant[1]);

    const nextFusion = {
      final: fused,
      dominant: dominant[0],
      confidence,
      disagreement: false,
      ruleExplanation: rule.explanation,
      cnnSummary,
    };

    setFusionState(nextFusion);
    visionEmotionStore.setSnapshot({
      timestamp: Date.now(),
      rule,
      fused: nextFusion,
    });
  };

  const maybeRunCnnAndFuse = async (ruleEmotion: EmotionState, metricsRaw: FacialMetrics) => {
    try {
      const v = videoRef.current;
      if (!v) return;

      const now = Date.now();
      if (now - lastCnnAtRef.current < 200) {
        const last = lastCnnResultRef.current;
        if (last) {
          const cnnAdj = applyCnnBaseline(last.aura);
          fuse(ruleEmotion, cnnAdj);
        } else {
          fuseRuleOnly(ruleEmotion, 'CNN: loading…');
        }
        return;
      }
      lastCnnAtRef.current = now;

      const res = await cnnEmotionService.detect(v);
      if (!res) {
        fuseRuleOnly(ruleEmotion, 'CNN: unavailable (model not loaded or no face detected).');
        return;
      }

      lastCnnResultRef.current = res;
      maybeAccumulateBaseline(res.aura, metricsRaw);
      const cnnAdj = applyCnnBaseline(res.aura);
      fuse(ruleEmotion, cnnAdj);

      if (debugFrameRef.current % 30 === 0) {
        console.log('cnn', res.summary);
      }
    } catch {
      fuseRuleOnly(ruleEmotion, 'CNN: error (see console).');
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        await new Promise<void>((resolve) => {
          const v = videoRef.current;
          if (!v) return resolve();
          if (v.readyState >= 2) return resolve();
          v.onloadedmetadata = () => resolve();
        });

        try {
          await videoRef.current.play();
        } catch {
          // ignore autoplay restrictions; MediaPipeCamera may still work
        }

        setIsActive(true);
        addLog("Camera connected.");
        addLog("Analyzing facial micro-expressions...");

        baselineStartAtRef.current = Date.now();
        baselineCountRef.current = 0;
        baselineCnnSumRef.current = { calm: 0, anxious: 0, stressed: 0, neutral: 0 };
        baselineMetricsSumRef.current = { eyeFatigue: 0, browTension: 0, mouthOpenness: 0, headMovement: 0 };
        baselineCnnMeanRef.current = null;
        baselineMetricsMeanRef.current = null;
        lastCnnResultRef.current = null;
        lastCnnAtRef.current = 0;

        emotionInferenceService.setConfig({
          thresholds: { low: 20, medium: 40, high: 60 },
        });

        if (!faceMeshRef.current) {
          faceMeshRef.current = new FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
          });

          faceMeshRef.current.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });

          faceMeshRef.current.onResults((results: Results) => {
            const lm = results.multiFaceLandmarks?.[0];
            if (!lm) return;

            const metricsRaw = computeFacialMetrics(lm);
            const metrics = applyMetricsBaseline(metricsRaw);
            const nextEmotion = emotionInferenceService.infer(metrics);
            setEmotionState(nextEmotion);

            void maybeRunCnnAndFuse(nextEmotion, metricsRaw);

            debugFrameRef.current += 1;
            if (debugFrameRef.current % 30 === 0) {
              console.table(metrics);
              console.log('emotion', nextEmotion);
            }
          });
        }

        if (!mpCameraRef.current) {
          mpCameraRef.current = new MediaPipeCamera(videoRef.current, {
            onFrame: async () => {
              if (!faceMeshRef.current || !videoRef.current) return;
              try {
                await faceMeshRef.current.send({ image: videoRef.current });
              } catch (e) {
                if (debugFrameRef.current % 30 === 0) {
                  console.log('mediapipe send error', e);
                }
              }
            },
            width: 640,
            height: 480,
          });
        }

        await mpCameraRef.current.start();
      }
    } catch (err) {
      console.error("Camera error", err);
      addLog("Error: Could not access camera.");
    }
  };

  const stopCamera = () => {
    if (mpCameraRef.current) {
      mpCameraRef.current.stop();
      mpCameraRef.current = null;
    }

    if (faceMeshRef.current) {
      faceMeshRef.current.close();
      faceMeshRef.current = null;
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsActive(false);
      setEmotionState(null);
      setFusionState(null);
      addLog("Stream paused.");
    }

    visionEmotionStore.setSnapshot({
      timestamp: Date.now(),
      rule: null,
      fused: null,
    });

    lastNoseRef.current = null;
    baselineStartAtRef.current = null;
    baselineCountRef.current = 0;
    baselineCnnMeanRef.current = null;
    baselineMetricsMeanRef.current = null;
    lastCnnResultRef.current = null;
    lastCnnAtRef.current = 0;
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const getDominantEmotion = (e: EmotionState | null) => {
    if (!e) return '---';
    const entries = [
      ['calm', e.calm],
      ['anxious', e.anxious],
      ['stressed', e.stressed],
      ['neutral', e.neutral],
    ] as const;
    return entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  };

  const computeFacialMetrics = (lm: Array<{ x: number; y: number; z?: number }>): FacialMetrics => {
    const dist = (a: number, b: number) => {
      const dx = lm[a].x - lm[b].x;
      const dy = lm[a].y - lm[b].y;
      return Math.sqrt(dx * dx + dy * dy);
    };

    // Mouth openness (upper inner lip 13, lower inner lip 14)
    const mouth = dist(13, 14);

    // Brow tension proxy: average of left and right brow-to-eye vertical separation
    // left brow 105 to left eye upper 159, right brow 334 to right eye upper 386
    const browLeft = Math.abs(lm[105].y - lm[159].y);
    const browRight = Math.abs(lm[334].y - lm[386].y);
    const brow = (browLeft + browRight) / 2;

    // Eye fatigue proxy: inverse of eye openness using eye lids
    // left eye: upper 159, lower 145; right eye: upper 386, lower 374
    const eyeLeft = Math.abs(lm[159].y - lm[145].y);
    const eyeRight = Math.abs(lm[386].y - lm[374].y);
    const eyeOpen = (eyeLeft + eyeRight) / 2;

    // Head movement: nose tip delta per frame (nose tip 1)
    const nose = { x: lm[1].x, y: lm[1].y };
    const prev = lastNoseRef.current;
    lastNoseRef.current = nose;
    const headMove = prev ? Math.sqrt((nose.x - prev.x) ** 2 + (nose.y - prev.y) ** 2) : 0;

    const to0_100 = (v: number, min: number, max: number) => {
      const t = (v - min) / (max - min);
      return Math.max(0, Math.min(100, t * 100));
    };

    return {
      // smaller eyeOpen => higher fatigue
      eyeFatigue: 100 - to0_100(eyeOpen, 0.004, 0.02),
      // smaller brow separation => higher tension
      browTension: 100 - to0_100(brow, 0.01, 0.05),
      mouthOpenness: to0_100(mouth, 0.002, 0.04),
      headMovement: to0_100(headMove, 0.0, 0.02),
    };
  };

  return (
    <div className="pt-32 pb-12 px-4 max-w-5xl mx-auto bg-background transition-colors duration-500 min-h-screen">
      
      <div className="text-center mb-12">
        <h1 className="text-4xl font-serif italic text-textMain mb-4">Non-verbal Insight</h1>
        <p className="text-textSec max-w-xl mx-auto font-light">
          Aura uses local privacy-first vision processing to understand emotional cues you might miss.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Camera Feed */}
        <div className="lg:col-span-2 space-y-8">
          <div className="relative rounded-3xl overflow-hidden bg-surface aspect-video border border-borderDim shadow-soft ring-1 ring-black/5">
            {!isActive && (
              <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 z-10 bg-surface/80 backdrop-blur-sm">
                <div className="p-5 rounded-full bg-background border border-borderDim shadow-sm">
                  <Camera className="w-8 h-8 text-textSec" strokeWidth={1.5} />
                </div>
                <p className="text-textSec font-medium">Camera inactive</p>
              </div>
            )}
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              className={`w-full h-full object-cover transform scale-x-[-1] transition-all duration-700 ${isActive ? 'opacity-100 grayscale-[20%]' : 'opacity-0'}`} 
            />
            
            {/* Soft Overlay UI */}
            {isActive && (
              <div className="absolute top-6 left-6 right-6 flex justify-between items-start">
                 <span className="px-3 py-1.5 bg-background/80 backdrop-blur-md rounded-full text-xs text-primary font-medium flex items-center gap-2 border border-borderDim">
                   <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Active Analysis
                 </span>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            {!isActive ? (
              <Button onClick={startCamera} className="w-full md:w-auto min-w-[200px]">
                <Play className="w-4 h-4" /> Start Session
              </Button>
            ) : (
              <Button variant="secondary" onClick={stopCamera} className="w-full md:w-auto min-w-[200px]">
                <Pause className="w-4 h-4" /> Pause
              </Button>
            )}
          </div>
        </div>

        {/* Data Panel */}
        <div className="space-y-6">
          <GlassCard className="h-full flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-medium text-textMain mb-6 flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" /> Real-time Metrics
              </h3>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-textSec">Dominant Emotion</span>
                    <span className="text-textMain font-medium">{emotionState ? getDominantEmotion(emotionState) : '---'}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-textSec">Calm</span>
                    <span className="text-textMain font-medium">{emotionState ? `${Math.round(emotionState.calm)}%` : '---'}</span>
                  </div>
                  <div className="w-full bg-borderDim h-1.5 rounded-full overflow-hidden">
                     <div className="bg-cool h-full rounded-full w-[0%] transition-all duration-300" style={{ width: emotionState ? `${emotionState.calm}%` : '0%' }}></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-textSec">Anxious</span>
                    <span className="text-textMain font-medium">{emotionState ? `${Math.round(emotionState.anxious)}%` : '---'}</span>
                  </div>
                  <div className="w-full bg-borderDim h-1.5 rounded-full overflow-hidden">
                     <div className="bg-warmth h-full rounded-full w-[0%] transition-all duration-300" style={{ width: emotionState ? `${emotionState.anxious}%` : '0%' }}></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-textSec">Stressed</span>
                    <span className="text-textMain font-medium">{emotionState ? `${Math.round(emotionState.stressed)}%` : '---'}</span>
                  </div>
                  <div className="w-full bg-borderDim h-1.5 rounded-full overflow-hidden">
                     <div className="bg-primary h-full rounded-full w-[0%] transition-all duration-300" style={{ width: emotionState ? `${emotionState.stressed}%` : '0%' }}></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-textSec">Neutral</span>
                    <span className="text-textMain font-medium">{emotionState ? `${Math.round(emotionState.neutral)}%` : '---'}</span>
                  </div>
                  <div className="w-full bg-borderDim h-1.5 rounded-full overflow-hidden">
                     <div className="bg-borderDim h-full rounded-full w-[0%] transition-all duration-300" style={{ width: emotionState ? `${emotionState.neutral}%` : '0%' }}></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-textSec">Explanation</div>
                  <div className="text-xs text-textMain leading-relaxed">{emotionState ? emotionState.explanation : '---'}</div>
                </div>

                <div className="pt-4 border-t border-borderDim space-y-2">
                  <div className="text-sm text-textSec">Emotion Fusion</div>
                  <div className="flex justify-between text-sm">
                    <span className="text-textSec">Dominant</span>
                    <span className="text-textMain font-medium">{fusionState ? fusionState.dominant : '---'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-textSec">Confidence</span>
                    <span className="text-textMain font-medium">{fusionState ? `${fusionState.confidence}%` : '---'}</span>
                  </div>
                  {fusionState?.disagreement && (
                    <div className="text-xs text-warmth">CNN and rules disagree</div>
                  )}
                  <div className="text-xs text-textMain leading-relaxed">{fusionState ? fusionState.ruleExplanation : '---'}</div>
                  <div className="text-xs text-textMain leading-relaxed">{fusionState ? fusionState.cnnSummary : '---'}</div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-borderDim">
              <p className="text-xs font-bold text-textMuted uppercase tracking-wider mb-3">Session Log</p>
              <div className="space-y-2 text-xs text-textSec font-mono opacity-70">
                {logs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            </div>
          </GlassCard>

          <div className="flex items-start gap-3 px-4 py-3 bg-primary/5 rounded-xl border border-primary/10">
             <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
             <p className="text-xs text-textSec leading-relaxed">
               All video frames are processed locally. No facial data is sent to the cloud.
             </p>
          </div>
        </div>

      </div>
    </div>
  );
};