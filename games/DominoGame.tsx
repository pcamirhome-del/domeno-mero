import React, { useState, useEffect, useRef } from 'react';
import { Domino, DominoGameState, PlayerType, UserProfile, ChatMessage, VoiceEmote } from '../types';
import { generateDeck, getValidMoves, calculateHandValue, orientTile } from '../utils';
import { DominoTile } from '../components/DominoTile';
import { playSound } from '../sounds';
import { User, Cpu, AlertCircle, Loader2, Send, Smile, Volume2, Clock, XCircle, Trophy, Zap, Gift, HelpCircle, BookOpen } from 'lucide-react';

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

  const boardRef = useRef<HTMLDivElement>(null);
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

  // Scroll board
  useEffect(() => {
    if (boardRef.current) boardRef.current.scrollLeft = (boardRef.current.scrollWidth - boardRef.current.clientWidth) / 2;
  }, [gameState.board.length]);

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
             // Delay slightly to feel natural
             setTimeout(() => handleTurn('human'), 1000);
        }
    }
  }, [gameState.currentTurn, gameState.status, isAutoPlaying, gameState.deck.length]); 

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
                     // Draw
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
                    // Pass
                    return {
                        ...prev,
                        currentTurn: playerType === 'human' ? 'computer' : 'human',
                        message: 'تمرير الدور',
                        timeLeft: TURN_TIME
                    };
                }
            }

            // 2. Play Tile
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
                playSound('win');
                setTimeout(() => onEndGame(playerType, playerType === 'human' ? 100 : 0), 2000);
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
              playSound('win');
              setTimeout(() => onEndGame('human', 50), 2000);
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

  const buyAutoPlay = () => {
      if(confirm('هل تريد شراء اللعب التلقائي بـ 200 عملة؟')) {
          setHasAutoPlay(true);
          setIsAutoPlaying(true);
          onUpdateCoins(-200);
      }
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
          setFloatingEmote({ char: emote, type: soundType || 'emoji' });
      }

      const msg: ChatMessage = { 
          id: Date.now().toString(), 
          sender: user.name, 
          emoji: emote, 
          type: isGift ? 'gift' : (isVoice ? 'voice_emoji' : 'emoji') 
      };
      setChatMessages(prev => [...prev, msg]);
      setTimeout(() => setFloatingEmote(null), 2500);
  };

  // Visual Effect for Loss
  const isLoser = gameState.winner === 'computer';

  return (
    <div className={`flex flex-col h-full w-full relative overflow-hidden bg-slate-900 transition-all duration-1000 ${isLoser ? 'grayscale blur-[1px]' : ''}`}>
        
        {/* Loss Visual Overlay */}
        {isLoser && (
            <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-center bg-red-900/30 animate-in fade-in duration-1000">
                <div className="text-8xl animate-bounce">😢</div>
                <h2 className="text-5xl font-black text-white drop-shadow-[0_5px_5px_rgba(255,0,0,0.8)] border-4 border-red-500 p-6 rounded-3xl bg-black/40 rotate-12 mt-4">
                    حظ أوفر!
                </h2>
            </div>
        )}

        {/* Top Bar */}
        <div className="flex justify-between items-center bg-slate-800/80 p-2 rounded-xl mb-2 backdrop-blur-sm border border-white/10 z-20 mx-2 mt-2">
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
                    onClick={hasAutoPlay ? () => setIsAutoPlaying(!isAutoPlaying) : buyAutoPlay}
                    className={`p-2 rounded-full ${hasAutoPlay ? (isAutoPlaying ? 'bg-green-500 animate-pulse' : 'bg-slate-600') : 'bg-orange-500'}`}
                 >
                     <Zap size={20} className="text-white"/>
                 </button>
                 <button onClick={() => setShowExitConfirm(true)} className="bg-red-500/20 hover:bg-red-500 text-red-200 p-2 rounded-full transition-colors">
                    <XCircle size={24} />
                </button>
            </div>
        </div>

        {/* Board */}
        <div className="flex-1 flex items-center justify-center overflow-hidden relative z-0 p-4">
             <div ref={boardRef} className="billiard-table w-full h-full flex items-center overflow-x-auto overflow-y-hidden shadow-2xl relative">
                 {gameState.board.length === 0 && <div className="absolute inset-0 flex items-center justify-center text-white/30 text-2xl font-bold pointer-events-none">انتظر النقلة الأولى...</div>}
                 <div className="flex items-center m-auto space-x-1 space-x-reverse px-12 min-w-max"> 
                    {gameState.board.map((tile) => (
                         <DominoTile key={tile.id} left={tile.left} right={tile.right} orientation={tile.isDouble ? 'vertical' : 'horizontal'} size="md" highlight={lastPlayedTile === tile.id} />
                    ))}
                 </div>
            </div>
        </div>

        {/* Player Area */}
        <div className="mt-2 flex flex-col gap-2 z-20">
             <div className="bg-slate-800/90 p-3 rounded-t-2xl border-t border-white/10 backdrop-blur-md shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
                 <div className="flex justify-between items-center mb-2">
                     <div className="flex items-center gap-2">
                         <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold border border-white">
                             {user.name.charAt(0)}
                         </div>
                         <div className="text-sm font-bold text-white">{user.name}</div>
                     </div>
                     <div className="text-xs text-yellow-400 flex items-center gap-1">
                         <Clock size={12} /> {gameState.currentTurn === 'human' ? gameState.timeLeft : '--'}
                     </div>
                 </div>

                 <div className="flex overflow-x-auto gap-2 pb-2 min-h-[80px] items-center">
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

                 {/* Controls */}
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
                         <button onClick={() => sendEmote('🌹', false, undefined, true)} className="text-2xl bg-red-900/50 rounded">🌹</button>
                     </div>
                 )}
             </div>
        </div>

        {/* Exit Confirmation Modal */}
        {showExitConfirm && (
            <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
                <div className="bg-slate-800 p-6 rounded-2xl border border-white/10 max-w-sm w-full text-center">
                    <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
                    <h3 className="text-xl font-bold mb-2 text-white">هل أنت متأكد من الخروج؟</h3>
                    <p className="text-slate-400 mb-6">سيتم اعتبارك خاسراً وستفقد نقاط الجولة.</p>
                    <div className="flex gap-4">
                        <button onClick={() => onEndGame(null, 0)} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold">خروج</button>
                        <button onClick={() => setShowExitConfirm(false)} className="flex-1 bg-slate-600 hover:bg-slate-500 text-white py-3 rounded-xl font-bold">إلغاء</button>
                    </div>
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
                        <p>3. السحب: إذا لم يكن لديك نقلة، يجب عليك السحب من المخزون حتى تجد حجراً مناسباً.</p>
                        <p>4. الفوز: يفوز اللاعب الذي ينهي أحجاره أولاً. إذا أغلقت اللعبة (لا يوجد نقلات للطرفين)، يفوز صاحب مجموع النقاط الأقل.</p>
                    </div>
                    <button onClick={() => setShowHelp(false)} className="mt-6 w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold">فهمت</button>
                </div>
            </div>
        )}
    </div>
  );
};