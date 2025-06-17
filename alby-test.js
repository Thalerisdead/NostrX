// Alby Test Script
// Copy and paste this into Twitter/X console to test Alby

console.log('=== Alby/Nostr Extension Test ===');

// Test 1: Check if window.nostr exists
console.log('1. window.nostr exists:', typeof window.nostr !== 'undefined');

if (typeof window.nostr !== 'undefined') {
  console.log('2. window.nostr object:', window.nostr);
  console.log('3. getPublicKey method:', typeof window.nostr.getPublicKey);
  console.log('4. signEvent method:', typeof window.nostr.signEvent);
  
  // Test 5: Try to get public key
  console.log('5. Testing getPublicKey...');
  window.nostr.getPublicKey()
    .then(pubkey => {
      console.log('✅ Success! Public key:', pubkey);
      
      // Test 6: Try to sign a simple event
      console.log('6. Testing signEvent...');
      const testEvent = {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: 'Test event from NostrX',
        pubkey: pubkey
      };
      
      return window.nostr.signEvent(testEvent);
    })
    .then(signedEvent => {
      console.log('✅ Success! Signed event:', signedEvent);
      console.log('🎉 Alby is working correctly!');
    })
    .catch(error => {
      console.error('❌ Error:', error);
      console.log('💡 Try unlocking Alby and granting permissions');
    });
} else {
  console.log('❌ window.nostr not found');
  console.log('💡 Possible solutions:');
  console.log('   1. Make sure Alby extension is installed and enabled');
  console.log('   2. Unlock Alby wallet');
  console.log('   3. Refresh this page');
  console.log('   4. Check if Alby is paused or disabled');
}

// Test Chrome extension communication
console.log('7. Testing Chrome extension messaging...');
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.sendMessage({action: 'getSettings'}, (response) => {
    console.log('8. NostrX background response:', response);
  });
} else {
  console.log('8. Chrome runtime not available');
}

console.log('=== Test Complete ===');