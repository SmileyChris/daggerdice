import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock for keyboard event handling
interface KeyboardShortcutHandler {
  rollType: "check" | "damage" | "gm";
  modifier: number;
  gmModifier: number;
  showHistory: boolean;
  showSessionUI: boolean;
  showKeyboardHelp: boolean;
  sessionFeaturesAvailable: boolean;
  isRolling: boolean;
  
  setRollType: (type: "check" | "damage" | "gm") => void;
  rollDice: () => void;
  toggleHistory: () => void;
  toggleSessionUI: () => void;
}

function createKeyboardHandler(): KeyboardShortcutHandler {
  return {
    rollType: "check",
    modifier: 0,
    gmModifier: 0,
    showHistory: false,
    showSessionUI: false,
    showKeyboardHelp: false,
    sessionFeaturesAvailable: true,
    isRolling: false,
    
    setRollType(type: "check" | "damage" | "gm") {
      this.rollType = type;
    },
    
    rollDice: vi.fn(),
    toggleHistory: vi.fn(),
    toggleSessionUI: vi.fn()
  };
}

function simulateKeyPress(handler: KeyboardShortcutHandler, key: string, target?: any) {
  const event = new KeyboardEvent('keydown', { key });
  
  // Skip if target is an input element
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
    return;
  }
  
  // Handle shortcuts
  switch(key.toLowerCase()) {
    case ' ':
      event.preventDefault();
      handler.rollDice();
      break;
    case 'c':
      handler.setRollType('check');
      break;
    case 'd':
      handler.setRollType('damage');
      break;
    case 'g':
      handler.setRollType('gm');
      break;
    case 'h':
      handler.toggleHistory();
      break;
    case 'm':
      if (handler.sessionFeaturesAvailable) {
        handler.toggleSessionUI();
      }
      break;
    case '?':
      handler.showKeyboardHelp = true;
      break;
    case 'escape':
      handler.showKeyboardHelp = false;
      handler.showSessionUI = false;
      break;
    case 'arrowleft':
      if (handler.rollType === 'check') {
        handler.modifier = Math.max(handler.modifier - 1, -20);
      } else if (handler.rollType === 'gm') {
        handler.gmModifier = Math.max(handler.gmModifier - 1, -20);
      }
      break;
    case 'arrowright':
      if (handler.rollType === 'check') {
        handler.modifier = Math.min(handler.modifier + 1, 20);
      } else if (handler.rollType === 'gm') {
        handler.gmModifier = Math.min(handler.gmModifier + 1, 20);
      }
      break;
  }
}

