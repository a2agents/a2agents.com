#!/usr/bin/env python3
"""
New New News - Demo Script
Demonstrates the multi-agent research system
"""

from main import NewNewNewsSystem
import json


def run_demo():
    """Run demonstration queries"""

    print("\n" + "="*80)
    print("NEW NEW NEWS - DEMONSTRATION")
    print("2020 Human Artifacts Index Research System")
    print("="*80 + "\n")

    # Initialize system (using mock data for demo)
    system = NewNewNewsSystem(use_mock=True)

    # Demo queries
    demo_queries = [
        {
            "query": "Find 2020 artifacts related to COVID vaccine development",
            "max_artifacts": 5,
            "output_file": "demo_covid_vaccines.json"
        },
        {
            "query": "2020 artificial intelligence research papers and breakthroughs",
            "max_artifacts": 5,
            "output_file": "demo_ai_research.json"
        },
        {
            "query": "Open source software releases 2020 pandemic response",
            "max_artifacts": 5,
            "output_file": "demo_opensource.json"
        }
    ]

    print("This demo will run 3 sample queries:\n")
    for idx, demo in enumerate(demo_queries, 1):
        print(f"{idx}. {demo['query']}")

    print("\n" + "="*80 + "\n")
    input("Press ENTER to start the demo...")

    # Run each demo query
    for idx, demo in enumerate(demo_queries, 1):
        print("\n\n" + "="*80)
        print(f"DEMO QUERY {idx} of {len(demo_queries)}")
        print("="*80 + "\n")

        result = system.research(
            query=demo["query"],
            max_artifacts=demo["max_artifacts"],
            output_format="markdown"
        )

        # Save results
        system.save_report(result, demo["output_file"])

        # Display summary
        report = result["report"]
        print("\n" + "-"*80)
        print("QUICK SUMMARY")
        print("-"*80)
        print(f"Query: {demo['query']}")
        print(f"Artifacts Found: {report['metadata']['num_artifacts']}")
        print(f"Total Estimated Value: ${report['metadata']['total_estimated_value']:,}")
        print(f"\nTop 3 Artifacts:")
        for i, artifact in enumerate(report['executive_summary']['top_3_artifacts'][:3], 1):
            print(f"  {i}. {artifact['title']}")
            print(f"     Value: ${artifact['estimated_value']:,}")
        print("-"*80)

        if idx < len(demo_queries):
            input("\nPress ENTER to continue to next demo query...")

    # Final summary
    print("\n\n" + "="*80)
    print("DEMO COMPLETE")
    print("="*80)
    print("\nGenerated files:")
    for demo in demo_queries:
        json_file = demo["output_file"]
        md_file = demo["output_file"].replace(".json", ".md")
        print(f"  - {json_file}")
        print(f"  - {md_file}")

    print("\n" + "="*80)
    print("\nNEXT STEPS:")
    print("="*80)
    print("\n1. ACTIVATE YOUR YOU.COM API KEY:")
    print("   - Verify your API key at https://api.you.com")
    print("   - Check if additional activation steps are required")
    print("   - Ensure you have access to Search, News, and RAG endpoints")

    print("\n2. SWITCH TO REAL API:")
    print("   - Edit config.py and set USE_MOCK_DATA = False")
    print("   - Or run: python main.py 'your query' --no-mock")

    print("\n3. RUN YOUR OWN QUERIES:")
    print("   python main.py 'Find 2020 artifacts related to [YOUR TOPIC]' --max-artifacts 10")

    print("\n4. GENERATE REPORTS IN DIFFERENT FORMATS:")
    print("   python main.py 'your query' --format markdown --output report.md")
    print("   python main.py 'your query' --format html --output report.html")

    print("\n5. BUILD THE FULL 100 ARTIFACT INDEX:")
    print("   Run multiple targeted queries to reach 100 artifacts")
    print("   Combine results into master index")

    print("\n" + "="*80 + "\n")


if __name__ == "__main__":
    run_demo()
