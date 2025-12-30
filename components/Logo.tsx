
import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true }) => {
  const sizeMap = {
    sm: { shield: 'w-10 h-10', text: 'text-xl' },
    md: { shield: 'w-20 h-20', text: 'text-4xl' },
    lg: { shield: 'w-32 h-32', text: 'text-6xl' }
  };

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Shield Logo */}
      <div className={`${sizeMap[size].shield} relative flex items-center justify-center`}>
        {/* Shield Shape via SVG */}
        <svg viewBox="0 0 100 120" className="absolute inset-0 w-full h-full drop-shadow-xl">
          <defs>
            <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7CF08D" />
              <stop offset="50%" stopColor="#48C6EF" />
              <stop offset="100%" stopColor="#5D8DFE" />
            </linearGradient>
          </defs>
          <path 
            d="M50 0 L10 15 V50 C10 80 50 110 50 115 C50 110 90 80 90 50 V15 L50 0 Z" 
            fill="url(#shieldGrad)" 
          />
        </svg>
        
        {/* Inner Content: Dollar + Clock */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Dollar Sign */}
          <span className="text-white font-black text-xl leading-none mb-1 shadow-sm">$</span>
          
          {/* Clock Circle */}
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border-2 border-slate-100 shadow-inner overflow-hidden relative">
            {/* Clock ticks (simplified) */}
            <div className="absolute inset-0 border border-slate-200/50 rounded-full"></div>
            
            {/* Orange Impact Slice */}
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full rotate-[-45deg]">
              <path d="M50 50 L50 5 A45 45 0 0 1 85 25 Z" fill="#FDB813" />
            </svg>

            {/* Blue Hands */}
            <div className="absolute w-[2px] h-4 bg-brand-blue bottom-1/2 left-1/2 -translate-x-1/2 origin-bottom rotate-45"></div>
            <div className="absolute w-[2px] h-3 bg-brand-blue bottom-1/2 left-1/2 -translate-x-1/2 origin-bottom rotate-[-30deg]"></div>
            <div className="w-1.5 h-1.5 bg-brand-blue rounded-full z-20"></div>
          </div>
        </div>
      </div>

      {/* Branding Text */}
      {showText && (
        <div className={`${sizeMap[size].text} font-black mt-4 flex tracking-tight`}>
          <span className="brand-text-tru">Tru</span>
          <span className="brand-text-cost">Cost</span>
        </div>
      )}
    </div>
  );
};
