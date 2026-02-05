import React, { useState, useEffect } from 'react';
import { Card, CardGameState, UserProfile, Player, ChatMessage, VoiceEmote } from '../types';
import { generateCardDeck } from '../utils';
import { PlayingCard } from '../components/PlayingCard';
import { playSound } from '../sounds';
import { Clock, XCircle, ArrowRight, Loader2, Zap, Smile, Volume2, Send, Gift } from 'lucide-react';

interface CardGameProps {
  user: UserProfile;
  onEndGame: (winner: boolean, coins: number) => void;
}

// "Professional Ordinary Card Game" - Simple Crazy Eights / Shedding style
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

  const [hasAutoPlay, setHasAutoPlay] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [showEmotes, setShowEmotes] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [floatingEmote, setFloatingEmote] = useState<{char: string, target?: string} | null>(null);

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
      // Validation: Match Suit OR Match Rank OR Card is 8 (Wild)
      const isValid = card.suit === topCard.suit || card.rank === topCard.rank || card.rank === '8';
      
      if (isValid) {
          playSound('place');
          const currentPlayer = state.players[state.currentTurnIndex];
          const newHand = currentPlayer.cardHand.filter(c => c.id !== card.id);
          const newDiscard = [...state.discardPile, card];

          // Check Win
          if (newHand.length === 0) {
              const won = currentPlayer.type === 'human';
              playSound(won ? 'win' : 'lose');
              onEndGame(won, won ? 500 : 20);
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
      } else {
          // alert('حركة غير صالحة'); // Too intrusive, just ignore
      }
  };

  const drawCard = () => {
      if (state.deck.length === 0) return; // Empty deck logic (usually reshuffle discard)
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

  const buyAutoPlay = () => {
      if(confirm('شراء اللعب التلقائي بـ 200 عملة؟')) {
          setHasAutoPlay(true);
          setIsAutoPlaying(true);
      }
  };

  // Chat
  const sendEmote = (emote: string, isGift = false) => {
      setFloatingEmote({ char: emote, target: isGift ? 'opponent' : 'self' });
      setTimeout(() => setFloatingEmote(null), 2000);
      playSound('laugh'); // Generic sound
  };

  if (state.players.length === 0) return <Loader2 className="animate-spin m-auto"/>;

  const topCard = state.discardPile[state.discardPile.length - 1];

  return (
    <div className="flex flex-col h-full bg-green-900 relative overflow-hidden">
        {/* Top Opponents */}
        <div className="flex justify-around pt-4">
             {state.players.slice(1).map((p, i) => (
                 <div key={i} className={`flex flex-col items-center transition-opacity ${state.currentTurnIndex === i+1 ? 'opacity-100 scale-110' : 'opacity-60'}`}>
                     <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white text-white font-bold">{p.name.charAt(0)}</div>
                     <div className="bg-white/20 px-2 rounded mt-1 text-xs text-white">{p.cardHand.length} كروت</div>
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
        <div className="pb-4 px-4 overflow-x-auto">
            <div className="flex justify-center -space-x-4 rtl:space-x-reverse min-w-max mx-auto">
                {state.players[0].cardHand.map((c, i) => (
                    <div key={c.id} className="transition-transform hover:-translate-y-4" onClick={() => state.currentTurnIndex === 0 && playCard(c)}>
                        <PlayingCard card={c} />
                    </div>
                ))}
            </div>
        </div>

        {/* UI Overlay */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
            <button onClick={() => onEndGame(false, 0)} className="bg-red-500/20 text-red-200 p-2 rounded-full"><XCircle/></button>
            <button onClick={hasAutoPlay ? () => setIsAutoPlaying(!isAutoPlaying) : buyAutoPlay} className={`p-2 rounded-full ${isAutoPlaying ? 'bg-green-500' : 'bg-slate-600'}`}>
                <Zap className="text-white" size={20}/>
            </button>
            <button onClick={() => setShowEmotes(!showEmotes)} className="p-2 bg-slate-700 rounded-full text-yellow-400"><Smile size={20}/></button>
        </div>

        {/* Chat */}
        {showEmotes && (
            <div className="absolute bottom-0 inset-x-0 bg-slate-800 p-4 rounded-t-2xl animate-in slide-in-from-bottom z-50">
                 <div className="flex gap-4 justify-center">
                     <button onClick={() => sendEmote('🌹', true)} className="text-2xl bg-red-900/50 p-2 rounded">🌹</button>
                     <button onClick={() => sendEmote('😂')} className="text-2xl">😂</button>
                     <button onClick={() => sendEmote('😡')} className="text-2xl">😡</button>
                     <button onClick={() => setShowEmotes(false)} className="text-sm text-red-400">إغلاق</button>
                 </div>
            </div>
        )}
    </div>
  );
};