# NostrX User Guide

## Overview

NostrX is a Chrome extension that allows you to cross-post your Twitter/X posts to the Nostr protocol with a single click. It seamlessly integrates into the Twitter/X interface and provides a lightning bolt (⚡) button on every tweet for instant cross-posting.

## Features

### 🚀 One-Click Cross-Posting
- **Lightning bolt buttons** appear on every tweet in your timeline
- **Single click** to cross-post any tweet to Nostr
- **Visual feedback** with loading, success, and error states
- **Works with infinite scroll** - buttons appear on new tweets automatically

### 🔐 Secure Integration
- **Uses existing Nostr extensions** (Alby, nos2x) for signing
- **No private key handling** by NostrX itself
- **Permission-based** - you control what gets signed
- **Local storage only** - settings stored on your device

### ⚡ Multi-Relay Publishing
- **Publishes to 5 default relays** simultaneously
- **Fault tolerant** - succeeds if any relay accepts the post
- **Fast publishing** with 5-second timeout per relay
- **Comprehensive error handling**

### 🎨 Native Twitter Integration
- **Matches Twitter's UI** perfectly
- **Responsive design** works on all screen sizes
- **Hover effects** and animations match Twitter's style
- **SPA navigation support** - works with Twitter's dynamic routing

## Installation & Setup

