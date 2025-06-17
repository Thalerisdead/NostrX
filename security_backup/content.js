// NostrX Content Script - Injects Nostr buttons into Twitter/X interface

class NostrXContentScript {
  constructor() {
    this.processedTweets = new Set();
    this.observer = null;
    this.debounceTimer = null;
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

  start() {
    console.log('NostrX: Starting content script');
    this.processTweets();
    this.observeChanges();
    this.handleNavigation();
  }

  processTweets() {
    const tweets = document.querySelectorAll('article[data-testid="tweet"]');
    
    tweets.forEach(tweet => {
      if (!this.processedTweets.has(tweet)) {
        this.addNostrButton(tweet);
        this.processedTweets.add(tweet);
      }
    });
  }

  addNostrButton(tweetElement) {
    const actionBar = tweetElement.querySelector('[role="group"]');
    if (!actionBar) return;

    // Check if button already exists
    if (actionBar.querySelector('.nostrx-button')) return;

    // Extract tweet data
    const tweetData = this.extractTweetData(tweetElement);
    if (!tweetData) return;

    // Create Nostr button
    const nostrButton = this.createNostrButton(tweetData);
    
    // Insert button into action bar
    const lastButton = actionBar.lastElementChild;
    if (lastButton) {
      actionBar.insertBefore(nostrButton, lastButton.nextSibling);
    } else {
      actionBar.appendChild(nostrButton);
    }
  }

  extractTweetData(tweetElement) {
    try {
      // Extract tweet text
      const tweetTextElement = tweetElement.querySelector('[data-testid="tweetText"]');
      const tweetText = tweetTextElement ? tweetTextElement.innerText.trim() : '';

      // Extract username
      const usernameElement = tweetElement.querySelector('[data-testid="User-Name"] a[role="link"]');
      const username = usernameElement ? usernameElement.getAttribute('href').replace('/', '') : '';

      // Extract timestamp
      const timeElement = tweetElement.querySelector('time');
      const timestamp = timeElement ? timeElement.getAttribute('datetime') : new Date().toISOString();

      // Extract tweet URL
      const tweetUrlElement = tweetElement.querySelector('time').closest('a');
      const tweetUrl = tweetUrlElement ? `https://twitter.com${tweetUrlElement.getAttribute('href')}` : '';

      return {
        text: tweetText,
        username: username,
        timestamp: timestamp,
        url: tweetUrl
      };
    } catch (error) {
      console.error('NostrX: Error extracting tweet data:', error);
      return null;
    }
  }

  createNostrButton(tweetData) {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'nostrx-button-container';
    buttonContainer.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin: 0 4px;
    `;

    const button = document.createElement('button');
    button.className = 'nostrx-button';
    button.setAttribute('aria-label', 'Cross-post to Nostr');
    button.setAttribute('data-testid', 'nostrx-button');
    
    // Button styling to match Twitter's design
    button.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34.75px;
      height: 34.75px;
      border: none;
      background: transparent;
      border-radius: 9999px;
      cursor: pointer;
      transition: all 0.2s ease-in-out;
      position: relative;
      padding: 0;
      margin: 0;
    `;

    // Nostr icon (lightning bolt)
    const icon = document.createElement('div');
    icon.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
      </svg>
    `;
    icon.style.cssText = `
      color: rgb(113, 118, 123);
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    button.appendChild(icon);
    buttonContainer.appendChild(button);

    // Add hover effects
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = 'rgba(124, 58, 237, 0.1)';
      icon.style.color = 'rgb(124, 58, 237)';
    });

    button.addEventListener('mouseleave', () => {
      if (!button.classList.contains('posting')) {
        button.style.backgroundColor = 'transparent';
        icon.style.color = 'rgb(113, 118, 123)';
      }
    });

