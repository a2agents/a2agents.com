#!/bin/bash
cd "$(dirname "$0")/new_new_news" || exit 1
source venv/bin/activate
export YOU_API_KEY='ydc-sk-0c63d432e2d74341-Fpg35VTM0LnjxHehdrq5I9CxDtqXeUm7-af932043<__>1SNQG8ETU8N2v5f4HwgDYJZN'
python3 -u main.py "$@"
