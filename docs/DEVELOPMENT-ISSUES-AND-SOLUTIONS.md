# NostrX Development Issues & Solutions

This document chronicles the technical challenges encountered during NostrX development and the solutions implemented to overcome them.

## Issue #1: Missing Chrome Extension Permissions

### Problem
```
NostrX: Script execution failed: EvalError: Refused to evaluate a string as JavaScript because 'unsafe-eval' is not an allowed source of script
```

### Root Cause
- Manifest was missing the `"scripting"` permission
- Background script couldn't execute code in content tabs
- Chrome's Content Security Policy blocked dynamic code execution

### Solution Applied
```json
// manifest.json
"permissions": [
  "storage",
  "activeTab",
  "scripting",  // ← Added this
  "tabs"
],
```

### Technical Details
- **`scripting`** permission enables `chrome.scripting.executeScript()`
- **`tabs`** permission enables `chrome.tabs.query()` for active tab detection
- Extension needs to be reloaded after permission changes

---

## Issue #2: Dynamic Code Execution (CSP Violation)

### Problem
```
EvalError: Refused to evaluate a string as JavaScript because 'unsafe-eval' is not an allowed source of script
```

### Root Cause
- Background script used `new Function(code)` to inject dynamic code
- Twitter's Content Security Policy blocks eval-style operations
- Chrome extensions follow stricter CSP rules

### Initial Solution (Improved)
```javascript
// Before (Broken)
func: new Function('return ' + code),

// After (Working)
func: actualFunction,
```

### Technical Implementation
- Replaced string-based code injection with proper function injection
- Used Chrome's `executeScript` API with actual function objects
- Eliminated all dynamic code evaluation

---

## Issue #3: Alby Detection Working Manually But Not Programmatically

### Problem
```javascript
// Manual test in console: WORKS
console.log('Alby:', typeof window.nostr !== 'undefined'); // true

// Extension test: FAILS
NostrX: window.nostr type: undefined
```

### Root Cause
**Timing Issue**: Alby injects `window.nostr` asynchronously after page load
- Extension scripts run immediately at `document_end`
- Alby injection happens later in the page lifecycle
- Race condition between extension and Alby initialization

### Solution Applied
**Retry Logic with Exponential Backoff**:
```javascript
const testFunctionWithRetry = () => {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 10;
    
    const checkNostr = () => {
      attempts++;
      console.log(`Attempt ${attempts} - Checking window.nostr:`, typeof window.nostr);
      
      if (typeof window.nostr !== 'undefined' && 
          typeof window.nostr.getPublicKey === 'function' &&
          typeof window.nostr.signEvent === 'function') {
        resolve(true);
        return;
      }
      
      if (attempts >= maxAttempts) {
        resolve(false);
        return;
      }
      
      setTimeout(checkNostr, 500); // Wait 500ms between attempts
    };
    
    checkNostr();
  });
};
```

### Technical Details
- **5-second total wait time** (10 attempts × 500ms)
- **Validates both existence and functionality** of Nostr methods
- **Graceful degradation** if Alby never loads

---

## Issue #4: Context Isolation (The Big One!)

### Problem
```javascript
// Console test: WORKS
console.log('Alby:', typeof window.nostr !== 'undefined'); // true

// Extension execution in background: FAILS
NostrX: window.nostr type: undefined (even with retry logic)
```

### Root Cause
**JavaScript Context Isolation**:
- Chrome extensions run in **isolated JavaScript context**
- Alby injects `window.nostr` into the **main page context**
- Background script's `executeScript` runs in **isolated context**
- The two contexts cannot access each other's variables

### Context Diagram
```
┌─────────────────────┐    ┌─────────────────────┐
│   MAIN CONTEXT      │    │  ISOLATED CONTEXT   │
│                     │    │                     │
│  • Alby injects     │    │  • Extension runs   │
│    window.nostr ✅  │    │    window.nostr ❌  │
│  • Page scripts     │    │  • Content scripts  │
│  • Console access   │    │  • Chrome APIs      │
└─────────────────────┘    └─────────────────────┘
```

### Solution Applied
**Manifest V3 World Specification**:
```json
// manifest.json
"content_scripts": [
  {
    "matches": ["https://twitter.com/*", "https://x.com/*"],
    "js": ["content.js"],
    "run_at": "document_end",
    "world": "MAIN"  // ← This was the key!
  }
],
```

### Technical Details
- **`"world": "MAIN"`** makes content script run in main page context
- Direct access to `window.nostr` just like console commands
- Available in Manifest V3 (Chrome 95+)
- Solves context isolation completely

---

## Issue #5: Chrome Runtime Access in Main World

### Problem
```
TypeError: chrome.runtime.sendMessage() called from a webpage must specify an Extension ID
```

### Root Cause
- Content script in MAIN world can access `window.nostr` ✅
- But loses access to `chrome.runtime` APIs ❌
- Chrome treats MAIN world scripts as regular webpage scripts
- Webpage scripts need extension ID to communicate with extensions

