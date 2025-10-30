"""
Report Compiler
Generates professional HTML, PDF, and CSV reports from JSON data
"""

import json
import csv
from typing import Dict, List, Any
from datetime import datetime
from pathlib import Path


class ReportCompiler:
    """
    Compiles research reports into multiple formats

    Generates:
    - Professional HTML report with styling
    - PDF report (via weasyprint)
    - CSV data export
    - Markdown summary
    """

    def compile(self, report_json: Dict[str, Any], output_prefix: str = "final_report"):
        """
        Compile report into multiple formats

        Args:
            report_json: Research report data
            output_prefix: Output file prefix (default: "final_report")

        Returns:
            Dict with paths to generated files
        """
        print("\n" + "="*80)
        print("REPORT COMPILATION")
        print("="*80)

        output_files = {}

        # 1. Generate HTML
        html_path = f"{output_prefix}.html"
        html_content = self._generate_html(report_json)
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        output_files['html'] = html_path
        print(f"✓ HTML report: {html_path}")

        # 2. Generate PDF (if weasyprint available)
        try:
            from weasyprint import HTML
            pdf_path = f"{output_prefix}.pdf"
            HTML(string=html_content).write_pdf(pdf_path)
            output_files['pdf'] = pdf_path
            print(f"✓ PDF report: {pdf_path}")
        except ImportError:
            print(f"ℹ️  PDF generation skipped (install weasyprint: pip install weasyprint)")
        except Exception as e:
            print(f"⚠️  PDF generation failed: {e}")

        # 3. Generate CSV
        csv_path = f"artifacts_table.csv"
        self._generate_csv(report_json, csv_path)
        output_files['csv'] = csv_path
        print(f"✓ CSV export: {csv_path}")

        # 4. Generate Markdown summary
        md_path = "RESEARCH_SUMMARY.md"
        self._generate_markdown(report_json, md_path)
        output_files['markdown'] = md_path
        print(f"✓ Markdown summary: {md_path}")

        # 5. Generate metadata JSON
        metadata_path = "research_metadata.json"
        self._generate_metadata(report_json, metadata_path)
        output_files['metadata'] = metadata_path
        print(f"✓ Metadata: {metadata_path}")

        print("="*80 + "\n")

        return output_files

    def _generate_html(self, report: Dict[str, Any]) -> str:
        """Generate professional HTML report"""

        metadata = report.get('metadata', {})
        artifacts = report.get('artifacts', [])
        summary = report.get('executive_summary', {})

        # Categorize artifacts
        categorized = self._categorize_artifacts(artifacts)

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{metadata.get('query', 'Research Report')}</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
            padding: 20px;
        }}

        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}

        header {{
            border-bottom: 3px solid #2c3e50;
            padding-bottom: 20px;
            margin-bottom: 40px;
        }}

        h1 {{
            color: #2c3e50;
            font-size: 2.5em;
            margin-bottom: 10px;
        }}

        .subtitle {{
            color: #7f8c8d;
            font-size: 1.1em;
        }}

        .exec-summary {{
            background: #ecf0f1;
            padding: 30px;
            border-left: 5px solid #3498db;
            margin: 30px 0;
        }}

        .exec-summary h2 {{
            color: #2c3e50;
            margin-bottom: 20px;
        }}

        .stats {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }}

        .stat-box {{
            background: white;
            padding: 20px;
            border-radius: 5px;
            text-align: center;
        }}

        .stat-value {{
            font-size: 2em;
            font-weight: bold;
            color: #3498db;
        }}

        .stat-label {{
            color: #7f8c8d;
            margin-top: 5px;
        }}

        .category-section {{
            margin: 40px 0;
        }}

        .category-section h2 {{
            color: #2c3e50;
            border-bottom: 2px solid #ecf0f1;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }}

        .artifact {{
            background: #f9f9f9;
            padding: 20px;
            margin: 15px 0;
            border-left: 4px solid #3498db;
            border-radius: 3px;
        }}

        .artifact-title {{
            font-size: 1.3em;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
        }}

        .artifact-meta {{
            display: flex;
            gap: 20px;
            margin: 10px 0;
            flex-wrap: wrap;
        }}

        .meta-item {{
            background: white;
            padding: 5px 10px;
            border-radius: 3px;
            font-size: 0.9em;
        }}

        .meta-label {{
            color: #7f8c8d;
            font-weight: bold;
        }}

        .artifact-description {{
            margin: 15px 0;
            line-height: 1.8;
        }}

        .artifact-url {{
            color: #3498db;
            text-decoration: none;
            word-break: break-all;
        }}

        .artifact-url:hover {{
            text-decoration: underline;
        }}

        .key-findings {{
            list-style: none;
            padding-left: 0;
        }}

        .key-findings li {{
            padding: 10px 0;
            padding-left: 30px;
            position: relative;
        }}

        .key-findings li:before {{
            content: "▸";
            position: absolute;
            left: 0;
            color: #3498db;
            font-weight: bold;
        }}

        footer {{
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid #ecf0f1;
            color: #7f8c8d;
            font-size: 0.9em;
        }}

        @media print {{
            body {{
                background: white;
            }}
            .container {{
                box-shadow: none;
                padding: 20px;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>{metadata.get('query', 'Research Report')}</h1>
            <div class="subtitle">Generated on {metadata.get('timestamp', datetime.now().isoformat())}</div>
        </header>

        <div class="exec-summary">
            <h2>Executive Summary</h2>

            <div class="stats">
                <div class="stat-box">
                    <div class="stat-value">{summary.get('total_artifacts_found', len(artifacts))}</div>
                    <div class="stat-label">Artifacts</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${summary.get('total_estimated_value', 0):,}</div>
                    <div class="stat-label">Total Value</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">{summary.get('average_confidence_score', 0):.2f}</div>
                    <div class="stat-label">Avg Confidence</div>
                </div>
            </div>

            <h3 style="margin-top: 30px; margin-bottom: 15px;">Key Findings</h3>
            <ul class="key-findings">
"""

        for finding in summary.get('key_findings', []):
            html += f"                <li>{finding}</li>\n"

        html += """            </ul>
        </div>
"""

        # Add categorized artifacts
        for category, cat_artifacts in categorized.items():
            if not cat_artifacts:
                continue

            html += f"""
        <div class="category-section">
            <h2>{category} ({len(cat_artifacts)} artifacts)</h2>
"""

            for idx, artifact in enumerate(cat_artifacts, 1):
                # Extract nested valuation data
                valuation = artifact.get('valuation', {})
                estimated_value = valuation.get('estimated_value', artifact.get('estimated_value', 0))
                confidence_score = valuation.get('confidence_score', artifact.get('confidence_score', 0))
                year = artifact.get('date', artifact.get('year_verified', 'N/A'))

                html += f"""
            <div class="artifact">
                <div class="artifact-title">{idx}. {artifact.get('title', 'Unknown')}</div>

                <div class="artifact-meta">
                    <div class="meta-item">
                        <span class="meta-label">Type:</span> {artifact.get('type', 'N/A')}
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Value:</span> ${estimated_value:,}
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Confidence:</span> {confidence_score:.2f}
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Year:</span> {year}
                    </div>
                </div>

                <div class="artifact-description">
                    {artifact.get('description', 'No description available.')}
                </div>

                <div style="margin-top: 15px;">
                    <strong>Source:</strong>
                    <a href="{artifact.get('url', '#')}" class="artifact-url" target="_blank">
                        {artifact.get('url', 'No URL')}
                    </a>
                </div>
            </div>
"""

            html += """        </div>
"""

        # Footer
        html += f"""
        <footer>
            <p><strong>Methodology:</strong> This report was generated using automated research and analysis.</p>
            <p><strong>API Usage:</strong> {metadata.get('api_usage', {})}</p>
            <p><strong>System Version:</strong> {metadata.get('system_version', 'New New News v1.0')}</p>
        </footer>
    </div>
</body>
</html>
"""

        return html

    def _generate_csv(self, report: Dict[str, Any], output_path: str):
        """Generate CSV export"""

        artifacts = report.get('artifacts', [])

        with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = [
                'index', 'title', 'type', 'category', 'url',
                'estimated_value', 'confidence_score', 'year_verified',
                'description', 'citation_count'
            ]
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

            writer.writeheader()
            for idx, artifact in enumerate(artifacts, 1):
                # Extract nested valuation data
                valuation = artifact.get('valuation', {})
                estimated_value = valuation.get('estimated_value', artifact.get('estimated_value', 0))
                confidence_score = valuation.get('confidence_score', artifact.get('confidence_score', 0))

                writer.writerow({
                    'index': idx,
                    'title': artifact.get('title', ''),
                    'type': artifact.get('type', ''),
                    'category': artifact.get('verified_category', artifact.get('category', '')),
                    'url': artifact.get('url', ''),
                    'estimated_value': estimated_value,
                    'confidence_score': confidence_score,
                    'year_verified': artifact.get('date', artifact.get('year_verified', '')),
                    'description': artifact.get('description', ''),
                    'citation_count': len(artifact.get('sources', artifact.get('citations', [])))
                })

    def _generate_markdown(self, report: Dict[str, Any], output_path: str):
        """Generate Markdown summary"""

        metadata = report.get('metadata', {})
        artifacts = report.get('artifacts', [])
        summary = report.get('executive_summary', {})

        md = f"""# {metadata.get('query', 'Research Report')}

**Generated:** {metadata.get('timestamp', datetime.now().isoformat())}

## Executive Summary

- **Artifacts Found:** {summary.get('total_artifacts_found', len(artifacts))}
- **Total Estimated Value:** ${summary.get('total_estimated_value', 0):,}
- **Average Confidence:** {summary.get('average_confidence_score', 0):.2f}

## Key Findings

"""

        for finding in summary.get('key_findings', []):
            md += f"- {finding}\n"

        md += "\n## Top 10 Artifacts\n\n"

        for idx, artifact in enumerate(artifacts[:10], 1):
            # Extract nested valuation data
            valuation = artifact.get('valuation', {})
            estimated_value = valuation.get('estimated_value', artifact.get('estimated_value', 0))
            confidence_score = valuation.get('confidence_score', artifact.get('confidence_score', 0))

            md += f"{idx}. **{artifact.get('title', 'Unknown')}** ({artifact.get('type', 'N/A')})\n"
            md += f"   - Estimated Value: ${estimated_value:,}\n"
            md += f"   - Confidence: {confidence_score:.2f}\n"
            md += f"   - URL: {artifact.get('url', 'N/A')}\n\n"

        md += "\n## Methodology\n\n"
        md += "This report was generated using the New New News automated research system.\n\n"
        md += f"**API Usage:** {metadata.get('api_usage', {})}\n"

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(md)

    def _generate_metadata(self, report: Dict[str, Any], output_path: str):
        """Generate metadata JSON"""

        metadata = report.get('metadata', {})
        artifacts = report.get('artifacts', [])

        metadata_output = {
            "report_title": metadata.get('query', ''),
            "generated_at": metadata.get('timestamp', datetime.now().isoformat()),
            "total_artifacts": len(artifacts),
            "total_value": sum(a.get('estimated_value', 0) for a in artifacts),
            "api_usage": metadata.get('api_usage', {}),
            "system_version": metadata.get('system_version', 'New New News v1.0'),
            "categories": {}
        }

        # Count artifacts by category
        for artifact in artifacts:
            category = artifact.get('verified_category', artifact.get('category', 'General'))
            metadata_output['categories'][category] = metadata_output['categories'].get(category, 0) + 1

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(metadata_output, f, indent=2)

    def _categorize_artifacts(self, artifacts: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Categorize artifacts for organized display"""

        categories = {
            "Healthcare": [],
            "Technology": [],
            "Policy": [],
            "Education": [],
            "Business": [],
            "Culture": [],
            "General": []
        }

        for artifact in artifacts:
            category = artifact.get('verified_category', artifact.get('category', 'General'))
            if category in categories:
                categories[category].append(artifact)
            else:
                categories['General'].append(artifact)

        return categories


# CLI usage
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python report_compiler.py <input_json> [output_prefix]")
        sys.exit(1)

    input_file = sys.argv[1]
    output_prefix = sys.argv[2] if len(sys.argv) > 2 else "final_report"

    with open(input_file, 'r') as f:
        report_data = json.load(f)

    compiler = ReportCompiler()
    output_files = compiler.compile(report_data, output_prefix)

    print("\n✓ Report compilation complete!")
    print(f"  Generated {len(output_files)} files")
