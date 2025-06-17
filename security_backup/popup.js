// NostrX Popup Script - Manages extension settings and UI

class NostrXPopup {
  constructor() {
    this.settings = null;
    this.init();
  }

  async init() {
    try {
      await this.loadSettings();
      this.setupEventListeners();
      this.updateUI();
      await this.checkNostrStatus();
    } catch (error) {
      console.error('NostrX Popup: Initialization error:', error);
      this.showError('Failed to initialize popup');
    }
  }

  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
      if (response.success) {
        this.settings = response.settings;
      } else {
        throw new Error(response.error || 'Failed to load settings');
      }
    } catch (error) {
      console.error('NostrX Popup: Error loading settings:', error);
      // Use default settings if loading fails
      this.settings = {
        relays: [
          'wss://relay.damus.io',
          'wss://relay.nostr.info',
          'wss://nostr-pub.wellorder.net',
          'wss://relay.current.fyi',
          'wss://nostr.wine'
        ],
        includeAttribution: true,
        enabled: true
      };
    }
  }

  async saveSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ 
        action: 'updateSettings', 
        settings: this.settings 
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('NostrX Popup: Error saving settings:', error);
      this.showError('Failed to save settings');
    }
  }

  setupEventListeners() {
    // Enable toggle
    const enableToggle = document.getElementById('enable-toggle');
    enableToggle.addEventListener('click', () => {
      this.settings.enabled = !this.settings.enabled;
      this.updateToggle(enableToggle, this.settings.enabled);
      this.saveSettings();
    });

    // Attribution toggle
    const attributionToggle = document.getElementById('attribution-toggle');
    attributionToggle.addEventListener('click', () => {
      this.settings.includeAttribution = !this.settings.includeAttribution;
      this.updateToggle(attributionToggle, this.settings.includeAttribution);
      this.saveSettings();
    });

    // Add relay button
    const addRelayBtn = document.getElementById('add-relay-btn');
    const relayInput = document.getElementById('relay-input');
    
    addRelayBtn.addEventListener('click', () => {
      this.addRelay();
    });

    relayInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addRelay();
      }
    });

    // Reset relays button
    const resetRelaysBtn = document.getElementById('reset-relays-btn');
    resetRelaysBtn.addEventListener('click', () => {
      this.resetRelays();
    });
  }

  updateUI() {
    // Update toggles
    const enableToggle = document.getElementById('enable-toggle');
    const attributionToggle = document.getElementById('attribution-toggle');
    
    this.updateToggle(enableToggle, this.settings.enabled);
    this.updateToggle(attributionToggle, this.settings.includeAttribution);

    // Update relay list
    this.updateRelayList();
  }

  updateToggle(toggleElement, active) {
    if (active) {
      toggleElement.classList.add('active');
    } else {
      toggleElement.classList.remove('active');
    }
  }

  updateRelayList() {
    const relayList = document.getElementById('relay-list');
    relayList.innerHTML = '';

    this.settings.relays.forEach((relay, index) => {
      const relayItem = document.createElement('div');
      relayItem.className = 'relay-item';
      
      relayItem.innerHTML = `
        <div class="relay-url">${relay}</div>
        <button class="relay-remove" data-index="${index}" title="Remove relay">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;

      // Add remove event listener
      const removeBtn = relayItem.querySelector('.relay-remove');
      removeBtn.addEventListener('click', () => {
        this.removeRelay(index);
      });

      relayList.appendChild(relayItem);
    });
  }

  addRelay() {
    const relayInput = document.getElementById('relay-input');
    const relayUrl = relayInput.value.trim();

    if (!relayUrl) {
      this.showError('Please enter a relay URL');
      return;
    }

    if (!relayUrl.startsWith('wss://') && !relayUrl.startsWith('ws://')) {
      this.showError('Relay URL must start with wss:// or ws://');
      return;
    }

    if (relayUrl.startsWith('ws://')) {
      this.showError('For security, only WSS (secure WebSocket) relays are allowed');
      return;
    }

    if (this.settings.relays.includes(relayUrl)) {
      this.showError('Relay already exists');
      return;
    }

    try {
      new URL(relayUrl);
    } catch (error) {
      this.showError('Invalid relay URL');
      return;
    }

    this.settings.relays.push(relayUrl);
    relayInput.value = '';
    this.updateRelayList();
    this.saveSettings();
  }

  removeRelay(index) {
    if (this.settings.relays.length <= 1) {
      this.showError('You must have at least one relay');
      return;
    }

    this.settings.relays.splice(index, 1);
    this.updateRelayList();
    this.saveSettings();
  }

  resetRelays() {
    const defaultRelays = [
      'wss://relay.damus.io',
      'wss://relay.nostr.info',
      'wss://nostr-pub.wellorder.net',
      'wss://relay.current.fyi',
      'wss://nostr.wine'
    ];

    this.settings.relays = [...defaultRelays];
    this.updateRelayList();
    this.saveSettings();
  }

  async checkNostrStatus() {
    const statusElement = document.getElementById('nostr-status');
    const statusText = document.getElementById('status-text');

    try {
      // Get current active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]) {
        throw new Error('No active tab found');
      }

      const tab = tabs[0];
      console.log('NostrX Popup: Current tab URL:', tab.url);
      
      // Check if we're on Twitter/X
      if (!tab.url.includes('twitter.com') && !tab.url.includes('x.com')) {
        statusElement.className = 'status-indicator status-disconnected';
        statusText.textContent = 'Please visit Twitter/X to use NostrX';
        return;
      }

      console.log('NostrX Popup: Testing Nostr directly in tab:', tab.id);

      // Test Nostr connection directly with retry
      const directTest = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 10;
            
            const checkNostr = () => {
              attempts++;
              console.log(`NostrX Popup: Attempt ${attempts} - Direct test - window.nostr type:`, typeof window.nostr);
              
              if (typeof window.nostr !== 'undefined' && 
                  typeof window.nostr.getPublicKey === 'function' &&
                  typeof window.nostr.signEvent === 'function') {
                console.log('NostrX Popup: Alby detected and ready!');
                resolve({ found: true, nostr: 'detected' });
                return;
              }
              
              if (attempts >= maxAttempts) {
                console.log('NostrX Popup: Alby not found after', maxAttempts, 'attempts');
                resolve({ found: false, error: 'window.nostr not available after waiting' });
                return;
              }
              
              // Wait 300ms and try again
              setTimeout(checkNostr, 300);
            };
            
            checkNostr();
          });
        }
      });

      const result = directTest[0]?.result;
      console.log('NostrX Popup: Direct test result:', result);

      if (result && result.found) {
        statusElement.className = 'status-indicator status-connected';
        statusText.textContent = 'Nostr extension detected and ready';
        
        // Update icon
        const statusIcon = statusElement.querySelector('.status-icon');
        statusIcon.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        `;
      } else {
        statusElement.className = 'status-indicator status-disconnected';
        statusText.textContent = `Alby issue: ${result?.error || 'Unknown error'}`;
        
        // Update icon
        const statusIcon = statusElement.querySelector('.status-icon');
        statusIcon.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        `;
      }
    } catch (error) {
      console.error('NostrX Popup: Error checking Nostr status:', error);
      statusElement.className = 'status-indicator status-disconnected';
      statusText.textContent = `Error: ${error.message}`;
    }
  }

  showError(message) {
    // Create temporary error message
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      right: 10px;
      background: #dc2626;
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      z-index: 1000;
      animation: slideIn 0.3s ease-out;
    `;
    errorDiv.textContent = message;

    // Add slide-in animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateY(-100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(errorDiv);

    // Remove after 3 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.remove();
      }
      if (style.parentNode) {
        style.remove();
      }
    }, 3000);
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new NostrXPopup();
});