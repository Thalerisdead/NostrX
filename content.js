// NostrX Content Script v3.0 - DUAL WORLD ARCHITECTURE - Injects Nostr buttons into Twitter/X interface
// MAIN WORLD: window.nostr access | ISOLATED WORLD: chrome.runtime access | CACHE BUSTER: 2024-06-17-DUAL-V3

console.log('🌍 NostrX: MAIN world content script loaded');
console.log('🏗️ NostrX: Using dual-world architecture (MAIN + ISOLATED)');
console.log('🔧 NostrX: MAIN world handles: window.nostr, event signing, UI injection');
console.log('🔧 NostrX: ISOLATED world handles: chrome.runtime, background communication');

// ============================================================================
// UTILITY MODULES
// ============================================================================

class TweetDataExtractor {
  static async extract(tweetElement) {
    try {
      // Extract tweet text - improved to handle longer tweets and multiple text elements
      let tweetText = '';
      
      // Primary method: Get text from the main tweet text container
      const tweetTextElement = tweetElement.querySelector('[data-testid="tweetText"]');
      if (tweetTextElement) {
        // Only expand "Show more" during publishing, not during normal browsing
        // This prevents auto-opening posts while scrolling
        const showMoreButton = tweetElement.querySelector('[data-testid="tweet-text-show-more-link"]');
        if (showMoreButton && window.nostrx_expanding_text) {
          console.log('NostrX: Found "Show more" button, clicking to expand full text for publishing');
          try {
            showMoreButton.click();
            // Wait a moment for the text to expand
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.warn('NostrX: Error clicking show more button:', error);
          }
        }
        
        tweetText = tweetTextElement.innerText.trim();
      }
      
      // Fallback method: If text is empty or very short, try alternative selectors
      if (!tweetText || tweetText.length < 10) {
        // Try to find text in spans within the tweet
        const textSpans = tweetElement.querySelectorAll('[data-testid="tweetText"] span, [lang] span');
        if (textSpans.length > 0) {
          tweetText = Array.from(textSpans)
            .map(span => span.innerText)
            .filter(text => text && text.trim())
            .join('');
        }
      }
      
      // Additional fallback: Look for any text content in the tweet body
      if (!tweetText || tweetText.length < 10) {
        const tweetBody = tweetElement.querySelector('[data-testid="tweetText"]')?.closest('div[lang]');
        if (tweetBody) {
          tweetText = tweetBody.innerText.trim();
        }
      }
      
      // Final fallback: Get all text content and filter out UI elements
      if (!tweetText) {
        const allTextElements = tweetElement.querySelectorAll('span[dir], div[dir], div[lang]');
        const textParts = Array.from(allTextElements)
          .map(el => el.innerText?.trim())
          .filter(text => text && 
            text.length > 5 && 
            !text.includes('·') && 
            !text.includes('@') && 
            !text.match(/^\d+[smhd]$/) && // Time indicators like "2h", "1d"
            !text.match(/^[\d,]+$/) // Numbers only (likes, retweets, etc.)
          );
        
        if (textParts.length > 0) {
          tweetText = textParts.join(' ').trim();
        }
      }

      // Extract username
      const usernameElement = tweetElement.querySelector('[data-testid="User-Name"] a[role="link"]');
      const username = usernameElement ? usernameElement.getAttribute('href').replace('/', '') : '';

      // Extract timestamp
      const timeElement = tweetElement.querySelector('time');
      const timestamp = timeElement ? timeElement.getAttribute('datetime') : new Date().toISOString();

      // Extract tweet URL
      const tweetUrlElement = timeElement ? timeElement.closest('a') : null;
      const tweetUrl = tweetUrlElement ? `https://twitter.com${tweetUrlElement.getAttribute('href')}` : '';

      // Log extracted text length for debugging
      console.log('NostrX: Extracted tweet text length:', tweetText.length, 'Preview:', tweetText.substring(0, 100) + '...');

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
}

class SVGIcons {
  static createLightningBolt() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '18');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '13 2 3 14 12 14 11 22 21 10 12 10 13 2');
    svg.appendChild(polygon);
    
    return svg;
  }
}

