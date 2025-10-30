"""
Executive Summary Generator
Generates narrative executive summaries with key patterns and findings
"""

import json
import logging
from typing import Dict, List, Any

from .base_agent import BaseAgent
from you_api_client import YouAPIClient

logger = logging.getLogger(__name__)


class SummaryGeneratorAgent(BaseAgent):
    """
    Generates professional executive summary with:
    - 2-3 paragraph narrative
    - 3-4 key patterns with evidence
    - Value distribution insight
    - Single-sentence key finding
    """

    def __init__(self, api_client=None):
        super().__init__("Summary Generator")
        self.api_client = api_client or YouAPIClient()

    def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate executive summary.

        Args:
            input_data: Dict containing:
                - artifacts: List of enriched artifacts
                - categories: Categorization output
                - query: Original search query
                - year: Target year

        Returns:
            Dict with narrative, key_patterns, value_distribution, key_finding
        """
        artifacts = input_data.get("artifacts", [])
        categories = input_data.get("categories", {})
        query = input_data.get("query", "")
        year = input_data.get("year", 2020)

        logger.info(f"Generating executive summary for: {query}")

        try:
            summary = self._generate_with_api(artifacts, categories, query, year)

            # Validate
            if not self._validate_summary(summary, year):
                logger.warning("Summary failed validation, using fallback")
                summary = self._fallback_summary(artifacts, categories, query, year)

            logger.info("Executive summary generated successfully")

            return summary

        except Exception as e:
            logger.error(f"Summary generation failed: {e}")
            logger.info("Using fallback summary")
            return self._fallback_summary(artifacts, categories, query, year)

    def _generate_with_api(
        self,
        artifacts: List[Dict],
        categories: Dict,
        query: str,
        year: int
    ) -> Dict:
        """Generate summary using Express API."""

        # Prepare inputs
        inputs = self._prepare_summary_inputs(artifacts, categories)

        # Build prompt
        prompt = self._build_summary_prompt(inputs, query, year)

        # Call Express API
        response = self.api_client.express_query(prompt)

        # Parse response
        summary = self._parse_summary_response(response)

        return summary

    def _prepare_summary_inputs(self, artifacts: List[Dict], categories: Dict) -> Dict:
        """Extract key data for summary generation."""

        # Calculate metadata
        total_value = sum(
            art.get("valuation", {}).get("estimated_value", 0)
            for art in artifacts
        )

        avg_confidence = sum(
            art.get("valuation", {}).get("confidence_score", 0)
            for art in artifacts
        ) / len(artifacts) if artifacts else 0

        # Sort artifacts by value and get top 3
        sorted_artifacts = sorted(
            artifacts,
            key=lambda a: a.get("valuation", {}).get("estimated_value", 0),
            reverse=True
        )
        top_3 = sorted_artifacts[:3]

        # Format category summary
        category_list = categories.get("categories", [])
        category_summary = "\n".join([
            f"- {cat['name']} ({cat['artifact_count']} artifacts, ${cat['total_value']:,}): "
            f"{cat['description'][:100]}..."
            for cat in category_list
        ])

        # Format top 3 summary
        top_3_summary = "\n".join([
            f"{i+1}. {art['title']} (${art.get('valuation', {}).get('estimated_value', 0):,}, {art.get('type', 'Unknown')})"
            for i, art in enumerate(top_3)
        ])

        return {
            "artifact_count": len(artifacts),
            "total_value": total_value,
            "avg_confidence": avg_confidence,
            "category_summary": category_summary,
            "top_3_summary": top_3_summary,
            "top_3_artifacts": top_3
        }

    def _build_summary_prompt(self, inputs: Dict, query: str, year: int) -> str:
        """Build executive summary prompt."""

        prompt = f"""You are writing the executive summary for a professional research report.

REPORT CONTEXT:
Query: "{query}"
Year: {year}
Artifacts Analyzed: {inputs['artifact_count']}
Total Value: ${inputs['total_value']:,}
Average Confidence: {inputs['avg_confidence']:.2f}