    // Add click handler
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleNostrPost(button, tweetData);
    });

    return buttonContainer;
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
      this.setButtonState(button, 'loading');
    } catch (e) {
      console.error('NostrX: Error setting button state:', e);
      return;
    }

    try {
      console.log('NostrX: Posting directly to Nostr (no background script)');
      
      // Check if Nostr is available
      if (typeof window.nostr === 'undefined') {
        throw new Error('window.nostr is not available. Make sure Alby is unlocked and has granted permissions to this site.');
      }
      
      console.log('NostrX: window.nostr found, proceeding with post');
      
      // Use default settings (can't access chrome.runtime in MAIN world)
      const settings = {
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
      
      if (!settings.enabled) {
        throw new Error('NostrX is disabled');
      }
      
      // Get public key
      console.log('NostrX: Getting public key from Alby...');
      const pubkey = await window.nostr.getPublicKey();
      console.log('NostrX: Got public key:', pubkey.substring(0, 16) + '...');
      
      // Format content
      let content = tweetData.text;
      if (settings.includeAttribution && tweetData.username) {
        content += `\n\nOriginally posted by @${tweetData.username} on X`;
        if (tweetData.url) {
          content += `\n${tweetData.url}`;
        }
      }
      
      // Create and sign event
      const event = {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: content,
        pubkey: pubkey
      };
      
      console.log('NostrX: Signing event...');
      const signedEvent = await window.nostr.signEvent(event);
      console.log('NostrX: Event signed successfully');
      
      // Send signed event to background script for relay publishing
      console.log('NostrX: Sending signed event to background script for relay publishing...');
      
      // Create a message channel to communicate with background script
      window.postMessage({
        type: 'NOSTRX_PUBLISH_EVENT',
        signedEvent: signedEvent,
        relays: settings.relays
      }, '*');
      
      // Wait for result from background script
      const publishResult = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Relay publishing timeout'));
        }, 30000);
        
        const messageHandler = (event) => {
          if (event.data.type === 'NOSTRX_PUBLISH_RESULT') {
            clearTimeout(timeout);
            window.removeEventListener('message', messageHandler);
            resolve(event.data);
          }
        };
        
        window.addEventListener('message', messageHandler);
      });
      
      console.log('NostrX: Publish result:', publishResult);
      
      if (!publishResult.success) {
        throw new Error(publishResult.error || 'Failed to publish to relays');
      }
      
      const successCount = publishResult.successCount || 0;
      console.log('NostrX: Published successfully to', successCount, 'out of', settings.relays.length, 'relays');
      
      console.log('NostrX: Post successful');
      this.setButtonState(button, 'success');
      setTimeout(() => {
        this.setButtonState(button, 'default');
        if (button.classList) {
          button.classList.remove('posting');
        }
      }, 2000);
      
    } catch (error) {
      console.error('NostrX: Error posting to Nostr:', error);
      this.setButtonState(button, 'error');
      setTimeout(() => {
        this.setButtonState(button, 'default');
        if (button.classList) {
          button.classList.remove('posting');
        }
      }, 3000);
    }
  }

  setButtonState(button, state) {
    const icon = button.querySelector('div');
    
    switch (state) {
      case 'loading':
        icon.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="31.416" stroke-dashoffset="31.416">
              <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
              <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
            </circle>
          </svg>
        `;
        icon.style.color = 'rgb(124, 58, 237)';
        button.style.backgroundColor = 'rgba(124, 58, 237, 0.1)';
        break;
        
      case 'success':
        icon.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        `;
        icon.style.color = 'rgb(34, 197, 94)';
        button.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
        break;
        
      case 'error':
        icon.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        `;
        icon.style.color = 'rgb(239, 68, 68)';
        button.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
        break;
        
      default: // 'default'
        icon.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
        `;
        icon.style.color = 'rgb(113, 118, 123)';
        button.style.backgroundColor = 'transparent';
        break;
    }
  }


  showErrorTooltip(button, errorMessage) {
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'nostrx-error-tooltip';
    tooltip.textContent = errorMessage;
    tooltip.style.cssText = `
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: #dc2626;
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      white-space: nowrap;
      z-index: 1000;
      margin-bottom: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;

    // Position tooltip relative to button
    const buttonContainer = button.closest('.nostrx-button-container');
    buttonContainer.style.position = 'relative';
    buttonContainer.appendChild(tooltip);

    // Remove tooltip after 3 seconds
    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.remove();
      }
    }, 3000);
  }

  observeChanges() {
    // Disconnect existing observer
    if (this.observer) {
      this.observer.disconnect();
    }

    // Create new observer for dynamic content
    this.observer = new MutationObserver((mutations) => {
      let shouldProcess = false;
      
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if new tweets were added
            if (node.matches && node.matches('article[data-testid="tweet"]')) {
              shouldProcess = true;
            } else if (node.querySelector && node.querySelector('article[data-testid="tweet"]')) {
              shouldProcess = true;
            }
          }
        });
      });

      if (shouldProcess) {
        this.debouncedProcessTweets();
      }
    });

    // Start observing
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  debouncedProcessTweets() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.processTweets();
    }, 200);
  }

  handleNavigation() {
    // Handle Twitter's SPA navigation
    let currentUrl = window.location.href;
    
    const checkForNavigation = () => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        // Clear processed tweets cache on navigation
        this.processedTweets.clear();
        // Process tweets after navigation with delay
        setTimeout(() => {
          this.processTweets();
        }, 1000);
      }
    };

    // Check for URL changes
    setInterval(checkForNavigation, 1000);
    
    // Also listen for popstate events
    window.addEventListener('popstate', () => {
      setTimeout(() => {
        this.processedTweets.clear();
        this.processTweets();
      }, 1000);
    });
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    clearTimeout(this.debounceTimer);
  }
}

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