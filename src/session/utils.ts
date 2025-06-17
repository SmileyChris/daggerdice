// Session utility functions for DaggerDice multiplayer
import type { SharedRollHistoryItem } from './types.js';
import { 
  decodeNameV1, 
  friendlyNameToSessionId,
  ADJECTIVES_V1,
  NOUNS_V1
} from './room-names.js';

/**
 * Generates a friendly session ID using word pairs
 * Returns the friendly name for user-facing URLs and display
 * Supports both adjective-noun and noun-noun combinations
 */
export function generateSessionId(): string {
  // Randomly choose between adjective-noun and noun-noun patterns
  const useNounNoun = Math.random() < 0.3; // 30% chance for noun-noun, 70% for adj-noun
  
  if (useNounNoun) {
    // Generate noun-noun pair (ensuring they're different)
    let noun1Index, noun2Index;
    do {
      noun1Index = Math.floor(Math.random() * NOUNS_V1.length);
      noun2Index = Math.floor(Math.random() * NOUNS_V1.length);
    } while (noun1Index === noun2Index);
    
    const noun1 = NOUNS_V1[noun1Index];
    const noun2 = NOUNS_V1[noun2Index];
    
    return `${noun1}-${noun2}`;
  } else {
    // Generate adjective-noun pair
    const adjIndex = Math.floor(Math.random() * ADJECTIVES_V1.length);
    const nounIndex = Math.floor(Math.random() * NOUNS_V1.length);
    
    const adjective = ADJECTIVES_V1[adjIndex];
    const noun = NOUNS_V1[nounIndex];
    
    return `${adjective}-${noun}`;
  }
}

/**
 * Converts a friendly session ID to its short code equivalent
 * Useful for displaying compact codes in multiplayer dialogs
 */
export function getShortCode(sessionId: string): string {
  try {
    // If it's already a short code, return as-is
    if (/^[0-9A-Z]{3}$/i.test(sessionId)) {
      return sessionId.toUpperCase();
    }
    
    // If it's a friendly name, convert to short code
    if (/^[a-z]+-[a-z]+$/i.test(sessionId)) {
      return friendlyNameToSessionId(sessionId);
    }
    
    // Fallback: return original
    return sessionId;
  } catch {
    return sessionId;
  }
}

/**
 * Generates a unique player ID
 */
export function generatePlayerId(): string {
  const array = new Uint8Array(8); // 64 bits
  crypto.getRandomValues(array);
  
  return Array.from(array)
    .map(byte => byte.toString(36))
    .join('')
    .substring(0, 8);
}

/**
 * Validates a session ID format (supports both encoded codes and friendly names)
 */
export function isValidSessionId(sessionId: string): boolean {
  if (!sessionId || typeof sessionId !== 'string') {
    return false;
  }
  
  const trimmed = sessionId.trim();
  if (!trimmed) {
    return false;
  }
  
  // Check if it's a 3-character Crockford base32 code
  if (/^[0-9A-Z]{3}$/i.test(trimmed)) {
    try {
      // Try to decode it to validate
      decodeNameV1(trimmed.toUpperCase());
      return true;
    } catch {
      return false;
    }
  }
  
  // Check if it's a friendly name format (word1-word2)
  if (/^[a-z]+-[a-z]+$/i.test(trimmed)) {
    try {
      // Try to encode it to validate words exist
      friendlyNameToSessionId(trimmed);
      return true;
    } catch {
      return false;
    }
  }
  
  return false;
}

/**
 * Sanitizes a player name for safe storage and display
 */
export function sanitizePlayerName(name: string): string {
  if (!name || typeof name !== 'string') {
    return 'Anonymous';
  }
  
  // Trim whitespace and limit length
  const sanitized = name.trim().substring(0, 20);
  
  // Remove any HTML/script content for security
  const element = document.createElement('div');
  element.textContent = sanitized;
  
  return element.innerHTML || 'Anonymous';
}

/**
 * Formats a timestamp for display in roll history
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 1) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffMins < 1440) { // 24 hours
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ago`;
  } else {
    // Show date for older entries
    return date.toLocaleDateString();
  }
}

/**
 * Extracts session ID from current URL path and normalizes it
 */
export function getSessionIdFromUrl(): string | null {
  const match = window.location.pathname.match(/^\/room\/(.+)$/);
  const sessionId = match ? match[1] : null;
  return sessionId ? normalizeSessionId(sessionId) : null;
}

/**
 * Extracts session ID from any URL string
 */
export function extractSessionIdFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // Match both friendly names (word1-word2) and encoded codes (3 chars)
    const match = urlObj.pathname.match(/\/room\/([a-z]+-[a-z]+|[A-Za-z0-9]{3})/i);
    const sessionId = match ? match[1] : null;
    return sessionId ? normalizeSessionId(sessionId) : null;
  } catch {
    // If URL parsing fails, try to extract from plain text
    // Handle both /room/ and room/ patterns for both formats
    const match = url.match(/\/?room\/([a-z]+-[a-z]+|[A-Za-z0-9]{3})/i);
    const sessionId = match ? match[1] : null;
    return sessionId ? normalizeSessionId(sessionId) : null;
  }
}

