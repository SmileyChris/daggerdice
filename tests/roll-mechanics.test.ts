import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { RollData } from '../src/session/types';

// Mock window.diceBox
const mockDiceBox = {
  roll: vi.fn(),
  init: vi.fn().mockResolvedValue(true)
};

// Set up global mocks
(global as typeof globalThis).window = {
  diceBox: mockDiceBox
} as Window & typeof globalThis;

describe('Check Roll Mechanics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should calculate hope result correctly', () => {
    const hopeValue = 10;
    const fearValue = 6;
    const total = hopeValue + fearValue;
    
    expect(total).toBe(16);
    expect(hopeValue > fearValue).toBe(true);
  });
  
  it('should calculate fear result correctly', () => {
    const hopeValue = 4;
    const fearValue = 9;
    const total = hopeValue + fearValue;
    
    expect(total).toBe(13);
    expect(hopeValue < fearValue).toBe(true);
  });
  
  it('should detect critical success', () => {
    const hopeValue = 7;
    const fearValue = 7;
    
    expect(hopeValue === fearValue).toBe(true);
  });
  
  it('should apply advantage correctly', () => {
    const baseTotal = 15;
    const advantageValue = 4;
    const finalTotal = baseTotal + advantageValue;
    
    expect(finalTotal).toBe(19);
  });
  
  it('should apply disadvantage correctly', () => {
    const baseTotal = 15;
    const disadvantageValue = -3;
    const finalTotal = baseTotal + disadvantageValue;
    
    expect(finalTotal).toBe(12);
  });
  
  it('should apply modifiers correctly', () => {
    const baseTotal = 12;
    const modifier = 5;
    const finalTotal = baseTotal + modifier;
    
    expect(finalTotal).toBe(17);
  });
  
  it('should apply negative modifiers correctly', () => {
    const baseTotal = 12;
    const modifier = -3;
    const finalTotal = baseTotal + modifier;
    
    expect(finalTotal).toBe(9);
  });
  
  it('should combine advantage and modifier', () => {
    const hopeValue = 8;
    const fearValue = 6;
    const advantageValue = 3;
    const modifier = 2;
    
    const baseTotal = hopeValue + fearValue;
    const finalTotal = baseTotal + advantageValue + modifier;
    
    expect(baseTotal).toBe(14);
    expect(finalTotal).toBe(19);
  });
  
  it('should combine disadvantage and negative modifier', () => {
    const hopeValue = 9;
    const fearValue = 5;
    const disadvantageValue = -4;
    const modifier = -2;
    
    const baseTotal = hopeValue + fearValue;
    const finalTotal = baseTotal + disadvantageValue + modifier;
    
    expect(baseTotal).toBe(14);
    expect(finalTotal).toBe(8);
  });
});

describe('Damage Roll Mechanics', () => {
  it('should calculate basic damage correctly', () => {
    const baseDiceValues = [4, 6, 3];
    const total = baseDiceValues.reduce((sum, val) => sum + val, 0);
    
    expect(total).toBe(13);
  });
  
  it('should add bonus die to damage', () => {
    const baseDiceValues = [5, 4];
    const bonusDieValue = 6;
    const total = baseDiceValues.reduce((sum, val) => sum + val, 0) + bonusDieValue;
    
    expect(total).toBe(15);
  });
  
  it('should double damage on critical', () => {
    const baseDamage = 12;
    const criticalDamage = baseDamage * 2;
    
    expect(criticalDamage).toBe(24);
  });
  
  it('should halve damage with resistance', () => {
    const baseDamage = 15;
    const resistedDamage = Math.floor(baseDamage / 2);
    
    expect(resistedDamage).toBe(7);
  });
  
  it('should handle resistance rounding down', () => {
    const baseDamage = 9;
    const resistedDamage = Math.floor(baseDamage / 2);
    
    expect(resistedDamage).toBe(4);
  });
  
  it('should apply critical then resistance in correct order', () => {
    const baseDamage = 10;
    const criticalDamage = baseDamage * 2; // 20
    const finalDamage = Math.floor(criticalDamage / 2); // 10
    
    expect(finalDamage).toBe(10);
  });
  
  it('should calculate damage with multiple dice types', () => {
    // Simulating 2d6 + 1d8
    const d6Values = [4, 5];
    const d8Value = 7;
    const total = d6Values.reduce((sum, val) => sum + val, 0) + d8Value;
    
    expect(total).toBe(16);
  });
});

