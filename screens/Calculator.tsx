
import React, { useState, useEffect } from 'react';
import { User, Category, Goal, CURRENCIES } from '../types';
import { db } from '../db';
import { geminiService } from '../services/geminiService';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface CalculatorProps {
  user: User;
  onSave: () => void;
}

export const Calculator: React.FC<CalculatorProps> = ({ user, onSave }) => {
  const [name, setName] = useState('');
  const [cost, setCost] = useState<number | ''>('');
  const [wage, setWage] = useState<number>(user.defaultWage);
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // Search states
  const [aiLoading, setAiLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLinks, setSearchLinks] = useState<any[]>([]);

  const currencySymbol = CURRENCIES.find(c => c.code === user.currency)?.symbol || '$';

  useEffect(() => {
    const fetchData = async () => {
      const cats = await db.categories.where('userId').equals(user.id).toArray();
      setCategories(cats);
      if (cats.length > 0) setCategoryId(cats[0].id);

      const goals = await db.goals.where('userId').equals(user.id).toArray();
      if (goals.length > 0) setGoal(goals[0]);
    };
    fetchData();
  }, [user.id]);

  const effectiveHourlyWage = user.wageType === 'yearly' ? wage / 2080 : wage;
  const monthlyIncome = user.wageType === 'yearly' ? wage / 12 : wage * 166.67;
  
  const computedHours = cost && effectiveHourlyWage > 0 
    ? (Number(cost) / effectiveHourlyWage).toFixed(2) 
    : '0.00';
  
  const incomeImpactPercent = cost && monthlyIncome > 0 
    ? Math.min(100, (Number(cost) / monthlyIncome) * 100) 
    : 0;
  
  const recoveryWorkDays = cost && effectiveHourlyWage > 0
    ? (Number(cost) / (effectiveHourlyWage * 8)).toFixed(1)
    : '0';

  let delayDays = 0;
  if (cost && goal && goal.weeklySavings > 0) {
    const delayWeeks = Number(cost) / goal.weeklySavings;
    delayDays = Math.ceil(delayWeeks * 7);
  }

  const handleSearch = async () => {
    if (!name || name.trim().length < 2) return;
    setAiLoading(true);
    setSearchResults([]);
    setSearchLinks([]);
    try {
      const { results, links } = await geminiService.searchPriceInfo(name, user.currency);
      setSearchResults(results);
      setSearchLinks(links);
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  const selectItem = (item: any) => {
    setName(item.name);
    setCost(item.price);
    setSearchResults([]);
    setSearchLinks([]);
  };

  const handleSave = async () => {
    if (!cost) return;

    const decision = {
      id: crypto.randomUUID(),
      userId: user.id,
      name: name || 'Unspecified Purchase',
      cost: Number(cost),
      hourlyWageUsed: effectiveHourlyWage,
      categoryId,
      computedHours: Number(computedHours),
      computedGoalDelayDays: delayDays,
      createdAt: Date.now()
    };

    await db.decisions.add(decision);
    
    setSavedMessage(`Saved! This purchase costs ${computedHours} hours of your life${delayDays > 0 ? ` and delays your goal by ${delayDays} days.` : '.'}`);
    setTimeout(() => {
      setSavedMessage(null);
      onSave();
    }, 3000);

    setName('');
    setCost('');
  };

  return (
    <div className="p-6 space-y-8">
      <header className="flex items-center space-x-3">
        <div className="flex font-black text-2xl tracking-tighter">
          <span className="brand-text-tru">Tru</span>
          <span className="brand-text-cost">Cost</span>
        </div>
      </header>

      {savedMessage && (
        <div className="bg-brand-green/10 border border-brand-green/30 text-slate-800 p-4 rounded-2xl text-sm animate-bounce shadow-sm font-medium">
          {savedMessage}
        </div>
      )}

      <div className="space-y-4">
        <div className="relative">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Item Name</label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. New Headphones"
              className="flex-1 bg-slate-100 border-none rounded-2xl py-4 px-5 text-lg font-medium focus:ring-2 focus:ring-brand-blue transition-all"
            />
            <button 
              onClick={handleSearch}
              disabled={aiLoading || !name}
              className="bg-brand-blue/10 text-brand-blue w-14 rounded-2xl flex items-center justify-center disabled:opacity-50 active:scale-95 transition-all"
            >
              <MagnifyingGlassIcon className={`w-6 h-6 ${aiLoading ? 'animate-pulse' : ''}`} />
            </button>
          </div>

          {/* Search Results Dropdown - Styled just like Wishlist */}
          {(searchResults.length > 0 || searchLinks.length > 0) && (
            <div className="absolute top-full left-0 right-0 z-[60] mt-2 bg-white rounded-3xl shadow-2xl border border-slate-100 max-h-80 overflow-y-auto no-scrollbar p-2">
              <div className="px-3 py-2 flex justify-between items-center border-b border-slate-50 mb-2">
                <span className="text-[10px] font-black text-brand-blue/60 uppercase tracking-widest">Matches & Sources</span>
                <button onClick={() => { setSearchResults([]); setSearchLinks([]); }}><XMarkIcon className="w-4 h-4 text-brand-blue/40" /></button>
              </div>
              
              <div className="space-y-2">
                {searchResults.map((item, i) => (
                  <button
                    key={`res-${i}`}
                    onClick={() => selectItem(item)}
                    className="w-full text-left bg-slate-50/50 hover:bg-brand-blue/5 p-3 rounded-2xl flex items-center space-x-3 transition-colors border border-slate-50"
                  >
                    {item.imageUrl && (
                      <img src={item.imageUrl} className="w-12 h-12 rounded-xl object-cover bg-slate-200" alt="" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-black text-slate-900 truncate tracking-tight">{item.name}</div>
                      <div className="text-[10px] text-brand-blue font-black uppercase tracking-widest">{currencySymbol}{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                  </button>
                ))}
              </div>

              {searchLinks.length > 0 && (
                <div className="mt-3 p-3 bg-slate-50 rounded-2xl">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Sources</div>
                  <div className="flex flex-wrap gap-2">
                    {searchLinks.map((link, i) => (
                      <a 
                        key={`link-${i}`} 
                        href={link.uri} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[9px] text-brand-blue font-black hover:underline truncate max-w-[150px] uppercase tracking-tighter bg-white px-2 py-1 rounded-lg border border-slate-100"
                      >
                        {link.title || 'Source'}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Cost</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">{currencySymbol}</span>
              <input
                type="number"
                value={cost}
                onChange={(e) => setCost(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0.00"
                className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-10 pr-5 text-lg font-bold focus:ring-2 focus:ring-brand-blue transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">
              Wage ({currencySymbol})
            </label>
            <input
              type="number"
              value={wage}
              onChange={(e) => setWage(Number(e.target.value))}
              className="w-full bg-slate-100 border-none rounded-2xl py-4 px-5 text-lg font-bold focus:ring-2 focus:ring-brand-blue transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full bg-slate-100 border-none rounded-2xl py-4 px-5 text-lg font-medium focus:ring-2 focus:ring-brand-blue transition-all appearance-none"
          >
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="brand-shield-gradient rounded-[2.5rem] p-8 text-white shadow-2xl shadow-brand-blue/20 space-y-6">
        <div className="text-center">
          <div className="text-white/70 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Life Time Value</div>
          <div className="text-6xl font-black tracking-tighter transition-all duration-500 drop-shadow-md">{computedHours}</div>
          <div className="text-white/80 text-sm font-bold mt-1">Total Hours of Work</div>
        </div>

        <div className="grid grid-cols-1 gap-6 pt-4">
          <div className="bg-white/15 rounded-[1.5rem] p-5 backdrop-blur-md border border-white/20">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/90">Monthly Impact</span>
              <span className="text-sm font-black">{incomeImpactPercent.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-black/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-brand-green transition-all duration-700 ease-out rounded-full shadow-[0_0_10px_rgba(124,240,141,0.5)]"
                style={{ width: `${incomeImpactPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-white/70 mt-3 font-bold uppercase tracking-wide">
              {incomeImpactPercent.toFixed(1)}% of your monthly capacity
            </p>
          </div>

          <div className="bg-white/15 rounded-[1.5rem] p-5 backdrop-blur-md border border-white/20">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/90">Recovery Timeline</span>
              <span className="text-sm font-black">{recoveryWorkDays} Days</span>
            </div>
            <div className="flex items-end space-x-1.5 h-12">
              {[...Array(10)].map((_, i) => {
                const dayVal = parseFloat(recoveryWorkDays);
                const isActive = dayVal > i;
                const height = isActive ? (dayVal > i + 1 ? 100 : (dayVal - i) * 100) : 0;
                return (
                  <div key={i} className="flex-1 bg-black/10 rounded-t-lg h-full relative overflow-hidden">
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-brand-orange transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(253,184,19,0.3)]"
                      style={{ height: `${height}%`, transitionDelay: `${i * 50}ms` }}
                    />
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-white/70 mt-3 font-bold uppercase tracking-wide">
              ~{recoveryWorkDays} full work days to recover funds
            </p>
          </div>
        </div>

        {goal && (
          <div className="pt-6 border-t border-white/20 flex flex-col items-center">
            <div className="text-white/70 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Goal Impact</div>
            <div className="text-3xl font-black text-brand-orange drop-shadow-sm">+{delayDays} Days</div>
            <div className="text-white/80 text-xs font-bold mt-1">Delaying "{goal.name}"</div>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={!cost}
          className="w-full bg-white text-brand-blue py-5 px-6 rounded-2xl font-black text-lg shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 uppercase tracking-tight"
        >
          Commit Decision
        </button>
      </div>

      {!goal && (
        <button 
          className="w-full bg-slate-100 p-4 rounded-2xl flex items-center justify-between group active:bg-slate-200 transition-colors"
        >
          <div className="text-sm text-slate-500 font-bold">Want to see goal delays?</div>
          <span className="text-brand-blue font-black text-sm group-hover:translate-x-1 transition-transform">Set a Goal →</span>
        </button>
      )}
    </div>
  );
};
