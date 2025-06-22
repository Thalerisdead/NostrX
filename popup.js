// NostrX Popup Script - Manages extension settings and UI

class NostrXPopup {
  constructor() {
    this.settings = null;
    this.init();
  }
  // Comprehensive relay URL validation
  validateRelayUrl(url) {
    try {
      const parsed = new URL(url);
      
      // Only allow secure WebSocket connections
      if (parsed.protocol !== 'wss:') {
        throw new Error('Only secure WebSocket (wss://) connections allowed');
      }
      
      // Validate hostname (prevent localhost, private IPs for production)
      if (parsed.hostname === 'localhost' || 
          parsed.hostname.match(/^192\.168\./) ||
          parsed.hostname.match(/^10\./) ||
          parsed.hostname.match(/^172\.(1[6-9]|2[0-9]|3[01])\./) ||
          parsed.hostname.match(/^127\./)) {
        throw new Error('Private/localhost addresses not allowed');
      }
      
      // Check for reasonable port
      if (parsed.port && (parseInt(parsed.port) < 1 || parseInt(parsed.port) > 65535)) {
        throw new Error('Invalid port number');
      }
      
      return true;
    } catch (error) {
      throw new Error(`Invalid relay URL: ${error.message}`);
    }
  }


  async init() {
    try {
      // Check authentication status first
      const isAuthenticated = await this.checkAuthenticationStatus();
      if (!isAuthenticated) {
        // Redirect to auth page
        chrome.action.setPopup({popup: 'auth.html'});
        window.location.href = 'auth.html';
        return;
      }

      await this.loadSettings();
      this.setupEventListeners();
      this.updateUI();
    } catch (error) {
      console.error('NostrX Popup: Initialization error:', error);
      this.showError('Failed to initialize popup');
    }
  }

  async checkAuthenticationStatus() {
    try {
      const result = await chrome.storage.sync.get(['nostrAuth']);
      const auth = result.nostrAuth;
      
      if (!auth || !auth.authenticated || !auth.publicKey) {
        console.log('🔐 NostrX: User not authenticated, redirecting to auth page');
        return false;
      }
      
      console.log('✅ NostrX: User authenticated with pubkey:', auth.publicKey.substring(0, 16) + '...');
      return true;
    } catch (error) {
      console.error('❌ NostrX: Error checking auth status:', error);
      return false;
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

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn.addEventListener('click', () => {
      this.handleLogout();
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
    // Clear existing content safely
    while (relayList.firstChild) {
      relayList.removeChild(relayList.firstChild);
    }

    this.settings.relays.forEach((relay, index) => {
      const relayItem = document.createElement('div');
      relayItem.className = 'relay-item';
      
      // Create relay item securely
      const relayUrl = document.createElement('div');
      relayUrl.className = 'relay-url';
      relayUrl.textContent = relay; // Safe - uses textContent instead of innerHTML
      
      const removeBtn = document.createElement('button');
      removeBtn.className = 'relay-remove';
      removeBtn.setAttribute('data-index', index.toString());
      removeBtn.title = 'Remove relay';
      
      // Create remove button SVG safely
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '14');
      svg.setAttribute('height', '14');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2');
      
      const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line1.setAttribute('x1', '18');
      line1.setAttribute('y1', '6');
      line1.setAttribute('x2', '6');
      line1.setAttribute('y2', '18');
      
      const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line2.setAttribute('x1', '6');
      line2.setAttribute('y1', '6');
      line2.setAttribute('x2', '18');
      line2.setAttribute('y2', '18');
      
      svg.appendChild(line1);
      svg.appendChild(line2);
      removeBtn.appendChild(svg);
      
      relayItem.appendChild(relayUrl);
      relayItem.appendChild(removeBtn);

      // Add remove event listener
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
      this.validateRelayUrl(relayUrl);
    } catch (error) {
      this.showError(error.message);
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

  async handleLogout() {
    try {
      console.log('🔌 NostrX: Logging out...');
      
      // Clear authentication state
      await chrome.storage.sync.remove(['nostrAuth']);
      
      // Show success message
      this.showSuccessMessage('Logged out successfully');
      
      // Redirect to auth page after short delay
      setTimeout(() => {
        chrome.action.setPopup({popup: 'auth.html'});
        window.location.href = 'auth.html';
      }, 1000);
      
    } catch (error) {
      console.error('❌ NostrX: Error during logout:', error);
      this.showError('Failed to logout');
    }
  }

  showSuccessMessage(message) {
    // Create temporary success message
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      right: 10px;
      background: #22c55e;
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      z-index: 1000;
      animation: slideIn 0.3s ease-out;
    `;
    successDiv.textContent = message;

    // Add slide-in animation if not already present
    if (!document.querySelector('#slideInStyle')) {
      const style = document.createElement('style');
      style.id = 'slideInStyle';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(successDiv);

    // Remove after 3 seconds
    setTimeout(() => {
      if (successDiv.parentNode) {
        successDiv.remove();
      }
    }, 3000);
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

    // Add slide-in animation if not already present
    if (!document.querySelector('#slideInStyle')) {
      const style = document.createElement('style');
      style.id = 'slideInStyle';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(errorDiv);

    // Remove after 3 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.remove();
      }
    }, 3000);
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new NostrXPopup();
});