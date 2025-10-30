#!/bin/bash

API_KEY='ydc-sk-0c63d432e2d74341-Fpg35VTM0LnjxHehdrq5I9CxDtqXeUm7-af932043<__>1SNQG8ETU8N2v5f4HwgDYJZN'

echo "=== Testing /search endpoint ==="
curl -s -X GET 'https://api.ydc-index.io/search?query=COVID%20vaccine&num_web_results=2' \
  -H "X-API-Key: $API_KEY" | python3 -m json.tool 2>&1 | head -20

echo -e "\n=== Testing /news endpoint ==="
curl -s -X GET 'https://api.ydc-index.io/news?query=COVID%20vaccine&count=2' \
  -H "X-API-Key: $API_KEY"

echo -e "\n\n=== Testing /rag endpoint ==="
curl -s -X POST 'https://api.ydc-index.io/rag' \
  -H "X-API-Key: $API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"query": "COVID vaccine"}'

echo ""
