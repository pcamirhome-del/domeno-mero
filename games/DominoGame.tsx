import React, { useState, useEffect, useRef } from 'react';
import { Domino, DominoGameState, PlayerType, UserProfile, ChatMessage, VoiceEmote } from '../types';
import { generateDeck, getValidMoves, calculateHandValue, orientTile } from '../utils';
import { DominoTile } from '../components/DominoTile';
import { playSound } from '../sounds';
import { User, Cpu, AlertCircle, Loader2, Send, Smile, Volume2, Clock, XCircle, Trophy, Zap, Gift, HelpCircle, BookOpen, Hand } from 'lucide-react';

interface DominoGameProps {
  user: UserProfile;
  opponentName: string; 
  onEndGame: (winner: 'human' | 'computer' | null, coinsEarned: number) => void;
  onUpdateCoins: (amount: number) => void;
}

const TURN_TIME = 60; 

export const DominoGame: React.FC<DominoGameProps> = ({ user, opponentName, onEndGame, onUpdateCoins }) => {
  // Game State
  const [gameState, setGameState] = useState<DominoGameState>({
    board: [],
    deck: [],
    players: {
      human: { type: 'human', name: user.name, hand: [], score: 0, cardHand: [] },
      computer: { type: 'computer', name: opponentName, hand: [], score: 0, cardHand: [] },
    },
    currentTurn: 'human',
    status: 'playing',
    winner: null,
    boardEnds: { left: -1, right: -1 },
    message: 'بدأت اللعبة!',
    timeLeft: TURN_TIME,
  });

  const [lastPlayedTile, setLastPlayedTile] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showEmotes, setShowEmotes] = useState(false);
  const [floatingEmote, setFloatingEmote] = useState<{char: string, type: string, target?: string} | null>(null);
  
  // AutoPlay State
  const [hasAutoPlay, setHasAutoPlay] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  // New UI States
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showTrophy, setShowTrophy] = useState<'gold' | 'silver' | null>(null);

  const boardContainerRef = useRef<HTMLDivElement>(null);
  const gameActiveRef = useRef(true); 

  useEffect(() => {
    gameActiveRef.current = true;
    startRound();
    return () => { gameActiveRef.current = false; };
  }, []);

  // Timer Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (gameState.status === 'playing') {
      interval = setInterval(() => {
        setGameState(prev => {
          if (!gameActiveRef.current || prev.status !== 'playing') return prev;
          if (prev.timeLeft <= 0) {
             return { ...prev, timeLeft: 0 }; 
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState.status]);

  // Handle Timeout
  useEffect(() => {
      if (gameState.timeLeft === 0 && gameState.status === 'playing') {
          handleTimeout();
      }
  }, [gameState.timeLeft]);

  const handleTimeout = () => {
      if (!gameActiveRef.current) return;
      const nextPlayer = gameState.currentTurn === 'human' ? 'computer' : 'human';
      setGameState(prev => ({
          ...prev,
          currentTurn: nextPlayer,
          message: 'انتهى الوقت! تم تحويل الدور',
          timeLeft: TURN_TIME
      }));
  };

  const startRound = () => {
    playSound('draw');
    const newDeck = generateDeck();
    const humanHand = newDeck.splice(0, 7);
    const computerHand = newDeck.splice(0, 7);
    
    setGameState(prev => ({
      ...prev,
      deck: newDeck,
      board: [],
      players: {
        human: { ...prev.players.human, hand: humanHand },
        computer: { ...prev.players.computer, hand: computerHand },
      },
      currentTurn: 'human',
      status: 'playing',
      winner: null,
      boardEnds: { left: -1, right: -1 },
      timeLeft: TURN_TIME,
      message: 'دورك!',
    }));
  };

  // AI & AutoPlay Logic
  useEffect(() => {
    if (gameState.status === 'playing') {
        if (gameState.currentTurn === 'computer') {
            handleTurn('computer');
        } else if (gameState.currentTurn === 'human' && isAutoPlaying) {
             setTimeout(() => handleTurn('human'), 1000);
        }
    }
  }, [gameState.currentTurn, gameState.status, isAutoPlaying, gameState.deck.length]); 

  // Combined logic for computer and auto-player moves
  const handleTurn = (playerType: PlayerType) => {
    setTimeout(() => {
        if (!gameActiveRef.current) return;
        
        setGameState(prev => {
            const pKey = playerType === 'human' ? 'human' : 'computer';
            if (prev.currentTurn !== playerType || prev.status !== 'playing') return prev;

            const hand = prev.players[pKey].hand;
            const valid = getValidMoves(hand, prev.boardEnds.left, prev.boardEnds.right);

            // 1. Draw or Pass
            if (valid.length === 0) {
                if (prev.deck.length > 0) {
                     const newDeck = [...prev.deck];
                     const drawn = newDeck.pop()!;
                     playSound('draw');
                     return {
                         ...prev,
                         deck: newDeck,
                         players: { ...prev.players, [pKey]: { ...prev.players[pKey], hand: [...hand, drawn] } },
                         message: 'سحب ورقة...',
                         timeLeft: TURN_TIME
                     };
                } else {
                    return {
                        ...prev,
                        currentTurn: playerType === 'human' ? 'computer' : 'human',
                        message: 'تمرير الدور',
                        timeLeft: TURN_TIME
                    };
                }
            }

            // 2. Play Tile
            // Simple AI: Play biggest double or biggest value
            valid.sort((a, b) => (b.left + b.right) - (a.left + a.right));
            const tile = valid[0];

            let newBoard = [...prev.board];
            let newEnds = { ...prev.boardEnds };

            playSound('place');
            setLastPlayedTile(tile.id);

            if (newBoard.length === 0) {
                newBoard.push({ ...tile, placedAt: 'start' });
                newEnds = { left: tile.left, right: tile.right };
            } else {
                const canLeft = tile.left === newEnds.left || tile.right === newEnds.left;
                const canRight = tile.left === newEnds.right || tile.right === newEnds.right;
                let side: 'left' | 'right' = 'right';
                // Preference logic needed here for visual snake building, simplifying to basic append
                if (canRight) side = 'right';
                else if (canLeft) side = 'left';

                if (side === 'left') {
                    const o = orientTile(tile, newEnds.left, 'left');
                    newBoard.unshift({ ...tile, left: o.left, right: o.right, placedAt: 'start' });
                    newEnds.left = o.left;
                } else {
                    const o = orientTile(tile, newEnds.right, 'right');
                    newBoard.push({ ...tile, left: o.left, right: o.right, placedAt: 'end' });
                    newEnds.right = o.right;
                }
            }

            const newHand = hand.filter(t => t.id !== tile.id);

            if (newHand.length === 0) {
                finishGame(playerType);
                return {
                    ...prev,
                    board: newBoard,
                    boardEnds: newEnds,
                    players: { ...prev.players, [pKey]: { ...prev.players[pKey], hand: newHand } },
                    status: 'round_over',
                    winner: playerType,
                    message: `فاز ${prev.players[pKey].name}!`
                };
            }

            return {
                ...prev,
                board: newBoard,
                boardEnds: newEnds,
                players: { ...prev.players, [pKey]: { ...prev.players[pKey], hand: newHand } },
                currentTurn: playerType === 'human' ? 'computer' : 'human',
                message: 'تحويل الدور...',
                timeLeft: TURN_TIME
            };
        });
    }, 1000);
  };

  const handleUserPlay = (tile: Domino) => {
      if (gameState.currentTurn !== 'human' || isAutoPlaying) return; 
      
      const valid = getValidMoves([tile], gameState.boardEnds.left, gameState.boardEnds.right).length > 0 || gameState.board.length === 0;
      if (!valid) return;

      playSound('place');
      setLastPlayedTile(tile.id);
      
      setGameState(prev => {
          let newBoard = [...prev.board];
          let newEnds = { ...prev.boardEnds };
          
          if (newBoard.length === 0) {
              newBoard.push({ ...tile, placedAt: 'start' });
              newEnds = { left: tile.left, right: tile.right };
          } else {
              const canLeft = tile.left === newEnds.left || tile.right === newEnds.left;
              const canRight = tile.left === newEnds.right || tile.right === newEnds.right;
              let side: 'left' | 'right' = 'right';
              if (canRight) side = 'right';
              else if (canLeft) side = 'left';

              if (side === 'left') {
                  const o = orientTile(tile, newEnds.left, 'left');
                  newBoard.unshift({ ...tile, left: o.left, right: o.right, placedAt: 'start' });
                  newEnds.left = o.left;
              } else {
                  const o = orientTile(tile, newEnds.right, 'right');
                  newBoard.push({ ...tile, left: o.left, right: o.right, placedAt: 'end' });
                  newEnds.right = o.right;
              }
          }

          const newHand = prev.players.human.hand.filter(t => t.id !== tile.id);
          
          if (newHand.length === 0) {
              finishGame('human');
              return {
                  ...prev,
                  board: newBoard,
                  boardEnds: newEnds,
                  players: { ...prev.players, human: { ...prev.players.human, hand: newHand } },
                  status: 'round_over',
                  winner: 'human',
                  message: 'لقد فزت!'
              };
          }

          return {
              ...prev,
              board: newBoard,
              boardEnds: newEnds,
              players: { ...prev.players, human: { ...prev.players.human, hand: newHand } },
              currentTurn: 'computer',
              message: 'الكمبيوتر يفكر...',
              timeLeft: TURN_TIME
          };
      });
  };

  const manualDraw = () => {
      if (gameState.currentTurn !== 'human' || isAutoPlaying || gameState.deck.length === 0) return;
      
      // Check if player actually has no moves
      const validMoves = getValidMoves(gameState.players.human.hand, gameState.boardEnds.left, gameState.boardEnds.right);
      if (validMoves.length > 0 && gameState.board.length > 0) {
          alert("لديك نقلة متاحة!");
          return;
      }

      playSound('draw');
      setGameState(prev => {
          const newDeck = [...prev.deck];
          const drawn = newDeck.pop()!;
          return {
              ...prev,
              deck: newDeck,
              players: { ...prev.players, human: { ...prev.players.human, hand: [...prev.players.human.hand, drawn] } },
              message: 'تم سحب ورقة'
          };
      });
  };

  const finishGame = (winner: PlayerType) => {
      playSound(winner === 'human' ? 'win' : 'lose');
      setShowTrophy(winner === 'human' ? 'gold' : 'silver');
  };

  const toggleAutoPlay = () => {
      if (!hasAutoPlay) {
          if(confirm('هل تريد شراء اللعب التلقائي بـ 200 عملة؟')) {
            setHasAutoPlay(true);
            setIsAutoPlaying(true);
            onUpdateCoins(-200);
          }
      } else {
          setIsAutoPlaying(!isAutoPlaying);
      }
  };

  const closeTrophy = () => {
      onEndGame(showTrophy === 'gold' ? 'human' : 'computer', showTrophy === 'gold' ? 100 : 0);
  };

  // Chat & Gifts
  const sendChat = (text: string) => {
      if (!text.trim()) return;
      const msg: ChatMessage = { id: Date.now().toString(), sender: user.name, text, type: 'text' };
      setChatMessages(prev => [...prev, msg]);
      setChatInput('');
  };

  const sendEmote = (emote: string, isVoice: boolean, soundType?: VoiceEmote, isGift = false) => {
      if (isVoice && soundType) playSound(soundType);

      if (isGift) {
          setFloatingEmote({ char: emote, type: 'gift', target: 'opponent' });
      } else {
          setFloatingEmote({ char: emote, type: soundType || 'emoji', target: 'boneyard' });
      }

      const msg: ChatMessage = { 
          id: Date.now().toString(), 
          sender: user.name, 
          emoji: emote, 
          type: isGift ? 'gift' : (isVoice ? 'voice_emoji' : 'emoji') 
      };
      setChatMessages(prev => [...prev, msg]);
      setTimeout(() => setFloatingEmote(null), 2000);
  };

  // Zoom scale calculation for board
  // We want to fit 'N' tiles. Approx tile width is 60px.
  // Board width is let's say 800px.
  // If total tiles width > board width, scale down.
  const boardWidth = gameState.board.length * 50; 
  const containerWidth = boardContainerRef.current?.clientWidth || 800;
  const scale = Math.min(1, containerWidth / boardWidth);

  return (
    <div className={`flex flex-col h-full w-full relative overflow-hidden bg-slate-900`}>
        
        {/* Header - Opponent Info & Controls */}
        <div className="flex justify-between items-center bg-slate-800/80 p-2 rounded-xl mb-1 backdrop-blur-sm border border-white/10 z-20 mx-2 mt-2">
            <div className="flex items-center gap-3 relative">
                 <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-xl font-bold border-2 border-white shadow-lg">
                     {opponentName.charAt(0)}
                 </div>
                 {floatingEmote?.target === 'opponent' && <div className="absolute -bottom-8 left-2 text-4xl animate-bounce z-50">{floatingEmote.char}</div>}
                 <div>
                     <div className="font-bold text-white text-sm md:text-base">{opponentName}</div>
                     <div className="text-xs text-slate-400 flex items-center gap-1">
                         <Clock size={12} /> {gameState.currentTurn === 'computer' ? gameState.timeLeft : '--'}
                     </div>
                 </div>
            </div>

            <div className="text-xl md:text-2xl font-mono bg-black/30 px-4 py-1 rounded text-emerald-400">
                {gameState.players.computer.score} - {gameState.players.human.score}
            </div>

            <div className="flex gap-2">
                 <button onClick={() => setShowHelp(true)} className="bg-slate-700 hover:bg-slate-600 text-blue-300 p-2 rounded-full transition-colors">
                     <BookOpen size={20} />
                 </button>
                 <button 
                    onClick={toggleAutoPlay}
                    className={`p-2 rounded-full transition-all ${hasAutoPlay ? (isAutoPlaying ? 'bg-green-500 animate-pulse ring-2 ring-green-300' : 'bg-slate-500') : 'bg-orange-500'}`}
                 >
                     <Zap size={20} className="text-white"/>
                 </button>
                 <button onClick={() => setShowExitConfirm(true)} className="bg-red-500/20 hover:bg-red-500 text-red-200 p-2 rounded-full transition-colors">
                    <XCircle size={24} />
                </button>
            </div>
        </div>

        {/* Main Game Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-0">
             
             {/* Left: Boneyard */}
             <div className="w-full md:w-24 bg-slate-800/50 p-2 flex md:flex-col gap-2 items-center justify-center border-r border-white/5 relative">
                 <div className="text-slate-400 text-xs text-center font-bold mb-1">المخزون ({gameState.deck.length})</div>
                 <div className="bg-black/40 p-3 rounded-lg border border-white/10 flex md:flex-col gap-1 flex-wrap justify-center relative min-h-[60px]">
                     {/* Show visual representation of stack size */}
                     {gameState.deck.length > 0 ? (
                         <div className="relative w-8 h-14 bg-slate-300 rounded border border-slate-500 shadow-lg">
                             <div className="absolute -top-1 -right-1 w-full h-full bg-slate-300 rounded border border-slate-500 z-0"></div>
                             {gameState.deck.length > 5 && <div className="absolute -top-2 -right-2 w-full h-full bg-slate-300 rounded border border-slate-500 z-[-1]"></div>}
                         </div>
                     ) : (
                         <span className="text-xs text-slate-500">فارغ</span>
                     )}
                     
                     {/* Boneyard Emote Target */}
                     {floatingEmote?.target === 'boneyard' && (
                         <div className="absolute inset-0 flex items-center justify-center text-6xl animate-ping z-50 pointer-events-none">
                             {floatingEmote.char}
                         </div>
                     )}
                 </div>
                 
                 {/* Draw Button for User */}
                 {gameState.deck.length > 0 && gameState.currentTurn === 'human' && !isAutoPlaying && (
                     <button onClick={manualDraw} className="mt-2 bg-blue-600 hover:bg-blue-500 text-white text-xs p-2 rounded w-full flex flex-col items-center animate-pulse">
                         <Hand size={16}/> سحب
                     </button>
                 )}
             </div>

             {/* Center: Board - No Scroll, Scale to fit */}
             <div className="flex-1 flex items-center justify-center overflow-hidden relative bg-[#0f392b] border-[12px] border-[#3e2723] rounded-lg m-2 shadow-inner">
                 <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] pointer-events-none"></div>
                 <div 
                    ref={boardContainerRef} 
                    className="w-full h-full flex items-center justify-center relative z-10 transition-transform duration-300"
                 >
                     {gameState.board.length === 0 && <div className="absolute inset-0 flex items-center justify-center text-white/30 text-2xl font-bold pointer-events-none">انتظر النقلة الأولى...</div>}
                     
                     {/* The Board Chain */}
                     <div 
                        className="flex items-center justify-center transition-transform duration-500 ease-out"
                        style={{ transform: `scale(${Math.max(0.4, Math.min(1, 15 / Math.max(1, gameState.board.length)))})` }}
                     >
                        {gameState.board.map((tile) => (
                             <div key={tile.id} className="mx-0.5">
                                 <DominoTile left={tile.left} right={tile.right} orientation={tile.isDouble ? 'vertical' : 'horizontal'} size="md" highlight={lastPlayedTile === tile.id} />
                             </div>
                        ))}
                     </div>
                 </div>
             </div>
        </div>

        {/* Player Hand & Chat Area */}
        <div className="bg-slate-800/90 p-3 rounded-t-2xl border-t border-white/10 backdrop-blur-md shadow-[0_-5px_20px_rgba(0,0,0,0.5)] z-20">
             <div className="flex justify-between items-center mb-2">
                 <div className="flex items-center gap-2">
                     <img src={user.avatar} className="w-8 h-8 rounded-full border border-white"/>
                     <div className="text-sm font-bold text-white">{user.name}</div>
                 </div>
                 <div className="text-xs text-yellow-400 flex items-center gap-1">
                     <Clock size={12} /> {gameState.currentTurn === 'human' ? gameState.timeLeft : '--'}
                 </div>
             </div>

             <div className="flex overflow-x-auto gap-2 pb-2 min-h-[80px] items-center custom-scroll">
                 {gameState.players.human.hand.map(tile => {
                     const valid = getValidMoves([tile], gameState.boardEnds.left, gameState.boardEnds.right).length > 0 || gameState.board.length === 0;
                     return (
                        <div key={tile.id}>
                            <DominoTile 
                                left={tile.left} 
                                right={tile.right} 
                                isDouble={tile.isDouble}
                                size="sm"
                                disabled={gameState.currentTurn !== 'human' || isAutoPlaying || (!valid && gameState.board.length > 0)}
                                highlight={valid && gameState.currentTurn === 'human' && !isAutoPlaying}
                                onClick={() => handleUserPlay(tile)}
                            />
                        </div>
                     );
                 })}
             </div>

             {/* Controls & Chat */}
             <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 flex bg-slate-900 rounded-full px-3 py-1 items-center border border-slate-700">
                      <input className="bg-transparent border-none outline-none text-white text-sm flex-1" placeholder="اكتب رسالة..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendChat(chatInput)} />
                      <button onClick={() => sendChat(chatInput)} className="text-emerald-400"><Send size={16}/></button>
                  </div>
                  <button onClick={() => setShowEmotes(!showEmotes)} className="bg-slate-700 p-2 rounded-full text-yellow-400 hover:bg-slate-600">
                      <Smile size={20} />
                  </button>
             </div>

             {/* Emote Menu */}
             {showEmotes && (
                 <div className="absolute bottom-16 right-4 bg-slate-800 border border-slate-600 rounded-xl p-2 grid grid-cols-4 gap-2 shadow-2xl z-50 animate-in zoom-in slide-in-from-bottom-5">
                     {['😀','👍','👋','❤️'].map(e => <button key={e} onClick={() => sendEmote(e, false)} className="text-2xl hover:scale-125 transition-transform">{e}</button>)}
                     <button onClick={() => sendEmote('🤣', true, 'laugh')} className="text-2xl"><span className="text-xs absolute top-0 right-0">مجاني</span>🤣</button>
                     <button onClick={() => sendEmote('😡', true, 'angry')} className="text-2xl"><span className="text-xs absolute top-0 right-0">مجاني</span>😡</button>
                     <button onClick={() => sendEmote('💋', true, 'kiss')} className="text-2xl"><span className="text-xs absolute top-0 right-0">مجاني</span>💋</button>
                     <button onClick={() => sendEmote('🌹', false, undefined, true)} className="text-2xl bg-red-900/50 rounded">🌹</button>
                 </div>
             )}
        </div>

        {/* Exit Confirmation Modal */}
        {showExitConfirm && (
            <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
                <div className="bg-slate-800 p-6 rounded-2xl border border-white/10 max-w-sm w-full text-center">
                    <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
                    <h3 className="text-xl font-bold mb-2 text-white">هل أنت متأكد من الخروج؟</h3>
                    <p className="text-slate-400 mb-6">سيتم اعتبارك خاسراً وستفقد نقاط الجولة.</p>
                    <div className="flex gap-4">
                        <button onClick={() => onEndGame(null, 0)} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold">تأكيد الخروج</button>
                        <button onClick={() => setShowExitConfirm(false)} className="flex-1 bg-slate-600 hover:bg-slate-500 text-white py-3 rounded-xl font-bold">إلغاء</button>
                    </div>
                </div>
            </div>
        )}

        {/* Trophy Modal */}
        {showTrophy && (
            <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 animate-in zoom-in duration-300">
                <div className="bg-gradient-to-b from-slate-800 to-slate-900 p-8 rounded-3xl border-4 border-yellow-500/50 text-center max-w-sm w-full relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
                    
                    {showTrophy === 'gold' ? (
                        <>
                            <Trophy size={100} className="mx-auto text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.6)] animate-bounce mb-4" />
                            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 mb-2">الفائز!</h2>
                            <p className="text-yellow-100 text-lg mb-6">أداء مذهل يا {user.name}!</p>
                            <div className="text-2xl font-bold text-emerald-400 mb-8">+100 عملة</div>
                        </>
                    ) : (
                        <>
                            <Trophy size={100} className="mx-auto text-slate-400 drop-shadow-[0_0_30px_rgba(148,163,184,0.6)] mb-4" />
                            <h2 className="text-4xl font-black text-slate-300 mb-2">المركز الثاني</h2>
                            <p className="text-slate-400 text-lg mb-6">حظ أوفر في المرة القادمة!</p>
                        </>
                    )}
                    
                    <button onClick={closeTrophy} className="w-full bg-emerald-600 hover:bg-emerald-500 py-4 rounded-xl font-bold text-xl shadow-lg relative z-10">
                        استمرار
                    </button>
                </div>
            </div>
        )}

        {/* Help Modal */}
        {showHelp && (
            <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
                <div className="bg-slate-800 p-6 rounded-2xl border border-white/10 max-w-sm w-full text-center">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2"><BookOpen className="text-yellow-400"/> قواعد اللعبة</h3>
                        <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-white"><XCircle/></button>
                    </div>
                    <div className="text-slate-300 text-right space-y-2 text-sm max-h-[60vh] overflow-y-auto">
                        <p>1. الهدف: التخلص من جميع أحجار الدومينو في يدك قبل الخصم.</p>
                        <p>2. اللعب: طابق عدد النقاط في أحد طرفي الحجر مع طرف مفتوح على الطاولة.</p>
                        <p>3. السحب: إذا لم يكن لديك نقلة، استخدم زر السحب.</p>
                        <p>4. الفوز: يفوز اللاعب الذي ينهي أحجاره أولاً.</p>
                    </div>
                    <button onClick={() => setShowHelp(false)} className="mt-6 w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold">فهمت</button>
                </div>
            </div>
        )}
    </div>
  );
};