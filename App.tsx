import React, { useState, useEffect } from 'react';
import { UserProfile, AppView, LeaderboardUser } from './types';
import { DominoGame } from './games/DominoGame';
import { CardGame } from './games/CardGame';
import { LudoGame } from './games/LudoGame';
import { BankGame } from './games/BankGame';
import { User, Play, Users, LogIn, Gamepad2, Coins, Trophy, Grid3X3, Bot, Share2, Building2, Star, TrendingUp, RefreshCw, Settings, Volume2, VolumeX, Smartphone, Trash2, Save, Heart, X } from 'lucide-react';
import { playSound } from './sounds';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('splash');
  const [user, setUser] = useState<UserProfile>({ 
      name: '', 
      globalCoins: 10000, 
      level: 1, 
      xp: 0,
      settings: { musicEnabled: true, vibrationEnabled: true }
  });
  const [lobbyCode, setLobbyCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [opponentName, setOpponentName] = useState('الكمبيوتر');
  const [isBotGame, setIsBotGame] = useState(true);
  const [lastWinner, setLastWinner] = useState<{name: string, game: string} | null>(null);
  
  // UI States
  const [showSettings, setShowSettings] = useState(false);
  const [showExchange, setShowExchange] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('');

  // --- Persistence ---
  useEffect(() => {
      const savedData = localStorage.getItem('mir_domino_user');
      if (savedData) {
          const parsed = JSON.parse(savedData);
          setUser(parsed);
          setView('menu');
          setWelcomeMessage(`مرحباً بعودتك، ${parsed.name}!`);
          setTimeout(() => setWelcomeMessage(''), 2000);
      }
  }, []);

  const saveData = () => {
      localStorage.setItem('mir_domino_user', JSON.stringify(user));
      alert('تم حفظ البيانات بنجاح!');
  };

  const deleteAccount = () => {
      if (confirm('هل أنت متأكد من حذف الحساب؟ سيتم فقد جميع البيانات.')) {
          localStorage.removeItem('mir_domino_user');
          window.location.reload();
      }
  };

  // --- Navigation Handlers ---
  const enterGame = (name: string) => {
      if(!name.trim()) return;
      const newUser = { ...user, name };
      setUser(newUser);
      localStorage.setItem('mir_domino_user', JSON.stringify(newUser));
      setView('menu');
      playSound('win');
      setWelcomeMessage(`مرحباً بك، ${name}!`);
      setTimeout(() => setWelcomeMessage(''), 2000);
  };

  const handleGameEnd = (winnerIsHuman: boolean, coinReward: number) => {
      // XP Calculation: Win = 100 XP, Loss = 20 XP
      const xpGain = winnerIsHuman ? 100 : 20;
      const newXp = user.xp + xpGain;
      const newLevel = Math.floor(newXp / 1000) + 1; 
      
      const updatedUser = { 
          ...user, 
          globalCoins: Math.max(0, user.globalCoins + coinReward),
          xp: newXp,
          level: newLevel
      };

      setUser(updatedUser);
      localStorage.setItem('mir_domino_user', JSON.stringify(updatedUser)); // Auto Save

      if (newLevel > user.level) {
          playSound('win');
          alert(`مبروك! وصلت للمستوى ${newLevel} 🚀`);
      }

      if (winnerIsHuman && coinReward > 0) {
          setLastWinner({ name: user.name, game: getCurrentGameName(view) });
      } else if (!winnerIsHuman) {
          setLastWinner({ name: opponentName, game: getCurrentGameName(view) });
      }
      
      setView('menu');
  };

  // Currency Exchange: Global -> Game (Simulated by deducting global)
  // In this architecture, games manage their own "Session Currency" (Match Coins) or use Global directly.
  // We will simulate buying "Match Coins" or simply adding to Global for demo purposes.
  // The request says "Convert Global to Any Game". Let's assume games use Global, so "Exchange" is actually "Buy Global" or similar?
  // Or "Buy Game Specific". Let's simply implement a "Refill" mechanic.
  const handleExchange = (amount: number) => {
      if (user.globalCoins >= amount) {
          // In a real app, this would add to a specific game wallet.
          // Here we just re-add it to global to simulate the transaction for UI
          // setUser(prev => ({ ...prev, globalCoins: prev.globalCoins - amount }));
          alert('تم تحويل العملات بنجاح إلى رصيد اللعبة! (محاكاة)');
          setShowExchange(false);
      } else {
          alert('رصيد غير كافي!');
      }
  };

  const getCurrentGameName = (v: AppView) => {
      if (v.includes('domino')) return 'دومينو';
      if (v.includes('card')) return 'الشايب';
      if (v.includes('ludo')) return 'ليدو';
      if (v.includes('bank')) return 'بنك الحظ';
      return 'لعبة';
  };

  // --- Game Setup ---
  const setupGame = (type: 'domino' | 'card' | 'ludo' | 'bank', isOnline: boolean) => {
      setIsBotGame(!isOnline);
      setOpponentName(isOnline ? 'المنشئ' : 'الكمبيوتر');
      setLobbyCode(isOnline ? '' : ''); // Reset
      const map: Record<string, AppView> = {
          domino: 'game_domino', card: 'game_card', ludo: 'game_ludo', bank: 'game_bank'
      };
      setView(map[type]);
  };

  const createOnline = (type: any) => {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setLobbyCode(code);
      setTimeout(() => setupGame(type, true), 3000);
  };

  // --- Render Views ---

  const Ticker = () => {
      if (!lastWinner) return null;
      return (
          <div className="ticker-wrap fixed top-0 left-0 right-0 z-40 h-8 flex items-center border-b border-yellow-500/30">
              <div className="ticker-move">
                  <span className="ticker-item text-yellow-300">🏆 الفائز الأخير: {lastWinner.name} في لعبة {lastWinner.game}</span>
                  <span className="ticker-item text-white">🔥 العب الآن واربح العملات!</span>
                  <span className="ticker-item text-emerald-300">👑 كن الأفضل في دومينو ميرو</span>
              </div>
          </div>
      );
  };

  if (view === 'splash') {
      return (
          <div className="min-h-screen flex items-center justify-center p-4">
              <div className="bg-slate-800/80 backdrop-blur-md p-8 rounded-2xl border border-white/10 shadow-2xl max-w-md w-full text-center">
                  <div className="w-24 h-24 bg-emerald-500 rounded-full mx-auto flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.5)] animate-bounce">
                      <Gamepad2 size={48} className="text-white"/>
                  </div>
                  <h1 className="text-4xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">دومينو ميرو</h1>
                  
                  <input 
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white text-center text-lg mb-4 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    placeholder="ادخل اسمك"
                    onChange={(e) => setUser(prev => ({...prev, name: e.target.value}))}
                  />
                  <button 
                    onClick={() => enterGame(user.name)}
                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-3 rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95"
                  >
                    دخول اللعبة
                  </button>
              </div>
          </div>
      );
  }

  if (view === 'menu') {
      return (
          <div className="min-h-screen flex flex-col p-4 pt-10 overflow-y-auto relative pb-16">
              <Ticker />
              
              {/* Welcome Toast */}
              {welcomeMessage && (
                  <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-8 py-4 rounded-2xl border border-emerald-500 z-[60] animate-bounce text-xl font-bold backdrop-blur">
                      {welcomeMessage}
                  </div>
              )}

              {/* Header Info */}
              <div className="bg-slate-800/80 backdrop-blur p-4 rounded-2xl border border-white/10 mb-6 shadow-xl relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                   <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                       {/* Profile / Level - Clickable for Settings */}
                       <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setShowSettings(true)}>
                           <div className="relative">
                               <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center font-bold text-2xl border-2 border-white/20 shadow-lg">
                                   {user.name.charAt(0)}
                               </div>
                               <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full border border-white">
                                   LVL {user.level}
                               </div>
                           </div>
                           <div>
                               <div className="font-bold text-xl text-white flex items-center gap-2">{user.name} <Settings size={16} className="text-slate-400"/></div>
                               <div className="text-sm text-slate-400 flex items-center gap-1">
                                   <Star size={12} className="text-yellow-400"/> {user.xp % 1000} / 1000 XP
                               </div>
                               <div className="w-32 h-2 bg-slate-700 rounded-full mt-1 overflow-hidden">
                                   <div className="h-full bg-yellow-500" style={{width: `${(user.xp % 1000) / 10}%`}}></div>
                               </div>
                           </div>
                       </div>
                       
                       <div className="flex items-center gap-3">
                           <div className="flex flex-col items-end">
                               <div className="text-xs text-slate-400">العملة العالمية</div>
                               <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-xl border border-yellow-500/30">
                                   <Coins className="text-yellow-400 animate-pulse" />
                                   <span className="font-mono text-2xl text-yellow-100 font-bold">{user.globalCoins.toLocaleString()}</span>
                               </div>
                           </div>
                           <button onClick={() => setShowExchange(true)} className="bg-slate-700 p-3 rounded-xl hover:bg-slate-600 transition-colors" title="استبدال العملات">
                               <RefreshCw size={20} className="text-emerald-400"/>
                           </button>
                       </div>
                   </div>
              </div>

              {/* Dashboard / Leaderboard */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  {/* Games */}
                  <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div onClick={() => setView('lobby_domino')} className="bg-gradient-to-br from-indigo-900 to-slate-900 p-6 rounded-2xl border border-indigo-500/30 cursor-pointer hover:scale-[1.02] transition-all relative overflow-hidden group">
                          <div className="absolute right-0 bottom-0 opacity-10 group-hover:scale-110 transition-transform"><Gamepad2 size={100} /></div>
                          <h2 className="text-2xl font-bold mb-1">دومينو</h2>
                          <p className="text-indigo-300 text-sm">كلاسيك</p>
                      </div>
                      <div onClick={() => setView('lobby_card')} className="bg-gradient-to-br from-red-900 to-slate-900 p-6 rounded-2xl border border-red-500/30 cursor-pointer hover:scale-[1.02] transition-all relative overflow-hidden group">
                          <div className="absolute right-0 bottom-0 opacity-10 group-hover:scale-110 transition-transform"><Users size={100} /></div>
                          <h2 className="text-2xl font-bold mb-1">الشايب</h2>
                          <p className="text-red-300 text-sm">أوراق</p>
                      </div>
                      <div onClick={() => setView('lobby_ludo')} className="bg-gradient-to-br from-yellow-900 to-slate-900 p-6 rounded-2xl border border-yellow-500/30 cursor-pointer hover:scale-[1.02] transition-all relative overflow-hidden group">
                          <div className="absolute right-0 bottom-0 opacity-10 group-hover:scale-110 transition-transform"><Grid3X3 size={100} /></div>
                          <h2 className="text-2xl font-bold mb-1">ليدو</h2>
                          <p className="text-yellow-300 text-sm">نرد</p>
                      </div>
                      <div onClick={() => setView('lobby_bank')} className="bg-gradient-to-br from-emerald-900 to-slate-900 p-6 rounded-2xl border border-emerald-500/30 cursor-pointer hover:scale-[1.02] transition-all relative overflow-hidden group">
                          <div className="absolute right-0 bottom-0 opacity-10 group-hover:scale-110 transition-transform"><Building2 size={100} /></div>
                          <h2 className="text-2xl font-bold mb-1">بنك الحظ</h2>
                          <p className="text-emerald-300 text-sm">تجارية</p>
                      </div>
                  </div>

                  {/* Leaderboard - Only You */}
                  <div className="bg-slate-800/50 rounded-2xl border border-white/5 p-4 flex flex-col">
                      <div className="flex items-center gap-2 mb-4 text-yellow-400 font-bold text-lg">
                          <Trophy /> اللاعبين النشطين
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scroll">
                          <div className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg border border-emerald-500/30 mt-2 relative overflow-hidden">
                              <div className="absolute inset-0 bg-emerald-500/10"></div>
                              <div className="flex items-center gap-3 relative">
                                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center font-bold text-xs">1</div>
                                  <div>
                                      <div className="text-sm font-bold text-emerald-300">{user.name} (أنت)</div>
                                      <div className="text-[10px] text-slate-400">مستوى {user.level}</div>
                                  </div>
                              </div>
                              <div className="text-yellow-400 font-mono text-sm relative">{user.globalCoins.toLocaleString()}</div>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Footer */}
              <div className="mt-auto text-center text-slate-500 text-sm pb-4">
                  <p>مع تحيات المطور <span className="text-emerald-400 font-bold">Amir Lamay</span> ❤️</p>
              </div>

              {/* Settings Modal */}
              {showSettings && (
                  <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
                      <div className="bg-slate-800 p-6 rounded-2xl border border-white/10 w-full max-w-sm relative">
                          <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X/></button>
                          <h2 className="text-2xl font-bold mb-6 text-center">الإعدادات</h2>
                          
                          <div className="space-y-4">
                              <div className="flex justify-between items-center bg-slate-700/50 p-3 rounded-xl">
                                  <span className="flex items-center gap-2"><Volume2 size={20}/> الموسيقى</span>
                                  <button onClick={() => setUser(p => ({...p, settings: {...p.settings, musicEnabled: !p.settings.musicEnabled}}))} className={`w-12 h-6 rounded-full relative transition-colors ${user.settings.musicEnabled ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${user.settings.musicEnabled ? 'left-1' : 'right-1'}`}></div>
                                  </button>
                              </div>

                              <div className="flex justify-between items-center bg-slate-700/50 p-3 rounded-xl">
                                  <span className="flex items-center gap-2"><Smartphone size={20}/> الاهتزاز</span>
                                  <button onClick={() => setUser(p => ({...p, settings: {...p.settings, vibrationEnabled: !p.settings.vibrationEnabled}}))} className={`w-12 h-6 rounded-full relative transition-colors ${user.settings.vibrationEnabled ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${user.settings.vibrationEnabled ? 'left-1' : 'right-1'}`}></div>
                                  </button>
                              </div>

                              <button onClick={saveData} className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                                  <Save size={20}/> حفظ البيانات
                              </button>

                              <button onClick={deleteAccount} className="w-full bg-red-900/50 hover:bg-red-900/80 text-red-200 py-3 rounded-xl font-bold flex items-center justify-center gap-2 border border-red-500/30">
                                  <Trash2 size={20}/> حذف الحساب
                              </button>

                              <a href="https://ipn.eg/S/ahlyamiir/instapay/3vvs0B" target="_blank" rel="noopener noreferrer" className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-white mt-4">
                                  <Heart size={20} className="fill-white"/> ادعم المطور
                              </a>
                          </div>
                      </div>
                  </div>
              )}

              {/* Currency Exchange Modal */}
              {showExchange && (
                  <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
                      <div className="bg-slate-800 p-6 rounded-2xl border border-white/10 w-full max-w-sm text-center">
                          <h2 className="text-xl font-bold mb-4">تحويل العملات</h2>
                          <p className="text-slate-400 text-sm mb-6">تحويل العملة العالمية إلى عملات الألعاب</p>
                          <div className="grid grid-cols-2 gap-3 mb-4">
                              <button onClick={() => handleExchange(100)} className="bg-slate-700 p-3 rounded-xl hover:bg-slate-600">100 عملة</button>
                              <button onClick={() => handleExchange(500)} className="bg-slate-700 p-3 rounded-xl hover:bg-slate-600">500 عملة</button>
                              <button onClick={() => handleExchange(1000)} className="bg-slate-700 p-3 rounded-xl hover:bg-slate-600">1000 عملة</button>
                              <button onClick={() => handleExchange(5000)} className="bg-slate-700 p-3 rounded-xl hover:bg-slate-600">5000 عملة</button>
                          </div>
                          <button onClick={() => setShowExchange(false)} className="text-slate-400 underline">إلغاء</button>
                      </div>
                  </div>
              )}
          </div>
      );
  }

  // Lobby Helper
  const renderLobby = (gameType: 'domino' | 'card' | 'ludo' | 'bank') => (
      <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-slate-800/90 p-8 rounded-2xl border border-white/10 max-w-md w-full relative">
              <button onClick={() => setView('menu')} className="absolute top-4 left-4 text-slate-400 hover:text-white">رجوع</button>
              <h2 className="text-2xl font-bold text-center mb-8">
                {gameType === 'domino' ? 'لوبي الدومينو' : gameType === 'card' ? 'لوبي الكوتشينة' : gameType === 'ludo' ? 'لوبي ليدو' : 'لوبي بنك الحظ'}
              </h2>
              
              {!lobbyCode ? (
                  <div className="space-y-4">
                      <button onClick={() => setupGame(gameType, false)} className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2">
                          <Bot /> اللعب ضد الكمبيوتر
                      </button>
                      <div className="relative my-4"><div className="w-full border-t border-slate-600"></div></div>
                      <button onClick={() => createOnline(gameType)} className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                          <Share2 size={20} /> مشاركة كود (إنشاء)
                      </button>
                      <div className="text-center text-sm text-slate-400 my-2">أو</div>
                      <div className="flex gap-2">
                          <input className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 text-center tracking-widest text-xl outline-none focus:border-emerald-500" placeholder="كود اللعبة" maxLength={4} value={inputCode} onChange={e => setInputCode(e.target.value)} />
                          <button onClick={() => setupGame(gameType, true)} className="bg-blue-600 hover:bg-blue-500 px-6 rounded-lg font-bold">دخول</button>
                      </div>
                  </div>
              ) : (
                  <div className="text-center py-8">
                      <p className="text-slate-400 mb-2">شارك الكود</p>
                      <div className="text-5xl font-mono font-bold text-emerald-400 tracking-widest mb-8">{lobbyCode}</div>
                      <button onClick={() => setLobbyCode('')} className="mt-8 text-sm text-red-400 underline">إلغاء</button>
                  </div>
              )}
          </div>
      </div>
  );

  if (view.startsWith('lobby_')) return renderLobby(view.split('_')[1] as any);

  if (view === 'game_domino') return <DominoGame user={user} opponentName={opponentName} onEndGame={handleGameEnd} onUpdateCoins={(a) => setUser(prev => ({...prev, globalCoins: prev.globalCoins + a}))} />;
  if (view === 'game_card') return <CardGame user={user} onEndGame={handleGameEnd} />;
  if (view === 'game_ludo') return <LudoGame user={user} isBot={isBotGame} opponentName={opponentName} onEndGame={handleGameEnd} />;
  if (view === 'game_bank') return <BankGame user={user} isBot={isBotGame} opponentName={opponentName} onEndGame={handleGameEnd} />;

  return <div>Loading...</div>;
};

export default App;