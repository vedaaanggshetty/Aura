import { AnalysisState } from '../types';

export interface VoiceRecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  duration: number;
  audioBlob?: Blob;
}

export interface VoiceAnalysisResult {
  analysis: AnalysisState;
  confidence: number;
}

class VoiceService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private startTime: number = 0;
  private timer: NodeJS.Timeout | null = null;

  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.audioChunks = [];
      this.startTime = Date.now();

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.start(100); // Collect data every 100ms
    } catch (error) {
      throw new Error('Failed to access microphone');
    }
  }

  async stopRecording(): Promise<Blob> {
    if (!this.mediaRecorder) {
      throw new Error('No recording in progress');
    }

    this.mediaRecorder.stop();
    this.mediaRecorder = null;

    const audioBlob = new Blob(this.audioChunks, { 
      type: 'audio/webm;codecs=opus' 
    });

    // Convert to WAV for server compatibility
    return await this.convertToWav(audioBlob);
  }

  getDuration(): number {
    return this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
  }

  private async convertToWav(webmBlob: Blob): Promise<Blob> {
    // Simple conversion - in production, use proper audio processing
    const arrayBuffer = await webmBlob.arrayBuffer();
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  async analyzeVoice(audioBlob: Blob): Promise<VoiceAnalysisResult> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');

    try {
      const response = await fetch('http://localhost:3001/analyze-voice', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Voice analysis failed');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      throw new Error('Failed to analyze voice');
    }
  }
}

export const voiceService = new VoiceService();