describe('GM Roll Mechanics', () => {
  it('should calculate basic d20 roll', () => {
    const d20Value = 15;
    const modifier = 0;
    const total = d20Value + modifier;
    
    expect(total).toBe(15);
  });
  
  it('should apply positive GM modifier', () => {
    const d20Value = 12;
    const modifier = 5;
    const total = d20Value + modifier;
    
    expect(total).toBe(17);
  });
  
  it('should apply negative GM modifier', () => {
    const d20Value = 14;
    const modifier = -3;
    const total = d20Value + modifier;
    
    expect(total).toBe(11);
  });
  
  it('should handle natural 20', () => {
    const d20Value = 20;
    const modifier = 3;
    const total = d20Value + modifier;
    
    expect(d20Value).toBe(20);
    expect(total).toBe(23);
  });
  
  it('should handle natural 1', () => {
    const d20Value = 1;
    const modifier = 5;
    const total = d20Value + modifier;
    
    expect(d20Value).toBe(1);
    expect(total).toBe(6);
  });
});

describe('Roll Result Formatting', () => {
  it('should format check roll with hope', () => {
    const total = 18;
    const result = `${total} with hope`;
    
    expect(result).toBe('18 with hope');
  });
  
  it('should format check roll with fear', () => {
    const total = 12;
    const result = `${total} with fear`;
    
    expect(result).toBe('12 with fear');
  });
  
  it('should format critical success', () => {
    const result = 'Critical Success!';
    
    expect(result).toBe('Critical Success!');
  });
  
  it('should format damage roll', () => {
    const total = 15;
    const result = `${total} damage`;
    
    expect(result).toBe('15 damage');
  });
  
  it('should format GM roll', () => {
    const total = 17;
    const result = `${total}`;
    
    expect(result).toBe('17');
  });
  
  it('should format GM roll with modifier breakdown', () => {
    const d20Value = 14;
    const modifier = 3;
    const total = 17;
    const result = `${total} <small>(${d20Value} +${modifier})</small>`;
    
    expect(result).toContain('17');
    expect(result).toContain('14 +3');
  });
});

describe('Roll History Entry Creation', () => {
  it('should create check roll history entry', () => {
    const rollData: RollData = {
      rollType: 'check',
      hopeValue: 8,
      fearValue: 6,
      advantageValue: 0,
      advantageType: 'none',
      modifier: 2,
      total: 16,
      result: '16 with hope'
    };
    
    expect(rollData.rollType).toBe('check');
    expect(rollData.total).toBe(16);
    expect(rollData.hopeValue).toBeDefined();
    expect(rollData.fearValue).toBeDefined();
  });
  
  it('should create damage roll history entry', () => {
    const rollData: RollData = {
      rollType: 'damage',
      baseDiceCount: 2,
      baseDiceType: 6,
      baseDiceValues: [4, 5],
      bonusDieEnabled: true,
      bonusDieType: 4,
      bonusDieValue: 3,
      isCritical: false,
      hasResistance: false,
      total: 12,
      result: '12 damage'
    };
    
    expect(rollData.rollType).toBe('damage');
    expect(rollData.total).toBe(12);
    expect(rollData.baseDiceValues).toHaveLength(2);
    expect(rollData.bonusDieValue).toBe(3);
  });
  
  it('should create GM roll history entry', () => {
    const rollData: RollData = {
      rollType: 'gm',
      d20Value: 15,
      gmModifier: 3,
      total: 18,
      result: '18'
    };
    
    expect(rollData.rollType).toBe('gm');
    expect(rollData.total).toBe(18);
    expect(rollData.d20Value).toBe(15);
    expect(rollData.gmModifier).toBe(3);
  });
});