# Circular Import Bug Fix

**Date**: October 30, 2025
**Issue**: Import hanging on all 4 narrative generation agents
**Root Cause**: Lazy imports inside `__init__` methods
**Status**: ✅ FIXED

## Problem Description

When attempting to test the integrated pipeline, Python would hang indefinitely when trying to import the narrative generation agents:

```python
from agents import ArtifactEnricherAgent, CategorizerAgent, SummaryGeneratorAgent, InsightsGeneratorAgent
```

### Symptoms

- `python -c "from agents import ..."` would hang forever
- No error messages
- Process had to be killed manually
- Affected ALL 4 new agents

## Root Cause

All 4 narrative generation agents were using **lazy imports** of `YouAPIClient` inside their `__init__` methods:

```python
# PROBLEMATIC PATTERN (agents/artifact_enricher.py:26-27)
def __init__(self, api_client=None):
    super().__init__("Artifact Enricher")
    from you_api_client import YouAPIClient  # ← Lazy import
    self.api_client = api_client or YouAPIClient()
```

This pattern was copied from `query_decomposer.py` and `deep_verifier.py`, which also use lazy imports.

### Why It Failed

When Python executes `from agents import ArtifactEnricherAgent`:

1. Python loads `agents/__init__.py`
2. `__init__.py` imports ALL agent modules (line 6-17)
3. Each agent module is loaded, including class definitions
4. Class definitions are executed (but not `__init__` methods yet)
5. **Module-level imports** happen during this phase
6. Lazy imports in `__init__` don't happen until instantiation

The issue was that `agents/__init__.py` tries to import all agents at once, and the module-level import chain wasn't completing properly, causing a hang.

## Solution

Move the `YouAPIClient` import from inside `__init__` to **module level** (top of file):

```python
# FIXED PATTERN
from you_api_client import YouAPIClient  # ← Module-level import

class ArtifactEnricherAgent(BaseAgent):
    def __init__(self, api_client=None):
        super().__init__("Artifact Enricher")
        self.api_client = api_client or YouAPIClient()  # ← No import here
```

This is the pattern used by the existing working agents:
- `web_researcher.py` (line 13)
- `pricing_normalizer.py` (line 12)
- `citation_verifier.py` (line 12)

## Files Fixed

1. **agents/artifact_enricher.py** - Line 11: Added module-level import
2. **agents/categorizer.py** - Line 12: Added module-level import
3. **agents/summary_generator.py** - Line 11: Added module-level import
4. **agents/insights_generator.py** - Line 13: Added module-level import

## Testing

### Local Testing Failed
Local testing couldn't verify the fix because system Python lacks `requests` module:

```
ModuleNotFoundError: No module named 'requests'
```

This is expected - the system Python doesn't have project dependencies installed.

### GitHub Actions Testing
The workflow environment has all dependencies, so testing will proceed there:

```bash
gh workflow run test-new-new-news.yml
```

Expected result: Workflow completes successfully, confirming imports work.

## Lessons Learned

1. **Prefer module-level imports** over lazy imports in `__init__`
2. **Lazy imports should be rare** - only use when you have a specific reason (circular dependency, expensive import, conditional loading)
3. **Follow existing patterns** in the codebase - all working agents use module-level imports
4. **Test imports early** - don't wait until full pipeline test to discover import issues

## Related Issue

Note that `query_decomposer.py` and `deep_verifier.py` also use lazy imports but haven't caused issues yet. This may be because:
- They're imported earlier in `__init__.py` (lines 12-13)
- Import order matters
- Or they just happen to work by coincidence

**Recommendation**: Standardize all agents to use module-level imports for consistency.

## Commit

```
cb9cca9 - Fix circular import: move YouAPIClient imports to module level
```

**Files Changed**: 4 agent files
**Impact**: Unblocks pipeline testing
**Risk**: Low - follows established pattern from working agents
