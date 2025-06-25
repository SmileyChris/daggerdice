import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionClient } from '../src/session/session-client';
import type { Player, SessionEventHandlers } from '../src/session/types';

// Mock WebSocket
class MockWebSocket {
  readyState = WebSocket.OPEN;
  close = vi.fn();
  send = vi.fn();
  
  // Event handlers
  onopen: ((event: unknown) => void) | null = null;
  onclose: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onmessage: ((event: unknown) => void) | null = null;
}

// Mock document
const mockDocument = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  hidden: false
};

// Replace global WebSocket and document
(global as unknown as { WebSocket: unknown }).WebSocket = MockWebSocket;
(global as unknown as { document: unknown }).document = mockDocument;

describe('Session Error Handling - Player List', () => {
  let sessionClient: SessionClient;
  let mockWebSocket: MockWebSocket;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock WebSocket that we can control
    mockWebSocket = new MockWebSocket();
    (global as unknown as { WebSocket: unknown }).WebSocket = vi.fn(() => mockWebSocket);
    
    sessionClient = new SessionClient();
  });
  
  describe('Alpine Component Error Handlers', () => {
    // Type for mock Alpine component
    interface MockAlpineComponent {
      sessionMode: 'solo' | 'multiplayer';
      sessionId: string | null;
      connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
      connectedPlayers: Player[];
      sessionClient: SessionClient | null;
      setupSessionEventHandlers(): void;
    }
    
    // Mock Alpine component structure
    function createMockAlpineComponent(): MockAlpineComponent {
      return {
        sessionMode: 'solo',
        sessionId: null,
        connectionStatus: 'disconnected',
        connectedPlayers: [],
        sessionClient: null,
        
        setupSessionEventHandlers() {
          if (!this.sessionClient) {
            return;
          }
          
          const handlers: SessionEventHandlers = {
            onConnected: (_playerId: string) => {
              if (this.sessionClient) {
                this.connectionStatus = this.sessionClient.getConnectionState();
              }
            },
            
            onPlayerJoined: (player: Player) => {
              const existingIndex = this.connectedPlayers.findIndex(p => p.id === player.id);
              if (existingIndex === -1) {
                this.connectedPlayers.push(player);
              } else {
                this.connectedPlayers[existingIndex] = player;
              }
            },
            
            onPlayerLeft: (playerId: string) => {
              this.connectedPlayers = this.connectedPlayers.filter(p => p.id !== playerId);
            },
            
            onError: (error: string) => {
              console.error('Session error:', error);
              // Use the session client's connection state as source of truth
              this.connectionStatus = this.sessionClient?.getConnectionState() || 'error';
              // Clear connected players on error - we can't see them while disconnected
              this.connectedPlayers = [];
            },
            
            onDisconnected: () => {
              console.log('Disconnected from session');
              // Use the session client's connection state as source of truth
              this.connectionStatus = this.sessionClient?.getConnectionState() || 'disconnected';
              // Clear connected players on disconnect - we can't see them while disconnected
              this.connectedPlayers = [];
            }
          };
          
          this.sessionClient.setEventHandlers(handlers);
        }
      };
    }
    
    it('should clear connected players on error', async () => {
      const component = createMockAlpineComponent();
      component.sessionClient = sessionClient;
      component.sessionMode = 'multiplayer';
      component.sessionId = 'test-session';
      component.connectionStatus = 'connected';
      
      // Add some players to the list
      const player1: Player = {
        id: 'player1',
        name: 'Alice',
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        isActive: true
      };
      
      const player2: Player = {
        id: 'player2',
        name: 'Bob',
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        isActive: true
      };
      
      component.connectedPlayers = [player1, player2];
      
      // Set up event handlers with spy
      const setHandlersSpy = vi.spyOn(sessionClient, 'setEventHandlers');
      component.setupSessionEventHandlers();
      
      // Extract the handlers that were set
      const handlers = setHandlersSpy.mock.calls[0]?.[0];
      expect(handlers).toBeDefined();
      expect(handlers?.onError).toBeDefined();
      
      // Verify players are present before error
      expect(component.connectedPlayers).toHaveLength(2);
      
      // Trigger error handler
      if (handlers?.onError) {
        handlers.onError('Connection lost');
      }
      
      // Verify players list is cleared but still in multiplayer mode (temporarily disconnected)
      expect(component.connectedPlayers).toHaveLength(0);
      expect(component.connectionStatus).toBe('disconnected'); // SessionClient returns disconnected state on error
      expect(component.sessionMode).toBe('multiplayer'); // Still in multiplayer mode, just disconnected
      expect(component.sessionId).not.toBe(null); // Session ID preserved for reconnection
    });
    
    it('should clear connected players on disconnect', async () => {
      const component = createMockAlpineComponent();
      component.sessionClient = sessionClient;
      component.sessionMode = 'multiplayer';
      component.sessionId = 'test-session';
      component.connectionStatus = 'connected';
      
      // Add some players to the list
      const player1: Player = {
        id: 'player1',
        name: 'Charlie',
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        isActive: true
      };
      
      const player2: Player = {
        id: 'player2', 
        name: 'Diana',
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        isActive: true
      };
      
      const player3: Player = {
        id: 'player3',
        name: 'Eve',
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        isActive: true
      };
      
      component.connectedPlayers = [player1, player2, player3];
      
      // Set up event handlers with spy
      const setHandlersSpy = vi.spyOn(sessionClient, 'setEventHandlers');
      component.setupSessionEventHandlers();
      
      // Extract the handlers that were set
      const handlers = setHandlersSpy.mock.calls[0]?.[0];
      expect(handlers).toBeDefined();
      expect(handlers?.onDisconnected).toBeDefined();
      
      // Verify players are present before disconnect
      expect(component.connectedPlayers).toHaveLength(3);
      
      // Trigger disconnect handler
      if (handlers?.onDisconnected) {
        handlers.onDisconnected();
      }
      
      // Verify players list is cleared but still in multiplayer mode (temporarily disconnected)
      expect(component.connectedPlayers).toHaveLength(0);
      expect(component.connectionStatus).toBe('disconnected');
      expect(component.sessionMode).toBe('multiplayer'); // Still in multiplayer mode, just disconnected
      expect(component.sessionId).not.toBe(null); // Session ID preserved for reconnection
    });
    
    it('should not affect players list during normal player leave', async () => {
      const component = createMockAlpineComponent();
      component.sessionClient = sessionClient;
      component.sessionMode = 'multiplayer';
      component.sessionId = 'test-session';
      component.connectionStatus = 'connected';
      
      // Add some players to the list
      const player1: Player = {
        id: 'player1',
        name: 'Frank',
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        isActive: true
      };
      
      const player2: Player = {
        id: 'player2',
        name: 'Grace',
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        isActive: true
      };
      
      const player3: Player = {
        id: 'player3',
        name: 'Henry',
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        isActive: true
      };
      
      component.connectedPlayers = [player1, player2, player3];
      
      // Set up event handlers with spy
      const setHandlersSpy = vi.spyOn(sessionClient, 'setEventHandlers');
      component.setupSessionEventHandlers();
      
      // Extract the handlers that were set
      const handlers = setHandlersSpy.mock.calls[0]?.[0];
      expect(handlers).toBeDefined();
      expect(handlers?.onPlayerLeft).toBeDefined();
      
      // Verify all players are present
      expect(component.connectedPlayers).toHaveLength(3);
      
      // One player leaves normally
      if (handlers?.onPlayerLeft) {
        handlers.onPlayerLeft('player2');
      }
      
      // Verify only that player is removed, others remain
      expect(component.connectedPlayers).toHaveLength(2);
      expect(component.connectedPlayers.find(p => p.id === 'player1')).toBeDefined();
      expect(component.connectedPlayers.find(p => p.id === 'player2')).toBeUndefined();
      expect(component.connectedPlayers.find(p => p.id === 'player3')).toBeDefined();
      expect(component.connectionStatus).toBe('connected'); // Still connected
    });
    
    it('should handle error when already empty player list', async () => {
      const component = createMockAlpineComponent();
      component.sessionClient = sessionClient;
      component.sessionMode = 'multiplayer';
      component.sessionId = 'test-session';
      component.connectionStatus = 'connected';
      component.connectedPlayers = []; // Already empty
      
      // Set up event handlers with spy
      const setHandlersSpy = vi.spyOn(sessionClient, 'setEventHandlers');
      component.setupSessionEventHandlers();
      
      // Extract the handlers that were set
      const handlers = setHandlersSpy.mock.calls[0]?.[0];
      expect(handlers).toBeDefined();
      expect(handlers?.onError).toBeDefined();
      
      // Trigger error handler
      if (handlers?.onError) {
        handlers.onError('Network error');
      }
      
      // Verify no errors occur, list remains empty, but still in multiplayer mode
      expect(component.connectedPlayers).toHaveLength(0);
      expect(component.connectionStatus).toBe('disconnected');
      expect(component.sessionMode).toBe('multiplayer'); // Still in multiplayer mode
      expect(component.sessionId).not.toBe(null); // Session ID preserved
    });
    
    it('should handle rapid error and disconnect events', async () => {
      const component = createMockAlpineComponent();
      component.sessionClient = sessionClient;
      component.sessionMode = 'multiplayer';
      component.sessionId = 'test-session';
      component.connectionStatus = 'connected';
      
      // Add players
      const player1: Player = {
        id: 'player1',
        name: 'Ivy',
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        isActive: true
      };
      
      component.connectedPlayers = [player1];
      
      // Set up event handlers with spy
      const setHandlersSpy = vi.spyOn(sessionClient, 'setEventHandlers');
      component.setupSessionEventHandlers();
      
      // Extract the handlers that were set
      const handlers = setHandlersSpy.mock.calls[0]?.[0];
      expect(handlers).toBeDefined();
      expect(handlers?.onError).toBeDefined();
      expect(handlers?.onDisconnected).toBeDefined();
      
      // Trigger multiple events rapidly
      if (handlers?.onError) {
        handlers.onError('Connection error');
      }
      expect(component.connectedPlayers).toHaveLength(0);
      
      if (handlers?.onDisconnected) {
        handlers.onDisconnected();
      }
      expect(component.connectedPlayers).toHaveLength(0); // Should remain empty
      
      if (handlers?.onError) {
        handlers.onError('Another error');
      }
      expect(component.connectedPlayers).toHaveLength(0); // Should remain empty
      expect(component.sessionMode).toBe('multiplayer'); // Should remain multiplayer
    });
  });
});