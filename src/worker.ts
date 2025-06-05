// Cloudflare Worker for DaggerDice API and WebSocket sessions

import type { 
  ClientMessage, 
  ServerMessage, 
  Player, 
  RollData, 
  SharedRollHistoryItem,
  GameSession 
} from './session/types';

// Environment interface
interface Env {
  SESSION_DO: DurableObjectNamespace;
  ASSETS: Fetcher;
}

// Main Worker fetch handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle WebSocket connections for multiplayer sessions
    if (url.pathname.startsWith('/api/session/')) {
      return handleSessionAPI(request, env);
    }
    
    // For all other requests, serve static assets from the built application
    try {
      // Use the ASSETS binding to serve static files
      return await env.ASSETS.fetch(request);
    } catch (error) {
      // If asset serving fails, return a 404
      return new Response('File not found', { 
        status: 404,
        headers: {
          'Content-Type': 'text/plain'
        }
      });
    }
  }
};

// Handle session API requests (both HTTP and WebSocket)
async function handleSessionAPI(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const sessionIdMatch = url.pathname.match(/^\/api\/session\/([^\/]+)$/);
  
  if (!sessionIdMatch) {
    return new Response('Invalid session URL', { status: 400 });
  }
  
  const sessionId = sessionIdMatch[1];
  
  // Get the Durable Object for this session
  const id = env.SESSION_DO.idFromName(sessionId);
  const sessionObject = env.SESSION_DO.get(id);
  
  // Forward the request to the Durable Object
  return sessionObject.fetch(request);
}

