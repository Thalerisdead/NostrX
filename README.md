# NostrX - Cross-post to Nostr

A Chrome extension that allows you to cross-post your Twitter/X posts to the Nostr protocol with a single click. Seamlessly integrates into the Twitter/X interface and uses existing Nostr signing extensions for security.

## Features

- 🚀 **One-click posting** - Cross-post tweets to Nostr instantly
- 🔗 **Seamless integration** - Adds Nostr buttons directly to Twitter's interface  
- 🔐 **Secure** - Uses existing Nostr extensions (Alby, nos2x) for signing
- ⚡ **Fast** - Publishes to multiple relays simultaneously
- 🎨 **Native styling** - Matches Twitter's UI perfectly
- 📱 **SPA support** - Works with Twitter's single-page app navigation
- ⚙️ **Configurable** - Manage relays and settings through popup interface

## Prerequisites

Before installing NostrX, you need a Nostr signing extension:

### Recommended Nostr Extensions:
- **[Alby](https://chrome.google.com/webstore/detail/alby-bitcoin-lightning-wa/iokeahhehimjnekafflcihljlcjccdbe)** - Bitcoin & Lightning wallet with Nostr support
- **[nos2x](https://chrome.google.com/webstore/detail/nos2x/kpgefcfmnafjgpblomihpbmjhomeahoq)** - Lightweight Nostr key manager

## Installation

### Method 1: Developer Mode (Recommended)

1. **Download the extension**
   - Clone or download this repository
   - Extract to a folder on your computer

2. **Create icon files**
   - Follow instructions in `icon-instructions.md` to convert `icon.svg` to required PNG formats
   - You need: `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`

3. **Install in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the NostrX folder
   - The extension should now appear in your extensions list

4. **Pin the extension** (Optional)
   - Click the puzzle piece icon in Chrome toolbar
   - Click the pin icon next to NostrX
   - This makes the extension icon always visible

### Method 2: Chrome Web Store
*Coming soon - Extension will be submitted to Chrome Web Store after testing*

## Setup

1. **Install a Nostr extension** (if you haven't already)
   - Install Alby or nos2x from the Chrome Web Store
   - Set up your Nostr keys following their instructions

2. **Visit Twitter/X**
   - Go to https://twitter.com or https://x.com
   - You should see lightning bolt (⚡) buttons next to each tweet's action bar

3. **Configure settings** (Optional)
   - Click the NostrX extension icon in the toolbar
   - Adjust relay settings and attribution preferences
   - The extension works with default settings out of the box

## Usage

### Basic Usage
1. Navigate to Twitter/X (twitter.com or x.com)
2. Find a tweet you want to cross-post
3. Click the lightning bolt (⚡) button in the tweet's action bar
4. The button will show a loading animation while posting
5. Success: Button shows a checkmark ✅
6. Error: Button shows an X ❌ (check popup for error details)

### Settings Management
Click the NostrX extension icon to access:

- **Extension Status** - Shows if your Nostr extension is detected
- **Enable/Disable** - Toggle NostrX functionality
- **Attribution Toggle** - Include "Originally posted by @username on X" 
- **Relay Management** - Add, remove, or reset to default relays
- **Status Monitoring** - See connection status and any errors

### Default Relays
NostrX comes pre-configured with these reliable relays:
- wss://relay.damus.io
- wss://relay.nostr.info  
- wss://nostr-pub.wellorder.net
- wss://relay.current.fyi
- wss://nostr.wine

## Troubleshooting

### "No Nostr extension found" Error
- Install Alby or nos2x from the Chrome Web Store
- Refresh the Twitter/X page after installation
- Check that the Nostr extension is enabled

### Buttons Not Appearing
- Refresh the Twitter/X page
- Make sure you're on twitter.com or x.com
- Check that NostrX is enabled in the popup settings
- Try disabling and re-enabling the extension

### Posts Not Publishing
- Check your internet connection
- Verify your Nostr extension is working (try posting elsewhere)
- Check the NostrX popup for specific error messages
- Try removing and re-adding relays in settings

### Extension Not Loading
- Make sure you've followed all installation steps
- Check that all required files are present
- Ensure icon PNG files are created (see icon-instructions.md)
- Try reloading the extension in chrome://extensions/

## File Structure

```
NostrX/
├── manifest.json          # Extension configuration
├── content.js            # Twitter/X integration script
├── background.js         # Nostr operations service worker  
├── popup.html           # Settings interface HTML
├── popup.js             # Settings interface logic
├── icon.svg             # Source icon (convert to PNG)
├── icon16.png           # 16x16 extension icon
├── icon32.png           # 32x32 extension icon
├── icon48.png           # 48x48 extension icon
├── icon128.png          # 128x128 extension icon
├── icon-instructions.md  # Icon conversion guide
└── README.md            # This file
```

## Security

NostrX prioritizes security:

- **No private key handling** - Uses your existing Nostr extension for all signing
- **Secure connections only** - All relay connections use WSS (secure WebSocket)
- **Local storage** - Settings stored locally using Chrome's storage API
- **No external dependencies** - All code is self-contained
- **Open source** - Full source code is available for audit

## Permissions Explained

NostrX requests these Chrome permissions:

- **storage** - Save your settings and relay preferences
- **activeTab** - Detect when you're on Twitter/X and interact with tweets
- **host_permissions** - Access twitter.com and x.com to add Nostr buttons

## Development & Contributing

### Building From Source
1. Clone the repository
2. Convert icon.svg to required PNG sizes
3. Load as unpacked extension in Chrome

### Testing Checklist
- [ ] Extension loads on both twitter.com and x.com
- [ ] Buttons appear on all tweets in timeline
- [ ] Posting works with Alby installed
- [ ] Posting works with nos2x installed  
- [ ] Error handling when no Nostr extension present
- [ ] Settings persist across browser sessions
- [ ] Relay management functions correctly
- [ ] Attribution toggle works as expected
- [ ] Handles Twitter's SPA navigation properly
- [ ] Visual feedback is clear and responsive

## Support

### Getting Help
- Check this README for common issues
- Verify your Nostr extension is working
- Try the default relay settings
- Refresh Twitter/X after making changes

### Reporting Issues
When reporting issues, please include:
1. Chrome version
2. Nostr extension (Alby/nos2x) and version
3. Error messages from NostrX popup
4. Steps to reproduce the problem

## Privacy

NostrX respects your privacy:
- No data collection or analytics
- No external API calls except to Nostr relays
- Settings stored locally on your device
- No tracking or user identification

## License

MIT License - Feel free to modify and distribute

## Roadmap

Future enhancements being considered:
- Thread detection and posting
- Image attachment support
- Hashtag conversion (#topic → #topic)
- Mention conversion (@user → npub)
- Scheduling posts
- Analytics dashboard
- Batch posting multiple tweets

---

**Made with ⚡ for the Nostr community**

Cross-post your thoughts from Twitter/X to the decentralized social web with one click!