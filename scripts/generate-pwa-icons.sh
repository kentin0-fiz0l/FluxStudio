#!/bin/bash

# Generate PWA icons from source logo
# Requires ImageMagick: brew install imagemagick

SOURCE_LOGO="public.backup/FluxStudio_Logo.png"
ICONS_DIR="public/icons"

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "Error: ImageMagick is not installed"
    echo "Install with: brew install imagemagick"
    exit 1
fi

# Check if source logo exists
if [ ! -f "$SOURCE_LOGO" ]; then
    echo "Error: Source logo not found at $SOURCE_LOGO"
    exit 1
fi

# Create icons directory
mkdir -p "$ICONS_DIR"

# Generate icons in different sizes
echo "Generating PWA icons..."

# Generate each icon size
for size in 72 96 128 144 152 192 384 512; do
    echo "  Generating ${size}x${size}..."
    convert "$SOURCE_LOGO" -resize "${size}x${size}" \
        -gravity center -background none \
        -extent "${size}x${size}" \
        "$ICONS_DIR/icon-${size}x${size}.png"
done

echo "✅ PWA icons generated successfully!"
echo "Icons location: $ICONS_DIR"

# List generated icons
ls -lh "$ICONS_DIR"
