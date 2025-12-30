
import React, { useState, useEffect, useMemo } from 'react';
import { User, Goal, Decision, CURRENCIES } from '../types';
import { db } from '../db';
import { addDays, format, differenceInWeeks } from 'date-fns';
import { geminiService } from '../services/geminiService';
import { PlayIcon, SparklesIcon } from '@heroicons/react/24/solid';

interface GoalsProps {
  user: User;
}

export const Goals: React.FC<GoalsProps> = ({ user }) => {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [topDelays, setTopDelays] = useState<Decision[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [target, setTarget] = useState<number | ''>('');
  const [start, setStart] = useState<number | ''>(0);
  const [weekly, setWeekly] = useState<number | ''>('');

  const currencySymbol = CURRENCIES.find(c => c.code === user.currency)?.symbol || '$';

  useEffect(() => {
    const fetchData = async () => {
      const goals = await db.goals.where('userId').equals(user.id).toArray();
      if (goals.length > 0) {
        setGoal(goals[0]);
        setName(goals[0].name);
        setTarget(goals[0].targetAmount);
        setStart(goals[0].startingAmount);
        setWeekly(goals[0].weeklySavings);

        const delays = await db.decisions
          .where('userId').equals(user.id)
          .reverse()
          .sortBy('computedGoalDelayDays');
        setTopDelays(delays.filter(d => d.computedGoalDelayDays > 0).slice(0, 3));
      } else {
        setIsEditing(true);
      }
    };
    fetchData();
  }, [user.id]);

  const handleSaveGoal = async () => {
    if (!name || !target || !weekly) return;

    const newGoal: Goal = {
      id: goal?.id || crypto.randomUUID(),
      userId: user.id,
      name,
      targetAmount: Number(target),
      startingAmount: Number(start),
      weeklySavings: Number(weekly),
      createdAt: goal?.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    if (goal) {
      await db.goals.update(goal.id, newGoal);
    } else {
      await db.goals.add(newGoal);
    }
    setGoal(newGoal);
    setIsEditing(false);
    setVideoUrl(null); // Reset video on goal update
  };

  const timeline = useMemo(() => {
    if (!goal) return null;
    const remaining = goal.targetAmount - goal.startingAmount;
    if (remaining <= 0) return { percent: 100, completionDate: new Date(), remaining: 0 };
    
    const weeksToCompletion = Math.ceil(remaining / goal.weeklySavings);
    const completionDate = addDays(new Date(), weeksToCompletion * 7);
    const percent = Math.min(100, Math.floor((goal.startingAmount / goal.targetAmount) * 100));
    
    return { percent, completionDate, remaining };
  }, [goal]);

  const handleGenerateVideo = async () => {
    if (!goal) return;
    setIsGenerating(true);
    try {
      const url = await geminiService.generateGoalTimelineVideo(goal.name);
      setVideoUrl(url);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 space-y-8">
      <header className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Savings Goal</h2>
        {goal && (
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="text-brand-blue font-black text-sm uppercase tracking-wide"
          >
            {isEditing ? 'Cancel' : 'Edit Goal'}
          </button>
        )}
      </header>

      {isEditing ? (
        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-xl space-y-5">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Goal Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dream Vacation"
              className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-medium focus:ring-2 focus:ring-brand-blue"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Target ({currencySymbol})</label>
              <input
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="5000"
                className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-2 focus:ring-brand-blue"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Starting ({currencySymbol})</label>
              <input
                type="number"
                value={start}
                onChange={(e) => setStart(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-2 focus:ring-brand-blue"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Weekly Savings ({currencySymbol})</label>
            <input
              type="number"
              value={weekly}
              onChange={(e) => setWeekly(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="100"
              className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-2 focus:ring-brand-blue"
            />
          </div>
          <button
            onClick={handleSaveGoal}
            className="w-full bg-brand-blue text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-brand-blue/20 active:scale-95 transition-all uppercase"
          >
            Save Primary Goal
          </button>
        </div>
      ) : goal && timeline ? (
        <div className="space-y-8">
          {/* Main Visual Header */}
          <div className="relative rounded-[3rem] overflow-hidden shadow-2xl shadow-brand-blue/20 bg-slate-900 aspect-video group">
            {videoUrl ? (
              <video 
                src={videoUrl} 
                autoPlay 
                loop 
                muted 
                playsInline 
                className="w-full h-full object-cover opacity-60"
              />
            ) : (
              <div className="absolute inset-0 brand-shield-gradient opacity-90"></div>
            )}
            
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-white">
              <h3 className="text-xl font-black mb-1 uppercase tracking-widest drop-shadow-lg">{goal.name}</h3>
              <div className="text-5xl font-black tracking-tighter drop-shadow-xl mb-4">
                {timeline.percent}%
              </div>
              
              {!videoUrl && (
                <button 
                  onClick={handleGenerateVideo}
                  disabled={isGenerating}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  <SparklesIcon className="w-4 h-4 text-brand-orange" />
                  <span>{isGenerating ? 'Visualizing...' : 'Visualize Your Success'}</span>
                </button>
              )}
            </div>

            {/* Floating Info */}
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-white/90">
              <div className="bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full">ETA: {format(timeline.completionDate, 'MMM yyyy')}</div>
              <div className="bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full">{currencySymbol}{goal.targetAmount.toLocaleString()} Target</div>
            </div>
          </div>

          {/* New Animated SVG Timeline */}
          <section className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Savings Path</span>
              <span className="text-xs font-black text-brand-blue">{currencySymbol}{goal.weeklySavings}/week</span>
            </div>
            
            <div className="relative py-4">
              {/* SVG Timeline Path */}
              <svg width="100%" height="80" viewBox="0 0 400 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 40C10 40 100 10 200 40C300 70 390 40 390 40" stroke="#F1F5F9" strokeWidth="8" strokeLinecap="round" />
                <path 
                  d="M10 40C10 40 100 10 200 40C300 70 390 40 390 40" 
                  stroke="url(#pathGrad)" 
                  strokeWidth="8" 
                  strokeLinecap="round" 
                  strokeDasharray="400"
                  strokeDashoffset={400 - (400 * (timeline.percent / 100))}
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="pathGrad" x1="0" y1="0" x2="400" y2="0">
                    <stop offset="0%" stopColor="#7CF08D" />
                    <stop offset="100%" stopColor="#5D8DFE" />
                  </linearGradient>
                </defs>
                
                {/* Start Point */}
                <circle cx="10" cy="40" r="4" fill="#7CF08D" />
                
                {/* Target Point */}
                <circle cx="390" cy="40" r="6" fill="#5D8DFE" className="animate-pulse" />
                
                {/* Progress Marker */}
                <g style={{ transform: `translate(${(380 * (timeline.percent / 100))}px, 0)` }} className="transition-all duration-1000">
                  <circle cx="10" cy="40" r="8" fill="white" stroke="#5D8DFE" strokeWidth="3" />
                </g>
              </svg>
              
              <div className="flex justify-between text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mt-2">
                <span>Today</span>
                <span>Destination</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-slate-50 rounded-2xl">
                <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Saved</div>
                <div className="text-xl font-black text-slate-900">{currencySymbol}{goal.startingAmount.toLocaleString()}</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-2xl">
                <div className="text-[9px] font-black text-slate-400 uppercase mb-1">To Go</div>
                <div className="text-xl font-black text-brand-blue">{currencySymbol}{timeline.remaining.toLocaleString()}</div>
              </div>
            </div>
          </section>

          {/* Timeline Impact Visual */}
          <section className="space-y-5">
            <div className="flex items-center space-x-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Timeline Impacts</span>
              <div className="h-[2px] bg-slate-100 flex-1 rounded-full"></div>
            </div>

            {topDelays.length > 0 ? (
              <div className="space-y-3">
                {topDelays.map(delay => (
                  <div key={delay.id} className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-brand-blue/30 transition-colors">
                    <div>
                      <div className="font-black text-slate-800 tracking-tight">{delay.name}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{currencySymbol}{delay.cost.toLocaleString()} Purchase</div>
                    </div>
                    <div className="text-right">
                      <div className="text-brand-orange font-black text-lg drop-shadow-sm">+{delay.computedGoalDelayDays} Days</div>
                      <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Goal Delay</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-400 font-medium bg-slate-50 p-6 rounded-2xl text-center border border-dashed border-slate-200">
                No purchase impacts recorded yet.
              </div>
            )}
          </section>

          <div className="bg-brand-blue/5 p-8 rounded-[2.5rem] border border-brand-blue/10 text-center">
            <p className="text-slate-500 text-sm leading-relaxed mb-2 font-medium uppercase tracking-wide">
              Saving <span className="text-brand-blue font-black">{currencySymbol}{goal.weeklySavings}</span> / week
            </p>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest opacity-70">
              Target hit in <span className="text-brand-blue font-black">{differenceInWeeks(timeline.completionDate, new Date())} weeks</span>
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 animate-pulse">
          <p className="text-slate-400 font-black uppercase tracking-widest">Calculating...</p>
        </div>
      )}
    </div>
  );
};
