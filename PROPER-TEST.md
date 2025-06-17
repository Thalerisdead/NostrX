# Proper Test Instructions

## Issue Found: Testing in Wrong Context

The `chrome.runtime` error means you're testing in the wrong place. Here's the correct way:

### Test 1: Basic Alby Check (Twitter Console)
1. **Go to Twitter/X**
2. **Open Console (F12)**
3. **Run this ONLY**:
```javascript
console.log('Alby working:', typeof window.nostr !== 'undefined');
```

### Test 2: Extension Communication (Content Script Context)
The `chrome.runtime` only works from the extension context, not the page console.

**Instead, test the lightning bolt directly:**
1. **Go to Twitter/X**
2. **Find any tweet with a lightning bolt ⚡**
3. **Click it**
4. **Watch console for debug messages**

You should see:
```
NostrX: Starting Nostr post for tweet: {...}
NostrX: Sending message to background script for posting
```

### Test 3: Background Script Console
1. **Go to**: `chrome://extensions/`
2. **Find NostrX**
3. **Click**: "Inspect views service worker"
4. **New console opens** (this is the background script console)
5. **Go back to Twitter and click lightning bolt**
6. **Check background console for**:
```
NostrX Background: Received message: postToNostr
NostrX: Skipping initial test, attempting to get public key directly...
NostrX: Attempt 1/20 - Getting public key
```

## Simple Test Sequence:

### Step 1: Basic Check
```javascript
// In Twitter console - should return true
console.log('Alby:', typeof window.nostr !== 'undefined');
```

### Step 2: Lightning Bolt Test
- Click ⚡ on any tweet
- Check console for NostrX messages

### Step 3: Background Debug
- Open background script console
- Click ⚡ again
- Watch for detailed attempt logs

## Expected Results:

✅ **Step 1**: `Alby: true`  
✅ **Step 2**: NostrX content script messages appear  
✅ **Step 3**: Background script shows retry attempts and success  

## If Step 1 Fails (Alby: false):
1. **Unlock Alby wallet**
2. **Check Alby settings** for twitter.com permissions
3. **Refresh Twitter page**
4. **Test again**

## If Step 2 Fails (No NostrX messages):
1. **Reload extension** completely
2. **Check lightning bolts exist** on tweets
3. **Try different tweet**

## If Step 3 Fails (No background messages):
1. **Background script not running** - extension issue
2. **Check for errors** in background console
3. **Reload extension**

**Start with Step 1 - just test if Alby is detected in Twitter console!**