# Step 2: Test Extension

✅ **Step 1 PASSED**: Alby is working (`Alby: true`)

## Now Test the Extension:

### Step 2A: Check Lightning Bolts Exist
In Twitter console, run:
```javascript
console.log('Lightning bolts found:', document.querySelectorAll('.nostrx-button').length);
```

### Step 2B: Click Lightning Bolt
1. **Find any tweet** with a ⚡ button
2. **Click the lightning bolt**
3. **Watch console immediately**

You should see messages like:
```
NostrX: Starting Nostr post for tweet: {...}
NostrX: Sending message to background script for posting
NostrX: Response from background: {...}
```

### Step 2C: Open Background Console (Important!)
1. **Keep Twitter tab open**
2. **Open new tab** → Go to `chrome://extensions/`
3. **Find NostrX** → Click **"Inspect views service worker"**
4. **New console window opens** (background script console)
5. **Go back to Twitter tab**
6. **Click lightning bolt again**
7. **Check BOTH consoles**:
   - Twitter console: Content script messages
   - Background console: Detailed debug messages

## Expected Results:

### Twitter Console (Content Script):
```
NostrX: Starting Nostr post for tweet: {text: "...", username: "..."}
NostrX: Sending message to background script for posting
```

### Background Console (Background Script):
```
NostrX Background: Received message: postToNostr
NostrX: Skipping initial test, attempting to get public key directly...
NostrX: Attempt 1/20 - Getting public key
NostrX: window.nostr type: object
NostrX: window.nostr found! Methods: ['getPublicKey', 'signEvent']
NostrX: Got public key: npub1abc...
```

## What to Report:

Tell me what you see in **BOTH** consoles:

1. **Lightning bolts count**: How many found?
2. **Twitter console output**: When you click ⚡
3. **Background console output**: Detailed debug messages
4. **Any Alby popups**: Permission requests?

Since Alby is working, the extension should now succeed!