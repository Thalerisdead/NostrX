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