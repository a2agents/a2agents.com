"""
New New News - Multi-Agent System
Agents for the 2020 Human Artifacts Index
"""

from .base_agent import BaseAgent
from .orchestrator import OrchestratorAgent
from .web_researcher import WebResearcherAgent
from .pricing_normalizer import PricingNormalizerAgent
from .citation_verifier import CitationVerifierAgent
from .report_composer import ReportComposerAgent
from .query_decomposer import QueryDecomposerAgent
from .deep_verifier import DeepVerifierAgent

__all__ = [
    "BaseAgent",
    "OrchestratorAgent",
    "WebResearcherAgent",
    "PricingNormalizerAgent",
    "CitationVerifierAgent",
    "ReportComposerAgent",
    "QueryDecomposerAgent",
    "DeepVerifierAgent"
]
