import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SharedRollHistoryItem } from '../src/session/types';

// Create a mock toast manager that matches the implementation
function createMockToastManager() {
  const toasts: Array<{ id: number; type: string; content: string; visible: boolean }> = [];
  let nextId = 1;
  
  return {
    toasts,
    show: vi.fn((type: string, content: string, _duration?: number) => {
      const toast = {
        id: nextId++,
        type,
        content,
        visible: true
      };
      toasts.push(toast);
    }),
    showRollToast: vi.fn(function(roll: SharedRollHistoryItem) {
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
    })
  };
}

describe('Toast Manager - showRollToast', () => {
  let toastManager: ReturnType<typeof createMockToastManager>;
  
  beforeEach(() => {
    toastManager = createMockToastManager();
  });
  
  describe('Check Rolls', () => {
    it('should display basic hope/fear roll correctly', () => {
      const roll: SharedRollHistoryItem = {
        rollType: 'check',
        total: 15,
        result: 'Hope (8) vs Fear (7) = <strong>HOPE</strong>',
        hopeValue: 8,
        fearValue: 7,
        advantageValue: 0,
        modifier: 0,
        playerId: 'player1',
        playerName: 'Alice',
        timestamp: Date.now()
      };
      
      toastManager.showRollToast(roll);
      
      expect(toastManager.show).toHaveBeenCalledWith('roll', expect.any(String), 5000);
      const content = toastManager.toasts[0].content;
      expect(content).toContain('Alice rolled:');
      expect(content).toContain('Hope: 8');
      expect(content).toContain('Fear: 7');
      expect(content).not.toContain('Adv:');
      expect(content).not.toContain('Mod:');
    });
    
    it('should display check roll with advantage', () => {
      const roll: SharedRollHistoryItem = {
        rollType: 'check',
        total: 19,
        result: 'Hope (8) vs Fear (7) + Adv (4) = <strong>HOPE</strong>',
        hopeValue: 8,
        fearValue: 7,
        advantageValue: 4,
        advantageType: 'advantage',
        modifier: 0,
        playerId: 'player1',
        playerName: 'Bob',
        timestamp: Date.now()
      };
      
      toastManager.showRollToast(roll);
      
      const content = toastManager.toasts[0].content;
      expect(content).toContain('Bob rolled:');
      expect(content).toContain('Hope: 8');
      expect(content).toContain('Fear: 7');
      expect(content).toContain('Adv: 4');
      expect(content).toContain('class="advantage"');
    });
    
    it('should display check roll with disadvantage and modifier', () => {
      const roll: SharedRollHistoryItem = {
        rollType: 'check',
        total: 8,
        result: 'Hope (6) vs Fear (5) - Dis (3) + Mod (+2) = <strong>HOPE</strong>',
        hopeValue: 6,
        fearValue: 5,
        advantageValue: -3,
        advantageType: 'disadvantage',
        modifier: 2,
        playerId: 'player1',
        playerName: 'Charlie',
        timestamp: Date.now()
      };
      
      toastManager.showRollToast(roll);
      
      const content = toastManager.toasts[0].content;
      expect(content).toContain('Charlie rolled:');
      expect(content).toContain('Hope: 6');
      expect(content).toContain('Fear: 5');
      expect(content).toContain('Dis: 3');
      expect(content).toContain('class="disadvantage"');
      expect(content).toContain('Mod: +2');
    });
  });
  
  describe('Damage Rolls', () => {
    it('should display basic damage roll', () => {
      const roll: SharedRollHistoryItem = {
        rollType: 'damage',
        total: 14,
        result: '2d6 (5, 6) + 3 = <strong>14 damage</strong>',
        baseDiceCount: 2,
        baseDiceType: 6,
        baseDiceValues: [5, 6],
        damageModifier: 3,
        bonusDieEnabled: false,
        isCritical: false,
        hasResistance: false,
        playerId: 'player2',
        playerName: 'Diana',
        timestamp: Date.now()
      };
      
      toastManager.showRollToast(roll);
      
      const content = toastManager.toasts[0].content;
      expect(content).toContain('Diana rolled:');
      expect(content).toContain('Dice: 2d6');
      expect(content).toContain('Mod: +3');
      expect(content).not.toContain('Bonus:');
      expect(content).not.toContain('Critical!');
      expect(content).not.toContain('Resisted');
    });
    
    it('should display critical damage roll with bonus die', () => {
      const roll: SharedRollHistoryItem = {
        rollType: 'damage',
        total: 25,
        result: '2d8 (8, 7) + d4 (3) + 2 = <strong>25 damage (critical)</strong>',
        baseDiceCount: 2,
        baseDiceType: 8,
        baseDiceValues: [8, 7],
        bonusDieEnabled: true,
        bonusDieType: 4,
        bonusDieValue: 3,
        damageModifier: 2,
        isCritical: true,
        hasResistance: false,
        playerId: 'player2',
        playerName: 'Eve',
        timestamp: Date.now()
      };
      
      toastManager.showRollToast(roll);
      
      const content = toastManager.toasts[0].content;
      expect(content).toContain('Eve rolled:');
      expect(content).toContain('Dice: 2d8');
      expect(content).toContain('Bonus: d4');
      expect(content).toContain('Mod: +2');
      expect(content).toContain('Critical!');
      expect(content).toContain('class="critical"');
    });
    
    it('should display resisted damage roll', () => {
      const roll: SharedRollHistoryItem = {
        rollType: 'damage',
        total: 6,
        result: '3d6 (4, 5, 3) = <strong>6 damage (resisted)</strong>',
        baseDiceCount: 3,
        baseDiceType: 6,
        baseDiceValues: [4, 5, 3],
        damageModifier: 0,
        bonusDieEnabled: false,
        isCritical: false,
        hasResistance: true,
        playerId: 'player2',
        playerName: 'Frank',
        timestamp: Date.now()
      };
      
      toastManager.showRollToast(roll);
      
      const content = toastManager.toasts[0].content;
      expect(content).toContain('Frank rolled:');
      expect(content).toContain('Dice: 3d6');
      expect(content).toContain('Resisted');
      expect(content).not.toContain('Mod:'); // Should not show modifier when it's 0
    });
  });
  
  describe('GM Rolls', () => {
    it('should display basic GM roll', () => {
      const roll: SharedRollHistoryItem = {
        rollType: 'gm',
        total: 18,
        result: 'd20 (15) + 3 = <strong>18</strong>',
        d20Value: 15,
        gmModifier: 3,
        gmAdvantageType: 'none',
        gmPrivate: false,
        playerId: 'gm1',
        playerName: 'GM',
        timestamp: Date.now()
      };
      
      toastManager.showRollToast(roll);
      
      const content = toastManager.toasts[0].content;
      expect(content).toContain('GM rolled:');
      expect(content).toContain('d20: 15');
      expect(content).toContain('Mod: +3');
      expect(content).not.toContain('Private');
    });
    
    it('should display GM roll with advantage', () => {
      const roll: SharedRollHistoryItem = {
        rollType: 'gm',
        total: 22,
        result: 'd20 (19) [14] + 3 = <strong>22</strong> (advantage)',
        d20Value: 19,
        d20Value2: 14,
        gmModifier: 3,
        gmAdvantageType: 'advantage',
        gmPrivate: false,
        playerId: 'gm1',
        playerName: 'GM',
        timestamp: Date.now()
      };
      
      toastManager.showRollToast(roll);
      
      const content = toastManager.toasts[0].content;
      expect(content).toContain('GM rolled:');
      expect(content).toContain('d20: 19');
      expect(content).toContain('Adv: 14');
      expect(content).toContain('Mod: +3');
    });
    
    it('should display private GM roll with disadvantage', () => {
      const roll: SharedRollHistoryItem = {
        rollType: 'gm',
        total: 8,
        result: 'd20 (8) [13] - 2 = <strong>6</strong> (disadvantage)',
        d20Value: 8,
        d20Value2: 13,
        gmModifier: -2,
        gmAdvantageType: 'disadvantage',
        gmPrivate: true,
        playerId: 'gm1',
        playerName: 'GM',
        timestamp: Date.now()
      };
      
      toastManager.showRollToast(roll);
      
      const content = toastManager.toasts[0].content;
      expect(content).toContain('GM rolled:');
      expect(content).toContain('d20: 8');
      expect(content).toContain('Dis: 13');
      expect(content).toContain('Mod: -2');
      expect(content).toContain('Private');
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle missing optional fields gracefully', () => {
      const roll: SharedRollHistoryItem = {
        rollType: 'check',
        total: 15,
        result: 'Hope vs Fear',
        hopeValue: 8,
        fearValue: 7,
        // No advantage, modifier fields
        playerId: 'player1',
        playerName: 'Grace',
        timestamp: Date.now()
      };
      
      toastManager.showRollToast(roll);
      
      const content = toastManager.toasts[0].content;
      expect(content).toContain('Grace rolled:');
      expect(content).toContain('Hope: 8');
      expect(content).toContain('Fear: 7');
      expect(content).not.toContain('undefined');
      expect(content).not.toContain('null');
    });
    
    it('should strip HTML from result text', () => {
      const roll: SharedRollHistoryItem = {
        rollType: 'check',
        total: 15,
        result: 'Hope (8) vs Fear (7) = <strong>HOPE</strong>',
        hopeValue: 8,
        fearValue: 7,
        playerId: 'player1',
        playerName: 'Henry',
        timestamp: Date.now()
      };
      
      toastManager.showRollToast(roll);
      
      const content = toastManager.toasts[0].content;
      expect(content).toContain('Hope (8) vs Fear (7) = HOPE'); // HTML stripped
      expect(content).not.toContain('<strong>');
    });
  });
});