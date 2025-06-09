// Session utility functions for DaggerDice multiplayer

/**
 * Generates a simple 6-character session ID
 * Case-insensitive, uses numbers and letters for easy sharing
 */
export function generateSessionId(): string {
  // Use crypto.getRandomValues for randomness
  const array = new Uint8Array(3); // 24 bits
  crypto.getRandomValues(array);
  
  // Convert to base36 (0-9, a-z) and ensure 6 characters
  let sessionId = '';
  for (let i = 0; i < array.length; i++) {
    sessionId += array[i].toString(36).padStart(2, '0');
  }
  
  return sessionId.substring(0, 6).toUpperCase();
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
 * Validates a session ID format
 */
export function isValidSessionId(sessionId: string): boolean {
  if (!sessionId || typeof sessionId !== 'string') {
    return false;
  }
  
  // Session IDs should be exactly 6 characters, alphanumeric only
  return /^[a-z0-9]{6}$/i.test(sessionId);
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
 * Normalizes a session ID to uppercase and validates length
 */
export function normalizeSessionId(sessionId: string): string | null {
  if (!sessionId || typeof sessionId !== 'string') {
    return null;
  }
  
  const normalized = sessionId.trim().toUpperCase();
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
export function debounce<T extends (...args: any[]) => any>(
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
  LAST_SESSION_ID: 'daggerdice_last_session_id'
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
 * Clears all saved session data from localStorage
 */
export function clearSavedSessionData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.PLAYER_NAME);
    localStorage.removeItem(STORAGE_KEYS.LAST_SESSION_ID);
  } catch (error) {
    console.warn('Failed to clear session data from localStorage:', error);
  }
}