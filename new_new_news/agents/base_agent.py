"""
Base Agent class for New New News multi-agent system
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List
import json


class BaseAgent(ABC):
    """Abstract base class for all agents in the system"""

    def __init__(self, name: str):
        self.name = name
        self.execution_history: List[Dict[str, Any]] = []

    @abstractmethod
    def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the agent's primary function

        Args:
            input_data: Input data dictionary

        Returns:
            Output data dictionary
        """
        pass

    def log_execution(self, input_data: Dict[str, Any], output_data: Dict[str, Any]):
        """Log execution for audit trail"""
        self.execution_history.append({
            "agent": self.name,
            "input": input_data,
            "output": output_data
        })

    def get_status(self) -> Dict[str, Any]:
        """Get agent status and execution history"""
        return {
            "name": self.name,
            "executions": len(self.execution_history),
            "history": self.execution_history
        }

    def __repr__(self):
        return f"{self.__class__.__name__}(name='{self.name}')"
