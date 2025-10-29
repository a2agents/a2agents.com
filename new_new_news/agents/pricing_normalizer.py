"""
Pricing Normalizer Agent - Handles data scarcity for 2020 valuations
"""

from typing import Dict, Any, List
from .base_agent import BaseAgent
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from you_api_client import YouAPIClient


class PricingNormalizerAgent(BaseAgent):
    """
    Pricing Normalizer Agent: Estimates professional value for artifacts

    Responsibilities:
    - Estimate professional value/impact of artifacts
    - Handle data scarcity for 2020 valuations
    - Use multiple factors: citations, reach, impact, uniqueness
    - Provide confidence scores for valuations
    """

    def __init__(self, api_client: YouAPIClient = None):
        super().__init__("Pricing Normalizer")
        self.api_client = api_client or YouAPIClient()

        # Base valuation ranges by artifact type (in USD)
        self.base_valuations = {
            "Research Paper": (50000, 500000),
            "Clinical Trial Data": (100000, 1000000),
            "Regulatory Submission": (200000, 2000000),
            "Software Release": (50000, 500000),
            "Policy Document": (100000, 1000000),
            "Technical Specification": (50000, 300000),
            "Dataset": (100000, 800000),
            "Patent": (500000, 5000000),
            "Default": (25000, 250000)
        }

    def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Estimate valuations for artifacts

        Args:
            input_data: {
                "artifacts": List[Dict],
                "use_llm_enhancement": bool
            }

        Returns:
            Artifacts with valuation estimates
        """
        artifacts = input_data.get("artifacts", [])
        use_llm = input_data.get("use_llm_enhancement", True)

        valued_artifacts = []

        for artifact in artifacts:
            print(f"[{self.name}] Valuing: {artifact.get('title', 'Unknown')[:60]}...")

            # Calculate base valuation
            valuation = self._calculate_valuation(artifact)

            # Enhance with LLM if requested
            if use_llm:
                llm_enhancement = self._get_llm_valuation_context(artifact)
                valuation["llm_context"] = llm_enhancement

            artifact["valuation"] = valuation
            valued_artifacts.append(artifact)

        output = {
            "artifacts": valued_artifacts,
            "total_estimated_value": sum(a["valuation"]["estimated_value"] for a in valued_artifacts),
            "average_confidence": sum(a["valuation"]["confidence_score"] for a in valued_artifacts) / len(valued_artifacts) if valued_artifacts else 0
        }

        self.log_execution(input_data, output)
        return output

    def _calculate_valuation(self, artifact: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate valuation for an artifact using multiple factors

        Args:
            artifact: Artifact dictionary

        Returns:
            Valuation dictionary with estimate and confidence score
        """
        artifact_type = artifact.get("type", "Default")
        base_min, base_max = self.base_valuations.get(artifact_type, self.base_valuations["Default"])

        # Scoring factors (0.0 to 1.0)
        factors = {
            "relevance": artifact.get("relevance_score", 0.5),
            "source_quality": self._assess_source_quality(artifact),
            "impact_indicators": self._assess_impact_indicators(artifact),
            "uniqueness": self._assess_uniqueness(artifact),
            "timeliness": self._assess_timeliness(artifact)
        }

        # Calculate weighted score
        weights = {
            "relevance": 0.25,
            "source_quality": 0.25,
            "impact_indicators": 0.25,
            "uniqueness": 0.15,
            "timeliness": 0.10
        }

        composite_score = sum(factors[k] * weights[k] for k in factors)

        # Calculate estimated value
        value_range = base_max - base_min
        estimated_value = base_min + (value_range * composite_score)

        # Calculate confidence score
        confidence_score = self._calculate_confidence(artifact, factors)

        return {
            "estimated_value": int(estimated_value),
            "value_range": {
                "min": int(base_min * 0.8),
                "max": int(base_max * 1.2)
            },
            "confidence_score": round(confidence_score, 2),
            "factors": factors,
            "methodology": "Multi-factor analysis with LLM enhancement"
        }

    def _assess_source_quality(self, artifact: Dict[str, Any]) -> float:
        """Assess the quality of sources citing this artifact"""
        sources = artifact.get("sources", [])
        if not sources:
            return 0.3

        quality_score = 0.0
        high_quality_domains = [
            "nejm.org", "nature.com", "science.org", "fda.gov",
            "nih.gov", "who.int", "cdc.gov", "arxiv.org"
        ]

        for source in sources:
            url = source.get("url", "").lower()

            # Check for high-quality domains
            if any(domain in url for domain in high_quality_domains):
                quality_score += 0.4

            # Check for peer review indicators
            text = (source.get("title", "") + " " + source.get("description", "")).lower()
            if any(term in text for term in ["peer review", "published", "journal"]):
                quality_score += 0.2

        return min(quality_score / len(sources), 1.0)

    def _assess_impact_indicators(self, artifact: Dict[str, Any]) -> float:
        """Assess impact indicators from description and sources"""
        title = artifact.get("title", "").lower()
        description = artifact.get("description", "").lower()
        text = title + " " + description

        impact_score = 0.0

        # High-impact keywords
        high_impact_terms = [
            "breakthrough", "first", "novel", "pioneering", "groundbreaking",
            "efficacy", "approved", "authorized", "landmark", "milestone"
        ]

        for term in high_impact_terms:
            if term in text:
                impact_score += 0.15

        # Quantitative indicators
        if any(str(num) + "%" in text for num in range(85, 100)):
            impact_score += 0.2  # High efficacy rates

        return min(impact_score, 1.0)

    def _assess_uniqueness(self, artifact: Dict[str, Any]) -> float:
        """Assess how unique/novel this artifact is"""
        title = artifact.get("title", "").lower()
        artifact_type = artifact.get("type", "")

        uniqueness_score = 0.5  # Default

        # Indicators of uniqueness
        if any(term in title for term in ["first", "novel", "new", "pioneering"]):
            uniqueness_score += 0.3

        # Regulatory submissions and patents are typically unique
        if artifact_type in ["Regulatory Submission", "Patent"]:
            uniqueness_score += 0.2

        return min(uniqueness_score, 1.0)

    def _assess_timeliness(self, artifact: Dict[str, Any]) -> float:
        """Assess timeliness - artifacts from 2020 in context of pandemic"""
        date_str = str(artifact.get("date", ""))

        # 2020 artifacts are highly valuable in pandemic context
        if "2020" in date_str:
            return 0.9
        elif "2021" in date_str:
            return 0.6
        else:
            return 0.3

    def _calculate_confidence(self, artifact: Dict[str, Any], factors: Dict[str, float]) -> float:
        """Calculate confidence score for the valuation"""
        num_sources = len(artifact.get("sources", []))

        # Base confidence on number of sources
        source_confidence = min(num_sources / 3.0, 1.0)

        # Factor in the reliability of the factors
        factor_confidence = sum(factors.values()) / len(factors)

        # Combined confidence
        confidence = (source_confidence * 0.6) + (factor_confidence * 0.4)

        return confidence

    def _get_llm_valuation_context(self, artifact: Dict[str, Any]) -> str:
        """Use LLM to get additional context for valuation"""
        title = artifact.get("title", "")
        artifact_type = artifact.get("type", "")

        query = f"What is the professional value and impact of this 2020 {artifact_type}: {title}? Consider research impact, citations, and industry influence."

        try:
            result = self.api_client.rag_query(query)
            return result.get("answer", "")[:500]  # Limit context length
        except Exception as e:
            return f"LLM enhancement unavailable: {e}"
