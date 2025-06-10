# DaggerDice Three Roll Types Implementation Plan

## Overview
Expand DaggerDice from a Hope/Fear only roller into a comprehensive Daggerheart RPG dice system with three distinct roll types.

## Three Roll Types

### 1. Check Rolls (Existing System - Preserved)
**Purpose**: All ability checks, attack rolls, saving throws  
**Mechanics**: 
- Hope (d12) + Fear (d12) 
- Optional advantage/disadvantage (d6)
- Numeric modifier (-20 to +20)
- Critical success when Hope = Fear

**Results**: Hope/Fear outcome, total with modifiers, critical detection  
**UI**: Keep existing interface exactly as is

### 2. Damage Rolls (New)
**Purpose**: All damage dealing and healing  
**Components**:
- **Base Damage**: Multiple dice of same type (1-10 dice, d4/d6/d8/d10/d12)
- **Bonus Die**: Optional single additional die (any type d4-d12)
- **Critical Checkbox**: When checked, base dice get max + rolled values
- **Resistance Checkbox**: When checked, final total is halved (rounded down)

**Calculation**:
```
Normal: Base Dice + Bonus Die = Total
Critical: (Max Base + Roll Base) + Bonus Die = Total  
Resistance: Final Total ÷ 2 (rounded down)
```

**Examples**:
- Base: 2d8, Normal → (3+7) = 10 damage
- Base: 2d8, Critical → (16 + (3+7)) = 26 damage
- Base: 2d8, Bonus: +1d4, Critical, Resistance → (16 + (3+7)) + 2 = 28 → 14 damage

### 3. GM Rolls (New)
**Purpose**: Simple utility rolls for GMs  
**Mechanics**: Single d20 + modifier (-20 to +20)  
**Results**: d20 result + modifier = total  
**Use Cases**: Initiative, perception, random tables, simple checks

## Technical Implementation

### State Changes
```typescript
rollType: 'check' | 'damage' | 'gm'

// Damage roll state
baseDiceCount: number (1-10)
baseDiceType: 4 | 6 | 8 | 10 | 12
bonusDieEnabled: boolean
bonusDieType: 4 | 6 | 8 | 10 | 12
isCritical: boolean
hasResistance: boolean

// GM roll state  
gmModifier: number (-20 to +20)
```

### UI Structure
```
[Check] [Damage] [GM]  ← Top navigation tabs
       ↓
Context-specific controls for each type
       ↓
Type-appropriate roll button
       ↓  
Type-specific result display
```

### Multiplayer Compatibility
- Extend `RollData` interface for all three roll types
- Update toast notifications with type-specific formatting
- Maintain backward compatibility with existing Check rolls

### Result Display Examples
```
Check: "15 with hope (12 + 3 advantage)"
Damage: "16 + (3+7) + 2 = 28 → 14 (Critical + Resistance)"
GM: "d20: 14 + 3 = 17"
```

## Implementation Phases

### Phase 1: Core Architecture
1. Add roll type state management
2. Create roll type selection UI
3. Implement conditional rendering

### Phase 2: Damage Roll System
1. Add damage dice selection controls
2. Implement critical and resistance mechanics
3. Update dice rolling logic for damage

### Phase 3: GM Roll System  
1. Add simple d20 + modifier interface
2. Implement straightforward roll logic
3. Clean result display

### Phase 4: Integration
1. Update multiplayer system
2. Extend history and notifications
3. Test all scenarios

This plan provides complete Daggerheart RPG support while preserving the excellent existing duality system and maintaining clean, intuitive interfaces for each roll type.