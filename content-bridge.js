// NostrX Content Bridge - Runs in ISOLATED world to communicate with background script

console.log('NostrX Bridge: Content bridge script loaded');

// Listen for messages from main content script
window.addEventListener('message', async (event) => {
  if (event.data.type === 'NOSTRX_PUBLISH_EVENT') {
    console.log('NostrX Bridge: Received publish request', event.data);
    
    try {
      // Forward to background script
      const response = await chrome.runtime.sendMessage({
        action: 'publishToRelays',
        signedEvent: event.data.signedEvent,
        relays: event.data.relays
      });
      
      console.log('NostrX Bridge: Background response:', response);
      
      // Send result back to main content script
      window.postMessage({
        type: 'NOSTRX_PUBLISH_RESULT',
        success: response.success,
        successCount: response.successCount,
        error: response.error
      }, '*');
      
    } catch (error) {
      console.error('NostrX Bridge: Error communicating with background:', error);
      
      // Send error back to main content script
      window.postMessage({
        type: 'NOSTRX_PUBLISH_RESULT',
        success: false,
        error: error.message
      }, '*');
    }
  }
});