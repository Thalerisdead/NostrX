// NostrX Background Service Worker - Handles Nostr operations

const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.info',
  'wss://nostr-pub.wellorder.net',
  'wss://relay.current.fyi',
  'wss://nostr.wine'
];

const DEFAULT_SETTINGS = {
  relays: DEFAULT_RELAYS,
  includeAttribution: true,
  enabled: true
};

class NostrXBackground {
  constructor() {
    this.relayConnections = new Map();
    this.init();
  }

  init() {
    console.log('NostrX: Background service worker initialized');
    
    // Listen for messages from content script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    // Initialize default settings
    this.initializeSettings();
  }

  async initializeSettings() {
    try {
      const stored = await chrome.storage.local.get('settings');
      if (!stored.settings) {
        await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
      }
    } catch (error) {
      console.error('NostrX: Error initializing settings:', error);
    }
  }

  async handleMessage(request, sender, sendResponse) {
    console.log('NostrX Background: Received message:', request.action);
    
    try {
      switch (request.action) {
        case 'postToNostr':
          console.log('NostrX Background: Processing postToNostr');
          const result = await this.postToNostr(request.tweetData, sender.tab);
          sendResponse({ success: true, result });
          break;
          
        case 'getSettings':
          console.log('NostrX Background: Getting settings');
          const settings = await this.getSettings();
          sendResponse({ success: true, settings });
          break;
          
        case 'updateSettings':
          console.log('NostrX Background: Updating settings');
          await this.updateSettings(request.settings);
          sendResponse({ success: true });
          break;
          
        case 'testNostrConnection':
          console.log('NostrX Background: Testing Nostr connection');
          
          // Get current active tab if not provided
          let tab = sender.tab;
          if (!tab) {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            tab = tabs[0];
          }
          
          if (!tab) {
            sendResponse({ success: false, error: 'No active tab found' });
            break;
          }
          
          const hasNostr = await this.testNostrConnection(tab);
          console.log('NostrX Background: Nostr test result:', hasNostr);
          sendResponse({ success: true, hasNostr });
          break;
          
        case 'publishToRelays':
          console.log('NostrX Background: Publishing signed event to relays');
          try {
            const publishResults = await this.publishToRelays(request.signedEvent, request.relays);
            const successCount = publishResults.filter(r => r.success).length;
            
            if (successCount === 0) {
              sendResponse({ success: false, error: 'Failed to publish to any relay', successCount: 0 });
            } else {
              sendResponse({ success: true, successCount: successCount, publishResults: publishResults });
            }
          } catch (error) {
            console.error('NostrX Background: Error publishing to relays:', error);
            sendResponse({ success: false, error: error.message, successCount: 0 });
          }
          break;
          
        default:
          console.log('NostrX Background: Unknown action:', request.action);
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('NostrX Background: Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async postToNostr(tweetData, tab) {
    try {
      // Get settings
      const settings = await this.getSettings();
      if (!settings.enabled) {
        throw new Error('NostrX is disabled');
      }

      console.log('NostrX: Skipping initial test, attempting to get public key directly...');

      // Get public key (wait for window.nostr to be ready)
      const getPublicKeyFunction = async () => {
        return new Promise((resolve, reject) => {
          let attempts = 0;
          const maxAttempts = 20;
          
          const tryGetKey = async () => {
            attempts++;
            console.log(`NostrX: Attempt ${attempts}/${maxAttempts} - Getting public key`);
            console.log(`NostrX: window.nostr type:`, typeof window.nostr);
            console.log(`NostrX: window object keys:`, Object.keys(window).filter(k => k.includes('nostr')));
            
            if (typeof window.nostr === 'undefined') {
              console.log(`NostrX: window.nostr undefined on attempt ${attempts}`);
              if (attempts >= maxAttempts) {
                reject(new Error('window.nostr is not available after waiting 5 seconds. Make sure Alby is unlocked and has granted permissions to twitter.com.'));
                return;
              }
              setTimeout(tryGetKey, 250);
              return;
            }
            
            console.log(`NostrX: window.nostr found! Methods:`, Object.keys(window.nostr));
            
            try {
              console.log(`NostrX: Attempting to get public key...`);
              const key = await window.nostr.getPublicKey();
              console.log('NostrX: Got public key:', key.substring(0, 16) + '...');
              resolve(key);
            } catch (error) {
              console.log('NostrX: Error getting public key:', error.message);
              console.log('NostrX: Full error:', error);
              if (attempts >= maxAttempts) {
                reject(new Error(`Failed to get public key: ${error.message}. Make sure you approve the permission request in Alby.`));
              } else {
                setTimeout(tryGetKey, 250);
              }
            }
          };
          
          tryGetKey();
        });
      };
      
      const pubkey = await this.executeInTab(tab, getPublicKeyFunction);

      // Format content for Nostr
      let content = tweetData.text;
      if (settings.includeAttribution && tweetData.username) {
        content += `\n\nOriginally posted by @${tweetData.username} on X`;
        if (tweetData.url) {
          content += `\n${tweetData.url}`;
        }
      }

      // Create Nostr event
      const event = {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: content,
        pubkey: pubkey
      };

      // Create a function that will be injected with the event data
      const signEventFunction = () => {
        return new Promise((resolve, reject) => {
          let attempts = 0;
          const maxAttempts = 20;
          
          const trySign = async () => {
            attempts++;
            console.log(`NostrX: Attempt ${attempts} - Signing event`);
            
            if (typeof window.nostr === 'undefined') {
              if (attempts >= maxAttempts) {
                reject(new Error('window.nostr is not available for signing'));
                return;
              }
              setTimeout(trySign, 250);
              return;
            }
            
            try {
              const eventToSign = window.nostrEventToSign;
              if (!eventToSign) {
                reject(new Error('No event data to sign'));
                return;
              }
              
              console.log('NostrX: Signing event with content:', eventToSign.content.substring(0, 50) + '...');
              const signedEvent = await window.nostr.signEvent(eventToSign);
              console.log('NostrX: Event signed successfully');
              
              delete window.nostrEventToSign; // Clean up
              resolve(signedEvent);
            } catch (error) {
              console.log('NostrX: Error signing event:', error.message);
              if (attempts >= maxAttempts) {
                reject(error);
              } else {
                setTimeout(trySign, 250);
              }
            }
          };
          
          trySign();
        });
      };
      
      // First inject the event data
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (eventData) => {
          window.nostrEventToSign = eventData;
        },
        args: [event]
      });
      
      // Then sign it
      const signedEvent = await this.executeInTab(tab, signEventFunction);

      // Publish to relays
      const publishResults = await this.publishToRelays(signedEvent, settings.relays);
      
      return {
        event: signedEvent,
        publishResults: publishResults
      };

    } catch (error) {
      console.error('NostrX: Error posting to Nostr:', error);
      console.error('NostrX: Full error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      throw error;
    }
  }

  async publishToRelays(event, relays) {
    const publishPromises = relays.map(relayUrl => 
      this.publishToRelay(event, relayUrl)
    );

    // Wait for all relays with timeout
    const results = await Promise.allSettled(publishPromises);
    
    const publishResults = results.map((result, index) => ({
      relay: relays[index],
      success: result.status === 'fulfilled',
      error: result.status === 'rejected' ? result.reason.message : null
    }));

    // Consider success if at least one relay succeeded
    const successCount = publishResults.filter(r => r.success).length;
    if (successCount === 0) {
      throw new Error('Failed to publish to any relay');
    }

    return publishResults;
  }

  async publishToRelay(event, relayUrl) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        ws.close();
        reject(new Error('Relay connection timeout'));
      }, 5000);

