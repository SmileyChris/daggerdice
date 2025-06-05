# DaggerDice Multiplayer Sessions Design Plan

## Overview

This document outlines the design for adding optional multiplayer sessions to DaggerDice using Cloudflare Durable Objects with SQLite storage (Free plan compatible). The multiplayer functionality is designed as an **additive enhancement** that preserves all existing solo functionality.

## Core Principles

1. **Sessions are Optional**: Default behavior remains unchanged (solo play)
2. **Zero Breaking Changes**: All existing features work identically
3. **Graceful Degradation**: Falls back to solo mode if session features unavailable
4. **User-Initiated**: Multiplayer features only activate when explicitly requested

## Architecture Overview

### Current State
- Single-player Alpine.js application
- 3D dice physics with @3d-dice/dice-box
- Local roll history and state management

### Target State
- **Solo Mode (Default)**: Identical to current behavior
- **Multiplayer Mode (Opt-in)**: Real-time session sharing via Durable Objects

## Technical Architecture

### 1. Durable Objects Design (Free Plan Compatible)

#### Single Session Durable Object
```typescript
class SessionDurableObject {
  private sql: SqlStorage;
  private websockets: WebSocket[];
  
  constructor(state: DurableObjectState) {
    this.sql = state.storage.sql;
    this.websockets = [];
    this.initializeDatabase();
  }
}
```

#### SQLite Schema
```sql
-- Players table
CREATE TABLE players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  joined_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT 1
);

-- Roll history table  
CREATE TABLE roll_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  hope_value INTEGER NOT NULL,
  fear_value INTEGER NOT NULL,
  advantage_value INTEGER DEFAULT 0,
  modifier INTEGER DEFAULT 0,
  total INTEGER NOT NULL,
  result_text TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (player_id) REFERENCES players(id)
);

-- Session metadata table
CREATE TABLE session_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### 2. Session Management

#### URL-Based Session Routing
- `/` or `/solo` → Solo mode (current behavior)
- `/session/create` → Session creation interface
- `/session/{sessionId}` → Join specific session

#### Session Discovery
No coordinator Durable Object needed. Sessions are discovered via:
- **URL Sharing**: Players share session URLs (like Discord invite links)
- **Random ID Generation**: Sessions created with cryptographically random IDs
- **Direct Entry**: Players can manually enter session IDs

### 3. WebSocket Protocol

#### Client → Server Messages
```typescript
type ClientMessage = 
  | { type: 'JOIN', playerName: string }
  | { type: 'ROLL', rollData: RollData }
  | { type: 'PING' }
  | { type: 'LEAVE' }
```

#### Server → Client Messages
```typescript
type ServerMessage =
  | { type: 'WELCOME', playerId: string, players: Player[] }
  | { type: 'PLAYER_JOINED', player: Player }
  | { type: 'PLAYER_LEFT', playerId: string }
  | { type: 'ROLL_RESULT', roll: SharedRollHistoryItem }
  | { type: 'HISTORY', rolls: SharedRollHistoryItem[] }
  | { type: 'ERROR', message: string }
```

## Data Structures

### Enhanced Interfaces
```typescript
interface Player {
  id: string;
  name: string;
  joinedAt: number;
  lastSeen: number;
  isActive: boolean;
}

interface SharedRollHistoryItem extends RollHistoryItem {
  playerId: string;
  playerName: string;
  timestamp: number;
}

interface GameSession {
  id: string;
  players: Player[];
  rollHistory: SharedRollHistoryItem[];
  createdAt: number;
  lastActivity: number;
}
```

### Session Client
```typescript
class SessionClient {
  private websocket: WebSocket | null = null;
  private available: boolean;
  
  constructor() {
    this.available = this.checkAvailability();
  }

  checkAvailability(): boolean {
    return typeof WebSocket !== 'undefined' && 
           window.location.protocol === 'https:';
  }

  async connect(sessionId: string): Promise<boolean> {
    if (!this.available) return false;
    // WebSocket connection logic
  }

  broadcastRoll(rollData: RollData): void {
    // Send roll to all session participants
  }

