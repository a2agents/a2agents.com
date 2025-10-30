"""
Insights Generator Agent
Generates non-obvious insights revealing patterns in artifact data
"""

import json
import logging
from typing import Dict, List, Any
from difflib import SequenceMatcher
from collections import Counter, defaultdict

from .base_agent import BaseAgent
from you_api_client import YouAPIClient

logger = logging.getLogger(__name__)


class InsightsGeneratorAgent(BaseAgent):
    """
    Generates 3-5 non-obvious insights from artifact data.

    Insight types:
    - temporal: When artifacts emerged (Q1 vs Q2 clustering)
    - concentration: Value distribution patterns
    - producer: Who creates these artifacts
    - thematic: Unexpected relationships between categories
    - anomaly: Outliers or surprising gaps
    """

    def __init__(self, api_client=None):
        super().__init__("Insights Generator")
        self.api_client = api_client or YouAPIClient()

    def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate non-obvious insights.

        Args:
            input_data: Dict containing:
                - artifacts: List of enriched artifacts
                - categories: Categorization output
                - executive_summary: Executive summary to avoid duplication
                - query: Original search query
                - year: Target year

        Returns:
            Dict with insights array
        """
        artifacts = input_data.get("artifacts", [])
        categories = input_data.get("categories", {})
        executive_summary = input_data.get("executive_summary", {})
        query = input_data.get("query", "")
        year = input_data.get("year", 2020)

        logger.info(f"Generating insights for: {query}")

        try:
            insights = self._generate_with_api(artifacts, categories, executive_summary, query, year)

            # Deduplicate vs exec summary
            insights = self._deduplicate_insights(insights, executive_summary)

            # Score quality
            scored_insights = []
            for insight in insights.get("insights", []):
                score = self._score_insight_quality(insight, artifacts)
                insight["quality_score"] = score
                scored_insights.append(insight)

            # Keep only high-quality insights
            high_quality = [i for i in scored_insights if i["quality_score"] >= 0.5]

            if len(high_quality) < 3:
                logger.warning(f"Only {len(high_quality)} high-quality insights, using fallback")
                return self._fallback_insights(artifacts, categories, query, year)

            logger.info(f"Generated {len(high_quality)} high-quality insights")

            return {"insights": high_quality}

        except Exception as e:
            logger.error(f"Insights generation failed: {e}")
            logger.info("Using fallback insights")
            return self._fallback_insights(artifacts, categories, query, year)

    def _generate_with_api(
        self,
        artifacts: List[Dict],
        categories: Dict,
        executive_summary: Dict,
        query: str,
        year: int
    ) -> Dict:
        """Generate insights using Express API."""

        # Prepare data summary
        data_summary = self._prepare_artifact_data_for_insights(artifacts)

        # Format categories
        category_list = categories.get("categories", [])
        category_summary = "\n".join([
            f"- {cat['name']}: {cat['artifact_count']} artifacts, ${cat['total_value']:,}"
            for cat in category_list
        ])

        # Build prompt
        prompt = self._build_insights_prompt(
            data_summary,
            category_summary,
            query,
            year,
            len(artifacts)
        )

        # Call Express API
        response = self.api_client.express_query(prompt)

        # Parse response
        insights = self._parse_insights_response(response)

        return insights

    def _prepare_artifact_data_for_insights(self, artifacts: List[Dict]) -> str:
        """Create focused data summary highlighting patterns."""

        # Value analysis
        sorted_by_value = sorted(
            artifacts,
            key=lambda a: a.get("valuation", {}).get("estimated_value", 0),
            reverse=True
        )
        top_5_value = sum(
            a.get("valuation", {}).get("estimated_value", 0)
            for a in sorted_by_value[:5]
        )
        total_value = sum(
            a.get("valuation", {}).get("estimated_value", 0)
            for a in artifacts
        )

        # Type distribution
        type_counts = Counter(a.get("type", "Unknown") for a in artifacts)

        # Build summary
        summary = f"""
VALUE DISTRIBUTION:
- Top 5 artifacts: ${top_5_value:,} ({top_5_value/total_value*100:.1f}% of total)
- Bottom 5 artifacts: ${sum(a.get('valuation', {}).get('estimated_value', 0) for a in sorted_by_value[-5:]):,}
- Value range: ${sorted_by_value[-1].get('valuation', {}).get('estimated_value', 0):,} to ${sorted_by_value[0].get('valuation', {}).get('estimated_value', 0):,}

TYPE DISTRIBUTION:
"""
        for artifact_type, count in type_counts.most_common(5):
            summary += f"- {artifact_type}: {count} artifacts\n"

        summary += f"""
