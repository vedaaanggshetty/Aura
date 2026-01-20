// Analysis Engine - Behavior-driven emotional intelligence system
// Derives all metrics from actual user journal and chat behavior

import { JournalEntry } from './journalStore';
import { Message, MessageRole } from '../types';

// Linguistic patterns for emotional analysis
const LINGUISTIC_PATTERNS = {
  stress: {
    urgency: ['urgent', 'asap', 'immediately', 'right now', 'need to', 'have to', 'must'],
    tension: ['overwhelmed', 'swamped', 'buried', 'drowning', 'cant handle', 'too much'],
    pressure: ['deadline', 'pressure', 'expectations', 'demands', 'requirements']
  },
  anxiety: {
    uncertainty: ['what if', 'maybe', 'perhaps', 'worried', 'concerned', 'might happen'],
    repetition: ['again', 'still', 'keep', 'always', 'never', 'constantly'],
    future: ['tomorrow', 'next week', 'future', 'coming', 'ahead']
  },
  depression: {
    hopelessness: ['hopeless', 'pointless', 'meaningless', 'nothing matters', 'give up'],
    selfCriticism: ['stupid', 'failure', 'worthless', 'inadequate', 'not good enough'],
    withdrawal: ['alone', 'isolated', 'avoid', 'hide away', 'dont want to']
  },
  calm: {
    grounding: ['breathe', 'present', 'moment', 'here', 'now', 'mindful'],
    resolution: ['solved', 'figured out', 'solution', 'answer', 'clarity'],
    gratitude: ['thankful', 'grateful', 'appreciate', 'blessed', 'fortunate']
  }
};

export interface AnalysisMetrics {
  stress: number;
  anxiety: number; 
  depression: number;
  insomnia: number;
  mood: number;
  energy: number;
  emotionalStability: number;
}

export interface AnalysisResult {
  metrics: AnalysisMetrics;
  patterns: Array<{
    name: string;
    score: number;
    trend: 'up' | 'down' | 'stable';
    explanation: string;
  }>;
  weeklyData: Array<{ day: string; mood: number; stress: number }>;
  balanceMetrics: Array<{ subject: string; A: number; fullMark: number }>;
  status: {
    overall: 'improving' | 'volatile' | 'elevated' | 'recovering' | 'at-rest';
    explanation: string;
  };
}

interface CombinedData {
  content: string;
  timestamp: number;
  role: MessageRole;
  wordCount: number;
  hourOfDay: number;
}

class AnalysisEngine {
  private readonly MIN_DATA_POINTS = 3;

  analyze(entries: JournalEntry[], messages: Message[]): AnalysisResult {
    const allData = this.combineData(entries, messages);
    
    if (allData.length < this.MIN_DATA_POINTS) {
      return this.getDefaultResult();
    }

    const metrics = this.calculateMetrics(allData);
    const patterns = this.identifyPatterns(metrics);
    const weeklyData = this.getWeeklyData(allData);
    const balanceMetrics = this.createBalanceMetrics(metrics);
    const status = this.determineStatus(metrics);

    return {
      metrics,
      patterns,
      weeklyData,
      balanceMetrics,
      status
    };
  }

  private combineData(entries: JournalEntry[], messages: Message[]): CombinedData[] {
    const combined: CombinedData[] = [];

    entries.forEach(entry => {
      combined.push({
        content: entry.content,
        timestamp: entry.timestamp,
        role: entry.role as MessageRole,
        wordCount: entry.content.split(' ').length,
        hourOfDay: new Date(entry.timestamp).getHours()
      });
    });

    messages.forEach(message => {
      combined.push({
        content: message.content,
        timestamp: message.timestamp,
        role: message.role,
        wordCount: message.content.split(' ').length,
        hourOfDay: new Date(message.timestamp).getHours()
      });
    });

    return combined.sort((a, b) => a.timestamp - b.timestamp);
  }

  private calculateMetrics(data: CombinedData[]): AnalysisMetrics {
    const userMessages = data.filter(d => d.role === MessageRole.USER);
    
    if (userMessages.length === 0) {
      return this.getDefaultMetrics();
    }

    return {
      stress: this.calculateStress(userMessages),
      anxiety: this.calculateAnxiety(userMessages),
      depression: this.calculateDepression(userMessages),
      insomnia: this.calculateInsomnia(userMessages),
      mood: this.calculateMood(userMessages),
      energy: this.calculateEnergy(userMessages),
      emotionalStability: this.calculateStability(userMessages)
    };
  }

