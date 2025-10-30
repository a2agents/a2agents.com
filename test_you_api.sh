#!/bin/bash

API_KEY='ydc-sk-ee8bd1fdc14d83e4-jrMlR51eNr6VYBou1o9KX7UBSy1nWosS-be4e9be7<__>1SJLaUETU8N2v5f4XPe6NHD5'

echo "=== Testing /search endpoint ==="
curl -s -X GET 'https://api.ydc-index.io/search?query=COVID%20vaccine&num_web_results=2' \
  -H "X-API-Key: $API_KEY" | python3 -m json.tool 2>&1 | head -20

echo -e "\n=== Testing /news endpoint ==="
curl -s -X GET 'https://api.ydc-index.io/news?query=COVID%20vaccine&count=2' \
  -H "X-API-Key: $API_KEY"

echo -e "\n=== Testing /rag endpoint ==="
curl -s -X POST 'https://api.ydc-index.io/rag' \
  -H "X-API-Key: $API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"query": "COVID vaccine"}'

echo ""