### Solution Applied
**Hybrid Architecture with Bridge Pattern**:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  MAIN WORLD     │    │ ISOLATED WORLD  │    │   BACKGROUND    │
│                 │    │                 │    │                 │
│ content.js      │◄──►│content-bridge.js│◄──►│ background.js   │
│                 │    │                 │    │                 │
│ • window.nostr ✅│    │• chrome.runtime✅│    │ • Relay publish │
│ • UI interaction│    │• Message bridge │    │ • No CSP limits │
│ • Event signing │    │• API access     │    │ • WebSockets ✅ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Implementation
**Main Content Script** (MAIN world):
```javascript
// Sign with Alby
const signedEvent = await window.nostr.signEvent(event);

// Send to bridge via window.postMessage
window.postMessage({
  type: 'NOSTRX_PUBLISH_EVENT',
  signedEvent: signedEvent,
  relays: settings.relays
}, '*');
```

**Bridge Content Script** (ISOLATED world):
```javascript
// Listen for messages from main script
window.addEventListener('message', async (event) => {
  if (event.data.type === 'NOSTRX_PUBLISH_EVENT') {
    // Forward to background script
    const response = await chrome.runtime.sendMessage({
      action: 'publishToRelays',
      signedEvent: event.data.signedEvent,
      relays: event.data.relays
    });
    
    // Send result back to main script
    window.postMessage({
      type: 'NOSTRX_PUBLISH_RESULT',
      success: response.success
    }, '*');
  }
});
```

---

## Issue #6: Content Security Policy Blocking WebSocket Connections

### Problem
```
Refused to connect to 'wss://relay.damus.io' because it violates the following Content Security Policy directive: "connect-src 'self' blob: ..."
```

### Root Cause
- Twitter's Content Security Policy blocks external WebSocket connections
- Content scripts inherit the page's CSP restrictions
- Cannot connect to Nostr relays directly from content script

### Solution Applied
**Move WebSocket Operations to Background Script**:
- **Content script**: Handles UI and Alby signing (CSP allows this)
- **Background script**: Handles relay connections (no CSP restrictions)
- **Bridge pattern**: Safely communicates signed events between contexts

### Technical Details
- Background scripts run in extension context (no page CSP)
- WebSocket connections work normally in background
- Content script focuses on UI and Alby integration
- Clean separation of concerns

---

## Final Architecture Summary

### Successful Hybrid Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                        TWITTER/X PAGE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │  MAIN WORLD     │    │ ISOLATED WORLD  │                    │
│  │                 │    │                 │                    │
│  │ content.js      │◄──►│content-bridge.js│                    │
│  │                 │    │                 │                    │
│  │ • UI Integration│    │ • Chrome APIs   │                    │
│  │ • window.nostr ✅│    │ • Message Bridge│                    │
│  │ • Event Signing │    │ • Background    │                    │
│  │ • Button States │    │   Communication │                    │
│  └─────────────────┘    └─────────────────┘                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                                   ▲
                                   │ chrome.runtime.sendMessage
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTENSION BACKGROUND                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                background.js                            │    │
│  │                                                         │    │
│  │ • Relay Management    • WebSocket Connections ✅        │    │
│  │ • Event Publishing    • No CSP Restrictions ✅          │    │
│  │ • Settings Storage    • Extension APIs ✅               │    │
│  │ • Error Handling      • Isolated Context ✅             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Success Factors

1. **Context Awareness**: Understanding Chrome's context isolation
2. **Manifest V3 Features**: Using `"world": "MAIN"` specification
3. **Bridge Pattern**: Solving chrome.runtime access limitations
4. **CSP Compliance**: Moving restricted operations to background
5. **Retry Logic**: Handling async Alby injection timing
6. **Proper Permissions**: Including all required Chrome permissions

### Lessons Learned

1. **Test in Real Environment**: Console tests don't reflect extension context
2. **Read Chrome Documentation**: Manifest V3 has powerful new features
3. **Understand Browser Security**: CSP and context isolation are real constraints
4. **Design for Async**: Browser extensions are heavily asynchronous
5. **Hybrid Architectures Work**: Combining different execution contexts
6. **Debug Systematically**: Log everything to understand execution flow

### Performance Characteristics

- **Alby Detection**: 1-3 seconds (retry logic)
- **Event Signing**: Instant (user approval required)
- **Relay Publishing**: 2-5 seconds (parallel to 5 relays)
- **UI Feedback**: Immediate (button state changes)
- **Memory Usage**: Minimal (event-driven architecture)

---

## Final Working Flow

1. **User clicks ⚡** → Content script (MAIN world) handles click
2. **Access window.nostr** → Direct access in MAIN world context ✅
3. **Sign with Alby** → `await window.nostr.signEvent(event)` ✅
4. **Bridge communication** → window.postMessage to ISOLATED world
5. **Background publishing** → chrome.runtime.sendMessage to background
6. **Relay connections** → WebSocket connections (no CSP) ✅
7. **Success feedback** → Bridge → Content script → Button animation ✅

**Result**: Seamless one-click cross-posting from Twitter/X to Nostr! 🎉