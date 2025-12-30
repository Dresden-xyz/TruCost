
import React, { useState, useEffect } from 'react';
import { User } from './types';
import { db, initializeUser } from './db';
import { Layout } from './components/Layout';
import { Calculator } from './screens/Calculator';
import { Wishlist } from './screens/Wishlist';
import { Goals } from './screens/Goals';
import { History } from './screens/History';
import { Settings } from './screens/Settings';
import { Logo } from './components/Logo';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeScreen, setActiveScreen] = useState<'calculate' | 'wishlist' | 'goals' | 'history' | 'settings'>('calculate');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Attempt auto-login if a user exists in the local DB
    const checkAuth = async () => {
      const users = await db.users.toArray();
      if (users.length > 0) {
        setUser(users[0]);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const handleLogin = async () => {
    // Simulate OAuth Login
    const mockProfile = {
      id: 'user-123',
      name: 'Alex Johnson',
      email: 'alex@example.com'
    };
    const loggedInUser = await initializeUser(mockProfile);
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    await db.users.clear();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen brand-shield-gradient">
        <div className="text-white text-3xl font-black animate-pulse">TruCost</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 px-6 text-center">
        <div className="mb-12">
          <Logo size="md" />
          <p className="text-slate-500 max-w-xs mx-auto mt-4 font-medium">
            See your spending in hours worked and goal delays. Spend intentionally.
          </p>
        </div>
        
        <div className="w-full space-y-4 max-w-xs">
          <button
            onClick={handleLogin}
            className="w-full bg-white border border-slate-200 text-slate-700 py-4 px-6 rounded-2xl flex items-center justify-center space-x-3 shadow-sm active:scale-[0.98] transition-all font-semibold"
          >
            <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-6 h-6" alt="Google" />
            <span>Continue with Google</span>
          </button>
          
          <button
            onClick={handleLogin}
            className="w-full bg-black text-white py-4 px-6 rounded-2xl flex items-center justify-center space-x-3 shadow-sm active:scale-[0.98] transition-all font-semibold"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.702z"/></svg>
            <span>Continue with Apple</span>
          </button>
        </div>
        
        <p className="mt-8 text-xs text-slate-400">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    );
  }

  return (
    <Layout activeScreen={activeScreen} setActiveScreen={setActiveScreen}>
      {activeScreen === 'calculate' && <Calculator user={user} onSave={() => setActiveScreen('history')} />}
      {activeScreen === 'wishlist' && <Wishlist user={user} />}
      {activeScreen === 'goals' && <Goals user={user} />}
      {activeScreen === 'history' && <History user={user} />}
      {activeScreen === 'settings' && <Settings user={user} onLogout={handleLogout} onUserUpdate={setUser} />}
    </Layout>
  );
}
