
import React from 'react';
import { 
  CalculatorIcon, 
  SparklesIcon, 
  FlagIcon, 
  ClockIcon, 
  Cog6ToothIcon 
} from '@heroicons/react/24/outline';
import { 
  CalculatorIcon as CalculatorIconSolid, 
  SparklesIcon as SparklesIconSolid, 
  FlagIcon as FlagIconSolid, 
  ClockIcon as ClockIconSolid, 
  Cog6ToothIcon as Cog6ToothIconSolid 
} from '@heroicons/react/24/solid';

type Screen = 'calculate' | 'wishlist' | 'goals' | 'history' | 'settings';

interface LayoutProps {
  activeScreen: Screen;
  setActiveScreen: (screen: Screen) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ activeScreen, setActiveScreen, children }) => {
  const navItems = [
    { id: 'calculate', label: 'Impact', Icon: CalculatorIcon, ActiveIcon: CalculatorIconSolid },
    { id: 'wishlist', label: 'Wishlist', Icon: SparklesIcon, ActiveIcon: SparklesIconSolid },
    { id: 'goals', label: 'Goals', Icon: FlagIcon, ActiveIcon: FlagIconSolid },
    { id: 'history', label: 'History', Icon: ClockIcon, ActiveIcon: ClockIconSolid },
    { id: 'settings', label: 'Settings', Icon: Cog6ToothIcon, ActiveIcon: Cog6ToothIconSolid },
  ];

  return (
    <div className="flex flex-col h-screen w-full max-w-md mx-auto bg-white overflow-hidden shadow-2xl relative">
      {/* Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 px-2 pb-safe z-50">
        <div className="flex justify-around items-center h-16">
          {navItems.map(({ id, label, Icon, ActiveIcon }) => {
            const isActive = activeScreen === id;
            return (
              <button
                key={id}
                onClick={() => setActiveScreen(id as Screen)}
                className={`flex flex-col items-center justify-center w-full space-y-1 transition-all duration-300 ${
                  isActive ? 'text-brand-blue' : 'text-slate-400'
                }`}
              >
                <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}>
                  {isActive ? <ActiveIcon className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
