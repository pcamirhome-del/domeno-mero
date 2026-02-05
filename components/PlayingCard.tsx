import React from 'react';
import { Card } from '../types';
import { Heart, Diamond, Club, Spade } from 'lucide-react';

interface PlayingCardProps {
  card?: Card; // If undefined, render back of card
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
}

export const PlayingCard: React.FC<PlayingCardProps> = ({ card, onClick, selected, disabled }) => {
  if (!card) {
    // Back of card
    return (
      <div 
        onClick={!disabled ? onClick : undefined}
        className={`w-16 h-24 md:w-20 md:h-32 bg-blue-800 rounded-lg border-2 border-white/20 shadow-md flex items-center justify-center overflow-hidden cursor-pointer transform transition-transform hover:-translate-y-2 ${disabled ? 'opacity-50' : ''}`}
      >
        <div className="w-full h-full opacity-30 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]"></div>
      </div>
    );
  }

  const SuitIcon = () => {
    switch (card.suit) {
      case 'hearts': return <Heart className="fill-current" size={16} />;
      case 'diamonds': return <Diamond className="fill-current" size={16} />;
      case 'clubs': return <Club className="fill-current" size={16} />;
      case 'spades': return <Spade className="fill-current" size={16} />;
    }
  };

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`
        relative w-16 h-24 md:w-20 md:h-32 bg-white rounded-lg shadow-xl border border-gray-300
        flex flex-col justify-between p-2 select-none transition-all duration-200
        ${card.isRed ? 'text-red-600' : 'text-slate-900'}
        ${selected ? 'ring-4 ring-yellow-400 -translate-y-4' : 'hover:-translate-y-2'}
        ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div className="flex flex-col items-center leading-none">
        <span className="font-bold text-lg">{card.rank}</span>
        <SuitIcon />
      </div>
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        {card.suit === 'hearts' || card.suit === 'diamonds' ? <Heart size={40} /> : <Spade size={40} />}
      </div>
      <div className="flex flex-col items-center rotate-180 leading-none">
        <span className="font-bold text-lg">{card.rank}</span>
        <SuitIcon />
      </div>
    </div>
  );
};
