import React, { useEffect, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';
import { GlassCard } from './ui/LayoutComponents';
import { useTheme } from './ThemeProvider';
import { useUser } from './AuthContext';
import { journalStore } from '../services/journalStore';
import { analysisEngine, AnalysisResult } from '../services/analysisEngine';
import { chatHistoryStore } from '../services/chatHistoryStore';

export const EmotionDashboard: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useUser();
  const [analytics, setAnalytics] = useState<AnalysisResult | null>(null);

  // Load real data when user is available
  useEffect(() => {
    if (user?.id) {
      const loadData = () => {
        try {
          // Get journal entries and chat messages
          const journalEntries = journalStore.getRecentEntries(user.id, 50);
          const conversations = chatHistoryStore.getConversations();
          const allMessages = conversations.flatMap(conv => conv.messages);
          
          // Analyze using the new analysis engine
          const analysisResult = analysisEngine.analyze(journalEntries, allMessages);
          setAnalytics(analysisResult);
          
        } catch (error) {
          console.error("Failed to load analytics", error);
          // Use default result on error
          setAnalytics(analysisEngine.analyze([], []));
        }
      };

      // Initial load
      loadData();
      
      // Subscribe to chat history changes for real-time updates
      const unsubscribe = chatHistoryStore.subscribe(loadData);
      
      return unsubscribe;
    }
  }, [user?.id]);
  
  // Refined Chart Colors
  const chartColors = theme === 'dark' ? {
    grid: '#222',
    text: '#666',
    tooltipBg: '#1a1a1a',
    tooltipBorder: '#333',
    tooltipText: '#fff',
    moodLine: '#818cf8',
    stressLine: '#f472b6',
    radarGrid: '#333',
    radarFill: '#818cf8'
  } : {
    grid: '#eee',
    text: '#999',
    tooltipBg: '#fff',
    tooltipBorder: '#eee',
    tooltipText: '#333',
    moodLine: '#6366f1',
    stressLine: '#ec4899',
    radarGrid: '#e5e5e5',
    radarFill: '#6366f1'
  };

  return (
    <div className="pt-28 pb-12 px-4 max-w-7xl mx-auto space-y-8 bg-background transition-colors duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-serif italic text-textMain mb-2">Resonance</h1>
          <p className="text-textSec font-light">
            {analytics ? `Your emotional patterns: ${analytics.status.overall}` : 'Analyzing your emotional baseline over 7 days.'}
          </p>
          {analytics?.status.explanation && (
            <p className="text-textMuted text-sm mt-2 max-w-2xl">
              {analytics.status.explanation}
            </p>
          )}
        </div>
      </div>

      {!analytics ? (
        <GlassCard className="h-[400px] flex items-center justify-center">
          <p className="text-textSec">Building your emotional baseline...</p>
        </GlassCard>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Mood Trend Chart */}
            <GlassCard className="h-[450px]">
              <h3 className="text-lg font-medium text-textMain mb-8">Mood & Stress Correlation</h3>
              <ResponsiveContainer width="100%" height="85%">
                <LineChart data={analytics.weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                  <XAxis 
                    dataKey="day" 
                    stroke={chartColors.text} 
                    tick={{ fill: chartColors.text, fontSize: 12 }} 
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke={chartColors.text} 
                    tick={{ fill: chartColors.text, fontSize: 12 }} 
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: chartColors.tooltipBg, 
                      borderColor: chartColors.tooltipBorder,
                      borderRadius: '16px',
                      boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)',
                      padding: '12px 16px'
                    }}
                    itemStyle={{ color: chartColors.tooltipText, fontSize: '13px' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="mood" 
                    stroke={chartColors.moodLine} 
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 0 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="stress" 
                    stroke={chartColors.stressLine} 
                    strokeWidth={3}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </GlassCard>

            {/* Detailed Pattern Grid */}
            <GlassCard className="h-[450px] overflow-y-auto">
              <h3 className="text-lg font-medium text-textMain mb-6">Active Markers</h3>
              <div className="grid grid-cols-1 gap-3">
                {analytics.patterns.map((pattern, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-surface/50 border border-borderDim hover:bg-surface transition-colors">
                    <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center text-xs font-bold text-textMain border border-borderDim">
                      {Math.round(pattern.score)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-textMain">{pattern.name}</span>
                        <span className="text-xs text-textMuted uppercase tracking-wider">{pattern.trend}</span>
                      </div>
                      <div className="w-full h-1.5 bg-borderDim rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            pattern.score > 70 ? 'bg-warmth' : pattern.score > 40 ? 'bg-primary/60' : 'bg-primary'
                          }`}
                          style={{ width: `${pattern.score}%` }}
                        />
                      </div>
                      {pattern.explanation && (
                        <p className="text-xs text-textMuted mt-2 leading-relaxed">
                          {pattern.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Pentagon Mood Heatmap */}
          <GlassCard className="h-[500px] flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-8 left-8">
              <h3 className="text-lg font-medium text-textMain">Equilibrium State</h3>
              <p className="text-sm text-textSec mt-1">Holistic balance across five dimensions.</p>
            </div>

            <div className="w-full h-full max-w-2xl mt-8">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={analytics.balanceMetrics}>
                  <PolarGrid gridType="polygon" stroke={chartColors.radarGrid} />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    tick={{ fill: chartColors.text, fontSize: 14, fontWeight: 500 }} 
                  />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="Balance"
                    dataKey="A"
                    stroke={chartColors.radarFill}
                    strokeWidth={2}
                    fill={chartColors.radarFill}
                    fillOpacity={0.3}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: chartColors.tooltipBg, 
                      borderColor: chartColors.tooltipBorder,
                      borderRadius: '12px',
                      color: chartColors.tooltipText
                    }}
                    itemStyle={{ color: chartColors.tooltipText }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
};