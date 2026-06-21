import React, { memo, useCallback } from 'react';
import { Leaf, BarChart3, PlusCircle, Award, Database, Sun, Moon, Flame } from 'lucide-react';

interface NavigationHeaderProps {
  activeTab: 'dashboard' | 'log' | 'challenges' | 'data';
  onTabChange: (tab: 'dashboard' | 'log' | 'challenges' | 'data') => void;
  isDarkMode: boolean;
  onThemeToggle: () => void;
  streak: number;
  greenPoints: number;
}

export const NavigationHeader = memo(({
  activeTab,
  onTabChange,
  isDarkMode,
  onThemeToggle,
  streak,
  greenPoints
}: NavigationHeaderProps) => {
  const handleTabClick = useCallback((tab: 'dashboard' | 'log' | 'challenges' | 'data') => {
    onTabChange(tab);
  }, [onTabChange]);

  return (
    <nav className="relative z-20 border-b bg-white/80 backdrop-blur-md sticky top-0 w-full" role="navigation" aria-label="Main navigation">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-600 p-1.5 md:p-2 rounded-lg text-white shadow-sm flex items-center justify-center" aria-hidden="true">
            <Leaf className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" />
          </div>
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-900 line-clamp-1">EcoTrace AI</h1>
        </div>

        <div className="hidden md:flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium overflow-x-auto no-scrollbar pb-1 sm:pb-0" role="tablist">
          <button
            onClick={() => handleTabClick('dashboard')}
            aria-label="Dashboard Analytics"
            aria-selected={activeTab === 'dashboard'}
            role="tab"
            tabIndex={activeTab === 'dashboard' ? 0 : -1}
            className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full transition-colors flex items-center gap-1.5 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-emerald-500 ${activeTab === 'dashboard' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <BarChart3 size={16} aria-hidden="true" /> Analytics
          </button>
          <button
            onClick={() => handleTabClick('log')}
            aria-label="Log Action"
            aria-selected={activeTab === 'log'}
            role="tab"
            tabIndex={activeTab === 'log' ? 0 : -1}
            className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full transition-colors flex items-center gap-1.5 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-emerald-500 ${activeTab === 'log' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <PlusCircle size={16} aria-hidden="true" /> Log Action
          </button>
          <button
            onClick={() => handleTabClick('challenges')}
            aria-label="Challenges"
            aria-selected={activeTab === 'challenges'}
            role="tab"
            tabIndex={activeTab === 'challenges' ? 0 : -1}
            className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full transition-colors flex items-center gap-1.5 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-emerald-500 ${activeTab === 'challenges' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Award size={16} aria-hidden="true" /> Challenges
          </button>
          <button
            onClick={() => handleTabClick('data')}
            aria-label="Data Sync"
            aria-selected={activeTab === 'data'}
            role="tab"
            tabIndex={activeTab === 'data' ? 0 : -1}
            className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full transition-colors flex items-center gap-1.5 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-emerald-500 ${activeTab === 'data' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Database size={16} aria-hidden="true" /> Data
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-3 min-w-max">
          <button
            onClick={onThemeToggle}
            className="p-1.5 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <div className="flex items-center gap-1.5 bg-orange-50 px-3 py-1 rounded-full border border-orange-100 text-sm">
            <Flame size={14} className="text-orange-500" fill="currentColor" />
            <span className="font-bold text-orange-700">{streak} Day{streak !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 text-sm">
            <Leaf size={14} className="text-emerald-500" />
            <span className="font-bold text-emerald-700">{greenPoints} pts</span>
          </div>
        </div>
      </div>
    </nav>
  );
});

NavigationHeader.displayName = 'NavigationHeader';
