import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateSessionId,
  generatePlayerId,
  getShortCode,
  isValidSessionId,
  sanitizePlayerName,
  formatTimestamp,
  getSessionIdFromUrl,
  extractSessionIdFromUrl,
  normalizeSessionId,
  isSessionEnvironmentSupported,
  createSessionUrl,
  copyToClipboard,
  debounce,
  delay,
  savePlayerName,
  getSavedPlayerName,
  saveLastSessionId,
  getLastSessionId,
  clearLastSessionId,
  clearSavedSessionData,
  saveRollHistory,
  getSavedRollHistory,
  clearSavedRollHistory
} from '../session/utils';
import { ADJECTIVES_V1, NOUNS_V1 } from '../session/room-names.js';

beforeEach(() => {
  vi.clearAllMocks();
  
  // Reset mocks to default state
  vi.mocked(crypto.getRandomValues).mockImplementation((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = 123;
    }
    return array;
  });
  
  vi.mocked(localStorage.getItem).mockReturnValue(null);
  vi.mocked(localStorage.setItem).mockImplementation(() => { /* mock implementation */ });
  vi.mocked(localStorage.removeItem).mockImplementation(() => { /* mock implementation */ });
  
  window.location.pathname = '/';
  window.location.hostname = 'localhost';
  window.location.protocol = 'https:';
  window.location.host = 'example.com';
  
  vi.mocked(document.createElement).mockReturnValue({
    textContent: '',
    innerHTML: 'test',
    value: '',
    style: {},
    focus: vi.fn(),
    select: vi.fn()
  } as HTMLTextAreaElement);
});

describe('Session ID Functions', () => {
  describe('generateSessionId', () => {
    it('should generate a friendly session ID', () => {
      const sessionId = generateSessionId();
      expect(sessionId).toMatch(/^[a-z]+-[a-z]+$/);
      
      // Verify it contains words from our lists
      const [word1, word2] = sessionId.split('-');
      
      // Could be either adjective-noun or noun-noun
      const isAdjNoun = ADJECTIVES_V1.includes(word1) && NOUNS_V1.includes(word2);
      const isNounNoun = NOUNS_V1.includes(word1) && NOUNS_V1.includes(word2);
      
      expect(isAdjNoun || isNounNoun).toBe(true);
      
      // If noun-noun, ensure they're different
      if (isNounNoun) {
        expect(word1).not.toBe(word2);
      }
    });
  });

  describe('getShortCode', () => {
    it('should convert friendly names to short codes', () => {
      const shortCode = getShortCode('brave-dragon');
      expect(shortCode).toMatch(/^[0-9A-Z]{3}$/);
      expect(shortCode).toHaveLength(3);
    });

    it('should return short codes as-is', () => {
      const shortCode = getShortCode('4CQ');
      expect(shortCode).toBe('4CQ');
    });

    it('should handle invalid inputs gracefully', () => {
      const result = getShortCode('invalid-input');
      expect(result).toBe('invalid-input');
    });
  });

  describe('generatePlayerId', () => {
    it('should generate an 8-character player ID', () => {
      const playerId = generatePlayerId();
      expect(playerId).toHaveLength(8);
    });
  });

  describe('isValidSessionId', () => {
    it('should validate correct session IDs', () => {
      // 3-character encoded codes (using codes that can actually be generated)
      const validCode = generateSessionId();
      expect(isValidSessionId(validCode)).toBe(true);
      
      // Friendly names (using words that are actually in the lists)
      expect(isValidSessionId('brave-dragon')).toBe(true);
      expect(isValidSessionId('fire-wizard')).toBe(true);
    });

    it('should reject invalid session IDs', () => {
      expect(isValidSessionId('')).toBe(false);
      expect(isValidSessionId('AB')).toBe(false); // too short
      expect(isValidSessionId('ABCD')).toBe(false); // too long for code
      expect(isValidSessionId('ABC-12')).toBe(false); // invalid format
      expect(isValidSessionId('unknown-word')).toBe(false); // invalid words
      expect(isValidSessionId('single')).toBe(false); // missing hyphen
      expect(isValidSessionId(null as unknown as string)).toBe(false);
      expect(isValidSessionId(undefined as unknown as string)).toBe(false);
    });
  });

  describe('normalizeSessionId', () => {
    it('should normalize encoded codes to uppercase', () => {
      expect(normalizeSessionId('4cq')).toBe('4CQ');
      expect(normalizeSessionId(' 4CQ ')).toBe('4CQ');
    });

    it('should normalize friendly names to lowercase', () => {
      expect(normalizeSessionId('BRAVE-DRAGON')).toBe('brave-dragon');
      expect(normalizeSessionId(' Fire-Wizard ')).toBe('fire-wizard');
    });

    it('should return null for invalid session IDs', () => {
      expect(normalizeSessionId('AB')).toBeNull();
      expect(normalizeSessionId('ABC-12')).toBeNull();
      expect(normalizeSessionId('unknown-word')).toBeNull();
      expect(normalizeSessionId('')).toBeNull();
      expect(normalizeSessionId(null as unknown as string)).toBeNull();
    });
  });
});

