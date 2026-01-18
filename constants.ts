import { BehavioralPattern } from './types';

// Clerk Configuration
export const clerkPubKey = (import.meta as any).env?.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_YOUR_CLERK_PUBLISHABLE_KEY_HERE';

// Configuration for local NGROK or Backend
// If you are running the `server/index.js`, use http://localhost:3001
export const API_BASE_URL = 'http://localhost:3001'; 
export const LLM_API_ENDPOINT = `${API_BASE_URL}/api/chat`; 

export const EMOTION_CATEGORIES = [
  'Stress', 'Anxiety', 'Depression', 'Insomnia', 
  'Emotional Fatigue', 'Burnout', 'Social Withdrawal', 
  'Overthinking', 'Panic Tendencies', 'Low Motivation',
  'Emotional Volatility', 'Cognitive Overload', 
  'Emotional Numbness', 'Recovery/Stability'
];

export const INITIAL_PATTERNS: BehavioralPattern[] = EMOTION_CATEGORIES.map(name => ({
  name,
  score: Math.floor(Math.random() * 30) + 10, // Randomized initial state for demo
  trend: 'stable',
  description: `Tracking indicators for ${name.toLowerCase()}.`
}));

export const WEEKLY_DATA_MOCK = [
  { day: 'Mon', mood: 65, stress: 40 },
  { day: 'Tue', mood: 58, stress: 55 },
  { day: 'Wed', mood: 72, stress: 30 },
  { day: 'Thu', mood: 45, stress: 70 },
  { day: 'Fri', mood: 60, stress: 50 },
  { day: 'Sat', mood: 85, stress: 20 },
  { day: 'Sun', mood: 80, stress: 25 },
];

export const SUGGESTIONS = [
  "I'm feeling overwhelmed by work lately.",
  "I can't seem to sleep properly.",
  "I just want to talk to someone who listens.",
  "How can I manage my anxiety better?"
];