CATEGORIES IDENTIFIED:
{inputs['category_summary']}

TOP 3 ARTIFACTS:
{inputs['top_3_summary']}

TASK: Write an executive summary with four components:

1. NARRATIVE (2-3 paragraphs, 300-500 words):

   First paragraph: What this collection of artifacts reveals about {query} in {year}.
   - Start with a strong thesis statement
   - Use specific numbers and artifact names
   - Connect to major {year} events/trends (e.g., COVID-19 pandemic, economic shifts)

   Example opening: "In response to the 2020 pandemic, $9.8M in critical healthcare infrastructure emerged across 25 documented artifacts. Three patterns define this moment: regulatory innovation led the response (52% of value), digital health adoption accelerated by a decade in 90 days, and remote workflows became the default for clinical research and patient care."

   Second paragraph: Elaborate on the key patterns, citing specific categories and artifacts.

   Third paragraph (optional): Implications, significance, or forward-looking insight.

2. KEY PATTERNS (3-4 bullet points):
   - Each bullet should be a specific, data-backed observation
   - Format: "[Insight Title]: [Evidence]"
   - Use category names, artifact counts, value figures, temporal patterns

   Examples:
   - "Regulatory Innovation Led (52% of value): Top 5 artifacts are FDA frameworks enabling rapid emergency response, suggesting policy adaptation outpaced technical innovation in crisis."
   - "Q1-Q2 Concentration: 18 of 25 artifacts emerged in first half of 2020, indicating most critical innovations came from immediate crisis response rather than sustained adaptation."

3. VALUE DISTRIBUTION (1-2 sentences):
   - Describe how value concentrates or spreads
   - Call out if top-heavy or evenly distributed
   - Use percentages and absolute figures

   Example: "Value is heavily concentrated: top 3 artifacts represent 26.5% of total ($2.6M of $9.8M), while the bottom 10 average just $180K each. This reflects the gulf between emergency regulatory submissions and standard operational documents."

4. KEY FINDING (1 sentence):
   - The single most important takeaway from the entire report
   - Should be surprising or non-obvious
   - Grounded in the data

   Example: "The 2020 artifact landscape reveals that systemic crisis accelerates policy innovation faster than technical innovation, with regulatory frameworks (not new technologies) representing the highest-value contributions."

STYLE GUIDELINES:
- Professional consulting report tone (McKinsey/BCG style)
- Be specific: use artifact names, numbers, percentages
- Be insightful: reveal patterns, don't just describe data
- Be concise: dense with information, no fluff
- Connect to {year} context: acknowledge major events that shaped this landscape
- Avoid:
  * Generic statements ("This report examines...")
  * Obvious observations ("There are many artifacts...")
  * Hedging language ("It appears that maybe...")
  * Personal pronouns ("We found...", "Our research...")

