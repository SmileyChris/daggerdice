import { describe, it, expect, beforeEach } from 'vitest';

// Mock Alpine component data structure
interface DiceRollerData {
  // Roll type state
  rollType: 'check' | 'damage' | 'gm';
  
  // Check roll state
  hopeValue: number;
  fearValue: number;
  advantageType: 'none' | 'advantage' | 'disadvantage';
  advantageValue: number;
  modifier: number;
  
  // Damage roll state
  baseDiceCount: number;
  baseDiceType: 4 | 6 | 8 | 10 | 12;
  bonusDieEnabled: boolean;
  bonusDieType: 4 | 6 | 8 | 10 | 12;
  isCritical: boolean;
  hasResistance: boolean;
  
  // GM roll state
  gmModifier: number;
  gmPrivateRolls: boolean;
  
  // UI state
  showKeyboardHelp: boolean;
  isRolling: boolean;
  result: string;
  
  // Methods
  setRollType: (type: 'check' | 'damage' | 'gm') => void;
  setAdvantageType: (type: 'none' | 'advantage' | 'disadvantage') => void;
  setBaseDiceCount: (count: number) => void;
  setBaseDiceType: (type: number) => void;
  toggleBonusDie: () => void;
  setBonusDieType: (type: number) => void;
  toggleCritical: () => void;
  toggleResistance: () => void;
}

// Helper to create a mock dice roller component
function createMockDiceRoller(): DiceRollerData {
  const data: DiceRollerData = {
    // Roll type state
    rollType: 'check',
    
    // Check roll state
    hopeValue: 0,
    fearValue: 0,
    advantageType: 'none',
    advantageValue: 0,
    modifier: 0,
    
    // Damage roll state
    baseDiceCount: 1,
    baseDiceType: 6,
    bonusDieEnabled: false,
    bonusDieType: 6,
    isCritical: false,
    hasResistance: false,
    
    // GM roll state
    gmModifier: 0,
    gmPrivateRolls: false,
    
    // UI state
    showKeyboardHelp: false,
    isRolling: false,
    result: '',
    
    // Methods
    setRollType(type: 'check' | 'damage' | 'gm') {
      this.rollType = type;
    },
    
    setAdvantageType(type: 'none' | 'advantage' | 'disadvantage') {
      this.advantageType = type;
      if (type === 'none') {
        this.advantageValue = 0;
      }
    },
    
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
    }
  };
  
  return data;
}

