#!/usr/bin/env python3
import os
import requests

API_KEY = os.environ.get("YOU_API_KEY", "")
print(f"API Key present: {bool(API_KEY)}")
print(f"API Key length: {len(API_KEY)}")

url = "https://api.ydc-index.io/search"
headers = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
}
params = {
    "query": "COVID vaccine",
    "num_web_results": 2
}

print("Making API request...")
try:
    response = requests.get(url, headers=headers, params=params, timeout=10)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
