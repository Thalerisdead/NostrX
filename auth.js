// NostrX Authentication Script - NIP-07 Compliant Nostr Authentication

class NostrAuth {
  constructor() {
    this.isAuthenticated = false;
    this.publicKey = null;
    this.checkingAuth = false;
    this.init();
  }

  async init() {
    console.log('🔐 NostrX Auth: Initializing authentication system');
    
    // Check if already authenticated
    await this.checkExistingAuth();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Initial UI update
    this.updateUI();
  }

  async checkExistingAuth() {
    try {
      console.log('🔍 NostrX Auth: Checking existing authentication status');
      
      // Check stored auth state
      const result = await chrome.storage.sync.get(['nostrAuth']);
      const storedAuth = result.nostrAuth;
      
      if (storedAuth && storedAuth.publicKey && storedAuth.authenticated) {
        console.log('📋 NostrX Auth: Found stored authentication');
        
        // For existing auth, we'll trust it until the user manually disconnects
        // or until there's an authentication failure during actual usage
        console.log('✅ NostrX Auth: Using stored authentication');
        this.isAuthenticated = true;
        this.publicKey = storedAuth.publicKey;
      }
    } catch (error) {
      console.error('❌ NostrX Auth: Error checking existing auth:', error);
    }
  }

  async getCurrentAuthFromActiveTab() {
    try {
      if (!this.activeTabId) {
        return { success: false, error: 'No active tab with Nostr extension' };
      }
      
      // Get current public key from active tab (without signing test)
      const results = await chrome.scripting.executeScript({
        target: { tabId: this.activeTabId },
        func: async () => {
          try {
            if (typeof window.nostr === 'undefined') {
              throw new Error('window.nostr not available');
            }
            
            const pubkey = await window.nostr.getPublicKey();
            
            if (!pubkey) {
              throw new Error('Failed to get public key');
            }
            
            return {
              success: true,
              publicKey: pubkey
            };
            
          } catch (error) {
            return {
              success: false,
              error: error.message
            };
          }
        }
      });
      
      if (results && results[0] && results[0].result) {
        return results[0].result;
      } else {
        return { success: false, error: 'No result from auth check script' };
      }
      
    } catch (error) {
      console.error('❌ NostrX Auth: Error getting current auth from tab:', error);
      return { success: false, error: error.message };
    }
  }

  async clearAuthState() {
    try {
      await chrome.storage.sync.remove(['nostrAuth']);
      this.isAuthenticated = false;
      this.publicKey = null;
      console.log('🧹 NostrX Auth: Cleared authentication state');
    } catch (error) {
      console.error('❌ NostrX Auth: Error clearing auth state:', error);
    }
  }

  setupEventListeners() {
    const connectBtn = document.getElementById('connect-btn');
    const continueBtn = document.getElementById('continue-btn');
    const disconnectBtn = document.getElementById('disconnect-btn');

    connectBtn.addEventListener('click', () => this.handleConnect());
    continueBtn.addEventListener('click', () => this.handleContinue());
    disconnectBtn.addEventListener('click', () => this.handleDisconnect());
  }

  async handleConnect() {
    if (this.checkingAuth) {
      console.log('🔄 NostrX Auth: Authentication already in progress');
      return;
    }

    this.checkingAuth = true;
    this.updateButtonState('connecting');
    this.clearStatus();

    try {
      console.log('🔌 NostrX Auth: Starting authentication through content scripts...');
      this.showStatus('Looking for Twitter/X tabs with Nostr extension...', 'warning');
      
      // Request authentication through background script and content scripts
      const authResult = await this.authenticateViaContentScript();
      
      if (!authResult.success) {
        throw new Error(authResult.error || 'Authentication failed');
      }

      console.log('🔑 NostrX Auth: Received public key:', authResult.publicKey.substring(0, 16) + '...');

      // Store authentication state
      await this.storeAuthState(authResult.publicKey);
      
      this.isAuthenticated = true;
      this.publicKey = authResult.publicKey;
      
      console.log('🎉 NostrX Auth: Authentication successful!');
      this.showStatus('Authentication successful!', 'success');
      
      // Update UI to show success state
      setTimeout(() => {
        this.updateUI();
      }, 1000);

    } catch (error) {
      console.error('❌ NostrX Auth: Authentication failed:', error);
      
      let userMessage = error.message;
      if (error.message.includes('User rejected')) {
        userMessage = 'Permission denied. Please allow NostrX to access your Nostr wallet.';
      } else if (error.message.includes('No Twitter/X tabs')) {
        userMessage = 'Please open Twitter/X in a tab and make sure your Nostr wallet extension is unlocked, then try again.';
      }
      
      this.showStatus(userMessage, 'error');
    } finally {
      this.checkingAuth = false;
      this.updateButtonState('default');
    }
  }

  async authenticateViaContentScript() {
    try {
      console.log('🔍 NostrX Auth: Requesting authentication via background script...');
      
      // Send authentication request to background script
      const response = await chrome.runtime.sendMessage({
        action: 'authenticateNostr'
      });
      
      console.log('📋 NostrX Auth: Background script response:', response);
      
      if (!response) {
        throw new Error('No response from background script');
      }
      
      if (!response.success) {
        throw new Error(response.error || 'Authentication failed');
      }
      
      return response;
      
    } catch (error) {
      console.error('❌ NostrX Auth: Error in content script authentication:', error);
      throw error;
    }
  }

  async handleContinue() {
    console.log('➡️ NostrX Auth: Continuing to main settings');
    
    // Open the main popup
    try {
      const currentWindow = await chrome.windows.getCurrent();
      chrome.action.setPopup({popup: 'popup.html'});
      window.close(); // Close auth popup
    } catch (error) {
      console.error('❌ NostrX Auth: Error opening main popup:', error);
      // Fallback: try to open popup.html directly
      chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
      window.close();
    }
  }

