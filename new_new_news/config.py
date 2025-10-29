"""
Configuration for New New News - 2020 Human Artifacts Index
"""

import os

# You.com API Configuration
# Set your API key as an environment variable: export YOU_API_KEY="your-key-here"
# Or create a .env file (not committed to git)
YOU_API_KEY = os.environ.get("YOU_API_KEY", "")
YOU_API_BASE_URL = "https://api.ydc-index.io"

# API Endpoints
SEARCH_ENDPOINT = f"{YOU_API_BASE_URL}/search"
NEWS_ENDPOINT = f"{YOU_API_BASE_URL}/news"
RAG_ENDPOINT = f"{YOU_API_BASE_URL}/rag"
CHAT_ENDPOINT = f"{YOU_API_BASE_URL}/chat"
CONTENTS_ENDPOINT = f"{YOU_API_BASE_URL}/contents"
EXPRESS_ENDPOINT = f"{YOU_API_BASE_URL}/express"

# Mock mode - set to False once API key is activated
USE_MOCK_DATA = True

# Agent Configuration
MAX_ARTIFACTS_PER_QUERY = 10
MIN_SOURCES_PER_ARTIFACT = 2
MAX_SOURCES_PER_ARTIFACT = 3

# Report Mode Configuration
DEFAULT_SUB_QUERIES = 20
MIN_SUB_QUERIES = 15
MAX_SUB_QUERIES = 25
DEFAULT_TARGET_ARTIFACTS = 100

# 2020 Artifacts Index Configuration
TARGET_YEAR = 2020
ARTIFACT_CATEGORIES = [
    "Research Papers",
    "Clinical Trial Data",
    "Regulatory Submissions",
    "Software/Code Releases",
    "Policy Documents",
    "Technical Specifications",
    "Design Documents",
    "Data Sets",
    "Patents",
    "Open Source Projects"
]
