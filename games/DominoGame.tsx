import React, { useState, useEffect, useRef } from 'react';
import { Domino, DominoGameState, PlayerType, UserProfile, ChatMessage, VoiceEmote, PlacedDomino } from '../types';
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

// --- Layout Calculation Helper ---
// Calculates specific X/Y positions for tiles to create a "Snake" that fits
const calculateSnakeLayout = (board: PlacedDomino[], containerWidth: number, containerHeight: number) => {
    if (board.length === 0) return { positions: [], scale: 1 };

    const TILE_W = 60; // Base width unit
    const TILE_H = 30; // Base height unit

    const positions: { x: number, y: number, r: number, z: number }[] = [];
    let x = 0;
    let y = 0;
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    
    // Direction: 0=Right, 1=Down, 2=Left, 3=Up
    let direction = 0; 
    let stepCount = 0;
    let limit = 5; // Tiles before turning

    // Place first tile at center-ish
    positions.push({ x: 0, y: 0, r: board[0].isDouble ? 90 : 0, z: 0 });

    for (let i = 1; i < board.length; i++) {
        const prevTile = board[i-1];
        const tile = board[i];
        
        // Simple visual snake logic: Just place next to previous based on index flow
        // In real dominoes, we'd follow the chain ends, but visual representation can be linear for "All tiles visible"
        // We simulate the "Snake" effect purely visually based on index, 
        // assuming board array is sorted by placement order (start to end or vice versa).
        
        // However, gameState.board order depends on unshift/push.
        // We will just layout them linearly and wrap.
        // Actually, to make them connect visually properly, we need more complex logic.
        // Fallback: A simple Spiral for now to guarantee visibility.
        
        let dx = 0, dy = 0;
        
        if (direction === 0) dx = 1;
        else if (direction === 1) dy = 1;
        else if (direction === 2) dx = -1;
        else if (direction === 3) dy = -1;

        x += dx * (tile.isDouble ? TILE_H : TILE_W);
        y += dy * (tile.isDouble ? TILE_H : TILE_W);
        
        // Adjust for overlap/spacing
        if (tile.isDouble) {
             // Doubles take less width but are rotated
             if (direction === 0) x -= 10;
             if (direction === 2) x += 10;
        }

        positions.push({ x, y, r: tile.isDouble ? 90 : (direction % 2 === 0 ? 0 : 90), z: i });

        stepCount++;
        // Turn logic
        if (stepCount >= limit) {
            stepCount = 0;
            direction = (direction + 1) % 4;
            // Increase spiral arm length every 2 turns
            if (direction % 2 === 0) limit++;
        }

        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
    }

    const contentWidth = Math.abs(maxX - minX) + 150;
    const contentHeight = Math.abs(maxY - minY) + 150;
    
    // Calculate Scale to fit
    const scaleX = containerWidth / contentWidth;
    const scaleY = containerHeight / contentHeight;
    const scale = Math.min(Math.min(scaleX, scaleY), 1.2); // Cap max zoom

    // Center Offset
    const offsetX = (containerWidth - (contentWidth * scale)) / 2 - (minX * scale);
    const offsetY = (containerHeight - (contentHeight * scale)) / 2 - (minY * scale);

    return { 
        positions: positions.map(p => ({
            ...p,
            finalX: (p.x * scale) + (containerWidth/2), // Center relative
            finalY: (p.y * scale) + (containerHeight/2),
            finalScale: scale
        })), 
        scale 
    };
};

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

  const [matchScores, setMatchScores] = useState({ human: 0, computer: 0 });
  const [lastPlayedTile, setLastPlayedTile] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showEmotes, setShowEmotes] = useState(false);
  const [floatingEmote, setFloatingEmote] = useState<{char: string, type: string, target?: string} | null>(null);
  
  // Layout State
  const [boardLayout, setBoardLayout] = useState<{x:number, y:number, r:number, z:number}[]>([]);
  const [containerSize, setContainerSize] = useState({ w: 300, h: 300 });
  const [globalScale, setGlobalScale] = useState(1);
  
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
    const handleResize = () => {
        if(boardContainerRef.current) {
            setContainerSize({ 
                w: boardContainerRef.current.clientWidth, 
                h: boardContainerRef.current.clientHeight 
            });
        }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => { 
        gameActiveRef.current = false; 
        window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Recalculate Layout on Board Change
  useEffect(() => {
      // We need to re-order visual tiles based on connection.
      // gameState.board is already strictly ordered? 
      // If we use unshift/push logic, standard JS array is ordered.
      // BUT `unshift` puts it at index 0. 
      // A linear render of index 0 to N might look disjointed if 0 is "Left End" and N is "Right End".
      // We want to draw from Left End -> Right End smoothly.
      // The array effectively *is* the snake.
      
      const calc = calculateSnakeLayout(gameState.board, containerSize.w, containerSize.h);
      // We only use the scale to center/zoom. The smart positioning logic inside needs work for a perfect snake.
      // For this specific request "All tiles visible", simply wrapping them or scaling is key.
      // My `calculateSnakeLayout` creates a spiral based on index.
      
      // Let's optimize:
      // Map board index to positions.
      const TILE_SPACING = 55;
      const positions: any[] = [];
      let minX=0, maxX=0, minY=0, maxY=0;
      
      // Better Snake Logic:
      // Start from tile 0.
      // If it's `placedAt: 'start'`, it means it was added to the "Head".
      // If `placedAt: 'end'`, it was added to "Tail".
      // But re-rendering the whole chain every time is easiest visually.
      // Just iterate 0..length.
      
      let curX = 0;
      let curY = 0;
      let dirX = 1; // Moving right initially
      let dirY = 0;
      let limit = 6; // Max tiles per row before turning
      let rowCount = 0;
      
      gameState.board.forEach((tile, i) => {
          positions.push({ x: curX, y: curY, r: tile.isDouble ? 90 : (dirX !== 0 ? 0 : 90), tile });
          
          if (tile.isDouble) {
              // Doubles are vertical, they take up vertical space if moving horizontally?
              // No, typically drawn perpendicular.
          }

          curX += dirX * (tile.isDouble ? 35 : 55); // Advance
          curY += dirY * (tile.isDouble ? 35 : 55);
          
          rowCount++;
          
          // Check limits to spiral/snake
          // Simple snake: Right -> Down (1 tile) -> Left -> Down (1 tile) -> Right...
          if (rowCount >= limit) {
              rowCount = 0;
              // If moving Right
              if (dirX === 1) {
                  curX -= 25; // backtrack slightly to align turn
                  curY += 50; // Move down
                  dirX = -1; // Now move Left
              } 
              // If moving Left
              else {
                  curX += 25;
                  curY += 50; // Move down
                  dirX = 1; // Now move Right
              }
          }
          
          minX = Math.min(minX, curX);
          maxX = Math.max(maxX, curX);
          minY = Math.min(minY, curY);
          maxY = Math.max(maxY, curY);
      });

      // Calculate Bounds Center
      const width = maxX - minX + 100;
      const height = maxY - minY + 100;
      
      // Calculate fit scale
      const sX = containerSize.w / Math.max(width, 100);
      const sY = containerSize.h / Math.max(height, 100);
      const s = Math.min(Math.min(sX, sY), 1.0) * 0.9; // 90% fill
      
      setGlobalScale(s);
      
      // Recenter offset
      const cX = (minX + maxX) / 2;
      const cY = (minY + maxY) / 2;
      
      const finalLayout = positions.map(p => ({
          ...p,
          x: (p.x - cX), // Center around 0
          y: (p.y - cY)
      }));
      
      setBoardLayout(finalLayout);

  }, [gameState.board, containerSize]);


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
      currentTurn: 'human', // Ideally, winner of previous round starts, but simple for now
      status: 'playing',
      winner: null,
      boardEnds: { left: -1, right: -1 },
      timeLeft: TURN_TIME,
      message: 'جولة جديدة!',
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
            valid.sort((a, b) => (b.left + b.right) - (a.left + a.right));
            const tile = valid[0];

            let newBoard = [...prev.board];
            let newEnds = { ...prev.boardEnds };

            if (newBoard.length === 0) {
                newBoard.push({ ...tile, placedAt: 'start' });
                newEnds = { left: tile.left, right: tile.right };
                playSound('place');
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
                    playSound('place_left');
                } else {
                    const o = orientTile(tile, newEnds.right, 'right');
                    newBoard.push({ ...tile, left: o.left, right: o.right, placedAt: 'end' });
                    newEnds.right = o.right;
                    playSound('place_right');
                }
            }
            
            setLastPlayedTile(tile.id);
            const newHand = hand.filter(t => t.id !== tile.id);

            if (newHand.length === 0) {
                handleRoundEnd(playerType, prev);
                return { ...prev, status: 'round_over' }; 
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

      setLastPlayedTile(tile.id);
      
      setGameState(prev => {
          let newBoard = [...prev.board];
          let newEnds = { ...prev.boardEnds };
          
          if (newBoard.length === 0) {
              newBoard.push({ ...tile, placedAt: 'start' });
              newEnds = { left: tile.left, right: tile.right };
              playSound('place');
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
                  playSound('place_left');
              } else {
                  const o = orientTile(tile, newEnds.right, 'right');
                  newBoard.push({ ...tile, left: o.left, right: o.right, placedAt: 'end' });
                  newEnds.right = o.right;
                  playSound('place_right');
              }
          }

          const newHand = prev.players.human.hand.filter(t => t.id !== tile.id);
          
          if (newHand.length === 0) {
              handleRoundEnd('human', prev);
              return { ...prev, status: 'round_over' };
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

  const handleRoundEnd = (winner: PlayerType, currentState: DominoGameState) => {
      const loserKey = winner === 'human' ? 'computer' : 'human';
      const points = calculateHandValue(currentState.players[loserKey].hand);
      
      const newScores = {
          ...matchScores,
          [winner]: matchScores[winner] + points
      };
      
      setMatchScores(newScores);

      if (newScores[winner] >= 100) {
          finishGame(winner);
      } else {
          // Alert briefly then start new round
          setTimeout(() => {
              alert(`${winner === 'human' ? 'أنت' : 'الكمبيوتر'} فاز بالجولة! النقاط المضافة: ${points}. النتيجة: أنت ${newScores.human} - ${newScores.computer} خصمك`);
              startRound();
          }, 500);
      }
  };

  const manualDraw = () => {
      if (gameState.currentTurn !== 'human' || isAutoPlaying || gameState.deck.length === 0) return;
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

  return (
    <div className={`flex flex-col h-full w-full relative overflow-hidden bg-slate-900 items-center`}>
        
        {/* Header - Opponent Info & Controls */}
        <div className="w-full max-w-2xl flex justify-between items-center bg-slate-800/80 p-2 rounded-xl mb-1 backdrop-blur-sm border border-white/10 z-20 mt-2">
            <div className="flex items-center gap-3 relative">
                 <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-xl font-bold border-2 border-white shadow-lg">
                     {opponentName.charAt(0)}
                 </div>
                 {/* Subtle Point Display Above Opponent */}
                 <div className="absolute -top-4 left-0 bg-red-900/90 text-white text-[10px] px-2 py-0.5 rounded-full border border-red-500 shadow-lg whitespace-nowrap z-30">
                     {matchScores.computer} نقطة
                 </div>

                 {floatingEmote?.target === 'opponent' && <div className="absolute -bottom-8 left-2 text-4xl animate-bounce z-50">{floatingEmote.char}</div>}
                 <div>
                     <div className="font-bold text-white text-sm md:text-base">{opponentName}</div>
                     <div className="text-xs text-slate-400 flex items-center gap-1">
                         <Clock size={12} /> {gameState.currentTurn === 'computer' ? gameState.timeLeft : '--'}
                     </div>
                 </div>
            </div>

            <div className="text-xl md:text-2xl font-mono bg-black/30 px-4 py-1 rounded text-emerald-400 border border-emerald-500/30">
                {matchScores.computer} - {matchScores.human} <span className="text-xs text-slate-400 block text-center">الهدف: 100</span>
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

        {/* Square Board Area - Smart Scaled Layout */}
        <div className="flex-1 w-full flex items-center justify-center p-2 relative overflow-hidden">
             <div ref={boardContainerRef} className="absolute inset-0 flex items-center justify-center">
                 <div className="relative w-full h-full bg-[#0f392b] border-[8px] border-[#3e2723] rounded-lg shadow-inner overflow-hidden">
                     <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] pointer-events-none"></div>
                     
                     {/* Boneyard Indicator */}
                     <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-black/30 px-3 py-1 rounded-full border border-white/10">
                         <span className="text-slate-300 text-xs font-bold">المخزون ({gameState.deck.length})</span>
                     </div>
                     {gameState.deck.length > 0 && gameState.currentTurn === 'human' && !isAutoPlaying && (
                         <button onClick={manualDraw} className="absolute top-10 left-1/2 -translate-x-1/2 z-20 bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded-full flex items-center gap-1 animate-pulse shadow-lg">
                             <Hand size={14}/> سحب
                         </button>
                     )}

                     {/* The Tiles Container - Centered & Scaled */}
                     <div 
                        className="absolute left-1/2 top-1/2 transition-all duration-500 ease-out"
                        style={{ 
                            transform: `translate(-50%, -50%) scale(${globalScale})`,
                            width: '0px', height: '0px' // Point source, tiles positioned absolutely
                        }}
                     >
                        {boardLayout.map((layout, i) => (
                             <div 
                                key={layout.tile.id} 
                                className="absolute transition-all duration-500"
                                style={{
                                    left: layout.x,
                                    top: layout.y,
                                    transform: `translate(-50%, -50%) rotate(${layout.r}deg)`,
                                    zIndex: 10 + i
                                }}
                             >
                                 <DominoTile 
                                    left={layout.tile.left} 
                                    right={layout.tile.right} 
                                    isDouble={layout.tile.isDouble} 
                                    orientation='horizontal' 
                                    size="md" 
                                    highlight={lastPlayedTile === layout.tile.id} 
                                />
                             </div>
                        ))}
                        {gameState.board.length === 0 && (
                            <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-white/30 text-2xl font-bold">
                                بانتظار البداية...
                            </div>
                        )}
                     </div>
                 </div>
             </div>
        </div>

        {/* Bottom Area: Hand + Chat */}
        <div className="w-full max-w-2xl bg-slate-800/90 p-3 rounded-t-2xl border-t border-white/10 backdrop-blur-md shadow-[0_-5px_20px_rgba(0,0,0,0.5)] z-20 flex flex-col gap-2">
             {/* User Info & Timer */}
             <div className="flex justify-between items-center relative">
                 <div className="flex items-center gap-2 relative">
                     <img src={user.avatar} className="w-8 h-8 rounded-full border border-white"/>
                     {/* Subtle Point Display Above User */}
                     <div className="absolute -top-4 right-0 bg-emerald-900/90 text-white text-[10px] px-2 py-0.5 rounded-full border border-emerald-500 shadow-lg whitespace-nowrap z-30">
                         {matchScores.human} نقطة
                     </div>
                     <div className="text-sm font-bold text-white">{user.name}</div>
                 </div>
                 <div className="text-xs text-yellow-400 flex items-center gap-1">
                     <Clock size={12} /> {gameState.currentTurn === 'human' ? gameState.timeLeft : '--'}
                 </div>
             </div>

             {/* Tiles Hand */}
             <div className="flex overflow-x-auto gap-2 pb-2 min-h-[70px] items-center custom-scroll">
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

             {/* Chat & Controls (Bottom Left) */}
             <div className="relative mt-auto">
                 {/* Chat Messages Log */}
                 <div className="absolute bottom-12 left-0 w-48 max-h-32 overflow-y-auto flex flex-col-reverse gap-1 z-30 pointer-events-none">
                    {chatMessages.slice(-5).reverse().map((msg, i) => (
                        <div key={msg.id} className={`bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs self-start animate-in slide-in-from-left fade-in`}>
                            <span className="font-bold text-emerald-400">{msg.sender}:</span> {msg.emoji || msg.text}
                        </div>
                    ))}
                 </div>

                 <div className="flex items-center gap-2">
                      <div className="flex-1 flex bg-slate-900 rounded-full px-3 py-2 items-center border border-slate-700">
                          <input className="bg-transparent border-none outline-none text-white text-sm flex-1" placeholder="اكتب..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendChat(chatInput)} />
                          <button onClick={() => sendChat(chatInput)} className="text-emerald-400"><Send size={16}/></button>
                      </div>
                      <button onClick={() => setShowEmotes(!showEmotes)} className="bg-slate-700 p-2 rounded-full text-yellow-400 hover:bg-slate-600">
                          <Smile size={20} />
                      </button>
                 </div>
                 
                 {/* Emote Menu */}
                 {showEmotes && (
                     <div className="absolute bottom-12 right-0 bg-slate-800 border border-slate-600 rounded-xl p-2 grid grid-cols-4 gap-2 shadow-2xl z-50 animate-in zoom-in slide-in-from-bottom-5">
                         {['😀','👍','👋','❤️'].map(e => <button key={e} onClick={() => sendEmote(e, false)} className="text-2xl hover:scale-125 transition-transform">{e}</button>)}
                         <button onClick={() => sendEmote('🤣', true, 'laugh')} className="text-2xl"><span className="text-xs absolute top-0 right-0">مجاني</span>🤣</button>
                         <button onClick={() => sendEmote('😡', true, 'angry')} className="text-2xl"><span className="text-xs absolute top-0 right-0">مجاني</span>😡</button>
                         <button onClick={() => sendEmote('💋', true, 'kiss')} className="text-2xl"><span className="text-xs absolute top-0 right-0">مجاني</span>💋</button>
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
                    <p className="text-slate-400 mb-6">سيتم اعتبارك خاسراً.</p>
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
                            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 mb-2">الفائز بالمباراة!</h2>
                            <p className="text-yellow-100 text-lg mb-6">أداء مذهل يا {user.name}!</p>
                            <div className="text-2xl font-bold text-emerald-400 mb-8">+100 عملة</div>
                        </>
                    ) : (
                        <>
                            <Trophy size={100} className="mx-auto text-slate-400 drop-shadow-[0_0_30px_rgba(148,163,184,0.6)] mb-4" />
                            <h2 className="text-4xl font-black text-slate-300 mb-2">انتهت المباراة</h2>
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
                        <p>1. الهدف: الوصول إلى 100 نقطة للفوز بالمباراة.</p>
                        <p>2. اللعب: طابق عدد النقاط في أحد طرفي الحجر مع طرف مفتوح على الطاولة.</p>
                        <p>3. النقاط: الفائز بالجولة يحصل على مجموع نقاط أحجار الخصم.</p>
                    </div>
                    <button onClick={() => setShowHelp(false)} className="mt-6 w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold">فهمت</button>
                </div>
            </div>
        )}
    </div>
  );
};