# NostrX Testing Guide

This comprehensive guide will walk you through every step needed to test the NostrX Chrome extension, from installation to posting your first cross-post to Nostr.

## Prerequisites Checklist

Before starting, ensure you have:
- [ ] Google Chrome browser (version 88+)
- [ ] Active internet connection
- [ ] Twitter/X account for testing
- [ ] Basic understanding of Chrome extension installation

## Phase 1: Extension Installation

### Step 1: Prepare Icon Files

The extension needs PNG icon files to work properly. You have several options:

#### Option A: Online Converter (Easiest)
1. Open https://cloudconvert.com/svg-to-png in a new tab
2. Click "Select Files" and upload `icon.svg` from the NostrX folder
3. Set output format to PNG
4. Click "Convert"
5. Download the converted PNG file
6. Repeat this process 4 times with these settings:
   - Upload `icon.svg` → Set width to 16px → Save as `icon16.png`
   - Upload `icon.svg` → Set width to 32px → Save as `icon32.png`
   - Upload `icon.svg` → Set width to 48px → Save as `icon48.png`
   - Upload `icon.svg` → Set width to 128px → Save as `icon128.png`
7. Place all 4 PNG files in the NostrX folder

#### Option B: Quick Placeholder Icons
If you just want to test functionality quickly:
1. Create 4 copies of any small PNG image you have
2. Rename them to: `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`
3. Place them in the NostrX folder

### Step 2: Install Extension in Chrome

1. **Open Chrome Extensions Page**
   - Type `chrome://extensions/` in address bar and press Enter
   - OR click Chrome menu (⋮) → More Tools → Extensions

2. **Enable Developer Mode**
   - Look for "Developer mode" toggle in top-right corner
   - Click to enable it (should turn blue/green)
   - You should now see "Load unpacked", "Pack extension", "Update" buttons

3. **Load the Extension**
   - Click "Load unpacked" button
   - Navigate to and select the NostrX folder (the folder containing manifest.json)
   - Click "Select Folder" or "Open"

4. **Verify Installation**
   - You should see "NostrX - Cross-post to Nostr" in your extensions list
   - Status should show "Enabled"
   - If there are any errors, they'll be shown in red - check that all files are present

5. **Pin Extension (Recommended)**
   - Click the puzzle piece icon (🧩) in Chrome toolbar
   - Find "NostrX" in the dropdown
   - Click the pin icon next to it
   - The NostrX icon should now appear in your toolbar

### Step 3: Verify Extension Loading

1. **Check Extension Icon**
   - Look for the lightning bolt icon in your toolbar
   - Click it - you should see the NostrX settings popup

2. **Test Basic Popup**
   - Click the NostrX extension icon
   - Popup should open showing:
     - "NostrX" title with lightning bolt icon
     - "Nostr Extension Status" section (will show error for now)
     - Settings toggles
     - Relay list
   - If popup doesn't open, check browser console for errors

## Phase 2: Nostr Extension Setup

You need a Nostr signing extension to use NostrX. Choose one:

### Option A: Install Alby (Recommended)

1. **Install Alby**
   - Go to Chrome Web Store
   - Search for "Alby" or visit: https://chrome.google.com/webstore/detail/alby-bitcoin-lightning-wa/iokeahhehimjnekafflcihljlcjccdbe
   - Click "Add to Chrome"
   - Click "Add extension" when prompted

2. **Set Up Alby**
   - Alby welcome screen should open automatically
   - Choose "Create a new wallet" or "Connect existing wallet"
   - **For testing only**: You can create a new wallet with a simple password
   - Follow Alby's setup process
   - **Important**: Make sure to enable Nostr functionality in Alby settings

3. **Verify Alby Installation**
   - Go to any website
   - Open browser console (F12)
   - Type: `window.nostr`
   - Should return an object with `getPublicKey` and `signEvent` functions

### Option B: Install nos2x (Lightweight)

1. **Install nos2x**
   - Go to Chrome Web Store
   - Search for "nos2x" or visit: https://chrome.google.com/webstore/detail/nos2x/kpgefcfmnafjgpbl
   - Click "Add to Chrome"
   - Click "Add extension"

2. **Set Up nos2x**
   - nos2x popup should open
   - Choose "Generate new key" for testing
   - **For testing**: You can use a simple passphrase
   - Save your keys securely (for testing, you can skip this)

3. **Verify nos2x Installation**
   - Same verification as Alby above
   - Open console and check `window.nostr` exists

## Phase 3: Twitter/X Testing Environment

### Step 1: Access Twitter/X

