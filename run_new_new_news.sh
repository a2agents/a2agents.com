#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/new_new_news" || exit 1

if [[ -f "venv/bin/activate" ]]; then
  # shellcheck disable=SC1091
  source venv/bin/activate
fi

: "${YOU_API_KEY:?Set YOU_API_KEY before running this script}"

python3 -u main.py "$@"
