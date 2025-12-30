
import React, { useState, useEffect } from 'react';
import { User, WishlistItem, WishlistStatus, Category, CURRENCIES } from '../types';
import { db } from '../db';
import { geminiService } from '../services/geminiService';
import { MagnifyingGlassIcon, MapPinIcon, VideoCameraIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface WishlistProps {
  user: User;
}

export const Wishlist: React.FC<WishlistProps> = ({ user }) => {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WishlistItem | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [cost, setCost] = useState<number | ''>('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [imgUrl, setImgUrl] = useState('');

  // Gemini / Search state
  const [aiLoading, setAiLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLinks, setSearchLinks] = useState<any[]>([]);
  const [aiResult, setAiResult] = useState<{text: string, links: any[]} | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const currencySymbol = CURRENCIES.find(c => c.code === user.currency)?.symbol || '$';

  useEffect(() => {
    fetchItems();
  }, [user.id]);

  const fetchItems = async () => {
    const data = await db.wishlist.where('userId').equals(user.id).toArray();
    setItems(data.filter(i => i.status === WishlistStatus.WISHLISTED));

    const cats = await db.categories.where('userId').equals(user.id).toArray();
    setCategories(cats);
    if (cats.length > 0) setCategoryId(cats[0].id);
  };

  const handleAddItem = async () => {
    if (!name || !cost) return;
    const newItem: WishlistItem = {
      id: crypto.randomUUID(),
      userId: user.id,
      name,
      cost: Number(Number(cost).toFixed(2)),
      categoryId,
      note,
      imageUrl: imgUrl || `https://picsum.photos/seed/${encodeURIComponent(name)}/400/400`,
      status: WishlistStatus.WISHLISTED,
      createdAt: Date.now()
    };
    await db.wishlist.add(newItem);
    setIsAdding(false);
    fetchItems();
    // Reset
    setName(''); setCost(''); setNote(''); setImgUrl(''); setSearchResults([]); setSearchLinks([]);
  };

  const markPurchased = async (item: WishlistItem) => {
    const update = { 
      status: WishlistStatus.PURCHASED,
      purchasedAt: Date.now() 
    };
    await db.wishlist.update(item.id, update);
    
    const goalData = await db.goals.where('userId').equals(user.id).toArray();
    let delayDays = 0;
    if (goalData.length > 0 && goalData[0].weeklySavings > 0) {
      delayDays = Math.ceil((item.cost / goalData[0].weeklySavings) * 7);
    }

    const effectiveHourlyWage = user.wageType === 'yearly' ? user.defaultWage / 2080 : user.defaultWage;

    await db.decisions.add({
      id: crypto.randomUUID(),
      userId: user.id,
      name: `Wishlist: ${item.name}`,
      cost: item.cost,
      hourlyWageUsed: effectiveHourlyWage,
      categoryId: item.categoryId,
      computedHours: Number((item.cost / effectiveHourlyWage).toFixed(2)),
      computedGoalDelayDays: delayDays,
      createdAt: Date.now()
    });

    setSelectedItem(null);
    fetchItems();
  };

  const handleSearchProduct = async () => {
    if (!name || name.trim().length < 2) return;
    setAiLoading(true);
    setSearchResults([]);
    setSearchLinks([]);
    try {
      const { results, links } = await geminiService.searchPriceInfo(name, user.currency);
      setSearchResults(results);
      setSearchLinks(links);
    } finally {
      setAiLoading(false);
    }
  };

  const selectSearchResult = (item: any) => {
    setName(item.name);
    setCost(Number(item.price.toFixed(2)));
    if (item.imageUrl) setImgUrl(item.imageUrl);
    setSearchResults([]);
    setSearchLinks([]);
  };

  const handleFindStores = async () => {
    if (!selectedItem) return;
    setAiLoading(true);
    try {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const res = await geminiService.findStoresNearby(selectedItem.name, pos.coords.latitude, pos.coords.longitude);
        setAiResult(res);
        setAiLoading(false);
      }, () => {
        setAiLoading(false);
        alert("Location access needed to find nearby stores.");
      });
    } catch (e) {
      setAiLoading(false);
    }
  };

  const handleAnimate = async (item: WishlistItem) => {
    setAiLoading(true);
    setVideoUrl(null);
    try {
      const resp = await fetch(item.imageUrl || `https://picsum.photos/seed/${encodeURIComponent(item.name)}/400/400`);
      const blob = await resp.blob();
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const vid = await geminiService.animateProduct(base64, `Make the ${item.name} move gracefully`);
          setVideoUrl(vid);
        } catch (err) {
          console.error("Animation failed", err);
        } finally {
          setAiLoading(false);
        }
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      setAiLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <header className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Wishlist</h2>
        <button 
          onClick={() => setIsAdding(true)}
          className="brand-shield-gradient text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-blue/20 active:scale-90 transition-all"
        >
          <span className="text-3xl font-black leading-none">+</span>
        </button>
      </header>

      {/* Item List */}
      <div className="grid grid-cols-2 gap-4">
        {items.map(item => (
          <button 
            key={item.id}
            onClick={() => { setSelectedItem(item); setAiResult(null); setVideoUrl(null); }}
            className="flex flex-col text-left bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 active:scale-[0.98] transition-all hover:border-brand-blue/20"
          >
            <div className="aspect-square bg-slate-100 relative overflow-hidden">
              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
              <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-black text-slate-800 shadow-sm border border-slate-100/50">
                {currencySymbol}{item.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-4">
              <div className="text-sm font-black text-slate-800 truncate mb-1 tracking-tight">{item.name}</div>
              <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest truncate opacity-80">
                {categories.find(c => c.id === item.categoryId)?.name}
              </div>
            </div>
          </button>
        ))}
        {items.length === 0 && (
          <div className="col-span-2 text-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Your wishlist is empty</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] p-6 flex items-end">
          <div className="bg-white w-full rounded-[3rem] p-8 space-y-6 animate-slide-up max-w-md mx-auto max-h-[85vh] overflow-y-auto no-scrollbar shadow-2xl">
            <header className="flex justify-between items-center">
              <h3 className="text-xl font-black tracking-tight text-slate-900">Add Wishlist Item</h3>
              <button onClick={() => setIsAdding(false)} className="text-slate-300 hover:text-slate-500 transition-colors text-3xl font-black">&times;</button>
            </header>

            <div className="space-y-4">
              <div className="flex space-x-2">
                <input 
                  placeholder="Item Name" 
                  value={name} onChange={e => setName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchProduct()}
                  className="flex-1 bg-slate-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-2 focus:ring-brand-blue"
                />
                <button 
                  onClick={handleSearchProduct}
                  disabled={aiLoading || !name}
                  className="bg-brand-blue/10 text-brand-blue px-4 rounded-2xl flex items-center justify-center disabled:opacity-50 active:scale-95 transition-all"
                >
                  <MagnifyingGlassIcon className={`w-6 h-6 ${aiLoading ? 'animate-pulse' : ''}`} />
                </button>
              </div>

              {(searchResults.length > 0 || searchLinks.length > 0) && (
                <div className="bg-brand-blue/5 rounded-2xl p-2 space-y-2 border border-brand-blue/10">
                  <div className="px-2 py-1 flex justify-between items-center">
                    <span className="text-[10px] font-black text-brand-blue/60 uppercase tracking-widest">Matches & Sources</span>
                    <button onClick={() => { setSearchResults([]); setSearchLinks([]); }}><XMarkIcon className="w-3 h-3 text-brand-blue/40" /></button>
                  </div>
                  {searchResults.map((item, i) => (
                    <button
                      key={`res-${i}`}
                      onClick={() => selectSearchResult(item)}
                      className="w-full text-left bg-white p-3 rounded-2xl flex items-center space-x-3 shadow-sm active:scale-95 transition-all border border-slate-100"
                    >
                      {item.imageUrl && (
                        <img src={item.imageUrl} className="w-12 h-12 rounded-xl object-cover bg-slate-100" alt="" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-black text-slate-800 truncate tracking-tight">{item.name}</div>
                        <div className="text-[10px] text-brand-blue font-black uppercase tracking-widest">
                          {currencySymbol}{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </button>
                  ))}
                  {searchLinks.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-2 border-t border-brand-blue/10 mt-1">
                      {searchLinks.map((link, i) => (
                        <a 
                          key={`link-${i}`} 
                          href={link.uri} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[9px] text-brand-blue font-black hover:underline truncate max-w-[120px] uppercase tracking-widest opacity-70"
                        >
                          {link.title || 'Source'}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="relative">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Price</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">{currencySymbol}</span>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    value={cost} onChange={e => setCost(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-10 pr-5 font-black text-lg focus:ring-2 focus:ring-brand-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Category</label>
                <select 
                  value={categoryId} onChange={e => setCategoryId(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-2 focus:ring-brand-blue appearance-none"
                >
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Notes</label>
                <textarea 
                  placeholder="Optional details..." 
                  value={note} onChange={e => setNote(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-medium h-24 resize-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>
            </div>

            {aiLoading && <div className="text-center text-[10px] font-black text-brand-blue uppercase tracking-[0.2em] animate-pulse">Gemini is searching...</div>}

            <button 
              onClick={handleAddItem}
              className="w-full bg-brand-blue text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-brand-blue/20 active:scale-95 transition-all uppercase tracking-tight"
            >
              Add to Wishlist
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] p-6 flex items-end">
          <div className="bg-white w-full rounded-[3rem] p-8 space-y-6 animate-slide-up max-w-md mx-auto max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl">
            <header className="flex justify-between items-start">
              <div className="flex-1">
                <div className="text-[10px] font-black text-brand-blue uppercase tracking-[0.2em] mb-1">
                  {categories.find(c => c.id === selectedItem.categoryId)?.name}
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{selectedItem.name}</h3>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-slate-300 hover:text-slate-500 text-3xl font-black leading-none transition-colors">&times;</button>
            </header>

            <div className="aspect-video bg-slate-100 rounded-[2rem] overflow-hidden relative shadow-inner">
              {videoUrl ? (
                <video src={videoUrl} autoPlay loop className="w-full h-full object-cover" />
              ) : (
                <img src={selectedItem.imageUrl} className="w-full h-full object-cover" alt="" />
              )}
              {aiLoading && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mb-4 shadow-sm"></div>
                  <div className="text-[10px] font-black text-brand-blue uppercase tracking-widest animate-pulse max-w-[200px]">
                    Preparing high-quality preview... This can take up to a minute.
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1 opacity-70">Price</div>
                <div className="text-xl font-black text-slate-900 tracking-tight">
                  {currencySymbol}{selectedItem.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1 opacity-70">Capacity</div>
                <div className="text-xl font-black text-brand-blue tracking-tight">{(selectedItem.cost / (user.wageType === 'yearly' ? user.defaultWage / 2080 : user.defaultWage)).toFixed(1)}h</div>
              </div>
            </div>

            {selectedItem.note && (
              <div className="text-sm text-slate-500 font-medium italic bg-slate-50/50 p-4 rounded-2xl border border-slate-100 border-dashed">
                "{selectedItem.note}"
              </div>
            )}

            <div className="space-y-3">
              <div className="flex space-x-2">
                <button 
                  onClick={handleFindStores}
                  className="flex-1 flex items-center justify-center space-x-2 bg-slate-50 text-slate-600 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-100 active:bg-slate-100 transition-colors"
                >
                  <MapPinIcon className="w-4 h-4" />
                  <span>Locate</span>
                </button>
                <button 
                  onClick={() => handleAnimate(selectedItem)}
                  className="flex-1 flex items-center justify-center space-x-2 bg-brand-blue/5 text-brand-blue py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-brand-blue/10 active:bg-brand-blue/10 transition-colors"
                >
                  <VideoCameraIcon className="w-4 h-4" />
                  <span>Animate</span>
                </button>
              </div>

              {aiResult && (
                <div className="p-5 bg-brand-blue/5 rounded-3xl border border-brand-blue/10 space-y-4">
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">{aiResult.text}</p>
                  <div className="flex flex-wrap gap-2">
                    {aiResult.links.map((link, i) => (
                      <a 
                        key={i} 
                        href={link.uri} 
                        target="_blank" 
                        rel="noreferrer"
                        className="bg-white px-3 py-2 rounded-xl text-[10px] font-black text-brand-blue border border-brand-blue/10 shadow-sm hover:shadow-md transition-all uppercase tracking-widest"
                      >
                        {link.title || 'Open Link'}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <button 
                onClick={() => markPurchased(selectedItem)}
                className="w-full brand-shield-gradient text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-brand-blue/20 active:scale-95 transition-all uppercase tracking-tight"
              >
                Mark as Purchased
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
