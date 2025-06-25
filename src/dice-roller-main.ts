// Import Alpine.js and DiceBox from local node_modules
import DiceBox from '@3d-dice/dice-box';
import Alpine from 'alpinejs';
import './dice-roller.css';

// PWA functionality
if ('serviceWorker' in navigator) {
  // For now, just register the manifest - no service worker
  console.log('PWA manifest support available');
}

// Import session-related modules
import { SessionClient } from './session/session-client.js';
import type { Player, RollData, SharedRollHistoryItem } from './session/types.js';
import { 
  generateSessionId, 
  sanitizePlayerName, 
  getSessionIdFromUrl, 
  extractSessionIdFromUrl,
  normalizeSessionId,
  isValidSessionId,
  isSessionEnvironmentSupported,
  saveRollHistory,
  getSavedRollHistory,
  createSessionUrl,
  copyToClipboard,
  getSavedPlayerName,
  getLastSessionId,
  clearSavedSessionData,
  clearLastSessionId,
  savePlayerName,
  saveLastSessionId,
  getShortCode
} from './session/utils.js';
import { sessionIdToFriendlyName } from './session/room-names.js';

// Type declarations for missing modules
interface DiceBoxInstance {
  roll: (dice: Array<{ sides: number; theme: string; themeColor: string }>) => Promise<Array<{ value: number }>>;
  init: () => Promise<void>;
}

interface ToastManagerInstance {
  show: (type: string, content: string, duration?: number) => void;
  showRollToast: (roll: SharedRollHistoryItem) => void;
}

declare global {
  interface Window {
    diceBox: DiceBoxInstance;
    diceRoller: () => object;
    toastManager: () => ToastManagerInstance;
  }
}

// Global dice box instance
let diceBox: DiceBoxInstance | null = null;

// Use SharedRollHistoryItem for all roll history (solo and multiplayer)
// For solo mode, playerId/playerName/timestamp will be undefined
type RollHistoryItem = SharedRollHistoryItem;

