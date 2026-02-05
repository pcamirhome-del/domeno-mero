import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, ChatMessage, VoiceEmote } from '../types';
import { XCircle, Dices, User, ShoppingCart, ChevronsUp, ChevronsDown, Palette, Smile, Volume2, Send, Zap, Heart, Gift, Trophy, AlertCircle, Clock } from 'lucide-react';
import { playSound } from '../sounds';

interface LudoGameProps {
    user: UserProfile;
    opponentName: string;
    isBot: boolean;
    onEndGame: (winner: boolean, coins: number) => void;
}

const DICE_SKINS = [
    { id: 'standard', name: 'عادي', cost: 0, char: '🎲' },
    { id: 'fire', name: 'ناري', cost: 200, char: '🔥' },
    { id: 'ice', name: 'جليدي', cost: 200, char: '❄️' },
    { id: 'gold', name: 'ذهبي', cost: 500, char: '🪙' },
];

const BOARD_THEMES = [
    { id: 'classic', name: 'كلاسيكي', cost: 0, bg: 'bg-white' },
    { id: 'pharaonic', name: 'فرعوني', cost: 500, bg: 'bg-[#fcd34d] bg-opacity-20', border: 'border-yellow-600' },
    { id: 'romantic', name: 'رومانسي', cost: 300, bg: 'bg-pink-200 bg-opacity-30', border: 'border-pink-400' },
    { id: 'stone', name: 'حجري', cost: 200, bg: 'bg-stone-300', border: 'border-stone-600' },
];

const RED_PATH_COORDS = [
  {r:6, c:1}, {r:6, c:2}, {r:6, c:3}, {r:6, c:4}, {r:6, c:5},
  {r:5, c:6}, {r:4, c:6}, {r:3, c:6}, {r:2, c:6}, {r:1, c:6}, {r:0, c:6},
  {r:0, c:7}, {r:0, c:8},
  {r:1, c:8}, {r:2, c:8}, {r:3, c:8}, {r:4, c:8}, {r:5, c:8},
  {r:6, c:9}, {r:6, c:10}, {r:6, c:11}, {r:6, c:12}, {r:6, c:13}, {r:6, c:14},
  {r:7, c:14}, {r:8, c:14},
  {r:8, c:13}, {r:8, c:12}, {r:8, c:11}, {r:8, c:10}, {r:8, c:9},
  {r:9, c:8}, {r:10, c:8}, {r:11, c:8}, {r:12, c:8}, {r:13, c:8}, {r:14, c:8},
  {r:14, c:7}, {r:14, c:6},
  {r:13, c:6}, {r:12, c:6}, {r:11, c:6}, {r:10, c:6}, {r:9, c:6},
  {r:8, c:5}, {r:8, c:4}, {r:8, c:3}, {r:8, c:2}, {r:8, c:1}, {r:8, c:0},
  {r:7, c:0},
  {r:7, c:1}, {r:7, c:2}, {r:7, c:3}, {r:7, c:4}, {r:7, c:5}, {r:7, c:6} 
];

const YELLOW_PATH_COORDS = [
    {r:8, c:13}, {r:8, c:12}, {r:8, c:11}, {r:8, c:10}, {r:8, c:9},
    {r:9, c:8}, {r:10, c:8}, {r:11, c:8}, {r:12, c:8}, {r:13, c:8}, {r:14, c:8},
    {r:14, c:7}, {r:14, c:6},
    {r:13, c:6}, {r:12, c:6}, {r:11, c:6}, {r:10, c:6}, {r:9, c:6},
    {r:8, c:5}, {r:8, c:4}, {r:8, c:3}, {r:8, c:2}, {r:8, c:1}, {r:8, c:0},
    {r:7, c:0}, {r:6, c:0},
    {r:6, c:1}, {r:6, c:2}, {r:6, c:3}, {r:6, c:4}, {r:6, c:5},
    {r:5, c:6}, {r:4, c:6}, {r:3, c:6}, {r:2, c:6}, {r:1, c:6}, {r:0, c:6},
    {r:0, c:7}, {r:0, c:8},
    {r:1, c:8}, {r:2, c:8}, {r:3, c:8}, {r:4, c:8}, {r:5, c:8},
    {r:6, c:9}, {r:6, c:10}, {r:6, c:11}, {r:6, c:12}, {r:6, c:13}, {r:6, c:14},
    {r:7, c:14},
    {r:7, c:13}, {r:7, c:12}, {r:7, c:11}, {r:7, c:10}, {r:7, c:9}, {r:7, c:8}
];

