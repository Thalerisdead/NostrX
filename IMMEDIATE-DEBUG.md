# Immediate Debug Steps

You're getting an error at line 191 in content.js. Let's debug this quickly:

## Step 1: Quick Console Test

1. **Go to Twitter/X**
2. **Open Console** (F12)
3. **Paste and run this code**:
```javascript
// Copy and paste this entire block
console.log('=== Quick NostrX Debug ===');
console.log('Content script loaded:', typeof nostrX);
console.log('Buttons found:', document.querySelectorAll('.nostrx-button').length);
console.log('Chrome runtime:', typeof chrome?.runtime);

// Test a simple message to background
chrome.runtime.sendMessage({action: 'getSettings'}, (response) => {
  console.log('Background response:', response);
});
```

## Step 2: Check Background Script

1. **Go to**: `chrome://extensions/`
2. **Find NostrX**
3. **Click**: "Inspect views service worker" or "background page"
4. **New console opens**
5. **Look for any red errors**

## Step 3: Reload Extension

1. **Go to**: `chrome://extensions/`
2. **Find NostrX** 
3. **Click the reload button** (🔄)
4. **Go back to Twitter and try again**

## Step 4: Check What's Happening

After reloading, click a lightning bolt and tell me:

1. **What console messages appear?**
2. **Does the button change color/animation?**
3. **Any error messages in red?**

## Most Likely Issues:

### Issue 1: Background Script Not Responding
- **Solution**: Reload extension, check background console

### Issue 2: Missing Nostr Extension  
- **Solution**: Install Alby from Chrome Web Store

### Issue 3: Permission Issue
- **Solution**: Extension needs scripting permission (should be fixed now)

## Quick Test Without Background Script

If the above doesn't work, try this simpler test:

1. **Open Console on Twitter**
2. **Paste this**:
```javascript
// Simple click test
document.addEventListener('click', function(e) {
  if (e.target.closest('.nostrx-button')) {
    console.log('NostrX button clicked!');
    e.preventDefault();
    alert('Button click detected!');
  }
});
```
3. **Click a lightning bolt**
4. **Should show alert if click is working**

## Next Steps

Based on what you see, we can identify if it's:
- ✅ **Click detection issue** (buttons not clickable)
- ✅ **Background script issue** (no response)
- ✅ **Nostr extension issue** (no signing capability)
- ✅ **Permission issue** (can't execute scripts)

Let me know what the console shows and I'll provide the specific fix!