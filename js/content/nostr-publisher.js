// Nostr Publisher - Handles publishing events to Nostr relays

class NostrPublisher {
  static async getSettings() {
    try {
      console.log('⚙️ NostrX: Getting settings via bridge...');
      
      const response = await new Promise((resolve, reject) => {
        const requestId = 'settings_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const timeout = setTimeout(() => {
          window.removeEventListener('message', responseHandler);
          reject(new Error('Settings request timeout'));
        }, 5000);
        
        const responseHandler = (event) => {
          if (event.data.type === 'NOSTRX_SETTINGS_RESPONSE' && event.data.requestId === requestId) {
            clearTimeout(timeout);
            window.removeEventListener('message', responseHandler);
            resolve(event.data);
          }
        };
        
        window.addEventListener('message', responseHandler);
        
        // Send request to ISOLATED world bridge
        window.postMessage({
          type: 'NOSTRX_SETTINGS_REQUEST',
          requestId: requestId
        }, '*');
      });
      
      if (response && response.success) {
        console.log('⚙️ NostrX: Settings retrieved successfully');
        return response.settings;
      } else {
        throw new Error('Failed to get settings from background script');
      }
    } catch (error) {
      console.error('❌ NostrX: Error getting settings:', error);
      console.log('⚙️ NostrX: Using fallback default settings');
      // Fallback to default settings
      return {
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
    }
  }
  
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
    
    // First check quota limits
    console.log('📊 NostrX: Checking quota limits...');
    try {
      const quotaCheck = await new Promise((resolve, reject) => {
        const requestId = 'quota_check_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const timeout = setTimeout(() => {
          window.removeEventListener('message', responseHandler);
          reject(new Error('Quota check timeout'));
        }, 5000);
        
        const responseHandler = (event) => {
          if (event.data.type === 'NOSTRX_QUOTA_CHECK_RESPONSE' && event.data.requestId === requestId) {
            clearTimeout(timeout);
            window.removeEventListener('message', responseHandler);
            resolve(event.data);
          }
        };
        
        window.addEventListener('message', responseHandler);
        
        // Send request to ISOLATED world bridge
        window.postMessage({
          type: 'NOSTRX_QUOTA_CHECK_REQUEST',
          requestId: requestId
        }, '*');
      });
      
      if (!quotaCheck.canPost) {
        const tier = quotaCheck.tier || 'basic';
        const used = quotaCheck.used || 0;
        const limit = quotaCheck.limit || 3;
        throw new Error(`Daily limit reached! You've used ${used}/${limit} posts on your ${tier} plan. Upgrade to post more.`);
      }
      
      console.log('✅ NostrX: Quota check passed - can post');
    } catch (error) {
      console.error('❌ NostrX: Quota check failed:', error);
      throw error;
    }
    
    // Then verify authentication status via bridge
    console.log('🔐 NostrX: Verifying authentication status via bridge...');
    try {
      const authCheck = await new Promise((resolve, reject) => {
        const requestId = 'auth_check_pub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const timeout = setTimeout(() => {
          window.removeEventListener('message', responseHandler);
          reject(new Error('Authentication check timeout'));
        }, 5000);
        
        const responseHandler = (event) => {
          if (event.data.type === 'NOSTRX_AUTH_CHECK_RESPONSE' && event.data.requestId === requestId) {
            clearTimeout(timeout);
            window.removeEventListener('message', responseHandler);
            resolve(event.data);
          }
        };
        
        window.addEventListener('message', responseHandler);
        
        // Send request to ISOLATED world bridge
        window.postMessage({
          type: 'NOSTRX_AUTH_CHECK_REQUEST',
          requestId: requestId
        }, '*');
      });
      
      if (!authCheck || !authCheck.authenticated) {
        throw new Error('User not authenticated. Please authenticate with your Nostr wallet first.');
      }
      
      console.log('✅ NostrX: User authenticated with pubkey:', authCheck.publicKey?.substring(0, 16) + '...');
    } catch (error) {
      console.error('❌ NostrX: Authentication check failed:', error);
      throw new Error('Authentication required. Please authenticate with your Nostr wallet.');
    }
    
    // Check if Nostr is available
    if (typeof window.nostr === 'undefined') {
      throw new Error('window.nostr is not available. Make sure Alby is unlocked and has granted permissions to this site.');
    }
    
    console.log('✅ NostrX: window.nostr found, proceeding with dual world architecture');
    
    const settings = await this.getSettings();
    
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
      
      // Increment usage quota after successful posting
      if (successCount > 0) {
        console.log('📊 NostrX: Incrementing usage quota...');
        try {
          await new Promise((resolve, reject) => {
            const requestId = 'quota_increment_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            const timeout = setTimeout(() => {
              window.removeEventListener('message', responseHandler);
              reject(new Error('Quota increment timeout'));
            }, 5000);
            
            const responseHandler = (event) => {
              if (event.data.type === 'NOSTRX_QUOTA_INCREMENT_RESPONSE' && event.data.requestId === requestId) {
                clearTimeout(timeout);
                window.removeEventListener('message', responseHandler);
                resolve(event.data);
              }
            };
            
            window.addEventListener('message', responseHandler);
            
            // Send request to ISOLATED world bridge
            window.postMessage({
              type: 'NOSTRX_QUOTA_INCREMENT_REQUEST',
              requestId: requestId
            }, '*');
          });
          console.log('📊 NostrX: Usage quota incremented successfully');
        } catch (error) {
          console.error('❌ NostrX: Failed to increment usage quota:', error);
          // Don't fail the whole operation for quota tracking issues
        }
      }
      
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
        console.log('🔄 NostrX: Extension context invalidated detected - skipping storage, using direct relay publishing...');
        try {
          console.log('🔄 NostrX: Attempting direct relay publishing as fallback...');
          const publishResult = await this.publishDirectToRelays(signedEvent, settings.relays);
          console.log('📊 NostrX: Direct relay publish result after context invalidation:', publishResult);
          
          if (!publishResult.success) {
            throw new Error('Direct publishing failed: ' + (publishResult.error || 'Failed to publish to relays'));
          }
          
          return publishResult;
        } catch (directError) {
          console.error('❌ NostrX: Direct publishing failed after context invalidation:', directError);
          throw new Error('Direct publishing failed after context invalidation: ' + directError.message);
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

// Export for use in other modules
window.NostrPublisher = NostrPublisher;