class NostrButtonCreator {
  static create(tweetData, clickHandler) {
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

    // Create icon container
    const icon = document.createElement('div');
    const svg = SVGIcons.createLightningBolt();
    icon.appendChild(svg);
    icon.style.cssText = `
      color: rgb(113, 118, 123);
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    button.appendChild(icon);
    buttonContainer.appendChild(button);

    // Add hover effects
    this.setupHoverEffects(button, icon);
    
    // Add click handler
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      clickHandler(button, tweetData);
    });

    return buttonContainer;
  }

  static setupHoverEffects(button, icon) {
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
  }

  static setState(button, state) {
    const icon = button.querySelector('div');
    if (!icon) return;
    
    // Clear existing content
    icon.innerHTML = '';
    
    // Add new SVG
    const svg = SVGIcons.createLightningBolt();
    icon.appendChild(svg);
    
    const states = {
      loading: { color: 'rgb(124, 58, 237)', bg: 'rgba(124, 58, 237, 0.1)' },
      success: { color: 'rgb(34, 197, 94)', bg: 'rgba(34, 197, 94, 0.1)' },
      error: { color: 'rgb(239, 68, 68)', bg: 'rgba(239, 68, 68, 0.1)' },
      default: { color: 'rgb(113, 118, 123)', bg: 'transparent' }
    };
    
    const stateConfig = states[state] || states.default;
    icon.style.color = stateConfig.color;
    button.style.backgroundColor = stateConfig.bg;
  }

  static showErrorTooltip(button, errorMessage) {
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

    const buttonContainer = button.closest('.nostrx-button-container');
    buttonContainer.style.position = 'relative';
    buttonContainer.appendChild(tooltip);

    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.remove();
      }
    }, 3000);
  }
}

class NostrPublisher {
  static getDefaultSettings() {
    return {
      relays: [
        'wss://relay.damus.io',
        'wss://nostr-pub.wellorder.net',
        'wss://nos.lol',
        'wss://relay.snort.social',
        'wss://relay.nostr.band'
      ],
      includeAttribution: true,
      enabled: true
    };
  }
  
  // Direct relay publishing fallback (without background script)
  static async publishDirectToRelays(signedEvent, relays) {
    console.log('🌐 NostrX: Publishing directly to relays (fallback mode)');
    console.log(`📡 NostrX: Attempting to connect to ${relays.length} relays:`, relays);
    
    const publishPromises = relays.map(relay => this.publishToSingleRelay(signedEvent, relay));
    const results = await Promise.allSettled(publishPromises);
    
    let successCount = 0;
    const errors = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successCount++;
        console.log(`✅ NostrX: Successfully published to ${relays[index]}`);
      } else {
        errors.push(`${relays[index]}: ${result.reason.message}`);
        console.error(`❌ NostrX: Failed to publish to ${relays[index]}:`, result.reason);
      }
    });
    
    console.log(`📈 NostrX: Direct publishing summary: ${successCount}/${relays.length} relays succeeded`);
    
    return {
      success: successCount > 0,
      successCount,
      totalRelays: relays.length,
      errors: errors.length > 0 ? errors : undefined
    };
  }
  
  static async publishToSingleRelay(event, relayUrl) {
    return new Promise((resolve, reject) => {
      console.log(`🔌 NostrX: Connecting to relay: ${relayUrl}`);
      const ws = new WebSocket(relayUrl);
      const timeout = setTimeout(() => {
        console.warn(`⏰ NostrX: Connection timeout to ${relayUrl}`);
        ws.close();
        reject(new Error('Connection timeout'));
      }, 10000);
      
      ws.onopen = () => {
        clearTimeout(timeout);
        console.log(`🔗 NostrX: Connected to ${relayUrl}`);
        
        // Send the event
        const message = JSON.stringify(['EVENT', event]);
        console.log(`📤 NostrX: Sending event to ${relayUrl}`);
        ws.send(message);
        
        // Set up response timeout
        const responseTimeout = setTimeout(() => {
          console.warn(`⏰ NostrX: No response from ${relayUrl}`);
          ws.close();
          reject(new Error('No response from relay'));
        }, 5000);
        
        ws.onmessage = (msg) => {
          clearTimeout(responseTimeout);
          console.log(`📥 NostrX: Response from ${relayUrl}:`, msg.data);
          try {
            const data = JSON.parse(msg.data);
            if (data[0] === 'OK' && data[1] === event.id) {
              if (data[2] === true) {
                console.log(`✅ NostrX: Event accepted by ${relayUrl}`);
                ws.close();
                resolve(true);
              } else {
                console.error(`❌ NostrX: Event rejected by ${relayUrl}:`, data[3]);
                ws.close();
                reject(new Error(data[3] || 'Relay rejected the event'));
              }
            }
          } catch (error) {
            console.error(`❌ NostrX: Invalid response from ${relayUrl}:`, error);
            ws.close();
            reject(new Error('Invalid response from relay'));
          }
        };
      };
      
      ws.onerror = (error) => {
        clearTimeout(timeout);
        console.error(`❌ NostrX: WebSocket error with ${relayUrl}:`, error);
        reject(new Error(`WebSocket error: ${error.message || 'Unknown error'}`));
      };
      
      ws.onclose = (event) => {
        clearTimeout(timeout);
        if (event.code !== 1000) {
          console.warn(`🔌 NostrX: Connection closed unexpectedly to ${relayUrl}: ${event.code}`);
          reject(new Error(`Connection closed unexpectedly: ${event.code}`));
        }
      };
    });
  }
  
  static async publish(tweetData) {
    console.log('🔥 NostrX: DUAL WORLD PUBLISHING - MAIN world signs, ISOLATED world publishes');
    
    // Check if Nostr is available
    if (typeof window.nostr === 'undefined') {
      throw new Error('window.nostr is not available. Make sure Alby is unlocked and has granted permissions to this site.');
    }
    
    console.log('✅ NostrX: window.nostr found, proceeding with dual world architecture');
    
    const settings = this.getDefaultSettings();
    
    if (!settings.enabled) {
      throw new Error('NostrX is disabled');
    }
    
    // Get public key
    console.log('🔑 NostrX: Getting public key from Alby...');
    const pubkey = await window.nostr.getPublicKey();
    console.log('🔑 NostrX: Got public key:', pubkey.substring(0, 16) + '...');
    
    // Format content
    let content = tweetData.text;
    
    // Debug: Log the original text length and content
    console.log('📝 NostrX: Original tweet text length:', content.length);
    console.log('📝 NostrX: Original tweet text:', content);
    
    if (settings.includeAttribution && tweetData.username) {
      content += `\n\nOriginally posted by @${tweetData.username} on X`;
      if (tweetData.url) {
        content += `\n${tweetData.url}`;
      }
    }
    
    // Debug: Log final content length
    console.log('📝 NostrX: Final content length:', content.length);
    
    // Create and sign event
    const event = {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: content,
      pubkey: pubkey
    };
    
    console.log('✍️ NostrX: Signing event...');
    console.log('⚠️ NostrX: About to request signature - extension context may invalidate during user approval');
    const signedEvent = await window.nostr.signEvent(event);
    console.log('✍️ NostrX: Event signed successfully');
    console.log('🔄 NostrX: Post-signature - checking if extension context is still valid...');
    
    // Add event ID for tracking
    const eventId = await this.generateEventId(signedEvent);
    signedEvent.id = eventId;
    
    console.log('🚀 NostrX: DUAL WORLD MODE - Signing in MAIN world, publishing via ISOLATED world');
    console.log('📋 NostrX: Event to publish:', { 
      id: signedEvent.id, 
      content_length: signedEvent.content?.length,
      pubkey: signedEvent.pubkey?.substring(0, 16) + '...'
    });
    
    // Try background script approach first, then fallback to storage method
    console.log('🌉 NostrX: Attempting bridge communication (may fail if context invalidated)...');
    
    try {
      const response = await this.sendToBackgroundViaBridge(signedEvent, settings.relays);
      console.log('📊 NostrX: Bridge response:', response);
      
      if (!response.success) {
        throw new Error(response.error || 'Background script failed to publish');
      }
      
      const successCount = response.successCount || 0;
      console.log('🎉 NostrX: Published successfully via bridge to', successCount, 'out of', settings.relays.length, 'relays');
      
      return response;
      
    } catch (error) {
      console.error('❌ NostrX: Bridge communication failed:', error);
      console.error('❌ NostrX: Error details:', error.message);
      
      // Special handling for extension context invalidation
      console.log('🔍 NostrX: Checking for context invalidation. Error message:', JSON.stringify(error.message));
      console.log('🔍 NostrX: Includes "Extension context invalidated":', error.message.includes('Extension context invalidated'));
      console.log('🔍 NostrX: Includes "context invalidated":', error.message.includes('context invalidated'));
      
      if (error.message.includes('Extension context invalidated') || 
          error.message.includes('context invalidated') ||
          error.message.includes('Context invalidated') ||
          error.message.toLowerCase().includes('context invalidated')) {
        console.log('🔄 NostrX: Extension context invalidated detected - using storage-based publishing...');
        try {
          return await this.publishViaStorage(signedEvent, settings.relays);
        } catch (storageError) {
          console.error('❌ NostrX: Storage publishing also failed:', storageError);
          throw new Error('Storage publishing failed: ' + storageError.message);
        }
      }
      
      // For other bridge errors, try direct publishing
      console.log('🔄 NostrX: Bridge failed for other reason - attempting direct relay publishing...');
      
      try {
        const publishResult = await this.publishDirectToRelays(signedEvent, settings.relays);
        console.log('📊 NostrX: Direct relay publish result:', publishResult);
        
        if (!publishResult.success) {
          throw new Error('Direct publishing failed: ' + (publishResult.error || 'Failed to publish to relays'));
        }
        
        return publishResult;
        
      } catch (directError) {
        console.error('❌ NostrX: Direct publishing also failed:', directError);
        throw new Error('Both bridge and direct publishing failed. Bridge: ' + error.message + '. Direct: ' + directError.message);
      }
    }
  }
  
  // Storage-based publishing when extension context is invalidated
  static async publishViaStorage(signedEvent, relays) {
    console.log('💾 NostrX: Using storage-based publishing (context invalidated workaround)');
    
    try {
      // Store event in localStorage for background script to pick up
      const publishRequest = {
        signedEvent: signedEvent,
        relays: relays,
        timestamp: Date.now(),
        id: 'publish_' + Date.now()
      };
      
      console.log('💾 NostrX: Storing publish request in localStorage...');
      localStorage.setItem('nostrx_publish_request', JSON.stringify(publishRequest));
      
      // Trigger storage event by updating a timestamp
      localStorage.setItem('nostrx_publish_trigger', Date.now().toString());
      
      // Wait for result with timeout
      const result = await this.waitForStorageResult(publishRequest.id, 30000);
      
      console.log('💾 NostrX: Storage-based publish result:', result);
      return result;
      
    } catch (error) {
      console.error('❌ NostrX: Storage-based publishing failed:', error);
      throw new Error('Storage-based publishing failed: ' + error.message);
    }
  }
  
  // Wait for publishing result in localStorage
  static async waitForStorageResult(requestId, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkResult = () => {
        try {
          const resultJson = localStorage.getItem('nostrx_publish_result_' + requestId);
          if (resultJson) {
            const result = JSON.parse(resultJson);
            localStorage.removeItem('nostrx_publish_result_' + requestId);
            localStorage.removeItem('nostrx_publish_request');
            resolve(result);
            return;
          }
          
          if (Date.now() - startTime > timeout) {
            reject(new Error('Storage-based publishing timeout'));
            return;
          }
          
          setTimeout(checkResult, 100);
        } catch (error) {
          reject(error);
        }
      };
      
      checkResult();
    });
  }
  
  // Send signed event to background script via ISOLATED world bridge
  static async sendToBackgroundViaBridge(signedEvent, relays) {
    return new Promise((resolve, reject) => {
      const requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const timeout = setTimeout(() => {
        console.error('⏰ NostrX: Bridge communication timeout - no response from ISOLATED world');
        window.removeEventListener('message', responseHandler);
        reject(new Error('Bridge communication timeout'));
      }, 10000); // 10 second timeout for faster debugging
      
      const responseHandler = (event) => {
        if (event.data.type === 'NOSTRX_BACKGROUND_RESPONSE' && event.data.requestId === requestId) {
          console.log('📥 NostrX: Received response from bridge:', event.data);
          clearTimeout(timeout);
          window.removeEventListener('message', responseHandler);
          
          if (event.data.success) {
            resolve({
              success: true,
              successCount: event.data.successCount,
              error: event.data.error
            });
          } else {
            reject(new Error(event.data.error || 'Background script failed'));
          }
        }
      };
      
      // Listen for response from bridge
      window.addEventListener('message', responseHandler);
      
      // Send request to ISOLATED world bridge
      console.log('📤 NostrX: Sending to ISOLATED world bridge...', {
        requestId: requestId,
        relaysCount: relays.length,
        eventId: signedEvent.id?.substring(0, 16) + '...'
      });
      window.postMessage({
        type: 'NOSTRX_PUBLISH_TO_BACKGROUND',
        requestId: requestId,
        signedEvent: signedEvent,
        relays: relays
      }, '*');
    });
  }
  
  // Generate proper Nostr event ID using SHA-256
  static async generateEventId(event) {
    const serialized = JSON.stringify([
      0,
      event.pubkey,
      event.created_at,
      event.kind,
      event.tags,
      event.content
    ]);
    
    // Use Web Crypto API for proper SHA-256 hash
    const encoder = new TextEncoder();
    const data = encoder.encode(serialized);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  }
}

class DOMObserver {
  constructor(onTweetsAdded) {
    this.observer = null;
    this.debounceTimer = null;
    this.onTweetsAdded = onTweetsAdded;
    this.currentUrl = window.location.href;
  }

  start() {
    this.observeChanges();
    this.handleNavigation();
  }

  observeChanges() {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new MutationObserver((mutations) => {
      let shouldProcess = false;
      
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.matches && node.matches('article[data-testid="tweet"]')) {
              shouldProcess = true;
            } else if (node.querySelector && node.querySelector('article[data-testid="tweet"]')) {
              shouldProcess = true;
            }
          }
        });
      });

      if (shouldProcess) {
        this.debouncedCallback();
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  debouncedCallback() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.onTweetsAdded();
    }, 200);
  }

  handleNavigation() {
    const checkForNavigation = () => {
      if (window.location.href !== this.currentUrl) {
        this.currentUrl = window.location.href;
        setTimeout(() => {
          this.onTweetsAdded(true); // true indicates navigation occurred
        }, 1000);
      }
    };

    setInterval(checkForNavigation, 1000);
    
    window.addEventListener('popstate', () => {
      setTimeout(() => {
        this.onTweetsAdded(true);
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