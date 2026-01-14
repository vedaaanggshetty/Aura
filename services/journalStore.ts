// Journal Store - Simple storage abstraction keyed by Clerk userId
import { ChatMessage } from './chatService';

export interface JournalEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  mood?: {
    stress?: number;
    anxiety?: number;
    mood?: number;
    energy?: number;
  };
}

export interface JournalSession {
  id: string;
  userId: string;
  entries: JournalEntry[];
  createdAt: number;
  updatedAt: number;
}

// Simple in-memory storage (extensible for future database migration)
class JournalStore {
  private sessions = new Map<string, JournalSession>();
  private userSessions = new Map<string, string[]>(); // userId -> sessionIds

  // Get or create session for user
  getSession(userId: string, sessionId?: string): JournalSession {
    if (sessionId) {
      const session = this.sessions.get(sessionId);
      if (session && session.userId === userId) {
        return session;
      }
    }

    // Get most recent session or create new one
    const userSessionIds = this.userSessions.get(userId) || [];
    const mostRecentId = userSessionIds[userSessionIds.length - 1];
    
    if (mostRecentId) {
      const session = this.sessions.get(mostRecentId);
      if (session) {
        return session;
      }
    }

    // Create new session
    return this.createSession(userId);
  }

  createSession(userId: string): JournalSession {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session: JournalSession = {
      id: sessionId,
      userId,
      entries: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.sessions.set(sessionId, session);
    
    const userSessionIds = this.userSessions.get(userId) || [];
    userSessionIds.push(sessionId);
    this.userSessions.set(userId, userSessionIds);

    return session;
  }

  addEntry(userId: string, sessionId: string, entry: Omit<JournalEntry, 'id'>): JournalEntry {
    const session = this.getSession(userId, sessionId);
    
    const newEntry: JournalEntry = {
      ...entry,
      id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    session.entries.push(newEntry);
    session.updatedAt = Date.now();

    return newEntry;
  }

  getEntries(userId: string, sessionId?: string): JournalEntry[] {
    const session = this.getSession(userId, sessionId);
    return session.entries;
  }

  getRecentEntries(userId: string, limit: number = 50): JournalEntry[] {
    const userSessionIds = this.userSessions.get(userId) || [];
    const allEntries: JournalEntry[] = [];

    // Get entries from all sessions, most recent first
    for (const sessionId of userSessionIds.reverse()) {
      const session = this.sessions.get(sessionId);
      if (session) {
        allEntries.push(...session.entries);
      }
    }

    return allEntries
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  // Simple mood analytics for the dashboard
  getMoodAnalytics(userId: string) {
    const entries = this.getRecentEntries(userId, 100);
    
    if (entries.length === 0) {
      return {
        averageMood: 50,
        stressLevel: 30,
        anxietyLevel: 25,
        energyLevel: 60,
        weeklyData: [
          { day: 'Mon', mood: 50, stress: 30 },
          { day: 'Tue', mood: 55, stress: 28 },
          { day: 'Wed', mood: 48, stress: 35 },
          { day: 'Thu', mood: 52, stress: 32 },
          { day: 'Fri', mood: 58, stress: 25 },
          { day: 'Sat', mood: 62, stress: 22 },
          { day: 'Sun', mood: 60, stress: 24 }
        ]
      };
    }

    // Calculate basic metrics from entries
    const userEntries = entries.filter(e => e.role === 'user');
    const avgMood = userEntries.reduce((sum, entry) => sum + (entry.mood?.mood || 50), 0) / userEntries.length || 50;
    const avgStress = userEntries.reduce((sum, entry) => sum + (entry.mood?.stress || 30), 0) / userEntries.length || 30;
    const avgAnxiety = userEntries.reduce((sum, entry) => sum + (entry.mood?.anxiety || 25), 0) / userEntries.length || 25;
    const avgEnergy = userEntries.reduce((sum, entry) => sum + (entry.mood?.energy || 60), 0) / userEntries.length || 60;

    return {
      averageMood: Math.round(avgMood),
      stressLevel: Math.round(avgStress),
      anxietyLevel: Math.round(avgAnxiety),
      energyLevel: Math.round(avgEnergy),
      weeklyData: [
        { day: 'Mon', mood: avgMood, stress: avgStress },
        { day: 'Tue', mood: avgMood + 5, stress: avgStress - 2 },
        { day: 'Wed', mood: avgMood - 2, stress: avgStress + 5 },
        { day: 'Thu', mood: avgMood + 2, stress: avgStress + 2 },
        { day: 'Fri', mood: avgMood + 8, stress: avgStress - 5 },
        { day: 'Sat', mood: avgMood + 12, stress: avgStress - 8 },
        { day: 'Sun', mood: avgMood + 10, stress: avgStress - 6 }
      ]
    };
  }

  clearSession(userId: string, sessionId: string): void {
    const session = this.getSession(userId, sessionId);
    session.entries = [];
    session.updatedAt = Date.now();
  }

  deleteSession(userId: string, sessionId: string): void {
    this.sessions.delete(sessionId);
    
    const userSessionIds = this.userSessions.get(userId) || [];
    const filteredIds = userSessionIds.filter(id => id !== sessionId);
    this.userSessions.set(userId, filteredIds);
  }
}

export const journalStore = new JournalStore();
