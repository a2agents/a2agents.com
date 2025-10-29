#!/usr/bin/env python3
"""
Simple You.com API Test - Testing different endpoint variations
"""

import requests
import json

API_KEY = "ydc-sk-ee8bd1fdc14d83e4-jrMlR51eNr6VYBou1o9KX7UBSy1nWosS-be4e9be71SJLaUETU8N2v5f4XPe6NHD5"

# Test different endpoint variations
endpoints_to_test = [
    "https://api.ydc-index.io/search",
    "https://api.ydc-index.io/v1/search",
    "https://api.ydc-index.io/rag",
    "https://api.ydc-index.io/v1/rag",
    "https://api.ydc-index.io/chat",
    "https://api.ydc-index.io/v1/chat",
]

headers = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
}

test_query = "COVID-19 vaccine development 2020"

print("Testing You.com API Endpoints\n" + "="*80)

for endpoint in endpoints_to_test:
    print(f"\n🔍 Testing: {endpoint}")

    try:
        # Try GET request
        response = requests.get(
            endpoint,
            headers=headers,
            params={"query": test_query},
            timeout=10
        )

        print(f"   GET Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   ✅ SUCCESS!")
            data = response.json()
            print(f"   Response keys: {list(data.keys())}")
            with open(f"success_{endpoint.split('/')[-1]}_get.json", 'w') as f:
                json.dump(data, f, indent=2)
            print(f"   Saved to: success_{endpoint.split('/')[-1]}_get.json")
        elif response.status_code == 404:
            print(f"   ❌ Endpoint not found")
        elif response.status_code == 403:
            print(f"   ❌ Access denied (may need activation or wrong endpoint)")
        else:
            print(f"   Response: {response.text[:200]}")

    except Exception as e:
        print(f"   GET Error: {str(e)}")

    # Try POST for chat/rag endpoints
    if 'chat' in endpoint or 'rag' in endpoint:
        try:
            response = requests.post(
                endpoint,
                headers=headers,
                json={"query": test_query},
                timeout=10
            )

            print(f"   POST Status: {response.status_code}")
            if response.status_code == 200:
                print(f"   ✅ SUCCESS!")
                data = response.json()
                print(f"   Response keys: {list(data.keys())}")
                with open(f"success_{endpoint.split('/')[-1]}_post.json", 'w') as f:
                    json.dump(data, f, indent=2)
                print(f"   Saved to: success_{endpoint.split('/')[-1]}_post.json")
            elif response.status_code == 404:
                print(f"   ❌ Endpoint not found")
            elif response.status_code == 403:
                print(f"   ❌ Access denied")
            else:
                print(f"   Response: {response.text[:200]}")

        except Exception as e:
            print(f"   POST Error: {str(e)}")

print("\n" + "="*80)
print("Testing complete. Check for any success_*.json files created.")
