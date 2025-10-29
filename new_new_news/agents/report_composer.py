"""
Report Composer Agent - Generates structured output
"""

from typing import Dict, Any, List
from .base_agent import BaseAgent
from datetime import datetime
import json


class ReportComposerAgent(BaseAgent):
    """
    Report Composer Agent: Generates structured research reports

    Responsibilities:
    - Compose final artifact reports
    - Format data for different output types (JSON, Markdown, HTML)
    - Generate executive summaries
    - Create artifact index entries
    """

    def __init__(self):
        super().__init__("Report Composer")

    def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compose final research report

        Args:
            input_data: {
                "query": str,
                "artifacts": List[Dict],
                "research_plan": Dict,
                "format": str  # "json", "markdown", "html"
            }

        Returns:
            Formatted report
        """
        query = input_data.get("query", "")
        artifacts = input_data.get("artifacts", [])
        research_plan = input_data.get("research_plan", {})
        output_format = input_data.get("format", "json")

        print(f"[{self.name}] Composing report for {len(artifacts)} artifacts...")

        # Generate executive summary
        executive_summary = self._generate_executive_summary(query, artifacts, research_plan)

        # Create artifact index entries
        artifact_entries = self._create_artifact_entries(artifacts)

        # Compile report
        report = {
            "metadata": {
                "query": query,
                "generated_at": datetime.now().isoformat(),
                "num_artifacts": len(artifacts),
                "total_estimated_value": sum(a.get("valuation", {}).get("estimated_value", 0) for a in artifacts),
                "research_plan": research_plan
            },
            "executive_summary": executive_summary,
            "artifacts": artifact_entries,
            "statistics": self._generate_statistics(artifacts)
        }

        # Format output
        formatted_report = self._format_report(report, output_format)

        output = {
            "report": report,
            "formatted_output": formatted_report,
            "format": output_format
        }

        self.log_execution(input_data, output)
        return output

    def _generate_executive_summary(
        self,
        query: str,
        artifacts: List[Dict[str, Any]],
        research_plan: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate executive summary of findings"""
        total_value = sum(a.get("valuation", {}).get("estimated_value", 0) for a in artifacts)
        avg_confidence = sum(a.get("valuation", {}).get("confidence_score", 0) for a in artifacts) / len(artifacts) if artifacts else 0

        # Group by type
        by_type = {}
        for artifact in artifacts:
            artifact_type = artifact.get("type", "Unknown")
            if artifact_type not in by_type:
                by_type[artifact_type] = []
            by_type[artifact_type].append(artifact)

        # Get top artifacts
        top_artifacts = sorted(
            artifacts,
            key=lambda x: x.get("valuation", {}).get("estimated_value", 0),
            reverse=True
        )[:3]

        summary = {
            "query": query,
            "total_artifacts_found": len(artifacts),
            "total_estimated_value": total_value,
            "average_confidence_score": round(avg_confidence, 2),
            "artifacts_by_type": {
                artifact_type: len(items)
                for artifact_type, items in by_type.items()
            },
            "top_3_artifacts": [
                {
                    "title": a.get("title", ""),
                    "type": a.get("type", ""),
                    "estimated_value": a.get("valuation", {}).get("estimated_value", 0)
                }
                for a in top_artifacts
            ],
            "key_findings": self._generate_key_findings(artifacts)
        }

        return summary

    def _generate_key_findings(self, artifacts: List[Dict[str, Any]]) -> List[str]:
        """Generate key findings from artifacts"""
        findings = []

        if not artifacts:
            return ["No artifacts found matching the query criteria."]

        # Finding 1: Most common artifact type
        type_counts = {}
        for artifact in artifacts:
            artifact_type = artifact.get("type", "Unknown")
            type_counts[artifact_type] = type_counts.get(artifact_type, 0) + 1

        most_common_type = max(type_counts.items(), key=lambda x: x[1])
        findings.append(
            f"The most common artifact type was {most_common_type[0]} "
            f"({most_common_type[1]} artifacts, {100*most_common_type[1]//len(artifacts)}% of total)"
        )

        # Finding 2: Value concentration
        total_value = sum(a.get("valuation", {}).get("estimated_value", 0) for a in artifacts)
        top_3_value = sum(
            a.get("valuation", {}).get("estimated_value", 0)
            for a in sorted(artifacts, key=lambda x: x.get("valuation", {}).get("estimated_value", 0), reverse=True)[:3]
        )

        if total_value > 0:
            concentration = (top_3_value / total_value) * 100
            findings.append(
                f"Top 3 artifacts represent {concentration:.1f}% of total estimated value "
                f"(${top_3_value:,} out of ${total_value:,})"
            )

        # Finding 3: Source quality
        verified_artifacts = sum(
            1 for a in artifacts
            if a.get("citation_metadata", {}).get("meets_minimum", False)
        )

        if verified_artifacts > 0:
            findings.append(
                f"{verified_artifacts} out of {len(artifacts)} artifacts "
                f"({100*verified_artifacts//len(artifacts)}%) have sufficient verified citations (2-3 sources)"
            )

        # Finding 4: Temporal distribution
        artifacts_2020 = sum(1 for a in artifacts if "2020" in str(a.get("date", "")))
        if artifacts_2020 > 0:
            findings.append(
                f"{artifacts_2020} artifacts ({100*artifacts_2020//len(artifacts)}%) "
                f"are confirmed from 2020, the target year for the Human Artifacts Index"
            )

        return findings

    def _create_artifact_entries(self, artifacts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Create structured artifact index entries"""
        entries = []

        for idx, artifact in enumerate(artifacts, 1):
            entry = {
                "index_number": idx,
                "title": artifact.get("title", "Unknown"),
                "type": artifact.get("type", "Unknown"),
                "description": artifact.get("description", ""),
                "url": artifact.get("url", ""),
                "date": artifact.get("date", "2020"),
                "valuation": {
                    "estimated_value": artifact.get("valuation", {}).get("estimated_value", 0),
                    "value_range": artifact.get("valuation", {}).get("value_range", {}),
                    "confidence_score": artifact.get("valuation", {}).get("confidence_score", 0),
                    "methodology": artifact.get("valuation", {}).get("methodology", "")
                },
                "citations": [
                    {
                        "title": source.get("title", ""),
                        "url": source.get("url", ""),
                        "snippet": source.get("snippet", "")[:200],
                        "source_type": source.get("type", ""),
                        "quality_score": source.get("validation", {}).get("quality_score", 0)
                    }
                    for source in artifact.get("sources", [])
                ],
                "citation_metadata": artifact.get("citation_metadata", {}),
                "relevance_score": artifact.get("relevance_score", 0)
            }

            entries.append(entry)

        # Sort by estimated value (descending)
        entries.sort(key=lambda x: x["valuation"]["estimated_value"], reverse=True)

        # Update index numbers after sorting
        for idx, entry in enumerate(entries, 1):
            entry["index_number"] = idx

        return entries

    def _generate_statistics(self, artifacts: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate detailed statistics"""
        if not artifacts:
            return {}

        valuations = [a.get("valuation", {}).get("estimated_value", 0) for a in artifacts]
        confidences = [a.get("valuation", {}).get("confidence_score", 0) for a in artifacts]

        return {
            "total_artifacts": len(artifacts),
            "value_statistics": {
                "total": sum(valuations),
                "mean": sum(valuations) / len(valuations) if valuations else 0,
                "min": min(valuations) if valuations else 0,
                "max": max(valuations) if valuations else 0
            },
            "confidence_statistics": {
                "mean": sum(confidences) / len(confidences) if confidences else 0,
                "min": min(confidences) if confidences else 0,
                "max": max(confidences) if confidences else 0
            },
            "type_distribution": self._get_type_distribution(artifacts),
            "source_statistics": self._get_source_statistics(artifacts)
        }

    def _get_type_distribution(self, artifacts: List[Dict[str, Any]]) -> Dict[str, int]:
        """Get distribution of artifact types"""
        distribution = {}
        for artifact in artifacts:
            artifact_type = artifact.get("type", "Unknown")
            distribution[artifact_type] = distribution.get(artifact_type, 0) + 1
        return distribution

    def _get_source_statistics(self, artifacts: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Get statistics about sources"""
        total_sources = sum(len(a.get("sources", [])) for a in artifacts)
        verified_citations = sum(
            1 for a in artifacts
            if a.get("citation_metadata", {}).get("meets_minimum", False)
        )

        return {
            "total_sources": total_sources,
            "average_sources_per_artifact": total_sources / len(artifacts) if artifacts else 0,
            "artifacts_with_verified_citations": verified_citations,
            "verification_rate": verified_citations / len(artifacts) if artifacts else 0
        }

    def _format_report(self, report: Dict[str, Any], format_type: str) -> str:
        """Format report in requested format"""
        if format_type == "json":
            return json.dumps(report, indent=2)

        elif format_type == "markdown":
            return self._format_markdown(report)

        elif format_type == "html":
            return self._format_html(report)

        else:
            return json.dumps(report, indent=2)

    def _format_markdown(self, report: Dict[str, Any]) -> str:
        """Format report as Markdown"""
        md = []
        md.append("# 2020 Human Artifacts Index - Research Report\n")

        # Metadata
        metadata = report.get("metadata", {})
        md.append(f"**Query:** {metadata.get('query', '')}\n")
        md.append(f"**Generated:** {metadata.get('generated_at', '')}\n")
        md.append(f"**Total Artifacts:** {metadata.get('num_artifacts', 0)}\n")
        md.append(f"**Total Estimated Value:** ${metadata.get('total_estimated_value', 0):,}\n")

        # Executive Summary
        md.append("\n## Executive Summary\n")
        summary = report.get("executive_summary", {})
        md.append(f"- **Artifacts Found:** {summary.get('total_artifacts_found', 0)}\n")
        md.append(f"- **Total Value:** ${summary.get('total_estimated_value', 0):,}\n")
        md.append(f"- **Average Confidence:** {summary.get('average_confidence_score', 0):.2f}\n")

        # Key Findings
        md.append("\n### Key Findings\n")
        for finding in summary.get("key_findings", []):
            md.append(f"- {finding}\n")

        # Top Artifacts
        md.append("\n### Top 3 Most Valuable Artifacts\n")
        for idx, artifact in enumerate(summary.get("top_3_artifacts", []), 1):
            md.append(f"{idx}. **{artifact['title']}** ({artifact['type']})\n")
            md.append(f"   - Estimated Value: ${artifact['estimated_value']:,}\n")

        # Detailed Artifacts
        md.append("\n## Detailed Artifact Index\n")
        for entry in report.get("artifacts", []):
            md.append(f"\n### {entry['index_number']}. {entry['title']}\n")
            md.append(f"- **Type:** {entry['type']}\n")
            md.append(f"- **Date:** {entry['date']}\n")
            md.append(f"- **Estimated Value:** ${entry['valuation']['estimated_value']:,}\n")
            md.append(f"- **Confidence Score:** {entry['valuation']['confidence_score']:.2f}\n")
            md.append(f"- **Description:** {entry['description']}\n")

            if entry.get('url'):
                md.append(f"- **URL:** {entry['url']}\n")

            md.append(f"\n**Citations:**\n")
            for citation in entry.get("citations", []):
                md.append(f"- [{citation['title']}]({citation['url']})\n")
                md.append(f"  - {citation['snippet'][:150]}...\n")

        return "".join(md)

    def _format_html(self, report: Dict[str, Any]) -> str:
        """Format report as HTML"""
        html = ['<!DOCTYPE html>\n<html>\n<head>\n']
        html.append('<title>2020 Human Artifacts Index - Research Report</title>\n')
        html.append('<style>')
        html.append('body { font-family: Arial, sans-serif; margin: 40px; }')
        html.append('h1 { color: #2c3e50; }')
        html.append('h2 { color: #34495e; border-bottom: 2px solid #3498db; }')
        html.append('.artifact { margin: 20px 0; padding: 15px; background: #f8f9fa; border-left: 4px solid #3498db; }')
        html.append('.citation { margin: 5px 0; padding: 5px; background: #ecf0f1; }')
        html.append('.value { color: #27ae60; font-weight: bold; }')
        html.append('</style>\n</head>\n<body>\n')

        # Header
        metadata = report.get("metadata", {})
        html.append('<h1>2020 Human Artifacts Index - Research Report</h1>\n')
        html.append(f'<p><strong>Query:</strong> {metadata.get("query", "")}</p>\n')
        html.append(f'<p><strong>Generated:</strong> {metadata.get("generated_at", "")}</p>\n')

        # Executive Summary
        summary = report.get("executive_summary", {})
        html.append('<h2>Executive Summary</h2>\n')
        html.append(f'<p>Total Artifacts: {summary.get("total_artifacts_found", 0)}</p>\n')
        html.append(f'<p class="value">Total Estimated Value: ${summary.get("total_estimated_value", 0):,}</p>\n')

        # Artifacts
        html.append('<h2>Artifacts</h2>\n')
        for entry in report.get("artifacts", []):
            html.append('<div class="artifact">\n')
            html.append(f'<h3>{entry["index_number"]}. {entry["title"]}</h3>\n')
            html.append(f'<p><strong>Type:</strong> {entry["type"]}</p>\n')
            html.append(f'<p><strong>Date:</strong> {entry["date"]}</p>\n')
            html.append(f'<p class="value">Estimated Value: ${entry["valuation"]["estimated_value"]:,}</p>\n')
            html.append(f'<p>{entry["description"]}</p>\n')
            html.append('</div>\n')

        html.append('</body>\n</html>')
        return "".join(html)