/**
 * Normalizes a session ID and validates format
 */
export function normalizeSessionId(sessionId: string): string | null {
  if (!sessionId || typeof sessionId !== 'string') {
    return null;
  }
  
  const trimmed = sessionId.trim();
  if (!trimmed) {
    return null;
  }
  
  // If it looks like a friendly name, keep it lowercase and validate
  if (trimmed.includes('-')) {
    const normalized = trimmed.toLowerCase();
    return isValidSessionId(normalized) ? normalized : null;
  }
  
  // If it looks like an encoded code, uppercase and validate  
  const normalized = trimmed.toUpperCase();
  return isValidSessionId(normalized) ? normalized : null;
}

/**
 * Checks if the current environment supports session features
 */
export function isSessionEnvironmentSupported(): boolean {
  // Allow WebSocket support in any environment
  if (typeof WebSocket === 'undefined') {
    return false;
  }
  
  // Allow any localhost development (Wrangler can use different ports)
  const isLocalDevelopment = window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1';
  
  // Allow HTTPS production or any local development
  return window.location.protocol === 'https:' || isLocalDevelopment;
}

/**
 * Creates a shareable session URL
 */
export function createSessionUrl(sessionId: string): string {
  const baseUrl = `${window.location.protocol}//${window.location.host}`;
  return `${baseUrl}/room/${sessionId}`;
}

/**
 * Copies text to clipboard with fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Debounce function to limit API calls
 */
export function debounce<T extends (...args: never[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Creates a delay promise for testing and reconnection logic
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * localStorage utility functions for session persistence
 */
const STORAGE_KEYS = {
  PLAYER_NAME: 'daggerdice_player_name',
  LAST_SESSION_ID: 'daggerdice_last_session_id',
  ROLL_HISTORY: 'daggerdice_roll_history'
} as const;

/**
 * Saves player name to localStorage
 */
export function savePlayerName(name: string): void {
  try {
    if (name && name.trim()) {
      localStorage.setItem(STORAGE_KEYS.PLAYER_NAME, name.trim());
    }
  } catch (error) {
    console.warn('Failed to save player name to localStorage:', error);
  }
}

/**
 * Retrieves saved player name from localStorage
 */
export function getSavedPlayerName(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.PLAYER_NAME) || '';
  } catch (error) {
    console.warn('Failed to retrieve player name from localStorage:', error);
    return '';
  }
}

/**
 * Saves last session ID to localStorage
 */
export function saveLastSessionId(sessionId: string): void {
  try {
    if (sessionId && isValidSessionId(sessionId)) {
      localStorage.setItem(STORAGE_KEYS.LAST_SESSION_ID, sessionId);
    }
  } catch (error) {
    console.warn('Failed to save session ID to localStorage:', error);
  }
}

/**
 * Retrieves last session ID from localStorage
 */
export function getLastSessionId(): string {
  try {
    const sessionId = localStorage.getItem(STORAGE_KEYS.LAST_SESSION_ID) || '';
    return isValidSessionId(sessionId) ? sessionId : '';
  } catch (error) {
    console.warn('Failed to retrieve session ID from localStorage:', error);
    return '';
  }
}

/**
 * Clears last session ID from localStorage
 */
export function clearLastSessionId(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.LAST_SESSION_ID);
  } catch (error) {
    console.warn('Failed to clear session ID from localStorage:', error);
  }
}

/**
 * Saves roll history to localStorage (for solo play)
 */
export function saveRollHistory(rollHistory: SharedRollHistoryItem[]): void {
  try {
    // Only save the last 10 rolls to avoid bloating localStorage
    const historyToSave = rollHistory.slice(0, 10);
    localStorage.setItem(STORAGE_KEYS.ROLL_HISTORY, JSON.stringify(historyToSave));
  } catch (error) {
    console.warn('Failed to save roll history to localStorage:', error);
  }
}

/**
 * Retrieves saved roll history from localStorage (for solo play)
 */
export function getSavedRollHistory(): SharedRollHistoryItem[] {
  try {
    const savedHistory = localStorage.getItem(STORAGE_KEYS.ROLL_HISTORY);
    if (savedHistory) {
      const parsed = JSON.parse(savedHistory);
      // Validate that it's an array
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch (error) {
    console.warn('Failed to retrieve roll history from localStorage:', error);
    return [];
  }
}

/**
 * Clears saved roll history from localStorage
 */
export function clearSavedRollHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.ROLL_HISTORY);
  } catch (error) {
    console.warn('Failed to clear roll history from localStorage:', error);
  }
}

/**
 * Clears all saved session data from localStorage
 */
export function clearSavedSessionData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.PLAYER_NAME);
    localStorage.removeItem(STORAGE_KEYS.LAST_SESSION_ID);
    localStorage.removeItem(STORAGE_KEYS.ROLL_HISTORY);
  } catch (error) {
    console.warn('Failed to clear session data from localStorage:', error);
  }
}