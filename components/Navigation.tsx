import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Activity, Camera, MessageCircle, Menu, X, Sun, Moon, LogIn, Feather } from 'lucide-react';
import { AppRoute } from '../types';
import { useTheme } from './ThemeProvider';
import { useUser, UserButton, SignInButton } from './AuthContext';

export const Navigation: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { isSignedIn, user } = useUser();

  const navItems = [
    { name: 'Analysis', icon: Activity, path: AppRoute.DASHBOARD },
    { name: 'Vision', icon: Camera, path: AppRoute.VISION },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-700 bg-background/80 backdrop-blur-md border-b border-borderDim">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo Area */}
          <NavLink to={AppRoute.LANDING} className="flex items-center gap-3 group opacity-90 hover:opacity-100 transition-opacity">
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-textMain text-background">
               <span className="font-serif italic font-bold text-lg leading-none pt-1">A</span>
            </div>
            <span className="text-lg font-medium tracking-tight text-textMain font-serif">
              Aura
            </span>
          </NavLink>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            
            {/* Primary Action (Chat) */}
            <NavLink
              to={AppRoute.CHAT}
              className={({ isActive }) => `
                flex items-center gap-2 text-sm font-medium transition-all duration-500
                ${isActive 
                  ? 'text-textMain' 
                  : 'text-textSec hover:text-textMain'}
              `}
            >
              Journal
            </NavLink>

            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `
                  flex items-center gap-2 text-sm font-medium transition-colors duration-500
                  ${isActive ? 'text-textMain' : 'text-textSec hover:text-textMain'}
                `}
              >
                {item.name}
              </NavLink>
            ))}

            <div className="w-px h-4 bg-borderDim"></div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-textSec hover:text-textMain transition-colors"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Auth Buttons */}
            {isSignedIn ? (
              <div className="pl-2">
                 <UserButton afterSignOutUrl="/" />
              </div>
            ) : (
              <SignInButton mode="modal">
                <button className="text-sm font-medium text-textMain hover:opacity-70 transition-opacity">
                  Sign In
                </button>
              </SignInButton>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center gap-4">
             <button
              onClick={toggleTheme}
              className="p-2 text-textSec"
            >
               {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-textMain"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      {isOpen && (
        <div className="md:hidden border-t border-borderDim bg-background absolute w-full z-40 h-screen">
          <div className="px-6 pt-8 space-y-6">
             <NavLink
                to={AppRoute.CHAT}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 text-2xl font-serif text-textMain"
              >
                Journal
              </NavLink>
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 text-2xl font-serif text-textSec"
              >
                {item.name}
              </NavLink>
            ))}
            
            <div className="pt-8 border-t border-borderDim mt-8">
               {isSignedIn ? (
                 <div className="flex items-center gap-3">
                    <UserButton />
                    <span className="text-lg font-medium text-textMain">{user?.fullName}</span>
                 </div>
               ) : (
                 <SignInButton mode="modal">
                   <button className="w-full py-4 rounded-xl bg-textMain text-background font-medium text-lg">
                     Sign In
                   </button>
                 </SignInButton>
               )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};