"""
You.com API Client with Mock Data Support
"""

import requests
import json
from typing import Dict, List, Any, Optional
from config import (
    YOU_API_KEY,
    SEARCH_ENDPOINT,
    NEWS_ENDPOINT,
    RAG_ENDPOINT,
    CONTENTS_ENDPOINT,
    EXPRESS_ENDPOINT,
    USE_MOCK_DATA
)


class YouAPIClient:
    """Client for You.com API with mock data fallback"""

    def __init__(self, api_key: str = YOU_API_KEY, use_mock: bool = USE_MOCK_DATA):
        self.api_key = api_key
        self.use_mock = use_mock
        self.headers = {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json"
        }

    def web_search(self, query: str, num_results: int = 10) -> Dict[str, Any]:
        """
        Perform web search using You.com Search API

        Args:
            query: Search query
            num_results: Number of results to return

        Returns:
            Search results dictionary
        """
        if self.use_mock:
            return self._mock_web_search(query, num_results)

        try:
            params = {
                "query": query,
                "num_web_results": num_results
            }

            response = requests.get(
                SEARCH_ENDPOINT,
                headers=self.headers,
                params=params,
                timeout=30
            )

            response.raise_for_status()
            return response.json()

        except Exception as e:
            print(f"API Error in web_search: {e}")
            print("Falling back to mock data...")
            return self._mock_web_search(query, num_results)

    def news_search(self, query: str, count: int = 10) -> Dict[str, Any]:
        """
        Search news using You.com News API

        Args:
            query: Search query
            count: Number of news articles to return

        Returns:
            News search results dictionary
        """
        if self.use_mock:
            return self._mock_news_search(query, count)

        try:
            params = {
                "query": query,
                "count": count
            }

            response = requests.get(
                NEWS_ENDPOINT,
                headers=self.headers,
                params=params,
                timeout=30
            )

            response.raise_for_status()
            return response.json()

        except Exception as e:
            print(f"API Error in news_search: {e}")
            print("Falling back to mock data...")
            return self._mock_news_search(query, count)

    def rag_query(self, query: str, chat_history: Optional[List] = None) -> Dict[str, Any]:
        """
        Query using You.com RAG/LLM API

        Args:
            query: Question or prompt
            chat_history: Optional chat history

        Returns:
            RAG response with answer and citations
        """
        if self.use_mock:
            return self._mock_rag_query(query)

        try:
            payload = {
                "query": query,
                "chat_history": chat_history or []
            }

            response = requests.post(
                RAG_ENDPOINT,
                headers=self.headers,
                json=payload,
                timeout=30
            )

            response.raise_for_status()
            return response.json()

        except Exception as e:
            print(f"API Error in rag_query: {e}")
            print("Falling back to mock data...")
            return self._mock_rag_query(query)

    def fetch_content(self, url: str) -> Dict[str, Any]:
        """
        Fetch full content from a URL using You.com Contents API

        Args:
            url: URL to fetch content from

        Returns:
            Content data with markdown, HTML, and metadata
        """
        if self.use_mock:
            return self._mock_fetch_content(url)

        try:
            params = {
                "url": url
            }

            response = requests.get(
                CONTENTS_ENDPOINT,
                headers=self.headers,
                params=params,
                timeout=30
            )

            response.raise_for_status()
            return response.json()

        except Exception as e:
            print(f"API Error in fetch_content: {e}")
            print("Falling back to mock data...")
            return self._mock_fetch_content(url)

    def express_query(self, query: str, context: Optional[str] = None) -> Dict[str, Any]:
        """
        Query using You.com Express API for structured extraction

        Args:
            query: Question or extraction task
            context: Optional context/content to analyze

        Returns:
            Express API response with structured data
        """
        if self.use_mock:
            return self._mock_express_query(query, context)

        try:
            payload = {
                "query": query
            }

            if context:
                payload["context"] = context

            response = requests.post(
                EXPRESS_ENDPOINT,
                headers=self.headers,
                json=payload,
                timeout=30
            )

            response.raise_for_status()
            return response.json()

        except Exception as e:
            print(f"API Error in express_query: {e}")
            print("Falling back to mock data...")
            return self._mock_express_query(query, context)

    # Mock Data Methods
    def _mock_web_search(self, query: str, num_results: int) -> Dict[str, Any]:
        """Generate mock web search results"""
        mock_results = {
            "hits": [
                {
                    "title": "Pfizer and BioNTech Announce Vaccine Candidate Against COVID-19",
                    "url": "https://www.pfizer.com/news/press-release/2020/pfizer-and-biontech-announce-vaccine-candidate",
                    "snippet": "Pfizer Inc. and BioNTech SE announced their mRNA-based vaccine candidate, BNT162b2, against SARS-CoV-2 has demonstrated evidence of efficacy against COVID-19 in participants without prior evidence of SARS-CoV-2 infection, based on the first interim efficacy analysis.",
                    "description": "Official press release from Pfizer announcing 95% efficacy of the COVID-19 vaccine in Phase 3 trials, November 2020.",
                    "age": "2020-11-18"
                },
                {
                    "title": "Moderna's COVID-19 Vaccine Candidate Meets its Primary Efficacy Endpoint",
                    "url": "https://investors.modernatx.com/news/news-details/2020/",
                    "snippet": "Moderna announced that mRNA-1273, its vaccine candidate against COVID-19, has met the statistical criteria pre-specified in the study protocol for efficacy, with a vaccine efficacy of 94.1%.",
                    "description": "Moderna's Phase 3 study results showing 94.1% efficacy, representing a major breakthrough in mRNA vaccine technology.",
                    "age": "2020-11-16"
                },
                {
                    "title": "Safety and Efficacy of the BNT162b2 mRNA Covid-19 Vaccine - NEJM",
                    "url": "https://www.nejm.org/doi/full/10.1056/NEJMoa2034577",
                    "snippet": "The BNT162b2 vaccine was 95% effective in preventing Covid-19. Safety over a median of 2 months was similar to that of other viral vaccines.",
                    "description": "Peer-reviewed clinical trial data published in New England Journal of Medicine, one of the most valuable medical artifacts of 2020.",
                    "age": "2020-12-31"
                },
                {
                    "title": "FDA Takes Key Action in Fight Against COVID-19",
                    "url": "https://www.fda.gov/news-events/press-announcements/2020",
                    "snippet": "The U.S. Food and Drug Administration issued the first emergency use authorization (EUA) for a vaccine for the prevention of coronavirus disease 2019 (COVID-19).",
                    "description": "FDA Emergency Use Authorization documents for Pfizer-BioNTech COVID-19 vaccine, critical regulatory artifact from December 2020.",
                    "age": "2020-12-11"
                },
                {
                    "title": "Operation Warp Speed: Technical Implementation",
                    "url": "https://www.hhs.gov/coronavirus/explaining-operation-warp-speed/",
                    "snippet": "Operation Warp Speed facilitated and accelerated the development, manufacturing, and distribution of COVID-19 vaccines, therapeutics, and diagnostics.",
                    "description": "Government program documentation detailing the unprecedented vaccine development coordination effort.",
                    "age": "2020-12-01"
                }
            ][:num_results]
        }
        return mock_results

    def _mock_news_search(self, query: str, count: int) -> Dict[str, Any]:
        """Generate mock news search results"""
        mock_results = {
            "news": {
                "results": [
                    {
                        "title": "COVID-19 Vaccine Development Reaches Historic Milestone",
                        "url": "https://www.nytimes.com/2020/11/covid-vaccine-breakthrough",
                        "description": "Pharmaceutical companies announced unprecedented success rates in COVID-19 vaccine trials, marking the fastest vaccine development in history.",
                        "published_date": "2020-11-20",
                        "source": "The New York Times",
                        "thumbnail": "https://example.com/vaccine-news.jpg"
                    },
                    {
                        "title": "First COVID-19 Vaccine Authorized for Emergency Use",
                        "url": "https://www.reuters.com/health/2020/12/fda-authorization",
                        "description": "The FDA granted emergency use authorization for the first COVID-19 vaccine in the United States, a pivotal moment in the pandemic response.",
                        "published_date": "2020-12-11",
                        "source": "Reuters",
                        "thumbnail": "https://example.com/fda-news.jpg"
                    },
                    {
                        "title": "Groundbreaking mRNA Technology Powers COVID Vaccines",
                        "url": "https://www.science.org/2020/mrna-technology",
                        "description": "Scientists explain how messenger RNA technology enabled rapid development of highly effective COVID-19 vaccines.",
                        "published_date": "2020-12-15",
                        "source": "Science Magazine",
                        "thumbnail": "https://example.com/mrna-news.jpg"
                    }
                ][:count]
            }
        }
        return mock_results

    def _mock_rag_query(self, query: str) -> Dict[str, Any]:
        """Generate mock RAG/LLM response"""
        mock_response = {
            "answer": """Based on comprehensive research, the most significant professional artifacts from 2020 related to COVID-19 vaccine development include:

1. **BNT162b2 (Pfizer-BioNTech) Clinical Trial Data** - Published in the New England Journal of Medicine, this peer-reviewed research demonstrated 95% efficacy and established the safety profile of the first mRNA vaccine authorized for emergency use. Estimated professional value: $50-100 million in research impact.

2. **mRNA-1273 (Moderna) Phase 3 Study Protocol and Results** - The complete study protocol and efficacy data showing 94.1% effectiveness, representing a breakthrough in mRNA vaccine technology. Value: $40-80 million.

3. **FDA Emergency Use Authorization Documents** - The regulatory submissions and review documents for COVID-19 vaccines, including safety data, manufacturing specifications, and authorization letters. These artifacts set precedents for future pandemic responses. Value: $30-60 million.

4. **Operation Warp Speed Technical Documentation** - Government coordination framework that accelerated vaccine development timelines from years to months, including partnership agreements, funding mechanisms, and distribution plans. Value: $25-50 million.

5. **WHO COVID-19 Vaccine Development Guidelines** - International standards and protocols for COVID-19 vaccine development, testing, and deployment. Value: $20-40 million.

These artifacts collectively represent over $200 million in professional deliverable value and have shaped the trajectory of global vaccine development.""",
            "citations": [
                {
                    "title": "Safety and Efficacy of the BNT162b2 mRNA Covid-19 Vaccine",
                    "url": "https://www.nejm.org/doi/full/10.1056/NEJMoa2034577",
                    "snippet": "The BNT162b2 vaccine was 95% effective in preventing Covid-19.",
                    "source": "New England Journal of Medicine"
                },
                {
                    "title": "Efficacy and Safety of the mRNA-1273 SARS-CoV-2 Vaccine",
                    "url": "https://www.nejm.org/doi/full/10.1056/NEJMoa2035389",
                    "snippet": "The mRNA-1273 vaccine showed 94.1% efficacy at preventing Covid-19 illness.",
                    "source": "New England Journal of Medicine"
                },
                {
                    "title": "FDA Emergency Use Authorization for Pfizer-BioNTech",
                    "url": "https://www.fda.gov/emergency-preparedness-and-response/coronavirus-disease-2019-covid-19/pfizer-biontech-covid-19-vaccine",
                    "snippet": "FDA issued emergency use authorization for the Pfizer-BioNTech COVID-19 Vaccine.",
                    "source": "U.S. Food and Drug Administration"
                }
            ]
        }
        return mock_response

    def _mock_fetch_content(self, url: str) -> Dict[str, Any]:
        """Generate mock content fetch results"""
        mock_content = {
            "url": url,
            "markdown": """# Pfizer and BioNTech Announce Vaccine Candidate

## November 18, 2020

Pfizer Inc. and BioNTech SE announced their mRNA-based vaccine candidate, BNT162b2, against SARS-CoV-2 has demonstrated evidence of efficacy against COVID-19.

### Key Findings

- **Efficacy Rate**: 95% effective
- **Study Population**: 43,000+ participants
- **Timeline**: Fastest vaccine development in history
- **Estimated Value**: Phase 3 clinical trial data valued at $50-100 million

The vaccine candidate demonstrated efficacy against COVID-19 in participants without prior evidence of SARS-CoV-2 infection, based on the first interim efficacy analysis conducted on November 18, 2020.

This represented a major breakthrough in vaccine development, utilizing novel mRNA technology that could be adapted for future pandemics.""",
            "html": "<html><body><h1>Pfizer and BioNTech Announce Vaccine Candidate</h1><p>Pfizer Inc. and BioNTech SE announced their mRNA-based vaccine candidate...</p></body></html>",
            "title": "Pfizer and BioNTech Announce Vaccine Candidate Against COVID-19",
            "published_date": "2020-11-18",
            "author": "Pfizer Inc.",
            "word_count": 1250
        }
        return mock_content

    def _mock_express_query(self, query: str, context: Optional[str] = None) -> Dict[str, Any]:
        """Generate mock Express API response"""

        # Different responses based on query type
        if "decompose" in query.lower() or "sub-queries" in query.lower() or "queries for" in query.lower():
            # Query decomposition mock
            return {
                "answer": json.dumps({
                    "queries": [
                        "COVID-19 vaccine development 2020",
                        "mRNA technology breakthrough 2020",
                        "FDA emergency use authorization COVID vaccines 2020",
                        "Zoom video conferencing growth 2020",
                        "remote work platforms 2020",
                        "N95 mask manufacturing 2020",
                        "contact tracing apps 2020",
                        "telehealth adoption 2020",
                        "ventilator production 2020",
                        "WHO pandemic guidelines 2020",
                        "stimulus package 2020 CARES Act",
                        "online education platforms 2020",
                        "Netflix pandemic content 2020",
                        "essential worker protocols 2020",
                        "quarantine hotel systems 2020",
                        "COVID testing innovations 2020",
                        "social distancing technology 2020",
                        "grocery delivery services 2020",
                        "work from home security tools 2020",
                        "pandemic modeling software 2020"
                    ]
                }),
                "confidence": 0.95
            }
        else:
            # Structured data extraction mock
            return {
                "answer": json.dumps({
                    "year_confirmed": "2020",
                    "price_data": "Phase 3 clinical trial: $50-100 million",
                    "estimated_value": 75000000,
                    "confidence": 0.92,
                    "supporting_quote": "Pfizer Inc. and BioNTech SE announced their mRNA-based vaccine candidate, BNT162b2, demonstrated 95% efficacy in Phase 3 trials completed in November 2020.",
                    "contradictions": [],
                    "category": "Healthcare - Clinical Trials"
                }),
                "confidence": 0.92
            }


# Example usage
if __name__ == "__main__":
    client = YouAPIClient(use_mock=True)

    print("Testing Web Search API:")
    print("-" * 80)
    search_results = client.web_search("COVID-19 vaccine development 2020")
    print(json.dumps(search_results, indent=2))

    print("\n\nTesting News API:")
    print("-" * 80)
    news_results = client.news_search("2020 COVID vaccine breakthrough")
    print(json.dumps(news_results, indent=2))

    print("\n\nTesting RAG/LLM API:")
    print("-" * 80)
    rag_results = client.rag_query("What were the most valuable COVID-19 vaccine artifacts from 2020?")
    print(json.dumps(rag_results, indent=2))
