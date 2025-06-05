// Session utility functions for DaggerDice multiplayer

/**
 * Generates a cryptographically random session ID
 * Uses 128-bit entropy for security
 */
export function generateSessionId(): string {
  // Use crypto.getRandomValues for cryptographically secure randomness
  const array = new Uint8Array(16); // 128 bits
  crypto.getRandomValues(array);
  
  // Convert to base36 for URL-friendly format
  return Array.from(array)
    .map(byte => byte.toString(36))
    .join('')
    .substring(0, 12); // Trim to reasonable length
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
  
  // Session IDs should be 8-12 characters, alphanumeric only
  return /^[a-z0-9]{8,12}$/i.test(sessionId);
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
 * Extracts session ID from current URL path
 */
export function getSessionIdFromUrl(): string | null {
  const match = window.location.pathname.match(/^\/session\/(.+)$/);
  return match ? match[1] : null;
}

/**
 * Checks if the current environment supports session features
 */
export function isSessionEnvironmentSupported(): boolean {
  return typeof WebSocket !== 'undefined' && 
         window.location.protocol === 'https:' &&
         window.location.hostname !== 'localhost';
}

/**
 * Creates a shareable session URL
 */
export function createSessionUrl(sessionId: string): string {
  const baseUrl = `${window.location.protocol}//${window.location.host}`;
  return `${baseUrl}/session/${sessionId}`;
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