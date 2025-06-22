# NostrX Extension Settings Documentation

## Settings Overview

NostrX provides a comprehensive settings interface accessible through the extension popup. This document details all settings, their purposes, default values, and configuration options.

## Accessing Settings

### Via Extension Popup
1. **Click the NostrX icon** in Chrome's extension toolbar
2. **Popup window opens** displaying current status and settings
3. **Settings are organized** into logical sections for easy management

### Settings Persistence
- **Stored locally** using Chrome's storage API
- **Synced across browser sessions** automatically
- **No cloud storage** - all data remains on your device
- **Instant updates** - changes take effect immediately

---

## Settings Sections

### 1. Nostr Extension Status

#### Purpose
Real-time monitoring of your Nostr signing extension (Alby, nos2x) connectivity and functionality.

#### Status Indicators

**🟢 Connected Status**
```
"Nostr extension detected and ready"
```
- **Meaning**: Extension can successfully communicate with your Nostr signer
- **Icon**: Green checkmark ✅
- **Action Required**: None - ready to post

**🔴 Disconnected Status**
```
"Alby installed but not detected. Try unlocking Alby and refreshing Twitter."
```
- **Meaning**: Nostr extension is installed but not accessible
- **Icon**: Red X ❌
- **Common Causes**:
  - Alby is locked (needs password)
  - Permissions not granted to twitter.com
  - Extension disabled or paused

**🔴 Error Status**
```
"No Nostr extension found. Install Alby or nos2x."
```
- **Meaning**: No compatible Nostr extension detected
- **Action Required**: Install and configure Alby or nos2x

#### Troubleshooting Status Issues
- **Unlock your Nostr extension** (enter password)
- **Grant permissions** to twitter.com in extension settings
- **Refresh Twitter page** after making changes
- **Check extension is enabled** in chrome://extensions/

---

### 2. Enable/Disable Toggle

#### Setting Details
- **Label**: "Enable NostrX"
- **Type**: Boolean toggle switch
- **Default**: Enabled (ON)
- **Visual**: Purple toggle when enabled, gray when disabled

#### Functionality
**When Enabled** ✅:
- Lightning bolt buttons are functional
- Clicking ⚡ triggers cross-posting to Nostr
- All extension features active

**When Disabled** ❌:
- Lightning bolt buttons still appear but are inactive
- Clicking ⚡ does nothing (no visual feedback)
- Useful for temporarily pausing cross-posting
- Settings remain preserved

#### Use Cases
- **Temporary pause**: Disable during private browsing sessions
- **Testing mode**: Enable/disable to verify button behavior
- **Selective usage**: Turn off when browsing specific content
- **Battery saving**: Reduce background activity

---

### 3. Include Attribution Toggle

#### Setting Details
- **Label**: "Include attribution"
- **Type**: Boolean toggle switch
- **Default**: Enabled (ON)
- **Visual**: Purple toggle when enabled, gray when disabled

#### Functionality
**When Enabled** ✅:
```
Original tweet content here

Originally posted by @username on X
https://twitter.com/username/status/123456789
```

**When Disabled** ❌:
```
Original tweet content here
```

#### Attribution Format
- **Attribution line**: "Originally posted by @{username} on X"
- **Tweet URL**: Direct link to original tweet
- **Spacing**: Two line breaks before attribution
- **Consistent format**: Same across all posts

#### Privacy Considerations
- **Public information only**: Uses publicly visible username
- **Source transparency**: Readers know content origin
- **Credit attribution**: Maintains connection to original author
- **Disable for privacy**: Remove attribution if desired

---

### 4. Relay Management

#### Overview
Configure which Nostr relays receive your cross-posted content. Relays are servers that store and distribute Nostr events across the network.

#### Default Relays (5 Total)
```
wss://relay.damus.io
wss://relay.nostr.info
wss://nostr-pub.wellorder.net
wss://relay.current.fyi
wss://nostr.wine
```

#### Relay List Interface

**Visual Layout**:
```
┌─────────────────────────────────────────────┐
│ Relays                                      │
├─────────────────────────────────────────────┤
│ wss://relay.damus.io                     [X]│
│ wss://relay.nostr.info                   [X]│
│ wss://nostr-pub.wellorder.net            [X]│
│ wss://relay.current.fyi                  [X]│
│ wss://nostr.wine                         [X]│
├─────────────────────────────────────────────┤
│ [wss://relay.example.com        ] [Add]    │
│ [Reset to Defaults]                         │
└─────────────────────────────────────────────┤
```

#### Adding Custom Relays

**Input Requirements**:
- **Protocol**: Must start with `wss://` (secure WebSocket)
- **Valid URL**: Proper URL format required
- **Unique**: Cannot add duplicate relays
- **Security**: Only WSS connections allowed (no plain WS)

**Add Process**:
1. **Enter relay URL** in input field
2. **Click "Add" button**
3. **Relay appears** in list immediately
4. **Settings auto-saved**

