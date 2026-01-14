export interface User {
  id: string;
  name: string;
  email?: string;
}

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  sentiment?: SentimentAnalysis;
  isStreaming?: boolean;
}

export interface SentimentAnalysis {
  score: number; // -1 to 1
  label: 'positive' | 'neutral' | 'negative' | 'mixed';
  emotions: EmotionScore[];
}

export interface EmotionScore {
  name: string;
  score: number; // 0 to 1
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  lastUpdated: number;
}

export interface BehavioralPattern {
  name: string;
  score: number; // 0 to 100 intensity
  trend: 'up' | 'down' | 'stable';
  description: string;
}

export interface AnalysisState {
  currentMood: number; // 0-100
  stressLevel: number; // 0-100
  sleepQuality: number; // 0-100
  patterns: BehavioralPattern[];
  weeklyMoodData: { day: string; mood: number; stress: number }[];
}

export enum AppRoute {
  LANDING = '/',
  CHAT = '/chat',
  DASHBOARD = '/dashboard',
  VISION = '/vision'
}