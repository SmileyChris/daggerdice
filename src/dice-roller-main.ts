// Import Alpine.js and DiceBox from local node_modules
import DiceBox from "@3d-dice/dice-box";
import Alpine from "alpinejs";
import "./dice-roller.css";

// Import session-related modules
import { SessionClient } from "./session/session-client.js";
import type { Player, RollData, SharedRollHistoryItem } from "./session/types.js";
import { 
  generateSessionId, 
  sanitizePlayerName, 
  getSessionIdFromUrl, 
  normalizeSessionId,
  isValidSessionId,
  isSessionEnvironmentSupported,
  createSessionUrl,
  copyToClipboard,
  getSavedPlayerName,
  getLastSessionId,
  clearSavedSessionData,
  clearLastSessionId,
  savePlayerName,
  saveLastSessionId
} from "./session/utils.js";

// Type declarations for missing modules
declare global {
  interface Window {
    diceBox: any;
    diceRoller: () => any;
    toastManager: () => any;
  }
}

// Global dice box instance
let diceBox: any = null;

// Use SharedRollHistoryItem for all roll history (solo and multiplayer)
// For solo mode, playerId/playerName/timestamp will be undefined
type RollHistoryItem = SharedRollHistoryItem;

// Global toast manager instance
let globalToastManager: any = null;

// Toast manager for notifications
function toastManager() {
  return {
    toasts: [] as Array<{
      id: number;
      type: string;
      content: string;
      visible: boolean;
    }>,
    nextId: 1,

    init() {
      globalToastManager = this;
    },

    show(type: string, content: string, duration: number = 4000) {
      const toast = {
        id: this.nextId++,
        type,
        content,
        visible: true
      };

      this.toasts.push(toast);

      // Auto-remove after duration
      setTimeout(() => {
        this.remove(toast.id);
      }, duration);
    },

    remove(id: number) {
      const index = this.toasts.findIndex(t => t.id === id);
      if (index !== -1) {
        this.toasts[index].visible = false;
        // Remove from array after animation
        setTimeout(() => {
          this.toasts.splice(index, 1);
        }, 300);
      }
    },

    showRollToast(roll: SharedRollHistoryItem) {
      // Main result line
      let mainResult = '';
      if (!roll.rollType || roll.rollType === 'check') {
        const outcomeText = roll.result.includes('hope') ? ' with hope' : 
                           roll.result.includes('fear') ? ' with fear' : 
                           ' Critical Success!';
        mainResult = `<strong>${roll.total}</strong>${outcomeText}`;
      } else if (roll.rollType === 'damage') {
        mainResult = `<strong>${roll.total}</strong> damage`;
      } else if (roll.rollType === 'gm') {
        mainResult = `<strong>${roll.total}</strong> GM`;
      }
      
      // Details line
      let details = '';
      if (!roll.rollType || roll.rollType === 'check') {
        const parts = [`${roll.hopeValue} Hope`, `${roll.fearValue} Fear`];
        if (roll.advantageValue && roll.advantageValue !== 0) {
          parts.push(`${Math.abs(roll.advantageValue)} ${roll.advantageValue > 0 ? 'Adv.' : 'Disadv.'}`);
        }
        if (roll.modifier !== undefined && roll.modifier !== 0) {
          parts.push(`${roll.modifier > 0 ? '+' : ''}${roll.modifier}`);
        }
        details = parts.join(', ');
      } else if (roll.rollType === 'damage') {
        const parts = [`${roll.baseDiceCount}d${roll.baseDiceType}`];
        if (roll.bonusDieEnabled) {
          parts.push(`Bonus: 1d${roll.bonusDieType}`);
        }
        if (roll.isCritical) {
          parts.push('<span class="critical-text">Critical</span>');
        }
        if (roll.hasResistance) {
          parts.push('<span class="resistance-text">Resistance</span>');
        }
        details = parts.join(', ');
      } else if (roll.rollType === 'gm') {
        const parts = [`d20: ${roll.d20Value}`];
        if (roll.gmModifier !== 0) {
          parts.push(`Modifier: ${roll.gmModifier > 0 ? '+' : ''}${roll.gmModifier}`);
        }
        details = parts.join(', ');
      }
      
      const content = `
        <div class="toast-player">${roll.playerName} rolled:</div>
        <div class="toast-main-result">${mainResult}</div>
        <div class="toast-details">${details}</div>
      `;
      this.show('roll', content, 5000);
    }
  };
}

