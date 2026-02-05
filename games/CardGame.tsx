import React, { useState, useEffect } from 'react';
import { Card, CardGameState, UserProfile, Player, ChatMessage, VoiceEmote } from '../types';
import { generateCardDeck } from '../utils';
import { PlayingCard } from '../components/PlayingCard';
import { playSound } from '../sounds';
import { Clock, XCircle, ArrowRight, Loader2, Zap, Smile, Volume2, Send, Gift, AlertCircle, Trophy } from 'lucide-react';

interface CardGameProps {
  user: UserProfile;
  onEndGame: (winner: boolean, coins: number) => void;
}

export const CardGame: React.FC<CardGameProps> = ({ user, onEndGame }) => {
  const [state, setState] = useState<CardGameState>({
    deck: [],
    discardPile: [],
    players: [],
    currentTurnIndex: 0,
    direction: 1,
    status: 'playing',
    winner: null,
    message: 'توزيع الأوراق...',
    timeLeft: 30,
  });

  const [matchScores, setMatchScores] = useState<number[]>([0, 0, 0, 0]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [hasAutoPlay, setHasAutoPlay] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [showEmotes, setShowEmotes] = useState(false);
  const [floatingEmote, setFloatingEmote] = useState<{char: string, target?: string} | null>(null);
  
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showTrophy, setShowTrophy] = useState<'gold' | 'silver' | null>(null);

  useEffect(() => {
    initGame();
  }, []);

  // AutoPlay Logic
  useEffect(() => {
      if (state.status !== 'playing') return;
      const isHumanTurn = state.currentTurnIndex === 0;

      if (isHumanTurn && isAutoPlaying) {
          setTimeout(playBotTurn, 1000);
      } else if (!isHumanTurn) {
          setTimeout(playBotTurn, 1500);
      }
  }, [state.currentTurnIndex, state.status, isAutoPlaying]);

  const initGame = () => {
    playSound('draw');
    const fullDeck = generateCardDeck(false);
    
    // Deal 5 cards to 4 players
    const players: Player[] = [
        { type: 'human', name: user.name, cardHand: [], score: 0, hand: [] },
        { type: 'computer', name: 'بوت 1', cardHand: [], score: 0, hand: [] },
        { type: 'computer', name: 'بوت 2', cardHand: [], score: 0, hand: [] },
        { type: 'computer', name: 'بوت 3', cardHand: [], score: 0, hand: [] },
    ];

    for(let i=0; i<5; i++) {
        players.forEach(p => p.cardHand.push(fullDeck.pop()!));
    }

    const startCard = fullDeck.pop()!;
    
    setState({
        deck: fullDeck,
        discardPile: [startCard],
        players,
        currentTurnIndex: 0, 
        direction: 1,
        status: 'playing',
        winner: null,
        message: 'دورك!',
        timeLeft: 30
    });
  };

  const playCard = (card: Card) => {
      const topCard = state.discardPile[state.discardPile.length - 1];
      const isValid = card.suit === topCard.suit || card.rank === topCard.rank || card.rank === '8';
      
      if (isValid) {
          playSound('place');
          const currentPlayer = state.players[state.currentTurnIndex];
          const newHand = currentPlayer.cardHand.filter(c => c.id !== card.id);
          const newDiscard = [...state.discardPile, card];

          if (newHand.length === 0) {
              handleRoundEnd(state.currentTurnIndex);
              return;
          }

          const playersCopy = [...state.players];
          playersCopy[state.currentTurnIndex].cardHand = newHand;

          setState(prev => ({
              ...prev,
              players: playersCopy,
              discardPile: newDiscard,
              currentTurnIndex: (prev.currentTurnIndex + 1) % 4,
              message: `دور ${prev.players[(prev.currentTurnIndex + 1) % 4].name}`
          }));
      }
  };

  const drawCard = () => {
      if (state.deck.length === 0) return; 
      playSound('draw');
      const newDeck = [...state.deck];
      const card = newDeck.pop()!;
      const playersCopy = [...state.players];
      playersCopy[state.currentTurnIndex].cardHand.push(card);

      setState(prev => ({
          ...prev,
          deck: newDeck,
          players: playersCopy,
          currentTurnIndex: (prev.currentTurnIndex + 1) % 4,
          message: `دور ${prev.players[(prev.currentTurnIndex + 1) % 4].name}`
      }));
  };

  const playBotTurn = () => {
      const topCard = state.discardPile[state.discardPile.length - 1];
      const currentPlayer = state.players[state.currentTurnIndex];
      const validCard = currentPlayer.cardHand.find(c => c.suit === topCard.suit || c.rank === topCard.rank || c.rank === '8');
      
      if (validCard) {
          playCard(validCard);
      } else {
          drawCard();
      }
  };

  const handleRoundEnd = (winnerIndex: number) => {
      // Calculate points (sum of other players hands)
      let points = 0;
      state.players.forEach((p, idx) => {
          if (idx !== winnerIndex) {
              points += p.cardHand.reduce((acc, c) => acc + (c.value || 0), 0);
          }
      });

      const newScores = [...matchScores];
      newScores[winnerIndex] += points;
      setMatchScores(newScores);

      if (newScores[winnerIndex] >= 100) {
          finishGame(winnerIndex === 0);
      } else {
          alert(`${state.players[winnerIndex].name} فاز بالجولة! النقاط: ${points}. النتيجة: ${newScores[0]} - ${newScores[1]} - ${newScores[2]} - ${newScores[3]}`);
          initGame(); // Next round
      }
  };

  const toggleAutoPlay = () => {
      if (!hasAutoPlay) {
          if(confirm('شراء اللعب التلقائي بـ 200 عملة؟')) {
              setHasAutoPlay(true);
              setIsAutoPlaying(true);
          }
      } else {
          setIsAutoPlaying(!isAutoPlaying);
      }
  };

  const finishGame = (won: boolean) => {
      playSound(won ? 'win' : 'lose');
      setShowTrophy(won ? 'gold' : 'silver');
  };

  const closeTrophy = () => {
      onEndGame(showTrophy === 'gold', showTrophy === 'gold' ? 500 : 20);
  };

  // Chat
  const sendChat = (text: string) => {
      if (!text.trim()) return;
      const msg: ChatMessage = { id: Date.now().toString(), sender: user.name, text, type: 'text' };
      setChatMessages(prev => [...prev, msg]);
      setChatInput('');
  };

  const sendEmote = (emote: string, isGift = false) => {
      setFloatingEmote({ char: emote, target: isGift ? 'opponent' : 'self' });
      setTimeout(() => setFloatingEmote(null), 2000);
      playSound('laugh'); // Generic sound
  };

  if (state.players.length === 0) return <Loader2 className="animate-spin m-auto"/>;

  const topCard = state.discardPile[state.discardPile.length - 1];

  return (
    <div className="flex flex-col h-full bg-green-900 relative overflow-hidden">
        
        {/* Score Header */}
        <div className="absolute top-4 left-4 z-10 bg-black/40 text-white px-2 py-1 rounded text-xs">
            الهدف: 100 | نتيجتك: <span className="text-yellow-400 font-bold">{matchScores[0]}</span>
        </div>

        {/* Top Opponents */}
        <div className="flex justify-around pt-8">
             {state.players.slice(1).map((p, i) => (
                 <div key={i} className={`flex flex-col items-center transition-opacity ${state.currentTurnIndex === i+1 ? 'opacity-100 scale-110' : 'opacity-60'}`}>
                     <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white text-white font-bold">{p.name.charAt(0)}</div>
                     <div className="bg-white/20 px-2 rounded mt-1 text-xs text-white">{p.cardHand.length} كروت</div>
                     <div className="text-[10px] text-yellow-300">{matchScores[i+1]} pts</div>
                     {floatingEmote?.target === 'opponent' && <div className="absolute text-4xl animate-bounce">🌹</div>}
                 </div>
             ))}
        </div>

        {/* Center Table */}
        <div className="flex-1 flex items-center justify-center gap-8 relative">
            {/* Draw Pile */}
            <div onClick={state.currentTurnIndex === 0 ? drawCard : undefined} className="cursor-pointer">
                 <div className="w-20 h-32 bg-blue-800 rounded-lg border-2 border-white flex items-center justify-center shadow-xl">
                     <span className="text-white font-bold">سحب</span>
                 </div>
            </div>
            
            {/* Discard Pile */}
            <div className="relative">
                <PlayingCard card={topCard} disabled />
                <div className="absolute -top-8 left-0 right-0 text-center text-yellow-300 font-bold animate-pulse">{state.message}</div>
            </div>
        </div>

        {/* Player Hand */}
        <div className="pb-20 px-4 overflow-x-auto">
            <div className="flex justify-center -space-x-4 rtl:space-x-reverse min-w-max mx-auto">
                {state.players[0].cardHand.map((c, i) => (
                    <div key={c.id} className="transition-transform hover:-translate-y-4" onClick={() => state.currentTurnIndex === 0 && playCard(c)}>
                        <PlayingCard card={c} />
                    </div>
                ))}
            </div>
        </div>

        {/* UI Overlay Buttons */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
            <button onClick={() => setShowExitConfirm(true)} className="bg-red-500/20 text-red-200 p-2 rounded-full"><XCircle/></button>
            <button onClick={toggleAutoPlay} className={`p-2 rounded-full ${hasAutoPlay ? (isAutoPlaying ? 'bg-green-500 ring-2 ring-green-300' : 'bg-slate-600') : 'bg-orange-500'}`}>
                <Zap className="text-white" size={20}/>
            </button>
        </div>

        {/* Bottom Left Chat */}
        <div className="absolute bottom-4 left-4 z-40 w-full max-w-xs flex flex-col gap-2 pointer-events-none">
             {/* Log */}
             <div className="flex flex-col-reverse gap-1 items-start h-24 overflow-hidden mb-1 pl-1">
                {chatMessages.slice(-4).reverse().map((msg, i) => (
                    <div key={msg.id} className="bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs animate-in slide-in-from-left fade-in">
                        <span className="font-bold text-emerald-400">{msg.sender}:</span> {msg.text}
                    </div>
                ))}
             </div>
             {/* Input */}
             <div className="flex items-center gap-2 pointer-events-auto pr-8">
                  <div className="flex-1 flex bg-slate-900/90 rounded-full px-3 py-2 items-center border border-slate-700">
                      <input className="bg-transparent border-none outline-none text-white text-sm flex-1" placeholder="اكتب..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendChat(chatInput)} />
                      <button onClick={() => sendChat(chatInput)} className="text-emerald-400"><Send size={16}/></button>
                  </div>
                  <button onClick={() => setShowEmotes(!showEmotes)} className="bg-slate-700 p-2 rounded-full text-yellow-400 hover:bg-slate-600"><Smile size={20}/></button>
             </div>
        </div>

        {/* Emotes Modal */}
        {showEmotes && (
            <div className="absolute bottom-16 left-4 bg-slate-800 p-2 rounded-xl grid grid-cols-4 gap-2 shadow-2xl z-50 animate-in slide-in-from-bottom">
                 {['🌹','😂','😡','👍'].map(e => <button key={e} onClick={() => sendEmote(e)} className="text-2xl hover:scale-110 transition-transform">{e}</button>)}
                 <button onClick={() => setShowEmotes(false)} className="col-span-4 text-xs text-red-400 mt-1">إغلاق</button>
            </div>
        )}

        {/* Exit Modal */}
        {showExitConfirm && (
            <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
                <div className="bg-slate-800 p-6 rounded-2xl border border-white/10 max-w-sm w-full text-center">
                    <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
                    <h3 className="text-xl font-bold mb-2 text-white">هل أنت متأكد من الخروج؟</h3>
                    <div className="flex gap-4 mt-6">
                        <button onClick={() => onEndGame(false, 0)} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold">تأكيد الخروج</button>
                        <button onClick={() => setShowExitConfirm(false)} className="flex-1 bg-slate-600 hover:bg-slate-500 text-white py-3 rounded-xl font-bold">إلغاء</button>
                    </div>
                </div>
            </div>
        )}

        {/* Trophy Modal */}
        {showTrophy && (
            <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 animate-in zoom-in duration-300">
                <div className="bg-slate-800 p-8 rounded-3xl border-4 border-yellow-500/50 text-center max-w-sm w-full">
                    {showTrophy === 'gold' ? (
                        <>
                            <Trophy size={100} className="mx-auto text-yellow-400 animate-bounce mb-4" />
                            <h2 className="text-4xl font-black text-yellow-300 mb-2">الفائز بالمباراة!</h2>
                        </>
                    ) : (
                        <>
                            <Trophy size={100} className="mx-auto text-slate-400 mb-4" />
                            <h2 className="text-4xl font-black text-slate-300 mb-2">خسارة</h2>
                        </>
                    )}
                    <button onClick={closeTrophy} className="w-full bg-emerald-600 hover:bg-emerald-500 py-4 rounded-xl font-bold text-xl shadow-lg mt-6">استمرار</button>
                </div>
            </div>
        )}
    </div>
  );
};