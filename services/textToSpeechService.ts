class TextToSpeechService {
  private synth: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  private isSupported: boolean;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voicesLoaded: Promise<void>;

  constructor() {
    this.synth = window.speechSynthesis;
    this.isSupported = 'speechSynthesis' in window;
    
    if (this.isSupported) {
      // Force voice loading on some browsers
      this.synth.getVoices();
      this.voicesLoaded = this.loadVoices();
    } else {
      this.voicesLoaded = Promise.resolve();
    }
  }

  private loadVoices(): Promise<void> {
    return new Promise((resolve) => {
      // Get voices immediately
      this.voices = this.synth.getVoices();
      
      if (this.voices.length > 0) {
        resolve();
        return;
      }

      // Wait for voices to load
      const voicesChangedHandler = () => {
        this.voices = this.synth.getVoices();
        if (this.voices.length > 0) {
          this.synth.removeEventListener('voiceschanged', voicesChangedHandler);
          resolve();
        }
      };

      this.synth.addEventListener('voiceschanged', voicesChangedHandler);

      // Timeout fallback
      setTimeout(() => {
        this.voices = this.synth.getVoices();
        resolve();
      }, 1000);
    });
  }

  private selectBestVoice(): SpeechSynthesisVoice | null {
    if (this.voices.length === 0) return null;

    // Priority order for selecting calm, natural voices
    const preferences = [
      // Google voices (usually highest quality)
      (v: SpeechSynthesisVoice) => v.name.includes('Google') && v.name.includes('Female'),
      (v: SpeechSynthesisVoice) => v.name.includes('Google') && v.lang.startsWith('en'),
      
      // Natural/Premium voices
      (v: SpeechSynthesisVoice) => v.name.includes('Natural') || v.name.includes('Premium'),
      
      // Female voices (often perceived as calmer)
      (v: SpeechSynthesisVoice) => v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Victoria'),
      
      // Enhanced or neural voices
      (v: SpeechSynthesisVoice) => v.name.includes('Enhanced') || v.name.includes('Neural'),
      
      // Any English voice
      (v: SpeechSynthesisVoice) => v.lang.startsWith('en-US'),
      (v: SpeechSynthesisVoice) => v.lang.startsWith('en'),
    ];

    for (const preference of preferences) {
      const voice = this.voices.find(preference);
      if (voice) return voice;
    }

    return this.voices[0];
  }

  getSupportedVoices(): SpeechSynthesisVoice[] {
    return this.voices.filter(voice => voice.lang.startsWith('en'));
  }

  isSpeaking(): boolean {
    return this.synth.speaking;
  }

  stop() {
    this.synth.cancel();
    this.currentUtterance = null;
  }

  private chunkText(text: string, maxLength: number = 200): string[] {
    // Split by sentences first
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxLength && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  async speak(text: string, options: {
    rate?: number;
    pitch?: number;
    volume?: number;
    voiceIndex?: number;
  } = {}): Promise<void> {
    if (!this.isSupported) {
      console.error('Text-to-speech not supported in this browser');
      throw new Error('Text-to-speech not supported in this browser');
    }

    // Wait for voices to load
    await this.voicesLoaded;

    // Cancel any ongoing speech first
    this.synth.cancel();
    
    // Small delay to ensure cancellation completes
    await new Promise(resolve => setTimeout(resolve, 150));

    // Clean and prepare text
    const cleanText = text
      .replace(/[*_#`~]/g, '') // Remove markdown
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links
      .replace(/\n+/g, ' ') // Replace newlines
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();

    if (!cleanText) {
      throw new Error('No text to speak');
    }

    console.log('Speaking text:', cleanText.substring(0, 100) + '...');

    // Split into chunks for longer text
    const chunks = this.chunkText(cleanText);

    // Speak each chunk
    for (let i = 0; i < chunks.length; i++) {
      await this.speakChunk(chunks[i], options);
      
      // Small pause between chunks
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  }

  private speakChunk(text: string, options: {
    rate?: number;
    pitch?: number;
    volume?: number;
    voiceIndex?: number;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Aura's calm, gentle voice parameters
      utterance.rate = options.rate ?? 0.85; // Slower, more deliberate
      utterance.pitch = options.pitch ?? 0.95; // Slightly lower, warmer
      utterance.volume = options.volume ?? 0.7; // Soft but clear

      // Select voice
      const selectedVoice = options.voiceIndex !== undefined
        ? this.getSupportedVoices()[options.voiceIndex]
        : this.selectBestVoice();

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      } else {
        utterance.lang = 'en-US';
      }

      console.log('Using voice:', utterance.voice?.name || 'default', 'Rate:', utterance.rate, 'Pitch:', utterance.pitch);

      let hasStarted = false;

      utterance.onstart = () => {
        hasStarted = true;
        console.log('Speech started');
      };

      utterance.onend = () => {
        console.log('Speech ended');
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (event) => {
        console.error('Speech error:', event.error);
        this.currentUtterance = null;
        
        // Don't reject on "interrupted" or "canceled" errors
        if (event.error === 'interrupted' || event.error === 'canceled') {
          resolve();
        } else {
          reject(new Error(`Speech error: ${event.error}`));
        }
      };

      this.currentUtterance = utterance;
      
      // Force resume (iOS/Safari fix)
      this.synth.resume();
      
      // Speak the utterance
      this.synth.speak(utterance);

      // Alternative approach for strict browsers
      if (!hasStarted) {
        // Try a second approach with a tiny delay
        setTimeout(() => {
          if (!hasStarted && this.currentUtterance === utterance) {
            console.log('Trying alternative TTS approach');
            this.synth.cancel();
            this.synth.speak(utterance);
          }
        }, 100);
      }

      // Safety timeout - if speech hasn't started after 5 seconds, reject
      setTimeout(() => {
        if (!hasStarted) {
          console.warn('Speech timeout - may not be supported');
          this.synth.cancel();
          reject(new Error('Speech timeout'));
        }
      }, 5000);
    });
  }

  // Get available voice options for UI
  getVoiceOptions() {
    const voices = this.getSupportedVoices();
    return voices.map((voice, index) => ({
      index,
      name: voice.name,
      lang: voice.lang,
      localService: voice.localService,
      isRecommended: voice === this.selectBestVoice()
    }));
  }

  // Pause/Resume functionality
  pause() {
    this.synth.pause();
  }

  resume() {
    this.synth.resume();
  }
}

export const textToSpeechService = new TextToSpeechService();