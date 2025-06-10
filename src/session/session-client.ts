import type { 
  ClientMessage, 
  ServerMessage, 
  RollData, 
  Player, 
  SharedRollHistoryItem, 
  SessionEventHandlers,
  ConnectionState 
} from './types.js';
import { saveLastSessionId, savePlayerName } from './utils.js';

export class SessionClient {
  private websocket: WebSocket | null = null;
  private available: boolean;
  private sessionId: string | null = null;
  private playerId: string | null = null;
  private playerName: string | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private eventHandlers: SessionEventHandlers = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private connectedPlayers: Map<string, Player> = new Map();
  private localRollHistory: SharedRollHistoryItem[] = [];
  private manualDisconnect = false;
  private heartbeatInterval: number | null = null;
  private pingTimeout: number | null = null;
  private lastPongReceived = 0;

  constructor() {
    this.available = this.checkAvailability();
    
    // Send leave announcement when page is being unloaded
    window.addEventListener('beforeunload', () => {
      this.sendLeaveAnnouncementSync();
    });
  }

  private sendLeaveAnnouncementSync(): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN && this.playerId) {
      // Use sendBeacon for more reliable delivery during page unload
      const message = JSON.stringify({
        type: 'LEAVE_ANNOUNCEMENT',
        playerId: this.playerId
      });
      
      // Fallback to synchronous websocket send if sendBeacon not available
      try {
        this.websocket.send(message);
      } catch (error) {
        console.warn('Failed to send leave announcement on page unload:', error);
      }
    }
  }

  private checkAvailability(): boolean {
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

  public isAvailable(): boolean {
    return this.available;
  }

  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  public getPlayerId(): string | null {
    console.log('getPlayerId() called, returning:', this.playerId);
    return this.playerId;
  }

  public getSessionId(): string | null {
    return this.sessionId;
  }

  public setEventHandlers(handlers: SessionEventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  public async connect(sessionId: string, playerName: string): Promise<boolean> {
    if (!this.available) {
      console.warn('Session features not available');
      return false;
    }

    if (this.connectionState === 'connecting' || this.connectionState === 'connected') {
      console.warn('Already connected or connecting');
      return this.connectionState === 'connected';
    }

    this.sessionId = sessionId;
    this.playerName = playerName;
    this.manualDisconnect = false; // Reset flag for new connection
    
    // Only generate new player ID if we don't have one (prevents duplicates on reconnect)
    if (!this.playerId) {
      this.playerId = this.generatePlayerId();
      console.log('Generated player ID:', this.playerId, 'for player:', playerName);
    } else {
      console.log('Reusing existing player ID:', this.playerId, 'for player:', playerName);
    }
    this.connectionState = 'connecting';

    try {
      // Construct WebSocket URL for Cloudflare Workers
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/room/${sessionId}`;
      
      this.websocket = new WebSocket(wsUrl);
      
      this.websocket.onopen = () => {
        console.log('WebSocket connected');
        this.connectionState = 'connected';
        this.reconnectAttempts = 0;
        this.eventHandlers.onConnected?.(this.playerId!);
        
        // Save session data to localStorage
        saveLastSessionId(sessionId);
        savePlayerName(playerName);
        
        // Send join announcement to other players
        this.sendMessage({
          type: 'JOIN_ANNOUNCEMENT',
          player: {
            id: this.playerId!,
            name: this.sanitizePlayerName(playerName),
            joinedAt: Date.now(),
            lastSeen: Date.now(),
            isActive: true
          }
        });
      };

      this.websocket.onmessage = (event) => {
        try {
          const message: ServerMessage = JSON.parse(event.data);
          this.handleServerMessage(message);
        } catch (error) {
          console.error('Failed to parse server message:', error);
        }
      };

      this.websocket.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        
        // Send leave announcement for unexpected disconnects (not manual)
        if (!this.manualDisconnect && this.playerId && event.code !== 1000) {
          console.log('Unexpected disconnect detected, sending leave announcement');
          // Try to send via a new temporary connection if possible
          // For now, just log it - the server should handle cleanup on connection loss
        }
        
        this.connectionState = 'disconnected';
        this.eventHandlers.onDisconnected?.();
        
        // Attempt to reconnect if not manually closed
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts && !this.manualDisconnect) {
          this.connectionState = 'connecting';
          setTimeout(() => {
            this.attemptReconnect(playerName);
          }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
        } else {
          // No reconnection, reset state
          this.resetConnectionState();
        }
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.connectionState = 'error';
        this.eventHandlers.onError?.('Connection error');
      };

      // Wait for connection to be established
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        const checkConnection = () => {
          if (this.connectionState === 'connected') {
            clearTimeout(timeout);
            resolve();
          } else if (this.connectionState === 'error') {
            clearTimeout(timeout);
            reject(new Error('Connection failed'));
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        
        checkConnection();
      });

      return true;
    } catch (error) {
      console.error('Failed to connect to session:', error);
      this.connectionState = 'error';
      this.eventHandlers.onError?.('Failed to connect to session');
      return false;
    }
  }

  private async attemptReconnect(playerName: string): Promise<void> {
    if (!this.sessionId || this.reconnectAttempts >= this.maxReconnectAttempts || this.manualDisconnect) {
      console.log('Stopping reconnection attempts');
      this.resetConnectionState();
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    // Update status to show we're trying to reconnect
    this.connectionState = 'connecting';
    // Note: No specific event handler for 'connecting' state, UI will check connectionState
    
    try {
      const success = await this.connect(this.sessionId, playerName);
      if (success) {
        console.log('Reconnection successful');
        this.reconnectAttempts = 0; // Reset on successful reconnection
      } else {
        throw new Error('Reconnection failed');
      }
    } catch (error) {
      console.error('Reconnection failed:', error);
      this.connectionState = 'error';
      this.eventHandlers.onError?.('Reconnection failed');
      
      // If we haven't exceeded max attempts, try again
      if (this.reconnectAttempts < this.maxReconnectAttempts && !this.manualDisconnect) {
        setTimeout(() => {
          this.attemptReconnect(playerName);
        }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
      } else {
        this.resetConnectionState();
      }
    }
  }

  public broadcastRoll(rollData: RollData): void {
    if (this.connectionState !== 'connected') {
      console.warn('Cannot broadcast roll: not connected');
      return;
    }

    // Create SharedRollHistoryItem with player info for broadcasting
    const sharedRoll: SharedRollHistoryItem = {
      ...rollData,
      playerId: this.playerId || '',
      playerName: this.sanitizePlayerName(this.playerName || ''),
      timestamp: Date.now()
    };
    
    console.log('Broadcasting roll with player ID:', sharedRoll.playerId, 'and name:', sharedRoll.playerName);

    this.sendMessage({
      type: 'ROLL',
      rollData: sharedRoll
    });
  }

  public ping(): void {
    if (this.connectionState === 'connected' && this.websocket?.readyState === WebSocket.OPEN) {
      this.sendMessage({ type: 'PING' });
    }
  }

  // Public method to check connection health
  public isConnectionHealthy(): boolean {
    if (this.connectionState !== 'connected') return false;
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) return false;
    
    // Check if we've received a pong recently (within last 60 seconds)
    const timeSinceLastPong = Date.now() - this.lastPongReceived;
    return timeSinceLastPong < 60000;
  }

  public disconnect(): void {
    this.manualDisconnect = true;
    
    // Stop heartbeat immediately
    this.stopHeartbeat();
    
    if (this.websocket && this.playerId) {
      // Send leave announcement to other players
      this.sendMessage({ 
        type: 'LEAVE_ANNOUNCEMENT', 
        playerId: this.playerId 
      });
      
      // Give a small delay to ensure the message is sent before closing
      setTimeout(() => {
        if (this.websocket) {
          this.websocket.close(1000, 'User disconnected');
          this.websocket = null;
        }
        this.resetConnectionState();
      }, 100);
    } else {
      // No websocket to close, reset state immediately
      this.resetConnectionState();
    }
  }

  private resetConnectionState(): void {
    this.connectionState = 'disconnected';
    this.sessionId = null;
    this.playerId = null;
    this.playerName = null;
    this.reconnectAttempts = 0;
    this.connectedPlayers.clear();
    this.localRollHistory = [];
    this.manualDisconnect = false;
    this.stopHeartbeat();
  }

  private sendMessage(message: ClientMessage): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
    } else {
      console.warn('Cannot send message: WebSocket not open');
    }
  }

  private handleServerMessage(message: ServerMessage): void {
    switch (message.type) {
      case 'JOIN_ANNOUNCEMENT':
        // Another player joined - respond with our info if we're not the sender
        if (message.player.id !== this.playerId) {
          // Add to our player list
          this.connectedPlayers.set(message.player.id, message.player);
          this.eventHandlers.onPlayerJoined?.(message.player, false); // New join, not initial response
          
          // Send our player info back to the new player
          if (this.playerId && this.playerName) {
            this.sendMessage({
              type: 'PLAYER_RESPONSE',
              player: {
                id: this.playerId,
                name: this.sanitizePlayerName(this.playerName),
                joinedAt: Date.now(),
                lastSeen: Date.now(),
                isActive: true
              }
            });
          }

          // If we're the history keeper among existing players, share the roll history with the new player
          const isKeeper = this.isHistoryKeeperExcluding(message.player.id);
          console.log('History keeper check for new player:', message.player.id, 'Am I keeper?', isKeeper, 'History length:', this.localRollHistory.length);
          console.log('All player IDs (excluding new player):', [this.playerId, ...this.connectedPlayers.keys()].filter(id => id !== message.player.id));
          
          if (isKeeper && this.localRollHistory.length > 0) {
            console.log('Sending history share to new player:', message.player.name, 'History items:', this.localRollHistory.length);
            this.sendMessage({
              type: 'HISTORY_SHARE',
              rollHistory: this.localRollHistory
            });
          } else if (!isKeeper) {
            console.log('Not the history keeper, someone else should send history');
          } else {
            console.log('No history to share');
          }
        }
        break;

      case 'PLAYER_RESPONSE':
        // Existing player responded to our join announcement
        if (message.player.id !== this.playerId) {
          const wasAlreadyKnown = this.connectedPlayers.has(message.player.id);
          this.connectedPlayers.set(message.player.id, message.player);
          // Only trigger onPlayerJoined if this is a new player (not already triggered by JOIN_ANNOUNCEMENT)
          if (!wasAlreadyKnown) {
            this.eventHandlers.onPlayerJoined?.(message.player, true); // Initial response from existing player
          }
        }
        break;

      case 'LEAVE_ANNOUNCEMENT':
        // Remove from our player list
        this.connectedPlayers.delete(message.playerId);
        this.eventHandlers.onPlayerLeft?.(message.playerId);
        break;

      case 'ROLL':
        // Roll data already includes player info and timestamp
        this.addRollToHistory(message.rollData);
        this.eventHandlers.onRollReceived?.(message.rollData);
        break;

      case 'HISTORY_SHARE':
        // Received roll history from the history keeper
        console.log('Received history share with', message.rollHistory.length, 'items');
        this.localRollHistory = message.rollHistory;
        this.eventHandlers.onHistoryReceived?.(message.rollHistory);
        break;

      case 'PING':
        // Respond to server ping with pong
        this.sendMessage({ type: 'PONG' });
        break;

      case 'PONG':
        // Clear ping timeout when pong received
        if (this.pingTimeout) {
          clearTimeout(this.pingTimeout);
          this.pingTimeout = null;
        }
        this.lastPongReceived = Date.now();
        break;

      default:
        console.warn('Unknown message type:', message);
    }
  }

  // Heartbeat to keep connection alive
  public startHeartbeat(): void {
    // Clear any existing heartbeat
    this.stopHeartbeat();
    
    this.heartbeatInterval = window.setInterval(() => {
      if (this.connectionState === 'connected') {
        this.sendPingWithTimeout();
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout);
      this.pingTimeout = null;
    }
  }

  private sendPingWithTimeout(): void {
    if (this.connectionState !== 'connected') return;
    
    // Send ping
    this.ping();
    
    // Set timeout for pong response
    this.pingTimeout = window.setTimeout(() => {
      console.warn('Ping timeout - connection may be stale');
      // Don't immediately disconnect, but mark as potentially problematic
      // The WebSocket will handle actual disconnection if needed
    }, 10000); // 10 second timeout for pong
  }

  private generatePlayerId(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  private sanitizePlayerName(name: string): string {
    if (!name || typeof name !== 'string') {
      return 'Anonymous';
    }
    
    // Trim and limit length
    const sanitized = name.trim().substring(0, 20);
    
    // Remove any HTML content for security
    return sanitized.replace(/<[^>]*>/g, '') || 'Anonymous';
  }

  private isHistoryKeeper(): boolean {
    if (!this.playerId) return false;
    
    // Get all connected player IDs including ourselves
    const allPlayerIds = [this.playerId, ...this.connectedPlayers.keys()];
    
    // Sort alphabetically and check if we're first
    allPlayerIds.sort();
    return allPlayerIds[0] === this.playerId;
  }

  private isHistoryKeeperExcluding(excludePlayerId: string): boolean {
    if (!this.playerId) {
      console.log('No player ID, cannot be history keeper');
      return false;
    }
    
    // Get all connected player IDs including ourselves, but excluding the specified player
    const existingPlayerIds = [this.playerId, ...this.connectedPlayers.keys()].filter(id => id !== excludePlayerId);
    
    // Sort alphabetically and check if we're first
    existingPlayerIds.sort();
    const isKeeper = existingPlayerIds[0] === this.playerId;
    console.log('History keeper check - Existing players (excluding', excludePlayerId + '):', existingPlayerIds, 'Sorted first:', existingPlayerIds[0], 'My ID:', this.playerId, 'Am keeper:', isKeeper);
    return isKeeper;
  }

  public addRollToHistory(roll: SharedRollHistoryItem): void {
    this.localRollHistory.unshift(roll);
    // Keep only last 20 rolls
    if (this.localRollHistory.length > 20) {
      this.localRollHistory = this.localRollHistory.slice(0, 20);
    }
  }

  public setRollHistory(history: SharedRollHistoryItem[]): void {
    this.localRollHistory = [...history];
  }

  public getConnectedPlayers(): Player[] {
    return Array.from(this.connectedPlayers.values());
  }
}