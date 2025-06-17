// NostrX Content Script v3.0 - DUAL WORLD ARCHITECTURE - Main coordinator
// MAIN WORLD: window.nostr access | ISOLATED WORLD: chrome.runtime access | CACHE BUSTER: 2024-06-17-DUAL-V3

console.log('🌍 NostrX: MAIN world content script loaded');
console.log('🏗️ NostrX: Using dual-world architecture (MAIN + ISOLATED)');
console.log('🔧 NostrX: MAIN world handles: window.nostr, event signing, UI injection');
console.log('🔧 NostrX: ISOLATED world handles: chrome.runtime, background communication');

// ============================================================================
// MAIN CONTENT SCRIPT CLASS
// ============================================================================

class NostrXContentScript {
  constructor() {
    this.processedTweets = new Set();
    this.domObserver = new DOMObserver(async (navigationOccurred = false) => {
      if (navigationOccurred) {
        this.processedTweets.clear();
      }
      await this.processTweets();
    });
    this.init();
  }

  init() {
    // Wait for page to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.start());
    } else {
      this.start();
    }
  }

  async start() {
    console.log('NostrX: Starting content script');
    await this.processTweets();
    this.domObserver.start();
  }

  async processTweets() {
    const tweets = document.querySelectorAll('article[data-testid="tweet"]');
    
    for (const tweet of tweets) {
      if (!this.processedTweets.has(tweet)) {
        await this.addNostrButton(tweet);
        this.processedTweets.add(tweet);
      }
    }
  }

  async addNostrButton(tweetElement) {
    const actionBar = tweetElement.querySelector('[role="group"]');
    if (!actionBar) return;

    // Check if button already exists
    if (actionBar.querySelector('.nostrx-button')) return;

    // Extract tweet data (without expanding "Show more" during normal browsing)
    const tweetData = await TweetDataExtractor.extract(tweetElement);
    if (!tweetData) return;

    // Create Nostr button
    const nostrButton = NostrButtonCreator.create(tweetData, (button, data) => {
      this.handleNostrPost(button, data);
    });
    
    // Insert button into action bar
    const lastButton = actionBar.lastElementChild;
    if (lastButton) {
      actionBar.insertBefore(nostrButton, lastButton.nextSibling);
    } else {
      actionBar.appendChild(nostrButton);
    }
  }

  async handleNostrPost(button, tweetData) {
    // Validate button element
    if (!button || !button.classList) {
      console.error('NostrX: Invalid button element');
      return;
    }

    if (button.classList.contains('posting')) {
      console.log('NostrX: Already posting, ignoring click');
      return;
    }

    console.log('NostrX: Starting Nostr post for tweet:', tweetData);
    
    try {
      button.classList.add('posting');
      NostrButtonCreator.setState(button, 'loading');
    } catch (e) {
      console.error('NostrX: Error setting button state:', e);
      return;
    }

    try {
      console.log('🔥 NostrX: DUAL WORLD PUBLISHING - MAIN + ISOLATED + Background');
      
      // Set flag to allow "Show more" expansion during publishing
      window.nostrx_expanding_text = true;
      
      // Re-extract tweet data with expanded text for publishing
      const expandedTweetData = await TweetDataExtractor.extract(button.closest('article[data-testid="tweet"]'));
      const finalTweetData = expandedTweetData || tweetData; // fallback to original if re-extraction fails
      
      await NostrPublisher.publish(finalTweetData);
      
      // Clear flag
      window.nostrx_expanding_text = false;
      
      console.log('✅ NostrX: Dual world publishing successful!');
      NostrButtonCreator.setState(button, 'success');
      setTimeout(() => {
        NostrButtonCreator.setState(button, 'default');
        if (button.classList) {
          button.classList.remove('posting');
        }
      }, 2000);
      
    } catch (error) {
      console.error('NostrX: Error posting to Nostr:', error);
      
      // Clear flag on error too
      window.nostrx_expanding_text = false;
      
      NostrButtonCreator.setState(button, 'error');
      
      // Show more helpful error messages to the user (Direct mode only)
      let userMessage = error.message;
      if (error.message.includes('Publishing failed:')) {
        userMessage = 'Could not publish to any Nostr relays. Check connection.';
      } else if (error.message.includes('timeout') || error.message.includes('Connection timeout')) {
        userMessage = 'Connection to Nostr relays timed out. Please try again.';
      } else if (error.message.includes('window.nostr')) {
        userMessage = 'Nostr wallet not available. Please unlock Alby and try again.';
      } else if (error.message.includes('WebSocket')) {
        userMessage = 'Network connection issue. Check your internet connection.';
      } else if (error.message.includes('Failed to publish to relays')) {
        userMessage = 'Could not connect to Nostr relays. Check your internet connection.';
      } else {
        userMessage = 'Publishing failed. Please try again.';
      }
      
      // Show error tooltip to user
      NostrButtonCreator.showErrorTooltip(button, userMessage);
      
      setTimeout(() => {
        NostrButtonCreator.setState(button, 'default');
        if (button.classList) {
          button.classList.remove('posting');
        }
      }, 5000); // Increased timeout for error state
    }
  }

  destroy() {
    if (this.domObserver) {
      this.domObserver.destroy();
    }
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize the content script
let nostrX;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    nostrX = new NostrXContentScript();
  });
} else {
  nostrX = new NostrXContentScript();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (nostrX) {
    nostrX.destroy();
  }
});