**Validation Rules**:
```javascript
// Valid examples
wss://relay.example.com          ✅
wss://relay.example.com:443      ✅
wss://my-relay.domain.org/ws     ✅

// Invalid examples
ws://relay.example.com           ❌ (not secure)
https://relay.example.com        ❌ (not WebSocket)
relay.example.com                ❌ (missing protocol)
```

#### Removing Relays

**Process**:
1. **Click X button** next to relay URL
2. **Relay removed** immediately
3. **Minimum enforced**: Cannot remove last relay

**Safeguards**:
- **Minimum 1 relay**: Prevents complete removal
- **Confirmation**: Visual feedback on removal
- **Reversible**: Can re-add or reset to defaults

#### Reset to Defaults

**Functionality**:
- **Replaces current list** with 5 default relays
- **Removes all custom relays**
- **Instant effect** - no confirmation required
- **Useful for**: Fixing broken configurations

---

### 5. Default Configuration Values

#### Complete Default Settings Object
```json
{
  "relays": [
    "wss://relay.damus.io",
    "wss://relay.nostr.info", 
    "wss://nostr-pub.wellorder.net",
    "wss://relay.current.fyi",
    "wss://nostr.wine"
  ],
  "includeAttribution": true,
  "enabled": true
}
```

#### Relay Selection Criteria
**Why These Relays**:
- **relay.damus.io**: Popular iOS client, high reliability
- **relay.nostr.info**: Community-maintained, good uptime
- **nostr-pub.wellorder.net**: Well-established, fast response
- **relay.current.fyi**: Modern infrastructure, low latency
- **nostr.wine**: Community favorite, consistent performance

**Characteristics**:
- **Geographic diversity**: Servers in different regions
- **High uptime**: >99% availability historically
- **Active maintenance**: Regularly updated and monitored
- **Free access**: No payment or registration required
- **Good reputation**: Trusted by Nostr community

---

## Advanced Settings Configuration

### Programmatic Access
```javascript
// Get current settings
chrome.storage.local.get('settings', (result) => {
  console.log('Current settings:', result.settings);
});

// Update settings
chrome.storage.local.set({
  settings: {
    relays: ['wss://my-relay.com'],
    includeAttribution: false,
    enabled: true
  }
});
```

### Import/Export (Future Feature)
```json
// Settings export format
{
  "version": "1.0.0",
  "settings": {
    "relays": ["wss://relay1.com", "wss://relay2.com"],
    "includeAttribution": true,
    "enabled": true
  },
  "exported": "2024-01-01T00:00:00Z"
}
```

### Backup Recommendations
- **Export settings** before major changes
- **Document custom relays** for restoration
- **Test new configurations** with single posts
- **Keep default relay list** as backup

---

## Setting Validation & Error Handling

### Relay URL Validation
```javascript
function validateRelayUrl(url) {
  // Must start with wss://
  if (!url.startsWith('wss://')) {
    return 'Relay URL must start with wss://';
  }
  
  // Must be valid URL
  try {
    new URL(url);
  } catch {
    return 'Invalid URL format';
  }
  
  // Cannot be duplicate
  if (currentRelays.includes(url)) {
    return 'Relay already exists';
  }
  
  return null; // Valid
}
```

### Error Messages
- **"Invalid relay URL"**: Malformed URL provided
- **"Relay already exists"**: Attempted to add duplicate
- **"Must have at least one relay"**: Tried to remove last relay
- **"Security error"**: Attempted to use non-WSS protocol

### Auto-Recovery
- **Invalid settings**: Revert to defaults
- **Corrupted storage**: Reinitialize with defaults
- **Missing relays**: Add defaults if list empty
- **Version mismatch**: Migrate to current format

---

## Settings Performance & Storage

### Storage Specifications
- **Storage Type**: Chrome local storage
- **Size Limit**: ~5MB (Chrome extension limit)
- **Current Usage**: <1KB (settings only)
- **Sync**: Local only, no cloud sync

### Performance Impact
- **Setting Changes**: Instant (localStorage is synchronous)
- **Relay Updates**: No impact on active connections
- **Enable/Disable**: Immediate effect on button behavior
- **Attribution Toggle**: Only affects new posts

### Storage Migration
```javascript
// Version 1.0.0 → 1.1.0 example
if (settings.version === '1.0.0') {
  settings.newFeature = defaultValue;
  settings.version = '1.1.0';
  chrome.storage.local.set({ settings });
}
```

---

## Security & Privacy

### Data Protection
- **Local storage only**: No data sent to external servers
- **No tracking**: Settings not used for analytics
- **No PII**: Only technical configuration stored
- **User control**: Complete ownership of settings

### Relay Privacy
- **Public information**: Relay URLs are not sensitive
- **Connection metadata**: Relays see your IP and posts
- **Content visibility**: All posts are public on Nostr
- **Identity protection**: Use VPN if privacy concerned

### Recommended Practices
- **Use trusted relays**: Stick to well-known relays
- **Monitor relay status**: Check relay reliability over time
- **Backup settings**: Export before major changes
- **Regular review**: Periodically audit relay list

---

This settings documentation provides complete technical details for configuring and managing NostrX extension behavior. All settings are designed for ease of use while providing advanced users with full control over extension functionality.