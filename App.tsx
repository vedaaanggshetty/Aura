import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { Landing } from './components/Landing';
import ChatInterface from './components/ChatInterface';
import { EmotionDashboard } from './components/EmotionDashboard';
import { VisionCapture } from './components/VisionCapture';
import { AppRoute } from './types';
import { ThemeProvider } from './components/ThemeProvider';
import { AuthProvider } from './components/AuthContext';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <HashRouter>
          <div className="min-h-screen bg-background text-textMain font-sans selection:bg-primary/20 transition-colors duration-700 ease-in-out flex flex-col">
            <Navigation />
            
            <div className="flex-1">
              <Routes>
                <Route path={AppRoute.LANDING} element={<Landing />} />
                <Route path={AppRoute.CHAT} element={<ChatInterface />} />
                <Route path={AppRoute.DASHBOARD} element={<EmotionDashboard />} />
                <Route path={AppRoute.VISION} element={<VisionCapture />} />
                <Route path="*" element={<Navigate to={AppRoute.LANDING} replace />} />
              </Routes>
            </div>
          </div>
        </HashRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;