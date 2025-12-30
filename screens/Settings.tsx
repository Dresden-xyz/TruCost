
import React, { useState, useEffect } from 'react';
import { User, Category, WageType, CURRENCIES } from '../types';
import { db } from '../db';

interface SettingsProps {
  user: User;
  onLogout: () => void;
  onUserUpdate: (user: User) => void;
}

export const Settings: React.FC<SettingsProps> = ({ user, onLogout, onUserUpdate }) => {
  const [wage, setWage] = useState(user.defaultWage);
  const [wageType, setWageType] = useState<WageType>(user.wageType);
  const [currency, setCurrency] = useState(user.currency);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCat, setNewCat] = useState('');

  useEffect(() => {
    fetchCategories();
  }, [user.id]);

  const fetchCategories = async () => {
    const data = await db.categories.where('userId').equals(user.id).toArray();
    setCategories(data);
  };

  const handleUpdateUser = async (updates: Partial<User>) => {
    const updatedUser = { ...user, ...updates };
    await db.users.update(user.id, updates);
    onUserUpdate(updatedUser);
  };

  const addCategory = async () => {
    if (!newCat) return;
    await db.categories.add({
      id: crypto.randomUUID(),
      userId: user.id,
      name: newCat,
      isDefault: false,
      createdAt: Date.now()
    });
    setNewCat('');
    fetchCategories();
  };

  const deleteCategory = async (id: string) => {
    await db.categories.delete(id);
    fetchCategories();
  };

  return (
    <div className="p-6 space-y-10">
      <header>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Settings</h2>
      </header>

      <section className="space-y-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Preferences</h3>
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 brand-shield-gradient rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-brand-blue/20">
              {user.name[0]}
            </div>
            <div>
              <div className="font-black text-slate-900 text-lg tracking-tight">{user.name}</div>
              <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{user.email}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value);
                  handleUpdateUser({ currency: e.target.value });
                }}
                className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 font-black text-sm focus:ring-2 focus:ring-brand-blue appearance-none"
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Wage Type</label>
              <select
                value={wageType}
                onChange={(e) => {
                  const type = e.target.value as WageType;
                  setWageType(type);
                  handleUpdateUser({ wageType: type });
                }}
                className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 font-black text-sm focus:ring-2 focus:ring-brand-blue appearance-none"
              >
                <option value="hourly">Hourly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
              Default {wageType === 'hourly' ? 'Hourly Wage' : 'Yearly Salary'}
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="number"
                value={wage}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setWage(val);
                  handleUpdateUser({ defaultWage: val });
                }}
                className="flex-1 bg-slate-50 border-none rounded-xl py-4 px-5 font-black text-xl focus:ring-2 focus:ring-brand-blue transition-all"
              />
              <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest">{wageType === 'hourly' ? '/hr' : '/yr'}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Categories</h3>
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex space-x-2">
            <input
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              placeholder="New category..."
              className="flex-1 bg-slate-50 border-none rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-brand-blue"
            />
            <button 
              onClick={addCategory}
              className="bg-brand-blue text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-brand-blue/20 active:scale-95 transition-all"
            >
              Add
            </button>
          </div>

          <div className="space-y-1 max-h-48 overflow-y-auto no-scrollbar pr-1">
            {categories.map(cat => (
              <div key={cat.id} className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0 group">
                <span className="text-slate-700 font-bold text-sm tracking-tight">{cat.name}</span>
                {!cat.isDefault && (
                  <button 
                    onClick={() => deleteCategory(cat.id)}
                    className="text-red-400 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <button 
        onClick={onLogout}
        className="w-full bg-slate-100 text-slate-500 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] border border-slate-100 active:bg-slate-200 transition-colors"
      >
        Sign Out
      </button>

      <div className="text-center text-[10px] text-slate-300 font-black uppercase tracking-[0.4em]">
        TruCost v1.2.0
      </div>
    </div>
  );
};
