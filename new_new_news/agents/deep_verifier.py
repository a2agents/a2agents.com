"""
Deep Verifier Agent
Fetches full content and extracts verified 2020 data using Contents and Express APIs
"""

import json
from typing import Dict, List, Any
from .base_agent import BaseAgent
from config import TARGET_YEAR


class DeepVerifierAgent(BaseAgent):
    """
    Agent responsible for deep verification of artifacts

    Uses Contents API to fetch full page content and Express API to extract
    structured, verified data including 2020 confirmation and pricing.
    """

    def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Perform deep verification on artifacts

        Args:
            input_data: Dict with:
                - artifacts: List of artifacts to verify (from Web Researcher)
                - top_sources: Number of sources to fetch per artifact (default: 3)

        Returns:
            Dict with:
                - verified_artifacts: List of artifacts with enhanced data
                - verification_stats: Statistics about verification process
        """
        artifacts = input_data.get("artifacts", [])
        top_sources = input_data.get("top_sources", 3)

        print(f"🔬 Deep verification of {len(artifacts)} artifacts")
        print(f"   Fetching top {top_sources} sources per artifact")

        verified_artifacts = []
        stats = {
            "total_artifacts": len(artifacts),
            "content_fetches": 0,
            "successful_fetches": 0,
            "year_confirmed": 0,
            "year_unconfirmed": 0,
            "enhanced_valuations": 0
        }

        for idx, artifact in enumerate(artifacts, 1):
            print(f"\n  [{idx}/{len(artifacts)}] Verifying: {artifact.get('title', 'Unknown')[:60]}...")

            # Get top sources (URLs) for this artifact
            sources = artifact.get("sources", [])[:top_sources]

            if not sources:
                print(f"     ⚠️  No sources available")
                verified_artifacts.append(artifact)
                continue

            # Fetch full content for each source
            fetched_content = []
            for source in sources:
                url = source.get("url", "")
                if url:
                    stats["content_fetches"] += 1
                    content = self.api_client.fetch_content(url)

                    if content and content.get("markdown"):
                        stats["successful_fetches"] += 1
                        fetched_content.append({
                            "url": url,
                            "content": content.get("markdown", ""),
                            "title": content.get("title", "")
                        })

            # Use Express API to extract verified data from content
            if fetched_content:
                verified_data = self._extract_verified_data(artifact, fetched_content)

                # Enhance artifact with verified data
                enhanced_artifact = self._enhance_artifact(artifact, verified_data)

                # Update stats
                if verified_data.get("year_confirmed") == str(TARGET_YEAR):
                    stats["year_confirmed"] += 1
                else:
                    stats["year_unconfirmed"] += 1

                if verified_data.get("estimated_value", 0) > 0:
                    stats["enhanced_valuations"] += 1

                verified_artifacts.append(enhanced_artifact)

                print(f"     ✓ Year: {verified_data.get('year_confirmed', 'unknown')}, "
                      f"Value: ${verified_data.get('estimated_value', 0):,}, "
                      f"Confidence: {verified_data.get('confidence', 0):.2f}")
            else:
                print(f"     ⚠️  No content fetched")
                verified_artifacts.append(artifact)

        print(f"\n✓ Verification complete:")
        print(f"  - Content fetches: {stats['successful_fetches']}/{stats['content_fetches']}")
        print(f"  - Year confirmed: {stats['year_confirmed']}")
        print(f"  - Enhanced valuations: {stats['enhanced_valuations']}")

        return {
            "verified_artifacts": verified_artifacts,
            "verification_stats": stats
        }

    def _extract_verified_data(self, artifact: Dict[str, Any], content_list: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Extract verified data using Express API"""

        # Combine content from multiple sources
        combined_content = "\n\n".join([
            f"Source: {c['title']}\nURL: {c['url']}\n\n{c['content'][:2000]}"  # Limit content size
            for c in content_list
        ])

        # Build extraction prompt
        prompt = self._build_extraction_prompt(artifact, combined_content)

        # Query Express API
        result = self.api_client.express_query(prompt, combined_content[:5000])

        # Parse result
        return self._parse_verified_data(result)

    def _build_extraction_prompt(self, artifact: Dict[str, Any], content: str) -> str:
        """Build prompt for Express API to extract structured data"""

        artifact_title = artifact.get("title", "Unknown")

        prompt = f"""Analyze the following content about "{artifact_title}" and extract verified information.

IMPORTANT: Focus on confirming this is from {TARGET_YEAR} and extract professional/commercial value.

Return ONLY a JSON object with this exact structure:
{{
  "year_confirmed": "2020" or "unknown" or other year,
  "price_data": "extracted pricing/value information as text",
  "estimated_value": numeric value in dollars (e.g., 50000000 for $50M),
  "confidence": confidence score 0.0 to 1.0,
  "supporting_quote": "direct quote from source supporting the year/value",
  "contradictions": ["any contradicting information found"],
  "category": "one of: Healthcare, Technology, Policy, Education, Business, Culture"
}}

Look for:
- Explicit year mentions (2020, announced in 2020, developed in 2020)
- Value indicators (funding rounds, market value, development costs, impact)
- Commercial/professional significance
- Category classification

Be conservative with confidence scores. Only return high confidence if clearly stated."""

        return prompt

    def _parse_verified_data(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Parse verified data from Express API response"""

        try:
            answer = result.get("answer", "{}")

            if isinstance(answer, str):
                data = json.loads(answer)
            else:
                data = answer

            # Validate and normalize
            verified_data = {
                "year_confirmed": data.get("year_confirmed", "unknown"),
                "price_data": data.get("price_data", ""),
                "estimated_value": int(data.get("estimated_value", 0)),
                "confidence": float(data.get("confidence", 0.5)),
                "supporting_quote": data.get("supporting_quote", ""),
                "contradictions": data.get("contradictions", []),
                "category": data.get("category", "General")
            }

            return verified_data

        except (json.JSONDecodeError, ValueError, TypeError) as e:
            print(f"       ⚠️  Failed to parse verified data: {e}")
            return {
                "year_confirmed": "unknown",
                "price_data": "",
                "estimated_value": 0,
                "confidence": 0.3,
                "supporting_quote": "",
                "contradictions": [],
                "category": "General"
            }

    def _enhance_artifact(self, artifact: Dict[str, Any], verified_data: Dict[str, Any]) -> Dict[str, Any]:
        """Enhance artifact with verified data"""

        enhanced = artifact.copy()

        # Add verified fields
        enhanced["year_verified"] = verified_data["year_confirmed"]
        enhanced["verified_confidence"] = verified_data["confidence"]
        enhanced["verification_quote"] = verified_data["supporting_quote"]
        enhanced["verified_category"] = verified_data["category"]

        # Update or enhance estimated value if verification found better data
        if verified_data["estimated_value"] > 0:
            enhanced["verified_value"] = verified_data["estimated_value"]

            # If no prior estimate or verified value is significantly different, update
            if not enhanced.get("estimated_value") or \
               abs(verified_data["estimated_value"] - enhanced.get("estimated_value", 0)) > enhanced.get("estimated_value", 0) * 0.3:
                enhanced["estimated_value"] = verified_data["estimated_value"]
                enhanced["value_source"] = "deep_verification"

        # Add verification notes
        if verified_data["contradictions"]:
            enhanced["verification_notes"] = {
                "contradictions": verified_data["contradictions"],
                "needs_review": True
            }

        return enhanced