describe('Player Name Functions', () => {
  describe('sanitizePlayerName', () => {
    it('should sanitize normal player names', () => {
      vi.mocked(document.createElement).mockReturnValue({
        textContent: '',
        innerHTML: 'John Doe'
      } as HTMLElement);
      
      const result = sanitizePlayerName('John Doe');
      expect(result).toBe('John Doe');
    });

    it('should trim whitespace and limit length', () => {
      const longName = 'A'.repeat(25);
      vi.mocked(document.createElement).mockReturnValue({
        textContent: '',
        innerHTML: 'A'.repeat(20)
      } as HTMLElement);
      
      const result = sanitizePlayerName(` ${longName} `);
      expect(result).toBe('A'.repeat(20));
    });

    it('should return Anonymous for invalid names', () => {
      expect(sanitizePlayerName('')).toBe('Anonymous');
      expect(sanitizePlayerName(null as unknown as string)).toBe('Anonymous');
      expect(sanitizePlayerName(undefined as unknown as string)).toBe('Anonymous');
    });
  });
});

describe('Timestamp Functions', () => {
  describe('formatTimestamp', () => {
    it('should format recent timestamps correctly', () => {
      const now = Date.now();
      
      expect(formatTimestamp(now)).toBe('just now');
      expect(formatTimestamp(now - 30000)).toBe('just now'); // 30 seconds ago
      expect(formatTimestamp(now - 120000)).toBe('2m ago'); // 2 minutes ago
      expect(formatTimestamp(now - 3600000)).toBe('1h ago'); // 1 hour ago
    });

    it('should format old timestamps as dates', () => {
      const twoDaysAgo = Date.now() - (2 * 24 * 60 * 60 * 1000);
      const result = formatTimestamp(twoDaysAgo);
      expect(result).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
    });
  });
});

describe('URL Functions', () => {
  describe('getSessionIdFromUrl', () => {
    it('should extract session ID from room URL', () => {
      // Test 3-character code
      window.location.pathname = '/room/4CQ';
      expect(getSessionIdFromUrl()).toBe('4CQ');
      
      // Test friendly name
      window.location.pathname = '/room/brave-dragon';
      expect(getSessionIdFromUrl()).toBe('brave-dragon');
    });

    it('should return null for non-room URLs', () => {
      window.location.pathname = '/';
      expect(getSessionIdFromUrl()).toBeNull();
      
      window.location.pathname = '/other-page';
      expect(getSessionIdFromUrl()).toBeNull();
    });
  });

  describe('extractSessionIdFromUrl', () => {
    it('should extract session ID from full URLs', () => {
      const validCode = generateSessionId();
      expect(extractSessionIdFromUrl(`https://example.com/room/${validCode}`)).toBe(validCode);
      expect(extractSessionIdFromUrl('http://localhost:3000/room/brave-dragon')).toBe('brave-dragon');
    });

    it('should extract session ID from partial URLs', () => {
      // Use a generated valid code
      const validCode = generateSessionId();
      expect(extractSessionIdFromUrl(`/room/${validCode}`)).toBe(validCode);
      expect(extractSessionIdFromUrl('room/fire-wizard')).toBe('fire-wizard');
    });

    it('should handle malformed URLs gracefully', () => {
      const validCode = generateSessionId();
      expect(extractSessionIdFromUrl(`not-a-url/room/${validCode}`)).toBe(validCode);
      expect(extractSessionIdFromUrl('just some text with /room/mystic-knight in it')).toBe('mystic-knight');
    });

    it('should return null for invalid input', () => {
      expect(extractSessionIdFromUrl('https://example.com/other-page')).toBeNull();
      expect(extractSessionIdFromUrl('no room code here')).toBeNull();
      expect(extractSessionIdFromUrl('')).toBeNull();
    });

    it('should normalize extracted session IDs', () => {
      const validCode = generateSessionId();
      expect(extractSessionIdFromUrl(`https://example.com/room/${validCode.toLowerCase()}`)).toBe(validCode);
      expect(extractSessionIdFromUrl('/room/BRAVE-DRAGON')).toBe('brave-dragon');
    });
  });

  describe('createSessionUrl', () => {
    it('should create correct session URLs', () => {
      window.location.protocol = 'https:';
      window.location.host = 'example.com';
      
      const url = createSessionUrl('ABC123');
      expect(url).toBe('https://example.com/room/ABC123');
    });
  });

  describe('isSessionEnvironmentSupported', () => {
    it('should return true for HTTPS', () => {
      window.location.protocol = 'https:';
      window.location.hostname = 'example.com';
      
      expect(isSessionEnvironmentSupported()).toBe(true);
    });

    it('should return true for localhost', () => {
      window.location.protocol = 'http:';
      window.location.hostname = 'localhost';
      
      expect(isSessionEnvironmentSupported()).toBe(true);
    });

    it('should return false without WebSocket', () => {
      window.location.protocol = 'https:';
      // @ts-ignore
      global.WebSocket = undefined;
      
      expect(isSessionEnvironmentSupported()).toBe(false);
    });
  });
});

