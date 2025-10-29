# New New News - 2020 Human Artifacts Index

**A multi-agent research system powered by You.com APIs**

You.com Hackathon Submission - October 2025

---

## Overview

New New News is a sophisticated multi-agent AI system that researches and catalogs the "2020 Human Artifacts Index" - the 100 most valuable professional deliverables from 2020. The system uses You.com's Web Search, News, and RAG APIs to find, verify, value, and document significant professional artifacts from 2020.

### What are "2020 Human Artifacts"?

Professional deliverables from 2020 that had significant impact, including:
- Research papers (e.g., COVID-19 vaccine trials)
- Clinical trial data
- Regulatory submissions (FDA authorizations)
- Open source software releases
- Policy documents
- Technical specifications
- Datasets
- Patents

---

## Architecture

### Multi-Agent System (5 Agents)

```
User Query → Orchestrator → Web Researcher → Pricing Normalizer → Citation Verifier → Report Composer
```

#### 1. **Orchestrator Agent**
- Parses user queries
- Develops research strategy
- Generates optimized search queries
- Coordinates agent workflow

#### 2. **Web Researcher Agent**
- Uses **You.com Web Search API** to find sources
- Uses **You.com News API** for news coverage
- Extracts potential artifacts from results
- Ranks by relevance

#### 3. **Pricing Normalizer Agent**
- Estimates professional value of artifacts
- Uses **You.com RAG/LLM API** for context
- Handles data scarcity with multi-factor analysis
- Provides confidence scores

#### 4. **Citation Verifier Agent**
- Ensures 2-3 quality sources per artifact
- Finds additional sources if needed
- Validates source quality
- Cross-checks facts

#### 5. **Report Composer Agent**
- Generates structured reports
- Supports JSON, Markdown, and HTML output
- Creates executive summaries
- Produces artifact index entries

---

## You.com API Integration

This project uses **3 You.com API endpoints**:

### 1. Web Search API
```python
GET https://api.ydc-index.io/search
Headers: X-API-Key: YOUR_KEY
Params: query, num_web_results
```
Used by: Web Researcher Agent

### 2. News API
```python
GET https://api.ydc-index.io/news
Headers: X-API-Key: YOUR_KEY
Params: query, count
```
Used by: Web Researcher Agent

### 3. Web LLM/RAG API
```python
POST https://api.ydc-index.io/rag
Headers: X-API-Key: YOUR_KEY
Body: {query, chat_history}
```
Used by: Pricing Normalizer Agent

---

## Installation

### Prerequisites
- Python 3.8+
- You.com API key

### Setup

```bash
# Clone the repository
cd new_new_news

# Install dependencies
pip install -r requirements.txt

# Configure your API key
# Edit config.py and add your You.com API key
```

---

## Usage

### Quick Start - Demo Mode (Mock Data)

Run the demo to see the system in action with mock data:

```bash
python demo.py
```

This will run 3 sample queries and generate reports.

### Real API Usage

Once your You.com API key is activated:

```bash
# Edit config.py and set USE_MOCK_DATA = False

# Run a query
python main.py "Find 2020 artifacts related to COVID vaccine development" --max-artifacts 10
```

### Command Line Options

```bash
python main.py "YOUR QUERY" [OPTIONS]

Options:
  --max-artifacts N     Maximum artifacts to find (default: 10)
  --format FORMAT       Output format: json|markdown|html (default: json)
  --output FILE         Output filename (default: research_report.json)
  --no-mock            Use real You.com API (disable mock data)
```

### Example Queries

```bash
# COVID-19 research
python main.py "Find 2020 artifacts related to COVID vaccine development" --max-artifacts 10

# AI/ML research
python main.py "2020 artificial intelligence breakthroughs and research papers" --max-artifacts 10

# Open source software
python main.py "significant open source software releases from 2020" --max-artifacts 10

# Generate Markdown report
python main.py "2020 regulatory submissions FDA" --format markdown --output fda_report.md

# Generate HTML report
python main.py "2020 clinical trials COVID" --format html --output trials.html
```

---

## Project Structure

```
new_new_news/
├── main.py                 # Main orchestration system
├── demo.py                 # Demo script with sample queries
├── config.py               # Configuration and API settings
├── you_api_client.py       # You.com API client with mock support
├── requirements.txt        # Python dependencies
├── README.md              # This file
├── agents/
│   ├── __init__.py
│   ├── base_agent.py      # Base agent class
│   ├── orchestrator.py    # Orchestrator agent
│   ├── web_researcher.py  # Web researcher agent (uses You.com Search & News APIs)
│   ├── pricing_normalizer.py  # Pricing normalizer (uses You.com RAG API)
│   ├── citation_verifier.py   # Citation verifier
│   └── report_composer.py     # Report composer
└── outputs/               # Generated reports (created at runtime)
```

