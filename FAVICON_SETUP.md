# Favicon Setup Guide

## Current Setup

The favicon is configured in `app/layout.tsx` and uses the following files:

### Files Created:

- `public/favicon.svg` - SVG version of the JD logo
- `public/favicon.ico` - Placeholder (needs to be replaced)
- `public/favicon-32x32.png` - Placeholder (needs to be replaced)

## How to Create Proper Favicon Files

### Option 1: Online Favicon Generators

1. Go to [favicon.io](https://favicon.io) or [realfavicongenerator.net](https://realfavicongenerator.net)
2. Upload your logo or create one with "JD" text
3. Download the generated files
4. Replace the placeholder files in the `public` directory

### Option 2: Manual Creation

1. Create a 32x32 pixel image with your JD logo design
2. Use the same design as your email template:
   - Dark background (#1f2937)
   - White "JD" text
   - Rounded corners
3. Export as PNG and ICO formats

### Required Files:

- `favicon.ico` (16x16, 32x32, 48x48 pixels)
- `favicon-16x16.png` (16x16 pixels)
- `favicon-32x32.png` (32x32 pixels)
- `apple-touch-icon.png` (180x180 pixels)

## Current SVG Favicon

The `favicon.svg` file is already created and working. It features:

- Dark rounded rectangle background (#1f2937)
- White "JD" text
- 32x32 viewport
- Scalable vector format

## Testing

After adding the favicon files:

1. Clear your browser cache
2. Visit your website
3. Check the browser tab to see the favicon
4. Test on different devices and browsers

## Notes

- The SVG favicon is modern and scalable
- ICO files provide better browser compatibility
- Apple touch icons are for iOS devices
- Clear browser cache if favicon doesn't appear immediately