describe('Roll Type State Management', () => {
  let roller: DiceRollerData;
  
  beforeEach(() => {
    roller = createMockDiceRoller();
  });
  
  describe('setRollType', () => {
    it('should switch between roll types', () => {
      expect(roller.rollType).toBe('check');
      
      roller.setRollType('damage');
      expect(roller.rollType).toBe('damage');
      
      roller.setRollType('gm');
      expect(roller.rollType).toBe('gm');
      
      roller.setRollType('check');
      expect(roller.rollType).toBe('check');
    });
  });
  
  describe('Check Roll State', () => {
    it('should manage advantage type', () => {
      expect(roller.advantageType).toBe('none');
      expect(roller.advantageValue).toBe(0);
      
      roller.setAdvantageType('advantage');
      expect(roller.advantageType).toBe('advantage');
      
      roller.setAdvantageType('disadvantage');
      expect(roller.advantageType).toBe('disadvantage');
      
      roller.setAdvantageType('none');
      expect(roller.advantageType).toBe('none');
      expect(roller.advantageValue).toBe(0);
    });
    
    it('should have correct initial check roll state', () => {
      expect(roller.hopeValue).toBe(0);
      expect(roller.fearValue).toBe(0);
      expect(roller.modifier).toBe(0);
      expect(roller.advantageType).toBe('none');
      expect(roller.advantageValue).toBe(0);
    });
  });
  
  describe('Damage Roll State', () => {
    it('should manage base dice count', () => {
      expect(roller.baseDiceCount).toBe(1);
      
      roller.setBaseDiceCount(3);
      expect(roller.baseDiceCount).toBe(3);
      
      // Test bounds
      roller.setBaseDiceCount(0);
      expect(roller.baseDiceCount).toBe(1); // Min is 1
      
      roller.setBaseDiceCount(15);
      expect(roller.baseDiceCount).toBe(10); // Max is 10
    });
    
    it('should manage base dice type', () => {
      expect(roller.baseDiceType).toBe(6);
      
      roller.setBaseDiceType(8);
      expect(roller.baseDiceType).toBe(8);
      
      roller.setBaseDiceType(12);
      expect(roller.baseDiceType).toBe(12);
      
      // Invalid type should not change
      roller.setBaseDiceType(7);
      expect(roller.baseDiceType).toBe(12);
    });
    
    it('should toggle bonus die', () => {
      expect(roller.bonusDieEnabled).toBe(false);
      
      roller.toggleBonusDie();
      expect(roller.bonusDieEnabled).toBe(true);
      
      roller.toggleBonusDie();
      expect(roller.bonusDieEnabled).toBe(false);
    });
    
    it('should manage bonus die type', () => {
      expect(roller.bonusDieType).toBe(6);
      
      roller.setBonusDieType(10);
      expect(roller.bonusDieType).toBe(10);
      
      // Invalid type should not change
      roller.setBonusDieType(9);
      expect(roller.bonusDieType).toBe(10);
    });
    
    it('should toggle critical hits', () => {
      expect(roller.isCritical).toBe(false);
      
      roller.toggleCritical();
      expect(roller.isCritical).toBe(true);
      
      roller.toggleCritical();
      expect(roller.isCritical).toBe(false);
    });
    
    it('should toggle resistance', () => {
      expect(roller.hasResistance).toBe(false);
      
      roller.toggleResistance();
      expect(roller.hasResistance).toBe(true);
      
      roller.toggleResistance();
      expect(roller.hasResistance).toBe(false);
    });
  });
  
  describe('GM Roll State', () => {
    it('should have correct initial GM roll state', () => {
      expect(roller.gmModifier).toBe(0);
      expect(roller.gmPrivateRolls).toBe(false);
    });
  });
  
  describe('Valid Dice Types', () => {
    it('should only accept valid dice types', () => {
      const validTypes = [4, 6, 8, 10, 12];
      
      validTypes.forEach(type => {
        roller.setBaseDiceType(type);
        expect(roller.baseDiceType).toBe(type);
      });
      
      // Test invalid types
      const invalidTypes = [3, 5, 7, 9, 11, 13, 20, 100];
      const initialType = roller.baseDiceType;
      
      invalidTypes.forEach(type => {
        roller.setBaseDiceType(type);
        expect(roller.baseDiceType).toBe(initialType); // Should not change
      });
    });
  });
});

describe('Roll Type Integration', () => {
  it('should maintain separate state for each roll type', () => {
    const roller = createMockDiceRoller();
    
    // Set up check roll state
    roller.setRollType('check');
    roller.modifier = 5;
    roller.setAdvantageType('advantage');
    
    // Switch to damage roll and set state
    roller.setRollType('damage');
    roller.setBaseDiceCount(3);
    roller.setBaseDiceType(8);
    roller.toggleCritical();
    
    // Switch to GM roll and set state
    roller.setRollType('gm');
    roller.gmModifier = 3;
    roller.gmPrivateRolls = true;
    
    // Verify states are maintained when switching back
    roller.setRollType('check');
    expect(roller.modifier).toBe(5);
    expect(roller.advantageType).toBe('advantage');
    
    roller.setRollType('damage');
    expect(roller.baseDiceCount).toBe(3);
    expect(roller.baseDiceType).toBe(8);
    expect(roller.isCritical).toBe(true);
    
    roller.setRollType('gm');
    expect(roller.gmModifier).toBe(3);
    expect(roller.gmPrivateRolls).toBe(true);
  });
});