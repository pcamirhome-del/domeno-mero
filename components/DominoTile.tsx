
import React from 'react';
import { Domino, TileValue } from '../types';

interface DominoTileProps {
  left: TileValue;
  right: TileValue;
  isDouble?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
  highlight?: boolean;
}

const Dot = () => <div className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 bg-black rounded-full shadow-sm inset-shadow"></div>;

const Face: React.FC<{ value: TileValue; size: string }> = ({ value, size }) => {
  // Dot patterns
  const patterns: Record<number, string> = {
    0: '',
    1: 'flex justify-center items-center',
    2: 'flex justify-between',
    3: 'flex justify-between', 
    4: 'flex justify-between flex-wrap content-between',
    5: 'flex justify-between flex-wrap content-between',
    6: 'flex justify-between flex-wrap content-between', 
  };

  const renderDots = (v: number) => {
    switch (v) {
      case 0: return null;
      case 1: return <Dot />;
      case 2: return <><div className="self-start"><Dot /></div><div className="self-end"><Dot /></div></>;
      case 3: return <><div className="self-start"><Dot /></div><div className="self-center"><Dot /></div><div className="self-end"><Dot /></div></>;
      case 4: return <><div className="w-full flex justify-between"><Dot /><Dot /></div><div className="w-full flex justify-between"><Dot /><Dot /></div></>;
      case 5: return <><div className="w-full flex justify-between"><Dot /><Dot /></div><div className="w-full flex justify-center"><Dot /></div><div className="w-full flex justify-between"><Dot /><Dot /></div></>;
      case 6: return <><div className="w-full flex justify-between"><Dot /><Dot /></div><div className="w-full flex justify-between"><Dot /><Dot /></div><div className="w-full flex justify-between"><Dot /><Dot /></div></>;
      default: return null;
    }
  };

  return (
    <div className={`flex-1 ${size} bg-white rounded flex p-1 ${value === 0 ? '' : 'border-gray-100'} box-border overflow-hidden`}>
      <div className={`w-full h-full ${patterns[value] || ''} ${value === 3 ? 'space-y-[-4px]' : ''}`}>
        {renderDots(value)}
      </div>
    </div>
  );
};

export const DominoTile: React.FC<DominoTileProps> = ({
  left,
  right,
  isDouble,
  onClick,
  disabled = false,
  size = 'md',
  orientation = 'vertical',
  highlight = false,
}) => {
  // Size Definitions
  const sizeClasses = {
    // sm: Player Hand - Compact on mobile to fit 7 tiles, Large on Desktop
    sm: 'w-8 h-16 md:w-16 md:h-32', 
    // md: Board Tiles - Clearly visible
    md: 'w-10 h-20 md:w-20 md:h-40',
    lg: 'w-14 h-28 md:w-24 md:h-48',
  };
  
  const isHorizontal = orientation === 'horizontal';

  // Base classes with deeper shadow for 3D effect
  const baseClasses = `
    relative bg-[#f0f0f0] rounded-md border border-gray-400
    flex transition-all duration-200 select-none
    ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer hover:-translate-y-1'}
    ${highlight ? 'ring-4 ring-yellow-400 scale-105 z-10 shadow-[0_10px_20px_rgba(250,204,21,0.5)]' : 'shadow-[3px_5px_8px_rgba(0,0,0,0.6)]'}
  `;

  // Determine width/height based on orientation (swapping w/h if horizontal)
  const dimClass = isHorizontal 
    ? (size === 'md' ? 'w-20 h-10 md:w-40 md:h-20' : size === 'sm' ? 'w-16 h-8 md:w-32 md:h-16' : 'w-28 h-14 md:w-48 md:h-24') 
    : sizeClasses[size];

  // Flex direction
  const flexDir = isHorizontal ? 'flex-row' : 'flex-col';
  const dividerClass = isHorizontal ? 'w-px h-full' : 'h-px w-full';

  return (
    <div 
      className={`${baseClasses} ${dimClass} ${flexDir}`} 
      onClick={!disabled ? onClick : undefined}
    >
      <Face value={left} size="w-full h-full" />
      <div className={`${dividerClass} bg-gray-400`}></div>
      <Face value={right} size="w-full h-full" />
    </div>
  );
};
