// NostrX Content Bridge - ISOLATED world script for Chrome API communication

console.log('🌉 NostrX Bridge: ISOLATED world content bridge loaded');
console.log('🌉 NostrX Bridge: Timestamp:', new Date().toISOString());
console.log('🌉 NostrX Bridge: Chrome object available:', typeof chrome);
console.log('🌉 NostrX Bridge: Chrome runtime available:', !!chrome?.runtime);
console.log('🌉 NostrX Bridge: Chrome runtime sendMessage available:', !!chrome?.runtime?.sendMessage);
console.log('🌉 NostrX Bridge: Extension ID:', chrome?.runtime?.id);

// Test chrome.runtime access every 5 seconds
setInterval(() => {
  console.log('🌉 NostrX Bridge: Runtime check -', {
    chrome: typeof chrome,
    runtime: !!chrome?.runtime,
    sendMessage: !!chrome?.runtime?.sendMessage,
    id: chrome?.runtime?.id
  });
}, 5000);

// Listen for messages from MAIN world content script
window.addEventListener('message', async (event) => {
  // Only process messages from our extension
  if (event.source !== window || !event.data.type || !event.data.type.startsWith('NOSTRX_')) {
    return;
  }
  
  console.log('🌉 NostrX Bridge: Received message from MAIN world:', event.data.type);
  
  if (event.data.type === 'NOSTRX_PUBLISH_TO_BACKGROUND') {
    try {
      console.log('🚀 NostrX Bridge: Forwarding to background script...');
      console.log('🚀 NostrX Bridge: Chrome runtime check before send:', {
        chrome: typeof chrome,
        runtime: !!chrome?.runtime,
        sendMessage: !!chrome?.runtime?.sendMessage
      });
      
      // Check if chrome.runtime.sendMessage is available
      if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
        throw new Error('Chrome runtime not available in ISOLATED world. Chrome: ' + typeof chrome + ', Runtime: ' + !!chrome?.runtime + ', SendMessage: ' + !!chrome?.runtime?.sendMessage);
      }
      
      // Send to background script (this works in ISOLATED world)
      console.log('📡 NostrX Bridge: Sending message to background script...');
      const response = await chrome.runtime.sendMessage({
        action: 'publishToRelays',
        signedEvent: event.data.signedEvent,
        relays: event.data.relays
      });
      
      console.log('📊 NostrX Bridge: Background response:', response);
      
      // Send response back to MAIN world
      window.postMessage({
        type: 'NOSTRX_BACKGROUND_RESPONSE',
        requestId: event.data.requestId,
        success: response.success,
        successCount: response.successCount,
        error: response.error
      }, '*');
      
    } catch (error) {
      console.error('❌ NostrX Bridge: Error communicating with background:', error);
      console.error('❌ NostrX Bridge: Error stack:', error.stack);
      
      // Send error back to MAIN world
      window.postMessage({
        type: 'NOSTRX_BACKGROUND_RESPONSE',
        requestId: event.data.requestId,
        success: false,
        error: error.message
      }, '*');
    }
  }

  if (event.data.type === 'NOSTRX_AUTH_CHECK_REQUEST') {
    try {
      console.log('🔐 NostrX Bridge: Received auth check request from MAIN world');
      
      // Check if chrome.runtime.sendMessage is available
      if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
        throw new Error('Chrome runtime not available in ISOLATED world');
      }
      
      // Send auth check request to background script
      chrome.runtime.sendMessage({ action: 'checkAuth' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('❌ NostrX Bridge: Auth check error:', chrome.runtime.lastError);
          window.postMessage({
            type: 'NOSTRX_AUTH_CHECK_RESPONSE',
            requestId: event.data.requestId,
            authenticated: false,
            error: chrome.runtime.lastError.message
          }, '*');
          return;
        }
        
        console.log('🔐 NostrX Bridge: Auth check response:', response);
        window.postMessage({
          type: 'NOSTRX_AUTH_CHECK_RESPONSE',
          requestId: event.data.requestId,
          authenticated: response?.authenticated || false,
          publicKey: response?.publicKey,
          error: response?.error
        }, '*');
      });
      
    } catch (error) {
      console.error('❌ NostrX Bridge: Error in auth check bridge:', error);
      
      // Send error back to MAIN world
      window.postMessage({
        type: 'NOSTRX_AUTH_CHECK_RESPONSE',
        requestId: event.data.requestId,
        authenticated: false,
        error: error.message
      }, '*');
    }
  }

  if (event.data.type === 'NOSTRX_SETTINGS_REQUEST') {
    try {
      console.log('⚙️ NostrX Bridge: Received settings request from MAIN world');
      
      // Check if chrome.runtime.sendMessage is available
      if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
        throw new Error('Chrome runtime not available in ISOLATED world');
      }
      
      // Send settings request to background script
      chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('❌ NostrX Bridge: Settings request error:', chrome.runtime.lastError);
          window.postMessage({
            type: 'NOSTRX_SETTINGS_RESPONSE',
            requestId: event.data.requestId,
            success: false,
            error: chrome.runtime.lastError.message
          }, '*');
          return;
        }
        
        console.log('⚙️ NostrX Bridge: Settings response:', response);
        window.postMessage({
          type: 'NOSTRX_SETTINGS_RESPONSE',
          requestId: event.data.requestId,
          success: response?.success || false,
          settings: response?.settings,
          error: response?.error
        }, '*');
      });
      
    } catch (error) {
      console.error('❌ NostrX Bridge: Error in settings bridge:', error);
      
      // Send error back to MAIN world
      window.postMessage({
        type: 'NOSTRX_SETTINGS_RESPONSE',
        requestId: event.data.requestId,
        success: false,
        error: error.message
      }, '*');
    }
  }

  if (event.data.type === 'NOSTRX_AUTH_REQUEST') {
    try {
      console.log('🔐 NostrX Bridge: Forwarding auth request to background script...');
      
      // Check if chrome.runtime.sendMessage is available
      if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
        throw new Error('Chrome runtime not available in ISOLATED world');
      }
      
      // Send authentication request to background script (but not for tab-based auth)
      // Instead, send the auth result directly
      console.log('🔐 NostrX Bridge: Sending auth success to background script...');
      
      // Send response back to MAIN world immediately (since auth already happened in MAIN world)
      window.postMessage({
        type: 'NOSTRX_AUTH_RESPONSE',
        requestId: event.data.requestId,
        success: event.data.success,
        publicKey: event.data.publicKey,
        error: event.data.error
      }, '*');
      
    } catch (error) {
      console.error('❌ NostrX Bridge: Error in auth bridge:', error);
      
      // Send error back to MAIN world
      window.postMessage({
        type: 'NOSTRX_AUTH_RESPONSE',
        requestId: event.data.requestId,
        success: false,
        error: error.message
      }, '*');
    }
  }
});

