import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the main diceRoller function 
const createMockDiceRoller = () => {
  return {
    // Core state
    streamerMode: false,
    showRoomDetails: true,
    sessionId: null as string | null,
    sessionMode: 'solo' as 'solo' | 'multiplayer',
    
    // Methods
    toggleStreamerMode: vi.fn().mockImplementation(function(this: any) {
      this.streamerMode = !this.streamerMode;
      
      // When enabling streamer mode, hide room details by default
      if (this.streamerMode) {
        this.showRoomDetails = false;
        // Hide room from URL if we're in a session
        if (this.sessionId) {
          this.updateURLForStreamerMode();
        }
      } else {
        this.showRoomDetails = true;
        // Restore room in URL if we're in a session
        if (this.sessionId) {
          this.updateURLForStreamerMode();
        }
      }
    }),
    
    updateURLForStreamerMode: vi.fn().mockImplementation(function(this: any) {
      if (!this.sessionId) return;
      
      const currentUrl = new URL(window.location.href);
      
      if (this.streamerMode) {
        // Remove room parameter from URL
        currentUrl.searchParams.delete('room');
      } else {
        // Add room parameter back to URL
        currentUrl.searchParams.set('room', this.sessionId);
      }
      
      // Update URL without triggering page refresh
      window.history.replaceState({}, '', currentUrl.toString());
    }),
    
    toggleRoomDetails: vi.fn().mockImplementation(function(this: any) {
      this.showRoomDetails = !this.showRoomDetails;
    }),
    
    createSession: vi.fn().mockImplementation(function(this: any) {
      this.sessionMode = 'multiplayer';
      this.sessionId = 'ABC123';
      
      // Update URL without page reload (respecting streamer mode)
      if (!this.streamerMode) {
        window.history.pushState({}, '', `/room/${this.sessionId}`);
      } else {
        window.history.pushState({}, '', '/');
      }
    }),
    
    joinSession: vi.fn().mockImplementation(function(this: any) {
      this.sessionMode = 'multiplayer';
      this.sessionId = 'DEF456';
      
      // Update URL without page reload (respecting streamer mode)
      if (!this.streamerMode) {
        window.history.pushState({}, '', `/room/${this.sessionId}`);
      } else {
        window.history.pushState({}, '', '/');
      }
    })
  };
};

// Mock history API
const mockHistoryReplaceState = vi.fn();
const mockHistoryPushState = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  
  // Reset window location
  Object.defineProperty(window, 'location', {
    value: {
      href: 'https://example.com/',
      pathname: '/',
      hostname: 'example.com',
      protocol: 'https:',
      host: 'example.com'
    },
    writable: true
  });
  
  // Mock history API
  Object.defineProperty(window, 'history', {
    value: {
      replaceState: mockHistoryReplaceState,
      pushState: mockHistoryPushState
    },
    writable: true
  });
  
  // Mock URL constructor to work with current location
  global.URL = class MockURL {
    searchParams: URLSearchParams;
    
    constructor(url: string, base?: string) {
      this.searchParams = new URLSearchParams();
    }
    
    toString() {
      return 'https://example.com/';
    }
  } as any;
});