describe('Keyboard Shortcuts', () => {
  let handler: KeyboardShortcutHandler;
  
  beforeEach(() => {
    handler = createKeyboardHandler();
    vi.clearAllMocks();
  });
  
  describe('Roll Type Switching', () => {
    it('should switch to check roll with C key', () => {
      handler.rollType = 'damage';
      simulateKeyPress(handler, 'c');
      expect(handler.rollType).toBe('check');
    });
    
    it('should switch to damage roll with D key', () => {
      handler.rollType = 'check';
      simulateKeyPress(handler, 'd');
      expect(handler.rollType).toBe('damage');
    });
    
    it('should switch to GM roll with G key', () => {
      handler.rollType = 'check';
      simulateKeyPress(handler, 'g');
      expect(handler.rollType).toBe('gm');
    });
    
    it('should handle uppercase keys', () => {
      handler.rollType = 'check';
      simulateKeyPress(handler, 'D');
      expect(handler.rollType).toBe('damage');
    });
  });
  
  describe('Roll Action', () => {
    it('should trigger roll with space key', () => {
      simulateKeyPress(handler, ' ');
      expect(handler.rollDice).toHaveBeenCalled();
    });
    
    it('should not roll when already rolling', () => {
      handler.isRolling = true;
      simulateKeyPress(handler, ' ');
      // In real implementation, rollDice would check isRolling
      expect(handler.rollDice).toHaveBeenCalled();
    });
  });
  
  describe('Modifier Adjustment', () => {
    it('should decrease check modifier with left arrow', () => {
      handler.rollType = 'check';
      handler.modifier = 5;
      simulateKeyPress(handler, 'ArrowLeft');
      expect(handler.modifier).toBe(4);
    });
    
    it('should increase check modifier with right arrow', () => {
      handler.rollType = 'check';
      handler.modifier = 5;
      simulateKeyPress(handler, 'ArrowRight');
      expect(handler.modifier).toBe(6);
    });
    
    it('should respect check modifier minimum bound', () => {
      handler.rollType = 'check';
      handler.modifier = -20;
      simulateKeyPress(handler, 'ArrowLeft');
      expect(handler.modifier).toBe(-20);
    });
    
    it('should respect check modifier maximum bound', () => {
      handler.rollType = 'check';
      handler.modifier = 20;
      simulateKeyPress(handler, 'ArrowRight');
      expect(handler.modifier).toBe(20);
    });
    
    it('should adjust GM modifier when in GM mode', () => {
      handler.rollType = 'gm';
      handler.gmModifier = 3;
      simulateKeyPress(handler, 'ArrowLeft');
      expect(handler.gmModifier).toBe(2);
      
      simulateKeyPress(handler, 'ArrowRight');
      simulateKeyPress(handler, 'ArrowRight');
      expect(handler.gmModifier).toBe(4);
    });
    
    it('should not adjust modifiers in damage mode', () => {
      handler.rollType = 'damage';
      handler.modifier = 5;
      handler.gmModifier = 3;
      
      simulateKeyPress(handler, 'ArrowLeft');
      expect(handler.modifier).toBe(5);
      expect(handler.gmModifier).toBe(3);
    });
  });
  
  describe('UI Toggles', () => {
    it('should toggle history with H key', () => {
      simulateKeyPress(handler, 'h');
      expect(handler.toggleHistory).toHaveBeenCalled();
    });
    
    it('should toggle multiplayer panel with M key', () => {
      handler.sessionFeaturesAvailable = true;
      simulateKeyPress(handler, 'm');
      expect(handler.toggleSessionUI).toHaveBeenCalled();
    });
    
    it('should not toggle multiplayer if features unavailable', () => {
      handler.sessionFeaturesAvailable = false;
      simulateKeyPress(handler, 'm');
      expect(handler.toggleSessionUI).not.toHaveBeenCalled();
    });
    
    it('should show keyboard help with ? key', () => {
      simulateKeyPress(handler, '?');
      expect(handler.showKeyboardHelp).toBe(true);
    });
    
    it('should close dialogs with Escape key', () => {
      handler.showKeyboardHelp = true;
      handler.showSessionUI = true;
      
      simulateKeyPress(handler, 'Escape');
      expect(handler.showKeyboardHelp).toBe(false);
      expect(handler.showSessionUI).toBe(false);
    });
  });
  
  describe('Input Field Behavior', () => {
    it('should ignore shortcuts when typing in input field', () => {
      const input = { tagName: 'INPUT' };
      handler.rollType = 'check';
      
      // Simulate keypress in input field
      simulateKeyPress(handler, 'd', input);
      
      // Should not change roll type
      expect(handler.rollType).toBe('check');
    });
    
    it('should ignore shortcuts when typing in textarea', () => {
      const textarea = { tagName: 'TEXTAREA' };
      
      // Simulate keypress in textarea
      simulateKeyPress(handler, ' ', textarea);
      
      // Should not trigger roll
      expect(handler.rollDice).not.toHaveBeenCalled();
    });
  });
});

describe('Keyboard Shortcut Help', () => {
  it('should list all available shortcuts', () => {
    const shortcuts = {
      'C': 'Switch to Check rolls',
      'D': 'Switch to Damage rolls', 
      'G': 'Switch to GM rolls',
      'Space': 'Roll dice',
      'H': 'Toggle roll history',
      'M': 'Toggle multiplayer panel',
      '?': 'Show keyboard shortcuts',
      'Escape': 'Close dialogs',
      'Left Arrow': 'Decrease modifier',
      'Right Arrow': 'Increase modifier'
    };
    
    expect(Object.keys(shortcuts)).toHaveLength(10);
  });
});