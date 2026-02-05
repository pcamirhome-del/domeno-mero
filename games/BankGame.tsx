import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, PlayerType, Property } from '../types';
import { XCircle, Dices, Building2, Coins, ArrowRight, Zap } from 'lucide-react';
import { playSound } from '../sounds';

interface BankGameProps {
    user: UserProfile;
    opponentName: string;
    isBot: boolean;
    onEndGame: (winner: boolean, coins: number) => void;
}

// --- Constants & Data ---
// Simplified Board: 20 Tiles (5 per side)
const BOARD_SIZE = 20;

const PROPERTIES_DATA: Property[] = [
    { id: 0, name: 'البداية', price: 0, rent: 0, color: '#a3a3a3', type: 'start', owner: null },
    { id: 1, name: 'القاهرة', price: 100, rent: 20, color: '#ef4444', type: 'property', owner: null }, // Red
    { id: 2, name: 'الإسكندرية', price: 120, rent: 25, color: '#ef4444', type: 'property', owner: null },
    { id: 3, name: 'حظك اليوم', price: 0, rent: 0, color: '#f59e0b', type: 'chance', owner: null },
    { id: 4, name: 'الجيزة', price: 150, rent: 30, color: '#3b82f6', type: 'property', owner: null }, // Blue
    { id: 5, name: 'السجن', price: 0, rent: 0, color: '#1f2937', type: 'jail', owner: null },
    { id: 6, name: 'الأقصر', price: 180, rent: 35, color: '#ec4899', type: 'property', owner: null }, // Pink
    { id: 7, name: 'أسوان', price: 200, rent: 40, color: '#ec4899', type: 'property', owner: null },
    { id: 8, name: 'الضرائب', price: 0, rent: 0, color: '#dc2626', type: 'tax', owner: null }, // Pay 100
    { id: 9, name: 'شرم الشيخ', price: 220, rent: 45, color: '#10b981', type: 'property', owner: null }, // Green
    { id: 10, name: 'استراحة', price: 0, rent: 0, color: '#a3a3a3', type: 'start', owner: null },
    { id: 11, name: 'الغردقة', price: 240, rent: 50, color: '#10b981', type: 'property', owner: null },
    { id: 12, name: 'المنصورة', price: 260, rent: 55, color: '#8b5cf6', type: 'property', owner: null }, // Purple
    { id: 13, name: 'حظك اليوم', price: 0, rent: 0, color: '#f59e0b', type: 'chance', owner: null },
    { id: 14, name: 'طنطا', price: 280, rent: 60, color: '#8b5cf6', type: 'property', owner: null },
    { id: 15, name: 'اذهب للسجن', price: 0, rent: 0, color: '#1f2937', type: 'jail', owner: null },
    { id: 16, name: 'بورسعيد', price: 300, rent: 65, color: '#f97316', type: 'property', owner: null }, // Orange
    { id: 17, name: 'الإسماعيلية', price: 320, rent: 70, color: '#f97316', type: 'property', owner: null },
    { id: 18, name: 'السويس', price: 350, rent: 80, color: '#eab308', type: 'property', owner: null }, // Yellow
    { id: 19, name: 'العاصمة', price: 400, rent: 100, color: '#eab308', type: 'property', owner: null },
];

