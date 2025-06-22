// NostrX Background Service Worker - Handles Nostr operations

console.log('🟢 NostrX Background: Background script loaded and ready!');
console.log('🟢 NostrX Background: Timestamp:', new Date().toISOString());
console.log('🟢 NostrX Background: Chrome APIs available:', {
  runtime: !!chrome.runtime,
  storage: !!chrome.storage,
  tabs: !!chrome.tabs
});

// Test background script is working
setInterval(() => {
  console.log('🟢 NostrX Background: Heartbeat -', new Date().toLocaleTimeString());
}, 10000);

// Storage monitoring disabled - main dual-world publishing is working perfectly

// Handle publishing to relays from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('🟢 NostrX Background: Received message:', message.action, 'from tab:', sender.tab?.id);
  
  if (message.action === 'publishToRelays') {
    console.log('🟢 NostrX Background: Processing publishToRelays with', message.relays?.length, 'relays');
    handlePublishToRelays(message.signedEvent, message.relays)
      .then(result => {
        console.log('🟢 NostrX Background: Publishing result:', result);
        sendResponse(result);
      })
      .catch(error => {
        console.error('🔴 NostrX Background: Publishing error:', error);
        sendResponse({ 
          success: false, 
          error: error.message,
          successCount: 0,
          totalRelays: message.relays?.length || 0
        });
      });
    
    // Return true to indicate we'll send response asynchronously
    return true;
  }
  
  // Handle authentication check requests
  if (message.action === 'checkAuth') {
    handleAuthCheck()
      .then(result => {
        console.log('🔐 NostrX Background: Auth check result:', result);
        sendResponse(result);
      })
      .catch(error => {
        console.error('❌ NostrX Background: Auth check error:', error);
        sendResponse({ authenticated: false, error: error.message });
      });
    
    return true;
  }

  // Handle authentication requests
  if (message.action === 'authenticateNostr') {
    handleNostrAuthentication()
      .then(result => {
        console.log('🔐 NostrX Background: Authentication result:', result);
        sendResponse(result);
      })
      .catch(error => {
        console.error('❌ NostrX Background: Authentication error:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true;
  }

  // Handle settings requests (for popup)
  if (message.action === 'getSettings') {
    getSettings()
      .then(settings => {
        sendResponse({ success: true, settings });
      })
      .catch(error => {
        console.error('❌ NostrX Background: Error getting settings:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true;
  }

  if (message.action === 'updateSettings') {
    updateSettings(message.settings)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('❌ NostrX Background: Error updating settings:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true;
  }
});

async function handlePublishToRelays(signedEvent, relays) {
  console.log(`📡 NostrX Background: Publishing to ${relays.length} relays`);
  
  const publishPromises = relays.map(relay => publishToSingleRelay(signedEvent, relay));
  const results = await Promise.allSettled(publishPromises);
  
  let successCount = 0;
  const errors = [];
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successCount++;
      console.log(`✅ NostrX Background: Successfully published to ${relays[index]}`);
    } else {
      errors.push(`${relays[index]}: ${result.reason.message}`);
      console.error(`❌ NostrX Background: Failed to publish to ${relays[index]}:`, result.reason);
    }
  });
  
  console.log(`📈 NostrX Background: Publishing summary: ${successCount}/${relays.length} relays succeeded`);
  
  return {
    success: successCount > 0,
    successCount,
    totalRelays: relays.length,
    errors: errors.length > 0 ? errors : undefined
  };
}

async function publishToSingleRelay(event, relayUrl) {
  return new Promise((resolve, reject) => {
    console.log(`🔌 NostrX Background: Connecting to relay: ${relayUrl}`);
    const ws = new WebSocket(relayUrl);
    const timeout = setTimeout(() => {
      console.warn(`⏰ NostrX Background: Connection timeout to ${relayUrl}`);
      ws.close();
      reject(new Error('Connection timeout'));
    }, 10000);
    
    ws.onopen = () => {
      clearTimeout(timeout);
      console.log(`🔗 NostrX Background: Connected to ${relayUrl}`);
      
      // Send the event
      const message = JSON.stringify(['EVENT', event]);
      console.log(`📤 NostrX Background: Sending event to ${relayUrl}`);
      ws.send(message);
      
      // Set up response timeout
      const responseTimeout = setTimeout(() => {
        console.warn(`⏰ NostrX Background: No response from ${relayUrl}`);
        ws.close();
        reject(new Error('No response from relay'));
      }, 5000);
      
      ws.onmessage = (msg) => {
        clearTimeout(responseTimeout);
        console.log(`📥 NostrX Background: Response from ${relayUrl}:`, msg.data);
        try {
          const data = JSON.parse(msg.data);
          if (data[0] === 'OK' && data[1] === event.id) {
            if (data[2] === true) {
              console.log(`✅ NostrX Background: Event accepted by ${relayUrl}`);
              ws.close();
              resolve(true);
            } else {
              console.error(`❌ NostrX Background: Event rejected by ${relayUrl}:`, data[3]);
              ws.close();
              reject(new Error(data[3] || 'Relay rejected the event'));
            }
          }
        } catch (error) {
          console.error(`❌ NostrX Background: Invalid response from ${relayUrl}:`, error);
          ws.close();
          reject(new Error('Invalid response from relay'));
        }
      };
    };
    
    ws.onerror = (error) => {
      clearTimeout(timeout);
      console.error(`❌ NostrX Background: WebSocket error with ${relayUrl}:`, error);
      reject(new Error(`WebSocket error: ${error.message || 'Unknown error'}`));
    };
    
    ws.onclose = (event) => {
      clearTimeout(timeout);
      if (event.code !== 1000) {
        console.warn(`🔌 NostrX Background: Connection closed unexpectedly to ${relayUrl}: ${event.code}`);
        reject(new Error(`Connection closed unexpectedly: ${event.code}`));
      }
    };
  });
}

// Authentication helper functions
async function handleAuthCheck() {
  try {
    const result = await chrome.storage.sync.get(['nostrAuth']);
    const auth = result.nostrAuth;
    
    if (auth && auth.authenticated && auth.publicKey) {
      console.log('✅ NostrX Background: User authenticated with pubkey:', auth.publicKey.substring(0, 16) + '...');
      return { 
        authenticated: true, 
        publicKey: auth.publicKey,
        timestamp: auth.timestamp 
      };
    } else {
      console.log('🔐 NostrX Background: User not authenticated');
      return { authenticated: false };
    }
  } catch (error) {
    console.error('❌ NostrX Background: Error checking auth:', error);
    return { authenticated: false, error: error.message };
  }
}

// Settings helper functions
async function getSettings() {
  try {
    const result = await chrome.storage.sync.get(['nostrSettings']);
    const settings = result.nostrSettings;
    
    // Return default settings if none exist
    if (!settings) {
      const defaultSettings = {
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
      
      // Save default settings
      await chrome.storage.sync.set({ nostrSettings: defaultSettings });
      return defaultSettings;
    }
    
    return settings;
  } catch (error) {
    console.error('❌ NostrX Background: Error getting settings:', error);
    throw error;
  }
}

async function updateSettings(newSettings) {
  try {
    await chrome.storage.sync.set({ nostrSettings: newSettings });
    console.log('💾 NostrX Background: Settings updated');
  } catch (error) {
    console.error('❌ NostrX Background: Error updating settings:', error);
    throw error;
  }
}

// Nostr authentication handler
async function handleNostrAuthentication() {
  try {
    console.log('🔐 NostrX Background: Starting Nostr authentication...');
    
    // Find Twitter/X tabs
    const tabs = await chrome.tabs.query({
      url: ['https://twitter.com/*', 'https://x.com/*']
    });
    
    console.log('🔍 NostrX Background: Found tabs:', tabs.map(t => ({ id: t.id, url: t.url, status: t.status })));
    
    if (tabs.length === 0) {
      throw new Error('No Twitter/X tabs found. Please open Twitter/X in a tab and try again.');
    }
    
    console.log('🔍 NostrX Background: Found', tabs.length, 'Twitter/X tabs');
    
    // Filter for loaded tabs
    const loadedTabs = tabs.filter(tab => tab.status === 'complete');
    
    if (loadedTabs.length === 0) {
      throw new Error('No fully loaded Twitter/X tabs found. Please wait for the page to load and try again.');
    }
    
    console.log('🔍 NostrX Background: Found', loadedTabs.length, 'loaded Twitter/X tabs');
    
    // Try each tab until we find one with a working Nostr extension
    for (const tab of loadedTabs) {
      try {
        console.log('🔍 NostrX Background: Trying authentication on tab:', tab.url);
        
        // First check if content scripts are loaded
        try {
          await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
          console.log('✅ NostrX Background: Content scripts loaded on tab:', tab.id);
        } catch (pingError) {
          console.log('⚠️ NostrX Background: Content scripts not loaded on tab:', tab.id, 'injecting...');
          
          // Try to inject content scripts
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['js/content/svg-icons.js', 'js/content/tweet-extractor.js', 'js/content/button-creator.js', 'js/content/nostr-publisher.js', 'js/content/dom-observer.js', 'js/content/main.js']
            });
            
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['js/content-bridge.js']
            });
            
            console.log('✅ NostrX Background: Content scripts injected on tab:', tab.id);
            
            // Wait a bit for scripts to initialize
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (injectError) {
            console.log('❌ NostrX Background: Failed to inject content scripts:', injectError.message);
            continue;
          }
        }
        
        // Try to authenticate using existing content scripts via message passing
        try {
          console.log('🔍 NostrX Background: Requesting authentication via content scripts...');
          
          const authResult = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Authentication timeout - no response from content scripts'));
            }, 30000);
            
            chrome.tabs.sendMessage(tab.id, {
              action: 'authenticateNostr',
              requestId: 'auth_' + Date.now() + '_' + Math.random()
            }, (response) => {
              clearTimeout(timeout);
              
              if (chrome.runtime.lastError) {
                reject(new Error('Content script communication failed: ' + chrome.runtime.lastError.message));
                return;
              }
              
              if (!response) {
                reject(new Error('No response from content script'));
                return;
              }
              
              resolve(response);
            });
          });
          
          if (authResult.success) {
            console.log('✅ NostrX Background: Authentication successful on tab:', tab.url);
            return authResult;
          } else {
            console.log('⚠️ NostrX Background: Authentication failed on tab:', tab.url, authResult.error);
          }
          
        } catch (error) {
          console.log('⚠️ NostrX Background: Content script auth failed on tab:', tab.url, error.message);
          
          // Fallback: try direct script injection without world property
          console.log('🔄 NostrX Background: Trying fallback authentication method...');
          
          try {
            const results = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                return new Promise((resolve) => {
                  let attempts = 0;
                  const maxAttempts = 10;
                  
                  const checkNostrWithRetry = async () => {
                    attempts++;
                    console.log(`NostrX Background: Fallback attempt ${attempts}/${maxAttempts} - Checking for window.nostr`);
                    
                    // Check if window.nostr exists
                    if (typeof window.nostr === 'undefined' || !window.nostr) {
                      if (attempts >= maxAttempts) {
                        resolve({ success: false, error: 'No Nostr extension detected. Please ensure your Nostr wallet (like Alby) is installed and unlocked.' });
                        return;
                      }
                      
                      // Wait before retry
                      setTimeout(checkNostrWithRetry, 500);
                      return;
                    }
                    
                    // Nostr extension found, try authentication
                    try {
                      console.log('NostrX Background: window.nostr detected, attempting authentication...');
                      
                      const pubkey = await window.nostr.getPublicKey();
                      if (!pubkey) {
                        throw new Error('Failed to get public key from Nostr wallet');
                      }
                      
                      // Test signing capability
                      const testEvent = {
                        kind: 1,
                        created_at: Math.floor(Date.now() / 1000),
                        tags: [],
                        content: 'NostrX Authentication Test',
                        pubkey: pubkey
                      };
                      
                      const signedEvent = await window.nostr.signEvent(testEvent);
                      if (!signedEvent || !signedEvent.sig) {
                        throw new Error('Wallet signing test failed');
                      }
                      
                      resolve({
                        success: true,
                        publicKey: pubkey,
                        timestamp: Date.now()
                      });
                      
                    } catch (error) {
                      resolve({ success: false, error: error.message });
                    }
                  };
                  
                  // Start checking immediately
                  checkNostrWithRetry();
                });
              }
            });
            
            if (results && results[0] && results[0].result) {
              const result = results[0].result;
              
              if (result.success) {
                console.log('✅ NostrX Background: Fallback authentication successful on tab:', tab.url);
                return result;
              } else {
                console.log('⚠️ NostrX Background: Fallback authentication failed on tab:', tab.url, result.error);
              }
            }
          } catch (fallbackError) {
            console.log('❌ NostrX Background: Fallback authentication error on tab:', tab.url, fallbackError.message);
          }
        }
        
      } catch (error) {
        console.log('⚠️ NostrX Background: Could not authenticate on tab:', tab.url, error.message);
        continue;
      }
    }
    
    throw new Error(`Authentication failed on all ${loadedTabs.length} Twitter/X tabs. Common solutions:\n\n1. Install a Nostr wallet extension (Alby, nos2x, etc.)\n2. Unlock your Nostr wallet extension\n3. Make sure the extension has permission to run on Twitter/X\n4. Try refreshing the Twitter/X page and reconnecting\n5. Check if other extensions are blocking Nostr wallet access\n\nIf the problem persists, try opening a new Twitter/X tab and authenticating again.`);
    
  } catch (error) {
    console.error('❌ NostrX Background: Authentication failed:', error);
    throw error;
  }
}