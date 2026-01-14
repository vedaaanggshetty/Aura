import React, { useRef, useEffect, useState } from 'react';
import { Camera, AlertCircle, Play, Pause, Eye } from 'lucide-react';
import { Button, GlassCard } from './ui/LayoutComponents';

export const VisionCapture: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [logs, setLogs] = useState<string[]>(['System initialized.']);

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
      addLog("Stream paused.");
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

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
                    <span className="text-textSec">Primary State</span>
                    <span className="text-textMain font-medium">{isActive ? 'Focus' : '---'}</span>
                  </div>
                  <div className="w-full bg-borderDim h-1.5 rounded-full overflow-hidden">
                     <div className="bg-primary h-full rounded-full w-[0%] transition-all duration-1000" style={{ width: isActive ? '75%' : '0%' }}></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-textSec">Fatigue Level</span>
                    <span className="text-textMain font-medium">{isActive ? 'Low' : '---'}</span>
                  </div>
                  <div className="w-full bg-borderDim h-1.5 rounded-full overflow-hidden">
                     <div className="bg-warmth h-full rounded-full w-[0%] transition-all duration-1000" style={{ width: isActive ? '15%' : '0%' }}></div>
                  </div>
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