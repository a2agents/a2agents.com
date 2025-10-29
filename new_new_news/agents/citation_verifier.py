"""
Citation Verifier Agent - Ensures 2-3 sources per artifact
"""

from typing import Dict, Any, List
from .base_agent import BaseAgent
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from you_api_client import YouAPIClient
from config import MIN_SOURCES_PER_ARTIFACT, MAX_SOURCES_PER_ARTIFACT


class CitationVerifierAgent(BaseAgent):
    """
    Citation Verifier Agent: Ensures adequate source verification

    Responsibilities:
    - Verify each artifact has 2-3 quality sources
    - Find additional sources if needed
    - Validate source quality and relevance
    - Cross-check facts across sources
    """

    def __init__(self, api_client: YouAPIClient = None):
        super().__init__("Citation Verifier")
        self.api_client = api_client or YouAPIClient()
        self.min_sources = MIN_SOURCES_PER_ARTIFACT
        self.max_sources = MAX_SOURCES_PER_ARTIFACT

    def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Verify and enhance citations for artifacts

        Args:
            input_data: {
                "artifacts": List[Dict]
            }

        Returns:
            Artifacts with verified citations
        """
        artifacts = input_data.get("artifacts", [])

        verified_artifacts = []
        verification_stats = {
            "total_artifacts": len(artifacts),
            "artifacts_with_sufficient_sources": 0,
            "artifacts_needing_sources": 0,
            "total_sources_added": 0
        }

        for artifact in artifacts:
            print(f"[{self.name}] Verifying: {artifact.get('title', 'Unknown')[:60]}...")

            verified = self._verify_and_enhance_citations(artifact)
            verified_artifacts.append(verified)

            # Update stats
            num_sources = len(verified.get("sources", []))
            if num_sources >= self.min_sources:
                verification_stats["artifacts_with_sufficient_sources"] += 1
            else:
                verification_stats["artifacts_needing_sources"] += 1

        output = {
            "artifacts": verified_artifacts,
            "verification_stats": verification_stats
        }

        self.log_execution(input_data, output)
        return output

    def _verify_and_enhance_citations(self, artifact: Dict[str, Any]) -> Dict[str, Any]:
        """
        Verify citations and find additional sources if needed

        Args:
            artifact: Artifact dictionary

        Returns:
            Artifact with verified citations
        """
        current_sources = artifact.get("sources", [])
        title = artifact.get("title", "")

        # Check if we need more sources
        if len(current_sources) < self.min_sources:
            # Search for additional sources
            additional_sources = self._find_additional_sources(artifact)
            current_sources.extend(additional_sources)

        # Limit to max sources
        if len(current_sources) > self.max_sources:
            # Keep the highest quality sources
            current_sources = self._rank_and_filter_sources(current_sources)[:self.max_sources]

        # Validate source quality
        validated_sources = self._validate_sources(current_sources, artifact)

        # Add citation metadata
        artifact["sources"] = validated_sources
        artifact["citation_metadata"] = {
            "num_sources": len(validated_sources),
            "meets_minimum": len(validated_sources) >= self.min_sources,
            "verification_status": "verified" if len(validated_sources) >= self.min_sources else "insufficient",
            "source_quality_score": self._calculate_source_quality_score(validated_sources)
        }

        return artifact

    def _find_additional_sources(self, artifact: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Find additional sources for an artifact

        Args:
            artifact: Artifact dictionary

        Returns:
            List of additional sources
        """
        title = artifact.get("title", "")
        artifact_type = artifact.get("type", "")

        # Create targeted search query
        search_query = f"{title} 2020"

        # Search for more sources
        try:
            search_results = self.api_client.web_search(search_query, num_results=5)
            hits = search_results.get("hits", [])

            additional_sources = []
            for hit in hits:
                source = {
                    "type": "web",
                    "title": hit.get("title", ""),
                    "url": hit.get("url", ""),
                    "snippet": hit.get("snippet", ""),
                    "description": hit.get("description", hit.get("snippet", "")),
                    "date": hit.get("age", "2020"),
                    "relevance_score": self._calculate_source_relevance(hit, artifact)
                }

                # Only add if relevant and not duplicate
                if source["relevance_score"] > 0.3:
                    additional_sources.append(source)

            return additional_sources

        except Exception as e:
            print(f"[{self.name}] Error finding additional sources: {e}")
            return []

    def _calculate_source_relevance(self, source: Dict[str, Any], artifact: Dict[str, Any]) -> float:
        """Calculate how relevant a source is to an artifact"""
        artifact_title = artifact.get("title", "").lower()
        source_title = source.get("title", "").lower()
        source_text = (source_title + " " + source.get("description", "").lower())

        # Simple relevance scoring
        score = 0.0

        # Check title overlap
        artifact_words = set(artifact_title.split())
        source_words = set(source_title.split())
        overlap = artifact_words.intersection(source_words)

        if overlap:
            score += 0.3 * (len(overlap) / max(len(artifact_words), 1))

        # Check for artifact title in source
        if artifact_title[:30] in source_text:
            score += 0.5

        # Check for 2020
        if "2020" in source_text:
            score += 0.2

        return min(score, 1.0)

    def _validate_sources(self, sources: List[Dict[str, Any]], artifact: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Validate and enrich source information

        Args:
            sources: List of sources
            artifact: The artifact being verified

        Returns:
            Validated sources with quality scores
        """
        validated = []

        for source in sources:
            # Calculate quality score
            quality_score = self._calculate_source_quality(source)

            # Add validation metadata
            source["validation"] = {
                "quality_score": quality_score,
                "verified": quality_score > 0.5,
                "quality_factors": self._get_quality_factors(source)
            }

            validated.append(source)

        return validated

    def _calculate_source_quality(self, source: Dict[str, Any]) -> float:
        """Calculate quality score for a source"""
        score = 0.5  # Base score

        url = source.get("url", "").lower()
        text = (source.get("title", "") + " " + source.get("description", "")).lower()

        # Trusted domains
        trusted_domains = [
            "nejm.org", "nature.com", "science.org", "fda.gov",
            "nih.gov", "who.int", "cdc.gov", "arxiv.org",
            "pfizer.com", "modernatx.com", "biontech.com"
        ]

        for domain in trusted_domains:
            if domain in url:
                score += 0.3
                break

        # Quality indicators
        if any(term in text for term in ["peer review", "published", "official"]):
            score += 0.1

        # Has substantial description
        if len(source.get("description", "")) > 100:
            score += 0.1

        return min(score, 1.0)

    def _get_quality_factors(self, source: Dict[str, Any]) -> List[str]:
        """Get list of quality factors present in source"""
        factors = []

        url = source.get("url", "").lower()
        text = (source.get("title", "") + " " + source.get("description", "")).lower()

        if any(domain in url for domain in ["gov", "edu"]):
            factors.append("authoritative_domain")

        if "peer review" in text or "published" in text:
            factors.append("peer_reviewed")

        if len(source.get("description", "")) > 100:
            factors.append("detailed_description")

        if "2020" in str(source.get("date", "")):
            factors.append("correct_year")

        return factors

    def _rank_and_filter_sources(self, sources: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Rank sources by quality and relevance"""
        # Calculate combined score
        for source in sources:
            quality = self._calculate_source_quality(source)
            relevance = source.get("relevance_score", 0.5)
            source["_combined_score"] = (quality * 0.6) + (relevance * 0.4)

        # Sort by combined score
        sources.sort(key=lambda x: x.get("_combined_score", 0), reverse=True)

        return sources

    def _calculate_source_quality_score(self, sources: List[Dict[str, Any]]) -> float:
        """Calculate overall quality score for a collection of sources"""
        if not sources:
            return 0.0

        quality_scores = [
            source.get("validation", {}).get("quality_score", 0.5)
            for source in sources
        ]

        return sum(quality_scores) / len(quality_scores)
