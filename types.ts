export type TileValue = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// --- Domino Types ---
export interface Domino {
  id: string;
  left: TileValue;
  right: TileValue;
  isDouble: boolean;
}

export interface PlacedDomino extends Domino {
  x?: number;
  y?: number;
  rotation?: number; 
  placedAt: 'start' | 'end'; 
}

// --- Card Types ---
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  value: number; 
  isRed: boolean;
}

// --- Bank Game (Monopoly) Types ---
export interface Property {
    id: number;
    name: string;
    price: number;
    rent: number;
    color: string;
    type: 'property' | 'start' | 'tax' | 'chance' | 'jail';
    owner: PlayerType | null;
}

// --- General Game Types ---
export type PlayerType = 'human' | 'computer' | 'bot1' | 'bot2' | 'bot3';

export interface Player {
  type: PlayerType;
  name: string;
  hand: Domino[]; 
  cardHand: Card[]; 
  score: number;
  
  // Bank Game Specifics
  money?: number;
  position?: number;
  properties?: number[]; 
  isBankrupt?: boolean;
}

export type GameStatus = 'playing' | 'round_over' | 'game_over';

export interface DominoGameState {
  board: PlacedDomino[];
  deck: Domino[];
  players: {
    human: Player;
    computer: Player;
  };
  currentTurn: PlayerType;
  status: GameStatus;
  winner: PlayerType | 'draw' | null;
  boardEnds: {
    left: number;
    right: number;
  };
  message: string;
  timeLeft: number;
}

export interface CardGameState {
  deck: Card[];
  discardPile: Card[];
  players: Player[]; 
  currentTurnIndex: number; 
  direction: 1 | -1; // 1 clockwise, -1 counter
  status: GameStatus;
  winner: Player | null;
  message: string;
  timeLeft: number;
}

// --- Chat & Economy ---
export interface ChatMessage {
  id: string;
  sender: string;
  text?: string;
  emoji?: string;
  type: 'text' | 'emoji' | 'voice_emoji' | 'gift';
  target?: string; // For gifts
}

export type VoiceEmote = 'laugh' | 'angry' | 'kiss';

// --- App Navigation ---
export type AppView = 'splash' | 'menu' | 
                      'lobby_domino' | 'lobby_card' | 'lobby_ludo' | 'lobby_bank' |
                      'game_domino' | 'game_card' | 'game_ludo' | 'game_bank';

export interface UserSettings {
    musicEnabled: boolean;
    vibrationEnabled: boolean;
}

export interface UserProfile {
  name: string;
  globalCoins: number; 
  level: number;
  xp: number;
  settings: UserSettings;
}

export interface LeaderboardUser {
    name: string;
    level: number;
    wealth: number;
    avatar?: string;
}