export const BankGame: React.FC<BankGameProps> = ({ user, opponentName, isBot, onEndGame }) => {
    // State
    const [properties, setProperties] = useState<Property[]>(PROPERTIES_DATA);
    const [turn, setTurn] = useState<'human'|'computer'>('human');
    const [players, setPlayers] = useState({
        human: { money: 1500, position: 0, isBankrupt: false, color: 'blue' },
        computer: { money: 1500, position: 0, isBankrupt: false, color: 'red' }
    });
    const [dice, setDice] = useState<number>(0);
    const [message, setMessage] = useState('ابدأ اللعب!');
    const [showBuyModal, setShowBuyModal] = useState<Property | null>(null);
    const [isRolling, setIsRolling] = useState(false);
    const [hasAutoPlay, setHasAutoPlay] = useState(false);
    const [isAutoPlaying, setIsAutoPlaying] = useState(false);
    
    // Constants
    const PASS_GO_REWARD = 200;

    // AutoPlay & Bot Turn Effect
    useEffect(() => {
        if (turn === 'computer' && !players.computer.isBankrupt && isBot) {
            setTimeout(handleRoll, 1500);
        } else if (turn === 'human' && !players.human.isBankrupt && isAutoPlaying && !showBuyModal) {
            setTimeout(handleRoll, 1500);
        }
    }, [turn, isBot, isAutoPlaying, showBuyModal]);

    const handleRoll = () => {
        if (isRolling) return;
        setIsRolling(true);
        playSound('draw');
        
        let d = 0;
        let count = 0;
        const interval = setInterval(() => {
            d = Math.ceil(Math.random() * 6);
            setDice(d);
            count++;
            if (count > 8) {
                clearInterval(interval);
                setIsRolling(false);
                movePlayer(turn, d);
            }
        }, 80);
    };

    const movePlayer = (playerKey: 'human' | 'computer', steps: number) => {
        setPlayers(prev => {
            const current = prev[playerKey];
            let nextPos = current.position + steps;
            let moneyToAdd = 0;

            if (nextPos >= BOARD_SIZE) {
                nextPos = nextPos % BOARD_SIZE;
                moneyToAdd = PASS_GO_REWARD;
                playSound('win');
            }

            const nextPlayers = {
                ...prev,
                [playerKey]: {
                    ...current,
                    position: nextPos,
                    money: current.money + moneyToAdd
                }
            };

            // Process Tile Logic needs to happen after state update, use Timeout or separate function passing new state
            setTimeout(() => processTile(playerKey, nextPos, nextPlayers), 500);

            return nextPlayers;
        });
    };

    const processTile = (playerKey: 'human' | 'computer', pos: number, currentPlayers: any) => {
        const tile = properties.find(p => p.id === pos)!;
        const player = currentPlayers[playerKey];
        let msg = `${playerKey === 'human' ? 'وصلت' : 'وصل الخصم'} إلى ${tile.name}`;

        if (tile.type === 'start') {
            msg += ' (راحة)';
            finishTurn(playerKey, msg);
        } 
        else if (tile.type === 'tax') {
            msg += ' - دفع ضرائب 100';
            updateMoney(playerKey, -100);
            playSound('lose');
            finishTurn(playerKey, msg);
        }
        else if (tile.type === 'jail') {
            msg += ' (زيارة فقط)';
            finishTurn(playerKey, msg);
        }
        else if (tile.type === 'chance') {
            const luck = Math.random() > 0.5 ? 100 : -50;
            msg += luck > 0 ? ' - كسبت 100!' : ' - خسرت 50!';
            if (luck > 0) playSound('win'); else playSound('lose');
            updateMoney(playerKey, luck);
            finishTurn(playerKey, msg);
        }
        else if (tile.type === 'property') {
            if (tile.owner === null) {
                // Available to buy
                if (player.money >= tile.price) {
                    if (playerKey === 'human' && !isAutoPlaying) {
                        // Show Modal for manual player
                        setMessage(`هل تريد شراء ${tile.name} بـ ${tile.price}؟`);
                        setShowBuyModal(tile);
                        return; // Wait for user decision
                    } else {
                        // Bot Logic OR AutoPlay: Buy if has > 200 left after purchase
                        if (player.money >= tile.price + 200) {
                            buyProperty(playerKey, tile);
                        } else {
                            finishTurn(playerKey, `${playerKey === 'human' ? 'أنت' : 'الكمبيوتر'} لم يشتري`);
                        }
                    }
                } else {
                     finishTurn(playerKey, 'لا تملك مال كافي للشراء');
                }
            } else if (tile.owner === (playerKey === 'human' ? 'human' : 'computer')) {
                finishTurn(playerKey, 'أرضك (راحة)');
            } else {
                // Owned by opponent - Pay Rent
                msg += ` - دفع إيجار ${tile.rent}`;
                playSound('lose');
                payRent(playerKey, tile.rent);
                finishTurn(playerKey, msg);
            }
        }
    };

    const buyProperty = (playerKey: 'human' | 'computer', tile: Property) => {
        updateMoney(playerKey, -tile.price);
        setProperties(prev => prev.map(p => p.id === tile.id ? { ...p, owner: playerKey === 'human' ? 'human' : 'computer' } : p));
        playSound('place');
        finishTurn(playerKey, `${playerKey === 'human' ? 'اشتريت' : 'اشترى الخصم'} ${tile.name}`);
        setShowBuyModal(null);
    };

    const payRent = (payerKey: 'human' | 'computer', amount: number) => {
        const receiverKey = payerKey === 'human' ? 'computer' : 'human';
        setPlayers(prev => ({
            ...prev,
            [payerKey]: { ...prev[payerKey], money: prev[payerKey].money - amount },
            [receiverKey]: { ...prev[receiverKey], money: prev[receiverKey].money + amount }
        }));
    };

    const updateMoney = (playerKey: 'human' | 'computer', amount: number) => {
        setPlayers(prev => ({
            ...prev,
            [playerKey]: { ...prev[playerKey], money: prev[playerKey].money + amount }
        }));
    };

    const finishTurn = (currentPlayer: string, msg: string) => {
        setMessage(msg);
        
        setTimeout(() => {
            setPlayers(prev => {
                if (prev.human.money < 0) {
                     onEndGame(false, 10); // Human lost
                     return prev;
                }
                if (prev.computer.money < 0) {
                    onEndGame(true, 200); // Human won
                    return prev;
                }
                
                // Switch Turn
                setTurn(currentPlayer === 'human' ? 'computer' : 'human');
                return prev;
            });
        }, 1500);
    };

    const buyAutoPlay = () => {
        if(confirm('شراء اللعب التلقائي بـ 200 عملة؟')) {
            setHasAutoPlay(true);
            setIsAutoPlaying(true);
        }
    };

    // --- Rendering ---
    
    // Render the board as a loop of divs
    // Top Row: 0 -> 5
    // Right Col: 6 -> 9
    // Bottom Row: 10 -> 15 (reversed visually)
    // Left Col: 16 -> 19 (reversed visually)
    
    const renderTile = (id: number) => {
        const tile = properties.find(p => p.id === id)!;
        const isHumanHere = players.human.position === id;
        const isBotHere = players.computer.position === id;

        return (
            <div key={id} className={`
                relative flex flex-col items-center justify-center p-1 border border-slate-700 bg-slate-800 text-[10px] md:text-xs text-center
                ${tile.owner === 'human' ? 'ring-2 ring-blue-500 bg-blue-900/20' : ''}
                ${tile.owner === 'computer' ? 'ring-2 ring-red-500 bg-red-900/20' : ''}
            `} style={{ height: '100%', width: '100%' }}>
                {tile.color && <div className="w-full h-2 absolute top-0 left-0" style={{backgroundColor: tile.color}}></div>}
                <div className="mt-2 font-bold truncate w-full">{tile.name}</div>
                {tile.price > 0 && <div className="text-emerald-400">{tile.price}</div>}
                
                {/* Tokens */}
                <div className="flex gap-1 absolute bottom-1">
                    {isHumanHere && <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg animate-bounce"></div>}
                    {isBotHere && <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-lg"></div>}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-slate-950 p-2 relative overflow-hidden select-none">
             <button onClick={() => onEndGame(false, 0)} className="absolute top-4 right-4 bg-red-500/20 text-red-200 p-2 rounded-full z-50"><XCircle/></button>

            {/* Info Bar */}
            <div className="flex justify-between items-center bg-slate-900 p-3 rounded-xl mb-4 border border-white/10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-bold">A</div>
                    <div>
                        <div className="text-xs text-slate-400">{user.name}</div>
                        <div className="font-mono text-emerald-400 font-bold">{players.human.money}</div>
                    </div>
                </div>
                <div className="text-center">
                    <div className="bg-slate-800 px-4 py-1 rounded-full text-xs text-yellow-400 mb-1">{message}</div>
                    {isRolling && <Dices className="animate-spin mx-auto text-white"/>}
                </div>
                <div className="flex items-center gap-2 text-right">
                    <div>
                        <div className="text-xs text-slate-400">{opponentName}</div>
                        <div className="font-mono text-red-400 font-bold">{players.computer.money}</div>
                    </div>
                    <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center font-bold">B</div>
                </div>
            </div>

            {/* Board Container - Responsive Square */}
            <div className="flex-1 flex items-center justify-center">
                <div className="relative w-full max-w-[500px] aspect-square bg-slate-900 border-4 border-slate-700 rounded-lg shadow-2xl p-1">
                     {/* Center Area */}
                     <div className="absolute inset-[18%] bg-slate-950 rounded border border-slate-800 flex flex-col items-center justify-center relative">
                         <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-4">بنك الحظ</h2>
                         
                         {turn === 'human' && !isRolling && !showBuyModal && !isAutoPlaying && (
                             <button 
                                onClick={handleRoll}
                                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:scale-105 transition-transform px-8 py-3 rounded-full font-bold shadow-lg flex items-center gap-2"
                             >
                                <Dices /> ارمي النرد
                             </button>
                         )}
                         {turn === 'computer' && (
                             <div className="text-slate-400 flex items-center gap-2"><div className="w-2 h-2 bg-white rounded-full animate-ping"></div> دور الكمبيوتر</div>
                         )}

                         <div className="mt-6 text-6xl font-black text-white">{dice > 0 ? dice : ''}</div>
                         
                         {/* Auto Play Button */}
                        <button 
                            onClick={hasAutoPlay ? () => setIsAutoPlaying(!isAutoPlaying) : buyAutoPlay}
                            className={`absolute bottom-4 right-4 p-2 rounded-full ${hasAutoPlay ? (isAutoPlaying ? 'bg-green-500 animate-pulse' : 'bg-slate-600') : 'bg-orange-500'}`}
                        >
                            <Zap size={20} className="text-white"/>
                        </button>
                     </div>

                     {/* Grid Placement - Absolute positioning for loop */}
                     {/* Top Row: 0-5 */}
                     <div className="absolute top-0 left-0 right-0 h-[18%] flex flex-row-reverse">
                         {[0,1,2,3,4,5].map(i => <div key={i} className="flex-1 h-full border-l border-slate-700">{renderTile(i)}</div>)}
                     </div>
                     {/* Right Col: 6-9 */}
                     <div className="absolute top-[18%] right-0 bottom-[18%] w-[16.66%] flex flex-col">
                         {[6,7,8,9].map(i => <div key={i} className="flex-1 w-full border-b border-slate-700">{renderTile(i)}</div>)}
                     </div>
                     {/* Bottom Row: 10-15 */}
                     <div className="absolute bottom-0 left-0 right-0 h-[18%] flex flex-row">
                         {[10,11,12,13,14,15].map(i => <div key={i} className="flex-1 h-full border-r border-slate-700">{renderTile(i)}</div>)}
                     </div>
                     {/* Left Col: 16-19 */}
                     <div className="absolute top-[18%] left-0 bottom-[18%] w-[16.66%] flex flex-col-reverse">
                         {[16,17,18,19].map(i => <div key={i} className="flex-1 w-full border-t border-slate-700">{renderTile(i)}</div>)}
                     </div>
                </div>
            </div>

            {/* Buy Modal */}
            {showBuyModal && (
                <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-800 p-6 rounded-2xl border border-white/10 max-w-sm w-full text-center">
                        <Building2 size={48} className="mx-auto text-emerald-400 mb-4" />
                        <h3 className="text-xl font-bold mb-2">شراء {showBuyModal.name}؟</h3>
                        <p className="text-slate-300 mb-6">السعر: <span className="text-emerald-400 font-bold">{showBuyModal.price}</span> | الإيجار: {showBuyModal.rent}</p>
                        
                        <div className="flex gap-4">
                            <button 
                                onClick={() => buyProperty('human', showBuyModal)}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-2 rounded-lg font-bold"
                            >
                                شراء
                            </button>
                            <button 
                                onClick={() => { setShowBuyModal(null); finishTurn('human', 'لم يتم الشراء'); }}
                                className="flex-1 bg-slate-600 hover:bg-slate-500 py-2 rounded-lg"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};