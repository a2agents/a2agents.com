#!/bin/bash
set -euo pipefail

# host=a2agents-slack-app.bennyjbergstein.workers.dev

# curl -s -X POST https://$host/api/chat \
#     -H 'content-type: application/json' \
#     -d '{"cohort":"builders","sessionId":"smoke-1","source":"web","message":"Hi, I am Sam. sam@example.com. I am trying to launch an AI ops tool in 3 months.","metadata":{"page":"/builders"}}' | jq

: "${OPENAI_API_KEY:?Set OPENAI_API_KEY before running this script}"
curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"
