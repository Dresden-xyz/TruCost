
import React, { useState, useEffect } from 'react';
import { User, Decision, Category, CURRENCIES } from '../types';
import { db } from '../db';
import { format } from 'date-fns';

interface HistoryProps {
  user: User;
}

export const History: React.FC<HistoryProps> = ({ user }) => {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [categories, setCategories] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState('all');

  const currencySymbol = CURRENCIES.find(c => c.code === user.currency)?.symbol || '$';

  useEffect(() => {
    const fetchData = async () => {
      const data = await db.decisions.where('userId').equals(user.id).reverse().sortBy('createdAt');
      setDecisions(data);

      const cats = await db.categories.where('userId').equals(user.id).toArray();
      const catMap = cats.reduce((acc, cat) => ({ ...acc, [cat.id]: cat.name }), {});
      setCategories(catMap);
    };
    fetchData();
  }, [user.id]);

  const filteredDecisions = filter === 'all' 
    ? decisions 
    : decisions.filter(d => d.categoryId === filter);

  return (
    <div className="p-6 space-y-6">
      <header className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">History</h2>
        <select 
          className="bg-slate-100 border-none rounded-xl text-[10px] font-black text-slate-500 py-2 px-3 uppercase tracking-widest focus:ring-2 focus:ring-brand-blue"
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Categories</option>
          {Object.entries(categories).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
      </header>

      {filteredDecisions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-slate-900 font-black uppercase tracking-widest text-sm">No history yet</h3>
            <p className="text-slate-400 text-xs font-medium mt-1">Decisions you save will appear here.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDecisions.map((decision) => (
            <div key={decision.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center space-x-4 hover:border-brand-blue/20 transition-colors">
              <div className="w-14 h-14 bg-brand-blue/10 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                <span className="text-brand-blue font-black text-xs leading-none">{decision.computedHours}h</span>
                <span className="text-[8px] font-black text-brand-blue/60 uppercase tracking-tighter mt-1">worked</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-black text-slate-800 truncate tracking-tight">{decision.name}</h4>
                <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-black uppercase tracking-widest">
                  <span className="text-brand-blue/70">{categories[decision.categoryId]}</span>
                  <span>•</span>
                  <span>{format(decision.createdAt, 'MMM d, yyyy')}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-black text-slate-900">{currencySymbol}{decision.cost.toLocaleString()}</div>
                {decision.computedGoalDelayDays > 0 && (
                  <div className="text-[10px] text-brand-orange font-black uppercase tracking-widest">+{decision.computedGoalDelayDays}d delay</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
