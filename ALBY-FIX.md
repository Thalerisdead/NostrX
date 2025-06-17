# Fix: Alby Not Injecting into Twitter

**Issue**: `window.nostr is undefined` - Alby isn't injecting into Twitter pages.

## Solution Steps:

### Step 1: Check Alby is Unlocked
1. **Click Alby extension icon** in toolbar
2. **Enter your password** to unlock if needed
3. **Should show wallet balance/info** (not login screen)

### Step 2: Enable Nostr in Alby
1. **Click Alby icon**
2. **Go to Settings** (gear icon)
3. **Find "Nostr" section**
4. **Make sure Nostr is ENABLED**
5. **Toggle it off and on** if needed

### Step 3: Add Twitter to Connected Sites
1. **In Alby settings**
2. **Go to "Connected Sites" or "Permissions"**
3. **Click "Add Site" or "+"**
4. **Add**: `twitter.com`
5. **Add**: `x.com` 
6. **Set permissions to "Always Allow"**

### Step 4: Check Content Script Injection
1. **In Alby settings**
2. **Look for "Content Script" or "Inject Scripts"**
3. **Make sure it's ENABLED**
4. **Some versions have "Inject on all sites" toggle**

### Step 5: Refresh and Test
1. **Close all Twitter tabs**
2. **Open new Twitter tab**
3. **Test in console**:
```javascript
console.log('Alby injected:', typeof window.nostr !== 'undefined');
```

## Alternative: Manual Alby Connection

If above doesn't work:

1. **Go to any Nostr web app** (iris.to, snort.social)
2. **Connect with Alby** (this forces injection setup)
3. **Grant all permissions**
4. **Then go back to Twitter and test**

## Quick Test Commands

After each step, test:
```javascript
// Should return true
console.log('Alby working:', typeof window.nostr !== 'undefined');

// Should show methods
if (window.nostr) console.log('Methods:', Object.keys(window.nostr));
```

## Common Alby Issues:

### Issue: Alby shows "Paused"
**Fix**: Click "Resume" in Alby popup

### Issue: Alby asks for password repeatedly
**Fix**: Check "Remember me" when unlocking

### Issue: Permissions keep getting reset
**Fix**: In Alby settings, set "Default permission" to "Always allow"

### Issue: Content script disabled
**Fix**: In Chrome extensions page, make sure Alby has "Access to site data: On all sites"

## Final Verification:

After fixing, both should work:
1. **Console test**: `typeof window.nostr !== 'undefined'` → `true`
2. **NostrX popup**: Shows "Nostr extension detected and ready" ✅

Try Step 1-3 first (unlock, enable Nostr, add Twitter sites) then test!