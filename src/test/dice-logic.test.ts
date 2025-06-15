import { describe, it, expect } from 'vitest';

// Extract the core dice logic functions for testing
class DiceRollerLogic {
  static calculateCheckResult(hopeValue: number, fearValue: number, advantageValue: number, modifier: number) {
    const baseTotal = hopeValue + fearValue;
    const finalTotal = baseTotal + advantageValue + modifier;
    
    let resultText = '';
    let modifierText = '';

    if (advantageValue !== 0 || modifier !== 0) {
      const parts = [baseTotal.toString()];
      if (advantageValue !== 0) {
        const advantageType = advantageValue > 0 ? 'advantage' : 'disadvantage';
        parts.push(`${advantageValue > 0 ? '+' : '-'} ${Math.abs(advantageValue)} ${advantageType}`);
      }
      if (modifier !== 0) {
        parts.push(`${modifier > 0 ? '+' : '-'} ${Math.abs(modifier)} modifier`);
      }
      modifierText = ` <small>(${parts.join(' ')})</small>`;
    }

    if (hopeValue === fearValue) {
      resultText = 'Critical Success!';
    } else if (hopeValue > fearValue) {
      resultText = `${finalTotal} with hope${modifierText}`;
    } else {
      resultText = `${finalTotal} with fear${modifierText}`;
    }

    return { total: finalTotal, result: resultText, isCritical: hopeValue === fearValue };
  }

  static calculateDamageResult(
    baseDiceValues: number[], 
    bonusDieValue: number, 
    bonusDieEnabled: boolean, 
    isCritical: boolean, 
    hasResistance: boolean,
    baseDiceType: number
  ) {
    let baseDamage = baseDiceValues.reduce((sum, val) => sum + val, 0);
    let criticalDamage = 0;
    
    if (isCritical) {
      criticalDamage = baseDiceValues.length * baseDiceType;
      baseDamage += criticalDamage;
    }
    
    const totalDamage = baseDamage + (bonusDieEnabled ? bonusDieValue : 0);
    const finalDamage = hasResistance ? Math.floor(totalDamage / 2) : totalDamage;

    return { totalDamage, finalDamage, criticalDamage };
  }

  static calculateGMResult(d20Value: number, gmModifier: number, d20Value2?: number, gmAdvantageType?: "none" | "advantage" | "disadvantage") {
    // Calculate final d20 value based on advantage/disadvantage
    let finalD20Value: number;
    if (gmAdvantageType && gmAdvantageType !== "none" && d20Value2 !== undefined) {
      if (gmAdvantageType === "advantage") {
        finalD20Value = Math.max(d20Value, d20Value2);
      } else {
        finalD20Value = Math.min(d20Value, d20Value2);
      }
    } else {
      finalD20Value = d20Value;
    }

    const finalTotal = finalD20Value + gmModifier
    
    let resultText = `d20: ${finalD20Value}`;
    if (gmAdvantageType && gmAdvantageType !== "none" && d20Value2 !== undefined) {
      const advantageLabel = gmAdvantageType === "advantage" ? "ADV" : "DIS";
      resultText = `d20: ${finalD20Value} [${d20Value}, ${d20Value2}] ${advantageLabel}`;
    }
    if (gmModifier !== 0) {
      resultText += ` ${gmModifier > 0 ? '+' : ''}${gmModifier} = ${finalTotal}`;
    }

    return { total: finalTotal, result: resultText, finalD20Value }
  }
}