// Durable Object for managing game sessions
export class SessionDurableObject {
  private state: DurableObjectState;
  private sql: SqlStorage;
  private websockets: Map<WebSocket, string> = new Map(); // WebSocket to player ID mapping
  private players: Map<string, Player> = new Map();
  private sessionId: string = '';
  private lastActivity: number = Date.now();

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.sql = state.storage.sql;
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    // Create tables if they don't exist
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        joined_at INTEGER NOT NULL,
        last_seen INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT 1
      );
    `);

    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS roll_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id TEXT NOT NULL,
        player_name TEXT NOT NULL,
        hope_value INTEGER NOT NULL,
        fear_value INTEGER NOT NULL,
        advantage_value INTEGER DEFAULT 0,
        advantage_type TEXT DEFAULT 'none',
        modifier INTEGER DEFAULT 0,
        total INTEGER NOT NULL,
        result_text TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (player_id) REFERENCES players(id)
      );
    `);

    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS session_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Set session creation time if not exists
    const existing = this.sql.prepare('SELECT value FROM session_meta WHERE key = ?').bind('created_at').first();
    if (!existing) {
      this.sql.prepare('INSERT INTO session_meta (key, value) VALUES (?, ?)').bind('created_at', Date.now().toString()).run();
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    // Extract session ID from URL path
    const pathMatch = url.pathname.match(/\/api\/session\/([^\/]+)$/);
    if (pathMatch) {
      this.sessionId = pathMatch[1];
    }

    // Handle WebSocket upgrade for real-time communication
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    // Handle HTTP requests (for potential REST API)
    if (request.method === 'GET') {
      return this.handleGetSession();
    }

    return new Response('Not Found', { status: 404 });
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    server.accept();
    
    // Set up message handling
    server.addEventListener('message', async (event) => {
      try {
        const message: ClientMessage = JSON.parse(event.data);
        await this.handleClientMessage(server, message);
      } catch (error) {
        console.error('Error handling client message:', error);
        this.sendToClient(server, {
          type: 'ERROR',
          message: 'Invalid message format'
        });
      }
    });

    server.addEventListener('close', () => {
      this.handleClientDisconnect(server);
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  private async handleClientMessage(ws: WebSocket, message: ClientMessage): Promise<void> {
    this.lastActivity = Date.now();

    switch (message.type) {
      case 'JOIN':
        await this.handlePlayerJoin(ws, message.playerName);
        break;

      case 'ROLL':
        await this.handlePlayerRoll(ws, message.rollData);
        break;

      case 'PING':
        // Update last seen for the player
        const playerId = this.websockets.get(ws);
        if (playerId) {
          this.updatePlayerLastSeen(playerId);
        }
        break;

      case 'LEAVE':
        this.handleClientDisconnect(ws);
        break;

      default:
        this.sendToClient(ws, {
          type: 'ERROR',
          message: 'Unknown message type'
        });
    }
  }

  private async handlePlayerJoin(ws: WebSocket, playerName: string): Promise<void> {
    // Generate unique player ID
    const playerId = this.generatePlayerId();
    
    // Sanitize player name
    const sanitizedName = this.sanitizePlayerName(playerName);
    
    const now = Date.now();
    
    // Create player record
    const player: Player = {
      id: playerId,
      name: sanitizedName,
      joinedAt: now,
      lastSeen: now,
      isActive: true
    };

    // Store player in database
    this.sql.prepare(`
      INSERT OR REPLACE INTO players (id, name, joined_at, last_seen, is_active) 
      VALUES (?, ?, ?, ?, ?)
    `).bind(playerId, sanitizedName, now, now, 1).run();

    // Add to memory
    this.players.set(playerId, player);
    this.websockets.set(ws, playerId);

    // Get current players list and roll history
    const players = Array.from(this.players.values());
    const rollHistory = this.getRollHistory();

    // Send welcome message to new player
    this.sendToClient(ws, {
      type: 'WELCOME',
      playerId: playerId,
      players: players,
      rollHistory: rollHistory
    });

    // Notify other players
    this.broadcastToOthers(ws, {
      type: 'PLAYER_JOINED',
      player: player
    });

    console.log(`Player ${sanitizedName} (${playerId}) joined session ${this.sessionId}`);
  }

  private async handlePlayerRoll(ws: WebSocket, rollData: RollData): Promise<void> {
    const playerId = this.websockets.get(ws);
    if (!playerId) {
      this.sendToClient(ws, {
        type: 'ERROR',
        message: 'Player not found'
      });
      return;
    }

    const player = this.players.get(playerId);
    if (!player) {
      this.sendToClient(ws, {
        type: 'ERROR',
        message: 'Player not found'
      });
      return;
    }

    const timestamp = Date.now();

    // Create shared roll history item
    const sharedRoll: SharedRollHistoryItem = {
      ...rollData,
      playerId: playerId,
      playerName: player.name,
      timestamp: timestamp
    };

    // Store roll in database
    this.sql.prepare(`
      INSERT INTO roll_history 
      (player_id, player_name, hope_value, fear_value, advantage_value, advantage_type, modifier, total, result_text, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      playerId,
      player.name,
      rollData.hopeValue,
      rollData.fearValue,
      rollData.advantageValue,
      rollData.advantageType,
      rollData.modifier,
      rollData.total,
      rollData.result,
      timestamp
    ).run();

    // Broadcast roll to all players in session
    this.broadcastToAll({
      type: 'ROLL_RESULT',
      roll: sharedRoll
    });

    console.log(`Player ${player.name} rolled in session ${this.sessionId}:`, rollData);
  }

  private handleClientDisconnect(ws: WebSocket): void {
    const playerId = this.websockets.get(ws);
    
    if (playerId) {
      // Mark player as inactive
      this.sql.prepare('UPDATE players SET is_active = 0 WHERE id = ?').bind(playerId).run();
      
      const player = this.players.get(playerId);
      if (player) {
        player.isActive = false;
        this.players.set(playerId, player);
      }

      // Remove WebSocket mapping
      this.websockets.delete(ws);

      // Notify other players
      this.broadcastToOthers(ws, {
        type: 'PLAYER_LEFT',
        playerId: playerId
      });

      console.log(`Player ${player?.name} (${playerId}) left session ${this.sessionId}`);
    }
  }

  private getRollHistory(): SharedRollHistoryItem[] {
    const rows = this.sql.prepare(`
      SELECT player_id, player_name, hope_value, fear_value, advantage_value, advantage_type, 
             modifier, total, result_text, timestamp
      FROM roll_history 
      ORDER BY timestamp DESC 
      LIMIT 20
    `).all();

    return rows.map(row => ({
      hopeValue: row.hope_value as number,
      fearValue: row.fear_value as number,
      advantageValue: row.advantage_value as number,
      advantageType: row.advantage_type as 'none' | 'advantage' | 'disadvantage',
      modifier: row.modifier as number,
      total: row.total as number,
      result: row.result_text as string,
      playerId: row.player_id as string,
      playerName: row.player_name as string,
      timestamp: row.timestamp as number
    }));
  }

  private updatePlayerLastSeen(playerId: string): void {
    const now = Date.now();
    this.sql.prepare('UPDATE players SET last_seen = ? WHERE id = ?').bind(now, playerId).run();
    
    const player = this.players.get(playerId);
    if (player) {
      player.lastSeen = now;
      this.players.set(playerId, player);
    }
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

  private sendToClient(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.READY_STATE_OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private broadcastToAll(message: ServerMessage): void {
    for (const ws of this.websockets.keys()) {
      this.sendToClient(ws, message);
    }
  }

  private broadcastToOthers(excludeWs: WebSocket, message: ServerMessage): void {
    for (const ws of this.websockets.keys()) {
      if (ws !== excludeWs) {
        this.sendToClient(ws, message);
      }
    }
  }

  private async handleGetSession(): Promise<Response> {
    // Return session info for potential REST API usage
    const players = Array.from(this.players.values());
    const rollHistory = this.getRollHistory();
    
    const sessionData: GameSession = {
      id: this.sessionId,
      players: players,
      rollHistory: rollHistory,
      createdAt: this.getSessionCreatedAt(),
      lastActivity: this.lastActivity
    };

    return new Response(JSON.stringify(sessionData), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  private getSessionCreatedAt(): number {
    const result = this.sql.prepare('SELECT value FROM session_meta WHERE key = ?').bind('created_at').first();
    return result ? parseInt(result.value as string) : Date.now();
  }

  // Cleanup inactive sessions periodically
  async alarm(): Promise<void> {
    const now = Date.now();
    const inactiveThreshold = 24 * 60 * 60 * 1000; // 24 hours

    // If session has been inactive for too long, clean up
    if (now - this.lastActivity > inactiveThreshold) {
      console.log(`Cleaning up inactive session ${this.sessionId}`);
      
      // Close all websockets
      for (const ws of this.websockets.keys()) {
        ws.close();
      }
      
      // Clear data (optional - could keep for historical purposes)
      // this.sql.exec('DELETE FROM roll_history');
      // this.sql.exec('DELETE FROM players');
    }

    // Schedule next cleanup
    this.state.storage.setAlarm(now + 60 * 60 * 1000); // Check again in 1 hour
  }
}