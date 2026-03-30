#!/bin/bash
set -euo pipefail

API_KEY="${YOU_API_KEY:?Set YOU_API_KEY before running this script}"

curl -s -X GET 'https://api.ydc-index.io/v1/search?query=COVID%20vaccine%202020&count=2' \
  -H "X-API-Key: $API_KEY" > /tmp/you_response.json

python3 -c "import json; print(json.dumps(json.load(open('/tmp/you_response.json')), indent=2))"
