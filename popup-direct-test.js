// Direct Alby Test for Popup
// This bypasses the background script to test Alby directly

async function testAlbyDirect() {
  console.log('=== Direct Alby Test from Popup ===');
  
  try {
    // Get current active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('Active tab:', tabs[0]?.url);
    
    if (!tabs[0]) {
      console.log('❌ No active tab found');
      return false;
    }
    
    // Test if we can inject and run code directly
    const result = await chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: () => {
        console.log('Direct test: window.nostr type:', typeof window.nostr);
        
        if (typeof window.nostr === 'undefined') {
          return { success: false, error: 'window.nostr undefined' };
        }
        
        if (typeof window.nostr.getPublicKey !== 'function') {
          return { success: false, error: 'getPublicKey not a function' };
        }
        
        if (typeof window.nostr.signEvent !== 'function') {
          return { success: false, error: 'signEvent not a function' };
        }
        
        return { success: true, nostr: true };
      }
    });
    
    console.log('Direct test result:', result[0]?.result);
    return result[0]?.result?.success === true;
    
  } catch (error) {
    console.error('Direct test error:', error);
    return false;
  }
}

// Run the test
testAlbyDirect().then(success => {
  console.log('Final result - Alby working:', success);
});