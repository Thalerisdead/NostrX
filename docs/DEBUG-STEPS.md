# Debug Steps for NostrX Click Issue

The lightning bolt buttons appear but clicking doesn't work. Let's debug this step by step.

## Step 1: Update Extension with Fixes

1. **Reload the extension** with the latest changes:
   - Go to `chrome://extensions/`
   - Find NostrX extension
   - Click the refresh/reload button (🔄)
   - If that doesn't work, click "Remove" then "Load unpacked" again

## Step 2: Check Console for Errors

1. **Open Twitter/X** (twitter.com or x.com)
2. **Open Developer Console**:
   - Press `F12` or `Ctrl+Shift+I` (Windows/Linux)
   - Press `Cmd+Option+I` (Mac)
3. **Click Console tab** in developer tools
4. **Look for NostrX messages** - you should see:
   ```
   NostrX: Starting content script
   NostrX: Processing tweets...
   ```

## Step 3: Test Button Click with Debugging

1. **Click a lightning bolt button** on any tweet
2. **Check console immediately** - you should see:
   ```
   NostrX: Starting Nostr post for tweet: {text: "...", username: "...", ...}
   NostrX: Sending message to background script
   NostrX: Response from background: {success: false, error: "..."}
   ```

## Step 4: Check Background Script

1. **Go to Extensions page**: `chrome://extensions/`
2. **Find NostrX extension**
3. **Click "Inspect views service worker"** (or similar link)
4. **New developer console opens** for background script
5. **Try clicking lightning bolt again**
6. **Check for error messages** in background console

## Step 5: Verify Nostr Extension

1. **Check if you have Alby or nos2x installed**:
   - Go to `chrome://extensions/`
   - Look for "Alby" or "nos2x" in the list
   - Make sure they're enabled

2. **Test Nostr extension directly**:
   - Open any webpage
   - Open console (F12)
   - Type: `window.nostr`
   - Press Enter
   - Should return an object, not `undefined`

3. **Test Nostr functions**:
   - Type: `window.nostr.getPublicKey()`
   - Should return a promise or public key
   - If it shows popup asking for permission, approve it

## Step 6: Common Issues and Solutions

### Issue: Console shows "NostrX: Starting content script" but no button clicks work

**Cause**: Background script not receiving messages
**Solution**: 
1. Check if background script console shows errors
2. Reload extension completely
3. Restart Chrome browser

### Issue: "Script execution failed" errors

**Cause**: Missing scripting permission
**Solution**: 
1. Verify manifest.json includes `"scripting"` permission
2. Reload extension
3. Grant any permission requests

### Issue: "No Nostr extension found"

**Cause**: Nostr extension not installed or not working
**Solution**:
1. Install Alby from Chrome Web Store
2. Set up Alby with any wallet (create test wallet)
3. Test `window.nostr` in console
4. Make sure Alby is unlocked/active

### Issue: Buttons appear but are unclickable

**Cause**: CSS styling issues or event handler problems
**Solution**:
1. Check if buttons have proper CSS pointer events
2. Try clicking directly on the lightning bolt icon
3. Check console for JavaScript errors during click

## Step 7: Manual Test

If debugging doesn't work, try this manual test:

1. **Open Twitter/X**
2. **Open Console** (F12)
3. **Paste this test code**:
```javascript
// Test if NostrX is loaded
console.log('NostrX loaded:', typeof nostrX);

// Test if buttons exist
console.log('Lightning buttons found:', document.querySelectorAll('.nostrx-button').length);

// Test manual button click
const button = document.querySelector('.nostrx-button');
if (button) {
  console.log('Found button, triggering click...');
  button.click();
} else {
  console.log('No buttons found');
}
```

## Step 8: Report Results

After following these steps, report what you see:

1. **Console messages** when clicking buttons
2. **Any error messages** in red
3. **Results of `window.nostr` test**
4. **Background script console output**
5. **Which Nostr extension** you're using (Alby/nos2x)

This will help identify the exact issue and provide a specific fix.

## Quick Fix to Try First

**Most likely issue**: Extension needs to be reloaded with the new "scripting" permission.

1. Go to `chrome://extensions/`
2. Find NostrX
3. Click "Remove"
4. Click "Load unpacked" 
5. Select NostrX folder again
6. Go back to Twitter and test

The updated extension should now work properly!