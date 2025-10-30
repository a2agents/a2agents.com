"""
Artifact Enrichment Agent
Enriches artifacts with detailed 4-field profiles using Express API
"""

import json
import logging
from typing import Dict, List, Any, Optional

from .base_agent import BaseAgent

logger = logging.getLogger(__name__)


class ArtifactEnricherAgent(BaseAgent):
    """
    Enriches artifacts with professional profiles:
    - Description: What it is and what it contains
    - Producer Teams: Who creates these artifacts
    - Client Context: Who commissions/uses them and why
    - Significance: Why it mattered in the target year
    """

    def __init__(self, api_client=None):
        super().__init__("Artifact Enricher")
        from you_api_client import YouAPIClient
        self.api_client = api_client or YouAPIClient()

    def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enrich artifacts with detailed profiles.

        Args:
            input_data: Dict containing:
                - artifacts: List of artifact dicts
                - year: Target year (for significance context)
                - batch_size: Artifacts per API call (default: 5)

        Returns:
            Dict with enriched_artifacts list
        """
        artifacts = input_data.get("artifacts", [])
        year = input_data.get("year", 2020)
        batch_size = input_data.get("batch_size", 5)

        logger.info(f"Enriching {len(artifacts)} artifacts in batches of {batch_size}")

        enriched = []

        for i in range(0, len(artifacts), batch_size):
            batch = artifacts[i:i+batch_size]

            logger.info(f"Processing batch {i//batch_size + 1}/{(len(artifacts)-1)//batch_size + 1}")

            try:
                enriched_batch = self._enrich_batch(batch, year)
                enriched.extend(enriched_batch)
            except Exception as e:
                logger.error(f"Batch enrichment failed: {e}")
                # Use fallback for this batch
                enriched.extend([self._fallback_profile(art, year) for art in batch])

        return {
            "enriched_artifacts": enriched,
            "metadata": {
                "total_enriched": len(enriched),
                "fallback_count": sum(1 for a in enriched if a.get("enrichment_fallback", False))
            }
        }

    def _enrich_batch(self, batch: List[Dict], year: int) -> List[Dict]:
        """Enrich a batch of artifacts using single API call."""

        # Build prompt
        prompt = self._build_batch_enrichment_prompt(batch, year)

        # Call Express API
        response = self.api_client.express_query(prompt)

        # Parse response
        profiles = self._parse_batch_response(response, len(batch))

        # Validate and merge
        enriched = []
        for artifact, profile in zip(batch, profiles):
            if self._validate_profile(profile):
                enriched.append({**artifact, **profile})
            else:
                logger.warning(f"Invalid profile for {artifact.get('title', 'Unknown')}, using fallback")
                enriched.append(self._fallback_profile(artifact, year))

        return enriched

    def _build_batch_enrichment_prompt(self, batch: List[Dict], year: int) -> str:
        """Build enrichment prompt for batch of artifacts."""

        # Format artifact data
        artifacts_data = ""
        for i, artifact in enumerate(batch):
            title = artifact.get("title", "Unknown")
            artifact_type = artifact.get("type", "Unknown")
            content_summary = artifact.get("description", artifact.get("content_summary", "No content available"))[:500]
            value = artifact.get("valuation", {}).get("estimated_value", 0)

            artifacts_data += f"""
[{i}] {title}
Type: {artifact_type}
Value: ${value:,}
Content: {content_summary}

"""

        prompt = f"""You are a professional research analyst writing artifact profiles for a consulting report.

You will enrich {len(batch)} artifacts. For each, generate a structured profile with four components.

ARTIFACTS TO ENRICH:

{artifacts_data}

For each artifact, generate:

1. DESCRIPTION (2-3 sentences, 150-300 characters):
   - What this artifact actually is
   - What it contains or documents
   - Its role in professional workflows
   - Be specific and concrete, not generic

   Bad: "A document that provides information about healthcare policy."
   Good: "California DHCS policy paper analyzing telehealth regulations post-COVID, proposing permanent expansion of remote care coverage for Medicare/Medicaid populations."

2. PRODUCER_TEAMS (1-2 sentences, 100-200 characters):
   - What type of organizations create this artifact
   - Professional roles involved (e.g., "regulatory affairs teams", "CROs", "law firms")
   - Do NOT name specific companies unless they're in the source data

3. CLIENT_CONTEXT (1-2 sentences, 100-200 characters):
   - Who commissions or uses this artifact
   - Why they need it (regulatory requirement, strategic decision, compliance, etc.)
   - The stakes or value at risk

4. SIGNIFICANCE (1-2 sentences, 100-200 characters):
   - Why this artifact mattered in {year}
   - Impact, scale, or precedent it set
   - Connection to major events (e.g., COVID-19, elections, economic shifts)
   - Use specific numbers if available

Guidelines:
- Be factual and grounded in the source content
- Use professional consulting report tone
- Avoid hyperbole or marketing language
- If information is missing, write "Details not available in source data" rather than speculating
- Use specific terminology from the source domain (medical, legal, technical)

Return ONLY a JSON array with {len(batch)} objects:
[
    {{
        "artifact_index": 0,
        "description": "...",
        "producer_teams": "...",
        "client_context": "...",
        "significance": "..."
    }},
    ...
]
"""
        return prompt

    def _parse_batch_response(self, response: Dict, expected_count: int) -> List[Dict]:
        """Parse Express API response into list of profiles."""

        try:
            # Response format: {"answer": "...", "confidence": ...}
            answer = response.get("answer", "")

            # Try to extract JSON array
            profiles_data = json.loads(answer)

            if not isinstance(profiles_data, list):
                raise ValueError("Response is not a JSON array")

            if len(profiles_data) != expected_count:
                logger.warning(f"Expected {expected_count} profiles, got {len(profiles_data)}")

            return profiles_data

        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Failed to parse batch response: {e}")
            logger.debug(f"Response: {response}")
            raise

    def _validate_profile(self, profile: Dict) -> bool:
        """Validate profile meets quality standards."""

        required_fields = ["description", "producer_teams", "client_context", "significance"]

        # Check all fields present and non-empty
        for field in required_fields:
            if field not in profile or not profile[field] or len(profile[field]) < 30:
                return False

        # Check reasonable lengths
        if len(profile["description"]) > 500:
            return False
        if len(profile["producer_teams"]) > 400:
            return False
        if len(profile["client_context"]) > 400:
            return False
        if len(profile["significance"]) > 400:
            return False

        return True

    def _fallback_profile(self, artifact: Dict, year: int) -> Dict:
        """Generate fallback profile if enrichment fails."""

        title = artifact.get("title", "Unknown")
        artifact_type = artifact.get("type", "Unknown")
        description = artifact.get("description", "No description available")[:200]

        return {
            **artifact,
            "description": description if len(description) > 50 else f"{artifact_type} artifact: {title}",
            "producer_teams": f"Professional teams in {artifact_type} domain",
            "client_context": "Commissioned for organizational or regulatory needs",
            "significance": f"Significant {artifact_type} artifact from {year}",
            "enrichment_fallback": True
        }


# Test function
if __name__ == "__main__":
    # Test with mock artifact
    mock_artifact = {
        "title": "FDA Emergency Use Authorization Framework",
        "type": "Regulatory Submission",
        "description": "Framework for FDA to authorize unapproved medical products during emergencies",
        "valuation": {"estimated_value": 1000000}
    }

    enricher = ArtifactEnricherAgent()
    result = enricher.execute({
        "artifacts": [mock_artifact],
        "year": 2020,
        "batch_size": 1
    })

    print(json.dumps(result, indent=2))