Return ONLY valid JSON:
{{
    "narrative": "...",
    "key_patterns": ["...", "...", "..."],
    "value_distribution": "...",
    "key_finding": "..."
}}
"""
        return prompt

    def _parse_summary_response(self, response: Dict) -> Dict:
        """Parse Express API response."""

        try:
            answer = response.get("answer", "")
            summary = json.loads(answer)

            required_fields = ["narrative", "key_patterns", "value_distribution", "key_finding"]
            if not all(field in summary for field in required_fields):
                raise ValueError(f"Missing required fields. Expected: {required_fields}")

            return summary

        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Failed to parse summary response: {e}")
            logger.debug(f"Response: {response}")
            raise

    def _validate_summary(self, summary: Dict, year: int) -> bool:
        """Validate executive summary meets quality standards."""

        issues = []

        # Length checks
        narrative = summary.get("narrative", "")
        if len(narrative) < 300:
            issues.append("Narrative too short (< 300 chars)")
        if len(narrative) > 1500:
            issues.append("Narrative too long (> 1500 chars)")

        # Structure checks
        patterns = summary.get("key_patterns", [])
        if len(patterns) < 3:
            issues.append("Too few key patterns (need 3-4)")
        if len(patterns) > 5:
            issues.append("Too many key patterns (keep to 3-4)")

        # Content checks
        narrative_lower = narrative.lower()

        # Should contain specific numbers
        has_numbers = "$" in narrative or "%" in narrative or any(
            str(i) in narrative for i in range(10, 100)
        )
        if not has_numbers:
            issues.append("Narrative lacks specific value figures")

        # Should reference year context
        if str(year) not in narrative and str(year-1) not in narrative:
            issues.append("Narrative doesn't reference temporal context")

        # Generic phrase detection
        generic_phrases = [
            "this report examines",
            "we found that",
            "our research shows",
            "it is important to note"
        ]
        if any(phrase in narrative_lower for phrase in generic_phrases):
            issues.append("Narrative contains generic consulting-speak")

        if issues:
            logger.warning(f"Summary validation issues: {issues}")
            return False

        return True

    def _fallback_summary(
        self,
        artifacts: List[Dict],
        categories: Dict,
        query: str,
        year: int
    ) -> Dict:
        """Generate basic summary if Express API fails."""

        total_value = sum(
            art.get("valuation", {}).get("estimated_value", 0)
            for art in artifacts
        )

        category_list = categories.get("categories", [])
        top_cat = category_list[0] if category_list else {
            "name": "Artifacts",
            "artifact_count": len(artifacts),
            "total_value": total_value
        }

        sorted_artifacts = sorted(
            artifacts,
            key=lambda a: a.get("valuation", {}).get("estimated_value", 0),
            reverse=True
        )
        top_artifact = sorted_artifacts[0] if sorted_artifacts else {
            "title": "Unknown",
            "valuation": {"estimated_value": 0}
        }

        return {
            "narrative": f"This report analyzes {len(artifacts)} artifacts related to {query} from {year}, representing ${total_value:,} in estimated economic value. The artifacts cluster into {len(category_list)} primary categories, with {top_cat['name']} accounting for the largest share ({top_cat['artifact_count']} artifacts, ${top_cat['total_value']:,}). The highest-value individual artifact is {top_artifact['title']} at ${top_artifact.get('valuation', {}).get('estimated_value', 0):,}.",

            "key_patterns": [
                f"{top_cat['name']} dominates with {top_cat['artifact_count']} artifacts",
                f"Total value of ${total_value:,} across {len(artifacts)} artifacts",
                f"Average confidence score of {sum(a.get('valuation', {}).get('confidence_score', 0) for a in artifacts)/len(artifacts):.2f}" if artifacts else "No artifacts to analyze"
            ],

            "value_distribution": f"Top artifact ({top_artifact['title']}) represents {top_artifact.get('valuation', {}).get('estimated_value', 0)/total_value*100:.1f}% of total value." if total_value > 0 else "No value data available.",

            "key_finding": f"{year} artifacts in {query} domain show concentration in {top_cat['name']} category."
        }


# Test function
if __name__ == "__main__":
    # Test with mock data
    mock_artifacts = [
        {
            "title": "FDA EUA Framework",
            "type": "Regulatory Submission",
            "valuation": {"estimated_value": 1000000, "confidence_score": 0.9}
        }
    ]

    mock_categories = {
        "categories": [
            {
                "name": "Regulatory Infrastructure",
                "description": "Emergency response frameworks",
                "artifact_count": 1,
                "total_value": 1000000,
                "artifact_indices": [0]
            }
        ]
    }

    generator = SummaryGeneratorAgent()
    result = generator.execute({
        "artifacts": mock_artifacts,
        "categories": mock_categories,
        "query": "2020 telehealth artifacts",
        "year": 2020
    })

    print(json.dumps(result, indent=2))