// Alpine.js component for UI
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

    // ===== NEW ROLL TYPE STATE =====
    rollType: "check" as "check" | "damage" | "gm",
    
    // Damage roll state
    baseDiceCount: 1,
    baseDiceType: 8 as 4 | 6 | 8 | 10 | 12,
    baseDiceValues: [] as number[],
    bonusDieEnabled: false,
    bonusDieType: 6 as 4 | 6 | 8 | 10 | 12,
    bonusDieValue: 0,
    isCritical: false,
    hasResistance: false,
    
    // GM roll state
    gmModifier: 0,
    d20Value: 0,

    // ===== NEW SESSION STATE (ADDITIVE) =====
    sessionMode: "solo" as "solo" | "multiplayer",
    sessionId: null as string | null,
    playerName: "",
    joinSessionId: "",
    connectedPlayers: [] as Player[],
    sessionClient: null as SessionClient | null,
    showSessionUI: false,
    sessionFeaturesAvailable: true,
    connectionStatus: "disconnected" as "disconnected" | "connecting" | "connected" | "error",
    initialized: false,

    setAdvantageType(type: "none" | "advantage" | "disadvantage") {
      this.advantageType = type;
      if (type === "none") {
        this.advantageValue = 0;
      }
    },

    setRollType(type: "check" | "damage" | "gm") {
      this.rollType = type;
      this.result = "";
    },

    setBaseDiceCount(count: number) {
      this.baseDiceCount = Math.max(1, Math.min(10, count));
    },

    setBaseDiceType(type: 4 | 6 | 8 | 10 | 12) {
      this.baseDiceType = type;
    },

    setBonusDieType(type: 4 | 6 | 8 | 10 | 12) {
      this.bonusDieType = type;
    },

    toggleBonusDie() {
      this.bonusDieEnabled = !this.bonusDieEnabled;
    },

    toggleCritical() {
      this.isCritical = !this.isCritical;
    },

    toggleResistance() {
      this.hasResistance = !this.hasResistance;
    },

    async rollDice() {
      if (this.isRolling || !window.diceBox) return;

      this.isRolling = true;
      this.result = "";

      try {
        if (this.rollType === "check") {
          await this.rollCheckDice();
        } else if (this.rollType === "damage") {
          await this.rollDamageDice();
        } else if (this.rollType === "gm") {
          await this.rollGMDice();
        }
      } catch (error) {
        console.error("Error rolling dice:", error);
        await this.handleRollError();
      } finally {
        this.isRolling = false;
      }
    },

    async rollCheckDice() {
      // Prepare dice array - always roll two D12 dice
      const diceArray = [
        { sides: 12, theme: "default", themeColor: "#4caf50" }, // Hope die (green)
        { sides: 12, theme: "default", themeColor: "#f44336" }, // Fear die (red)
      ];

      // Add advantage/disadvantage D6 if needed
      if (this.advantageType !== "none") {
        diceArray.push({
          sides: 6,
          theme: "smooth",
          themeColor: this.advantageType === "advantage" ? "#d2ffd2" : "#ffd2d2",
        });
      }

      const rollResult = await window.diceBox.roll(diceArray);
      console.log("Check roll result:", rollResult);

      // Extract the values from the roll result
      if (rollResult && rollResult.length >= 2) {
        this.hopeValue = rollResult[0].value;
        this.fearValue = rollResult[1].value;

        // Handle advantage/disadvantage D6
        if (this.advantageType !== "none" && rollResult.length >= 3) {
          const d6Value = rollResult[2].value;
          this.advantageValue = this.advantageType === "advantage" ? d6Value : -d6Value;
        } else {
          this.advantageValue = 0;
        }
      } else {
        // Fallback to random values
        this.hopeValue = Math.floor(Math.random() * 12) + 1;
        this.fearValue = Math.floor(Math.random() * 12) + 1;
        
        if (this.advantageType !== "none") {
          const d6Value = Math.floor(Math.random() * 6) + 1;
          this.advantageValue = this.advantageType === "advantage" ? d6Value : -d6Value;
        } else {
          this.advantageValue = 0;
        }
      }

      // Calculate total and result
      const baseTotal = this.hopeValue + this.fearValue;
      const finalTotal = baseTotal + this.advantageValue + this.modifier;

      let resultText = "";
      let modifierText = "";

      if (this.advantageValue !== 0 || this.modifier !== 0) {
        const parts = [baseTotal.toString()];
        if (this.advantageValue !== 0) {
          parts.push(`${this.advantageValue > 0 ? "+" : "-"} ${Math.abs(this.advantageValue)} ${this.advantageType}`);
        }
        if (this.modifier !== 0) {
          parts.push(`${this.modifier > 0 ? "+" : "-"} ${Math.abs(this.modifier)} modifier`);
        }
        modifierText = ` <small>(${parts.join(" ")})</small>`;
      }

      if (this.hopeValue === this.fearValue) {
        resultText = "Critical Success!";
      } else if (this.hopeValue > this.fearValue) {
        resultText = `${finalTotal} with hope${modifierText}`;
      } else {
        resultText = `${finalTotal} with fear${modifierText}`;
      }

      this.result = resultText;
      this.addRollToHistory("check", finalTotal, resultText);
    },

    async rollDamageDice() {
      const diceArray = [];
      
      // Add base damage dice
      for (let i = 0; i < this.baseDiceCount; i++) {
        diceArray.push({
          sides: this.baseDiceType,
          theme: "default",
          themeColor: "#ff6b35" // Orange for damage dice
        });
      }

      // Add bonus die if enabled
      if (this.bonusDieEnabled) {
        diceArray.push({
          sides: this.bonusDieType,
          theme: "smooth",
          themeColor: "#ffd700" // Gold for bonus die
        });
      }

      const rollResult = await window.diceBox.roll(diceArray);
      console.log("Damage roll result:", rollResult);

      let baseDiceValues = [];
      let bonusDieValue = 0;

      if (rollResult && rollResult.length >= this.baseDiceCount) {
        // Extract base dice values
        for (let i = 0; i < this.baseDiceCount; i++) {
          baseDiceValues.push(rollResult[i].value);
        }
        
        // Extract bonus die value if enabled
        if (this.bonusDieEnabled && rollResult.length > this.baseDiceCount) {
          bonusDieValue = rollResult[this.baseDiceCount].value;
        }
      } else {
        // Fallback to random values
        for (let i = 0; i < this.baseDiceCount; i++) {
          baseDiceValues.push(Math.floor(Math.random() * this.baseDiceType) + 1);
        }
        if (this.bonusDieEnabled) {
          bonusDieValue = Math.floor(Math.random() * this.bonusDieType) + 1;
        }
      }

      // Calculate damage
      let baseDamage = baseDiceValues.reduce((sum, val) => sum + val, 0);
      let criticalDamage = 0;
      
      if (this.isCritical) {
        criticalDamage = this.baseDiceCount * this.baseDiceType; // Max value for base dice
        baseDamage += criticalDamage;
      }
      
      const totalDamage = baseDamage + bonusDieValue;
      const finalDamage = this.hasResistance ? Math.floor(totalDamage / 2) : totalDamage;

      // Format result text
      let resultParts = [];
      
      if (this.isCritical) {
        resultParts.push(`${criticalDamage} + (${baseDiceValues.join("+")})`);
      } else {
        resultParts.push(baseDiceValues.join("+"));
      }
      
      if (this.bonusDieEnabled && bonusDieValue > 0) {
        resultParts.push(`${bonusDieValue}`);
      }

      let resultText = resultParts.join(" + ") + ` = ${totalDamage}`;
      
      if (this.hasResistance) {
        resultText += ` → ${finalDamage}`;
      }
      
      if (this.isCritical) {
        resultText += " (Critical!)";
      }
      
      if (this.hasResistance) {
        resultText += " (Resistance)";
      }

      this.result = resultText;
      
      // Store dice values for history
      this.baseDiceValues = baseDiceValues;
      this.bonusDieValue = bonusDieValue;
      
      this.addRollToHistory("damage", finalDamage, resultText);
    },

    async rollGMDice() {
      const diceArray = [
        { sides: 20, theme: "default", themeColor: "#8e44ad" } // Purple for GM die
      ];

      const rollResult = await window.diceBox.roll(diceArray);
      console.log("GM roll result:", rollResult);

      if (rollResult && rollResult.length >= 1) {
        this.d20Value = rollResult[0].value;
      } else {
        // Fallback to random value
        this.d20Value = Math.floor(Math.random() * 20) + 1;
      }

      const finalTotal = this.d20Value + this.gmModifier;
      
      let resultText = `d20: ${this.d20Value}`;
      if (this.gmModifier !== 0) {
        resultText += ` ${this.gmModifier > 0 ? "+" : ""}${this.gmModifier} = ${finalTotal}`;
      }

      this.result = resultText;
      this.addRollToHistory("gm", finalTotal, resultText);
    },

    addRollToHistory(rollType: string, total: number, result: string) {
      // Create roll data for session sharing
      const rollData: any = {
        rollType,
        total,
        result,
        hopeValue: this.rollType === "check" ? this.hopeValue : undefined,
        fearValue: this.rollType === "check" ? this.fearValue : undefined,
        advantageValue: this.rollType === "check" ? this.advantageValue : undefined,
        advantageType: this.rollType === "check" ? this.advantageType : undefined,
        modifier: this.rollType === "check" ? this.modifier : undefined,
        d20Value: this.rollType === "gm" ? this.d20Value : undefined,
        gmModifier: this.rollType === "gm" ? this.gmModifier : undefined,
        baseDiceCount: this.rollType === "damage" ? this.baseDiceCount : undefined,
        baseDiceType: this.rollType === "damage" ? this.baseDiceType : undefined,
        baseDiceValues: this.rollType === "damage" ? this.baseDiceValues : undefined,
        bonusDieEnabled: this.rollType === "damage" ? this.bonusDieEnabled : undefined,
        bonusDieType: this.rollType === "damage" ? this.bonusDieType : undefined,
        bonusDieValue: this.rollType === "damage" ? this.bonusDieValue : undefined,
        isCritical: this.rollType === "damage" ? this.isCritical : undefined,
        hasResistance: this.rollType === "damage" ? this.hasResistance : undefined,
      };

      // Create unified roll history item
      const historyItem: RollHistoryItem = {
        ...rollData,
        playerId: this.sessionMode === "multiplayer" && this.sessionClient ? this.sessionClient.getPlayerId() || '' : undefined,
        playerName: this.sessionMode === "multiplayer" ? this.playerName : undefined,
        timestamp: this.sessionMode === "multiplayer" ? Date.now() : undefined
      };

      console.log('Adding roll to history:', historyItem);
      this.rollHistory.unshift(historyItem);

      // Limit history
      const maxHistory = this.sessionMode === "multiplayer" ? 20 : 10;
      if (this.rollHistory.length > maxHistory) {
        this.rollHistory = this.rollHistory.slice(0, maxHistory);
      }

      // In multiplayer: broadcast and sync
      if (this.sessionMode === "multiplayer" && this.sessionClient) {
        this.sessionClient.setRollHistory(this.rollHistory);
        this.sessionClient.broadcastRoll(rollData);
      }
    },

    async handleRollError() {
      if (this.rollType === "check") {
        // Fallback for check rolls
        this.hopeValue = Math.floor(Math.random() * 12) + 1;
        this.fearValue = Math.floor(Math.random() * 12) + 1;
        
        if (this.advantageType !== "none") {
          const d6Value = Math.floor(Math.random() * 6) + 1;
          this.advantageValue = this.advantageType === "advantage" ? d6Value : -d6Value;
        } else {
          this.advantageValue = 0;
        }

        const baseTotal = this.hopeValue + this.fearValue;
        const finalTotal = baseTotal + this.advantageValue + this.modifier;

        if (this.hopeValue === this.fearValue) {
          this.result = `Critical Success! Total: ${finalTotal}`;
        } else if (this.hopeValue > this.fearValue) {
          this.result = `Total: ${finalTotal} with hope`;
        } else {
          this.result = `Total: ${finalTotal} with fear`;
        }
      } else if (this.rollType === "gm") {
        // Fallback for GM rolls
        this.d20Value = Math.floor(Math.random() * 20) + 1;
        const finalTotal = this.d20Value + this.gmModifier;
        this.result = `d20: ${this.d20Value} + ${this.gmModifier} = ${finalTotal}`;
      }
      // Damage rolls fallback would be more complex, keeping simple for now
    },

    toggleHistory() {
      this.showHistory = !this.showHistory;
    },

    // ===== NEW SESSION METHODS (ADDITIVE) =====
    toggleSessionUI() {
      this.showSessionUI = !this.showSessionUI;
    },

    get isJoinSessionValid() {
      return !this.joinSessionId.trim() || isValidSessionId(this.joinSessionId.trim());
    },

    handleRoomIdChange() {
      // Convert to uppercase
      this.joinSessionId = this.joinSessionId.toUpperCase();
      
      // Clear localStorage if room ID is empty
      if (!this.joinSessionId.trim()) {
        clearLastSessionId();
      }
    },

    async createSession() {
      if (!this.playerName.trim()) {
        alert('Please enter your name');
        return;
      }

      // Prevent multiple session clients
      if (this.sessionClient) {
        console.warn('Session client already exists, disconnecting old one');
        this.sessionClient.disconnect();
      }

      try {
        this.connectionStatus = "connecting";
        const sessionId = generateSessionId();
        const sanitizedName = sanitizePlayerName(this.playerName);
        
        this.sessionClient = new SessionClient();
        this.setupSessionEventHandlers();
        
        const connected = await this.sessionClient.connect(sessionId, sanitizedName);
        
        if (connected) {
          this.sessionMode = "multiplayer";
          this.sessionId = sessionId;
          this.playerName = sanitizedName;
          this.connectionStatus = "connected";
          
          // Save player name and session ID
          savePlayerName(sanitizedName);
          saveLastSessionId(sessionId);
          
          // Update URL without page reload
          history.pushState({}, '', `/room/${sessionId}`);
          
          // Start heartbeat
          this.sessionClient.startHeartbeat();
        } else {
          throw new Error('Failed to connect to session');
        }
      } catch (error) {
        console.error('Failed to create session:', error);
        this.connectionStatus = "error";
        alert('Failed to create room. Please try again.');
        this.leaveSession();
      }
    },

    async joinSession() {
      if (!this.playerName.trim() || !this.joinSessionId.trim()) {
        alert('Please enter your name and room ID');
        return;
      }

      // Prevent multiple session clients
      if (this.sessionClient) {
        console.warn('Session client already exists, disconnecting old one');
        this.sessionClient.disconnect();
      }

      // Normalize session ID to uppercase
      const normalizedSessionId = normalizeSessionId(this.joinSessionId);
      if (!normalizedSessionId) {
        alert('Room ID must be exactly 6 characters (letters and numbers only)');
        return;
      }

      try {
        this.connectionStatus = "connecting";
        const sanitizedName = sanitizePlayerName(this.playerName);
        
        this.sessionClient = new SessionClient();
        this.setupSessionEventHandlers();
        
        const connected = await this.sessionClient.connect(normalizedSessionId, sanitizedName);
        
        if (connected) {
          this.sessionMode = "multiplayer";
          this.sessionId = normalizedSessionId;
          this.playerName = sanitizedName;
          this.connectionStatus = "connected";
          
          // Save player name and session ID
          savePlayerName(sanitizedName);
          saveLastSessionId(normalizedSessionId);
          
          // Update URL without page reload and use normalized ID
          history.pushState({}, '', `/room/${normalizedSessionId}`);
          
          // Start heartbeat
          this.sessionClient.startHeartbeat();
        } else {
          throw new Error('Failed to join session');
        }
      } catch (error) {
        console.error('Failed to join session:', error);
        this.connectionStatus = "error";
        alert('Failed to join room. Please check the room ID and try again.');
        this.leaveSession();
      }
    },

    leaveSession(clearSavedData = false) {
      // Preserve current session ID for easy rejoining
      const currentSessionId = this.sessionId;
      
      if (this.sessionClient) {
        this.sessionClient.disconnect();
        this.sessionClient = null;
      }
      
      this.sessionMode = "solo";
      this.sessionId = null;
      this.connectedPlayers = [];
      this.connectionStatus = "disconnected";
      
      // Clear saved session data if requested
      if (clearSavedData) {
        clearSavedSessionData();
        this.playerName = "";
        this.joinSessionId = "";
      } else {
        // Keep the room ID populated for easy rejoining
        if (currentSessionId) {
          this.joinSessionId = currentSessionId;
        }
      }
      
      // Return to solo URL
      history.pushState({}, '', '/');
    },

    async copySessionLink() {
      if (!this.sessionId) return;
      
      const url = createSessionUrl(this.sessionId);
      const success = await copyToClipboard(url);
      
      if (success) {
        // You could show a toast notification here
        console.log('Room link copied to clipboard');
      } else {
        alert('Failed to copy link. Please copy manually: ' + url);
      }
    },

    setupSessionEventHandlers() {
      if (!this.sessionClient) return;
      
      this.sessionClient.setEventHandlers({
        onConnected: (playerId: string) => {
          console.log('Connected to session with player ID:', playerId);
          this.connectionStatus = "connected";
        },
        
        onPlayerJoined: (player: Player, isInitialResponse?: boolean) => {
          console.log('Player joined:', player.name, 'Initial response:', isInitialResponse);
          const existingIndex = this.connectedPlayers.findIndex(p => p.id === player.id);
          const isNewPlayer = existingIndex === -1;
          
          if (isNewPlayer) {
            this.connectedPlayers.push(player);
            
            // Show toast notification for new players (but not for ourselves when first joining)
            // Don't show toasts for initial responses (existing players telling us they're here)
            if (this.sessionClient && player.id !== this.sessionClient.getPlayerId() && !isInitialResponse) {
              if (globalToastManager) {
                globalToastManager.show('info', `<strong>${player.name}</strong> joined the room`, 4000);
              }
            }
          } else {
            this.connectedPlayers[existingIndex] = player;
          }
        },
        
        onPlayerLeft: (playerId: string) => {
          console.log('Player left:', playerId);
          
          // Find the player who left to show their name in the toast
          const leavingPlayer = this.connectedPlayers.find(p => p.id === playerId);
          if (leavingPlayer && globalToastManager) {
            globalToastManager.show('info', `<strong>${leavingPlayer.name}</strong> left the room`, 4000);
          }
          
          this.connectedPlayers = this.connectedPlayers.filter(p => p.id !== playerId);
        },
        
        onRollReceived: (roll: SharedRollHistoryItem) => {
          console.log('Roll received from player:', roll.playerName, 'ID:', roll.playerId);
          console.log('My player ID:', this.sessionClient?.getPlayerId());
          // Only add incoming rolls from OTHER players to avoid duplicates of our own rolls
          if (roll.playerId !== this.sessionClient?.getPlayerId()) {
            console.log('Adding received roll to history:', roll);
            this.rollHistory.unshift(roll);
            console.log('Roll history after adding received roll:', this.rollHistory);
            
            // Show toast notification for the received roll
            if (globalToastManager) {
              globalToastManager.showRollToast(roll);
            }
            
            // Sync with session client
            if (this.sessionClient) {
              this.sessionClient.setRollHistory(this.rollHistory);
            }
            
            // Limit history to 20 items in multiplayer
            if (this.rollHistory.length > 20) {
              this.rollHistory = this.rollHistory.slice(0, 20);
            }
          } else {
            console.log('Ignoring own roll (already added locally)');
          }
        },
        
        onHistoryReceived: (rolls: SharedRollHistoryItem[]) => {
          console.log('History received:', rolls.length, 'rolls');
          // Replace local history with session history
          this.rollHistory = [...rolls];
        },
        
        onError: (error: string) => {
          console.error('Session error:', error);
          this.connectionStatus = "error";
        },
        
        onDisconnected: () => {
          console.log('Disconnected from session');
          this.connectionStatus = "disconnected";
        }
      });
    },

    init() {
      // Prevent multiple initializations
      if (this.initialized) {
        console.warn('Alpine component already initialized, skipping');
        return;
      }
      this.initialized = true;
      
      console.log('Initializing Alpine component');
      
      // Feature detection
      this.sessionFeaturesAvailable = isSessionEnvironmentSupported();
      
      // Load saved player name and last session ID
      this.playerName = getSavedPlayerName();
      const lastSessionId = getLastSessionId();
      if (lastSessionId) {
        this.joinSessionId = lastSessionId;
      }
      
      // Auto-join if URL contains session ID and we have a saved name
      const urlSessionId = getSessionIdFromUrl();
      if (urlSessionId && this.sessionFeaturesAvailable) {
        this.joinSessionId = urlSessionId;
        
        if (this.playerName.trim()) {
          // Auto-join if we have a saved name
          console.log('Auto-joining session with saved name');
          this.joinSession();
        } else {
          // Show UI to get player name and focus the name field
          this.showSessionUI = true;
          
          // Focus the player name input after a short delay to ensure DOM is ready
          setTimeout(() => {
            const nameInput = document.querySelector('.player-name-input') as HTMLInputElement;
            if (nameInput) {
              nameInput.focus();
            }
          }, 100);
        }
      }
    },
  };
}

// Initialize dice-box when the page loads
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded, initializing dice-box");

  // Initialize dice-box with configuration
  diceBox = new DiceBox({
    container: "#dice-box",
    assetPath: "/assets/",
    theme: "default",
    themeColor: "#4caf50",
    scale: 10,
    gravity: 1.5,
    mass: 1,
    friction: 0.8,
    restitution: 0.5,
    angularDamping: 0.4,
    linearDamping: 0.5,
    spinForce: 6,
    throwForce: 5,
    startingHeight: 8,
    settleTimeout: 5000,
    offscreen: false,
    delay: 10,
    enableShadows: true,
    lightIntensity: 0.9,
    suspendSimulation: false,
  });

  // Initialize the dice box
  diceBox
    .init()
    .then(() => {
      console.log("Dice-box initialized successfully");
    })
    .catch((error: any) => {
      console.error("Failed to initialize dice-box:", error);
    });

  // Make diceBox available globally for Alpine.js
  window.diceBox = diceBox;
});

// Register Alpine.js components globally
window.diceRoller = diceRoller;
window.toastManager = toastManager;

// Start Alpine.js
Alpine.start();
