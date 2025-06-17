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
        // Create success status icon safely
        // Clear existing content safely
        while (statusIcon.firstChild) {
          statusIcon.removeChild(statusIcon.firstChild);
        }
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '16');
        svg.setAttribute('height', '16');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        
        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polyline.setAttribute('points', '20 6 9 17 4 12');
        svg.appendChild(polyline);
        statusIcon.appendChild(svg);
      } else {
        statusElement.className = 'status-indicator status-disconnected';
        statusText.textContent = `Alby issue: ${result?.error || 'Unknown error'}`;
        
        // Update icon
        const statusIcon = statusElement.querySelector('.status-icon');
        // Create error status icon safely
        // Clear existing content safely
        while (statusIcon.firstChild) {
          statusIcon.removeChild(statusIcon.firstChild);
        }
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '16');
        svg.setAttribute('height', '16');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '12');
        circle.setAttribute('cy', '12');
        circle.setAttribute('r', '10');
        
        const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line1.setAttribute('x1', '15');
        line1.setAttribute('y1', '9');
        line1.setAttribute('x2', '9');
        line1.setAttribute('y2', '15');
        
        const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line2.setAttribute('x1', '9');
        line2.setAttribute('y1', '9');
        line2.setAttribute('x2', '15');
        line2.setAttribute('y2', '15');
        
        svg.appendChild(circle);
        svg.appendChild(line1);
        svg.appendChild(line2);
        statusIcon.appendChild(svg);
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