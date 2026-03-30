#!/bin/bash
set -euo pipefail

API_KEY="${YOU_API_KEY:?Set YOU_API_KEY before running this script}"

echo "=== Testing CORRECT /v1/search endpoint with news ==="
curl -s -X GET 'https://api.ydc-index.io/v1/search?query=COVID%20vaccine%202020&count=3' \
  -H "X-API-Key: $API_KEY" | python3 -m json.tool | head -50

echo -e "\n\n=== Testing WRONG /news endpoint (what code currently uses) ==="
curl -s -X GET 'https://api.ydc-index.io/news?query=COVID%20vaccine&count=3' \
  -H "X-API-Key: $API_KEY"

echo ""