TOP 5 ARTIFACTS BY VALUE:
"""
        for i, art in enumerate(sorted_by_value[:5], 1):
            summary += f"{i}. {art['title']} - ${art.get('valuation', {}).get('estimated_value', 0):,} ({art.get('type', 'Unknown')})\n"

        return summary

    def _build_insights_prompt(
        self,
        data_summary: str,
        category_summary: str,
        query: str,
        year: int,
        artifact_count: int
    ) -> str:
        """Build insights prompt."""

        prompt = f"""You are a research analyst identifying non-obvious patterns in artifact data.

DATA:
Query: {query}
Year: {year}
Artifacts: {artifact_count}

{data_summary}

CATEGORIES:
{category_summary}

TASK: Generate 3-5 insights that reveal non-obvious patterns.

INSIGHT TYPES TO LOOK FOR:

1. TEMPORAL PATTERNS:
   - When did artifacts emerge? (Q1 vs Q2 vs Q3 vs Q4)
   - Early response vs sustained adaptation
   - Clustering around specific events or dates

   Example: "Q1-Q2 Crisis Response: 18 of 25 artifacts (72%) emerged in the first half of 2020, with 11 appearing in March-April alone. This suggests the most critical innovations came from immediate crisis response rather than sustained, long-term adaptation."

2. VALUE CONCENTRATION:
   - How is value distributed?
   - Do specific artifact types dominate?
   - Relationship between artifact count and total value

   Example: "High-Value Regulatory Bias: While regulatory submissions represent only 28% of artifacts (7 of 25), they account for 63% of total value ($6.2M of $9.8M). Each regulatory artifact averages $885K vs $180K for operational documents."

3. PRODUCER PATTERNS:
   - What types of organizations create these artifacts?
   - Concentration among specific producers
   - Public vs private sector patterns

   Example: "Federal Agency Concentration: 60% of top-10 artifacts originated from three federal agencies (FDA, CDC, CMS), revealing centralized government response to distributed crisis rather than bottom-up innovation."

4. THEMATIC CONNECTIONS:
   - Unexpected relationships between categories
   - Artifacts that bridge multiple domains
   - Surprising absences or gaps

   Example: "Digital-Physical Convergence: 14 artifacts explicitly address merging digital tools with physical workflows (telemedicine visits, remote trials, virtual audits), suggesting 2020's primary innovation was workflow adaptation, not new technology."