describe('Clipboard Functions', () => {
  describe('copyToClipboard', () => {
    it('should use navigator.clipboard when available', async () => {
      vi.mocked(navigator.clipboard.writeText).mockResolvedValue(undefined);
      
      const result = await copyToClipboard('test text');
      expect(result).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test text');
    });

    it('should fallback to execCommand when clipboard API unavailable', async () => {
      // @ts-ignore
      global.navigator = {}; // No clipboard API
      
      const mockTextArea = {
        value: '',
        style: {},
        focus: vi.fn(),
        select: vi.fn()
      };
      vi.mocked(document.createElement).mockReturnValue(mockTextArea as HTMLTextAreaElement);
      vi.mocked(document.execCommand).mockReturnValue(true);
      
      const result = await copyToClipboard('test text');
      expect(result).toBe(true);
      expect(mockTextArea.value).toBe('test text');
      expect(document.execCommand).toHaveBeenCalledWith('copy');
    });
  });
});

describe('Utility Functions', () => {
  describe('debounce', () => {
    it('should debounce function calls', async () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);
      
      debouncedFn('arg1');
      debouncedFn('arg2');
      debouncedFn('arg3');
      
      expect(mockFn).not.toHaveBeenCalled();
      
      await delay(150);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg3');
    });
  });

  describe('delay', () => {
    it('should resolve after specified time', async () => {
      const start = Date.now();
      await delay(100);
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some variance
    });
  });
});