1. **Open Twitter/X**
   - Go to https://twitter.com or https://x.com
   - Log into your account
   - Navigate to your home timeline

2. **Check NostrX Status**
   - Click the NostrX extension icon
   - "Nostr Extension Status" should now show:
     - Green checkmark ✅
     - "Nostr extension detected and ready"
   - If still showing error, refresh the Twitter page

### Step 2: Find NostrX Buttons

1. **Look for Lightning Bolts**
   - Scroll through your Twitter timeline
   - Each tweet should have a lightning bolt (⚡) button
   - Button should be next to Like, Retweet, Share buttons
   - Button should be gray/inactive by default

2. **Verify Button Placement**
   - Lightning bolt should appear on:
     - Timeline tweets
     - Individual tweet pages
     - Reply threads
     - Your own tweets
   - Buttons should NOT appear on:
     - Promoted tweets (ads)
     - Retweets (unless you expand them)

3. **Test Button Hover**
   - Hover over a lightning bolt button
   - Button should highlight in purple
   - Tooltip might show "Cross-post to Nostr"

## Phase 4: Functionality Testing

### Test 1: Basic Cross-Posting

1. **Find a Simple Tweet**
   - Look for a text-only tweet (no images/videos for first test)
   - Preferably a short tweet (under 100 characters)

2. **Click Lightning Bolt**
   - Click the ⚡ button on the tweet
   - Button should immediately change to loading animation (spinning circle)
   - Button color should change to purple

3. **Wait for Result**
   - After 2-10 seconds, button should change to:
     - ✅ Green checkmark = Success
     - ❌ Red X = Error

4. **Success Path**
   - If successful, button shows green checkmark for 2 seconds
   - Then returns to gray lightning bolt
   - Tweet has been posted to Nostr!

5. **Error Path**
   - If error, button shows red X for 3 seconds
   - Check NostrX popup for error details
   - Common errors and solutions below

### Test 2: Settings Configuration

1. **Open Settings**
   - Click NostrX extension icon
   - Popup should open

2. **Test Enable/Disable Toggle**
   - Click "Enable NostrX" toggle
   - Toggle should turn gray (disabled)
   - Try clicking lightning bolt on tweet - should do nothing
   - Re-enable toggle (should turn purple)

3. **Test Attribution Toggle**
   - Disable "Include attribution" toggle
   - Post a tweet to Nostr
   - Check posted content (on Nostr client) - should be tweet text only
   - Re-enable attribution toggle
   - Post another tweet - should include "Originally posted by @username on X"

4. **Test Relay Management**
   - Try adding a new relay: `wss://nostr.wine`
   - Should appear in relay list
   - Try removing a relay (click X button)
   - Try "Reset to Defaults" button

### Test 3: Edge Cases

1. **Long Tweets**
   - Find or create a tweet near 280 character limit
   - Cross-post to test handling of long content

2. **Special Characters**
   - Test tweets with emojis, hashtags, mentions
   - Verify content is preserved correctly

3. **Multiple Rapid Clicks**
   - Try clicking lightning bolt multiple times quickly
   - Should prevent duplicate posts

4. **Navigation Testing**
   - Navigate between different Twitter pages
   - Check that buttons still appear and work
   - Test on profile pages, individual tweet pages, etc.

## Phase 5: Verification on Nostr

To verify your cross-posts actually made it to Nostr:

### Option A: Use Web Client

1. **Open Nostr Web Client**
   - Go to https://iris.to or https://snort.social
   - Connect with same Nostr extension you used for NostrX

2. **Check Your Posts**
   - Look for your cross-posted tweets
   - They should appear in your timeline
   - Content should match original tweet (plus attribution if enabled)

### Option B: Use Mobile Client

1. **Install Damus (iOS) or Amethyst (Android)**
2. **Import your Nostr keys**
3. **Check your profile for cross-posted content**

## Troubleshooting Common Issues

### Issue: "No Nostr extension found"

**Solutions:**
1. Refresh Twitter/X page after installing Nostr extension
2. Check that Nostr extension is enabled in chrome://extensions/
3. Try disabling and re-enabling the Nostr extension
4. Check browser console for JavaScript errors

**Debug Steps:**
1. Open Twitter/X page
2. Press F12 to open developer console
3. Type: `window.nostr`
4. Should return object with functions, not `undefined`

### Issue: Lightning bolt buttons don't appear

**Solutions:**
1. Refresh the Twitter/X page
2. Check that NostrX is enabled in extension popup
3. Verify you're on twitter.com or x.com (not mobile version)
4. Check for JavaScript errors in console