  async handleDisconnect() {
    console.log('🔌 NostrX Auth: Disconnecting wallet');
    
    try {
      await this.clearAuthState();
      this.updateUI();
      this.showStatus('Wallet disconnected successfully', 'success');
      
      // Reset popup to auth page
      chrome.action.setPopup({popup: 'auth.html'});
      
    } catch (error) {
      console.error('❌ NostrX Auth: Error disconnecting:', error);
      this.showStatus('Error disconnecting wallet', 'error');
    }
  }

  async storeAuthState(publicKey) {
    try {
      const authData = {
        publicKey: publicKey,
        authenticated: true,
        timestamp: Date.now()
      };
      
      await chrome.storage.sync.set({ nostrAuth: authData });
      console.log('💾 NostrX Auth: Authentication state stored');
    } catch (error) {
      console.error('❌ NostrX Auth: Error storing auth state:', error);
      throw new Error('Failed to store authentication state');
    }
  }

  updateUI() {
    const authInitial = document.getElementById('auth-initial');
    const authSuccess = document.getElementById('auth-success');
    const displayPubkey = document.getElementById('display-pubkey');

    if (this.isAuthenticated && this.publicKey) {
      console.log('🎨 NostrX Auth: Showing authenticated state');
      authInitial.classList.add('hidden');
      authSuccess.classList.remove('hidden');
      
      if (displayPubkey) {
        displayPubkey.textContent = this.publicKey;
      }
    } else {
      console.log('🎨 NostrX Auth: Showing authentication form');
      authInitial.classList.remove('hidden');
      authSuccess.classList.add('hidden');
    }
  }

  updateButtonState(state) {
    const connectBtn = document.getElementById('connect-btn');
    const connectText = document.getElementById('connect-text');

    switch (state) {
      case 'connecting':
        connectBtn.disabled = true;
        connectText.textContent = 'Logging in...';
        break;
      case 'default':
      default:
        connectBtn.disabled = false;
        connectText.textContent = 'Login';
        break;
    }
  }

  showStatus(message, type = 'info') {
    const statusContainer = document.getElementById('status-container');
    
    // Clear existing status
    statusContainer.innerHTML = '';
    
    const statusDiv = document.createElement('div');
    statusDiv.className = `status-indicator status-${type}`;
    
    // Create status icon based on type
    let iconPath = '';
    switch (type) {
      case 'success':
        iconPath = 'M22 11.08V12A10 10 0 1 1 5.93 7.5M9 11L12 14L22 4';
        break;
      case 'error':
        iconPath = 'M10.29 3.86L1.82 18A2 2 0 0 0 3.5 21H20.5A2 2 0 0 0 22.18 18L13.71 3.86A2 2 0 0 0 10.29 3.86ZM12 9V13M12 17H12.01';
        break;
      case 'warning':
        iconPath = 'M10.29 3.86L1.82 18A2 2 0 0 0 3.5 21H20.5A2 2 0 0 0 22.18 18L13.71 3.86A2 2 0 0 0 10.29 3.86ZM12 9V13M12 17H12.01';
        break;
      default:
        iconPath = 'M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z';
    }
    
    statusDiv.innerHTML = `
      <div class="status-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="${iconPath}"></path>
        </svg>
      </div>
      <div class="status-text">${message}</div>
    `;
    
    statusContainer.appendChild(statusDiv);
  }

  clearStatus() {
    const statusContainer = document.getElementById('status-container');
    statusContainer.innerHTML = '';
  }

  // Static method to check if user is authenticated (for use by other scripts)
  static async isUserAuthenticated() {
    try {
      const result = await chrome.storage.sync.get(['nostrAuth']);
      const auth = result.nostrAuth;
      return auth && auth.authenticated && auth.publicKey;
    } catch (error) {
      console.error('❌ NostrX Auth: Error checking auth status:', error);
      return false;
    }
  }

  // Static method to get authenticated public key
  static async getAuthenticatedPubkey() {
    try {
      const result = await chrome.storage.sync.get(['nostrAuth']);
      const auth = result.nostrAuth;
      return auth && auth.authenticated ? auth.publicKey : null;
    } catch (error) {
      console.error('❌ NostrX Auth: Error getting pubkey:', error);
      return null;
    }
  }

  async checkNostrOnActiveTabs() {
    try {
      // Query for Twitter/X tabs
      const tabs = await chrome.tabs.query({
        url: ['https://twitter.com/*', 'https://x.com/*']
      });
      
      if (tabs.length === 0) {
        console.log('🔍 NostrX Auth: No Twitter/X tabs found, checking all tabs...');
        // If no Twitter/X tabs, check all active tabs
        const allTabs = await chrome.tabs.query({ active: true });
        if (allTabs.length === 0) {
          return false;
        }
        tabs.push(...allTabs);
      }
      
      // Try to inject and check for window.nostr on each tab
      for (const tab of tabs) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              return typeof window.nostr !== 'undefined' && window.nostr !== null;
            }
          });
          
          if (results && results[0] && results[0].result === true) {
            console.log('✅ NostrX Auth: Found window.nostr on tab:', tab.url);
            this.activeTabId = tab.id; // Store for later use
            return true;
          }
        } catch (error) {
          console.log('🔍 NostrX Auth: Could not check tab:', tab.url, error.message);
          continue;
        }
      }
      
      return false;
    } catch (error) {
      console.error('❌ NostrX Auth: Error checking for Nostr on tabs:', error);
      return false;
    }
  }
}

// Initialize authentication when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new NostrAuth();
  });
} else {
  new NostrAuth();
}

// Export for use by other scripts
window.NostrAuth = NostrAuth; 