describe('DiceRoller Logic', () => {
  describe('Check Roll Calculations', () => {
    it('should calculate basic check results correctly', () => {
      const result = DiceRollerLogic.calculateCheckResult(8, 6, 0, 0);
      expect(result.total).toBe(14);
      expect(result.result).toBe('14 with hope');
      expect(result.isCritical).toBe(false);
    });

    it('should detect critical success when hope equals fear', () => {
      const result = DiceRollerLogic.calculateCheckResult(7, 7, 0, 0);
      expect(result.total).toBe(14);
      expect(result.result).toBe('Critical Success!');
      expect(result.isCritical).toBe(true);
    });

    it('should calculate fear results correctly', () => {
      const result = DiceRollerLogic.calculateCheckResult(5, 9, 0, 0);
      expect(result.total).toBe(14);
      expect(result.result).toBe('14 with fear');
      expect(result.isCritical).toBe(false);
    });

    it('should apply positive modifiers correctly', () => {
      const result = DiceRollerLogic.calculateCheckResult(6, 4, 0, 3);
      expect(result.total).toBe(13);
      expect(result.result).toContain('13 with hope');
      expect(result.result).toContain('+ 3 modifier');
    });

    it('should apply negative modifiers correctly', () => {
      const result = DiceRollerLogic.calculateCheckResult(8, 6, 0, -2);
      expect(result.total).toBe(12);
      expect(result.result).toContain('12 with hope');
      expect(result.result).toContain('- 2 modifier');
    });

    it('should apply advantage correctly', () => {
      const result = DiceRollerLogic.calculateCheckResult(6, 4, 3, 0);
      expect(result.total).toBe(13);
      expect(result.result).toContain('13 with hope');
      expect(result.result).toContain('+ 3 advantage');
    });

    it('should apply disadvantage correctly', () => {
      const result = DiceRollerLogic.calculateCheckResult(8, 6, -2, 0);
      expect(result.total).toBe(12);
      expect(result.result).toContain('12 with hope');
      expect(result.result).toContain('- 2 disadvantage');
    });

    it('should apply both advantage and modifier', () => {
      const result = DiceRollerLogic.calculateCheckResult(6, 4, 2, 1);
      expect(result.total).toBe(13);
      expect(result.result).toContain('13 with hope');
      expect(result.result).toContain('+ 2 advantage');
      expect(result.result).toContain('+ 1 modifier');
    });
  });

  describe('Damage Roll Calculations', () => {
    it('should calculate basic damage correctly', () => {
      const result = DiceRollerLogic.calculateDamageResult([6, 4], 0, false, false, false, 8);
      expect(result.totalDamage).toBe(10);
      expect(result.finalDamage).toBe(10);
      expect(result.criticalDamage).toBe(0);
    });

    it('should apply bonus die when enabled', () => {
      const result = DiceRollerLogic.calculateDamageResult([6, 4], 3, true, false, false, 8);
      expect(result.totalDamage).toBe(13);
      expect(result.finalDamage).toBe(13);
    });

    it('should calculate critical damage correctly', () => {
      const result = DiceRollerLogic.calculateDamageResult([6, 4], 0, false, true, false, 8);
      expect(result.totalDamage).toBe(26); // 10 base + 16 critical (2d8 max)
      expect(result.finalDamage).toBe(26);
      expect(result.criticalDamage).toBe(16);
    });

    it('should apply resistance correctly', () => {
      const result = DiceRollerLogic.calculateDamageResult([6, 4], 0, false, false, true, 8);
      expect(result.totalDamage).toBe(10);
      expect(result.finalDamage).toBe(5); // Floor of 10/2
    });

    it('should apply resistance to critical damage', () => {
      const result = DiceRollerLogic.calculateDamageResult([6, 4], 0, false, true, true, 8);
      expect(result.totalDamage).toBe(26);
      expect(result.finalDamage).toBe(13); // Floor of 26/2
    });

    it('should handle odd damage with resistance', () => {
      const result = DiceRollerLogic.calculateDamageResult([3, 2], 0, false, false, true, 6);
      expect(result.totalDamage).toBe(5);
      expect(result.finalDamage).toBe(2); // Floor of 5/2
    });
  });

  describe('GM Roll Calculations', () => {
    it('should calculate basic GM roll correctly', () => {
      const result = DiceRollerLogic.calculateGMResult(15, 0);
      expect(result.total).toBe(15);
      expect(result.result).toBe('d20: 15');
    });

    it('should apply positive GM modifier', () => {
      const result = DiceRollerLogic.calculateGMResult(12, 3);
      expect(result.total).toBe(15);
      expect(result.result).toBe('d20: 12 +3 = 15');
    });

    it('should apply negative GM modifier', () => {
      const result = DiceRollerLogic.calculateGMResult(12, -2)
      expect(result.total).toBe(10)
      expect(result.result).toBe('d20: 12 -2 = 10')
    })

    it('should calculate GM advantage correctly', () => {
      const result = DiceRollerLogic.calculateGMResult(8, 0, 15, 'advantage')
      expect(result.total).toBe(15)
      expect(result.result).toBe('d20: 15 [8, 15] ADV')
      expect(result.finalD20Value).toBe(15)
    })

    it('should calculate GM disadvantage correctly', () => {
      const result = DiceRollerLogic.calculateGMResult(8, 0, 15, 'disadvantage')
      expect(result.total).toBe(8)
      expect(result.result).toBe('d20: 8 [8, 15] DIS')
      expect(result.finalD20Value).toBe(8)
    })

    it('should apply GM advantage with positive modifier', () => {
      const result = DiceRollerLogic.calculateGMResult(12, 3, 8, 'advantage')
      expect(result.total).toBe(15)
      expect(result.result).toBe('d20: 12 [12, 8] ADV +3 = 15')
      expect(result.finalD20Value).toBe(12)
    })

    it('should apply GM disadvantage with negative modifier', () => {
      const result = DiceRollerLogic.calculateGMResult(12, -2, 8, 'disadvantage')
      expect(result.total).toBe(6)
      expect(result.result).toBe('d20: 8 [12, 8] DIS -2 = 6')
      expect(result.finalD20Value).toBe(8)
    })

    it('should handle GM advantage with equal dice values', () => {
      const result = DiceRollerLogic.calculateGMResult(10, 0, 10, 'advantage')
      expect(result.total).toBe(10)
      expect(result.result).toBe('d20: 10 [10, 10] ADV')
      expect(result.finalD20Value).toBe(10)
    })

    it('should handle GM disadvantage with equal dice values', () => {
      const result = DiceRollerLogic.calculateGMResult(10, 0, 10, 'disadvantage')
      expect(result.total).toBe(10)
      expect(result.result).toBe('d20: 10 [10, 10] DIS')
      expect(result.finalD20Value).toBe(10)
    })

    it('should handle GM standard roll (no advantage/disadvantage)', () => {
      const result = DiceRollerLogic.calculateGMResult(15, 2, undefined, 'none')
      expect(result.total).toBe(17)
      expect(result.result).toBe('d20: 15 +2 = 17')
      expect(result.finalD20Value).toBe(15)
    })
  })

  describe('Edge Cases', () => {
    it('should handle minimum dice values', () => {
      const result = DiceRollerLogic.calculateCheckResult(1, 1, 0, 0);
      expect(result.total).toBe(2);
      expect(result.isCritical).toBe(true);
    });

    it('should handle maximum dice values', () => {
      const result = DiceRollerLogic.calculateCheckResult(12, 12, 0, 0);
      expect(result.total).toBe(24);
      expect(result.isCritical).toBe(true);
    });

    it('should handle large negative modifiers', () => {
      const result = DiceRollerLogic.calculateCheckResult(6, 4, 0, -20);
      expect(result.total).toBe(-10);
      expect(result.result).toContain('-10 with hope');
    });

    it('should handle zero damage', () => {
      const result = DiceRollerLogic.calculateDamageResult([0], 0, false, false, false, 6);
      expect(result.totalDamage).toBe(0);
      expect(result.finalDamage).toBe(0);
    });
  });
});