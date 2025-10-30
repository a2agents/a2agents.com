"""
Query Decomposer Agent
Decomposes broad topics into specific research queries
"""

import json
from typing import Dict, List, Any
from .base_agent import BaseAgent
from config import DEFAULT_SUB_QUERIES, MIN_SUB_QUERIES, MAX_SUB_QUERIES


class QueryDecomposerAgent(BaseAgent):
    """
    Agent responsible for breaking down broad topics into specific queries

    Uses Express API to generate diverse, non-overlapping queries covering
    different categories and aspects of the topic.
    """

    def __init__(self, api_client=None):
        super().__init__("Query Decomposer")
        from you_api_client import YouAPIClient
        self.api_client = api_client or YouAPIClient()

    def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Decompose a broad topic into specific research queries

        Args:
            input_data: Dict with:
                - topic: Broad research topic (e.g., "2020 Human Artifacts")
                - target_queries: Number of sub-queries to generate (default: 20)

        Returns:
            Dict with:
                - queries: List of specific search queries
                - categories: Dict mapping queries to categories
                - metadata: Generation metadata
        """
        topic = input_data.get("topic", "")
        target_queries = input_data.get("target_queries", DEFAULT_SUB_QUERIES)

        # Validate target
        target_queries = max(MIN_SUB_QUERIES, min(target_queries, MAX_SUB_QUERIES))

        print(f"🔍 Decomposing topic: '{topic}'")
        print(f"   Target queries: {target_queries}")

        # Use Express API to generate diverse queries
        prompt = self._build_decomposition_prompt(topic, target_queries)
        result = self.api_client.express_query(prompt)

        # Parse the result
        queries = self._parse_queries(result, target_queries)

        # Categorize queries
        categories = self._categorize_queries(queries)

        print(f"✓ Generated {len(queries)} sub-queries across {len(set(categories.values()))} categories")

        return {
            "queries": queries,
            "categories": categories,
            "metadata": {
                "topic": topic,
                "target_queries": target_queries,
                "actual_queries": len(queries),
                "unique_categories": len(set(categories.values()))
            }
        }

    def _build_decomposition_prompt(self, topic: str, target_queries: int) -> str:
        """Build prompt for Express API to decompose topic"""

        prompt = f"""Generate {target_queries} specific, diverse search queries to comprehensively research: "{topic}"

Requirements:
- Each query should be specific and actionable for web search
- Cover multiple categories: Healthcare, Technology, Policy, Culture, Education, Business
- Queries should be non-overlapping and complementary
- Focus on professional artifacts, deliverables, and innovations
- Include specific year (2020) where relevant
- Mix of queries covering: research papers, products, regulations, platforms, protocols

Return ONLY a JSON object with this structure:
{{
  "queries": [
    "specific query 1",
    "specific query 2",
    ...
  ]
}}

Generate exactly {target_queries} high-quality queries."""

        return prompt

    def _parse_queries(self, result: Dict[str, Any], target: int) -> List[str]:
        """Parse queries from Express API response"""

        try:
            # Express API returns answer as JSON string
            answer = result.get("answer", "{}")

            if isinstance(answer, str):
                data = json.loads(answer)
            else:
                data = answer

            queries = data.get("queries", [])

            # Ensure we have enough queries
            if len(queries) < target * 0.7:  # At least 70% of target
                print(f"⚠️  Only got {len(queries)} queries, expected ~{target}")

            return queries[:target]  # Cap at target

        except json.JSONDecodeError as e:
            print(f"⚠️  Failed to parse queries: {e}")
            # Fallback to default queries
            return self._get_fallback_queries(target)

    def _categorize_queries(self, queries: List[str]) -> Dict[str, str]:
        """Categorize queries into broad categories"""

        categories = {}

        # Simple keyword-based categorization
        category_keywords = {
            "Healthcare": ["vaccine", "health", "medical", "clinical", "hospital", "doctor", "patient", "drug", "treatment", "ppe", "mask"],
            "Technology": ["software", "platform", "app", "zoom", "cloud", "security", "code", "github", "tech", "digital"],
            "Policy": ["regulation", "policy", "government", "fda", "law", "executive", "legislation", "compliance"],
            "Education": ["education", "school", "university", "learning", "classroom", "student", "teacher", "online learning"],
            "Business": ["business", "company", "revenue", "market", "product", "service", "startup", "venture"],
            "Culture": ["entertainment", "media", "social", "culture", "art", "music", "netflix", "streaming"]
        }

        for query in queries:
            query_lower = query.lower()
            assigned = False

            for category, keywords in category_keywords.items():
                if any(keyword in query_lower for keyword in keywords):
                    categories[query] = category
                    assigned = True
                    break

            if not assigned:
                categories[query] = "General"

        return categories

    def _get_fallback_queries(self, target: int) -> List[str]:
        """Fallback queries if Express API fails"""

        default_queries = [
            "COVID-19 vaccine development 2020",
            "mRNA technology breakthrough 2020",
            "FDA emergency use authorization 2020",
            "Zoom video conferencing growth 2020",
            "remote work platforms 2020",
            "N95 mask manufacturing 2020",
            "contact tracing apps 2020",
            "telehealth adoption 2020",
            "ventilator production 2020",
            "WHO pandemic guidelines 2020",
            "CARES Act stimulus package 2020",
            "online education platforms 2020",
            "Netflix pandemic programming 2020",
            "essential worker protocols 2020",
            "quarantine systems 2020",
            "COVID-19 testing innovations 2020",
            "social distancing technology 2020",
            "grocery delivery services 2020",
            "work from home security 2020",
            "pandemic modeling software 2020",
            "hospital capacity planning 2020",
            "remote collaboration tools 2020",
            "digital health records 2020",
            "supply chain innovations 2020",
            "public health communication 2020"
        ]

        return default_queries[:target]
