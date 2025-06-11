import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock DOM elements and Alpine.js behavior for UI testing
const createMockUIElements = () => {
  const mockToggleCheckbox = {
    checked: false,
    addEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  };

  const mockSessionIdInput = {
    type: 'search',
    placeholder: 'Room ID (optional)',
    setAttribute: vi.fn(),
    getAttribute: vi.fn().mockReturnValue('search')
  };

  const mockSessionDetailsDiv = {
    style: { display: 'block' },
    hidden: false,
    setAttribute: vi.fn(),
    getAttribute: vi.fn()
  };

  const mockQRCodeContainer = {
    style: { display: 'block' },
    hidden: false,
    setAttribute: vi.fn(),
    getAttribute: vi.fn()
  };

  const mockStreamerControls = {
    style: { display: 'none' },
    hidden: true,
    setAttribute: vi.fn(),
    getAttribute: vi.fn()
  };

  const mockToggleRoomDetailsBtn = {
    textContent: '👁️ Show Room Details',
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn().mockReturnValue(false),
      toggle: vi.fn()
    },
    setAttribute: vi.fn(),
    getAttribute: vi.fn()
  };

  return {
    toggleCheckbox: mockToggleCheckbox,
    sessionIdInput: mockSessionIdInput,
    sessionDetailsDiv: mockSessionDetailsDiv,
    qrCodeContainer: mockQRCodeContainer,
    streamerControls: mockStreamerControls,
    toggleRoomDetailsBtn: mockToggleRoomDetailsBtn
  };
};

