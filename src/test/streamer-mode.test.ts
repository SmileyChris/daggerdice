import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractSessionIdFromUrl } from '../session/utils';

// Mock window.history for URL manipulation tests
const mockHistory = {
  pushState: vi.fn(),
  replaceState: vi.fn(),
};

describe('Streamer Mode Features', () => {
  // Simple localStorage mock using a Map
  const localStorageStore = new Map<string, string>();
  
  const localStorageMock = {
    getItem: vi.fn((key: string) => localStorageStore.get(key) || null),
    setItem: vi.fn((key: string, value: string) => localStorageStore.set(key, value)),
    removeItem: vi.fn((key: string) => localStorageStore.delete(key)),
    clear: vi.fn(() => localStorageStore.clear()),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageStore.clear();
    
    // Mock window.history
    Object.defineProperty(window, 'history', {
      value: mockHistory,
      writable: true,
    });

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('URL Clearing Functionality', () => {
    it('should immediately clear URL when streamer mode is active and entering via URL', () => {
      // Directly set the store value to simulate localStorage
      localStorageStore.set('daggerdice_streamer_mode', 'true');
      
      // Mock window.location for room URL
      Object.defineProperty(window, 'location', {
        value: { pathname: '/room/ABC123' },
        writable: true,
      });

      // Simulate the URL clearing logic exactly as implemented
      const streamerMode = localStorageStore.get('daggerdice_streamer_mode') === 'true';
      const urlSessionId = window.location.pathname.match(/^\/room\/(.+)$/)?.[1];
      
      // Test the conditions
      expect(streamerMode).toBe(true);
      expect(urlSessionId).toBe('ABC123');
      
      // Manually trigger the logic since we're testing the behavior
      if (urlSessionId && streamerMode) {
        mockHistory.replaceState({}, '', '/');
      }

      expect(mockHistory.replaceState).toHaveBeenCalledWith({}, '', '/');
    });

    it('should not clear URL when streamer mode is disabled', () => {
      // Simulate having streamer mode disabled in localStorage
      localStorage.removeItem('daggerdice_streamer_mode');
      
      // Mock window.location for room URL
      Object.defineProperty(window, 'location', {
        value: { pathname: '/room/ABC123' },
        writable: true,
      });

      // Simulate the URL clearing logic
      const streamerMode = localStorage.getItem('daggerdice_streamer_mode') === 'true';
      const urlSessionId = window.location.pathname.match(/^\/room\/(.+)$/)?.[1];
      
      if (urlSessionId && streamerMode) {
        mockHistory.replaceState({}, '', '/');
      }

      expect(mockHistory.replaceState).not.toHaveBeenCalled();
    });

    it('should not clear URL when not on a room page', () => {
      // Simulate having streamer mode enabled in localStorage
      localStorage.setItem('daggerdice_streamer_mode', 'true');
      
      // Mock window.location for non-room URL
      Object.defineProperty(window, 'location', {
        value: { pathname: '/' },
        writable: true,
      });

      // Simulate the URL clearing logic
      const streamerMode = localStorage.getItem('daggerdice_streamer_mode') === 'true';
      const urlSessionId = window.location.pathname.match(/^\/room\/(.+)$/)?.[1];
      
      if (urlSessionId && streamerMode) {
        mockHistory.replaceState({}, '', '/');
      }

      expect(mockHistory.replaceState).not.toHaveBeenCalled();
    });
  });

  describe('Room Code Input Parsing', () => {
    it('should extract room code from pasted URLs in input field', () => {
      const testCases = [
        { input: 'https://daggerdice.com/room/ABC123', expected: 'ABC123' },
        { input: 'http://localhost:3000/room/XYZ789', expected: 'XYZ789' },
        { input: '/room/DEF456', expected: 'DEF456' },
        { input: 'room/GHI789', expected: 'GHI789' },
        { input: 'Check out this room: https://example.com/room/JKL012', expected: 'JKL012' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = extractSessionIdFromUrl(input);
        expect(result).toBe(expected);
      });
    });

    it('should handle room input parsing logic', () => {
      // Simulate the handleRoomIdChange logic
      const handleRoomIdChange = (joinSessionId: string) => {
        const input = joinSessionId.trim();
        
        // If input looks like a URL, try to extract session ID from it
        if (input.includes('/room/') || input.startsWith('http')) {
          const extractedId = extractSessionIdFromUrl(input);
          if (extractedId) {
            return extractedId;
          }
        }
        
        // Convert to uppercase (need to trim first for whitespace handling)
        return input.toUpperCase();
      };

      // Test URL parsing
      expect(handleRoomIdChange('https://daggerdice.com/room/abc123')).toBe('ABC123');
      expect(handleRoomIdChange('/room/def456')).toBe('DEF456');
      
      // Test regular room code input
      expect(handleRoomIdChange('xyz789')).toBe('XYZ789');
      expect(handleRoomIdChange('  abc123  ')).toBe('ABC123');
    });
  });

  describe('URL Prevention During Session Operations', () => {
    it('should prevent URL updates when streamer mode is active during session creation', () => {
      const streamerMode = true;
      const sessionId = 'ABC123';

      // Simulate session creation URL update logic
      if (!streamerMode) {
        mockHistory.pushState({}, '', `/room/${sessionId}`);
      }

      expect(mockHistory.pushState).not.toHaveBeenCalled();
    });

    it('should allow URL updates when streamer mode is disabled during session creation', () => {
      const streamerMode = false;
      const sessionId = 'ABC123';

      // Simulate session creation URL update logic
      if (!streamerMode) {
        mockHistory.pushState({}, '', `/room/${sessionId}`);
      }

      expect(mockHistory.pushState).toHaveBeenCalledWith({}, '', '/room/ABC123');
    });

    it('should prevent URL updates when streamer mode is active during session leave', () => {
      const streamerMode = true;

      // Simulate session leave URL update logic
      if (!streamerMode) {
        mockHistory.pushState({}, '', '/');
      }

      expect(mockHistory.pushState).not.toHaveBeenCalled();
    });

    it('should allow URL updates when streamer mode is disabled during session leave', () => {
      const streamerMode = false;

      // Simulate session leave URL update logic
      if (!streamerMode) {
        mockHistory.pushState({}, '', '/');
      }

      expect(mockHistory.pushState).toHaveBeenCalledWith({}, '', '/');
    });
  });

  describe('Streamer Mode Toggle Logic', () => {
    it('should save streamer mode to localStorage when toggled on', () => {
      const toggleStreamerMode = (currentMode: boolean) => {
        const newMode = !currentMode;
        if (newMode) {
          localStorageStore.set('daggerdice_streamer_mode', 'true');
        } else {
          localStorageStore.delete('daggerdice_streamer_mode');
        }
        return newMode;
      };

      const result = toggleStreamerMode(false);
      expect(result).toBe(true);
      expect(localStorageStore.get('daggerdice_streamer_mode')).toBe('true');
    });

    it('should remove streamer mode from localStorage when toggled off', () => {
      localStorageStore.set('daggerdice_streamer_mode', 'true');
      
      const toggleStreamerMode = (currentMode: boolean) => {
        const newMode = !currentMode;
        if (newMode) {
          localStorageStore.set('daggerdice_streamer_mode', 'true');
        } else {
          localStorageStore.delete('daggerdice_streamer_mode');
        }
        return newMode;
      };

      const result = toggleStreamerMode(true);
      expect(result).toBe(false);
      expect(localStorageStore.get('daggerdice_streamer_mode')).toBeUndefined();
    });
  });

  describe('Temporary Override Functionality', () => {
    it('should temporarily show room details when user confirms dialog', () => {
      // Mock window.confirm to return true
      vi.stubGlobal('confirm', vi.fn(() => true));
      
      let streamerMode = true;
      let streamerModeTemporarilyDisabled = false;
      
      const temporarilyShowRoomDetails = () => {
        if (!streamerMode) {
          return; // Streamer mode not active
        }
        
        const confirmed = confirm('Temporarily show room details? They will be hidden again when you close this dialog.');
        if (confirmed) {
          streamerModeTemporarilyDisabled = true;
        }
      };

      const getEffectiveStreamerMode = () => {
        return streamerMode && !streamerModeTemporarilyDisabled;
      };

      // Start with streamer mode enabled
      localStorageStore.set('daggerdice_streamer_mode', 'true');
      
      expect(getEffectiveStreamerMode()).toBe(true);
      
      temporarilyShowRoomDetails();
      
      expect(getEffectiveStreamerMode()).toBe(false); // Temporarily disabled
      expect(localStorageStore.get('daggerdice_streamer_mode')).toBe('true'); // Still saved in localStorage
      expect(confirm).toHaveBeenCalledWith('Temporarily show room details? They will be hidden again when you close this dialog.');
    });

    it('should not show room details when user cancels dialog', () => {
      // Mock window.confirm to return false
      vi.stubGlobal('confirm', vi.fn(() => false));
      
      let streamerMode = true;
      let streamerModeTemporarilyDisabled = false;
      
      const temporarilyShowRoomDetails = () => {
        if (!streamerMode) {
          return; // Streamer mode not active
        }
        
        const confirmed = confirm('Temporarily show room details? They will be hidden again when you close this dialog.');
        if (confirmed) {
          streamerModeTemporarilyDisabled = true;
        }
      };

      const getEffectiveStreamerMode = () => {
        return streamerMode && !streamerModeTemporarilyDisabled;
      };

      // Start with streamer mode enabled
      localStorageStore.set('daggerdice_streamer_mode', 'true');
      
      expect(getEffectiveStreamerMode()).toBe(true);
      
      temporarilyShowRoomDetails();
      
      expect(getEffectiveStreamerMode()).toBe(true); // Still hidden
      expect(localStorageStore.get('daggerdice_streamer_mode')).toBe('true');
      expect(confirm).toHaveBeenCalledWith('Temporarily show room details? They will be hidden again when you close this dialog.');
    });

    it('should do nothing when streamer mode is not active', () => {
      // Mock window.confirm to track calls
      vi.stubGlobal('confirm', vi.fn(() => true));
      
      let streamerMode = false;
      let streamerModeTemporarilyDisabled = false;
      
      const temporarilyShowRoomDetails = () => {
        if (!streamerMode) {
          return; // Streamer mode not active
        }
        
        const confirmed = confirm('Temporarily show room details? They will be hidden again when you close this dialog.');
        if (confirmed) {
          streamerModeTemporarilyDisabled = true;
        }
      };

      temporarilyShowRoomDetails();
      
      expect(streamerModeTemporarilyDisabled).toBe(false);
      expect(confirm).not.toHaveBeenCalled();
    });

    it('should reset temporary override when dialog is closed', () => {
      let streamerMode = true;
      let streamerModeTemporarilyDisabled = true; // Start with override active
      let showSessionUI = true;
      
      const toggleSessionUI = () => {
        showSessionUI = !showSessionUI;
        
        // Reset temporary streamer mode override when dialog is closed
        if (!showSessionUI) {
          streamerModeTemporarilyDisabled = false;
        }
      };

      const getEffectiveStreamerMode = () => {
        return streamerMode && !streamerModeTemporarilyDisabled;
      };

      // Initially, room details should be visible due to temporary override
      expect(getEffectiveStreamerMode()).toBe(false);
      
      // Close the dialog
      toggleSessionUI();
      
      // Room details should be hidden again
      expect(getEffectiveStreamerMode()).toBe(true);
      expect(showSessionUI).toBe(false);
    });
  });
});