  private calculateStress(messages: CombinedData[]): number {
    let stressScore = 30;
    
    messages.forEach(msg => {
      const content = msg.content.toLowerCase();
      
      LINGUISTIC_PATTERNS.stress.urgency.forEach(word => {
        if (content.includes(word)) stressScore += 8;
      });
      
      LINGUISTIC_PATTERNS.stress.tension.forEach(word => {
        if (content.includes(word)) stressScore += 10;
      });
      
      if (msg.wordCount < 10 && stressScore > 40) {
        stressScore += 5;
      }
      
      LINGUISTIC_PATTERNS.calm.grounding.forEach(word => {
        if (content.includes(word)) stressScore -= 6;
      });
      
      LINGUISTIC_PATTERNS.calm.resolution.forEach(word => {
        if (content.includes(word)) stressScore -= 8;
      });
    });

    return Math.min(100, Math.max(0, stressScore / Math.max(1, messages.length * 0.3)));
  }

  private calculateAnxiety(messages: CombinedData[]): number {
    let anxietyScore = 25;
    
    messages.forEach(msg => {
      const content = msg.content.toLowerCase();
      
      LINGUISTIC_PATTERNS.anxiety.uncertainty.forEach(word => {
        if (content.includes(word)) anxietyScore += 7;
      });
      
      LINGUISTIC_PATTERNS.anxiety.repetition.forEach(word => {
        if (content.includes(word)) anxietyScore += 5;
      });
      
      LINGUISTIC_PATTERNS.anxiety.future.forEach(word => {
        if (content.includes(word)) anxietyScore += 4;
      });
      
      LINGUISTIC_PATTERNS.calm.grounding.forEach(word => {
        if (content.includes(word)) anxietyScore -= 5;
      });
    });

    return Math.min(100, Math.max(0, anxietyScore / Math.max(1, messages.length * 0.3)));
  }

  private calculateDepression(messages: CombinedData[]): number {
    let depressionScore = 20;
    
    messages.forEach(msg => {
      const content = msg.content.toLowerCase();
      
      LINGUISTIC_PATTERNS.depression.hopelessness.forEach(word => {
        if (content.includes(word)) depressionScore += 12;
      });
      
      LINGUISTIC_PATTERNS.depression.selfCriticism.forEach(word => {
        if (content.includes(word)) depressionScore += 10;
      });
      
      LINGUISTIC_PATTERNS.depression.withdrawal.forEach(word => {
        if (content.includes(word)) depressionScore += 8;
      });
      
      if (msg.wordCount > 20) depressionScore -= 3;
      
      LINGUISTIC_PATTERNS.calm.gratitude.forEach(word => {
        if (content.includes(word)) depressionScore -= 7;
      });
    });

    return Math.min(100, Math.max(0, depressionScore / Math.max(1, messages.length * 0.3)));
  }

  private calculateInsomnia(messages: CombinedData[]): number {
    let insomniaScore = 20;
    
    const lateNightMessages = messages.filter(msg => 
      msg.hourOfDay >= 22 || msg.hourOfDay <= 6
    );
    
    insomniaScore += (lateNightMessages.length / messages.length) * 40;
    
    const daytimeMessages = messages.filter(msg => 
      msg.hourOfDay >= 6 && msg.hourOfDay <= 18
    );
    
    if (daytimeMessages.length / messages.length > 0.7) {
      insomniaScore -= 15;
    }

    return Math.min(100, Math.max(0, insomniaScore));
  }

  private calculateMood(messages: CombinedData[]): number {
    let moodScore = 50;
    
    messages.forEach(msg => {
      const content = msg.content.toLowerCase();
      
      const positiveWords = ['happy', 'good', 'great', 'better', 'excited', 'proud', 'confident'];
      positiveWords.forEach(word => {
        if (content.includes(word)) moodScore += 5;
      });
      
      const negativeWords = ['sad', 'angry', 'frustrated', 'upset', 'disappointed', 'worried'];
      negativeWords.forEach(word => {
        if (content.includes(word)) moodScore -= 5;
      });
      
      if (msg.wordCount > 15) moodScore += 2;
    });

    return Math.min(100, Math.max(0, moodScore / Math.max(1, messages.length * 0.2)));
  }

  private calculateEnergy(messages: CombinedData[]): number {
    let energyScore = 50;
    
    const avgWordCount = messages.reduce((sum, msg) => sum + msg.wordCount, 0) / messages.length;
    if (avgWordCount > 15) energyScore += 10;
    if (avgWordCount < 8) energyScore -= 10;
    
    const morningMessages = messages.filter(msg => msg.hourOfDay >= 6 && msg.hourOfDay <= 9);
    if (morningMessages.length > 0) energyScore += 8;

    return Math.min(100, Math.max(0, energyScore));
  }

  private calculateStability(messages: CombinedData[]): number {
    if (messages.length < 3) return 50;
    
    const intervals = [];
    for (let i = 1; i < messages.length; i++) {
      intervals.push(messages[i].timestamp - messages[i-1].timestamp);
    }
    
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    
    let stabilityScore = 80 - (variance / (1000 * 60 * 60 * 24));
    
    const wordCounts = messages.map(msg => msg.wordCount);
    const avgWordCount = wordCounts.reduce((sum, count) => sum + count, 0) / wordCounts.length;
    const wordVariance = wordCounts.reduce((sum, count) => sum + Math.pow(count - avgWordCount, 2), 0) / wordCounts.length;
    
    stabilityScore -= wordVariance * 0.5;
    
    return Math.min(100, Math.max(0, stabilityScore));
  }