**Debug Steps:**
1. Open developer console on Twitter
2. Look for "NostrX:" log messages
3. Check for any red error messages

### Issue: Posts fail to publish

**Solutions:**
1. Check internet connection
2. Try different relays in settings
3. Verify Nostr extension is working (test with other Nostr apps)
4. Check if relays are online (some may be temporarily down)

**Debug Steps:**
1. Open NostrX popup during posting
2. Check for specific error messages
3. Try posting to just one relay at a time

### Issue: Extension popup won't open

**Solutions:**
1. Refresh browser
2. Disable and re-enable extension
3. Check that all files are present in extension folder
4. Verify icon PNG files exist

### Issue: Settings don't save

**Solutions:**
1. Check Chrome storage permissions
2. Clear browser cache and cookies
3. Reinstall extension

## Testing Checklist

Use this checklist to verify all functionality:

### Installation & Setup
- [ ] Extension loads without errors
- [ ] All icon files present (16, 32, 48, 128px)
- [ ] Popup opens and displays correctly
- [ ] Nostr extension detected and connected

### Basic Functionality
- [ ] Lightning bolt buttons appear on tweets
- [ ] Buttons have correct styling and hover effects
- [ ] Clicking button shows loading animation
- [ ] Successful posts show success checkmark
- [ ] Failed posts show error state

### Settings & Configuration
- [ ] Enable/disable toggle works
- [ ] Attribution toggle affects post content
- [ ] Can add custom relays
- [ ] Can remove relays
- [ ] Reset to defaults works
- [ ] Settings persist across browser restarts

### Edge Cases & Error Handling
- [ ] Works with long tweets (280 characters)
- [ ] Handles special characters and emojis
- [ ] Prevents duplicate posts from rapid clicking
- [ ] Works across Twitter navigation (timeline, profiles, individual tweets)
- [ ] Shows appropriate errors when Nostr extension unavailable
- [ ] Handles network failures gracefully

### Cross-Platform Verification
- [ ] Posted content appears correctly on Nostr clients
- [ ] Attribution text is properly formatted
- [ ] Timestamps are reasonable
- [ ] Content matches original tweet

## Performance Testing

### Load Testing
1. **Heavy Timeline**
   - Navigate to busy Twitter timeline with many tweets
   - Verify all tweets get lightning bolt buttons
   - Check that page doesn't slow down significantly

2. **Rapid Posting**
   - Try posting multiple tweets to Nostr quickly
   - Verify each post completes properly
   - Check for memory leaks or slowdowns

### Network Testing
1. **Slow Connection**
   - Test with throttled network connection
   - Verify timeouts work correctly
   - Check user feedback during slow posts

2. **Offline Testing**
   - Disconnect internet during posting
   - Verify appropriate error messages
   - Test reconnection handling

## Security Verification

### Basic Security Checks
- [ ] Extension only requests necessary permissions
- [ ] No private keys handled by NostrX
- [ ] All relay connections use WSS (secure WebSocket)
- [ ] Settings stored locally only
- [ ] No external API calls except to configured relays

### Privacy Verification
- [ ] No analytics or tracking code
- [ ] No data sent to third parties
- [ ] User content only sent to chosen Nostr relays
- [ ] Browser storage contains only user settings

## Success Criteria

The extension passes testing if:

1. **Installation works smoothly** with clear instructions
2. **Nostr integration** works with both Alby and nos2x
3. **UI integration** looks native to Twitter/X
4. **Cross-posting works** reliably to default relays
5. **Settings management** functions correctly
6. **Error handling** provides clear feedback
7. **Performance impact** is minimal on Twitter/X
8. **Security requirements** are met

## Reporting Issues

When reporting issues during testing, include:

1. **Environment Details**
   - Chrome version
   - Operating system
   - Nostr extension used (Alby/nos2x version)

2. **Steps to Reproduce**
   - Exact sequence of actions taken
   - URL where issue occurred
   - Settings configuration

3. **Expected vs Actual Behavior**
   - What you expected to happen
   - What actually happened
   - Any error messages

4. **Browser Console Output**
   - Any red error messages
   - NostrX debug messages
   - Screenshots if helpful

## Testing Complete!

Once you've completed this testing guide, you'll have:
- ✅ Verified the extension works correctly
- ✅ Confirmed Nostr integration functions
- ✅ Tested all major features and edge cases
- ✅ Identified any issues that need fixing

The NostrX extension should now be ready for daily use! Start cross-posting your thoughts from Twitter/X to the decentralized Nostr network.