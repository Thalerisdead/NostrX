# Urgent Fix Instructions

I've fixed the code issues. Here's exactly what to do:

## Step 1: Reload Extension with Fixes

1. **Go to**: `chrome://extensions/`
2. **Find NostrX extension**
3. **Click "Remove"** (to ensure clean reload)
4. **Click "Load unpacked"**
5. **Select the NostrX folder** again
6. **Extension should reload with new permissions**

## Step 2: Test Alby Directly

1. **Go to Twitter/X** (twitter.com or x.com)
2. **Open Console** (F12)
3. **Copy and paste this test**:

```javascript
// Quick Alby test
console.log('Testing Alby...');
console.log('window.nostr exists:', typeof window.nostr !== 'undefined');

if (typeof window.nostr !== 'undefined') {
  window.nostr.getPublicKey().then(pubkey => {
    console.log('✅ Alby working! Public key:', pubkey);
  }).catch(error => {
    console.log('❌ Alby error:', error);
    console.log('💡 Try unlocking Alby wallet');
  });
} else {
  console.log('❌ Alby not detected');
  console.log('💡 Make sure Alby is unlocked and refresh page');
}
```

## Step 3: If Alby Test Fails

### Problem: "window.nostr is undefined"
**Solution:**
1. **Click Alby extension icon** in toolbar
2. **Unlock your wallet** (enter password)
3. **Refresh Twitter page**
4. **Run test again**

### Problem: "Permission denied" error
**Solution:**
1. **Click Alby icon**
2. **Go to Settings → Connected Sites**
3. **Add twitter.com and x.com** manually
4. **Refresh Twitter page**

### Problem: Alby shows "Paused"
**Solution:**
1. **Click Alby icon**
2. **Click "Resume" or "Enable"**
3. **Refresh Twitter page**

## Step 4: Test NostrX After Alby Works

1. **Make sure Alby test passes** (see ✅ message)
2. **Click a lightning bolt** on any tweet
3. **Check console** - should see:
   ```
   NostrX: Starting Nostr post for tweet: {...}
   NostrX: window.nostr found, sending message to background script
   ```

## Step 5: Background Script Debug

1. **Go to**: `chrome://extensions/`
2. **Find NostrX**
3. **Click "Inspect views service worker"**
4. **New console opens**
5. **Try clicking lightning bolt again**
6. **Should see messages like**:
   ```
   NostrX Background: Received message: testNostrConnection
   NostrX Background: Testing Nostr connection
   ```

## Expected Working Flow

When everything works correctly:

1. **Click lightning bolt** → Button turns purple with loading animation
2. **Console shows**: "NostrX: window.nostr found..."
3. **Alby popup** may appear asking for permission (approve it)
4. **Button turns green** with checkmark (success)
5. **Post appears on Nostr** (check with other Nostr client)

## Common Issues & Solutions

### Issue: Line 191 Error
**Status**: ✅ **FIXED** - Reload extension

### Issue: "No Nostr extension found"
**Solution**: 
1. Unlock Alby wallet
2. Grant permissions to twitter.com
3. Refresh page

### Issue: Button doesn't respond
**Solution**:
1. Check console for errors
2. Make sure Alby test passes
3. Reload extension

### Issue: Permission popup keeps appearing
**Solution**:
1. Always click "Allow" in Alby popup
2. Check "Remember this choice" if available

## Final Test

After following all steps, this should work:

1. **Alby is unlocked** and shows connected
2. **NostrX popup** shows "Nostr extension detected and ready"
3. **Lightning bolts** on tweets are clickable
4. **Clicking lightning bolt** posts to Nostr successfully

## Get Help

If still not working, tell me:
1. **Result of Alby test** (✅ or ❌ and what error)
2. **NostrX popup status** (connected/disconnected)
3. **Console errors** when clicking lightning bolt
4. **Background script console** output

The fixes I made should resolve the line 191 error and improve Alby detection!