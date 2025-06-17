// Room name encoding and word lists for DaggerDice
// Implements friendly room names with mathematical encoding

// Frozen, stable word lists for friendly room names
export const ADJECTIVES_V1: string[] = [
  'brave', 'clever', 'quick', 'mystic', 'bold', 'sly', 'noble', 'frost', 'storm', 'arcane',
  'fire', 'shade', 'thorn', 'silver', 'lunar', 'sunny', 'ghost', 'vivid', 'crisp', 'fuzzy',
  'bright', 'lucky', 'dream', 'zesty', 'grim', 'jolly', 'dark', 'neat', 'fiery', 'lively',
  'fair', 'witty', 'trusty', 'keen', 'kind', 'sharp', 'proud', 'savage', 'swift', 'tidy',
  'glad', 'grand', 'perky', 'breezy', 'merry', 'gentle', 'lucid', 'upbeat', 'deft', 'sincere',
  'ashen', 'elven', 'spooky', 'thorny', 'primal', 'runic', 'shadow', 'wild', 'ancient', 'bitter',
  'dusky', 'icy', 'vibrant', 'lone', 'radiant', 'shiny', 'vague', 'shy', 'fearless', 'chilly',
  'serene', 'stormy', 'gleaming', 'blazing', 'glowing', 'fierce', 'moody', 'gritty', 'gilded', 'whimsy'
];

export const NOUNS_V1: string[] = [
  'dragon', 'ranger', 'rogue', 'wizard', 'witch', 'paladin', 'knight', 'archer', 'bard', 'monk',
  'troll', 'ogre', 'sprite', 'goblin', 'faerie', 'undead', 'ghost', 'beast', 'slayer', 'seer',
  'oracle', 'druid', 'mage', 'shaman', 'giant', 'fencer', 'rider', 'hunter', 'guardian', 'warden',
  'wyvern', 'naga', 'flayer', 'lich', 'harpy', 'siren', 'angel', 'viking', 'gnome', 'clank',
  'blade', 'potion', 'staff', 'wand', 'shield', 'helm', 'mask', 'tome', 'crown', 'ring',
  'cloak', 'rune', 'sigil', 'idol', 'banner', 'torch', 'charm', 'glaive', 'orb', 'scepter',
  'spike', 'fang', 'claw', 'hoof', 'horn', 'shell', 'thorn', 'twig', 'bark', 'stone',
  'root', 'dust', 'ember', 'flame', 'mist', 'echo', 'tower', 'keep', 'gate', 'hall'
];

const LIST_SIZE = 80;

// Crockford Base32 encoding (excludes I, L, O, U to avoid confusion)
const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Encodes a number using Crockford Base32
 */
function encodeCrockford(num: number, options: { length?: number } = {}): string {
  if (num < 0) {
throw new Error('Cannot encode negative numbers');
}
  
  let result = '';
  if (num === 0) {
    result = '0';
  } else {
    while (num > 0) {
      result = CROCKFORD_ALPHABET[num % 32] + result;
      num = Math.floor(num / 32);
    }
  }
  
  if (options.length) {
    return result.padStart(options.length, '0');
  }
  return result;
}

/**
 * Normalizes confusing characters according to Crockford Base32 specification
 */
function normalizeCrockfordChar(char: string): string {
  switch (char.toUpperCase()) {
    case 'I': return '1'; // I -> 1
    case 'L': return '1'; // L -> 1  
    case 'O': return '0'; // O -> 0
    case 'U': return 'V'; // U -> V
    default: return char.toUpperCase();
  }
}

/**
 * Decodes a Crockford Base32 string to a number
 * Accepts and normalizes confusing characters (I->1, L->1, O->0, U->V)
 */
function decodeCrockford(encoded: string): number {
  let result = 0;
  
  for (let i = 0; i < encoded.length; i++) {
    const normalizedChar = normalizeCrockfordChar(encoded[i]);
    const value = CROCKFORD_ALPHABET.indexOf(normalizedChar);
    if (value === -1) {
      throw new Error(`Invalid character in encoded string: ${encoded[i]} (normalized to ${normalizedChar})`);
    }
    result = result * 32 + value;
  }
  
  return result;
}

/**
 * Encodes a word pair into a short code
 */
export function encodeNameV1(word1: string, word2: string): string {
  const w1 = word1.toLowerCase();
  const w2 = word2.toLowerCase();

  const noun2Index = NOUNS_V1.indexOf(w2);
  if (noun2Index === -1) {
throw new Error(`Unknown noun: ${w2}`);
}

  const adjIndex = ADJECTIVES_V1.indexOf(w1);
  if (adjIndex !== -1) {
    // adjective-noun (v0)
    const combinedIndex = adjIndex * LIST_SIZE + noun2Index;
    const payload = (0 << 14) | combinedIndex;
    return encodeCrockford(payload, { length: 3 });
  }

  const noun1Index = NOUNS_V1.indexOf(w1);
  if (noun1Index !== -1) {
    if (noun1Index === noun2Index) {
      throw new Error(`Duplicate noun-noun pair not allowed: ${w1}-${w2}`);
    }
    // noun-noun (v1)
    const combinedIndex = noun1Index * LIST_SIZE + noun2Index;
    const payload = (1 << 14) | combinedIndex;
    return encodeCrockford(payload, { length: 3 });
  }

  throw new Error(`Unknown word: ${w1}`);
}

/**
 * Decodes a short code back to a word pair
 */
export function decodeNameV1(code: string): { word1: string; word2: string } {
  const payload = decodeCrockford(code);
  const version = (payload >> 14) & 0x1; // Extract 1-bit version
  const combinedIndex = payload & 0x3FFF; // Extract 14-bit index
  
  const noun2Index = combinedIndex % LIST_SIZE;
  const firstIndex = Math.floor(combinedIndex / LIST_SIZE);
  
  if (noun2Index >= NOUNS_V1.length) {
    throw new Error(`Invalid noun index: ${noun2Index}`);
  }
  
  const word2 = NOUNS_V1[noun2Index];
  
  if (version === 0) {
    // adjective-noun
    if (firstIndex >= ADJECTIVES_V1.length) {
      throw new Error(`Invalid adjective index: ${firstIndex}`);
    }
    const word1 = ADJECTIVES_V1[firstIndex];
    return { word1, word2 };
  } else {
    // noun-noun (version === 1)
    if (firstIndex >= NOUNS_V1.length) {
      throw new Error(`Invalid noun index: ${firstIndex}`);
    }
    const word1 = NOUNS_V1[firstIndex];
    return { word1, word2 };
  }
}

/**
 * Generates a friendly word pair for display
 */
export function generateFriendlyName(): string {
  const adjIndex = Math.floor(Math.random() * ADJECTIVES_V1.length);
  const nounIndex = Math.floor(Math.random() * NOUNS_V1.length);
  
  const adjective = ADJECTIVES_V1[adjIndex];
  const noun = NOUNS_V1[nounIndex];
  
  return `${adjective}-${noun}`;
}

/**
 * Converts a session ID to friendly name for display
 */
export function sessionIdToFriendlyName(sessionId: string): string {
  try {
    const { word1, word2 } = decodeNameV1(sessionId);
    return `${word1}-${word2}`;
  } catch {
    // If decoding fails, return the original ID
    return sessionId;
  }
}

/**
 * Converts a friendly name to session ID
 */
export function friendlyNameToSessionId(friendlyName: string): string {
  const parts = friendlyName.toLowerCase().split('-');
  if (parts.length !== 2) {
    throw new Error('Invalid friendly name format');
  }
  
  return encodeNameV1(parts[0], parts[1]);
}