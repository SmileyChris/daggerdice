// Session-related type definitions for DaggerDice multiplayer

export interface Player {
  id: string;
  name: string;
  joinedAt: number;
  lastSeen: number;
  isActive: boolean;
}

export interface RollData {
  hopeValue: number;
  fearValue: number;
  advantageValue: number;
  advantageType: "none" | "advantage" | "disadvantage";
  modifier: number;
  total: number;
  result: string;
}

export interface SharedRollHistoryItem extends RollData {
  playerId: string;
  playerName: string;
  timestamp: number;
}

export interface GameSession {
  id: string;
  players: Player[];
  rollHistory: SharedRollHistoryItem[];
  createdAt: number;
  lastActivity: number;
}

// WebSocket message types for peer-to-peer announcements
export type ClientMessage = 
  | { type: 'JOIN_ANNOUNCEMENT'; player: Player }
  | { type: 'PLAYER_RESPONSE'; player: Player }
  | { type: 'LEAVE_ANNOUNCEMENT'; playerId: string }
  | { type: 'ROLL'; rollData: SharedRollHistoryItem }
  | { type: 'HISTORY_SHARE'; rollHistory: SharedRollHistoryItem[] }
  | { type: 'PING' }
  | { type: 'PONG' };

export type ServerMessage = ClientMessage;

// Session client event types
export interface SessionEventHandlers {
  onConnected?: (playerId: string) => void;
  onPlayerJoined?: (player: Player) => void;
  onPlayerLeft?: (playerId: string) => void;
  onRollReceived?: (roll: SharedRollHistoryItem) => void;
  onHistoryReceived?: (rolls: SharedRollHistoryItem[]) => void;
  onError?: (error: string) => void;
  onDisconnected?: () => void;
}

// Connection state
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';