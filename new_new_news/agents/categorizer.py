"""
Categorization Agent
Groups artifacts into 3-5 meaningful categories using Express API
"""

import json
import logging
from typing import Dict, List, Any
from collections import defaultdict

from .base_agent import BaseAgent
from you_api_client import YouAPIClient

logger = logging.getLogger(__name__)


class CategorizerAgent(BaseAgent):
    """
    Groups artifacts into meaningful categories that reveal patterns.

    Avoids generic groupings like "Technology" or "Documents".
    Creates domain-specific, insightful categories.
    """

    def __init__(self, api_client=None):
        super().__init__("Categorizer")
        self.api_client = api_client or YouAPIClient()

    def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Categorize artifacts into meaningful groups.

        Args:
            input_data: Dict containing:
                - artifacts: List of enriched artifact dicts
                - query: Original search query
                - year: Target year

        Returns:
            Dict with categories array
        """
        artifacts = input_data.get("artifacts", [])
        query = input_data.get("query", "")
        year = input_data.get("year", 2020)

        logger.info(f"Categorizing {len(artifacts)} artifacts for query: {query}")

        try:
            categorization = self._categorize_with_api(artifacts, query, year)

            # Validate and enrich
            categorization = self._validate_and_enrich_categories(categorization, artifacts)

            # Score quality
            quality_score = self._score_categorization_quality(categorization, artifacts)

            logger.info(f"Categorization complete: {len(categorization['categories'])} categories (quality: {quality_score:.2f})")

            return {
                "categories": categorization["categories"],
                "metadata": {
                    "category_count": len(categorization["categories"]),
                    "quality_score": quality_score
                }
            }

        except Exception as e:
            logger.error(f"Categorization failed: {e}")
            logger.info("Using fallback categorization")
            return self._fallback_categorization(artifacts)

    def _categorize_with_api(self, artifacts: List[Dict], query: str, year: int) -> Dict:
        """Use Express API to categorize artifacts."""

        # Build prompt
        prompt = self._build_categorization_prompt(artifacts, query, year)

        # Call Express API
        response = self.api_client.express_query(prompt)

        # Parse response
        categorization = self._parse_categorization_response(response)

        return categorization

    def _build_categorization_prompt(self, artifacts: List[Dict], query: str, year: int) -> str:
        """Build categorization prompt."""

        # Format artifact summaries
        artifact_summaries = self._format_artifacts_for_categorization(artifacts)

        prompt = f"""You are a research analyst organizing artifacts for a professional report.

Given these {len(artifacts)} artifacts about "{query}":

{artifact_summaries}

Task: Group these artifacts into 3-5 meaningful categories that reveal patterns and insights.

Guidelines:

1. CATEGORY NAMING:
   - Use specific, domain-relevant names (not generic like "Documents" or "Reports")
   - Categories should reveal something about the topic
   - Examples of good names:
     * "Regulatory Infrastructure" (not "Government Documents")
     * "Crisis Response Frameworks" (not "Policy Documents")
     * "Digital Transformation Enablers" (not "Technology")

2. CATEGORY SELECTION:
   - Look for natural clusters by:
     * Domain (healthcare vs tech vs finance)
     * Function (regulatory vs operational vs strategic)
     * Lifecycle stage (planning vs execution vs assessment)
     * Stakeholder (government vs enterprise vs consumer)
   - Aim for 3-5 categories (fewer if artifacts are homogeneous, more if diverse)
   - Each category should have at least 2 artifacts
   - Balance category sizes when possible (avoid 1 category with 20 items, others with 1-2)

3. CATEGORY DESCRIPTIONS (2-3 sentences each):
   - Explain why this category matters in the context of {query}
   - Mention the total value or artifact count to show scale
   - Connect to broader trends or significance in {year}

   Example: "Regulatory frameworks that enabled emergency response during 2020 pandemic. These 8 artifacts ($4.2M total value) represent the policy infrastructure that compressed decade-long approval timelines into months, enabling vaccines and digital health tools to reach populations at unprecedented speed."

