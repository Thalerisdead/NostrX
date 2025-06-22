let authResult = null;

async function authenticate() {
  const status = document.getElementById('status');
  const pubkeyDisplay = document.getElementById('pubkey-display');
  const retrySection = document.getElementById('retry-section');
  const closeInfo = document.getElementById('close-info');
  
  // Reset UI
  pubkeyDisplay.style.display = 'none';
  retrySection.style.display = 'none';
  closeInfo.style.display = 'none';
  
  try {
    status.innerHTML = '<span class="spinner"></span>Checking for Nostr extension...';
    status.className = '';
    
    // Wait a bit for extensions to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Checking for window.nostr...');
    console.log('window.nostr:', typeof window.nostr);
    
    if (typeof window.nostr === 'undefined') {
      throw new Error('No Nostr extension detected. Please install Alby, nos2x, or another NIP-07 compatible wallet extension.');
    }
    
    console.log('window.nostr found:', window.nostr);
    console.log('getPublicKey method:', typeof window.nostr.getPublicKey);
    console.log('signEvent method:', typeof window.nostr.signEvent);
    
    status.innerHTML = 'Nostr extension found! Requesting access...';
    status.className = 'warning';
    
    console.log('Requesting public key...');
    const pubkey = await window.nostr.getPublicKey();
    console.log('Received pubkey:', pubkey);
    
    if (!pubkey) {
      throw new Error('Failed to get public key from Nostr wallet');
    }
    
    // Display the public key
    pubkeyDisplay.innerHTML = `<div class="pubkey">Public Key: ${pubkey}</div>`;
    pubkeyDisplay.style.display = 'block';
    
    status.innerHTML = 'Testing wallet signing capability...';
    
    console.log('Testing signing...');
    const testEvent = {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: 'NostrX Authentication Test - This verifies your wallet can sign events.',
      pubkey: pubkey
    };
    
    const signedEvent = await window.nostr.signEvent(testEvent);
    console.log('Signed event:', signedEvent);
    
    if (!signedEvent || !signedEvent.sig) {
      throw new Error('Wallet signing test failed - no signature received');
    }
    
    console.log('Authentication successful!');
    status.innerHTML = '✅ Authentication successful!';
    status.className = 'success';
    closeInfo.style.display = 'block';
    
    // Store result globally so the extension can read it
    authResult = {
      success: true,
      publicKey: pubkey,
      timestamp: Date.now()
    };
    
    // Also store in localStorage as backup
    localStorage.setItem('nostrx_auth_result', JSON.stringify(authResult));
    
    // Send message to extension if possible
    try {
      if (chrome && chrome.runtime) {
        chrome.runtime.sendMessage({
          action: 'authComplete',
          result: authResult
        });
      }
    } catch (e) {
      console.log('Could not send message to extension:', e);
    }
    
    // Auto-close after 3 seconds
    setTimeout(() => {
      window.close();
    }, 3000);
    
  } catch (error) {
    console.error('Authentication error:', error);
    status.textContent = error.message;
    status.className = 'error';
    retrySection.style.display = 'block';
    
    authResult = {
      success: false,
      error: error.message,
      timestamp: Date.now()
    };
    
    localStorage.setItem('nostrx_auth_result', JSON.stringify(authResult));
  }
}

// Start authentication when page loads
window.addEventListener('load', () => {
  setTimeout(authenticate, 500);
});

// Make authResult available globally
window.getAuthResult = () => authResult; 