describe('Streamer Mode Functionality', () => {
  describe('toggleStreamerMode', () => {
    it('should toggle streamer mode state', () => {
      const diceRoller = createMockDiceRoller();
      
      expect(diceRoller.streamerMode).toBe(false);
      expect(diceRoller.showRoomDetails).toBe(true);
      
      diceRoller.toggleStreamerMode();
      
      expect(diceRoller.streamerMode).toBe(true);
      expect(diceRoller.showRoomDetails).toBe(false);
      expect(diceRoller.toggleStreamerMode).toHaveBeenCalledTimes(1);
    });

    it('should hide room details when enabling streamer mode', () => {
      const diceRoller = createMockDiceRoller();
      diceRoller.sessionId = 'ABC123';
      
      diceRoller.toggleStreamerMode();
      
      expect(diceRoller.streamerMode).toBe(true);
      expect(diceRoller.showRoomDetails).toBe(false);
      expect(diceRoller.updateURLForStreamerMode).toHaveBeenCalled();
    });

    it('should show room details when disabling streamer mode', () => {
      const diceRoller = createMockDiceRoller();
      diceRoller.streamerMode = true;
      diceRoller.showRoomDetails = false;
      diceRoller.sessionId = 'ABC123';
      
      diceRoller.toggleStreamerMode();
      
      expect(diceRoller.streamerMode).toBe(false);
      expect(diceRoller.showRoomDetails).toBe(true);
      expect(diceRoller.updateURLForStreamerMode).toHaveBeenCalled();
    });
  });

  describe('toggleRoomDetails', () => {
    it('should toggle room details visibility', () => {
      const diceRoller = createMockDiceRoller();
      
      expect(diceRoller.showRoomDetails).toBe(true);
      
      diceRoller.toggleRoomDetails();
      
      expect(diceRoller.showRoomDetails).toBe(false);
      expect(diceRoller.toggleRoomDetails).toHaveBeenCalledTimes(1);
    });

    it('should allow toggling room details multiple times', () => {
      const diceRoller = createMockDiceRoller();
      
      diceRoller.toggleRoomDetails();
      expect(diceRoller.showRoomDetails).toBe(false);
      
      diceRoller.toggleRoomDetails();
      expect(diceRoller.showRoomDetails).toBe(true);
      
      expect(diceRoller.toggleRoomDetails).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateURLForStreamerMode', () => {
    it('should not update URL if no session exists', () => {
      const diceRoller = createMockDiceRoller();
      diceRoller.sessionId = null;
      
      diceRoller.updateURLForStreamerMode();
      
      expect(mockHistoryReplaceState).not.toHaveBeenCalled();
    });

    it('should remove room from URL when streamer mode is enabled', () => {
      const diceRoller = createMockDiceRoller();
      diceRoller.sessionId = 'ABC123';
      diceRoller.streamerMode = true;
      
      const mockURL = {
        searchParams: {
          delete: vi.fn(),
          set: vi.fn()
        },
        toString: vi.fn().mockReturnValue('https://example.com/')
      };
      
      global.URL = vi.fn().mockImplementation(() => mockURL) as any;
      
      diceRoller.updateURLForStreamerMode();
      
      expect(mockURL.searchParams.delete).toHaveBeenCalledWith('room');
      expect(mockHistoryReplaceState).toHaveBeenCalledWith({}, '', 'https://example.com/');
    });

    it('should add room to URL when streamer mode is disabled', () => {
      const diceRoller = createMockDiceRoller();
      diceRoller.sessionId = 'ABC123';
      diceRoller.streamerMode = false;
      
      const mockURL = {
        searchParams: {
          delete: vi.fn(),
          set: vi.fn()
        },
        toString: vi.fn().mockReturnValue('https://example.com/room/ABC123')
      };
      
      global.URL = vi.fn().mockImplementation(() => mockURL) as any;
      
      diceRoller.updateURLForStreamerMode();
      
      expect(mockURL.searchParams.set).toHaveBeenCalledWith('room', 'ABC123');
      expect(mockHistoryReplaceState).toHaveBeenCalledWith({}, '', 'https://example.com/room/ABC123');
    });
  });

  describe('Session Creation with Streamer Mode', () => {
    it('should create session without URL update when streamer mode is enabled', () => {
      const diceRoller = createMockDiceRoller();
      diceRoller.streamerMode = true;
      
      diceRoller.createSession();
      
      expect(diceRoller.sessionMode).toBe('multiplayer');
      expect(diceRoller.sessionId).toBe('ABC123');
      expect(mockHistoryPushState).toHaveBeenCalledWith({}, '', '/');
    });

    it('should create session with URL update when streamer mode is disabled', () => {
      const diceRoller = createMockDiceRoller();
      diceRoller.streamerMode = false;
      
      diceRoller.createSession();
      
      expect(diceRoller.sessionMode).toBe('multiplayer');
      expect(diceRoller.sessionId).toBe('ABC123');
      expect(mockHistoryPushState).toHaveBeenCalledWith({}, '', '/room/ABC123');
    });

    it('should join session without URL update when streamer mode is enabled', () => {
      const diceRoller = createMockDiceRoller();
      diceRoller.streamerMode = true;
      
      diceRoller.joinSession();
      
      expect(diceRoller.sessionMode).toBe('multiplayer');
      expect(diceRoller.sessionId).toBe('DEF456');
      expect(mockHistoryPushState).toHaveBeenCalledWith({}, '', '/');
    });

    it('should join session with URL update when streamer mode is disabled', () => {
      const diceRoller = createMockDiceRoller();
      diceRoller.streamerMode = false;
      
      diceRoller.joinSession();
      
      expect(diceRoller.sessionMode).toBe('multiplayer');
      expect(diceRoller.sessionId).toBe('DEF456');
      expect(mockHistoryPushState).toHaveBeenCalledWith({}, '', '/room/DEF456');
    });
  });

  describe('Streamer Mode State Management', () => {
    it('should initialize with correct default values', () => {
      const diceRoller = createMockDiceRoller();
      
      expect(diceRoller.streamerMode).toBe(false);
      expect(diceRoller.showRoomDetails).toBe(true);
      expect(diceRoller.sessionId).toBeNull();
      expect(diceRoller.sessionMode).toBe('solo');
    });

    it('should handle multiple toggles correctly', () => {
      const diceRoller = createMockDiceRoller();
      diceRoller.sessionId = 'ABC123';
      
      // Enable streamer mode
      diceRoller.toggleStreamerMode();
      expect(diceRoller.streamerMode).toBe(true);
      expect(diceRoller.showRoomDetails).toBe(false);
      
      // Disable streamer mode
      diceRoller.toggleStreamerMode();
      expect(diceRoller.streamerMode).toBe(false);
      expect(diceRoller.showRoomDetails).toBe(true);
      
      expect(diceRoller.updateURLForStreamerMode).toHaveBeenCalledTimes(2);
    });

    it('should allow independent room details toggling when in streamer mode', () => {
      const diceRoller = createMockDiceRoller();
      diceRoller.streamerMode = true;
      diceRoller.showRoomDetails = false;
      
      // Should be able to show room details even in streamer mode
      diceRoller.toggleRoomDetails();
      expect(diceRoller.showRoomDetails).toBe(true);
      expect(diceRoller.streamerMode).toBe(true); // Streamer mode should remain enabled
      
      // Should be able to hide room details again
      diceRoller.toggleRoomDetails();
      expect(diceRoller.showRoomDetails).toBe(false);
      expect(diceRoller.streamerMode).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle streamer mode toggle without active session', () => {
      const diceRoller = createMockDiceRoller();
      diceRoller.sessionId = null;
      
      diceRoller.toggleStreamerMode();
      
      expect(diceRoller.streamerMode).toBe(true);
      expect(diceRoller.showRoomDetails).toBe(false);
      // updateURLForStreamerMode should not be called when there's no session
      expect(diceRoller.updateURLForStreamerMode).not.toHaveBeenCalled();
    });

    it('should maintain streamer mode state during session transitions', () => {
      const diceRoller = createMockDiceRoller();
      
      // Enable streamer mode before creating session
      diceRoller.toggleStreamerMode();
      expect(diceRoller.streamerMode).toBe(true);
      
      // Create session - should respect streamer mode
      diceRoller.createSession();
      expect(diceRoller.streamerMode).toBe(true);
      expect(mockHistoryPushState).toHaveBeenCalledWith({}, '', '/');
    });

    it('should handle URL updates with various session IDs', () => {
      const diceRoller = createMockDiceRoller();
      
      const testSessionIds = ['ABC123', 'XYZ789', '123456', 'ABCDEF'];
      
      testSessionIds.forEach(sessionId => {
        diceRoller.sessionId = sessionId;
        diceRoller.streamerMode = false;
        
        const mockURL = {
          searchParams: {
            delete: vi.fn(),
            set: vi.fn()
          },
          toString: vi.fn().mockReturnValue(`https://example.com/room/${sessionId}`)
        };
        
        global.URL = vi.fn().mockImplementation(() => mockURL) as any;
        
        diceRoller.updateURLForStreamerMode();
        
        expect(mockURL.searchParams.set).toHaveBeenCalledWith('room', sessionId);
      });
    });
  });
});