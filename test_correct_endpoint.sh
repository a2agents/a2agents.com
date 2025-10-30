#!/bin/bash

API_KEY='ydc-sk-0c63d432e2d74341-Fpg35VTM0LnjxHehdrq5I9CxDtqXeUm7-af932043<__>1SNQG8ETU8N2v5f4HwgDYJZN'

echo "=== Testing CORRECT /v1/search endpoint with news ==="
curl -s -X GET 'https://api.ydc-index.io/v1/search?query=COVID%20vaccine%202020&count=3' \
  -H "X-API-Key: $API_KEY" | python3 -m json.tool | head -50

echo -e "\n\n=== Testing WRONG /news endpoint (what code currently uses) ==="
curl -s -X GET 'https://api.ydc-index.io/news?query=COVID%20vaccine&count=3' \
  -H "X-API-Key: $API_KEY"

echo ""
