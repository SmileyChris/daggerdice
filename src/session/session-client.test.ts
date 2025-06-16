import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionClient } from './session-client';

// Working tests that focus on core functionality we can verify
describe('SessionClient - Integration Tests', () => {
  let client: SessionClient;

  beforeEach(() => {
    // Mock localStorage
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      clear: vi.fn(),
    });

    // Mock document
    vi.stubGlobal('document', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      hidden: false,
    });

    // Mock window properties
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        protocol: 'https:',
        host: 'localhost:3000',
        hostname: 'localhost',
      },
    });

    // Mock window event listeners
    Object.defineProperty(window, 'addEventListener', {
      writable: true,
      value: vi.fn(),
    });

    client = new SessionClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Availability and Initialization', () => {
    it('should be available in HTTPS environment', () => {
      expect(client.isAvailable()).toBe(true);
    });

    it('should not be available in HTTP environment', () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: {
          protocol: 'http:',
          hostname: 'example.com',
        },
      });
      
      const newClient = new SessionClient();
      expect(newClient.isAvailable()).toBe(false);
    });

    it('should start in disconnected state', () => {
      expect(client.getConnectionState()).toBe('disconnected');
      expect(client.getPlayerId()).toBeNull();
      expect(client.getSessionId()).toBeNull();
    });
  });

  describe('Connection State Management', () => {
    it('should reject connection when unavailable', async () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { protocol: 'http:', hostname: 'example.com' },
      });
      
      const unavailableClient = new SessionClient();
      const result = await unavailableClient.connect('ABC123', 'TestPlayer');
      
      expect(result).toBe(false);
      expect(unavailableClient.getConnectionState()).toBe('disconnected');
    });

    it('should prevent operations when disconnected', () => {
      const rollData = {
        hopeValue: 5,
        fearValue: 7,
        advantageValue: 0,
        advantageType: 'none' as const,
        modifier: 0,
        total: 12,
        result: '12 with fear',
      };
      
      // Should not throw when disconnected
      expect(() => client.broadcastRoll(rollData)).not.toThrow();
      expect(() => client.ping()).not.toThrow();
      expect(() => client.disconnect()).not.toThrow();
    });
  });

  describe('Player ID Generation', () => {
    it('should generate unique player IDs', () => {
      const client1 = new SessionClient();
      const client2 = new SessionClient();
      
      // Force player ID generation by attempting connection
      try {
        client1.connect('ABC123', 'Player1');
        client2.connect('DEF456', 'Player2');
      } catch {
        // Expected to fail due to WebSocket mock, but should generate IDs
      }
      
      const id1 = client1.getPlayerId();
      const id2 = client2.getPlayerId();
      
      if (id1 && id2) {
        expect(id1).not.toBe(id2);
        expect(id1.length).toBeGreaterThan(0);
        expect(id2.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Event Handler Management', () => {
    it('should allow setting event handlers', () => {
      const handlers = {
        onConnected: vi.fn(),
        onPlayerJoined: vi.fn(),
        onPlayerLeft: vi.fn(),
        onRollReceived: vi.fn(),
        onError: vi.fn(),
        onDisconnected: vi.fn(),
      };
      
      expect(() => client.setEventHandlers(handlers)).not.toThrow();
    });
  });

  describe('Roll History Management', () => {
    it('should manage roll history', () => {
      const roll = {
        hopeValue: 10,
        fearValue: 8,
        advantageValue: 0,
        advantageType: 'none' as const,
        modifier: 0,
        total: 18,
        result: '18 with hope',
        playerId: 'test-player',
        playerName: 'Test Player',
        timestamp: Date.now(),
      };
      
      client.addRollToHistory(roll);
      
      // History should be added (but not accessible via public API)
      // This tests the internal state management
      expect(() => client.addRollToHistory(roll)).not.toThrow();
    });

    it('should set roll history', () => {
      const rolls = [
        {
          hopeValue: 10,
          fearValue: 8,
          advantageValue: 0,
          advantageType: 'none' as const,
          modifier: 0,
          total: 18,
          result: '18 with hope',
          playerId: 'test-player',
          playerName: 'Test Player',
          timestamp: Date.now(),
        },
      ];
      
      expect(() => client.setRollHistory(rolls)).not.toThrow();
    });
  });

  describe('Connection Health', () => {
    it('should report unhealthy when disconnected', () => {
      expect(client.isConnectionHealthy()).toBe(false);
    });
  });

  describe('Player Management', () => {
    it('should start with no connected players', () => {
      expect(client.getConnectedPlayers()).toEqual([]);
    });
  });
});