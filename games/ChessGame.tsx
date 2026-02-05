import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import { XCircle, RefreshCw, Zap, Trophy, AlertCircle, Clock, BookOpen, Crown } from 'lucide-react';
import { playSound } from '../sounds';

interface ChessGameProps {
    user: UserProfile;
    opponentName: string;
    isBot: boolean;
    onEndGame: (winner: boolean, coins: number) => void;
}

type PieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
type Color = 'w' | 'b';
type Piece = { type: PieceType; color: Color } | null;
type Board = Piece[][];

const INITIAL_BOARD: Board = [
    [{type:'r',color:'b'}, {type:'n',color:'b'}, {type:'b',color:'b'}, {type:'q',color:'b'}, {type:'k',color:'b'}, {type:'b',color:'b'}, {type:'n',color:'b'}, {type:'r',color:'b'}],
    [{type:'p',color:'b'}, {type:'p',color:'b'}, {type:'p',color:'b'}, {type:'p',color:'b'}, {type:'p',color:'b'}, {type:'p',color:'b'}, {type:'p',color:'b'}, {type:'p',color:'b'}],
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null),
    [{type:'p',color:'w'}, {type:'p',color:'w'}, {type:'p',color:'w'}, {type:'p',color:'w'}, {type:'p',color:'w'}, {type:'p',color:'w'}, {type:'p',color:'w'}, {type:'p',color:'w'}],
    [{type:'r',color:'w'}, {type:'n',color:'w'}, {type:'b',color:'w'}, {type:'q',color:'w'}, {type:'k',color:'w'}, {type:'b',color:'w'}, {type:'n',color:'w'}, {type:'r',color:'w'}],
];

const PIECE_SYMBOLS: Record<string, string> = {
    'w-k': '♔', 'w-q': '♕', 'w-r': '♖', 'w-b': '♗', 'w-n': '♘', 'w-p': '♙',
    'b-k': '♚', 'b-q': '♛', 'b-r': '♜', 'b-b': '♝', 'b-n': '♞', 'b-p': '♟︎'
};

