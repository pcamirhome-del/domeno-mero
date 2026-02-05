import React, { useState, useEffect } from 'react';
import { UserProfile, AppView } from './types';
import { DominoGame } from './games/DominoGame';
import { CardGame } from './games/CardGame';
import { LudoGame } from './games/LudoGame';
import { BankGame } from './games/BankGame';
import { User, Gamepad2, Coins, Trophy, Grid3X3, Bot, Share2, Building2, Star, RefreshCw, Settings, Volume2, Smartphone, Trash2, Save, Heart, X, Youtube, LogOut, CheckCircle, Edit2 } from 'lucide-react';
import { playSound } from './sounds';

const AVATARS = Array.from({ length: 20 }, (_, i) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${i * 1234}&backgroundColor=b6e3f4`);

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('splash');
  const [user, setUser] = useState<UserProfile>({ 
      name: '', 
      avatar: AVATARS[0],
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
  const [selectedAvatarIndex, setSelectedAvatarIndex] = useState(0);

  // --- Persistence ---
  useEffect(() => {
      const savedData = localStorage.getItem('mir_domino_user');
      if (savedData) {
          const parsed = JSON.parse(savedData);
          setUser({ ...parsed, avatar: parsed.avatar || AVATARS[0] }); // Ensure avatar exists
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

  const logout = () => {
      if(confirm('هل تريد تسجيل الخروج؟')) {
         setView('splash');
         setWelcomeMessage('');
      }
  }

  // --- Google Login Simulation ---
  const handleGoogleLogin = () => {
      // Mocking Firebase Auth flow
      const mockName = "لاعب جوجل";
      const mockAvatar = AVATARS[5];
      alert("جاري الاتصال بحساب Google...");
      setTimeout(() => {
          const newUser = { ...user, name: mockName, avatar: mockAvatar, level: 5 }; // Simulated synced level
          setUser(newUser);
          localStorage.setItem('mir_domino_user', JSON.stringify(newUser));
          setView('menu');
          playSound('win');
          setWelcomeMessage(`تم تسجيل الدخول: ${mockName}`);
          setTimeout(() => setWelcomeMessage(''), 2000);
      }, 1500);
  };

  // --- Reward Ads Logic ---
  const giveReward = (amount: number) => {
      const newUser = { ...user, globalCoins: user.globalCoins + amount };
      setUser(newUser);
      localStorage.setItem('mir_domino_user', JSON.stringify(newUser));
      alert("مبروك! تمت إضافة " + amount + " عملة لرصيدك. رصيدك الحالي: " + newUser.globalCoins);
      playSound('win');
  };

  const launchRewardedAd = () => {
      if (typeof (window as any).adsbygoogle !== 'undefined') {
          alert("جاري تحميل الإعلان... (سيظهر الإعلان هنا بمجرد قبول حسابك)");
          setTimeout(() => {
              giveReward(50);
          }, 2000); 
      } else {
          alert("عذراً، الإعلانات غير جاهزة حالياً.");
      }
  };

  const showRewardPrompt = () => {
      const confirmation = confirm("هل تريد زيادة عملاتك؟ شاهد مقطع فيديو قصير واربح 50 عملة مجانية!");
      if (confirmation) {
          launchRewardedAd();
      }
  };

  // --- Navigation Handlers ---
  const enterGame = (name: string) => {
      if(!name.trim()) return;
      const newUser = { ...user, name, avatar: AVATARS[selectedAvatarIndex] };
      setUser(newUser);
      localStorage.setItem('mir_domino_user', JSON.stringify(newUser));
      setView('menu');
      playSound('win');
      setWelcomeMessage(`مرحباً بك، ${name}!`);
      setTimeout(() => setWelcomeMessage(''), 2000);
  };

  const handleGameEnd = (winnerIsHuman: boolean, coinReward: number) => {
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
      localStorage.setItem('mir_domino_user', JSON.stringify(updatedUser)); 

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

  const handleExchange = (amount: number) => {
      if (user.globalCoins >= amount) {
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

  const setupGame = (type: 'domino' | 'card' | 'ludo' | 'bank', isOnline: boolean) => {
      setIsBotGame(!isOnline);
      setOpponentName(isOnline ? 'المنشئ' : 'الكمبيوتر');
      setLobbyCode(isOnline ? '' : ''); 
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
              <div className="bg-slate-800/80 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-2xl max-w-md w-full text-center overflow-y-auto max-h-[90vh]">
                  <div className="w-20 h-20 bg-emerald-500 rounded-full mx-auto flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(16,185,129,0.5)] animate-bounce">
                      <Gamepad2 size={40} className="text-white"/>
                  </div>
                  <h1 className="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">دومينو ميرو</h1>
                  
                  {/* Avatar Selection */}
                  <div className="mb-4 text-left">
                      <label className="text-sm text-slate-400 mb-2 block">اختر شكلك:</label>
                      <div className="grid grid-cols-5 gap-2 bg-slate-900/50 p-2 rounded-lg h-32 overflow-y-auto custom-scroll">
                          {AVATARS.map((avi, idx) => (
                              <img 
                                key={idx} 
                                src={avi} 
                                className={`w-10 h-10 rounded-full cursor-pointer transition-all ${selectedAvatarIndex === idx ? 'ring-2 ring-emerald-500 scale-110 bg-white' : 'opacity-50 hover:opacity-100'}`}
                                onClick={() => setSelectedAvatarIndex(idx)}
                              />
                          ))}
                      </div>
                  </div>

                  <input 
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white text-center text-lg mb-4 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    placeholder="ادخل اسمك"
                    value={user.name}
                    onChange={(e) => setUser(prev => ({...prev, name: e.target.value}))}
                  />
                  
                  <button 
                    onClick={() => enterGame(user.name)}
                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-3 rounded-xl shadow-lg mb-4"
                  >
                    دخول اللعبة
                  </button>

                  <div className="relative mb-4">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-600"></div></div>
                      <div className="relative flex justify-center text-sm"><span className="px-2 bg-slate-800 text-slate-400">أو</span></div>
                  </div>

                  <button 
                    onClick={handleGoogleLogin}
                    className="w-full bg-white text-slate-900 font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-gray-100"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81Z"/></svg>
                    تسجيل الدخول بجوجل
                  </button>
              </div>
          </div>
      );
  }

  if (view === 'menu') {
      return (
          <div className="min-h-screen flex flex-col p-4 pt-10 overflow-y-auto relative pb-16">
              <Ticker />
              
              {welcomeMessage && (
                  <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-8 py-4 rounded-2xl border border-emerald-500 z-[60] animate-bounce text-xl font-bold backdrop-blur">
                      {welcomeMessage}
                  </div>
              )}

              {/* Header Info */}
              <div className="bg-slate-800/80 backdrop-blur p-4 rounded-2xl border border-white/10 mb-6 shadow-xl relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                   <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                       {/* Profile */}
                       <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setShowSettings(true)}>
                           <div className="relative">
                               <img src={user.avatar} className="w-16 h-16 rounded-full bg-white border-2 border-white/20 shadow-lg"/>
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
                           <button onClick={showRewardPrompt} className="bg-red-700 p-3 rounded-xl hover:bg-red-600 transition-colors" title="شاهد إعلان واربح">
                               <Youtube size={20} className="text-white"/>
                           </button>
                           <button onClick={() => setShowExchange(true)} className="bg-slate-700 p-3 rounded-xl hover:bg-slate-600 transition-colors" title="استبدال العملات">
                               <RefreshCw size={20} className="text-emerald-400"/>
                           </button>
                       </div>
                   </div>
              </div>

              {/* Dashboard */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {['domino', 'card', 'ludo', 'bank'].map(g => (
                          <div key={g} onClick={() => setView(`lobby_${g}` as AppView)} className={`bg-gradient-to-br ${g==='domino'?'from-indigo-900':g==='card'?'from-red-900':g==='ludo'?'from-yellow-900':'from-emerald-900'} to-slate-900 p-6 rounded-2xl border border-white/10 cursor-pointer hover:scale-[1.02] transition-all relative overflow-hidden group`}>
                              <div className="absolute right-0 bottom-0 opacity-10 group-hover:scale-110 transition-transform">
                                  {g==='domino'?<Gamepad2 size={100}/>:g==='card'?<User size={100}/>:g==='ludo'?<Grid3X3 size={100}/>:<Building2 size={100}/>}
                              </div>
                              <h2 className="text-2xl font-bold mb-1">{g==='domino'?'دومينو':g==='card'?'الشايب':g==='ludo'?'ليدو':'بنك الحظ'}</h2>
                              <p className="text-slate-300 text-sm">لعب سريع</p>
                          </div>
                      ))}
                  </div>

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

              {/* Settings Modal */}
              {showSettings && (
                  <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
                      <div className="bg-slate-800 p-6 rounded-2xl border border-white/10 w-full max-w-sm relative max-h-[90vh] overflow-y-auto">
                          <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X/></button>
                          <h2 className="text-2xl font-bold mb-4 text-center">الإعدادات</h2>
                          
                          <div className="space-y-4">
                              {/* Edit Profile */}
                              <div className="bg-slate-700/50 p-3 rounded-xl">
                                  <label className="text-xs text-slate-400">تغيير الاسم</label>
                                  <div className="flex gap-2 mt-1">
                                      <input className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 text-white" value={user.name} onChange={e => setUser(p => ({...p, name: e.target.value}))}/>
                                      <Edit2 size={20} className="text-slate-400"/>
                                  </div>
                                  
                                  <label className="text-xs text-slate-400 mt-2 block">تغيير الصورة</label>
                                  <div className="grid grid-cols-5 gap-2 mt-1 bg-slate-900 p-2 rounded h-24 overflow-y-auto custom-scroll">
                                      {AVATARS.map((avi, idx) => (
                                          <img key={idx} src={avi} onClick={() => setUser(p => ({...p, avatar: avi}))} className={`w-8 h-8 rounded-full cursor-pointer ${user.avatar === avi ? 'ring-2 ring-emerald-500 bg-white' : 'opacity-50'}`}/>
                                      ))}
                                  </div>
                              </div>

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
                                  <Save size={20}/> حفظ التغييرات
                              </button>
                              
                              <button onClick={logout} className="w-full bg-slate-600 hover:bg-slate-500 py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                                  <LogOut size={20}/> تسجيل الخروج
                              </button>

                              <button onClick={deleteAccount} className="w-full bg-red-900/50 hover:bg-red-900/80 text-red-200 py-3 rounded-xl font-bold flex items-center justify-center gap-2 border border-red-500/30">
                                  <Trash2 size={20}/> حذف الحساب
                              </button>
                          </div>
                      </div>
                  </div>
              )}

              {/* Currency Exchange Modal */}
              {showExchange && (
                  <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
                      <div className="bg-slate-800 p-6 rounded-2xl border border-white/10 w-full max-w-sm text-center">
                          <h2 className="text-xl font-bold mb-4">تحويل العملات</h2>
                          <div className="grid grid-cols-2 gap-3 mb-4">
                              {[100, 500, 1000, 5000].map(amt => (
                                  <button key={amt} onClick={() => handleExchange(amt)} className="bg-slate-700 p-3 rounded-xl hover:bg-slate-600">{amt} عملة</button>
                              ))}
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