// Mock Alpine.js reactive behavior
const createMockAlpineComponent = () => {
  const elements = createMockUIElements();
  
  return {
    // State
    streamerMode: false,
    showRoomDetails: true,
    sessionMode: 'solo' as 'solo' | 'multiplayer',
    sessionId: null as string | null,
    
    // Elements (simulating Alpine.js x-ref)
    elements,
    
    // Simulate Alpine.js x-show directive behavior
    updateVisibility() {
      // Session details visibility: !streamerMode || showRoomDetails
      const sessionDetailsVisible = !this.streamerMode || this.showRoomDetails;
      this.elements.sessionDetailsDiv.hidden = !sessionDetailsVisible;
      this.elements.sessionDetailsDiv.style.display = sessionDetailsVisible ? 'block' : 'none';
      
      // QR code visibility: sessionId && (!streamerMode || showRoomDetails)
      const qrCodeVisible = this.sessionId && (!this.streamerMode || this.showRoomDetails);
      this.elements.qrCodeContainer.hidden = !qrCodeVisible;
      this.elements.qrCodeContainer.style.display = qrCodeVisible ? 'block' : 'none';
      
      // Streamer controls visibility: streamerMode
      this.elements.streamerControls.hidden = !this.streamerMode;
      this.elements.streamerControls.style.display = this.streamerMode ? 'block' : 'none';
    },
    
    // Simulate Alpine.js :type directive behavior
    updateInputType() {
      this.elements.sessionIdInput.type = this.streamerMode ? 'password' : 'search';
    },
    
    // Simulate Alpine.js :placeholder directive behavior
    updateInputPlaceholder() {
      this.elements.sessionIdInput.placeholder = this.streamerMode 
        ? 'Room Code (optional)' 
        : 'Room ID (optional)';
    },
    
    // Simulate Alpine.js :class directive behavior
    updateToggleButtonClass() {
      if (this.showRoomDetails) {
        this.elements.toggleRoomDetailsBtn.classList.add('active');
      } else {
        this.elements.toggleRoomDetailsBtn.classList.remove('active');
      }
    },
    
    // Simulate Alpine.js x-text directive behavior
    updateToggleButtonText() {
      this.elements.toggleRoomDetailsBtn.textContent = this.showRoomDetails 
        ? '🙈 Hide Room Details' 
        : '👁️ Show Room Details';
    },
    
    // Methods
    toggleStreamerMode() {
      this.streamerMode = !this.streamerMode;
      
      // When enabling streamer mode, hide room details by default
      if (this.streamerMode) {
        this.showRoomDetails = false;
      } else {
        this.showRoomDetails = true;
      }
      
      // Update UI elements
      this.updateVisibility();
      this.updateInputType();
      this.updateInputPlaceholder();
      this.updateToggleButtonClass();
      this.updateToggleButtonText();
    },
    
    toggleRoomDetails() {
      this.showRoomDetails = !this.showRoomDetails;
      
      // Update UI elements
      this.updateVisibility();
      this.updateToggleButtonClass();
      this.updateToggleButtonText();
    },
    
    enterMultiplayerMode(sessionId: string) {
      this.sessionMode = 'multiplayer';
      this.sessionId = sessionId;
      
      // Update UI elements
      this.updateVisibility();
    },
    
    exitMultiplayerMode() {
      this.sessionMode = 'solo';
      this.sessionId = null;
      
      // Update UI elements  
      this.updateVisibility();
    }
  };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Streamer Mode UI Behavior', () => {
  describe('Input Field Type and Placeholder', () => {
    it('should use search type and Room ID placeholder by default', () => {
      const component = createMockAlpineComponent();
      component.updateInputType();
      component.updateInputPlaceholder();
      
      expect(component.elements.sessionIdInput.type).toBe('search');
      expect(component.elements.sessionIdInput.placeholder).toBe('Room ID (optional)');
    });

    it('should change to password type and Room Code placeholder in streamer mode', () => {
      const component = createMockAlpineComponent();
      component.toggleStreamerMode();
      
      expect(component.elements.sessionIdInput.type).toBe('password');
      expect(component.elements.sessionIdInput.placeholder).toBe('Room Code (optional)');
    });

    it('should revert to search type when disabling streamer mode', () => {
      const component = createMockAlpineComponent();
      
      // Enable streamer mode
      component.toggleStreamerMode();
      expect(component.elements.sessionIdInput.type).toBe('password');
      
      // Disable streamer mode
      component.toggleStreamerMode();
      expect(component.elements.sessionIdInput.type).toBe('search');
      expect(component.elements.sessionIdInput.placeholder).toBe('Room ID (optional)');
    });
  });

  describe('Session Details Visibility', () => {
    it('should show session details by default when not in streamer mode', () => {
      const component = createMockAlpineComponent();
      component.enterMultiplayerMode('ABC123');
      
      expect(component.elements.sessionDetailsDiv.hidden).toBe(false);
      expect(component.elements.sessionDetailsDiv.style.display).toBe('block');
    });

    it('should hide session details when streamer mode is enabled', () => {
      const component = createMockAlpineComponent();
      component.enterMultiplayerMode('ABC123');
      component.toggleStreamerMode();
      
      expect(component.elements.sessionDetailsDiv.hidden).toBe(true);
      expect(component.elements.sessionDetailsDiv.style.display).toBe('none');
    });

    it('should show session details when toggled in streamer mode', () => {
      const component = createMockAlpineComponent();
      component.enterMultiplayerMode('ABC123');
      component.toggleStreamerMode();
      
      // Initially hidden in streamer mode
      expect(component.elements.sessionDetailsDiv.hidden).toBe(true);
      
      // Toggle room details to show
      component.toggleRoomDetails();
      expect(component.elements.sessionDetailsDiv.hidden).toBe(false);
      expect(component.elements.sessionDetailsDiv.style.display).toBe('block');
    });
  });

  describe('QR Code Visibility', () => {
    it('should show QR code by default when session exists', () => {
      const component = createMockAlpineComponent();
      component.enterMultiplayerMode('ABC123');
      
      expect(component.elements.qrCodeContainer.hidden).toBe(false);
      expect(component.elements.qrCodeContainer.style.display).toBe('block');
    });

    it('should hide QR code when streamer mode is enabled', () => {
      const component = createMockAlpineComponent();
      component.enterMultiplayerMode('ABC123');
      component.toggleStreamerMode();
      
      expect(component.elements.qrCodeContainer.hidden).toBe(true);
      expect(component.elements.qrCodeContainer.style.display).toBe('none');
    });

    it('should show QR code when room details are toggled in streamer mode', () => {
      const component = createMockAlpineComponent();
      component.enterMultiplayerMode('ABC123');
      component.toggleStreamerMode();
      
      // Initially hidden in streamer mode
      expect(component.elements.qrCodeContainer.hidden).toBe(true);
      
      // Toggle room details to show
      component.toggleRoomDetails();
      expect(component.elements.qrCodeContainer.hidden).toBe(false);
      expect(component.elements.qrCodeContainer.style.display).toBe('block');
    });

    it('should hide QR code when no session exists', () => {
      const component = createMockAlpineComponent();
      // No session, so QR code should be hidden regardless of streamer mode
      component.updateVisibility();
      
      expect(component.elements.qrCodeContainer.hidden).toBe(true);
      expect(component.elements.qrCodeContainer.style.display).toBe('none');
    });
  });

  describe('Streamer Controls Visibility', () => {
    it('should hide streamer controls by default', () => {
      const component = createMockAlpineComponent();
      component.updateVisibility();
      
      expect(component.elements.streamerControls.hidden).toBe(true);
      expect(component.elements.streamerControls.style.display).toBe('none');
    });

    it('should show streamer controls when streamer mode is enabled', () => {
      const component = createMockAlpineComponent();
      component.toggleStreamerMode();
      
      expect(component.elements.streamerControls.hidden).toBe(false);
      expect(component.elements.streamerControls.style.display).toBe('block');
    });

    it('should hide streamer controls when streamer mode is disabled', () => {
      const component = createMockAlpineComponent();
      component.toggleStreamerMode(); // Enable
      component.toggleStreamerMode(); // Disable
      
      expect(component.elements.streamerControls.hidden).toBe(true);
      expect(component.elements.streamerControls.style.display).toBe('none');
    });
  });

  describe('Toggle Room Details Button', () => {
    it('should show "Hide Room Details" text when room details are visible', () => {
      const component = createMockAlpineComponent();
      component.showRoomDetails = true;
      component.updateToggleButtonText();
      component.updateToggleButtonClass();
      
      expect(component.elements.toggleRoomDetailsBtn.textContent).toBe('🙈 Hide Room Details');
      expect(component.elements.toggleRoomDetailsBtn.classList.add).toHaveBeenCalledWith('active');
    });

    it('should show "Show Room Details" text when room details are hidden', () => {
      const component = createMockAlpineComponent();
      component.showRoomDetails = false;
      component.updateToggleButtonText();
      component.updateToggleButtonClass();
      
      expect(component.elements.toggleRoomDetailsBtn.textContent).toBe('👁️ Show Room Details');
      expect(component.elements.toggleRoomDetailsBtn.classList.remove).toHaveBeenCalledWith('active');
    });

    it('should toggle text and class when clicked', () => {
      const component = createMockAlpineComponent();
      component.enterMultiplayerMode('ABC123');
      component.toggleStreamerMode();
      
      // Initially hidden in streamer mode
      expect(component.elements.toggleRoomDetailsBtn.textContent).toBe('👁️ Show Room Details');
      
      // Click to show
      component.toggleRoomDetails();
      expect(component.elements.toggleRoomDetailsBtn.textContent).toBe('🙈 Hide Room Details');
      expect(component.elements.toggleRoomDetailsBtn.classList.add).toHaveBeenCalledWith('active');
      
      // Click to hide
      component.toggleRoomDetails();
      expect(component.elements.toggleRoomDetailsBtn.textContent).toBe('👁️ Show Room Details');
      expect(component.elements.toggleRoomDetailsBtn.classList.remove).toHaveBeenCalledWith('active');
    });
  });

  describe('Complete UI Flow', () => {
    it('should handle complete streamer mode workflow', () => {
      const component = createMockAlpineComponent();
      
      // Start in solo mode
      expect(component.sessionMode).toBe('solo');
      expect(component.streamerMode).toBe(false);
      expect(component.elements.sessionIdInput.type).toBe('search');
      
      // Enable streamer mode before joining
      component.toggleStreamerMode();
      expect(component.streamerMode).toBe(true);
      expect(component.elements.sessionIdInput.type).toBe('password');
      expect(component.elements.sessionIdInput.placeholder).toBe('Room Code (optional)');
      
      // Enter multiplayer mode
      component.enterMultiplayerMode('ABC123');
      expect(component.sessionMode).toBe('multiplayer');
      expect(component.elements.sessionDetailsDiv.hidden).toBe(true); // Hidden due to streamer mode
      expect(component.elements.qrCodeContainer.hidden).toBe(true);    // Hidden due to streamer mode
      expect(component.elements.streamerControls.hidden).toBe(false);  // Visible in streamer mode
      
      // Temporarily show room details
      component.toggleRoomDetails();
      expect(component.elements.sessionDetailsDiv.hidden).toBe(false);
      expect(component.elements.qrCodeContainer.hidden).toBe(false);
      expect(component.elements.toggleRoomDetailsBtn.textContent).toBe('🙈 Hide Room Details');
      
      // Hide room details again
      component.toggleRoomDetails();
      expect(component.elements.sessionDetailsDiv.hidden).toBe(true);
      expect(component.elements.qrCodeContainer.hidden).toBe(true);
      expect(component.elements.toggleRoomDetailsBtn.textContent).toBe('👁️ Show Room Details');
      
      // Disable streamer mode
      component.toggleStreamerMode();
      expect(component.streamerMode).toBe(false);
      expect(component.elements.sessionDetailsDiv.hidden).toBe(false); // Now visible
      expect(component.elements.qrCodeContainer.hidden).toBe(false);    // Now visible
      expect(component.elements.streamerControls.hidden).toBe(true);    // Hidden when not in streamer mode
      expect(component.elements.sessionIdInput.type).toBe('search');
      expect(component.elements.sessionIdInput.placeholder).toBe('Room ID (optional)');
    });

    it('should maintain proper state when switching between solo and multiplayer modes', () => {
      const component = createMockAlpineComponent();
      component.toggleStreamerMode(); // Enable streamer mode
      
      // Enter and exit multiplayer mode multiple times
      component.enterMultiplayerMode('ABC123');
      expect(component.elements.sessionDetailsDiv.hidden).toBe(true);
      
      component.exitMultiplayerMode();
      expect(component.sessionId).toBeNull();
      expect(component.elements.qrCodeContainer.hidden).toBe(true); // Hidden because no session
      
      component.enterMultiplayerMode('DEF456');
      expect(component.elements.sessionDetailsDiv.hidden).toBe(true); // Still hidden due to streamer mode
      expect(component.streamerMode).toBe(true); // Streamer mode persists
    });
  });

  describe('Edge Cases', () => {
    it('should handle session exit while in streamer mode', () => {
      const component = createMockAlpineComponent();
      component.toggleStreamerMode();
      component.enterMultiplayerMode('ABC123');
      
      // Verify setup
      expect(component.elements.qrCodeContainer.hidden).toBe(true);
      expect(component.sessionId).toBe('ABC123');
      
      // Exit session
      component.exitMultiplayerMode();
      expect(component.sessionId).toBeNull();
      expect(component.elements.qrCodeContainer.hidden).toBe(true); // Should remain hidden (no session)
      expect(component.streamerMode).toBe(true); // Streamer mode should persist
    });

    it('should handle rapid toggling of streamer mode', () => {
      const component = createMockAlpineComponent();
      component.enterMultiplayerMode('ABC123');
      
      // Rapid toggles
      for (let i = 0; i < 5; i++) {
        component.toggleStreamerMode();
        
        if (component.streamerMode) {
          expect(component.elements.sessionDetailsDiv.hidden).toBe(true);
          expect(component.elements.streamerControls.hidden).toBe(false);
          expect(component.elements.sessionIdInput.type).toBe('password');
        } else {
          expect(component.elements.sessionDetailsDiv.hidden).toBe(false);
          expect(component.elements.streamerControls.hidden).toBe(true);
          expect(component.elements.sessionIdInput.type).toBe('search');
        }
      }
    });
  });
});