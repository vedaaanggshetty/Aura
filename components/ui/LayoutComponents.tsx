import React, { ButtonHTMLAttributes, InputHTMLAttributes } from 'react';
import { motion } from 'framer-motion';

export const GlassCard: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = '' }) => (
  <div 
    className={`glass-panel rounded-2xl p-8 ${className}`}
  >
    {children}
  </div>
);

export const Button: React.FC<ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'tidal' }> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}) => {
  
  // Editorial Button Styles
  // No sharp gradients. No "tech" glows.
  // Concept: Heavy paper, soft shadows, tactile.

  const baseStyle = "relative overflow-hidden px-8 py-4 rounded-xl font-medium tracking-wide transition-all duration-500 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group";
  
  const variants = {
    // Primary: Dark stone, soft shadow. Reassuring.
    primary: `
      bg-textMain text-background
      shadow-[0_4px_14px_-2px_rgba(0,0,0,0.1)]
      hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.15)]
      hover:-translate-y-[1px]
      active:scale-[0.99]
    `,
    // Tidal: For key actions. Slow breathing animation implied by hover.
    tidal: `
      bg-surface border border-borderDim text-textMain
      shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)]
      hover:bg-white hover:border-transparent
      hover:shadow-[0_12px_24px_-6px_rgba(0,0,0,0.08)]
      hover:-translate-y-[2px]
      transition-all duration-700 ease-out
    `,
    // Secondary: Muted, blends in.
    secondary: `
      bg-transparent border border-borderDim text-textSec
      hover:bg-surface hover:text-textMain
      hover:border-textMain/20
    `,
    // Ghost: Text only.
    ghost: `
      bg-transparent text-textSec 
      hover:text-textMain hover:bg-surface/50
    `
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      <span className="relative z-10 flex items-center gap-2 font-medium">{children}</span>
    </button>
  );
};

export const Input = React.forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => (
    <div className="relative group w-full">
      <input 
        ref={ref}
        className={`
          w-full bg-transparent border-b border-borderDim px-0 py-4
          text-textMain text-lg placeholder-textMuted/60
          focus:outline-none focus:border-textMain/50
          transition-all duration-500 ease-out
          font-light
          ${className}
        `}
        {...props}
      />
    </div>
  )
);

Input.displayName = 'Input';