  disconnect(): void {
    // Clean disconnect from session
  }
}
```

## Frontend Integration

### Enhanced Alpine.js Component
```typescript
function diceRoller() {
  return {
    // ===== EXISTING STATE (UNCHANGED) =====
    hopeValue: 0,
    fearValue: 0,
    result: "",
    isRolling: false,
    rollHistory: [] as RollHistoryItem[],
    showHistory: false,
    advantageType: "none" as "none" | "advantage" | "disadvantage",
    advantageValue: 0,
    modifier: 0,

    // ===== NEW SESSION STATE (ADDITIVE) =====
    sessionMode: "solo" as "solo" | "multiplayer",
    sessionId: null as string | null,
    playerName: "",
    connectedPlayers: [] as Player[],
    sessionClient: null as SessionClient | null,
    showSessionUI: false,
    sessionFeaturesAvailable: true,

    // ===== EXISTING METHODS (PRESERVED) =====
    setAdvantageType(type: "none" | "advantage" | "disadvantage") {
      // Existing logic unchanged
    },

    async rollDice() {
      // ===== EXISTING LOGIC (UNCHANGED) =====
      if (this.isRolling || !window.diceBox) return;
      
      const rollResult = await this.performRoll();
      this.updateLocalState(rollResult);
      
      // ===== NEW: BROADCAST IF IN SESSION =====
      if (this.sessionMode === "multiplayer" && this.sessionClient) {
        this.sessionClient.broadcastRoll(rollResult);
      }
    },

    // ===== NEW SESSION METHODS (ADDITIVE) =====
    toggleSessionUI() {
      this.showSessionUI = !this.showSessionUI;
    },

    async createSession(playerName: string) {
      this.sessionMode = "multiplayer";
      this.playerName = playerName;
      
      const sessionId = generateSessionId();
      this.sessionId = sessionId;
      
      this.sessionClient = new SessionClient();
      await this.sessionClient.connect(sessionId);
      
      // Update URL without page reload
      history.pushState({}, '', `/session/${sessionId}`);
    },

    async joinSession(sessionId: string, playerName: string) {
      this.sessionMode = "multiplayer";
      this.playerName = playerName;
      this.sessionId = sessionId;
      
      this.sessionClient = new SessionClient();
      const connected = await this.sessionClient.connect(sessionId);
      
      if (!connected) {
        this.leaveSession();
        throw new Error("Failed to join session");
      }
    },

    leaveSession() {
      this.sessionMode = "solo";
      this.sessionClient?.disconnect();
      this.sessionClient = null;
      this.sessionId = null;
      this.connectedPlayers = [];
      
      // Return to solo URL
      history.pushState({}, '', '/');
    },

    init() {
      // Feature detection
      this.sessionFeaturesAvailable = 
        window.location.hostname !== 'localhost' &&
        typeof WebSocket !== 'undefined';
        
      // Auto-join if URL contains session ID
      const urlMatch = window.location.pathname.match(/^\/session\/(.+)$/);
      if (urlMatch && this.sessionFeaturesAvailable) {
        const sessionId = urlMatch[1];
        this.showSessionUI = true;
        // Prompt for player name, then auto-join
      }
    }
  };
}
```

### UI Integration (Non-Intrusive)
```html
<!DOCTYPE html>
<html>
<head>
  <!-- Existing head content unchanged -->
