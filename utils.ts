import { Domino, PlacedDomino, TileValue, Card, Suit, Rank } from './types';

// --- Domino Utils ---
export const generateDeck = (): Domino[] => {
  const deck: Domino[] = [];
  let idCounter = 0;
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      deck.push({
        id: `tile-${idCounter++}`,
        left: i as TileValue,
        right: j as TileValue,
        isDouble: i === j,
      });
    }
  }
  return shuffleArray(deck);
};

export const getValidMoves = (hand: Domino[], leftEnd: number, rightEnd: number): Domino[] => {
  if (leftEnd === -1 && rightEnd === -1) return hand;
  return hand.filter(tile => 
    tile.left === leftEnd || 
    tile.right === leftEnd || 
    tile.left === rightEnd || 
    tile.right === rightEnd
  );
};

export const calculateHandValue = (hand: Domino[]): number => {
  return hand.reduce((sum, tile) => sum + tile.left + tile.right, 0);
};

export const orientTile = (
  tile: Domino, 
  targetEnd: number, 
  side: 'left' | 'right'
): { left: TileValue, right: TileValue } => {
  if (side === 'left') {
    if (tile.right === targetEnd) return { left: tile.left, right: tile.right };
    return { left: tile.right, right: tile.left };
  } else {
    if (tile.left === targetEnd) return { left: tile.left, right: tile.right };
    return { left: tile.right, right: tile.left };
  }
};

// --- Card Utils ---
export const generateCardDeck = (removeQueenClubs: boolean = true): Card[] => {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck: Card[] = [];

  let idCount = 0;
  suits.forEach(suit => {
    ranks.forEach(rank => {
      // Logic for Old Maid: Remove Queen of Clubs usually, or Queen of Diamonds.
      // Let's remove Queen of Clubs as requested in general rules.
      if (removeQueenClubs && rank === 'Q' && suit === 'clubs') return;

      let val = 0;
      if (rank === 'A') val = 1;
      else if (['J', 'Q', 'K'].includes(rank)) val = 10; // Value matches for pairing only on rank really
      else val = parseInt(rank);

      deck.push({
        id: `card-${idCount++}`,
        suit,
        rank,
        value: val,
        isRed: suit === 'hearts' || suit === 'diamonds'
      });
    });
  });

  return shuffleArray(deck);
};

export const shuffleArray = <T>(array: T[]): T[] => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

// Remove pairs from hand (Old Maid Logic)
// Pair is defined by Rank and Color (Red/Black) usually? 
// Or just Rank? Standard Old Maid is just Rank (Color doesn't matter).
export const removePairs = (hand: Card[]): Card[] => {
  const counts: Record<string, Card[]> = {};
  
  hand.forEach(card => {
    if (!counts[card.rank]) counts[card.rank] = [];
    counts[card.rank].push(card);
  });

  const remaining: Card[] = [];
  Object.keys(counts).forEach(rank => {
    const cards = counts[rank];
    // If odd number of cards, keep one. If even, remove all (they pair up).
    // Actually, if you have 3 Kings, you keep 1. If 2, keep 0.
    if (cards.length % 2 !== 0) {
      remaining.push(cards[0]);
    }
  });

  return remaining;
};
