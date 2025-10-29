#!/usr/bin/env python3
"""
Quick Test Script for New New News
Run various test queries to see the system in action
"""

import subprocess
import sys
import os

def run_test(query, max_artifacts=5, format_type="json", description=""):
    """Run a test query and display results"""
    print("\n" + "="*80)
    print(f"TEST: {description}")
    print("="*80)
    print(f"Query: {query}")
    print(f"Max Artifacts: {max_artifacts}")
    print(f"Format: {format_type}\n")

    output_file = f"test_{description.lower().replace(' ', '_')}"

    cmd = [
        "python", "main.py",
        query,
        "--max-artifacts", str(max_artifacts),
        "--format", format_type,
        "--output", output_file
    ]

    result = subprocess.run(cmd, capture_output=False, text=True)

    if result.returncode == 0:
        print(f"\n✅ Test completed successfully!")
        print(f"📁 Output saved to: {output_file}.json")
        if format_type == "markdown":
            print(f"📄 Markdown report: {output_file}.md")
        elif format_type == "html":
            print(f"🌐 HTML report: {output_file}.html")
    else:
        print(f"\n❌ Test failed with return code: {result.returncode}")

    return result.returncode == 0


def main():
    """Run all test scenarios"""

    print("""
╔════════════════════════════════════════════════════════════════════════════╗
║                     NEW NEW NEWS - TEST SUITE                              ║
║              Multi-Agent Research System for You.com Hackathon             ║
╚════════════════════════════════════════════════════════════════════════════╝

This script will run several test queries to demonstrate the system.
All tests use MOCK DATA (no API credits used).

Press ENTER to start testing, or Ctrl+C to cancel...
""")

    input()

    # Test cases
    tests = [
        {
            "query": "Find 2020 artifacts related to COVID vaccine development",
            "max_artifacts": 5,
            "format": "json",
            "description": "COVID Vaccine Research"
        },
        {
            "query": "2020 artificial intelligence breakthroughs",
            "max_artifacts": 3,
            "format": "markdown",
            "description": "AI Breakthroughs"
        },
        {
            "query": "2020 open source software releases",
            "max_artifacts": 3,
            "format": "json",
            "description": "Open Source Software"
        }
    ]

    results = []
    for i, test in enumerate(tests, 1):
        print(f"\n\nRunning test {i} of {len(tests)}...")
        success = run_test(
            query=test["query"],
            max_artifacts=test["max_artifacts"],
            format_type=test["format"],
            description=test["description"]
        )
        results.append((test["description"], success))

        if i < len(tests):
            input("\nPress ENTER for next test...")

    # Summary
    print("\n\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)

    for description, success in results:
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status}: {description}")

    passed = sum(1 for _, success in results if success)
    print(f"\nTotal: {passed}/{len(results)} tests passed")

    # List generated files
    print("\n" + "="*80)
    print("GENERATED FILES")
    print("="*80)

    subprocess.run(["ls", "-lh", "test_*.json"], shell=True)
    subprocess.run(["ls", "-lh", "test_*.md"], shell=True)

    print("\n" + "="*80)
    print("TESTING COMPLETE!")
    print("="*80)
    print("\nTo view a report:")
    print("  cat test_covid_vaccine_research.json | python -m json.tool")
    print("  cat test_ai_breakthroughs.md")
    print("\nTo run custom query:")
    print('  python main.py "YOUR QUERY" --max-artifacts 10')
    print("\n")


if __name__ == "__main__":
    # Change to the new_new_news directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ Testing cancelled by user.")
        sys.exit(1)