### Prerequisites
1. **Chrome Browser** (version 88+)
2. **Nostr Extension** - Install one of:
   - **[Alby](https://chrome.google.com/webstore/detail/alby-bitcoin-lightning-wa/iokeahhehimjnekafflcihljlcjccdbe)** (Recommended)
   - **[nos2x](https://chrome.google.com/webstore/detail/nos2x/kpgefcfmnafjgpbl)**

### Install NostrX
1. **Download/Clone** the NostrX extension folder
2. **Open Chrome** → Go to `chrome://extensions/`
3. **Enable "Developer mode"** (toggle in top-right)
4. **Click "Load unpacked"** → Select the NostrX folder
5. **Pin the extension** (click puzzle piece → pin NostrX)

### Setup Nostr Extension
1. **Install and setup** Alby or nos2x
2. **Create or import** your Nostr keys
3. **Unlock the extension** (enter password)
4. **Grant permissions** to twitter.com when prompted

## How to Use

### Basic Usage
1. **Go to Twitter/X** (twitter.com or x.com)
2. **Find any tweet** you want to cross-post
3. **Look for the lightning bolt (⚡)** in the tweet's action bar
4. **Click the lightning bolt** once
5. **Watch the animation**:
   - Purple with spinner = Loading
   - Green with checkmark = Success ✅
   - Red with X = Error ❌

### First-Time Permission
- **Alby popup may appear** asking for permission to sign
- **Click "Allow"** to grant permission
- **Check "Remember this choice"** for future posts
- **This only happens once** per site

### What Gets Posted
- **Original tweet text** is preserved exactly
- **Attribution added** (optional): "Originally posted by @username on X"
- **Tweet URL included** for reference
- **Posted to your Nostr profile** with your public key

## Extension Settings

### Accessing Settings
1. **Click the NostrX extension icon** in Chrome toolbar
2. **Popup window opens** with current settings and status

### Settings Overview

#### **Nostr Extension Status**
- **Green**: "Nostr extension detected and ready" ✅
- **Red**: Shows specific error (unlock Alby, grant permissions, etc.)
- **Updates automatically** when you change Nostr extension settings

#### **Enable/Disable Toggle**
- **Purpose**: Turn NostrX functionality on/off
- **Default**: Enabled
- **When disabled**: Lightning bolts still appear but do nothing
- **Use case**: Temporarily pause cross-posting

#### **Include Attribution Toggle**
- **Purpose**: Control whether to add "Originally posted by @username on X"
- **Default**: Enabled
- **When enabled**: Adds attribution line to posts
- **When disabled**: Posts only the original tweet text
- **Example with attribution**:
  ```
  Original tweet text here
  
  Originally posted by @username on X
  https://twitter.com/username/status/123
  ```

#### **Relay Management**
- **View current relays**: List of 5 default Nostr relays
- **Add custom relay**: Enter WSS URL and click "Add"
- **Remove relay**: Click X button next to relay (minimum 1 required)
- **Reset to defaults**: Restores original 5 relays
- **Security**: Only secure WebSocket (WSS) connections allowed

### Default Relays
NostrX comes configured with these reliable relays:
- **relay.damus.io** - Popular iOS client relay
- **relay.nostr.info** - Community relay
- **nostr-pub.wellorder.net** - Well-maintained relay
- **relay.current.fyi** - Fast relay
- **nostr.wine** - Community relay

## Button States & Feedback

### Visual States
1. **Default State**: Gray lightning bolt, hover turns purple
2. **Loading State**: Purple background with spinning animation
3. **Success State**: Green background with checkmark (2 seconds)
4. **Error State**: Red background with X (3 seconds)
5. **Return to Default**: After success/error feedback

### Success Indicators
- ✅ **Button turns green** with checkmark
- ✅ **Console message**: "Published successfully to X out of 5 relays"
- ✅ **Post appears** on Nostr clients (iris.to, snort.social, etc.)

### Error Indicators
- ❌ **Button turns red** with X
- ❌ **Console shows error** message
- ❌ **Common errors**: Permission denied, Alby locked, network issues

## Troubleshooting

### Lightning Bolts Don't Appear
- **Refresh Twitter page**
- **Check extension is enabled** in chrome://extensions/
- **Try different tweets** (some protected tweets may not show buttons)

### "No Nostr Extension Found"
- **Install Alby or nos2x** from Chrome Web Store
- **Unlock your Nostr extension** (enter password)
- **Refresh Twitter page** after unlocking

### Posts Fail to Publish
- **Check internet connection**
- **Verify Alby is unlocked** and has permissions
- **Try posting again** (temporary relay issues)
- **Check console** for specific error messages

### Permission Popup Keeps Appearing
- **Always click "Allow"** in Alby popup
- **Check "Remember this choice"** if available
- **Add twitter.com manually** in Alby settings → Connected Sites

## Privacy & Security

### Data Handling
- **No data collection** - NostrX doesn't track or store personal data
- **Local storage only** - Settings stored on your device
- **No external APIs** - Only connects to Nostr relays you choose
- **No analytics** - No tracking or usage statistics

### Security Model
- **Private keys never accessed** - Only your Nostr extension handles keys
- **Permission-based signing** - You approve each post
- **Secure connections only** - All relay connections use WSS
- **Open source** - Full code available for audit

### What's Shared
- **Public information only**: Tweet text, username, URL
- **Posted to public Nostr network** - Visible to anyone
- **Your Nostr public key** - Associates posts with your Nostr identity
- **No private Twitter data** - Only what's already public

## Advanced Usage

### Bulk Cross-Posting
- **Click multiple lightning bolts** quickly for bulk posting
- **Each post processed independently**
- **Success/failure tracked per post**

### Custom Relay Setup
- **Research reliable relays** before adding
- **Test with default relays first**
- **Keep at least 2-3 relays** for redundancy
- **Monitor relay performance** over time

### Integration with Other Nostr Clients
- **Posts appear everywhere** - All Nostr clients see your cross-posts
- **Use same Nostr identity** - Consistent across platforms
- **Maintain social graph** - Followers see posts regardless of origin

## Support & Feedback

### Getting Help
- **Check this user guide** first
- **Review troubleshooting section**
- **Test with simple tweets** before complex ones
- **Verify Nostr extension works** with other Nostr apps

### Known Limitations
- **No image cross-posting** (MVP version)
- **No thread support** (single tweets only)
- **No hashtag conversion** (posted as-is)
- **No @mention conversion** (posted as text)

### Future Enhancements
- **Thread detection and posting**
- **Image attachment support**
- **Hashtag conversion** (#topic → Nostr hashtags)
- **Mention conversion** (@user → npub)
- **Scheduling and batch operations**

---

**Enjoy seamlessly sharing your thoughts from Twitter/X to the decentralized Nostr network! ⚡**