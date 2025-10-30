#!/bin/bash
API_KEY='ydc-sk-0c63d432e2d74341-Fpg35VTM0LnjxHehdrq5I9CxDtqXeUm7-af932043<__>1SNQG8ETU8N2v5f4HwgDYJZN'

curl -s -X GET 'https://api.ydc-index.io/v1/search?query=COVID%20vaccine%202020&count=2' \
  -H "X-API-Key: $API_KEY" > /tmp/you_response.json

python3 -c "import json; print(json.dumps(json.load(open('/tmp/you_response.json')), indent=2))"
