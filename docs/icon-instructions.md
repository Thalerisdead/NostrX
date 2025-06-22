# Icon Creation Instructions

## Convert SVG to PNG Icons

The provided `icon.svg` file needs to be converted to PNG format in multiple sizes for the Chrome extension. You can use any of these methods:

### Method 1: Online Converter (Easiest)
1. Go to https://cloudconvert.com/svg-to-png or https://convertio.co/svg-png/
2. Upload the `icon.svg` file
3. Convert to PNG
4. Download and resize to the following dimensions:
   - `icon16.png` - 16x16 pixels
   - `icon32.png` - 32x32 pixels  
   - `icon48.png` - 48x48 pixels
   - `icon128.png` - 128x128 pixels

### Method 2: Using GIMP (Free)
1. Open GIMP
2. File → Import → Select `icon.svg`
3. Set import resolution to 128x128 for the largest size
4. Export as PNG
5. Repeat for other sizes (16x16, 32x32, 48x48)

### Method 3: Using Inkscape (Free)
1. Open Inkscape
2. File → Open → Select `icon.svg`
3. File → Export PNG Image
4. Set width/height to desired size
5. Export for each required size

### Method 4: Command Line (ImageMagick)
If you have ImageMagick installed:
```bash
convert icon.svg -resize 16x16 icon16.png
convert icon.svg -resize 32x32 icon32.png
convert icon.svg -resize 48x48 icon48.png
convert icon.svg -resize 128x128 icon128.png
```

## Icon Design Notes

The icon combines:
- **Blue Twitter-like background** - Represents the Twitter/X integration
- **Golden lightning bolt** - Represents the Nostr protocol
- **Clean, modern design** - Matches Twitter's aesthetic
- **Clear branding** - "NostrX" text for recognition

Once you have the PNG files, place them in the extension directory alongside the other files.