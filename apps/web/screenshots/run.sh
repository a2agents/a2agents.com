#!/bin/bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
WEB_DIR="$(dirname "$DIR")"
PORT=3099

# Build CSS
cd "$WEB_DIR"
npx tailwindcss -i ./src/css/input.css -o ./src/styles.css 2>/dev/null

# Start server
npx live-server src --port=$PORT --no-browser --quiet &
SERVER_PID=$!
trap "kill $SERVER_PID 2>/dev/null" EXIT

sleep 2

# Remove old screenshots
rm -f "$DIR"/screen-*.png "$DIR"/full-page.png

# Take screenshots
node "$DIR/take-screenshots.js"

echo ""
echo "Screenshots saved to $DIR/"
