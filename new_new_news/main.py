#!/usr/bin/env python3
"""
New New News - Main Orchestration System
Multi-agent research system for the 2020 Human Artifacts Index
"""

import sys
import json
from typing import Dict, Any, Optional
from datetime import datetime

from you_api_client import YouAPIClient
from agents import (
    OrchestratorAgent,
    WebResearcherAgent,
    PricingNormalizerAgent,
    CitationVerifierAgent,
    ReportComposerAgent,
    QueryDecomposerAgent,
    DeepVerifierAgent,
    ArtifactEnricherAgent,
    CategorizerAgent,
    SummaryGeneratorAgent,
    InsightsGeneratorAgent
)
from config import MAX_ARTIFACTS_PER_QUERY, USE_MOCK_DATA, DEFAULT_TARGET_ARTIFACTS
from report_compiler import ReportCompiler


class NewNewNewsSystem:
    """
    Main orchestration system for New New News

    Coordinates all 5 agents to research and catalog professional artifacts
    """

    def __init__(self, use_mock: bool = USE_MOCK_DATA):
        """
        Initialize the multi-agent system

        Args:
            use_mock: Whether to use mock data (set to False once API key is activated)
        """
        print("\n" + "="*80)
        print("NEW NEW NEWS - 2020 Human Artifacts Index")
        print("Multi-Agent Research System powered by You.com APIs")
        print("="*80 + "\n")

        # Initialize API client
        self.api_client = YouAPIClient(use_mock=use_mock)

        # Initialize agents
        print("Initializing agents...")
        self.orchestrator = OrchestratorAgent()
        self.web_researcher = WebResearcherAgent(self.api_client)
        self.pricing_normalizer = PricingNormalizerAgent(self.api_client)
        self.citation_verifier = CitationVerifierAgent(self.api_client)
        self.report_composer = ReportComposerAgent()
        self.query_decomposer = QueryDecomposerAgent(self.api_client)
        self.deep_verifier = DeepVerifierAgent(self.api_client)

        # Narrative generation agents
        self.artifact_enricher = ArtifactEnricherAgent(self.api_client)
        self.categorizer = CategorizerAgent(self.api_client)
        self.summary_generator = SummaryGeneratorAgent(self.api_client)
        self.insights_generator = InsightsGeneratorAgent(self.api_client)

        print(f"✓ {self.orchestrator.name}")
        print(f"✓ {self.web_researcher.name}")
        print(f"✓ {self.pricing_normalizer.name}")
        print(f"✓ {self.citation_verifier.name}")
        print(f"✓ {self.report_composer.name}")
        print(f"✓ {self.query_decomposer.name}")
        print(f"✓ {self.deep_verifier.name}")
        print(f"✓ {self.artifact_enricher.name}")
        print(f"✓ {self.categorizer.name}")
        print(f"✓ {self.summary_generator.name}")
        print(f"✓ {self.insights_generator.name}")
        print("\nAll agents initialized and ready.\n")

    def research(
        self,
        query: str,
        max_artifacts: int = MAX_ARTIFACTS_PER_QUERY,
        output_format: str = "json"
    ) -> Dict[str, Any]:
        """
        Execute full research workflow

        Args:
            query: Research query (e.g., "Find 2020 artifacts related to COVID vaccine development")
            max_artifacts: Maximum number of artifacts to return
            output_format: Output format ("json", "markdown", "html")

        Returns:
            Research report dictionary
        """
        print("="*80)
        print("STARTING RESEARCH WORKFLOW")
        print("="*80)
        print(f"Query: {query}")
        print(f"Max Artifacts: {max_artifacts}")
        print(f"Output Format: {output_format}\n")

        start_time = datetime.now()

        # PHASE 1: Orchestration - Plan research strategy
        print("\n" + "-"*80)
        print("PHASE 1: ORCHESTRATION - Planning Research Strategy")
        print("-"*80)

        orchestration_result = self.orchestrator.execute({
            "query": query,
            "max_artifacts": max_artifacts
        })

        research_plan = orchestration_result["research_plan"]
        search_queries = orchestration_result["search_queries"]

        print(f"✓ Research plan created")
        print(f"  - Artifact types: {', '.join(research_plan['artifact_types'])}")
        print(f"  - Search queries: {len(search_queries)}")
        for idx, q in enumerate(search_queries, 1):
            print(f"    {idx}. {q}")

        # PHASE 2: Web Research - Find sources
        print("\n" + "-"*80)
        print("PHASE 2: WEB RESEARCH - Finding Sources")
        print("-"*80)

        research_result = self.web_researcher.execute({
            "search_queries": search_queries,
            "max_results_per_query": 5
        })

        potential_artifacts = research_result["potential_artifacts"][:max_artifacts]

        print(f"✓ Web research completed")
        print(f"  - Total sources found: {research_result['total_sources_found']}")
        print(f"  - Potential artifacts identified: {len(potential_artifacts)}")

        # PHASE 3: Pricing Normalization - Estimate valuations
        print("\n" + "-"*80)
        print("PHASE 3: PRICING NORMALIZATION - Estimating Valuations")
        print("-"*80)

        pricing_result = self.pricing_normalizer.execute({
            "artifacts": potential_artifacts,
            "use_llm_enhancement": True
        })

        valued_artifacts = pricing_result["artifacts"]

        print(f"✓ Valuations completed")
        print(f"  - Artifacts valued: {len(valued_artifacts)}")
        print(f"  - Total estimated value: ${pricing_result['total_estimated_value']:,}")
        print(f"  - Average confidence: {pricing_result['average_confidence']:.2f}")

        # PHASE 4: Citation Verification - Verify sources
        print("\n" + "-"*80)
        print("PHASE 4: CITATION VERIFICATION - Verifying Sources")
        print("-"*80)

        verification_result = self.citation_verifier.execute({
            "artifacts": valued_artifacts
        })

        verified_artifacts = verification_result["artifacts"]
        stats = verification_result["verification_stats"]

        print(f"✓ Citation verification completed")
        print(f"  - Artifacts with sufficient sources: {stats['artifacts_with_sufficient_sources']}")
        print(f"  - Artifacts needing more sources: {stats['artifacts_needing_sources']}")

        # PHASE 5: Report Composition - Generate final report
        print("\n" + "-"*80)
        print("PHASE 5: REPORT COMPOSITION - Generating Final Report")
        print("-"*80)

        report_result = self.report_composer.execute({
            "query": query,
            "artifacts": verified_artifacts,
            "research_plan": research_plan,
            "format": output_format
        })

        final_report = report_result["report"]
        formatted_output = report_result["formatted_output"]

        print(f"✓ Report generated")
        print(f"  - Format: {output_format}")
        print(f"  - Final artifact count: {final_report['metadata']['num_artifacts']}")

        # Summary
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()

        print("\n" + "="*80)
        print("RESEARCH WORKFLOW COMPLETED")
        print("="*80)
        print(f"Duration: {duration:.2f} seconds")
        print(f"Artifacts Found: {len(verified_artifacts)}")
        print(f"Total Value: ${final_report['metadata']['total_estimated_value']:,}")
        print("="*80 + "\n")

        return {
            "report": final_report,
            "formatted_output": formatted_output,
            "execution_metadata": {
                "duration_seconds": duration,
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat()
            }
        }

    def save_report(self, result: Dict[str, Any], filename: str, compile_full_report: bool = False):
        """Save research report to file"""
        # DEBUG: Check what's in result before saving
        print(f"\n[DEBUG] Saving report with keys: {list(result['report'].keys())}")
        if 'categories' in result['report']:
            print(f"[DEBUG]   - categories: {len(result['report']['categories'])} categories")
        if 'insights' in result['report']:
            print(f"[DEBUG]   - insights: {len(result['report']['insights'].get('insights', []))} insights")
        print(f"[DEBUG]   - executive_summary type: {type(result['report']['executive_summary'])}")

        # Save JSON report
        json_filename = filename.replace(".json", "") + ".json"
        with open(json_filename, 'w') as f:
            json.dump(result["report"], f, indent=2)
        print(f"✓ JSON report saved to: {json_filename}")

        # If compile_full_report, use Report Compiler for professional output
        if compile_full_report:
            print("\nCompiling professional report formats...")
            compiler = ReportCompiler()
            output_prefix = filename.replace(".json", "")
            compiler.compile(result["report"], output_prefix)
        else:
            # Save formatted output (legacy)
            format_type = result["report"]["metadata"].get("format", "json")
            if format_type == "markdown":
                md_filename = filename.replace(".json", ".md")
                with open(md_filename, 'w') as f:
                    f.write(result["formatted_output"])
                print(f"✓ Markdown report saved to: {md_filename}")
            elif format_type == "html":
                html_filename = filename.replace(".json", ".html")
                with open(html_filename, 'w') as f:
                    f.write(result["formatted_output"])
                print(f"✓ HTML report saved to: {html_filename}")

    def generate_report(
        self,
        topic: str,
        target_artifacts: int = DEFAULT_TARGET_ARTIFACTS,
        output_format: str = "json"
    ) -> Dict[str, Any]:
        """
        Generate comprehensive report with multiple queries

        Args:
            topic: Broad research topic (e.g., "2020 Human Artifacts")
            target_artifacts: Target number of artifacts (default: 100)
            output_format: Output format ("json", "markdown", "html")

        Returns:
            Comprehensive research report
        """
        print("="*80)
        print("GENERATING COMPREHENSIVE REPORT")
        print("="*80)
        print(f"Topic: {topic}")
        print(f"Target Artifacts: {target_artifacts}")
        print(f"Output Format: {output_format}\n")

        start_time = datetime.now()
        all_artifacts = []
        api_stats = {
            "search_calls": 0,
            "contents_calls": 0,
            "express_calls": 0
        }

        # PHASE 1: Query Decomposition
        print("\n" + "="*80)
        print("PHASE 1: QUERY DECOMPOSITION")
        print("="*80)

        # Calculate how many queries we need
        artifacts_per_query = 5  # Conservative estimate
        num_queries = max(15, min(25, (target_artifacts // artifacts_per_query) + 5))

        decomp_result = self.query_decomposer.execute({
            "topic": topic,
            "target_queries": num_queries
        })

        queries = decomp_result["queries"]
        categories = decomp_result["categories"]
        api_stats["express_calls"] += 1  # Query decomposition uses Express API

        print(f"\n✓ Generated {len(queries)} sub-queries")
        print(f"  Categories: {', '.join(set(categories.values()))}")

        # PHASE 2: Execute queries and collect artifacts
        print("\n" + "="*80)
        print("PHASE 2: MULTI-QUERY RESEARCH")
        print("="*80)

        for idx, query in enumerate(queries, 1):
            print(f"\n[Query {idx}/{len(queries)}] {query}")
            print(f"  Category: {categories.get(query, 'General')}")

            try:
                # Run single query research (reuses existing workflow)
                result = self.research(
                    query=query,
                    max_artifacts=artifacts_per_query,
                    output_format="json"
                )

                query_artifacts = result["report"].get("artifacts", [])
                print(f"  ✓ Found {len(query_artifacts)} artifacts")

                # Track API usage (search happens in web_researcher)
                api_stats["search_calls"] += 1

                # Add to collection
                all_artifacts.extend(query_artifacts)

                # Stop if we have enough
                if len(all_artifacts) >= target_artifacts:
                    print(f"\n  ℹ️  Reached target of {target_artifacts} artifacts, stopping research")
                    break

            except Exception as e:
                print(f"  ⚠️  Error in query: {e}")
                continue

        print(f"\n✓ Multi-query research complete: {len(all_artifacts)} total artifacts collected")

        # PHASE 3: Deep Verification
        print("\n" + "="*80)
        print("PHASE 3: DEEP VERIFICATION")
        print("="*80)

        # Only verify top artifacts (sorted by confidence)
        artifacts_to_verify = sorted(
            all_artifacts,
            key=lambda x: x.get("confidence_score", 0),
            reverse=True
        )[:target_artifacts]

        verification_result = self.deep_verifier.execute({
            "artifacts": artifacts_to_verify,
            "top_sources": 2  # Fetch 2 sources per artifact for speed
        })

        verified_artifacts = verification_result["verified_artifacts"]
        v_stats = verification_result["verification_stats"]

        # Track API usage
        api_stats["contents_calls"] = v_stats["successful_fetches"]
        api_stats["express_calls"] += len(verified_artifacts)  # Each artifact gets Express extraction

        print(f"\n✓ Deep verification complete")
        print(f"  Year confirmed (2020): {v_stats['year_confirmed']}/{len(verified_artifacts)}")

        # PHASE 4: Deduplication and ranking
        print("\n" + "="*80)
        print("PHASE 4: DEDUPLICATION AND RANKING")
        print("="*80)

        # Remove duplicates by URL
        unique_artifacts = {}
        for artifact in verified_artifacts:
            url = artifact.get("url", "")
            if url and url not in unique_artifacts:
                unique_artifacts[url] = artifact

        deduplicated = list(unique_artifacts.values())

        # Rank by multiple factors
        def score_artifact(a):
            confidence = a.get("confidence_score", 0.5)
            verified_conf = a.get("verified_confidence", 0.5)
            value = a.get("estimated_value", 0)
            year_match = 1.0 if a.get("year_verified") == "2020" else 0.5
            source_count = len(a.get("sources", []))

            return (
                confidence * 0.3 +
                verified_conf * 0.3 +
                min(value / 100000000, 1.0) * 0.2 +  # Normalize value
                year_match * 0.1 +
                min(source_count / 3, 1.0) * 0.1
            )

        ranked_artifacts = sorted(deduplicated, key=score_artifact, reverse=True)[:target_artifacts]

        print(f"✓ Deduplication complete")
        print(f"  Unique artifacts: {len(ranked_artifacts)}")

        # PHASE 5: Artifact Enrichment (NEW)
        print("\n" + "="*80)
        print("PHASE 5: ARTIFACT ENRICHMENT")
        print("="*80)

        enrichment_result = self.artifact_enricher.execute({
            "artifacts": ranked_artifacts,
            "year": 2020,
            "batch_size": 5
        })

        enriched_artifacts = enrichment_result["enriched_artifacts"]
        enrichment_meta = enrichment_result["metadata"]

        api_stats["express_calls"] += (len(enriched_artifacts) + 4) // 5  # Batched calls

        print(f"✓ Artifact enrichment complete")
        print(f"  Enriched: {enrichment_meta['total_enriched']}")
        print(f"  Fallback: {enrichment_meta['fallback_count']}")

        # PHASE 6: Categorization (NEW)
        print("\n" + "="*80)
        print("PHASE 6: CATEGORIZATION")
        print("="*80)

        categorization_result = self.categorizer.execute({
            "artifacts": enriched_artifacts,
            "query": topic,
            "year": 2020
        })

        artifact_categories = categorization_result["categories"]
        cat_meta = categorization_result["metadata"]

        api_stats["express_calls"] += 1  # Categorization uses 1 Express call

        print(f"✓ Categorization complete")
        print(f"  Categories: {cat_meta['category_count']}")
        print(f"  Quality Score: {cat_meta['quality_score']:.2f}")
        for cat in artifact_categories:
            print(f"    - {cat['name']}: {cat['artifact_count']} artifacts (${cat['total_value']:,})")

        # PHASE 7: Executive Summary (NEW)
        print("\n" + "="*80)
        print("PHASE 7: EXECUTIVE SUMMARY")
        print("="*80)

        exec_summary = self.summary_generator.execute({
            "artifacts": enriched_artifacts,
            "categories": {"categories": artifact_categories},
            "query": topic,
            "year": 2020
        })

        api_stats["express_calls"] += 1  # Summary uses 1 Express call

        print(f"✓ Executive summary generated")
        print(f"  Narrative: {len(exec_summary['narrative'])} characters")
        print(f"  Key Patterns: {len(exec_summary['key_patterns'])}")

        # PHASE 8: Insights Generation (NEW)
        print("\n" + "="*80)
        print("PHASE 8: INSIGHTS GENERATION")
        print("="*80)

        insights_result = self.insights_generator.execute({
            "artifacts": enriched_artifacts,
            "categories": {"categories": artifact_categories},
            "executive_summary": exec_summary,
            "query": topic,
            "year": 2020
        })

        api_stats["express_calls"] += 1  # Insights uses 1 Express call

        print(f"✓ Insights generated")
        print(f"  Insights: {len(insights_result['insights'])}")
        for insight in insights_result['insights']:
            print(f"    - {insight['title']} (score: {insight.get('quality_score', 0):.2f})")

        # PHASE 9: Report Composition
        print("\n" + "="*80)
        print("PHASE 9: REPORT COMPOSITION")
        print("="*80)

        final_result = self.report_composer.execute({
            "query": topic,
            "artifacts": enriched_artifacts,
            "output_format": output_format,
            "research_metadata": {
                "queries_executed": len(queries),
                "categories_covered": list(set(categories.values())),
                "api_usage": api_stats
            }
        })

        # Add narrative components to final result
        final_result["report"]["categories"] = artifact_categories

        # MERGE narrative summary into existing executive_summary (don't replace!)
        final_result["report"]["executive_summary"].update(exec_summary)

        final_result["report"]["insights"] = insights_result

        # DEBUG: Verify narrative components were added
        print(f"\n[DEBUG] Narrative components added to report:")
        print(f"  - Categories: {len(artifact_categories)} categories")
        print(f"  - Executive Summary keys: {list(final_result['report']['executive_summary'].keys())}")
        print(f"  - Insights: {len(insights_result.get('insights', []))} insights")
        print(f"  - Report keys after adding: {list(final_result['report'].keys())}")

        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()

        print(f"\n✓ Report composition complete")

        # Final stats
        print("\n" + "="*80)
        print("REPORT GENERATION COMPLETED")
        print("="*80)
        print(f"Duration: {duration/60:.1f} minutes ({duration:.0f} seconds)")
        print(f"Artifacts in Report: {len(ranked_artifacts)}")
        print(f"Total Estimated Value: ${sum(a.get('estimated_value', 0) for a in ranked_artifacts):,}")
        print(f"\nAPI Usage:")
        print(f"  - Search API: {api_stats['search_calls']} calls")
        print(f"  - Contents API: {api_stats['contents_calls']} calls")
        print(f"  - Express API: {api_stats['express_calls']} calls")
        print(f"  - Total: {sum(api_stats.values())} API calls")
        print("="*80 + "\n")

        return {
            "report": final_result["report"],
            "formatted_output": final_result["formatted_output"],
            "execution_metadata": {
                "duration_seconds": duration,
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "api_usage": api_stats,
                "queries_executed": len(queries)
            }
        }


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(
        description="New New News - 2020 Human Artifacts Index Research System"
    )
    parser.add_argument(
        "query",
        type=str,
        help="Research query (e.g., 'Find 2020 artifacts related to COVID vaccine development')"
    )
    parser.add_argument(
        "--max-artifacts",
        type=int,
        default=10,
        help="Maximum number of artifacts to find (default: 10)"
    )
    parser.add_argument(
        "--format",
        choices=["json", "markdown", "html"],
        default="json",
        help="Output format (default: json)"
    )
    parser.add_argument(
        "--output",
        type=str,
        default="research_report.json",
        help="Output filename (default: research_report.json)"
    )
    parser.add_argument(
        "--no-mock",
        action="store_true",
        help="Use real API (disable mock data)"
    )
    parser.add_argument(
        "--report-mode",
        action="store_true",
        help="Generate comprehensive report with multiple queries"
    )
    parser.add_argument(
        "--target-artifacts",
        type=int,
        default=DEFAULT_TARGET_ARTIFACTS,
        help=f"Target artifacts for report mode (default: {DEFAULT_TARGET_ARTIFACTS})"
    )

    args = parser.parse_args()

    # Initialize system
    use_mock = not args.no_mock
    system = NewNewNewsSystem(use_mock=use_mock)

    # Execute research or generate report
    if args.report_mode:
        # Report mode: comprehensive multi-query report
        result = system.generate_report(
            topic=args.query,
            target_artifacts=args.target_artifacts,
            output_format=args.format
        )
        print(f"\n✓ Report generation complete! Generated {args.target_artifacts}-artifact report.")

        # Save with full report compilation (HTML, PDF, CSV, MD)
        system.save_report(result, args.output, compile_full_report=True)
    else:
        # Single query mode
        result = system.research(
            query=args.query,
            max_artifacts=args.max_artifacts,
            output_format=args.format
        )
        print("\n✓ Research complete!")

        # Save basic report
        system.save_report(result, args.output, compile_full_report=False)

    print(f"   Check the output files for results.")


if __name__ == "__main__":
    main()
