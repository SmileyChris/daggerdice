// Import Alpine.js and DiceBox from local node_modules
import DiceBox from "@3d-dice/dice-box";
import Alpine from "alpinejs";
import "./dice-roller.css";
import QRCode from "qrcode-generator";

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
    daggerDiceKeyboardInitialized: boolean;
  }
  
  interface Document {
    startViewTransition?: (callback: () => void | Promise<void>) => {
      ready: Promise<void>;
      finished: Promise<void>;
      updateCallbackDone: Promise<void>;
    };
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
    gmPrivateRolls: false,

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
    keyboardShortcutsInitialized: false,
    showKeyboardHelp: false,
    
    // Streamer mode state
    streamerMode: false,
    showRoomDetails: true,

    setAdvantageType(type: "none" | "advantage" | "disadvantage") {
      this.advantageType = type;
      if (type === "none") {
        this.advantageValue = 0;
      }
    },

    setRollType(type: "check" | "damage" | "gm") {
      // Only trigger transition if the roll type is actually changing
      if (this.rollType === type) {
        return;
      }
      
      // Use View Transitions API if available
      if (document.startViewTransition) {
        document.startViewTransition(() => {
          this.rollType = type;
          this.result = "";
        });
      } else {
        this.rollType = type;
        this.result = "";
      }
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
      if (this.isRolling || !window.diceBox) {
        return;
      }

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
      
      // Wait a bit longer for dice to physically settle
      // The diceBox.roll() promise resolves when results are calculated,
      // but physics simulation may still be active
      await new Promise(resolve => setTimeout(resolve, 500));

      // Extract the values from the roll result
      if (rollResult && rollResult.length >= 2 && 
          rollResult[0] && typeof rollResult[0].value === 'number' &&
          rollResult[1] && typeof rollResult[1].value === 'number') {
        this.hopeValue = rollResult[0].value;
        this.fearValue = rollResult[1].value;

        // Handle advantage/disadvantage D6
        if (this.advantageType !== "none" && rollResult.length >= 3 && 
            rollResult[2] && typeof rollResult[2].value === 'number') {
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
      let resultText;
      
      if (this.isCritical) {
        // Critical: show max + rolled dice
        resultText = `${criticalDamage} + (${baseDiceValues.join("+")})`; 
        if (this.bonusDieEnabled && bonusDieValue > 0) {
          resultText += ` <small>+${bonusDieValue}</small>`;
        }
        resultText += ` = ${totalDamage}`;
      } else if (baseDiceValues.length > 1 || (this.bonusDieEnabled && bonusDieValue > 0) || this.hasResistance) {
        // Multiple dice or bonus die - show base dice total, then smaller bonus
        resultText = baseDiceValues.join("+");
        if (this.bonusDieEnabled && bonusDieValue > 0) {
          resultText += ` <small>+${bonusDieValue}</small>`;
        }
        resultText += ` = ${totalDamage}`;
      } else {
        // Just show the single value
        resultText = `${totalDamage}`;
      }
      
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

      if (rollResult && rollResult.length >= 1) {
        this.d20Value = rollResult[0].value;
      } else {
        // Fallback to random value
        this.d20Value = Math.floor(Math.random() * 20) + 1;
      }

      const finalTotal = this.d20Value + this.gmModifier;
      
      let resultText = `${this.d20Value}`;
      if (this.gmModifier !== 0) {
        resultText += ` <small>${this.gmModifier > 0 ? "+" : ""}${this.gmModifier}</small> = ${finalTotal}`;
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

      this.rollHistory.unshift(historyItem);

      // Limit history
      const maxHistory = this.sessionMode === "multiplayer" ? 20 : 10;
      if (this.rollHistory.length > maxHistory) {
        this.rollHistory = this.rollHistory.slice(0, maxHistory);
      }

      // In multiplayer: broadcast and sync (unless it's a private GM roll)
      if (this.sessionMode === "multiplayer" && this.sessionClient) {
        const isPrivateGMRoll = rollType === "gm" && this.gmPrivateRolls;
        
        if (!isPrivateGMRoll) {
          this.sessionClient.setRollHistory(this.rollHistory);
          this.sessionClient.broadcastRoll(rollData);
        }
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
        this.result = `${this.d20Value} <small>+${this.gmModifier}</small> = ${finalTotal}`;
      }
      // Damage rolls fallback would be more complex, keeping simple for now
    },

    toggleHistory() {
      // Only toggle if there's history to show
      if (!this.showHistory && this.rollHistory.length === 0) {
        return;
      }
      
      // Use View Transitions API if available
      if (document.startViewTransition) {
        document.startViewTransition(() => {
          this.showHistory = !this.showHistory;
        });
      } else {
        this.showHistory = !this.showHistory;
      }
    },

    // ===== NEW SESSION METHODS (ADDITIVE) =====
    toggleSessionUI() {
      // Use View Transitions API if available
      if (document.startViewTransition) {
        document.startViewTransition(() => {
          this.showSessionUI = !this.showSessionUI;
        });
      } else {
        this.showSessionUI = !this.showSessionUI;
      }
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
          
          // Update URL without page reload (respecting streamer mode)
          if (!this.streamerMode) {
            history.pushState({}, '', `/room/${sessionId}`);
          } else {
            history.pushState({}, '', '/');
          }
          
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
          
          // Update URL without page reload and use normalized ID (respecting streamer mode)
          if (!this.streamerMode) {
            history.pushState({}, '', `/room/${normalizedSessionId}`);
          } else {
            history.pushState({}, '', '/');
          }
          
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
      
      // Use View Transitions API if available
      const updateState = () => {
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
      };

      if (document.startViewTransition) {
        document.startViewTransition(updateState);
      } else {
        updateState();
      }
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

    generateQRCode(sessionId: string): string {
      try {
        const url = createSessionUrl(sessionId);
        const qr = QRCode(0, 'M');
        qr.addData(url);
        qr.make();
        
        return qr.createDataURL(4, 2);
      } catch (error) {
        console.error('Failed to generate QR code:', error);
        return '';
      }
    },

    toggleStreamerMode() {
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
    },

    updateURLForStreamerMode() {
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
    },

    toggleRoomDetails() {
      this.showRoomDetails = !this.showRoomDetails;
    },

    setupSessionEventHandlers() {
      if (!this.sessionClient) return;
      
      this.sessionClient.setEventHandlers({
        onConnected: (playerId: string) => {
          console.log('Connected to session with player ID:', playerId);
          this.connectionStatus = "connected";
        },
        
        onConnecting: () => {
          console.log('Attempting to connect/reconnect to session');
          this.connectionStatus = "connecting";
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
        return;
      }
      this.initialized = true;
      
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
      
      // Setup keyboard shortcuts
      this.setupKeyboardShortcuts();
    },

    setupKeyboardShortcuts() {
      // Prevent duplicate event listeners globally
      if (window.daggerDiceKeyboardInitialized) {
        return;
      }
      window.daggerDiceKeyboardInitialized = true;
      
      document.addEventListener('keydown', (event) => {
        // Ignore shortcuts when typing in inputs or textareas
        const activeElement = document.activeElement;
        if (activeElement && (
          activeElement.tagName === 'INPUT' || 
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'SELECT' ||
          activeElement.isContentEditable
        )) {
          return;
        }

        // Only block modifier and roll actions while rolling
        if (this.isRolling && (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === ' ')) {
          return;
        }

        // For space key, also ignore if a button has focus to prevent double-triggering
        if (event.key === ' ' && activeElement && activeElement.tagName === 'BUTTON') {
          return;
        }

        // Always prevent space key from affecting the page/3D scene
        if (event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          
          // If currently rolling, block ALL space key behavior including button activation
          if (this.isRolling) {
            return;
          }
        }

        const key = event.key.toLowerCase();
        
        // Tab switching: C (Check), D (Damage), G (GM)
        if (key === 'c') {
          event.preventDefault();
          this.setRollType('check');
        } else if (key === 'd') {
          event.preventDefault();
          this.setRollType('damage');
        } else if (key === 'g') {
          event.preventDefault();
          this.setRollType('gm');
        }
        
        // Modifier changes with arrow keys
        else if (key === 'arrowleft') {
          event.preventDefault();
          if (this.rollType === 'check') {
            this.modifier = Math.max(this.modifier - 1, -20);
          } else if (this.rollType === 'gm') {
            this.gmModifier = Math.max(this.gmModifier - 1, -20);
          }
        } else if (key === 'arrowright') {
          event.preventDefault();
          if (this.rollType === 'check') {
            this.modifier = Math.min(this.modifier + 1, 20);
          } else if (this.rollType === 'gm') {
            this.gmModifier = Math.min(this.gmModifier + 1, 20);
          }
        }
        
        // Roll dice with spacebar
        else if (key === ' ' || key === 'space') {
          this.rollDice();
        }
        
        // Toggle history with H
        else if (key === 'h') {
          event.preventDefault();
          this.toggleHistory();
        }
        
        // Toggle multiplayer/session UI with M
        else if (key === 'm') {
          event.preventDefault();
          if (this.sessionFeaturesAvailable) {
            this.toggleSessionUI();
          }
        }
        
        // Show keyboard help with ?
        else if (key === '?' || (event.shiftKey && key === '/')) {
          event.preventDefault();
          this.showKeyboardHelp = true;
        }
        
        // Close dialogs with escape
        else if (key === 'escape') {
          event.preventDefault();
          if (this.showKeyboardHelp) {
            this.showKeyboardHelp = false;
          }
        }
      });
    },

    // Mobile dialog transition methods
    toggleModifiersDialog() {
      if (document.startViewTransition) {
        document.startViewTransition(() => {
          (this as any).showModifiers = !(this as any).showModifiers;
          (this as any).showActions = false;
        });
      } else {
        (this as any).showModifiers = !(this as any).showModifiers;
        (this as any).showActions = false;
      }
    },

    toggleActionsDialog() {
      if (document.startViewTransition) {
        document.startViewTransition(() => {
          (this as any).showActions = !(this as any).showActions;
          (this as any).showModifiers = false;
        });
      } else {
        (this as any).showActions = !(this as any).showActions;
        (this as any).showModifiers = false;
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
