"""
Web Researcher Agent - Uses You.com Search API to find sources
"""

from typing import Dict, Any, List
from .base_agent import BaseAgent
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from you_api_client import YouAPIClient


class WebResearcherAgent(BaseAgent):
    """
    Web Researcher Agent: Finds sources using You.com Search and News APIs

    Responsibilities:
    - Execute web searches using You.com Search API
    - Execute news searches using You.com News API
    - Filter and rank results by relevance
    - Extract potential artifacts from search results
    """

    def __init__(self, api_client: YouAPIClient = None):
        super().__init__("Web Researcher")
        self.api_client = api_client or YouAPIClient()

    def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Research artifacts using web and news search

        Args:
            input_data: {
                "search_queries": List[str],
                "max_results_per_query": int
            }

        Returns:
            Found artifacts with sources
        """
        search_queries = input_data.get("search_queries", [])
        max_results = input_data.get("max_results_per_query", 10)

        all_sources = []
        potential_artifacts = []

        # Execute web searches
        for query in search_queries:
            print(f"[{self.name}] Searching web: {query}")

            # Web search
            web_results = self.api_client.web_search(query, num_results=max_results)
            web_sources = self._process_web_results(web_results, query)
            all_sources.extend(web_sources)

            # News search
            news_results = self.api_client.news_search(query, count=5)
            news_sources = self._process_news_results(news_results, query)
            all_sources.extend(news_sources)

        # Extract potential artifacts from sources
        potential_artifacts = self._extract_artifacts(all_sources)

        output = {
            "total_sources_found": len(all_sources),
            "sources": all_sources,
            "potential_artifacts": potential_artifacts,
            "queries_executed": len(search_queries)
        }

        self.log_execution(input_data, output)
        return output

    def _process_web_results(self, results: Dict[str, Any], query: str) -> List[Dict[str, Any]]:
        """Process web search results into standardized source format"""
        sources = []

        hits = results.get("hits", [])
        for hit in hits:
            source = {
                "type": "web",
                "query": query,
                "title": hit.get("title", ""),
                "url": hit.get("url", ""),
                "snippet": hit.get("snippet", ""),
                "description": hit.get("description", hit.get("snippet", "")),
                "date": hit.get("age", "2020"),
                "relevance_score": self._calculate_relevance(hit, query)
            }
            sources.append(source)

        return sources

    def _process_news_results(self, results: Dict[str, Any], query: str) -> List[Dict[str, Any]]:
        """Process news search results into standardized source format"""
        sources = []

        news_results = results.get("news", {}).get("results", [])
        for article in news_results:
            source = {
                "type": "news",
                "query": query,
                "title": article.get("title", ""),
                "url": article.get("url", ""),
                "snippet": article.get("description", ""),
                "description": article.get("description", ""),
                "date": article.get("published_date", "2020"),
                "source_name": article.get("source", ""),
                "relevance_score": self._calculate_relevance(article, query)
            }
            sources.append(source)

        return sources

    def _calculate_relevance(self, item: Dict[str, Any], query: str) -> float:
        """Calculate relevance score for a source"""
        score = 0.0

        # Check title relevance
        title = item.get("title", "").lower()
        query_terms = query.lower().split()

        for term in query_terms:
            if term in title:
                score += 0.2

        # Check for 2020
        if "2020" in str(item.get("date", "")):
            score += 0.3

        # Check description/snippet
        text = (item.get("description", "") + " " + item.get("snippet", "")).lower()
        for term in query_terms:
            if term in text:
                score += 0.1

        return min(score, 1.0)

    def _extract_artifacts(self, sources: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract potential artifacts from sources"""
        artifacts = []

        # Group sources by similarity and create artifact candidates
        seen_titles = set()

        for source in sources:
            title = source.get("title", "")

            # Skip duplicates
            if title in seen_titles or not title:
                continue

            seen_titles.add(title)

            # Determine artifact type
            artifact_type = self._classify_artifact_type(source)

            # Only include if it seems like a professional deliverable
            if artifact_type:
                artifact = {
                    "title": title,
                    "type": artifact_type,
                    "description": source.get("description", ""),
                    "url": source.get("url", ""),
                    "date": source.get("date", "2020"),
                    "sources": [source],  # Will be enriched by citation verifier
                    "relevance_score": source.get("relevance_score", 0.0)
                }
                artifacts.append(artifact)

        # Sort by relevance
        artifacts.sort(key=lambda x: x["relevance_score"], reverse=True)

        return artifacts

    def _classify_artifact_type(self, source: Dict[str, Any]) -> str:
        """Classify the type of professional artifact"""
        title = source.get("title", "").lower()
        description = source.get("description", "").lower()
        text = title + " " + description

        # Classification logic
        if any(term in text for term in ["research paper", "study", "nejm", "journal", "peer review"]):
            return "Research Paper"
        elif any(term in text for term in ["clinical trial", "phase 3", "efficacy"]):
            return "Clinical Trial Data"
        elif any(term in text for term in ["fda", "regulatory", "authorization", "eua", "approval"]):
            return "Regulatory Submission"
        elif any(term in text for term in ["github", "software", "code", "open source"]):
            return "Software Release"
        elif any(term in text for term in ["policy", "government", "executive order"]):
            return "Policy Document"
        elif any(term in text for term in ["specification", "standard", "protocol"]):
            return "Technical Specification"
        elif any(term in text for term in ["dataset", "data set"]):
            return "Dataset"
        elif any(term in text for term in ["patent"]):
            return "Patent"

        return ""  # Not a professional artifact