5. ANOMALIES:
   - Outliers in value, timing, or type
   - Artifacts that don't fit expected patterns
   - Surprising gaps (what's NOT present)

   Example: "Consumer Technology Absence: Despite major shifts in consumer behavior, only 2 of 25 artifacts directly address consumer-facing products. The dominance of B2B/institutional artifacts suggests professional infrastructure adaptation, not consumer innovation, defined 2020."

GUIDELINES:

- Each insight must be:
  * NON-OBVIOUS (not just restating a category)
  * DATA-BACKED (cite specific numbers, percentages, artifact names)
  * REVEALING (answers "so what?" or "why does this matter?")

- Avoid generic insights like:
  * "Healthcare was important in 2020" (too obvious)
  * "There are many different types of artifacts" (not insightful)
  * "Technology played a role" (too vague)

- Format each insight:
  * Title: 3-6 words, specific and intriguing
  * Insight: 2-4 sentences with data evidence, ending with interpretation
  * Type: temporal, concentration, producer, thematic, or anomaly

Return ONLY valid JSON:
{{
    "insights": [
        {{
            "title": "Q1-Q2 Crisis Response",
            "insight": "18 of 25 artifacts (72%) emerged...",
            "insight_type": "temporal"
        }},
        ...
    ]
}}
"""
        return prompt

    def _parse_insights_response(self, response: Dict) -> Dict:
        """Parse Express API response."""

        try:
            answer = response.get("answer", "")
            insights = json.loads(answer)

            if "insights" not in insights:
                raise ValueError("Response missing 'insights' field")

            return insights

        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Failed to parse insights response: {e}")
            logger.debug(f"Response: {response}")
            raise

    def _deduplicate_insights(self, insights: Dict, executive_summary: Dict) -> Dict:
        """Remove insights that duplicate executive summary key patterns."""

        exec_patterns = executive_summary.get("key_patterns", [])
        if not exec_patterns:
            return insights

        filtered_insights = []

        for insight in insights.get("insights", []):
            insight_text = insight.get("insight", "").lower()

            # Check similarity to each exec pattern
            is_duplicate = False
            for pattern in exec_patterns:
                similarity = SequenceMatcher(
                    None,
                    insight_text,
                    pattern.lower()
                ).ratio()

                if similarity > 0.6:  # 60% similar = likely duplicate
                    logger.info(f"Filtering duplicate insight: {insight.get('title')}")
                    is_duplicate = True
                    break

            if not is_duplicate:
                filtered_insights.append(insight)

        return {"insights": filtered_insights}

    def _score_insight_quality(self, insight: Dict, artifacts: List[Dict]) -> float:
        """Score insight from 0-1 based on quality criteria."""

        score = 0.5  # baseline

        text = insight.get("insight", "").lower()

        # Bonus for specificity
        if "%" in insight.get("insight", ""):
            score += 0.2
        if "$" in insight.get("insight", ""):
            score += 0.1
        if any(str(n) in insight.get("insight", "") for n in range(10, 100)):
            score += 0.1

        # Bonus for interpretation
        interpretation_words = ["suggests", "reveals", "indicates", "demonstrates", "implies"]
        if any(word in text for word in interpretation_words):
            score += 0.15

        # Penalty for generic language
        generic_phrases = ["important", "significant", "various", "many", "several"]
        if sum(1 for phrase in generic_phrases if phrase in text) > 2:
            score -= 0.2

        # Bonus for specific artifact names
        artifact_names = [a.get("title", "")[:20].lower() for a in artifacts]
        if any(name in text for name in artifact_names if name):
            score += 0.1

        return max(0.0, min(1.0, score))

    def _fallback_insights(
        self,
        artifacts: List[Dict],
        categories: Dict,
        query: str,
        year: int
    ) -> Dict:
        """Generate basic insights if Express API fails."""

        sorted_by_value = sorted(
            artifacts,
            key=lambda a: a.get("valuation", {}).get("estimated_value", 0),
            reverse=True
        )
        total_value = sum(
            a.get("valuation", {}).get("estimated_value", 0)
            for a in artifacts
        )
        top_5_value = sum(
            a.get("valuation", {}).get("estimated_value", 0)
            for a in sorted_by_value[:5]
        )

        type_counts = Counter(a.get("type", "Unknown") for a in artifacts)
        top_type = type_counts.most_common(1)[0] if type_counts else ("Unknown", 0)

        category_list = categories.get("categories", [])
        top_cat = category_list[0] if category_list else {
            "name": "Artifacts",
            "artifact_count": len(artifacts),
            "total_value": total_value
        }

        return {
            "insights": [
                {
                    "title": "Value Concentration in Top 5",
                    "insight": f"The top 5 artifacts represent ${top_5_value:,}, or {top_5_value/total_value*100:.1f}% of total value. This concentration suggests a small number of high-stakes artifacts dominate the landscape.",
                    "insight_type": "concentration",
                    "quality_score": 0.6
                },
                {
                    "title": f"{top_type[0]} Dominance",
                    "insight": f"{top_type[0]} artifacts are most common ({top_type[1]} of {len(artifacts)}, {top_type[1]/len(artifacts)*100:.1f}%), indicating this artifact type was central to {query} in {year}.",
                    "insight_type": "thematic",
                    "quality_score": 0.5
                },
                {
                    "title": f"{top_cat['name']} Leadership",
                    "insight": f"The {top_cat['name']} category contains {top_cat['artifact_count']} artifacts worth ${top_cat['total_value']:,}, making it the dominant category by both count and value.",
                    "insight_type": "concentration",
                    "quality_score": 0.5
                }
            ]
        }


# Test function
if __name__ == "__main__":
    # Test with mock data
    mock_artifacts = [
        {
            "title": "FDA EUA Framework",
            "type": "Regulatory Submission",
            "valuation": {"estimated_value": 1000000, "confidence_score": 0.9}
        },
        {
            "title": "Telehealth Guidelines",
            "type": "Policy Document",
            "valuation": {"estimated_value": 500000, "confidence_score": 0.8}
        }
    ]

    mock_categories = {
        "categories": [
            {
                "name": "Regulatory Infrastructure",
                "artifact_count": 2,
                "total_value": 1500000
            }
        ]
    }

    mock_exec_summary = {
        "key_patterns": [
            "Regulatory frameworks dominated the response"
        ]
    }

    generator = InsightsGeneratorAgent()
    result = generator.execute({
        "artifacts": mock_artifacts,
        "categories": mock_categories,
        "executive_summary": mock_exec_summary,
        "query": "2020 telehealth artifacts",
        "year": 2020
    })

    print(json.dumps(result, indent=2))
