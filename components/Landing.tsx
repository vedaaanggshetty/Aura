import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Feather, Shield, Wind } from 'lucide-react';
import { Button } from './ui/LayoutComponents';
import { AppRoute } from '../types';

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef(null);

  return (
    <div ref={containerRef} className="min-h-screen relative flex flex-col bg-background selection:bg-textMain/10">
      
      {/* Subtle Ambient Light - No blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-[60vh] bg-gradient-to-b from-surface/80 to-transparent opacity-60" />
      </div>

      {/* Hero Section */}
      <main className="flex-grow container mx-auto px-6 flex flex-col items-center justify-center relative z-10 pt-24 pb-16">
        <div 
          className="max-w-3xl mx-auto text-center space-y-12"
        >
          {/* Badge */}
          <div 
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-borderDim bg-surface/50 backdrop-blur-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-textSec/50"></span>
            <span className="text-xs font-medium tracking-widest text-textSec uppercase">A Quiet Space</span>
          </div>

          {/* Headline - Editorial Typography */}
          <h1 
            className="text-6xl md:text-8xl font-serif text-textMain leading-[1.1] tracking-tight"
          >
            Find clarity<br/>
            <span className="text-textSec/80 italic font-light">in the noise.</span>
          </h1>

          {/* Subtext */}
          <p 
            className="text-xl text-textSec max-w-xl mx-auto leading-relaxed font-light"
          >
            Aura is a private sanctuary for your mind. Journal freely, analyze patterns, and recover your balance.
          </p>

          {/* Actions */}
          <div 
            className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6"
          >
            <Button 
              variant="primary"
              onClick={() => navigate(AppRoute.CHAT)}
              className="w-full sm:w-auto h-14 text-lg px-10 rounded-xl"
            >
              Start Journaling
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => navigate(AppRoute.VISION)}
              className="w-full sm:w-auto h-14 text-lg text-textSec hover:text-textMain"
            >
              Vision Mode <ArrowRight className="w-4 h-4 ml-2 opacity-50" />
            </Button>
          </div>
        </div>
      </main>

      {/* Feature Section - Minimalist Cards */}
      <div className="relative z-10 py-32 border-t border-borderDim/50 bg-surface/30">
        <div className="container mx-auto px-6">
           <div className="grid md:grid-cols-3 gap-16 max-w-6xl mx-auto">
              {[
                { 
                  icon: Shield, 
                  title: "Private & Encrypted", 
                  desc: "Your thoughts are personal. We use local encryption to ensure your data never leaves your control." 
                },
                { 
                  icon: Feather, 
                  title: "Gentle Guidance", 
                  desc: "No bots, no robotic answers. Just a calm, supportive presence to help you untangle your mind." 
                },
                { 
                  icon: Wind, 
                  title: "Emotional Clarity", 
                  desc: "Identify patterns in your mood and behavior with passive, privacy-first analysis." 
                }
              ].map((feature, idx) => (
                <div 
                  key={idx} 
                  className="space-y-8"
                >
                  <div className="w-10 h-10 rounded-full bg-surface border border-borderDim flex items-center justify-center text-textMain shadow-sm">
                    <feature.icon strokeWidth={1.2} size={20} />
                  </div>
                  <h3 className="text-xl font-medium text-textMain font-serif">{feature.title}</h3>
                  <p className="text-textSec leading-relaxed font-light">{feature.desc}</p>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};