"""
Orchestrator Agent - Plans and coordinates the research strategy
"""

from typing import Dict, Any, List
from .base_agent import BaseAgent


class OrchestratorAgent(BaseAgent):
    """
    Orchestrator Agent: Plans research strategy and coordinates other agents

    Responsibilities:
    - Parse user queries
    - Develop research strategy
    - Coordinate agent execution
    - Manage workflow
    """

    def __init__(self):
        super().__init__("Orchestrator")

    def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Plan research strategy based on user query

        Args:
            input_data: {"query": str, "max_artifacts": int}

        Returns:
            Research plan with search strategies
        """
        query = input_data.get("query", "")
        max_artifacts = input_data.get("max_artifacts", 10)

        # Analyze query and develop strategy
        research_plan = self._create_research_plan(query, max_artifacts)

        output = {
            "query": query,
            "research_plan": research_plan,
            "search_queries": research_plan["search_queries"],
            "expected_artifact_types": research_plan["artifact_types"]
        }

        self.log_execution(input_data, output)
        return output

    def _create_research_plan(self, query: str, max_artifacts: int) -> Dict[str, Any]:
        """
        Create a comprehensive research plan

        Args:
            query: User query
            max_artifacts: Maximum number of artifacts to find

        Returns:
            Research plan dictionary
        """
        # Extract key terms and topics from query
        query_lower = query.lower()

        # Determine artifact types based on query
        artifact_types = []
        if any(term in query_lower for term in ["research", "paper", "study"]):
            artifact_types.append("Research Papers")
        if any(term in query_lower for term in ["trial", "clinical", "test"]):
            artifact_types.append("Clinical Trial Data")
        if any(term in query_lower for term in ["regulatory", "fda", "approval"]):
            artifact_types.append("Regulatory Submissions")
        if any(term in query_lower for term in ["software", "code", "open source"]):
            artifact_types.append("Software/Code Releases")
        if any(term in query_lower for term in ["policy", "government"]):
            artifact_types.append("Policy Documents")

        # Default to all types if none specified
        if not artifact_types:
            artifact_types = ["Research Papers", "Clinical Trial Data", "Regulatory Submissions"]

        # Generate search queries
        search_queries = self._generate_search_queries(query, artifact_types)

        return {
            "original_query": query,
            "max_artifacts": max_artifacts,
            "artifact_types": artifact_types,
            "search_queries": search_queries,
            "strategy": {
                "phase_1": "Web search for primary sources",
                "phase_2": "News search for announcements and coverage",
                "phase_3": "RAG synthesis for context and valuation",
                "phase_4": "Citation verification (2-3 sources per artifact)",
                "phase_5": "Final report composition"
            }
        }

    def _generate_search_queries(self, query: str, artifact_types: List[str]) -> List[str]:
        """
        Generate specific search queries based on user query and artifact types

        Args:
            query: Original user query
            artifact_types: Types of artifacts to find

        Returns:
            List of optimized search queries
        """
        base_query = query
        queries = [base_query]

        # Add year constraint
        queries.append(f"{base_query} 2020")

        # Add artifact-type specific queries
        for artifact_type in artifact_types:
            if artifact_type == "Research Papers":
                queries.append(f"{base_query} research paper 2020 peer reviewed")
            elif artifact_type == "Clinical Trial Data":
                queries.append(f"{base_query} clinical trial data 2020")
            elif artifact_type == "Regulatory Submissions":
                queries.append(f"{base_query} FDA regulatory submission 2020")
            elif artifact_type == "Software/Code Releases":
                queries.append(f"{base_query} open source software 2020 github")
            elif artifact_type == "Policy Documents":
                queries.append(f"{base_query} policy document 2020 government")

        # Limit to top queries
        return queries[:5]
