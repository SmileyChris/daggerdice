import type { 
  ClientMessage, 
  ServerMessage, 
  RollData, 
  Player, 
  SharedRollHistoryItem, 
  SessionEventHandlers,
  ConnectionState 
} from './types.js';

export class SessionClient {
  private websocket: WebSocket | null = null;
  private available: boolean;
  private sessionId: string | null = null;
  private playerId: string | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private eventHandlers: SessionEventHandlers = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  constructor() {
    this.available = this.checkAvailability();
  }

  private checkAvailability(): boolean {
    return typeof WebSocket !== 'undefined' && 
           window.location.protocol === 'https:' &&
           window.location.hostname !== 'localhost';
  }

  public isAvailable(): boolean {
    return this.available;
  }

  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  public getPlayerId(): string | null {
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
    this.connectionState = 'connecting';

    try {
      // Construct WebSocket URL for Cloudflare Workers
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/session/${sessionId}`;
      
      this.websocket = new WebSocket(wsUrl);
      
      this.websocket.onopen = () => {
        console.log('WebSocket connected');
        this.connectionState = 'connected';
        this.reconnectAttempts = 0;
        
        // Send join message
        this.sendMessage({
          type: 'JOIN',
          playerName: playerName
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
        this.connectionState = 'disconnected';
        this.eventHandlers.onDisconnected?.();
        
        // Attempt to reconnect if not manually closed
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => {
            this.attemptReconnect(playerName);
          }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
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
    if (!this.sessionId || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    try {
      await this.connect(this.sessionId, playerName);
    } catch (error) {
      console.error('Reconnection failed:', error);
    }
  }

  public broadcastRoll(rollData: RollData): void {
    if (this.connectionState !== 'connected') {
      console.warn('Cannot broadcast roll: not connected');
      return;
    }

    this.sendMessage({
      type: 'ROLL',
      rollData: rollData
    });
  }

  public ping(): void {
    if (this.connectionState === 'connected') {
      this.sendMessage({ type: 'PING' });
    }
  }

  public disconnect(): void {
    if (this.websocket) {
      this.sendMessage({ type: 'LEAVE' });
      this.websocket.close(1000, 'User disconnected');
      this.websocket = null;
    }
    
    this.connectionState = 'disconnected';
    this.sessionId = null;
    this.playerId = null;
    this.reconnectAttempts = 0;
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
      case 'WELCOME':
        this.playerId = message.playerId;
        this.eventHandlers.onConnected?.(message.playerId);
        this.eventHandlers.onHistoryReceived?.(message.rollHistory);
        // Update players list
        for (const player of message.players) {
          if (player.id !== this.playerId) {
            this.eventHandlers.onPlayerJoined?.(player);
          }
        }
        break;

      case 'PLAYER_JOINED':
        this.eventHandlers.onPlayerJoined?.(message.player);
        break;

      case 'PLAYER_LEFT':
        this.eventHandlers.onPlayerLeft?.(message.playerId);
        break;

      case 'ROLL_RESULT':
        this.eventHandlers.onRollReceived?.(message.roll);
        break;

      case 'HISTORY':
        this.eventHandlers.onHistoryReceived?.(message.rolls);
        break;

      case 'ERROR':
        console.error('Server error:', message.message);
        this.eventHandlers.onError?.(message.message);
        break;

      default:
        console.warn('Unknown server message type:', message);
    }
  }

  // Heartbeat to keep connection alive
  public startHeartbeat(): void {
    setInterval(() => {
      this.ping();
    }, 30000); // Ping every 30 seconds
  }
}