      const ws = new WebSocket(relayUrl);
      
      ws.onopen = () => {
        const message = JSON.stringify(['EVENT', event]);
        ws.send(message);
      };

      ws.onmessage = (message) => {
        try {
          const data = JSON.parse(message.data);
          if (data[0] === 'OK' && data[1] === event.id) {
            clearTimeout(timeoutId);
            ws.close();
            if (data[2]) {
              resolve({ success: true, relay: relayUrl });
            } else {
              reject(new Error(data[3] || 'Relay rejected event'));
            }
          }
        } catch (error) {
          clearTimeout(timeoutId);
          ws.close();
          reject(new Error('Invalid relay response'));
        }
      };

      ws.onerror = (error) => {
        clearTimeout(timeoutId);
        reject(new Error('WebSocket connection failed'));
      };

      ws.onclose = (event) => {
        clearTimeout(timeoutId);
        if (event.code !== 1000) {
          reject(new Error('WebSocket connection closed unexpectedly'));
        }
      };
    });
  }

  async testNostrConnection(tab) {
    try {
      console.log('NostrX: Testing Nostr connection in tab:', tab.id);
      
      const testFunctionWithRetry = () => {
        return new Promise((resolve) => {
          let attempts = 0;
          const maxAttempts = 10;
          
          const checkNostr = () => {
            attempts++;
            console.log(`NostrX: Attempt ${attempts} - Checking window.nostr:`, typeof window.nostr);
            
            if (typeof window.nostr !== 'undefined' && 
                typeof window.nostr.getPublicKey === 'function' &&
                typeof window.nostr.signEvent === 'function') {
              console.log('NostrX: window.nostr found and ready!');
              resolve(true);
              return;
            }
            
            if (attempts >= maxAttempts) {
              console.log('NostrX: window.nostr not found after', maxAttempts, 'attempts');
              resolve(false);
              return;
            }
            
            // Wait 500ms and try again
            setTimeout(checkNostr, 500);
          };
          
          checkNostr();
        });
      };
      
      const result = await this.executeInTab(tab, testFunctionWithRetry);
      
      console.log('NostrX: Nostr connection test result:', result);
      return result;
    } catch (error) {
      console.error('NostrX: Error testing Nostr connection:', error);
      return false;
    }
  }

  async executeInTab(tab, funcToExecute) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: funcToExecute,
      });
      
      if (results && results[0]) {
        return results[0].result;
      } else {
        throw new Error('No result from script execution');
      }
    } catch (error) {
      console.error('NostrX: Script execution failed:', error);
      throw error;
    }
  }

  async getSettings() {
    try {
      const stored = await chrome.storage.local.get('settings');
      return stored.settings || DEFAULT_SETTINGS;
    } catch (error) {
      console.error('NostrX: Error getting settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  async updateSettings(newSettings) {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = { ...currentSettings, ...newSettings };
      await chrome.storage.local.set({ settings: updatedSettings });
      return updatedSettings;
    } catch (error) {
      console.error('NostrX: Error updating settings:', error);
      throw error;
    }
  }

  // Utility function to generate event ID (simplified version)
  generateEventId(event) {
    const serialized = JSON.stringify([
      0,
      event.pubkey,
      event.created_at,
      event.kind,
      event.tags,
      event.content
    ]);
    
    // In a real implementation, you'd use SHA-256
    // For this example, we'll use a simple hash
    return this.simpleHash(serialized);
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

// Initialize the background service
const nostrXBackground = new NostrXBackground();

// Handle extension lifecycle
chrome.runtime.onStartup.addListener(() => {
  console.log('NostrX: Extension started');
});

chrome.runtime.onInstalled.addListener((details) => {
  console.log('NostrX: Extension installed/updated', details.reason);
  if (details.reason === 'install') {
    // Show welcome message or open options page
    chrome.tabs.create({ url: 'chrome://extensions/?id=' + chrome.runtime.id });
  }
});