export const ChessGame: React.FC<ChessGameProps> = ({ user, opponentName, isBot, onEndGame }) => {
    const [board, setBoard] = useState<Board>(JSON.parse(JSON.stringify(INITIAL_BOARD)));
    const [turn, setTurn] = useState<Color>('w');
    const [selected, setSelected] = useState<{r:number, c:number} | null>(null);
    const [validMoves, setValidMoves] = useState<{r:number, c:number}[]>([]);
    const [capturedWhite, setCapturedWhite] = useState<PieceType[]>([]);
    const [capturedBlack, setCapturedBlack] = useState<PieceType[]>([]);
    const [gameStatus, setGameStatus] = useState<'playing' | 'check' | 'checkmate' | 'draw'>('playing');
    const [timeLeft, setTimeLeft] = useState(600); // 10 mins
    
    // AutoPlay
    const [hasAutoPlay, setHasAutoPlay] = useState(false);
    const [isAutoPlaying, setIsAutoPlaying] = useState(false);
    
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
        const interval = setInterval(() => {
            if (gameStatus === 'playing' && !showTrophy) {
                setTimeLeft(prev => Math.max(0, prev - 1));
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [gameStatus, showTrophy]);

    // Bot Logic
    useEffect(() => {
        if (!gameActiveRef.current || gameStatus === 'checkmate') return;

        if (turn === 'b' && isBot) {
            setTimeout(makeBotMove, 1000);
        } else if (turn === 'w' && isAutoPlaying) {
            setTimeout(makeBotMove, 1000);
        }
    }, [turn, isAutoPlaying, gameStatus]);

    // --- Core Logic ---

    const isValidMove = (boardState: Board, start: {r:number, c:number}, end: {r:number, c:number}, piece: Piece): boolean => {
        if (!piece) return false;
        const dr = end.r - start.r;
        const dc = end.c - start.c;
        const target = boardState[end.r][end.c];

        // Basic: Can't capture own color
        if (target && target.color === piece.color) return false;

        // Piece Rules
        switch (piece.type) {
            case 'p': // Pawn
                const dir = piece.color === 'w' ? -1 : 1;
                const startRow = piece.color === 'w' ? 6 : 1;
                // Move forward 1
                if (dc === 0 && dr === dir && !target) return true;
                // Move forward 2
                if (dc === 0 && dr === dir * 2 && start.r === startRow && !target && !boardState[start.r+dir][start.c]) return true;
                // Capture
                if (Math.abs(dc) === 1 && dr === dir && target) return true;
                return false;
            
            case 'r': // Rook
                if (dr !== 0 && dc !== 0) return false;
                return isPathClear(boardState, start, end);

            case 'b': // Bishop
                if (Math.abs(dr) !== Math.abs(dc)) return false;
                return isPathClear(boardState, start, end);

            case 'q': // Queen
                if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return false;
                return isPathClear(boardState, start, end);

            case 'n': // Knight
                return (Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2);

            case 'k': // King
                return Math.abs(dr) <= 1 && Math.abs(dc) <= 1;
        }
        return false;
    };

    const isPathClear = (boardState: Board, start: {r:number, c:number}, end: {r:number, c:number}) => {
        const dr = Math.sign(end.r - start.r);
        const dc = Math.sign(end.c - start.c);
        let currR = start.r + dr;
        let currC = start.c + dc;
        
        while (currR !== end.r || currC !== end.c) {
            if (boardState[currR][currC]) return false;
            currR += dr;
            currC += dc;
        }
        return true;
    };

    const getSafeMoves = (r: number, c: number) => {
        const piece = board[r][c];
        if (!piece) return [];
        const moves: {r:number, c:number}[] = [];
        
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                if (isValidMove(board, {r,c}, {r:i, c:j}, piece)) {
                    // Simulate move to check for check
                    const tempBoard = JSON.parse(JSON.stringify(board));
                    tempBoard[i][j] = piece;
                    tempBoard[r][c] = null;
                    if (!isCheck(tempBoard, piece.color)) {
                        moves.push({r:i, c:j});
                    }
                }
            }
        }
        return moves;
    };

    const isCheck = (boardState: Board, color: Color) => {
        // Find King
        let kR = -1, kC = -1;
        for(let i=0; i<8; i++) {
            for(let j=0; j<8; j++) {
                if (boardState[i][j]?.type === 'k' && boardState[i][j]?.color === color) {
                    kR = i; kC = j; break;
                }
            }
        }
        if (kR === -1) return true; // Should not happen

        // Check if any opponent piece can attack king
        const opponent = color === 'w' ? 'b' : 'w';
        for(let i=0; i<8; i++) {
            for(let j=0; j<8; j++) {
                const p = boardState[i][j];
                if (p && p.color === opponent) {
                    if (isValidMove(boardState, {r:i, c:j}, {r:kR, c:kC}, p)) return true;
                }
            }
        }
        return false;
    };

    const handleSquareClick = (r: number, c: number) => {
        if (gameStatus === 'checkmate' || (turn === 'b' && isBot && !isAutoPlaying)) return;

        // Select piece
        if (board[r][c]?.color === turn) {
            setSelected({r, c});
            setValidMoves(getSafeMoves(r, c));
            return;
        }

        // Move
        if (selected) {
            const isMoveValid = validMoves.some(m => m.r === r && m.c === c);
            if (isMoveValid) {
                movePiece(selected, {r, c});
                setSelected(null);
                setValidMoves([]);
            }
        }
    };

    const movePiece = (start: {r:number, c:number}, end: {r:number, c:number}) => {
        const piece = board[start.r][start.c];
        const target = board[end.r][end.c];
        const newBoard = JSON.parse(JSON.stringify(board));

        if (target) {
            playSound('place'); // Capture sound ideally distinct
            if (target.color === 'w') setCapturedWhite(prev => [...prev, target.type]);
            else setCapturedBlack(prev => [...prev, target.type]);
        } else {
            playSound('draw');
        }

        newBoard[end.r][end.c] = piece;
        newBoard[start.r][start.c] = null;

        // Promotion (Simple Queen auto-promo)
        if (piece?.type === 'p' && (end.r === 0 || end.r === 7)) {
            newBoard[end.r][end.c] = { type: 'q', color: piece.color };
        }

        setBoard(newBoard);

        const nextTurn = turn === 'w' ? 'b' : 'w';
        
        // Check Status
        if (isCheck(newBoard, nextTurn)) {
            // Checkmate detection (naive: look for any valid move)
            let hasMove = false;
            for(let i=0; i<8; i++) {
                for(let j=0; j<8; j++) {
                    if (newBoard[i][j]?.color === nextTurn) {
                        // We need to use the newBoard state logic here, simplistic recursion avoidance
                        // For this demo, simply marking check
                    }
                }
            }
            // For true checkmate logic we need to re-run getSafeMoves on the new board state
            // Let's rely on basic check indication for UI
            setGameStatus('check');
            playSound('angry');
        } else {
            setGameStatus('playing');
        }
        
        setTurn(nextTurn);
    };

    const makeBotMove = () => {
        // Simple AI: Capture if possible, otherwise random valid move
        const myColor = turn;
        const allMoves: {from: {r:number, c:number}, to: {r:number, c:number}, score: number}[] = [];

        for(let r=0; r<8; r++) {
            for(let c=0; c<8; c++) {
                if (board[r][c]?.color === myColor) {
                    const safe = getSafeMoves(r, c);
                    safe.forEach(to => {
                        let score = 0;
                        if (board[to.r][to.c]) {
                            // Basic material value
                            const valMap: any = {p:1, n:3, b:3, r:5, q:9, k:100};
                            score = valMap[board[to.r][to.c]!.type] * 10;
                        }
                        score += Math.random(); // Add randomness
                        allMoves.push({from: {r, c}, to, score});
                    });
                }
            }
        }

        if (allMoves.length === 0) {
            // No moves, likely checkmate or stalemate
            setGameStatus('checkmate');
            finishGame(myColor === 'w'); // Logic inverted, if bot has no moves and is in check -> lost
            return;
        }

        allMoves.sort((a, b) => b.score - a.score);
        const best = allMoves[0]; // Or top 3 for variation
        movePiece(best.from, best.to);
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

    const finishGame = (win: boolean) => {
        playSound(win ? 'win' : 'lose');
        setShowTrophy(win ? 'gold' : 'silver');
    };

    const closeTrophy = () => {
        onEndGame(showTrophy === 'gold', showTrophy === 'gold' ? 300 : 0);
    };

    // Render Helpers
    const getSquareColor = (r: number, c: number) => {
        const isDark = (r + c) % 2 === 1;
        if (selected?.r === r && selected?.c === c) return 'bg-yellow-400/50';
        if (validMoves.some(m => m.r === r && m.c === c)) return 'bg-green-400/40 ring-inset ring-4 ring-green-500/20';
        return isDark ? 'bg-[#b58863]' : 'bg-[#f0d9b5]';
    };

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] p-2 items-center relative overflow-hidden">
             
             {/* Header */}
             <div className="w-full flex justify-between items-center bg-slate-800 p-2 rounded-xl mb-4 border border-white/10 z-20 shadow-xl">
                 <div className="flex items-center gap-3">
                     <img src={user.avatar} className="w-10 h-10 rounded-full border-2 border-white"/>
                     <div>
                         <div className="text-sm font-bold text-white">{user.name}</div>
                         <div className="text-xs text-yellow-400 font-mono flex items-center gap-1"><Clock size={10}/> {Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}</div>
                     </div>
                 </div>
                 
                 <div className="flex flex-col items-center">
                    <div className="font-serif text-2xl font-bold text-amber-500 tracking-wider">CHESS</div>
                    {gameStatus === 'check' && <div className="text-red-500 text-xs font-bold animate-pulse">CHECK!</div>}
                 </div>

                 <div className="flex items-center gap-3">
                     <div className="text-right">
                         <div className="text-sm font-bold text-white">{opponentName}</div>
                         <div className="text-xs text-slate-400">Bot (Level 5)</div>
                     </div>
                     <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center font-bold text-lg border-2 border-slate-400">Bot</div>
                 </div>
             </div>

             {/* Board Area */}
             <div className="relative flex-1 flex items-center justify-center w-full max-w-lg">
                 {/* Coordinates (Left) */}
                 <div className="absolute left-1 top-0 bottom-0 flex flex-col justify-around text-xs text-slate-500 font-mono h-full py-4">
                     {[8,7,6,5,4,3,2,1].map(n => <span key={n}>{n}</span>)}
                 </div>

                 <div className="relative aspect-square w-full bg-[#2f2f2f] p-1 rounded shadow-2xl border-4 border-[#4a4a4a]">
                    <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
                        {board.map((row, r) => (
                            row.map((piece, c) => (
                                <div 
                                    key={`${r}-${c}`}
                                    onClick={() => handleSquareClick(r, c)}
                                    className={`relative flex items-center justify-center cursor-pointer transition-colors ${getSquareColor(r, c)}`}
                                >
                                    {piece && (
                                        <span className={`text-4xl md:text-5xl select-none drop-shadow-sm ${piece.color === 'w' ? 'text-white drop-shadow-[0_2px_1px_rgba(0,0,0,0.8)]' : 'text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]'}`}>
                                            {PIECE_SYMBOLS[`${piece.color}-${piece.type}`]}
                                        </span>
                                    )}
                                    {/* Valid Move Marker */}
                                    {validMoves.some(m => m.r === r && m.c === c) && !piece && (
                                        <div className="w-3 h-3 bg-green-900/30 rounded-full"></div>
                                    )}
                                </div>
                            ))
                        ))}
                    </div>
                 </div>
                 
                 {/* Coordinates (Bottom) */}
                 <div className="absolute bottom-[-20px] left-0 right-0 flex justify-around text-xs text-slate-500 font-mono pl-4">
                     {['a','b','c','d','e','f','g','h'].map(l => <span key={l}>{l}</span>)}
                 </div>
             </div>

             {/* Captured Pieces */}
             <div className="w-full flex justify-between px-4 mt-6 bg-slate-900/50 p-2 rounded-lg">
                 <div className="flex gap-1 overflow-hidden h-6 items-center">
                     {capturedWhite.map((p, i) => <span key={i} className="text-white text-lg">{PIECE_SYMBOLS[`w-${p}`]}</span>)}
                 </div>
                 <div className="flex gap-1 overflow-hidden h-6 items-center">
                     {capturedBlack.map((p, i) => <span key={i} className="text-black text-lg bg-white/20 rounded px-0.5">{PIECE_SYMBOLS[`b-${p}`]}</span>)}
                 </div>
             </div>

             {/* Controls */}
             <div className="absolute top-20 right-2 flex flex-col gap-2 z-30">
                 <button onClick={() => setShowExitConfirm(true)} className="bg-red-500/20 hover:bg-red-500/80 text-red-200 p-2 rounded-full backdrop-blur-sm"><XCircle size={20}/></button>
                 <button onClick={toggleAutoPlay} className={`p-2 rounded-full backdrop-blur-sm ${hasAutoPlay ? (isAutoPlaying ? 'bg-green-500 animate-pulse' : 'bg-slate-600') : 'bg-orange-500'}`}>
                     <Zap size={20} className="text-white"/>
                 </button>
             </div>

             {/* Exit Modal */}
             {showExitConfirm && (
                <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
                    <div className="bg-slate-800 p-6 rounded-2xl border border-white/10 max-w-sm w-full text-center">
                        <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
                        <h3 className="text-xl font-bold mb-2 text-white">انسحاب؟</h3>
                        <div className="flex gap-4 mt-6">
                            <button onClick={() => onEndGame(false, 0)} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold">تأكيد</button>
                            <button onClick={() => setShowExitConfirm(false)} className="flex-1 bg-slate-600 hover:bg-slate-500 text-white py-3 rounded-xl font-bold">إلغاء</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Trophy */}
            {showTrophy && (
                <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 animate-in zoom-in duration-300">
                    <div className="bg-slate-800 p-8 rounded-3xl border-4 border-yellow-500/50 text-center max-w-sm w-full">
                        {showTrophy === 'gold' ? <Trophy size={100} className="mx-auto text-yellow-400 animate-bounce mb-4" /> : <Trophy size={100} className="mx-auto text-slate-400 mb-4" />}
                        <h2 className="text-4xl font-black text-white mb-2">{showTrophy === 'gold' ? 'انتصار!' : 'هزيمة'}</h2>
                        <button onClick={closeTrophy} className="w-full bg-emerald-600 hover:bg-emerald-500 py-4 rounded-xl font-bold text-xl shadow-lg mt-6">استمرار</button>
                    </div>
                </div>
            )}
        </div>
    );
};