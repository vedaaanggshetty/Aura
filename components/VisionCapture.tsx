import React, { useRef, useEffect, useState } from 'react';
import { Camera, AlertCircle, Play, Pause, Eye } from 'lucide-react';
import { Button, GlassCard } from './ui/LayoutComponents';
import { FaceMesh, Results } from '@mediapipe/face_mesh';
import { Camera as MediaPipeCamera } from '@mediapipe/camera_utils';
import { emotionInferenceService, EmotionState, FacialMetrics } from '../services/emotionInferenceService';

export const VisionCapture: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const mpCameraRef = useRef<MediaPipeCamera | null>(null);
  const lastNoseRef = useRef<{ x: number; y: number } | null>(null);
  const debugFrameRef = useRef(0);
  const [isActive, setIsActive] = useState(false);
  const [logs, setLogs] = useState<string[]>(['System initialized.']);
  const [emotionState, setEmotionState] = useState<EmotionState | null>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-4), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsActive(true);
        addLog("Camera connected.");
        addLog("Analyzing facial micro-expressions...");

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

            const metrics = computeFacialMetrics(lm);
            const nextEmotion = emotionInferenceService.infer(metrics);
            setEmotionState(nextEmotion);

            debugFrameRef.current += 1;
            if (debugFrameRef.current % 15 === 0) {
              console.table(metrics);
              console.log('emotion', nextEmotion);
            }
          });
        }

        if (!mpCameraRef.current) {
          mpCameraRef.current = new MediaPipeCamera(videoRef.current, {
            onFrame: async () => {
              if (!faceMeshRef.current || !videoRef.current) return;
              await faceMeshRef.current.send({ image: videoRef.current });
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
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsActive(false);
      setEmotionState(null);
      addLog("Stream paused.");
    }

    if (mpCameraRef.current) {
      mpCameraRef.current.stop();
      mpCameraRef.current = null;
    }

    if (faceMeshRef.current) {
      faceMeshRef.current.close();
      faceMeshRef.current = null;
    }

    lastNoseRef.current = null;
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