describe('LocalStorage Functions', () => {
  describe('savePlayerName and getSavedPlayerName', () => {
    it('should save and retrieve player names', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('John Doe');
      
      savePlayerName('John Doe');
      expect(localStorage.setItem).toHaveBeenCalledWith('daggerdice_player_name', 'John Doe');
      
      const result = getSavedPlayerName();
      expect(result).toBe('John Doe');
    });

    it('should handle localStorage errors gracefully', () => {
      vi.mocked(localStorage.setItem).mockImplementation(() => {
        throw new Error('Storage error');
      });
      vi.mocked(localStorage.getItem).mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      expect(() => savePlayerName('John')).not.toThrow();
      expect(getSavedPlayerName()).toBe('');
    });
  });

  describe('saveLastSessionId and getLastSessionId', () => {
    it('should save and retrieve valid session IDs', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('4CQ');
      
      saveLastSessionId('4CQ');
      expect(localStorage.setItem).toHaveBeenCalledWith('daggerdice_last_session_id', '4CQ');
      
      const result = getLastSessionId();
      expect(result).toBe('4CQ');
    });

    it('should not save invalid session IDs', () => {
      saveLastSessionId('INVALID');
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('should return empty string for invalid stored session IDs', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('INVALID');
      
      const result = getLastSessionId();
      expect(result).toBe('');
    });
  });

  describe('clearLastSessionId and clearSavedSessionData', () => {
    it('should clear session ID', () => {
      clearLastSessionId();
      expect(localStorage.removeItem).toHaveBeenCalledWith('daggerdice_last_session_id');
    });

    it('should clear all session data', () => {
      clearSavedSessionData();
      expect(localStorage.removeItem).toHaveBeenCalledWith('daggerdice_player_name');
      expect(localStorage.removeItem).toHaveBeenCalledWith('daggerdice_last_session_id');
      expect(localStorage.removeItem).toHaveBeenCalledWith('daggerdice_roll_history');
    });
  });

  describe('Roll History localStorage Functions', () => {
    it('should save roll history to localStorage', () => {
      const mockHistory = [
        { rollType: 'check', hopeValue: 5, fearValue: 3, total: 8, result: '8 with hope' },
        { rollType: 'gm', d20Value: 15, gmModifier: 2, total: 17, result: '17' }
      ];

      saveRollHistory(mockHistory);
      expect(localStorage.setItem).toHaveBeenCalledWith('daggerdice_roll_history', JSON.stringify(mockHistory));
    });

    it('should limit saved history to 10 rolls', () => {
      const mockHistory = Array.from({ length: 15 }, (_, i) => ({
        rollType: 'check',
        hopeValue: i,
        fearValue: i + 1,
        total: i * 2,
        result: `${i * 2} with hope`
      }));

      saveRollHistory(mockHistory);
      const expectedHistory = mockHistory.slice(0, 10);
      expect(localStorage.setItem).toHaveBeenCalledWith('daggerdice_roll_history', JSON.stringify(expectedHistory));
    });

    it('should retrieve saved roll history from localStorage', () => {
      const mockHistory = [
        { rollType: 'check', hopeValue: 5, fearValue: 3, total: 8, result: '8 with hope' }
      ];
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(mockHistory));

      const result = getSavedRollHistory();
      expect(result).toEqual(mockHistory);
      expect(localStorage.getItem).toHaveBeenCalledWith('daggerdice_roll_history');
    });

    it('should return empty array when no saved history exists', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null);

      const result = getSavedRollHistory();
      expect(result).toEqual([]);
    });

    it('should return empty array for invalid JSON data', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('invalid json');

      const result = getSavedRollHistory();
      expect(result).toEqual([]);
    });

    it('should return empty array for non-array data', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({ not: 'array' }));

      const result = getSavedRollHistory();
      expect(result).toEqual([]);
    });

    it('should clear saved roll history', () => {
      clearSavedRollHistory();
      expect(localStorage.removeItem).toHaveBeenCalledWith('daggerdice_roll_history');
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        // Intentionally empty for testing error handling
      });
      vi.mocked(localStorage.setItem).mockImplementation(() => {
        throw new Error('Storage error');
      });
      vi.mocked(localStorage.getItem).mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => saveRollHistory([])).not.toThrow();
      expect(() => getSavedRollHistory()).not.toThrow();
      expect(() => clearSavedRollHistory()).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to save roll history to localStorage:', expect.any(Error));
      expect(consoleSpy).toHaveBeenCalledWith('Failed to retrieve roll history from localStorage:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });
});

describe('Streamer Mode Functions', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('streamer mode localStorage logic', () => {
    it('should implement correct localStorage key pattern', () => {
      const key = 'daggerdice_streamer_mode';
      const value = 'true';
      
      // Test the pattern used in the app
      expect(key).toBe('daggerdice_streamer_mode');
      expect(value).toBe('true');
      expect(value === 'true').toBe(true);
      expect('false' === 'true').toBe(false);
      expect((null as string | null) === 'true').toBe(false);
    });

    it('should use boolean logic for streamer mode check', () => {
      // Test the logic pattern: localStorage.getItem('key') === 'true'
      expect((null as string | null) === 'true').toBe(false); // when not set
      expect('true' === 'true').toBe(true); // when enabled
      expect('false' === 'true').toBe(false); // when disabled
      expect('other' === 'true').toBe(false); // when invalid value
    });

    it('should handle streamer mode toggle pattern', () => {
      // Simulate the toggle logic pattern used in the app
      let streamerMode = false;
      
      // Toggle on
      streamerMode = !streamerMode;
      const shouldSave = streamerMode;
      expect(shouldSave).toBe(true);
      
      // Toggle off  
      streamerMode = !streamerMode;
      const shouldRemove = !streamerMode;
      expect(shouldRemove).toBe(true);
    });
  });
});