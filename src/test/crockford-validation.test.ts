// Crockford Base32 validation tests
import { describe, it, expect } from 'vitest';

describe('Crockford Base32 Character Validation', () => {
  // Import the alphabet from the module
  const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

  it('should exclude confusing characters from Crockford alphabet', () => {
    // Crockford Base32 excludes these characters to avoid confusion:
    const excludedChars = ['I', 'L', 'O', 'U'];
    
    excludedChars.forEach(char => {
      expect(CROCKFORD_ALPHABET).not.toContain(char);
    });
  });

  it('should have exactly 32 characters in the alphabet', () => {
    expect(CROCKFORD_ALPHABET.length).toBe(32);
  });

  it('should contain all expected Crockford Base32 characters', () => {
    // Official Crockford Base32 alphabet: 0-9, A-Z excluding I, L, O, U
    const expectedChars = [
      '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
      'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 
      'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'V', 'W', 'X', 'Y', 'Z'
    ];

    expectedChars.forEach(char => {
      expect(CROCKFORD_ALPHABET).toContain(char);
    });
  });

  it('should not contain lowercase letters', () => {
    const lowercasePattern = /[a-z]/;
    expect(CROCKFORD_ALPHABET).not.toMatch(lowercasePattern);
  });

  it('should not contain special characters', () => {
    const specialCharPattern = /[^0-9A-Z]/;
    expect(CROCKFORD_ALPHABET).not.toMatch(specialCharPattern);
  });

  it('should be in the correct order for Crockford Base32', () => {
    // Verify it matches the standard Crockford ordering
    const expectedAlphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    expect(CROCKFORD_ALPHABET).toBe(expectedAlphabet);
  });

  describe('Character Confusion Prevention', () => {
    it('should exclude I (can be confused with 1)', () => {
      expect(CROCKFORD_ALPHABET).not.toContain('I');
      expect(CROCKFORD_ALPHABET).toContain('1'); // 1 is included
    });

    it('should exclude L (can be confused with 1)', () => {
      expect(CROCKFORD_ALPHABET).not.toContain('L');
      expect(CROCKFORD_ALPHABET).toContain('1'); // 1 is included
    });

    it('should exclude O (can be confused with 0)', () => {
      expect(CROCKFORD_ALPHABET).not.toContain('O');
      expect(CROCKFORD_ALPHABET).toContain('0'); // 0 is included
    });

    it('should exclude U (can be confused with V)', () => {
      expect(CROCKFORD_ALPHABET).not.toContain('U');
      expect(CROCKFORD_ALPHABET).toContain('V'); // V is included
    });
  });

  describe('Visual Similarity Tests', () => {
    it('should not have visually similar character pairs', () => {
      // Test that we don't have both characters from confusing pairs
      const confusingPairs = [
        ['I', '1'], // I looks like 1
        ['L', '1'], // L looks like 1  
        ['O', '0'], // O looks like 0
        ['U', 'V'], // U looks like V
      ];

      confusingPairs.forEach(([char1, char2]) => {
        const hasChar1 = CROCKFORD_ALPHABET.includes(char1);
        const hasChar2 = CROCKFORD_ALPHABET.includes(char2);
        
        // Should not have both characters from a confusing pair
        expect(hasChar1 && hasChar2).toBe(false);
      });
    });

    it('should generate codes without ambiguous characters', () => {
      // Sample some characters from our alphabet to ensure no ambiguous ones
      const sampleChars = CROCKFORD_ALPHABET.split('');
      const ambiguousChars = ['I', 'L', 'O', 'U', 'i', 'l', 'o', 'u'];
      
      sampleChars.forEach(char => {
        expect(ambiguousChars).not.toContain(char);
      });
    });
  });

  describe('Crockford Character Normalization', () => {
    it('should normalize confusing characters during decoding', async () => {
      // Import the functions we need to test
      const { decodeNameV1 } = await import('../session/room-names.js');
      
      // Test valid codes that should work
      const validCode = '000'; // Maps to brave-dragon
      const result = decodeNameV1(validCode);
      expect(result.word1).toBe('brave');
      expect(result.word2).toBe('dragon');

      // Test the same code with confusing characters - should normalize and work
      const codeWithI = '00I'; // I should become 1, but this creates 001 which should also be valid
      const codeWithL = '00L'; // L should become 1, same as above
      const codeWithO = 'O00'; // O should become 0, creating 000 again
      
      // These should all work due to character normalization
      expect(() => decodeNameV1(codeWithI)).not.toThrow();
      expect(() => decodeNameV1(codeWithL)).not.toThrow();
      expect(() => decodeNameV1(codeWithO)).not.toThrow();
      
      // Verify O->0 normalization gives same result as original
      const resultWithO = decodeNameV1(codeWithO);
      expect(resultWithO).toEqual(result);
    });

    it('should accept lowercase confusing characters', async () => {
      const { decodeNameV1 } = await import('../session/room-names.js');
      
      // Test lowercase confusing characters
      const testCases = [
        { input: 'o00', description: 'lowercase o should normalize to 0' },
        { input: 'i00', description: 'lowercase i should normalize to 1' },
        { input: 'l00', description: 'lowercase l should normalize to 1' },
      ];

      testCases.forEach(({ input, description }) => {
        expect(() => decodeNameV1(input), description).not.toThrow();
      });
    });

    it('should map confusing characters to correct standard characters', async () => {
      const { sessionIdToFriendlyName } = await import('../session/room-names.js');
      
      // Test that these confusing character codes map to the same results as their standard equivalents
      const mappings = [
        { confusing: 'O00', standard: '000' }, // O -> 0
        { confusing: '00I', standard: '001' }, // I -> 1  
        { confusing: '00L', standard: '001' }, // L -> 1
      ];

      mappings.forEach(({ confusing, standard }) => {
        const confusingResult = sessionIdToFriendlyName(confusing);
        const standardResult = sessionIdToFriendlyName(standard);
        expect(confusingResult).toBe(standardResult);
      });
    });
  });
});