  private identifyPatterns(metrics: AnalysisMetrics) {
    return [
      {
        name: 'Stress Response',
        score: metrics.stress,
        trend: 'stable' as const,
        explanation: 'Influenced by urgency language, message length, and resolution patterns in your writing.'
      },
      {
        name: 'Anxiety Signals', 
        score: metrics.anxiety,
        trend: 'stable' as const,
        explanation: 'Based on uncertainty indicators, repetitive themes, and future-focused worry.'
      },
      {
        name: 'Sleep Quality',
        score: 100 - metrics.insomnia,
        trend: 'stable' as const,
        explanation: 'Derived from journaling timing patterns and regularity of your reflections.'
      },
      {
        name: 'Emotional Expression',
        score: metrics.mood,
        trend: 'stable' as const,
        explanation: 'Reflects sentiment in your writing and willingness to engage emotionally.'
      },
      {
        name: 'Reflection Consistency',
        score: metrics.emotionalStability,
        trend: 'stable' as const,
        explanation: 'Based on regularity of your journaling and consistency in engagement.'
      }
    ];
  }

  private getWeeklyData(data: CombinedData[]) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const weeklyData = [];
    
    // Get data for the last 7 days including today
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - i);
      const dayName = days[targetDate.getDay()];
      
      // Get messages from this specific day
      const dayStart = new Date(targetDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayMessages = data.filter(d => 
        d.timestamp >= dayStart.getTime() && d.timestamp <= dayEnd.getTime()
      );
      
      if (dayMessages.length > 0) {
        const dayMetrics = this.calculateMetrics(dayMessages);
        weeklyData.push({
          day: dayName,
          mood: dayMetrics.mood,
          stress: dayMetrics.stress
        });
      } else {
        // Use previous day's data or defaults for days with no entries
        const prevData = weeklyData[weeklyData.length - 1];
        weeklyData.push({
          day: dayName,
          mood: prevData ? prevData.mood : 50,
          stress: prevData ? prevData.stress : 30
        });
      }
    }
    
    return weeklyData;
  }

  private createBalanceMetrics(metrics: AnalysisMetrics) {
    return [
      { subject: 'Stress', A: metrics.stress, fullMark: 100 },
      { subject: 'Anxiety', A: metrics.anxiety, fullMark: 100 },
      { subject: 'Mood Stability', A: metrics.emotionalStability, fullMark: 100 },
      { subject: 'Energy', A: metrics.energy, fullMark: 100 },
      { subject: 'Emotional Load', A: Math.max(0, 100 - metrics.mood), fullMark: 100 }
    ];
  }

  private determineStatus(metrics: AnalysisMetrics) {
    const { stress, anxiety, depression, mood } = metrics;
    
    let overall: AnalysisResult['status']['overall'] = 'at-rest';
    let explanation = '';
    
    if (stress > 70 || anxiety > 70 || depression > 60) {
      overall = 'elevated';
      explanation = 'Your recent patterns show heightened emotional responses. This is influenced by intensity in your writing and current life circumstances.';
    } else if (mood > 65 && stress < 40) {
      overall = 'improving';
      explanation = 'Your patterns indicate positive emotional balance. Your consistent reflections support this stability.';
    } else {
      explanation = 'Your emotional patterns are currently stable. Regular reflection helps maintain this balance.';
    }
    
    return { overall, explanation };
  }

  private getDefaultMetrics(): AnalysisMetrics {
    return {
      stress: 30,
      anxiety: 25,
      depression: 20,
      insomnia: 20,
      mood: 60,
      energy: 50,
      emotionalStability: 70
    };
  }

  private getDefaultResult(): AnalysisResult {
    const defaultMetrics = this.getDefaultMetrics();
    return {
      metrics: defaultMetrics,
      patterns: [],
      weeklyData: [
        { day: 'Mon', mood: 50, stress: 30 },
        { day: 'Tue', mood: 52, stress: 28 },
        { day: 'Wed', mood: 48, stress: 32 },
        { day: 'Thu', mood: 51, stress: 30 },
        { day: 'Fri', mood: 53, stress: 29 },
        { day: 'Sat', mood: 55, stress: 27 },
        { day: 'Sun', mood: 54, stress: 28 }
      ],
      balanceMetrics: this.createBalanceMetrics(defaultMetrics),
      status: {
        overall: 'at-rest',
        explanation: 'Building your emotional baseline. Continue journaling to see personalized insights.'
      }
    };
  }
}

export const analysisEngine = new AnalysisEngine();
