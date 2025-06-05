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
  isSessionEnvironmentSupported,
  createSessionUrl,
  copyToClipboard 
} from "./session/utils.js";

// Type declarations for missing modules
declare global {
  interface Window {
    diceBox: any;
    diceRoller: () => any;
  }
}

// Global dice box instance
let diceBox: any = null;

interface RollHistoryItem {
  hope: number;
  fear: number;
  advantage: number;
  modifier: number;
  total: number;
  result: string;
  // Optional fields for multiplayer
  playerId?: string;
  playerName?: string;
  timestamp?: number;
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

    setAdvantageType(type: "none" | "advantage" | "disadvantage") {
      this.advantageType = type;
      if (type === "none") {
        this.advantageValue = 0;
      }
    },

    async rollDice() {
      if (this.isRolling || !window.diceBox) return;

      this.isRolling = true;
      this.result = "";

      try {
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
            themeColor:
              this.advantageType === "advantage" ? "#d2ffd2" : "#ffd2d2",
          });
        }

        const rollResult = await window.diceBox.roll(diceArray);

        console.log("Roll result:", rollResult);

        // Extract the values from the roll result
        if (rollResult && rollResult.length >= 2) {
          this.hopeValue = rollResult[0].value;
          this.fearValue = rollResult[1].value;

          // Handle advantage/disadvantage D6
          if (this.advantageType !== "none" && rollResult.length >= 3) {
            const d6Value = rollResult[2].value;
            this.advantageValue =
              this.advantageType === "advantage" ? d6Value : -d6Value;
          } else {
            this.advantageValue = 0;
          }
        } else {
          // Fallback to random values if dice-box fails
          this.hopeValue = Math.floor(Math.random() * 12) + 1;
          this.fearValue = Math.floor(Math.random() * 12) + 1;

          if (this.advantageType !== "none") {
            const d6Value = Math.floor(Math.random() * 6) + 1;
            this.advantageValue =
              this.advantageType === "advantage" ? d6Value : -d6Value;
          } else {
            this.advantageValue = 0;
          }
        }

        // Calculate total with modifiers
        const baseTotal = this.hopeValue + this.fearValue;
        const finalTotal = baseTotal + this.advantageValue + this.modifier;

        // Calculate result text
        let resultText = "";
        let modifierText = "";

        if (this.advantageValue !== 0 || this.modifier !== 0) {
          const parts = [baseTotal.toString()];
          if (this.advantageValue !== 0) {
            parts.push(
              `${this.advantageValue > 0 ? "+" : "-"} ${Math.abs(
                this.advantageValue
              )} ${this.advantageType}`
            );
          }
          if (this.modifier !== 0) {
            parts.push(
              `${this.modifier > 0 ? "+" : "-"} ${Math.abs(
                this.modifier
              )} modifier`
            );
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

        // Create roll data for history and session sharing
        const rollData: RollData = {
          hopeValue: this.hopeValue,
          fearValue: this.fearValue,
          advantageValue: this.advantageValue,
          advantageType: this.advantageType,
          modifier: this.modifier,
          total: finalTotal,
          result: resultText,
        };

        // Add to local roll history
        this.rollHistory.unshift({
          hope: this.hopeValue,
          fear: this.fearValue,
          advantage: this.advantageValue,
          modifier: this.modifier,
          total: finalTotal,
          result: resultText,
        });

        // ===== NEW: BROADCAST IF IN SESSION =====
        if (this.sessionMode === "multiplayer" && this.sessionClient) {
          this.sessionClient.broadcastRoll(rollData);
        }

        // Limit history to 10 items
        if (this.rollHistory.length > 10) {
          this.rollHistory = this.rollHistory.slice(0, 10);
        }
      } catch (error) {
        console.error("Error rolling dice:", error);

        // Fallback to random values
        this.hopeValue = Math.floor(Math.random() * 12) + 1;
        this.fearValue = Math.floor(Math.random() * 12) + 1;

        if (this.advantageType !== "none") {
          const d6Value = Math.floor(Math.random() * 6) + 1;
          this.advantageValue =
            this.advantageType === "advantage" ? d6Value : -d6Value;
        } else {
          this.advantageValue = 0;
        }

        const baseTotal = this.hopeValue + this.fearValue;
        const finalTotal = baseTotal + this.advantageValue + this.modifier;

        let resultText = "";
        let modifierText = "";

        if (this.advantageValue !== 0 || this.modifier !== 0) {
          const parts = [];
          if (this.advantageValue !== 0) {
            parts.push(
              `${this.advantageValue > 0 ? "+" : ""}${this.advantageValue} ${
                this.advantageType
              }`
            );
          }
          if (this.modifier !== 0) {
            parts.push(
              `${this.modifier > 0 ? "+" : ""}${this.modifier} modifier`
            );
          }
          modifierText = ` (${parts.join(", ")})`;
        }

        if (this.hopeValue === this.fearValue) {
          resultText = `Critical Success! Total: ${finalTotal}${modifierText}`;
        } else if (this.hopeValue > this.fearValue) {
          resultText = `Total: ${finalTotal} with hope${modifierText}`;
        } else {
          resultText = `Total: ${finalTotal} with fear${modifierText}`;
        }

        this.result = resultText;
      } finally {
        this.isRolling = false;
      }
    },

    toggleHistory() {
      this.showHistory = !this.showHistory;
    },

    // ===== NEW SESSION METHODS (ADDITIVE) =====
    toggleSessionUI() {
      this.showSessionUI = !this.showSessionUI;
    },

    async createSession() {
      if (!this.playerName.trim()) {
        alert('Please enter your name');
        return;
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
          
          // Update URL without page reload
          history.pushState({}, '', `/session/${sessionId}`);
          
          // Start heartbeat
          this.sessionClient.startHeartbeat();
        } else {
          throw new Error('Failed to connect to session');
        }
      } catch (error) {
        console.error('Failed to create session:', error);
        this.connectionStatus = "error";
        alert('Failed to create session. Please try again.');
        this.leaveSession();
      }
    },

    async joinSession() {
      if (!this.playerName.trim() || !this.joinSessionId.trim()) {
        alert('Please enter your name and session ID');
        return;
      }

      try {
        this.connectionStatus = "connecting";
        const sanitizedName = sanitizePlayerName(this.playerName);
        
        this.sessionClient = new SessionClient();
        this.setupSessionEventHandlers();
        
        const connected = await this.sessionClient.connect(this.joinSessionId, sanitizedName);
        
        if (connected) {
          this.sessionMode = "multiplayer";
          this.sessionId = this.joinSessionId;
          this.playerName = sanitizedName;
          this.connectionStatus = "connected";
          
          // Update URL without page reload
          history.pushState({}, '', `/session/${this.joinSessionId}`);
          
          // Start heartbeat
          this.sessionClient.startHeartbeat();
        } else {
          throw new Error('Failed to join session');
        }
      } catch (error) {
        console.error('Failed to join session:', error);
        this.connectionStatus = "error";
        alert('Failed to join session. Please check the session ID and try again.');
        this.leaveSession();
      }
    },

    leaveSession() {
      if (this.sessionClient) {
        this.sessionClient.disconnect();
        this.sessionClient = null;
      }
      
      this.sessionMode = "solo";
      this.sessionId = null;
      this.connectedPlayers = [];
      this.connectionStatus = "disconnected";
      
      // Return to solo URL
      history.pushState({}, '', '/');
    },

    async copySessionLink() {
      if (!this.sessionId) return;
      
      const url = createSessionUrl(this.sessionId);
      const success = await copyToClipboard(url);
      
      if (success) {
        // You could show a toast notification here
        console.log('Session link copied to clipboard');
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
        
        onPlayerJoined: (player: Player) => {
          console.log('Player joined:', player.name);
          const existingIndex = this.connectedPlayers.findIndex(p => p.id === player.id);
          if (existingIndex === -1) {
            this.connectedPlayers.push(player);
          } else {
            this.connectedPlayers[existingIndex] = player;
          }
        },
        
        onPlayerLeft: (playerId: string) => {
          console.log('Player left:', playerId);
          this.connectedPlayers = this.connectedPlayers.filter(p => p.id !== playerId);
        },
        
        onRollReceived: (roll: SharedRollHistoryItem) => {
          console.log('Roll received:', roll);
          // Add to roll history with player info
          this.rollHistory.unshift({
            hope: roll.hopeValue,
            fear: roll.fearValue,
            advantage: roll.advantageValue,
            modifier: roll.modifier,
            total: roll.total,
            result: roll.result,
            playerId: roll.playerId,
            playerName: roll.playerName,
            timestamp: roll.timestamp
          });
          
          // Limit history to 20 items in multiplayer
          if (this.rollHistory.length > 20) {
            this.rollHistory = this.rollHistory.slice(0, 20);
          }
        },
        
        onHistoryReceived: (rolls: SharedRollHistoryItem[]) => {
          console.log('History received:', rolls.length, 'rolls');
          // Replace local history with session history
          this.rollHistory = rolls.map(roll => ({
            hope: roll.hopeValue,
            fear: roll.fearValue,
            advantage: roll.advantageValue,
            modifier: roll.modifier,
            total: roll.total,
            result: roll.result,
            playerId: roll.playerId,
            playerName: roll.playerName,
            timestamp: roll.timestamp
          }));
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
      // Feature detection
      this.sessionFeaturesAvailable = isSessionEnvironmentSupported();
      
      // Auto-join if URL contains session ID
      const urlSessionId = getSessionIdFromUrl();
      if (urlSessionId && this.sessionFeaturesAvailable) {
        this.joinSessionId = urlSessionId;
        this.showSessionUI = true;
        // Don't auto-join, just show the UI and pre-fill the session ID
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

// Register Alpine.js component globally
window.diceRoller = diceRoller;

// Start Alpine.js
Alpine.start();