4. AVOID:
   - Generic categories like "Technology", "Reports", "Documents"
   - Categories based solely on artifact type (all "Research Papers" in one group)
   - Single-artifact categories (unless there's one clear outlier)
   - Overlapping categories (artifact should only fit in one)

5. ORDERING:
   - Rank categories by total value (highest first)
   - This puts the most significant findings at the top of the report

Return ONLY valid JSON:
{{
    "categories": [
        {{
            "name": "Category Name",
            "description": "Why this category matters...",
            "artifact_indices": [0, 3, 7, 12],
            "reasoning": "Brief explanation of why these artifacts cluster together"
        }},
        ...
    ]
}}

CRITICAL: Every artifact index (0-{len(artifacts)-1}) must appear in exactly one category.
"""
        return prompt

    def _format_artifacts_for_categorization(self, artifacts: List[Dict]) -> str:
        """Create concise artifact summaries for categorization prompt."""

        summaries = []
        for i, artifact in enumerate(artifacts):
            title = artifact.get("title", "Unknown")
            artifact_type = artifact.get("type", "Unknown")
            value = artifact.get("valuation", {}).get("estimated_value", 0)
            description = artifact.get("description", "")[:150]

            summary = f"""[{i}] {title}
    Type: {artifact_type}
    Value: ${value:,}
    Description: {description}..."""
            summaries.append(summary)

        return "\n\n".join(summaries)

    def _parse_categorization_response(self, response: Dict) -> Dict:
        """Parse Express API response."""

        try:
            answer = response.get("answer", "")

            # Handle empty response
            if not answer or not answer.strip():
                raise ValueError("Empty response from Express API")

            categorization = json.loads(answer)

            if "categories" not in categorization:
                raise ValueError("Response missing 'categories' field")

            return categorization

        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Failed to parse categorization response: {e}")
            logger.debug(f"Response: {response}")
            raise

    def _validate_and_enrich_categories(self, categorization: Dict, artifacts: List[Dict]) -> Dict:
        """
        Validate categorization and add computed fields.

        Validations:
        - Every artifact index appears exactly once
        - All indices are valid
        - Each category has at least 1 artifact

        Enrichments:
        - Calculate total_value for each category
        - Calculate artifact_count for each category
        - Sort categories by total_value descending
        """

        # Validation
        all_indices = []
        for cat in categorization["categories"]:
            all_indices.extend(cat.get("artifact_indices", []))

        # Check all artifacts assigned
        if len(all_indices) != len(artifacts):
            raise ValueError(f"Not all artifacts categorized: {len(all_indices)} assigned, {len(artifacts)} total")

        # Check no duplicates
        if len(set(all_indices)) != len(all_indices):
            raise ValueError("Duplicate artifact assignments detected")

        # Check valid indices
        if not all(0 <= i < len(artifacts) for i in all_indices):
            raise ValueError("Invalid artifact index detected")

        # Enrichment
        for cat in categorization["categories"]:
            indices = cat.get("artifact_indices", [])

            # Calculate total value
            cat["total_value"] = sum(
                artifacts[i].get("valuation", {}).get("estimated_value", 0)
                for i in indices
            )

            # Calculate count
            cat["artifact_count"] = len(indices)

        # Sort by value (descending)
        categorization["categories"].sort(
            key=lambda c: c.get("total_value", 0),
            reverse=True
        )

        return categorization

    def _score_categorization_quality(self, categorization: Dict, artifacts: List[Dict]) -> float:
        """
        Score categorization quality from 0-1.

        Factors:
        - Category balance (avoid 1 giant category)
        - Naming specificity (penalize generic names)
        - Value distribution clarity
        """
        score = 1.0

        categories = categorization.get("categories", [])

        # Penalize imbalanced categories
        counts = [c.get("artifact_count", 0) for c in categories]
        if counts:
            max_count, min_count = max(counts), min(counts)
            if min_count > 0 and max_count > 3 * min_count:
                score -= 0.2

        # Penalize generic category names
        generic_terms = ["general", "other", "miscellaneous", "documents", "reports", "various"]
        for cat in categories:
            name = cat.get("name", "").lower()
            if any(term in name for term in generic_terms):
                score -= 0.15

        # Reward clear value distribution
        values = [c.get("total_value", 0) for c in categories]
        if values and sum(values) > 0:
            top_value = values[0]
            total_value = sum(values)
            if top_value > total_value * 0.5:  # Top category > 50% of total
                score += 0.1  # This is often insightful

        return max(0.0, min(1.0, score))

    def _fallback_categorization(self, artifacts: List[Dict]) -> Dict:
        """
        Simple categorization if Express API fails.
        Group by artifact type, limit to top 5 types by value.
        """

        logger.info("Using fallback categorization (group by type)")

        type_groups = defaultdict(list)
        for i, artifact in enumerate(artifacts):
            artifact_type = artifact.get("type", "Unknown")
            type_groups[artifact_type].append(i)

        # Sort types by total value
        type_values = {
            t: sum(
                artifacts[i].get("valuation", {}).get("estimated_value", 0)
                for i in indices
            )
            for t, indices in type_groups.items()
        }
        top_types = sorted(type_values.items(), key=lambda x: x[1], reverse=True)[:5]

        categories = []
        for artifact_type, total_value in top_types:
            indices = type_groups[artifact_type]
            categories.append({
                "name": f"{artifact_type}s",
                "description": f"Collection of {artifact_type} artifacts from the research.",
                "artifact_indices": indices,
                "total_value": total_value,
                "artifact_count": len(indices),
                "reasoning": "Grouped by artifact type (fallback categorization)"
            })

        return {
            "categories": categories,
            "metadata": {
                "category_count": len(categories),
                "quality_score": 0.5,  # Fallback gets medium score
                "is_fallback": True
            }
        }


# Test function
if __name__ == "__main__":
    # Test with mock artifacts
    mock_artifacts = [
        {
            "title": "FDA EUA Framework",
            "type": "Regulatory Submission",
            "description": "Emergency use authorization framework for medical products",
            "valuation": {"estimated_value": 1000000}
        },
        {
            "title": "Telehealth Policy Guidelines",
            "type": "Policy Document",
            "description": "Guidelines for telehealth implementation during pandemic",
            "valuation": {"estimated_value": 500000}
        },
        {
            "title": "Remote Patient Monitoring Study",
            "type": "Research Paper",
            "description": "Clinical study on RPM effectiveness",
            "valuation": {"estimated_value": 300000}
        }
    ]

    categorizer = CategorizerAgent()
    result = categorizer.execute({
        "artifacts": mock_artifacts,
        "query": "2020 telehealth artifacts",
        "year": 2020
    })

    print(json.dumps(result, indent=2))
