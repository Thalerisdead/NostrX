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
});

console.log('🌉 NostrX Bridge: Ready to bridge MAIN ↔ ISOLATED ↔ Background');