console.log('🌉 NostrX Bridge: Ready to bridge MAIN ↔ ISOLATED ↔ Background');

// Handle messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ping') {
    console.log('🏓 NostrX Bridge: Ping received');
    sendResponse({ status: 'pong', timestamp: Date.now() });
    return true;
  }
  
  if (message.action === 'authenticateNostr') {
    console.log('🔐 NostrX Bridge: Authentication request received from background');
    
    // Forward auth request to MAIN world content script
    window.postMessage({
      type: 'NOSTRX_AUTH_REQUEST_FROM_BACKGROUND',
      requestId: message.requestId || 'auth_' + Date.now()
    }, '*');
    
    // Listen for auth response from MAIN world and forward to background
    const authResponseListener = (event) => {
      if (event.source === window && 
          event.data.type === 'NOSTRX_AUTH_REQUEST' && 
          event.data.requestId === (message.requestId || 'auth_' + Date.now())) {
        
        console.log('🔐 NostrX Bridge: Received auth response from MAIN world:', event.data);
        
        // Clean up listener
        window.removeEventListener('message', authResponseListener);
        
        // Send response back to background script
        sendResponse({
          success: event.data.success,
          publicKey: event.data.publicKey,
          error: event.data.error,
          timestamp: Date.now()
        });
      }
    };
    
    window.addEventListener('message', authResponseListener);
    
    // Timeout after 25 seconds
    setTimeout(() => {
      window.removeEventListener('message', authResponseListener);
      sendResponse({
        success: false,
        error: 'Authentication timeout in content script'
      });
    }, 25000);
    
    return true; // Keep sendResponse callback alive
  }
});