</head>
<body>
  <div x-data="diceRoller()" x-init="init()">
    
    <!-- ===== EXISTING DICE INTERFACE (UNCHANGED) ===== -->
    <div id="dice-container">
      <div id="dice-box"></div>
      <!-- All current dice UI preserved exactly -->
    </div>

    <!-- ===== NEW: OPTIONAL SESSION PANEL ===== -->
    <div x-show="sessionFeaturesAvailable" class="session-toggle-container">
      <button @click="toggleSessionUI()" class="session-toggle-btn">
        <span x-show="sessionMode === 'solo'">🎲 Play with Friends</span>
        <span x-show="sessionMode === 'multiplayer'">👤 Solo Mode</span>
      </button>
    </div>

    <div x-show="showSessionUI && sessionFeaturesAvailable" class="session-panel">
      <!-- Solo mode: session creation/joining -->
      <div x-show="sessionMode === 'solo'" class="session-join">
        <h3>Multiplayer Session</h3>
        
        <div class="create-session">
          <input x-model="playerName" placeholder="Your name" required>
          <button @click="createSession(playerName)" 
                  :disabled="!playerName.trim()">
            Create New Session
          </button>
        </div>
        
        <div class="join-session">
          <input x-model="sessionId" placeholder="Session ID">
          <button @click="joinSession(sessionId, playerName)" 
                  :disabled="!sessionId.trim() || !playerName.trim()">
            Join Session
          </button>
        </div>
      </div>

      <!-- Multiplayer mode: session info -->
      <div x-show="sessionMode === 'multiplayer'" class="session-info">
        <div class="session-details">
          <strong>Session:</strong> <span x-text="sessionId"></span>
          <button @click="navigator.clipboard.writeText(window.location.href)">
            📋 Copy Link
          </button>
        </div>
        
        <div class="players-list">
          <strong>Players (<span x-text="connectedPlayers.length"></span>):</strong>
          <ul>
            <template x-for="player in connectedPlayers">
              <li x-text="player.name"></li>
            </template>
          </ul>
        </div>
        
        <button @click="leaveSession()" class="leave-session">
          Leave Session
        </button>
      </div>
    </div>

    <!-- Enhanced roll history (shows all players' rolls in multiplayer) -->
    <div x-show="showHistory" class="roll-history">
      <template x-for="roll in rollHistory">
        <div class="roll-item">
          <!-- Show player name in multiplayer mode -->
          <span x-show="sessionMode === 'multiplayer' && roll.playerName" 
                x-text="roll.playerName + ': '" 
                class="player-name"></span>
          <span x-text="roll.result"></span>
        </div>
      </template>
    </div>

  </div>
</body>
</html>
```

## File Structure

```
src/
├── dice-roller-main.ts         # Enhanced Alpine component
├── session/
│   ├── session-client.ts       # WebSocket client wrapper
│   ├── types.ts               # Shared type definitions
│   └── utils.ts               # Session utilities
├── dice-roller.css            # Enhanced styles
└── types.ts                   # Global type definitions

functions/
└── session/
    └── [sessionId].ts         # Durable Object session handler

public/
└── assets/                    # Existing 3D dice assets (unchanged)
```

## Deployment Configuration

### Enhanced wrangler.toml
```toml
name = "daggerdice"
compatibility_date = "2024-01-01"

[[durable_objects.bindings]]
name = "SESSION_DO"
class_name = "SessionDurableObject"
script_name = "daggerdice"

[durable_objects]
bindings = [
  { name = "SESSION_DO", class_name = "SessionDurableObject" }
]

[[env.production.durable_objects.bindings]]
name = "SESSION_DO"
class_name = "SessionDurableObject"
script_name = "daggerdice"
```

### Package.json Updates
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "deploy": "npm run build && npx wrangler pages publish dist",
    "dev:worker": "wrangler dev",
    "deploy:worker": "wrangler deploy"
  }
}
```

## Implementation Phases

### Phase 1: Foundation
1. Set up Durable Object infrastructure
2. Implement basic WebSocket connection
3. Create session client wrapper
4. Add session toggle UI (hidden by default)

### Phase 2: Core Functionality
1. Implement session creation/joining
2. Add real-time roll broadcasting
3. Sync roll history across players
4. Handle player join/leave events

### Phase 3: Enhancement
1. Add session persistence (SQLite)
2. Implement reconnection logic
3. Add session link sharing
4. Polish UI/UX

### Phase 4: Advanced Features
1. Session settings (private/public)
2. Player spectator mode
3. Enhanced error handling
4. Performance optimizations

## Key Features

### Session Management
- **URL-based Sessions**: `daggerdice.com/session/abc123`
- **Link Sharing**: Copy/paste session URLs to invite players
- **Auto-join**: Visiting session URL prompts for name and joins
- **Graceful Leave**: Return to solo mode anytime

### Real-time Synchronization
- **Live Roll Broadcasting**: All players see rolls immediately
- **Shared History**: Combined roll history from all participants
- **Player Presence**: See who's currently in the session
- **Connection Status**: Visual indicators for connectivity

### Fallback & Compatibility
- **Feature Detection**: Hide multiplayer UI if not supported
- **Graceful Degradation**: Fall back to solo mode on connection issues
- **Backward Compatibility**: All existing URLs and features preserved
- **Progressive Enhancement**: Multiplayer features layer on top

## Security Considerations

### Session Security
- Cryptographically random session IDs (128-bit entropy)
- No persistent user accounts (ephemeral sessions)
- Rate limiting on session creation
- Automatic cleanup of inactive sessions

### Input Validation
- Player name sanitization
- Roll data validation
- WebSocket message validation
- SQLite injection prevention

## Performance Characteristics

### Resource Usage
- **Durable Object**: One per active session
- **WebSocket Connections**: One per player per session
- **SQLite Storage**: ~1KB per player, ~100 bytes per roll
- **Memory**: Minimal overhead for session state

### Scalability
- **Sessions**: Limited by Durable Object count (Free plan: 1000/day)
- **Players per Session**: Limited by WebSocket connections (~100 practical)
- **Roll History**: Automatic cleanup after 24 hours
- **Geographic**: Durable Objects placed near first player

## Monitoring & Analytics

### Session Metrics
- Active session count
- Average session duration
- Players per session
- Roll frequency
- Connection success rate

### Error Tracking
- WebSocket connection failures
- Durable Object errors
- Session creation failures
- Player join/leave issues

## Future Enhancements

### Potential Features
- Voice chat integration
- Custom dice themes per session
- Session recording/replay
- Tournament brackets
- Dice animation synchronization
- Chat functionality
- Session moderation tools

### Technical Improvements
- Regional Durable Object placement
- Connection pooling
- Advanced reconnection strategies
- Session migration capabilities

---

## Summary

This design maintains DaggerDice's current simplicity while adding powerful multiplayer capabilities as an optional enhancement. The architecture ensures:

1. **Zero impact** on existing solo users
2. **Seamless integration** for multiplayer users
3. **Robust fallbacks** for reliability
4. **Scalable foundation** for future features

The implementation prioritizes user experience by making sessions discoverable through simple URL sharing while maintaining the application's lightweight, focused nature.