# You.com API Endpoints Failing - Blocking New New News System

## Summary
The New New News multi-agent research system cannot retrieve real data because 2 of 3 required You.com API endpoints are non-functional. Both tested API keys authenticate successfully but `/news` and `/rag` endpoints fail with server errors.

## Status
🔴 **Blocked** - System falls back to mock data, cannot produce real research results

## Impact
- Web Researcher agent cannot search news archives for 2020 artifacts
- Pricing Normalizer agent cannot use RAG for valuation estimates
- System completes but outputs fictional data ($500k+ valuations)
- GitHub Actions workflow affected (uses mock data)

## Technical Details

### API Endpoints Tested

| Endpoint | Status | Response | Impact |
|----------|--------|----------|--------|
| `/search` | ✅ Working | 200 OK | Not currently used by system |
| `/news` | ❌ Failing | 500 Internal Server Error | Web research blocked |
| `/rag` | ❌ Failing | 403 Forbidden | Pricing analysis blocked |

### Error Messages

**News Endpoint:**
```
API Error in news_search: 500 Server Error: Internal Server Error
for url: https://api.ydc-index.io/news?query=COVID+vaccine&count=5
```

**RAG Endpoint:**
```
API Error in rag_query: 403 Client Error: Forbidden
for url: https://api.ydc-index.io/rag
Response: {"message":"Missing Authentication Token"}
```

### Reproduction

```bash
# Test news endpoint (fails)
curl -X GET 'https://api.ydc-index.io/news?query=test&count=3' \
  -H 'X-API-Key: ydc-sk-0c63d432e2d74341-...'
# Returns: Internal Server Error

# Test RAG endpoint (fails)
curl -X POST 'https://api.ydc-index.io/rag' \
  -H 'X-API-Key: ydc-sk-0c63d432e2d74341-...' \
  -H 'Content-Type: application/json' \
  -d '{"query": "test"}'
# Returns: {"message":"Missing Authentication Token"}

# Test search endpoint (works)
curl -X GET 'https://api.ydc-index.io/search?query=test&num_web_results=3' \
  -H 'X-API-Key: ydc-sk-0c63d432e2d74341-...'
# Returns: 200 OK with results
```

## Investigation Summary

### What We Tested
- ✅ Both API keys authenticate successfully (work with `/search`)
- ✅ Keys are properly configured (organization secret in GitHub)
- ✅ Python environment and dependencies working
- ✅ Code logic is correct (gracefully falls back to mock data)
- ❌ Same failures occur from local machine and GitHub Actions
- ❌ Same failures with both API keys
- ❌ Direct curl tests confirm endpoint issues

### Root Cause
Not a code or configuration issue. The You.com API endpoints themselves are:
- **News endpoint:** Experiencing server-side 500 errors
- **RAG endpoint:** Rejecting authentication or not available in our plan

## Blockers

1. **Unknown API Plan Limitations**
   - Is `/news` endpoint included in our API plan tier?
   - Is `/rag` endpoint included in our API plan tier?
   - Documentation doesn't clarify endpoint availability by plan

2. **Server-Side Errors**
   - `/news` returning 500 suggests backend issues
   - May be temporary or ongoing service problem

3. **Authentication Method Unclear**
   - `/rag` says "Missing Authentication Token" despite valid X-API-Key
   - May require different auth method (Bearer token?) or additional setup

## Next Steps

### Option 1: Contact You.com Support ⭐ Recommended
**Questions for support:**
- Why is `/news` endpoint returning 500 Internal Server Error?
- Is `/rag` endpoint available in our API plan tier?
- Does `/rag` require different authentication (Bearer token, etc.)?
- What is the correct way to authenticate RAG requests?
- Are there any service outages or scheduled maintenance?

**Support contact:** Check https://api.you.com or You.com dashboard for support options

**Expected resolution time:** Unknown

### Option 2: Refactor Code to Use Working Endpoint
**Approach:**
- Modify `WebResearcherAgent` to use `/search` instead of `/news`
- Modify `PricingNormalizerAgent` to use `/search` or alternative method
- Update `you_api_client.py` with fallback strategies

**Pros:**
- Unblocks development immediately
- `/search` endpoint proven to work
- Can deliver partial functionality

**Cons:**
- `/news` likely better for time-filtered 2020 artifact searches
- `/rag` provides contextual reasoning for pricing estimates
- May need refactor work undone if endpoints become available
- Reduced quality of research results

**Estimated effort:** 4-8 hours

### Option 3: Use Mock Data for Development (Not Recommended)
- Continue testing with mock data
- Wait for API resolution
- Cannot produce real results

## Recommendation

**Immediate:** Contact You.com support to determine if this is a service issue or plan limitation.

**Parallel:** Begin refactoring code to use `/search` endpoint as backup plan if support indicates these endpoints won't be available.

## Files & Resources

**Test scripts created:**
- `test_you_api.sh` - Quick endpoint test script
- `test_new_key.sh` - Test with alternate API key
- `run_new_new_news.sh` - Wrapper to run system with API key

**Documentation:**
- `API_STATUS_REPORT.md` - Detailed technical investigation report

**API Keys tested:**
- Key 1: `ydc-sk-ee8bd1fdc14d83e4-...` (same results)
- Key 2: `ydc-sk-0c63d432e2d74341-...` (same results)

Both keys stored as `YOU_API_KEY` organization secret in GitHub.

## Environment
- Platform: macOS, GitHub Actions (Ubuntu)
- Python: 3.13.6
- Dependencies: requests 2.32.5
- API Base: https://api.ydc-index.io

## Related Work
- ✅ GitHub Actions workflow fixed (updated upload-artifact to v4)
- ✅ Organization secret configured and accessible
- ✅ Virtual environment created with dependencies
- ✅ System architecture complete and functional
- ❌ Blocked on API endpoint availability

## Timeline
- **Oct 28**: Initial system development complete
- **Oct 29**: API integration testing reveals endpoint failures
- **Oct 29**: Confirmed failures with multiple API keys and environments
- **Oct 29**: Issue documented, awaiting resolution path

---

**Priority:** High - Blocking production functionality
**Type:** External Dependency / API Issue
**Team:** Needs escalation to You.com support
