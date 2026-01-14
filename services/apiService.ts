import { Message, MessageRole, SentimentAnalysis } from '../types';
import { LLM_API_ENDPOINT } from '../constants';

// Simulated latency for "network" feel if backend is down
const SIMULATED_LATENCY = 800;

export class ApiService {
  
  /**
   * Sends a message to the backend or NGROK endpoint.
   * Supports streaming simulation if backend is not available.
   */
  static async sendMessage(
    history: Message[], 
    onToken: (token: string) => void
  ): Promise<Message> {
    try {
      // 1. Attempt to connect to real backend
      const response = await fetch(LLM_API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history })
      });

      if (!response.ok) throw new Error('Backend unavailable');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          // Backend should send SSE or chunks. Assuming simple text chunking here.
          // For a real SSE, we'd parse "data: " prefixes.
          // Here we assume raw text stream for simplicity or simulated stream.
          const tokens = chunk.split(/(?=[ \n])/); // rough token split
          for (const token of tokens) {
            onToken(token);
            fullContent += token;
            // Slight delay to smooth out the render if it comes too fast
            await new Promise(r => setTimeout(r, 10)); 
          }
        }
      } else {
        // Fallback if no reader
        const data = await response.json();
        fullContent = data.content;
        onToken(fullContent);
      }

      return {
        id: Date.now().toString(),
        role: MessageRole.ASSISTANT,
        content: fullContent,
        timestamp: Date.now(),
        sentiment: this.analyzeSentimentLocally(fullContent)
      };

    } catch (error) {
      console.warn('Using offline fallback simulation', error);
      // 2. Offline Fallback (Simulation)
      return this.simulateResponse(history, onToken);
    }
  }

  static async simulateResponse(
    history: Message[], 
    onToken: (token: string) => void
  ): Promise<Message> {
    const lastUserMessage = history[history.length - 1].content.toLowerCase();
    
    let responseText = "I hear you. It sounds like you're going through a lot right now. Can you tell me more about what's making you feel this way?";

    if (lastUserMessage.includes('anxiety') || lastUserMessage.includes('anxious')) {
      responseText = "Anxiety can be incredibly draining. I'm here to support you. Have you tried any grounding techniques recently, or would you like to explore one together?";
    } else if (lastUserMessage.includes('sleep') || lastUserMessage.includes('insomnia')) {
      responseText = "Sleep struggles often reflect a busy mind. Let's try to unpack what's keeping you awake. Is there a specific thought loop you're stuck in?";
    } else if (lastUserMessage.includes('sad') || lastUserMessage.includes('depressed')) {
      responseText = "I'm sorry you're feeling this heaviness. It takes courage to open up about it. I'm listening—fully and without judgment. What does this sadness feel like to you right now?";
    }

    // Simulate streaming
    const tokens = responseText.split(' ');
    let currentText = '';
    
    for (let i = 0; i < tokens.length; i++) {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 30));
      const token = (i === 0 ? '' : ' ') + tokens[i];
      currentText += token;
      onToken(token);
    }

    return {
      id: Date.now().toString(),
      role: MessageRole.ASSISTANT,
      content: currentText,
      timestamp: Date.now(),
      sentiment: this.analyzeSentimentLocally(currentText)
    };
  }

  static analyzeSentimentLocally(text: string): SentimentAnalysis {
    // Simple heuristic for demo purposes
    const positiveWords = ['good', 'great', 'hope', 'better', 'calm', 'recovery', 'thanks'];
    const negativeWords = ['bad', 'sad', 'anxious', 'stress', 'fear', 'pain', 'tired'];

    let score = 0;
    const lower = text.toLowerCase();
    
    positiveWords.forEach(w => { if (lower.includes(w)) score += 0.2; });
    negativeWords.forEach(w => { if (lower.includes(w)) score -= 0.2; });

    // Clamp
    score = Math.max(-1, Math.min(1, score));

    let label: SentimentAnalysis['label'] = 'neutral';
    if (score > 0.3) label = 'positive';
    else if (score < -0.3) label = 'negative';
    else if (score !== 0) label = 'mixed';

    return {
      score,
      label,
      emotions: [
        { name: 'Calmness', score: 0.5 + (score * 0.3) },
        { name: 'Stress', score: 0.5 - (score * 0.3) }
      ]
    };
  }
}