// Global toast manager instance
let globalToastManager: ToastManagerInstance | null = null;

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
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      globalToastManager = this;
    },

    show(type: string, content: string, duration = 4000) {
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
      const resultText = roll.result.replace(/<[^>]*>/g, ''); // Strip HTML
      let diceDetails = '';
      
      // Build dice details based on roll type
      if (roll.rollType === 'check') {
        // Hope/Fear check roll
        diceDetails = `
          <span class="hope">Hope: ${roll.hopeValue}</span>
          <span class="fear">Fear: ${roll.fearValue}</span>
          ${roll.advantageValue && roll.advantageValue !== 0 ? `<span class="${roll.advantageValue > 0 ? 'advantage' : 'disadvantage'}">${roll.advantageValue > 0 ? 'Adv' : 'Dis'}: ${Math.abs(roll.advantageValue)}</span>` : ''}
          ${roll.modifier && roll.modifier !== 0 ? `<span>Mod: ${roll.modifier > 0 ? '+' : ''}${roll.modifier}</span>` : ''}
        `;
      } else if (roll.rollType === 'damage') {
        // Damage roll
        const diceStr = `${roll.baseDiceCount}d${roll.baseDiceType}`;
        diceDetails = `
          <span>Dice: ${diceStr}</span>
          ${roll.bonusDieEnabled && roll.bonusDieType ? `<span>Bonus: d${roll.bonusDieType}</span>` : ''}
          ${roll.damageModifier && roll.damageModifier !== 0 ? `<span>Mod: ${roll.damageModifier > 0 ? '+' : ''}${roll.damageModifier}</span>` : ''}
          ${roll.isCritical ? '<span class="critical">Critical!</span>' : ''}
          ${roll.hasResistance ? '<span>Resisted</span>' : ''}
        `;
      } else if (roll.rollType === 'gm') {
        // GM roll
        diceDetails = `
          <span>d20: ${roll.d20Value}</span>
          ${roll.gmAdvantageType && roll.gmAdvantageType !== 'none' && roll.d20Value2 ? `<span>${roll.gmAdvantageType === 'advantage' ? 'Adv' : 'Dis'}: ${roll.d20Value2}</span>` : ''}
          ${roll.gmModifier && roll.gmModifier !== 0 ? `<span>Mod: ${roll.gmModifier > 0 ? '+' : ''}${roll.gmModifier}</span>` : ''}
          ${roll.gmPrivate ? '<span>Private</span>' : ''}
        `;
      }
      
      const content = `
        <div class="toast-player">${roll.playerName} rolled:</div>
        <div class="toast-result">${resultText}</div>
        <div class="toast-dice">${diceDetails}</div>
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
    result: '',
    isRolling: false,
    rollHistory: [] as RollHistoryItem[],
    showHistory: false,
    advantageType: 'none' as 'none' | 'advantage' | 'disadvantage',
    advantageValue: 0,
    modifier: 0,

    // ===== ROLL TYPE STATE =====
    rollType: 'check' as 'check' | 'damage' | 'gm',
    
    // Damage roll state
    baseDiceCount: 1,
    baseDiceType: 6 as 4 | 6 | 8 | 10 | 12,
    bonusDieEnabled: false,
    bonusDieType: 6 as 4 | 6 | 8 | 10 | 12,
    damageModifier: 0,
    isCritical: false,
    hasResistance: false,
    
    // GM roll state
    gmModifier: 0,
    d20Value: 0,
    d20Value2: 0, // Second d20 for advantage/disadvantage
    gmAdvantageType: 'none' as 'none' | 'advantage' | 'disadvantage',
    gmPrivateRolls: false,
    
    // Keyboard shortcuts
    showKeyboardHelp: false,

    // ===== NEW SESSION STATE (ADDITIVE) =====
    sessionMode: 'solo' as 'solo' | 'multiplayer',
    sessionId: null as string | null,
    playerName: '',
    joinSessionId: '',
    connectedPlayers: [] as Player[],
    sessionClient: null as SessionClient | null,
    showSessionUI: false,
    sessionFeaturesAvailable: true,
    connectionStatus: 'disconnected' as 'disconnected' | 'connecting' | 'connected' | 'error',
    initialized: false,
    connectionMonitorInterval: null as number | null,
    
    // Streamer mode state
    streamerMode: false,
    streamerModeTemporarilyDisabled: false,
    
    // Version display
    appVersion: __APP_VERSION__,

    setAdvantageType(type: 'none' | 'advantage' | 'disadvantage') {
      this.advantageType = type;
      if (type === 'none') {
        this.advantageValue = 0;
      }
    },

    setGMAdvantageType(type: 'none' | 'advantage' | 'disadvantage') {
      this.gmAdvantageType = type;
      if (type === 'none') {
        this.d20Value2 = 0;
      }
    },

    // Roll type methods
    setRollType(type: 'check' | 'damage' | 'gm') {
      // Only trigger transition if the roll type is actually changing
      if (this.rollType === type) {
        return;
      }
      
      // Use View Transitions API if available
      if (document.startViewTransition) {
        document.startViewTransition(() => {
          this.rollType = type;
          this.result = '';
        });
      } else {
        this.rollType = type;
        this.result = '';
      }
    },

    // Damage roll methods
    setBaseDiceCount(count: number) {
      this.baseDiceCount = Math.max(1, Math.min(10, count));
    },

    setBaseDiceType(type: number) {
      if ([4, 6, 8, 10, 12].includes(type)) {
        this.baseDiceType = type as 4 | 6 | 8 | 10 | 12;
      }
    },

    toggleBonusDie() {
      this.bonusDieEnabled = !this.bonusDieEnabled;
    },

    setBonusDieType(type: number) {
      if ([4, 6, 8, 10, 12].includes(type)) {
        this.bonusDieType = type as 4 | 6 | 8 | 10 | 12;
      }
    },

    toggleCritical() {
      this.isCritical = !this.isCritical;
    },

    toggleResistance() {
      this.hasResistance = !this.hasResistance;
    },

    // Mobile-specific dialog methods
    toggleModifiersDialog() {
      // For mobile modifiers dialog
      const dialogData = this.$data;
      if ('showModifiers' in dialogData) {
        dialogData.showModifiers = !dialogData.showModifiers;
      }
    },

    toggleActionsDialog() {
      // For mobile actions dialog
      const dialogData = this.$data;
      if ('showActions' in dialogData) {
        dialogData.showActions = !dialogData.showActions;
      }
    },

    async rollDice() {
      if (this.isRolling || !window.diceBox) {
        return;
      }

      this.isRolling = true;
      this.result = '';

      try {
        let diceArray = [];
        let rollResult;
        let resultText = '';
        let totalValue = 0;
        let rollData: RollData = { rollType: this.rollType, total: 0, result: '' };

        if (this.rollType === 'check') {
          // Check roll: Hope & Fear dice
          diceArray = [
            { sides: 12, theme: 'default', themeColor: '#4caf50' }, // Hope die (green)
            { sides: 12, theme: 'default', themeColor: '#f44336' }, // Fear die (red)
          ];

          // Add advantage/disadvantage D6 if needed
          if (this.advantageType !== 'none') {
            diceArray.push({
              sides: 6,
              theme: 'smooth',
              themeColor:
                this.advantageType === 'advantage' ? '#d2ffd2' : '#ffd2d2',
            });
          }

          rollResult = await window.diceBox.roll(diceArray);

          console.log('Roll result:', rollResult);

          // Extract the values from the roll result
          if (rollResult && rollResult.length >= 2) {
            this.hopeValue = rollResult[0].value;
            this.fearValue = rollResult[1].value;

            // Handle advantage/disadvantage D6
            if (this.advantageType !== 'none' && rollResult.length >= 3) {
              const d6Value = rollResult[2].value;
              this.advantageValue =
                this.advantageType === 'advantage' ? d6Value : -d6Value;
            } else {
              this.advantageValue = 0;
            }
          } else {
            // Fallback to random values if dice-box fails
            this.hopeValue = Math.floor(Math.random() * 12) + 1;
            this.fearValue = Math.floor(Math.random() * 12) + 1;

            if (this.advantageType !== 'none') {
              const d6Value = Math.floor(Math.random() * 6) + 1;
              this.advantageValue =
                this.advantageType === 'advantage' ? d6Value : -d6Value;
            } else {
              this.advantageValue = 0;
            }
          }

          // Calculate total with modifiers
          const baseTotal = this.hopeValue + this.fearValue;
          const finalTotal = baseTotal + this.advantageValue + this.modifier;

          // Calculate result text
          let modifierText = '';

          if (this.advantageValue !== 0 || this.modifier !== 0) {
            const parts = [baseTotal.toString()];
            if (this.advantageValue !== 0) {
              parts.push(
                `${this.advantageValue > 0 ? '+' : '-'} ${Math.abs(
                  this.advantageValue
                )} ${this.advantageType}`
              );
            }
            if (this.modifier !== 0) {
              parts.push(
                `${this.modifier > 0 ? '+' : '-'} ${Math.abs(
                  this.modifier
                )} modifier`
              );
            }
            modifierText = ` <small>(${parts.join(' ')})</small>`;
          }

          if (this.hopeValue === this.fearValue) {
            resultText = 'Critical Success!';
          } else if (this.hopeValue > this.fearValue) {
            resultText = `${finalTotal} with hope${modifierText}`;
          } else {
            resultText = `${finalTotal} with fear${modifierText}`;
          }

          totalValue = finalTotal;
          rollData = {
            rollType: 'check',
            hopeValue: this.hopeValue,
            fearValue: this.fearValue,
            advantageValue: this.advantageValue,
            advantageType: this.advantageType,
            modifier: this.modifier,
            total: finalTotal,
            result: resultText,
          };

        } else if (this.rollType === 'damage') {
          // Damage roll
          diceArray = [];
          for (let i = 0; i < this.baseDiceCount; i++) {
            diceArray.push({
              sides: this.baseDiceType,
              theme: 'default',
              themeColor: '#ff9800'
            });
          }

          // Add bonus die if enabled
          if (this.bonusDieEnabled) {
            diceArray.push({
              sides: this.bonusDieType,
              theme: 'smooth',
              themeColor: '#ffd54f'
            });
          }

          rollResult = await window.diceBox.roll(diceArray);

          const baseDiceValues = [];
          let bonusDieValue = 0;
          let damageTotal = 0;

          if (rollResult && rollResult.length >= this.baseDiceCount) {
            // Extract base dice values
            for (let i = 0; i < this.baseDiceCount; i++) {
              baseDiceValues.push(rollResult[i].value);
              damageTotal += rollResult[i].value;
            }

            // Handle bonus die
            if (this.bonusDieEnabled && rollResult.length > this.baseDiceCount) {
              bonusDieValue = rollResult[this.baseDiceCount].value;
              damageTotal += bonusDieValue;
            }
          } else {
            // Fallback to random values
            for (let i = 0; i < this.baseDiceCount; i++) {
              const value = Math.floor(Math.random() * this.baseDiceType) + 1;
              baseDiceValues.push(value);
              damageTotal += value;
            }

            if (this.bonusDieEnabled) {
              bonusDieValue = Math.floor(Math.random() * this.bonusDieType) + 1;
              damageTotal += bonusDieValue;
            }
          }

          // Apply critical (max base dice + normal roll + modifier)
          if (this.isCritical) {
            // Calculate max possible damage for base dice only
            const maxBaseDamage = this.baseDiceCount * this.baseDiceType;
            
            // Critical = max base dice + normal roll + modifier
            damageTotal = maxBaseDamage + damageTotal + this.damageModifier;
          } else {
            // Add flat modifier for non-critical hits
            damageTotal += this.damageModifier;
          }

          // Apply resistance (half damage, round down)
          if (this.hasResistance) {
            damageTotal = Math.floor(damageTotal / 2);
          }

          // Ensure damage doesn't go below 0
          damageTotal = Math.max(0, damageTotal);

          resultText = this.isCritical ? `${damageTotal} damage (critical)` : `${damageTotal} damage`;
          totalValue = damageTotal;

          rollData = {
            rollType: 'damage',
            baseDiceCount: this.baseDiceCount,
            baseDiceType: this.baseDiceType,
            baseDiceValues: baseDiceValues,
            bonusDieEnabled: this.bonusDieEnabled,
            bonusDieType: this.bonusDieType,
            bonusDieValue: bonusDieValue,
            damageModifier: this.damageModifier,
            isCritical: this.isCritical,
            hasResistance: this.hasResistance,
            total: damageTotal,
            result: resultText
          };

        } else if (this.rollType === 'gm') {
          // GM roll: d20 with optional advantage/disadvantage
          diceArray = [{
            sides: 20,
            theme: 'default',
            themeColor: '#8e44ad'
          }];

          // Add second d20 for advantage/disadvantage
          if (this.gmAdvantageType !== 'none') {
            diceArray.push({
              sides: 20,
              theme: 'default', 
              themeColor: this.gmAdvantageType === 'advantage' ? '#9b59b6' : '#6a0dad'
            });
          }

          rollResult = await window.diceBox.roll(diceArray);

          if (rollResult && rollResult.length >= 1) {
            this.d20Value = rollResult[0].value;
            
            if (this.gmAdvantageType !== 'none' && rollResult.length >= 2) {
              this.d20Value2 = rollResult[1].value;
            } else if (this.gmAdvantageType !== 'none') {
              this.d20Value2 = Math.floor(Math.random() * 20) + 1;
            } else {
              this.d20Value2 = 0;
            }
          } else {
            this.d20Value = Math.floor(Math.random() * 20) + 1;
            if (this.gmAdvantageType !== 'none') {
              this.d20Value2 = Math.floor(Math.random() * 20) + 1;
            } else {
              this.d20Value2 = 0;
            }
          }

          // Calculate final d20 value based on advantage/disadvantage
          let finalD20Value: number;
          if (this.gmAdvantageType === 'advantage') {
            finalD20Value = Math.max(this.d20Value, this.d20Value2);
          } else if (this.gmAdvantageType === 'disadvantage') {
            finalD20Value = Math.min(this.d20Value, this.d20Value2);
          } else {
            finalD20Value = this.d20Value;
          }

          totalValue = finalD20Value + this.gmModifier;
          
          // Format result text
          if (this.gmAdvantageType !== 'none') {
            const advantageLabel = this.gmAdvantageType === 'advantage' ? 'Adv.' : 'Dis.';
            if (this.gmModifier !== 0) {
              resultText = `${totalValue} GM <small>(${this.d20Value} and ${this.d20Value2} w/ ${advantageLabel}, ${this.gmModifier > 0 ? '+' : ''}${this.gmModifier})</small>`;
            } else {
              resultText = `${finalD20Value} GM <small>(${this.d20Value} and ${this.d20Value2} w/ ${advantageLabel})</small>`;
            }
          } else {
            if (this.gmModifier !== 0) {
              resultText = `${totalValue} GM <small>(${this.gmModifier > 0 ? '+' : ''}${this.gmModifier})</small>`;
            } else {
              resultText = `${finalD20Value} GM`;
            }
          }

          rollData = {
            rollType: 'gm',
            d20Value: this.d20Value,
            d20Value2: this.d20Value2,
            gmAdvantageType: this.gmAdvantageType,
            gmModifier: this.gmModifier,
            gmPrivate: this.gmPrivateRolls,
            total: totalValue,
            result: resultText
          };
        }

        this.result = resultText;

        // ===== ROLL HISTORY HANDLING =====
        // Create unified roll history item
        const historyItem: RollHistoryItem = {
          ...rollData,
          playerId: this.sessionMode === 'multiplayer' && this.sessionClient ? this.sessionClient.getPlayerId() || '' : undefined,
          playerName: this.sessionMode === 'multiplayer' ? this.playerName : undefined,
          timestamp: this.sessionMode === 'multiplayer' ? Date.now() : undefined
        };

        console.log('Adding own roll to history:', historyItem);
        this.rollHistory.unshift(historyItem);

        // Limit history (20 for multiplayer, 10 for solo)
        const maxHistory = this.sessionMode === 'multiplayer' ? 20 : 10;
        if (this.rollHistory.length > maxHistory) {
          this.rollHistory = this.rollHistory.slice(0, maxHistory);
        }

        // Save to localStorage for solo play
        if (this.sessionMode === 'solo') {
          saveRollHistory(this.rollHistory);
        }

        // In multiplayer: broadcast and sync with session client
        if (this.sessionMode === 'multiplayer' && this.sessionClient) {
          // Session client uses same history reference
          this.sessionClient.setRollHistory(this.rollHistory);
          
          // Broadcast to other players (only broadcast if not a private GM roll)
          if (!(this.rollType === 'gm' && rollData.gmPrivate)) {
            this.sessionClient.broadcastRoll(rollData);
          }
        }
      } catch (error) {
        console.error('Error rolling dice:', error);
        // Simplified fallback - just show error
        this.result = 'Error rolling dice';
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
      
      // Reset temporary streamer mode override when dialog is closed
      if (!this.showSessionUI) {
        this.streamerModeTemporarilyDisabled = false;
      }
    },

    toggleStreamerMode() {
      this.streamerMode = !this.streamerMode;
      // Save preference to localStorage
      if (this.streamerMode) {
        localStorage.setItem('daggerdice_streamer_mode', 'true');
      } else {
        localStorage.removeItem('daggerdice_streamer_mode');
      }
    },

    temporarilyShowRoomDetails() {
      if (!this.streamerMode) {
        return; // Streamer mode not active
      }
      
      const confirmed = confirm('Temporarily show room details? They will be hidden again when you close this dialog.');
      if (confirmed) {
        this.streamerModeTemporarilyDisabled = true;
      }
    },

    get isJoinSessionValid() {
      const trimmed = this.joinSessionId.trim();
      // Empty is valid (for creating room), non-empty must be valid (for joining)
      return !trimmed || isValidSessionId(trimmed);
    },

    get effectiveStreamerMode() {
      return this.streamerMode && !this.streamerModeTemporarilyDisabled;
    },

    get sessionShortCode() {
      return this.sessionId ? getShortCode(this.sessionId) : '';
    },

    get formattedRoomName() {
      if (!this.sessionId) {
return '';
}
      // Convert "kind-monk" to "Kind Monk Room"
      return this.sessionId
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ') + ' Room';
    },

    handleRoomIdChange() {
      const input = this.joinSessionId.trim();
      
      // If input looks like a URL, try to extract session ID from it
      if (input.includes('/room/') || input.startsWith('http')) {
        const extractedId = extractSessionIdFromUrl(input);
        if (extractedId) {
          this.joinSessionId = extractedId;
          return;
        }
      }
      
      // Clear localStorage if room ID is empty
      if (!input) {
        clearLastSessionId();
      }
    },

    async createSession() {
      // Form validation ensures player name is filled before button is enabled
      
      // Prevent multiple concurrent connection attempts
      if (this.connectionStatus === 'connecting') {
        console.warn('Already connecting, please wait');
        return;
      }

      // Disconnect existing session if any
      if (this.sessionClient) {
        console.log('Disconnecting existing session client');
        this.sessionClient.disconnect();
        this.sessionClient = null;
        // Small delay to ensure cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      try {
        this.connectionStatus = 'connecting';
        const sessionId = generateSessionId();
        const sanitizedName = sanitizePlayerName(this.playerName);
        
        this.sessionClient = new SessionClient();
        this.setupSessionEventHandlers();
        
        const connected = await this.sessionClient.connect(sessionId, sanitizedName);
        
        if (connected) {
          this.sessionMode = 'multiplayer';
          this.sessionId = sessionId;
          this.playerName = sanitizedName;
          // Use session client's state as source of truth
          this.connectionStatus = this.sessionClient.getConnectionState();
          
          // Clear roll history when creating multiplayer room
          this.rollHistory = [];
          
          // Save player name and session ID
          savePlayerName(sanitizedName);
          saveLastSessionId(sessionId);
          
          // Update URL without page reload (unless in streamer mode)
          // Only update URL if we're not already in a room URL to prevent oscillation
          if (!this.streamerMode && !window.location.pathname.startsWith('/room/')) {
            // Convert short codes to friendly names for better UX
            let urlSessionId = sessionId;
            if (/^[0-9A-Z]{3}$/i.test(sessionId)) {
              const friendlyName = sessionIdToFriendlyName(sessionId);
              if (friendlyName !== sessionId) {
                urlSessionId = friendlyName;
              }
            }
            history.pushState({}, '', `/room/${urlSessionId}`);
          }
          
          // Start heartbeat and connection monitoring
          this.sessionClient.startHeartbeat();
          this.startConnectionMonitoring();
        } else {
          throw new Error('Failed to connect to session');
        }
      } catch (error) {
        console.error('Failed to create session:', error);
        this.connectionStatus = 'error';
        
        // Provide more specific error message
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.includes('WebSocket') || errorMessage.includes('connection')) {
          alert('Failed to connect. Please check your internet connection and try again.');
        } else if (errorMessage.includes('session')) {
          alert('Failed to create room. Please try again or contact support if the problem persists.');
        } else {
          alert('Failed to create room. Please try again.');
        }
        
        this.leaveSession();
      }
    },

    async joinSession() {
      // Form validation ensures these are valid before button is enabled
      const normalizedSessionId = normalizeSessionId(this.joinSessionId);
      if (!normalizedSessionId) {
        console.error('Invalid session ID passed validation');
        return;
      }

      // Prevent multiple concurrent connection attempts
      if (this.connectionStatus === 'connecting') {
        console.warn('Already connecting, please wait');
        return;
      }

      // Disconnect existing session if any
      if (this.sessionClient) {
        console.log('Disconnecting existing session client');
        this.sessionClient.disconnect();
        this.sessionClient = null;
        // Small delay to ensure cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      try {
        this.connectionStatus = 'connecting';
        const sanitizedName = sanitizePlayerName(this.playerName);
        
        this.sessionClient = new SessionClient();
        this.setupSessionEventHandlers();
        
        const connected = await this.sessionClient.connect(normalizedSessionId, sanitizedName);
        
        if (connected) {
          this.sessionMode = 'multiplayer';
          this.sessionId = normalizedSessionId;
          this.playerName = sanitizedName;
          // Use session client's state as source of truth
          this.connectionStatus = this.sessionClient.getConnectionState();
          
          // Clear roll history when joining multiplayer
          this.rollHistory = [];
          
          // Save player name and session ID
          savePlayerName(sanitizedName);
          saveLastSessionId(normalizedSessionId);
          
          // Update URL without page reload and use normalized ID (unless in streamer mode)
          // Only update URL if we're not already in a room URL to prevent oscillation
          if (!this.streamerMode && !window.location.pathname.startsWith('/room/')) {
            // Convert short codes to friendly names for better UX
            let urlSessionId = normalizedSessionId;
            if (/^[0-9A-Z]{3}$/i.test(normalizedSessionId)) {
              const friendlyName = sessionIdToFriendlyName(normalizedSessionId);
              if (friendlyName !== normalizedSessionId) {
                urlSessionId = friendlyName;
              }
            }
            history.pushState({}, '', `/room/${urlSessionId}`);
          }
          
          // Start heartbeat
          this.sessionClient.startHeartbeat();
        } else {
          throw new Error('Failed to join session');
        }
      } catch (error) {
        console.error('Failed to join session:', error);
        this.connectionStatus = 'error';
        
        // Provide more specific error message
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.includes('WebSocket') || errorMessage.includes('connection')) {
          alert('Failed to connect to room. Please check your internet connection and try again.');
        } else if (errorMessage.includes('session')) {
          alert('Failed to join session. The room may not exist or may be full.');
        } else {
          alert('Failed to join room. Please try again or contact support if the problem persists.');
        }
        
        this.leaveSession();
      }
    },

    leaveSession(clearSavedData = false) {
      // Preserve current session ID for easy rejoining
      const currentSessionId = this.sessionId;
      
      // Stop connection monitoring
      this.stopConnectionMonitoring();
      
      if (this.sessionClient) {
        this.sessionClient.disconnect();
        this.sessionClient = null;
      }
      
      this.sessionMode = 'solo';
      this.sessionId = null;
      this.connectedPlayers = [];
      this.connectionStatus = 'disconnected';
      
      // Reset temporary streamer mode override when leaving session
      this.streamerModeTemporarilyDisabled = false;
      
      // Load solo roll history when switching to solo mode
      this.rollHistory = getSavedRollHistory();
      
      // Clear saved session data if requested
      if (clearSavedData) {
        clearSavedSessionData();
        this.playerName = '';
        this.joinSessionId = '';
      } else {
        // Keep the room ID populated for easy rejoining
        if (currentSessionId) {
          this.joinSessionId = currentSessionId;
        }
      }
      
      // Return to solo URL (unless in streamer mode)
      if (!this.streamerMode) {
        history.pushState({}, '', '/');
      }
    },

    async copySessionLink() {
      if (!this.sessionId) {
        return;
      }
      
      // Always use friendly name format for sharing URLs
      let shareableSessionId = this.sessionId;
      if (/^[0-9A-Z]{3}$/i.test(this.sessionId)) {
        // If current sessionId is a short code, convert to friendly name
        shareableSessionId = sessionIdToFriendlyName(this.sessionId);
      }
      
      const url = createSessionUrl(shareableSessionId);
      const success = await copyToClipboard(url);
      
      if (success) {
        // You could show a toast notification here
        console.log('Room link copied to clipboard');
      } else {
        alert('Failed to copy link. Please copy manually: ' + url);
      }
    },

    startConnectionMonitoring() {
      // Stop any existing monitoring
      this.stopConnectionMonitoring();
      
      // Monitor connection health every 5 seconds
      this.connectionMonitorInterval = window.setInterval(() => {
        if (this.sessionClient && this.sessionMode === 'multiplayer') {
          const actualState = this.sessionClient.getConnectionState();
          if (this.connectionStatus !== actualState) {
            console.log('Connection state mismatch detected. UI:', this.connectionStatus, 'Actual:', actualState);
            this.connectionStatus = actualState;
          }
          
          // Check connection health
          if (actualState === 'connected' && !this.sessionClient.isConnectionHealthy()) {
            console.warn('Connection appears unhealthy despite being marked as connected');
          }
        }
      }, 5000);
    },
    
    stopConnectionMonitoring() {
      if (this.connectionMonitorInterval) {
        clearInterval(this.connectionMonitorInterval);
        this.connectionMonitorInterval = null;
      }
    },

    setupSessionEventHandlers() {
      if (!this.sessionClient) {
        return;
      }
      
      this.sessionClient.setEventHandlers({
        onConnected: (playerId: string) => {
          console.log('Connected to session with player ID:', playerId);
          // Use the session client's connection state as source of truth
          this.connectionStatus = this.sessionClient.getConnectionState();
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
          // Use the session client's connection state as source of truth
          this.connectionStatus = this.sessionClient?.getConnectionState() || 'error';
        },
        
        onDisconnected: () => {
          console.log('Disconnected from session');
          // Use the session client's connection state as source of truth
          this.connectionStatus = this.sessionClient?.getConnectionState() || 'disconnected';
        }
      });
    },

    generateQRCode(sessionId: string): string {
      if (!sessionId) {
        return '';
      }
      const roomUrl = createSessionUrl(sessionId);
      const encodedUrl = encodeURIComponent(roomUrl);
      // Using qr-server.com API for QR code generation
      return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodedUrl}`;
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

      // Load saved streamer mode preference
      this.streamerMode = localStorage.getItem('daggerdice_streamer_mode') === 'true';

      // Load saved roll history (only for solo play)
      if (!this.sessionMode || this.sessionMode === 'solo') {
        this.rollHistory = getSavedRollHistory();
      }
      
      // Set up keyboard shortcuts
      document.addEventListener('keydown', (e) => {
        // Don't trigger shortcuts when typing in inputs
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }

        // Handle shortcuts
        switch(e.key.toLowerCase()) {
          case ' ':
            e.preventDefault();
            this.rollDice();
            break;
          case 'c':
            this.setRollType('check');
            break;
          case 'd':
            this.setRollType('damage');
            break;
          case 'g':
            this.setRollType('gm');
            break;
          case 'h':
            this.toggleHistory();
            break;
          case 'm':
            if (this.sessionFeaturesAvailable) {
              this.toggleSessionUI();
            }
            break;
          case '?':
            this.showKeyboardHelp = true;
            break;
          case 'escape':
            this.showKeyboardHelp = false;
            this.showSessionUI = false;
            this.showHistory = false;
            break;
          case 'arrowleft':
            if (this.rollType === 'check') {
              this.modifier = Math.max(this.modifier - 1, -20);
            } else if (this.rollType === 'gm') {
              this.gmModifier = Math.max(this.gmModifier - 1, -20);
            } else if (this.rollType === 'damage') {
              this.damageModifier = Math.max(this.damageModifier - 1, -20);
            }
            break;
          case 'arrowright':
            if (this.rollType === 'check') {
              this.modifier = Math.min(this.modifier + 1, 20);
            } else if (this.rollType === 'gm') {
              this.gmModifier = Math.min(this.gmModifier + 1, 20);
            } else if (this.rollType === 'damage') {
              this.damageModifier = Math.min(this.damageModifier + 1, 20);
            }
            break;
          case 'arrowup':
            if (this.rollType === 'damage') {
              // Cycle up through dice types: d4 -> d6 -> d8 -> d10 -> d12
              const diceTypes = [4, 6, 8, 10, 12];
              const currentIndex = diceTypes.indexOf(this.baseDiceType);
              if (currentIndex < diceTypes.length - 1) {
                this.setBaseDiceType(diceTypes[currentIndex + 1]);
              }
            }
            break;
          case 'arrowdown':
            if (this.rollType === 'damage') {
              // Cycle down through dice types: d12 -> d10 -> d8 -> d6 -> d4
              const diceTypes = [4, 6, 8, 10, 12];
              const currentIndex = diceTypes.indexOf(this.baseDiceType);
              if (currentIndex > 0) {
                this.setBaseDiceType(diceTypes[currentIndex - 1]);
              }
            }
            break;
          case '+':
          case '=': // Handle both + and = keys (since + requires shift)
            if (this.rollType === 'damage') {
              e.preventDefault();
              this.setBaseDiceCount(this.baseDiceCount + 1);
            }
            break;
          case '-':
            if (this.rollType === 'damage') {
              e.preventDefault();
              this.setBaseDiceCount(this.baseDiceCount - 1);
            }
            break;
        }
      });
      
      // Auto-join if URL contains session ID and we have a saved name
      const urlSessionId = getSessionIdFromUrl();
      if (urlSessionId && this.sessionFeaturesAvailable) {
        // Convert short codes to friendly names for better UX (unless in streamer mode)
        if (!this.streamerMode && /^[0-9A-Z]{3}$/i.test(urlSessionId)) {
          const friendlyName = sessionIdToFriendlyName(urlSessionId);
          if (friendlyName !== urlSessionId) {
            // Replace URL with friendly name version
            history.replaceState({}, '', `/room/${friendlyName}`);
          }
        }
        
        // Use the original session ID for joining (maintains compatibility)
        this.joinSessionId = urlSessionId;
        
        // If streamer mode is active, clear the URL immediately to hide room code
        if (this.streamerMode) {
          history.replaceState({}, '', '/');
        }
        
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
document.addEventListener('DOMContentLoaded', function () {
  console.log('DOM loaded, initializing dice-box');

  // Initialize dice-box with configuration
  // Use smaller dice scale on mobile devices
  const isMobile = window.innerWidth <= 768;
  const diceScale = isMobile ? 7 : 10;
  
  diceBox = new DiceBox({
    container: '#dice-box',
    assetPath: '/assets/',
    theme: 'default',
    themeColor: '#4caf50',
    scale: diceScale,
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
      console.log('Dice-box initialized successfully');
    })
    .catch((error: unknown) => {
      console.error('Failed to initialize dice-box:', error);
    });

  // Make diceBox available globally for Alpine.js
  window.diceBox = diceBox;
});

// Register Alpine.js components globally
window.diceRoller = diceRoller;
window.toastManager = toastManager;

// Start Alpine.js
Alpine.start();