interface Piece {
    id: number;
    color: 'red' | 'yellow';
    position: number; 
}

export const LudoGame: React.FC<LudoGameProps> = ({ user, opponentName, isBot, onEndGame }) => {
    // --- Game State ---
    const [matchCoins, setMatchCoins] = useState(1000); 
    const [diceValue, setDiceValue] = useState(1);
    const [botDiceValue, setBotDiceValue] = useState(1); // Separate dice for bot
    const [rolling, setRolling] = useState(false);
    const [turn, setTurn] = useState<'red'|'yellow'>('red');
    const [pieces, setPieces] = useState<Piece[]>([
        { id: 0, color: 'red', position: -1 }, { id: 1, color: 'red', position: -1 },
        { id: 2, color: 'red', position: -1 }, { id: 3, color: 'red', position: -1 },
        { id: 4, color: 'yellow', position: -1 }, { id: 5, color: 'yellow', position: -1 },
        { id: 6, color: 'yellow', position: -1 }, { id: 7, color: 'yellow', position: -1 },
    ]);
    const [waitingForMove, setWaitingForMove] = useState(false);
    const [message, setMessage] = useState('ابدأ اللعب');
    const [hasAutoPlay, setHasAutoPlay] = useState(false);
    const [isAutoPlaying, setIsAutoPlaying] = useState(false);
    const [timeLeft, setTimeLeft] = useState(30);

    // --- Shop & Customization State ---
    const [activeDiceSkin, setActiveDiceSkin] = useState(DICE_SKINS[0]);
    const [activeBoardSkin, setActiveBoardSkin] = useState(BOARD_THEMES[0]);
    const [showShop, setShowShop] = useState(false);
    const [diceCheat, setDiceCheat] = useState<'none' | 'high' | 'low'>('none'); 

    // --- Chat State ---
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [showEmotes, setShowEmotes] = useState(false);
    const [floatingEmote, setFloatingEmote] = useState<{char: string, type: string, target?: string} | null>(null);
    
    // UI
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [showTrophy, setShowTrophy] = useState<'gold' | 'silver' | null>(null);

    const gameActiveRef = useRef(true);

    useEffect(() => {
        gameActiveRef.current = true;
        return () => { gameActiveRef.current = false; };
    }, []);

    // Timer
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (!showTrophy && !showExitConfirm) {
            interval = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 0) {
                        switchTurn(); // Auto switch
                        return 30;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [turn, showTrophy, showExitConfirm]);

    // Bot Turn Logic & AutoPlay
    useEffect(() => {
        if (!gameActiveRef.current) return;

        if (turn === 'yellow' && isBot && !rolling && !waitingForMove) {
            // Opponent Bot
            setTimeout(() => rollDice(false), 1000); 
        } else if (turn === 'yellow' && isBot && waitingForMove) {
            setTimeout(() => botMakeMove('yellow'), 1000);
        } else if (turn === 'red' && isAutoPlaying && !rolling && !waitingForMove) {
            // Player AutoPlay
            setTimeout(() => rollDice(false), 800);
        } else if (turn === 'red' && isAutoPlaying && waitingForMove) {
            setTimeout(() => botMakeMove('red'), 800);
        }
    }, [turn, waitingForMove, rolling, isAutoPlaying]);

    // --- Game Logic ---
    const rollDice = (isCheat: boolean = false) => {
        if (rolling) return;
        
        // Validation
        const isMyTurn = turn === 'red';
        const isBotTurn = turn === 'yellow';
        
        if (isBotTurn && !isBot) return; // Online wait
        if (isMyTurn && !isAutoPlaying && !isCheat && isBotTurn) return; // Basic validation
        if (isMyTurn && diceCheat !== 'none') {
             if (matchCoins < 200) {
                 alert('ليس لديك عملات كافية للغش!');
                 setDiceCheat('none');
                 return;
             }
             setMatchCoins(prev => prev - 200);
        }

        setRolling(true);
        playSound('draw');
        setMessage('جاري رمي النرد...');
        
        let i = 0;
        const interval = setInterval(() => {
            const val = Math.floor(Math.random() * 6) + 1;
            if (turn === 'red') setDiceValue(val);
            else setBotDiceValue(val);
            i++;
            if (i > 8) {
                clearInterval(interval);
                let finalVal = Math.floor(Math.random() * 6) + 1;
                
                if (turn === 'red') {
                    if (diceCheat === 'high') finalVal = 4 + Math.floor(Math.random() * 3); 
                    if (diceCheat === 'low') finalVal = 1 + Math.floor(Math.random() * 3); 
                    setDiceCheat('none'); 
                    setDiceValue(finalVal);
                } else {
                    setBotDiceValue(finalVal);
                }

                setRolling(false);
                checkPossibleMoves(finalVal);
            }
        }, 80);
    };

    const checkPossibleMoves = (roll: number) => {
        const myColor = turn;
        const myPieces = pieces.filter(p => p.color === myColor);
        const moveablePieces = myPieces.filter(p => canMove(p, roll));

        if (moveablePieces.length === 0) {
            setMessage(`لا توجد تحركات (${roll}). تحويل.`);
            setTimeout(switchTurn, 1500);
        } else if (moveablePieces.length === 1 && ((isBot && turn === 'yellow') || isAutoPlaying)) {
             setWaitingForMove(true);
        } else {
            setMessage(`لديك ${roll}. حرك قطعة.`);
            setWaitingForMove(true);
        }
    };

    const canMove = (piece: Piece, roll: number): boolean => {
        if (piece.position === 99) return false;
        if (piece.position === -1) return roll === 6;
        if (piece.position + roll > 57) return false;
        return true;
    };

    const handlePieceClick = (piece: Piece) => {
        if (!waitingForMove || piece.color !== turn) return;
        const currentDice = turn === 'red' ? diceValue : botDiceValue;
        if (isAutoPlaying && turn === 'red') return; 
        if (!canMove(piece, currentDice)) return;
        movePiece(piece, currentDice);
    };

    const movePiece = (piece: Piece, steps: number) => {
        setWaitingForMove(false);
        playSound('place');

        let newPos = piece.position;
        if (newPos === -1) newPos = 0; 
        else newPos += steps;
        
        setPieces(prev => {
            const nextPieces = prev.map(p => {
                if (p.id === piece.id) return { ...p, position: newPos === 57 ? 99 : newPos };
                return p;
            });

            // Capture Logic
            const myPath = piece.color === 'red' ? RED_PATH_COORDS : YELLOW_PATH_COORDS;
            const myCoord = newPos < 57 ? myPath[newPos] : null;

            if (myCoord && newPos < 52) { 
                const opponentColor = piece.color === 'red' ? 'yellow' : 'red';
                const oppPath = opponentColor === 'red' ? RED_PATH_COORDS : YELLOW_PATH_COORDS;
                
                const capturedIndex = nextPieces.findIndex(p => {
                    if (p.color !== opponentColor || p.position === -1 || p.position > 51) return false;
                    const oppCoord = oppPath[p.position];
                    return oppCoord.r === myCoord.r && oppCoord.c === myCoord.c;
                });

                if (capturedIndex !== -1) {
                    nextPieces[capturedIndex].position = -1;
                    setMessage('تم أكل القطعة! 😈');
                    playSound('angry');
                }
            }

            // Win Check
            const myFinished = nextPieces.filter(p => p.color === piece.color && p.position === 99).length;
            if (myFinished === 4) {
                finishGame(piece.color === 'red');
                return nextPieces;
            }

            if (steps === 6 && newPos !== 99) {
                setMessage('حصلت على 6! ارمي مرة أخرى.');
            } else {
                 setTimeout(switchTurn, 1000);
            }

            return nextPieces;
        });
    };

    const switchTurn = () => {
        if (!gameActiveRef.current) return;
        setTurn(prev => prev === 'red' ? 'yellow' : 'red');
        setRolling(false);
        setWaitingForMove(false);
        setTimeLeft(30);
        // setDiceValue(1); // Don't reset visual immediately
        setMessage(turn === 'red' ? `دورك` : `دور ${opponentName}`);
    };

    const botMakeMove = (color: 'red' | 'yellow') => {
        const currentDice = color === 'red' ? diceValue : botDiceValue;
        const validPieces = pieces.filter(p => p.color === color && canMove(p, currentDice));
        if (validPieces.length > 0) {
            const pick = validPieces[Math.floor(Math.random() * validPieces.length)];
            movePiece(pick, currentDice);
        } else {
            switchTurn();
        }
    };

    const buyItem = (cost: number, callback: () => void) => {
        if (matchCoins >= cost) {
            setMatchCoins(prev => prev - cost);
            callback();
            playSound('win');
            alert('مبروك! تم الشراء بنجاح');
            setShowShop(false);
        } else {
            alert('لا يوجد عملات كافية!');
        }
    };

    const finishGame = (win: boolean) => {
        playSound(win ? 'win' : 'lose');
        setShowTrophy(win ? 'gold' : 'silver');
    };

    const closeTrophy = () => {
        onEndGame(showTrophy === 'gold', showTrophy === 'gold' ? 2000 : 0);
    };

    const toggleAutoPlay = () => {
        if (!hasAutoPlay) {
            buyItem(500, () => {
                setHasAutoPlay(true);
                setIsAutoPlaying(true);
            });
        } else {
            setIsAutoPlaying(!isAutoPlaying);
        }
    };

    // --- Chat Logic ---
    const sendChat = (text: string) => {
        if (!text.trim()) return;
        const msg: ChatMessage = { id: Date.now().toString(), sender: user.name, text, type: 'text' };
        setChatMessages(prev => [...prev, msg]);
        setChatInput('');
    };

    const sendEmote = (emote: string, isVoice: boolean, soundType?: VoiceEmote, isGift: boolean = false) => {
        if (isVoice) playSound(soundType || 'laugh');
        
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

    // --- Render Helpers ---
    const getPieceStyle = (p: Piece) => {
        if (p.position === -1) {
             const offsetMap: any = {
                0: {top: '10%', left: '10%'}, 1: {top: '10%', left: '20%'},
                2: {top: '20%', left: '10%'}, 3: {top: '20%', left: '20%'},
                4: {bottom: '10%', right: '10%'}, 5: {bottom: '10%', right: '20%'},
                6: {bottom: '20%', right: '10%'}, 7: {bottom: '20%', right: '20%'},
            };
            return offsetMap[p.id];
        }
        if (p.position === 99) return p.color === 'red' ? { top: '48%', left: '42%', zIndex: 10 } : { top: '48%', right: '42%', zIndex: 10 };
        const path = p.color === 'red' ? RED_PATH_COORDS : YELLOW_PATH_COORDS;
        const coord = path[p.position];
        return { top: `${(coord.r * 6.66) + 1}%`, left: `${(coord.c * 6.66) + 1}%` };
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 p-2 items-center relative overflow-hidden">
             {/* Header with Shop & Coins */}
             <div className="w-full flex justify-between items-center bg-slate-800 p-2 rounded-xl mb-2 z-20">
                 <div className="flex items-center gap-2 relative">
                     <img src={user.avatar} className="w-8 h-8 rounded-full border border-white"/>
                     {/* Gift Overlay for User */}
                     {floatingEmote?.type === 'gift' && floatingEmote.target === 'self' && (
                         <div className="absolute -top-10 left-0 text-4xl animate-bounce z-50">{floatingEmote.char}</div>
                     )}
                     <div className="flex flex-col">
                         <span className="text-xs text-slate-300">{user.name}</span>
                         <span className="text-xs font-mono text-yellow-400 font-bold flex items-center gap-1"><Dices size={10}/> {matchCoins}</span>
                     </div>
                 </div>

                 {/* Bot Dice Display (Top) */}
                 <div className="absolute top-14 left-1/2 -translate-x-1/2 flex flex-col items-center">
                     <div className={`w-14 h-14 bg-yellow-200 rounded-xl flex items-center justify-center font-bold text-black border-2 border-yellow-500 shadow-lg text-3xl ${turn === 'yellow' ? 'ring-2 ring-yellow-400' : 'opacity-60 scale-90'}`}>
                        {turn === 'yellow' && rolling ? '...' : botDiceValue}
                     </div>
                 </div>

                 {/* Opponent Info (Top Right) */}
                 <div className="flex items-center gap-2 relative">
                     <div className="flex flex-col items-end">
                         <span className="text-xs text-slate-300">{opponentName}</span>
                         <div className="text-xs text-slate-500">Bot</div>
                     </div>
                     <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center font-bold">{opponentName.charAt(0)}</div>
                     {/* Gift Overlay for Opponent */}
                     {floatingEmote?.type === 'gift' && floatingEmote.target === 'opponent' && (
                         <div className="absolute -top-10 right-0 text-4xl animate-bounce z-50">{floatingEmote.char}</div>
                     )}
                 </div>
                 
                 <div className="absolute top-14 right-2 flex flex-col gap-2">
                     <button onClick={() => setShowShop(!showShop)} className="bg-gradient-to-r from-pink-500 to-purple-600 p-2 rounded-full text-white shadow-lg">
                         <ShoppingCart size={18}/>
                     </button>
                     <button 
                        onClick={toggleAutoPlay}
                        className={`p-2 rounded-full shadow-lg ${hasAutoPlay ? (isAutoPlaying ? 'bg-green-500 animate-pulse ring-2 ring-green-300' : 'bg-slate-600') : 'bg-orange-500'}`}
                     >
                        <Zap size={18} className="text-white"/>
                     </button>
                 </div>
                 
                 <button onClick={() => setShowExitConfirm(true)} className="absolute top-2 right-1/2 translate-x-1/2 bg-red-500/20 text-red-200 p-1 rounded-full"><XCircle size={20}/></button>
             </div>

             {/* Shop Modal */}
             {showShop && (
                 <div className="absolute inset-0 bg-black/90 z-50 p-4 flex flex-col overflow-y-auto">
                     <div className="flex justify-between items-center mb-4">
                         <h2 className="text-xl font-bold text-white"><Palette className="inline"/> متجر ليدو</h2>
                         <button onClick={() => setShowShop(false)}><XCircle size={24} className="text-red-400"/></button>
                     </div>
                     {/* Auto Play Buy */}
                     {!hasAutoPlay && (
                         <div className="bg-slate-800 p-3 rounded-lg mb-4 flex justify-between items-center border border-orange-500/50">
                             <div className="flex items-center gap-2"><Zap className="text-orange-500"/> لعب تلقائي</div>
                             <button onClick={() => buyItem(500, () => setHasAutoPlay(true))} className="bg-orange-600 px-4 py-1 rounded text-sm">شراء (500)</button>
                         </div>
                     )}
                     <div className="mb-6">
                         <h3 className="text-yellow-400 mb-2 font-bold">اشكال النرد</h3>
                         <div className="grid grid-cols-2 gap-2">
                             {DICE_SKINS.map(s => (
                                 <div key={s.id} className="p-2 rounded border border-slate-600 flex justify-between items-center">
                                     <span>{s.char} {s.name}</span>
                                     <button onClick={() => buyItem(s.cost, () => setActiveDiceSkin(s))} className="bg-green-600 px-2 py-1 rounded text-xs">شراء ({s.cost})</button>
                                 </div>
                             ))}
                         </div>
                     </div>
                     <div>
                         <h3 className="text-yellow-400 mb-2 font-bold">سمات الملعب</h3>
                         <div className="grid grid-cols-2 gap-2">
                             {BOARD_THEMES.map(s => (
                                 <div key={s.id} className="p-2 rounded border border-slate-600 flex justify-between items-center">
                                     <span>{s.name}</span>
                                     <button onClick={() => buyItem(s.cost, () => setActiveBoardSkin(s))} className="bg-blue-600 px-2 py-1 rounded text-xs">شراء ({s.cost})</button>
                                 </div>
                             ))}
                         </div>
                     </div>
                 </div>
             )}

             {/* Board Area */}
            <div className={`ludo-board rounded-lg shadow-2xl mb-4 relative overflow-hidden transition-all duration-500 ${activeBoardSkin.bg} ${activeBoardSkin.border}`}>
                {/* Grid Visuals */}
                {Array.from({ length: 225 }).map((_, i) => {
                    const r = Math.floor(i / 15), c = i % 15;
                    let bg = 'bg-transparent';
                    if (r < 6 && c < 6) bg = 'bg-red-500'; 
                    else if (r < 6 && c > 8) bg = 'bg-green-500';
                    else if (r > 8 && c < 6) bg = 'bg-blue-500'; 
                    else if (r > 8 && c > 8) bg = 'bg-yellow-500';
                    else if (r===7 && c>0 && c<6) bg = 'bg-red-200';
                    else if (r===7 && c>8 && c<14) bg = 'bg-yellow-200';
                    else if (c===7 && r>0 && r<6) bg = 'bg-green-200';
                    else if (c===7 && r>8 && r<14) bg = 'bg-blue-200';
                    else if (r > 5 && r < 9 && c > 5 && c < 9) bg = 'bg-slate-800'; 
                    return <div key={i} className={`ludo-cell ${bg} w-full h-full border-[0.5px] border-slate-500/20`}></div>
                })}
                {/* Pieces */}
                {pieces.map(p => {
                    const currentDice = turn === 'red' ? diceValue : botDiceValue;
                    const canClick = turn === p.color && waitingForMove && canMove(p, currentDice) && (!isBot || turn === 'red');
                    return (
                        <div key={p.id} onClick={() => handlePieceClick(p)} style={getPieceStyle(p)} 
                             className={`absolute w-[5%] h-[5%] rounded-full border-2 border-white shadow-md transition-all duration-300 z-10 flex items-center justify-center ${p.color === 'red' ? 'bg-red-600' : 'bg-yellow-500'} ${canClick ? 'animate-bounce ring-2 ring-white cursor-pointer' : ''}`}>
                             {p.position === -1 && <span className="text-[6px] text-white">H</span>}
                        </div>
                    );
                })}
            </div>

            {/* Controls & Cheats */}
            <div className="w-full flex justify-between items-end px-4 gap-4 relative">
                
                {/* Chat Display (Bottom Left) */}
                <div className="absolute bottom-4 left-4 z-40 flex flex-col items-start gap-2">
                    {/* Last message bubble */}
                    {chatMessages.length > 0 && (
                        <div className="bg-slate-800/90 text-white p-2 rounded-xl rounded-bl-none text-xs max-w-[150px] animate-in fade-in slide-in-from-bottom-5">
                            <span className="font-bold text-yellow-400 block">{chatMessages[chatMessages.length-1].sender}:</span>
                            {chatMessages[chatMessages.length-1].emoji || chatMessages[chatMessages.length-1].text}
                        </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                        <div className="bg-slate-800 px-3 py-1 rounded-full text-yellow-400 font-mono flex items-center gap-1 border border-white/10">
                            <Clock size={12}/> {timeLeft}
                        </div>
                        <button onClick={() => setShowEmotes(!showEmotes)} className="p-3 bg-slate-700 rounded-full text-yellow-400 shadow-lg border border-white/10"><Smile/></button>
                    </div>
                </div>

                {/* Player Dice (Bottom Center) */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <div className="text-white text-sm mb-2 font-bold">{turn === 'red' ? 'دورك' : ''}</div>
                    <button 
                        onClick={() => rollDice(false)}
                        disabled={rolling || (turn !== 'red' && isBot) || waitingForMove}
                        className={`w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center text-5xl shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-transform active:scale-95 ${rolling ? 'animate-spin' : ''} ${turn === 'red' ? 'ring-4 ring-emerald-500' : 'opacity-50'}`}
                    >
                        {turn === 'red' && rolling ? activeDiceSkin.char : (turn === 'red' ? <span className="text-black">{diceValue}</span> : activeDiceSkin.char)}
                    </button>
                </div>

                {/* Cheat Buttons (Right) */}
                <div className="flex flex-col gap-2 ml-auto">
                    <button onClick={() => setDiceCheat('high')} disabled={turn !== 'red' || rolling} className="p-2 rounded-lg bg-green-900/50 border border-green-500 text-xs text-green-300">
                        <ChevronsUp size={16} className="mx-auto mb-1"/><span className="text-[9px]">200 🪙</span>
                    </button>
                    <button onClick={() => setDiceCheat('low')} disabled={turn !== 'red' || rolling} className="p-2 rounded-lg bg-red-900/50 border border-red-500 text-xs text-red-300">
                        <ChevronsDown size={16} className="mx-auto mb-1"/><span className="text-[9px]">200 🪙</span>
                    </button>
                </div>
            </div>

            {/* Chat UI Overlay (Slides up when clicked) */}
            {showEmotes && (
                <div className="absolute bottom-0 left-0 right-0 bg-slate-800 rounded-t-2xl p-4 z-50 border-t border-white/20 animate-in slide-in-from-bottom">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-white font-bold">دردشة</span>
                        <button onClick={() => setShowEmotes(false)}><XCircle size={16} className="text-slate-400"/></button>
                    </div>
                    {/* Quick Emotes & Gifts */}
                    <div className="grid grid-cols-4 gap-2 mb-4">
                        {['😂','😡','😭','👍'].map(e => <button key={e} onClick={() => sendEmote(e, false)} className="text-2xl hover:scale-125">{e}</button>)}
                         <button onClick={() => sendEmote('🤣', true, 'laugh')} className="text-2xl">🤣<Volume2 size={8} className="inline"/></button>
                         <button onClick={() => sendEmote('💋', true, 'kiss')} className="text-2xl">💋<Volume2 size={8} className="inline"/></button>
                         <button onClick={() => sendEmote('🌹', false, undefined, true)} className="text-2xl bg-red-500/20 rounded">🌹<Gift size={8} className="inline"/></button>
                         <button onClick={() => sendEmote('❤️', false, undefined, true)} className="text-2xl bg-pink-500/20 rounded">❤️<Gift size={8} className="inline"/></button>
                    </div>
                    {/* Text Input */}
                    <div className="flex bg-slate-900 rounded-full px-3 py-2">
                        <input className="flex-1 bg-transparent text-white text-sm outline-none" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="اكتب..." />
                        <button onClick={() => sendChat(chatInput)} className="text-emerald-400"><Send size={16}/></button>
                    </div>
                </div>
            )}

            {/* Exit Confirmation Modal */}
            {showExitConfirm && (
                <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
                    <div className="bg-slate-800 p-6 rounded-2xl border border-white/10 max-w-sm w-full text-center">
                        <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
                        <h3 className="text-xl font-bold mb-2 text-white">هل أنت متأكد من الخروج؟</h3>
                        <p className="text-slate-400 mb-6">سيتم اعتبارك خاسراً وستفقد نقاط الجولة.</p>
                        <div className="flex gap-4">
                            <button onClick={() => onEndGame(false, 0)} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold">تأكيد الخروج</button>
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
        </div>
    );
};