---

## API Key Setup

### Getting Your You.com API Key

1. Visit https://api.you.com
2. Sign up or log in
3. Generate an API key
4. Copy your key (format: `ydc-sk-...`)

### Configuring the System

Edit `config.py`:

```python
# Add your API key
YOU_API_KEY = "ydc-sk-YOUR-KEY-HERE"

# Disable mock mode to use real API
USE_MOCK_DATA = False
```

### Testing Your API Key

```bash
# Run the simple API test
python test_you_api_simple.py
```

If you see 403 errors, your API key may need activation. Contact You.com support.

---

## Output Formats

### JSON Report
Complete structured data with all metadata:
```json
{
  "metadata": {...},
  "executive_summary": {...},
  "artifacts": [...],
  "statistics": {...}
}
```

### Markdown Report
Human-readable format with sections:
- Executive Summary
- Key Findings
- Top 3 Artifacts
- Detailed Artifact Index

### HTML Report
Styled web page with:
- Professional formatting
- Color-coded values
- Citation links
- Statistics

---

## Example Output

```
RESEARCH WORKFLOW COMPLETED
================================================================================
Duration: 5.23 seconds
Artifacts Found: 5
Total Value: $1,850,000
================================================================================

TOP 3 ARTIFACTS:
1. Safety and Efficacy of the BNT162b2 mRNA Covid-19 Vaccine
   Type: Research Paper
   Value: $500,000
   Confidence: 0.85

2. FDA Emergency Use Authorization - Pfizer-BioNTech
   Type: Regulatory Submission
   Value: $450,000
   Confidence: 0.90

3. Moderna mRNA-1273 Phase 3 Clinical Trial Data
   Type: Clinical Trial Data
   Value: $400,000
   Confidence: 0.88
```

---

## Development Roadmap

### Current Features ✓
- [x] Multi-agent orchestration system
- [x] You.com Web Search API integration
- [x] You.com News API integration
- [x] You.com RAG/LLM API integration
- [x] Mock data support for development
- [x] Multi-factor valuation system
- [x] Citation verification (2-3 sources)
- [x] JSON/Markdown/HTML output
- [x] Executive summaries
- [x] Demo mode

### Future Enhancements
- [ ] Interactive web UI
- [ ] Database storage for artifacts
- [ ] Advanced filtering and search
- [ ] Artifact comparison tools
- [ ] Export to PDF
- [ ] Batch processing for 100+ artifacts
- [ ] Custom valuation models
- [ ] Machine learning for artifact classification

---

## Troubleshooting

### API Key Issues

**Problem:** Getting 403 "Access denied" errors

**Solutions:**
1. Verify your API key is correct in `config.py`
2. Check if your key needs activation at https://api.you.com
3. Ensure you have access to all required endpoints
4. Use mock mode while resolving: `USE_MOCK_DATA = True`

### Mock vs Real Data

**Problem:** Want to test without API

**Solution:** Keep `USE_MOCK_DATA = True` in `config.py`

**Problem:** Ready to use real API

**Solution:** Set `USE_MOCK_DATA = False` and run with `--no-mock`

---

## Technical Details

### Dependencies
- `requests` - HTTP client for API calls
- Python 3.8+ - Core runtime

### API Rate Limits
- Web Search API: Check You.com documentation
- News API: Check You.com documentation
- RAG API: Check You.com documentation

### Performance
- Average query time: 5-15 seconds (depends on API latency)
- Concurrent requests: Sequential by default
- Caching: Not implemented (future enhancement)

---

## Contributing

This is a hackathon project. Contributions welcome!

### Ideas for Contribution
1. Add more artifact classification types
2. Improve valuation algorithms
3. Build web UI
4. Add database persistence
5. Create data visualizations
6. Enhance citation verification logic

---

## License

MIT License - See LICENSE file

---

## Hackathon Submission Details

**Project:** New New News - 2020 Human Artifacts Index

**Hackathon:** You.com API Hackathon (October 2025)

**Submission Date:** October 31, 2025

**You.com APIs Used:**
1. Web Search API - For finding artifact sources
2. News API - For news coverage and announcements
3. Web LLM/RAG API - For context and synthesis

**Key Features:**
- Multi-agent AI system with 5 specialized agents
- Automated research and valuation
- Citation verification
- Multiple output formats
- Mock data support for testing

**Demo:** Run `python demo.py` to see the system in action

---

## Contact

For questions about this project:
- Open an issue on GitHub
- Check the documentation at https://documentation.you.com

---

## Acknowledgments

- You.com for providing the API platform
- The open research community for 2020 artifacts
- All contributors to this project

---

**Built with You.com APIs for the You.com Hackathon 2025**
