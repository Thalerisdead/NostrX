// Simple Test Script
// Run this in Twitter console to test basic functionality

console.log('=== Simple NostrX Test ===');

// Test 1: Check if we can send messages to background
console.log('Testing background communication...');
chrome.runtime.sendMessage({action: 'getSettings'}, (response) => {
  console.log('1. Background responds:', response?.success === true);
  
  if (response?.success) {
    console.log('✅ Background script working');
    
    // Test 2: Check Alby directly
    console.log('2. Testing Alby directly...');
    console.log('   window.nostr:', typeof window.nostr !== 'undefined');
    
    if (typeof window.nostr !== 'undefined') {
      console.log('✅ Alby detected');
      
      // Test 3: Try to get public key manually
      console.log('3. Testing public key...');
      window.nostr.getPublicKey().then(key => {
        console.log('✅ Public key obtained:', key.substring(0, 16) + '...');
        console.log('🎉 Everything should work! Try lightning bolt now.');
      }).catch(error => {
        console.log('❌ Public key error:', error.message);
        console.log('💡 Click "Allow" in Alby popup if it appears');
      });
    } else {
      console.log('❌ Alby not detected');
      console.log('💡 Make sure Alby is unlocked and configured for twitter.com');
    }
  } else {
    console.log('❌ Background script not responding');
    console.log('💡 Try reloading the extension');
  }
});

// Test 4: Check if lightning bolts exist
console.log('4. Lightning bolts found:', document.querySelectorAll('.nostrx-button').length);

console.log('=== Test Complete ===');