#!/usr/bin/env python3
"""
You.com API Endpoint Tester
Tests Web Search, News, and Web LLM endpoints to understand their capabilities
for the New New News hackathon project.
"""

import requests
import json
from typing import Dict, Any

# API Configuration
API_KEY = "ydc-sk-ee8bd1fdc14d83e4-jrMlR51eNr6VYBou1o9KX7UBSy1nWosS-be4e9be71SJLaUETU8N2v5f4XPe6NHD5"
BASE_URL = "https://api.ydc-index.io"

# Test query related to 2020 professional artifacts
TEST_QUERY = "most valuable professional deliverables from 2020 COVID vaccine development research papers"
NEWS_QUERY = "2020 COVID vaccine development breakthrough announcements"
LLM_QUERY = "Identify the most significant professional artifacts and deliverables from 2020 related to COVID-19 vaccine development, including research papers, clinical trial data, and regulatory submissions"


def test_web_search_api(query: str) -> Dict[str, Any]:
    """
    Test the You.com Web Search API

    Args:
        query: Search query string

    Returns:
        API response as dictionary
    """
    print("\n" + "="*80)
    print("TESTING WEB SEARCH API")
    print("="*80)

    url = f"{BASE_URL}/search"  # Try both /search and /v1/search
    # Alternative: url = f"{BASE_URL}/v1/search"
    headers = {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json"
    }

    params = {
        "query": query,
        "num_web_results": 10
    }

    try:
        print(f"\n📡 Request URL: {url}")
        print(f"📝 Query: {query}")
        print(f"🔧 Params: {json.dumps(params, indent=2)}")

        response = requests.get(url, headers=headers, params=params)
        print(f"\n✅ Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"\n📊 Response Structure:")
            print(f"   - Keys available: {list(data.keys())}")

            # Display sample results
            if 'hits' in data:
                print(f"\n   - Number of results: {len(data['hits'])}")
                print(f"\n📄 Sample Result #1:")
                if len(data['hits']) > 0:
                    sample = data['hits'][0]
                    for key, value in sample.items():
                        if isinstance(value, str) and len(value) > 200:
                            print(f"   - {key}: {value[:200]}...")
                        else:
                            print(f"   - {key}: {value}")

            return data
        else:
            print(f"\n❌ Error: {response.text}")
            return {"error": response.text, "status_code": response.status_code}

    except Exception as e:
        print(f"\n❌ Exception: {str(e)}")
        return {"error": str(e)}


def test_news_api(query: str) -> Dict[str, Any]:
    """
    Test the You.com News API

    Args:
        query: Search query string

    Returns:
        API response as dictionary
    """
    print("\n" + "="*80)
    print("TESTING NEWS API")
    print("="*80)

    url = f"{BASE_URL}/news"
    headers = {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json"
    }

    params = {
        "query": query,
        "count": 10
    }

    try:
        print(f"\n📡 Request URL: {url}")
        print(f"📝 Query: {query}")
        print(f"🔧 Params: {json.dumps(params, indent=2)}")

        response = requests.get(url, headers=headers, params=params)
        print(f"\n✅ Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"\n📊 Response Structure:")
            print(f"   - Keys available: {list(data.keys())}")

            # Display sample results
            if 'news' in data and 'results' in data['news']:
                results = data['news']['results']
                print(f"\n   - Number of news articles: {len(results)}")
                print(f"\n📰 Sample News Article #1:")
                if len(results) > 0:
                    sample = results[0]
                    for key, value in sample.items():
                        if isinstance(value, str) and len(value) > 200:
                            print(f"   - {key}: {value[:200]}...")
                        else:
                            print(f"   - {key}: {value}")

            return data
        else:
            print(f"\n❌ Error: {response.text}")
            return {"error": response.text, "status_code": response.status_code}

    except Exception as e:
        print(f"\n❌ Exception: {str(e)}")
        return {"error": str(e)}


def test_web_llm_api(query: str) -> Dict[str, Any]:
    """
    Test the You.com Web LLM API (RAG endpoint)

    Args:
        query: Query/prompt string

    Returns:
        API response as dictionary
    """
    print("\n" + "="*80)
    print("TESTING WEB LLM API (RAG)")
    print("="*80)

    url = f"{BASE_URL}/chat"
    headers = {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json"
    }

    payload = {
        "query": query,
        "chat_history": []
    }

    try:
        print(f"\n📡 Request URL: {url}")
        print(f"📝 Query: {query}")
        print(f"🔧 Payload: {json.dumps(payload, indent=2)}")

        response = requests.post(url, headers=headers, json=payload)
        print(f"\n✅ Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"\n📊 Response Structure:")
            print(f"   - Keys available: {list(data.keys())}")

            # Display the generated answer
            if 'answer' in data:
                answer = data['answer']
                print(f"\n🤖 Generated Answer:")
                print(f"   {answer[:500]}..." if len(answer) > 500 else f"   {answer}")

            # Display citations if available
            if 'citations' in data:
                print(f"\n📚 Citations: {len(data['citations'])} sources")
                if len(data['citations']) > 0:
                    print(f"\n   Sample Citation #1:")
                    sample = data['citations'][0]
                    for key, value in sample.items():
                        if isinstance(value, str) and len(value) > 150:
                            print(f"   - {key}: {value[:150]}...")
                        else:
                            print(f"   - {key}: {value}")

            return data
        else:
            print(f"\n❌ Error: {response.text}")
            return {"error": response.text, "status_code": response.status_code}

    except Exception as e:
        print(f"\n❌ Exception: {str(e)}")
        return {"error": str(e)}


def save_results(results: Dict[str, Any], filename: str):
    """Save API results to a JSON file for review"""
    with open(filename, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\n💾 Full results saved to: {filename}")


def main():
    """Run all API tests"""
    print("\n" + "="*80)
    print("YOU.COM API ENDPOINT TESTER")
    print("Testing capabilities for New New News hackathon project")
    print("="*80)

    results = {}

    # Test 1: Web Search API
    web_search_results = test_web_search_api(TEST_QUERY)
    results['web_search'] = web_search_results
    save_results(web_search_results, 'web_search_results.json')

    # Test 2: News API
    news_results = test_news_api(NEWS_QUERY)
    results['news'] = news_results
    save_results(news_results, 'news_results.json')

    # Test 3: Web LLM API
    llm_results = test_web_llm_api(LLM_QUERY)
    results['web_llm'] = llm_results
    save_results(llm_results, 'web_llm_results.json')

    # Save combined results
    save_results(results, 'all_api_results.json')

    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print("\n✅ All API tests completed!")
    print("\nNext Steps:")
    print("1. Review the JSON output files to understand data structures")
    print("2. Design the multi-agent system based on API capabilities")
    print("3. Implement the 5-agent orchestration system")
    print("\nFiles created:")
    print("- web_search_results.json")
    print("- news_results.json")
    print("- web_llm_results.json")
    print("- all_api_results.json")
    print("="*80 + "\n")


if __name__ == "__main__":
    main()
