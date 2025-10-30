# Gemini-Style Narrative Reports - Implementation Roadmap

**Status:** Phase 1 In Progress
**Start Date:** October 30, 2025
**Est. Completion:** 3 weeks (54-72 hours)

---

## Executive Summary

Transforming the New New News report generation system to produce McKinsey/BCG-grade narrative reports instead of generic artifact catalogs. This enhancement adds:

- **Rich Artifact Profiles**: 4-field enrichment (description, producer teams, client context, significance)
- **Intelligent Categorization**: 3-5 meaningful categories that reveal patterns
- **Executive Summary**: 2-3 paragraph narrative with data-backed key patterns
- **Insights Section**: 3-5 non-obvious insights with evidence
- **Professional PDF Design**: Consulting-report quality layout and typography

---

## Implementation Phases

### Phase 1: Core Enrichment ✅ (IN PROGRESS)
**Goal:** Enrich artifacts with detailed 4-field profiles

**Status:**
- ✅ `ArtifactEnricherAgent` created with batch processing (5 artifacts/call)
- ✅ Validation and fallback logic implemented
- ✅ Committed to main branch

**Next Steps:**
- Integrate enricher into main.py generate_report() pipeline
- Test with real API calls
- Update report_compiler.py to pass enriched data to PDF

**Files Created:**
- `agents/artifact_enricher.py` (251 lines)

---

### Phase 2: Categorization & Layout (PLANNED)
**Goal:** Group artifacts into meaningful categories, update PDF layout

**Components to Build:**
1. **Categorizer Agent** (`agents/categorizer.py`)
   - Takes enriched artifacts
   - Uses Express API to group into 3-5 categories
   - Returns categories with descriptions and artifact indices
   - Validation: all artifacts assigned exactly once
   - Fallback: group by type if API fails

2. **Styling Module** (`report/styles.py`)
   - Define all PDF styling constants
   - Colors, fonts, spacing
   - Reusable across PDF components

3. **PDF Layout Update** (`report_compiler.py`)
   - Category-based artifact display
   - Category headers with descriptions
   - Visual hierarchy

**Est. Time:** 10-14 hours

---

### Phase 3: Narrative Generation (PLANNED)
**Goal:** Add executive summary and insights sections

**Components to Build:**
1. **Executive Summary Generator** (`agents/summary_generator.py`)
   - Generate 2-3 paragraph narrative
   - Extract key patterns (3-4 bullet points)
   - Value distribution insight
   - Single-sentence key finding
   - Professional McKinsey tone

2. **Insights Generator** (`agents/insights_generator.py`)
   - Generate 3-5 non-obvious insights
   - Types: temporal, concentration, producer, thematic, anomaly
   - Deduplication vs executive summary
   - Quality scoring
   - Evidence-based interpretation

3. **PDF Narrative Sections**
   - Executive summary at top
   - Insights section after categories
   - Methodology section at end

**Est. Time:** 12-16 hours

---

### Phase 4: Optimization & Polish (PLANNED)
**Goal:** Performance and quality improvements

**Tasks:**
1. Batch enrichment optimization (already implemented in Phase 1)
2. Parallel exec summary + insights generation
3. Comprehensive validation framework
4. Quality metrics dashboard
5. PDF design refinements
6. Documentation

**Est. Time:** 14-18 hours

---

### Phase 5: Testing & Deployment (PLANNED)
**Goal:** Production readiness

**Tasks:**
1. Integration testing with diverse queries
2. Edge case testing
3. Quality assurance (manual review)
4. Performance benchmarking
5. Cost tracking
6. GitHub Actions workflow updates

**Est. Time:** 10-12 hours

---

## Data Pipeline Evolution

### Current Pipeline
```
Query → Web Research → Content Analysis → Valuation → PDF
```

### Enhanced Pipeline
```
Query → Web Research → Content Analysis → Valuation
  → Artifact Enrichment (NEW)
  → Categorization (NEW)
  → Executive Summary (NEW)
  → Insights (NEW)
  → Enhanced PDF
```

---

## API Usage & Cost Estimates

### Per 25-Artifact Report

**Current System:**
- Search API: 25 calls
- Contents API: ~75 calls
- Total: ~100 calls
- Processing Time: ~105 seconds

**Enhanced System (Optimized):**
- Search API: 25 calls
- Contents API: ~75 calls
- Express API (Enrichment): 5 calls (batched)
- Express API (Categorization): 1 call
- Express API (Exec Summary): 1 call
- Express API (Insights): 1 call
- **Total: ~108 calls**
- **Processing Time: ~131 seconds** (2.2 min)

**Token Usage:**
- Enrichment: ~10K tokens (batched)
- Categorization: ~3K tokens
- Exec Summary: ~3K tokens
- Insights: ~3K tokens
- **Total: ~19K tokens**

**Cost:** ~$0.75 per report (with batching)

---

## Key Design Decisions

### 1. Batch Enrichment
**Decision:** Process 5 artifacts per API call instead of 25 individual calls
**Rationale:** Reduces API calls from 25 to 5, saving 40 seconds and reducing costs
**Implementation:** Single prompt with array of artifacts, returns array of profiles

### 2. Professional Tone
**Decision:** McKinsey/BCG consulting report style, not academic or casual
**Rationale:** Target audience is business decision-makers who pay for consulting reports
**Implementation:** Explicit prompt instructions: "avoid generic consulting-speak", use specific data

### 3. Non-Obvious Insights
**Decision:** Insights must reveal patterns not stated in executive summary
**Rationale:** Avoid redundancy, provide additional value
**Implementation:** Deduplication check, quality scoring, 5 insight types

### 4. Fallback Strategy
**Decision:** Every component has fallback generator if API fails
**Rationale:** Always produce *something*, even if degraded quality
**Implementation:** Fallback methods for enrichment, categorization, summaries, insights

### 5. Validation Framework
**Decision:** Comprehensive quality checks at each stage
**Rationale:** Catch poor outputs early, provide quality metrics
**Implementation:** Validation methods with scoring (0-1), issue/warning lists

---

## Success Criteria

### Technical
- [ ] All 25 artifacts enriched (90%+ non-fallback)
- [ ] 3-5 meaningful categories (quality score > 0.7)
- [ ] Executive summary with specific data (quality score > 0.7)
- [ ] 3-5 non-obvious insights (no duplicates with exec summary)
- [ ] Processing time < 2.5 minutes
- [ ] Cost < $1.00 per report

### Quality ("McKinsey-Grade")
- [ ] Narrative opens with strong thesis, cites specific figures
- [ ] Artifact descriptions clear and specific (not generic)
- [ ] Categories reveal patterns (not just type groupings)
- [ ] Insights have data evidence + interpretation
- [ ] No hallucinations or factual errors
- [ ] Professional tone throughout
- [ ] Could present to paying client

---

## Testing Strategy

### Test Queries
```python
# Healthcare
"2020 telehealth artifacts"
"2020 clinical trial protocols"

# Technology
"2020 enterprise software architectures"
"2020 cybersecurity frameworks"

# Cross-sector
"2020 digital transformation plans"
"2020 business continuity plans"

# Edge cases
"2020 museum digital exhibitions" # Sparse
"2020 COVID vaccine research"     # Concentrated
```

### Quality Checks
1. **Artifact Enrichment:**
   - All 4 fields present and substantive
   - No placeholder text
   - Specific to artifact domain

2. **Categorization:**
   - 3-5 categories
   - Specific names (not "General", "Other")
   - All artifacts assigned exactly once

3. **Executive Summary:**
   - Contains specific dollar amounts/percentages
   - Names specific artifacts or categories
   - No generic phrases ("this report examines...")

4. **Insights:**
   - Non-obvious (not just category descriptions)
   - Evidence-backed (cites data)
   - Interpretation included ("this suggests...")
   - Different from exec summary patterns

---

## Risks & Mitigation

### High-Risk Items

**1. Express API Response Quality**
- **Risk:** Poor enrichments/insights ruin report
- **Mitigation:** Extensive prompt engineering, validation checks, fallbacks

**2. Processing Time**
- **Risk:** Takes too long (> 4 minutes)
- **Mitigation:** Implement batching immediately, set timeouts, add progress indicators

**3. Hallucinations**
- **Risk:** AI fabricates facts not in source data
- **Mitigation:** Ground all prompts in actual content, validate against sources

### Medium-Risk Items

**4. Generic Insights**
- **Risk:** Insights are obvious or redundant
- **Mitigation:** Explicit prompt instructions, quality scoring, deduplication

**5. Inconsistent Quality**
- **Risk:** Some reports great, others mediocre
- **Mitigation:** Test with diverse queries, identify patterns, add query adaptations

---

## Files Structure

### New Files (To Be Created)
```
agents/
├── artifact_enricher.py      ✅ DONE
├── categorizer.py             🔄 NEXT
├── summary_generator.py       ⏳ PLANNED
└── insights_generator.py      ⏳ PLANNED

report/
├── styles.py                  ⏳ PLANNED
└── templates/
    └── methodology.txt        ⏳ PLANNED

utils/
├── validation.py              ⏳ PLANNED
└── fallbacks.py               ⏳ PLANNED
```

### Modified Files
```
main.py                        ⏳ Integrate new agents
report_compiler.py             ⏳ Orchestrate enrichment pipeline
config.py                      ⏳ Add configuration options
```

---

## Configuration Options

```python
@dataclass
class ReportConfig:
    # Content depth
    artifact_count: int = 25
    min_categories: int = 3
    max_categories: int = 5
    min_insights: int = 3
    max_insights: int = 5

    # Processing
    enable_enrichment: bool = True
    enable_categorization: bool = True
    enable_executive_summary: bool = True
    enable_insights: bool = True
    batch_size: int = 5

    # Quality thresholds
    min_confidence: float = 0.3
    min_description_length: int = 50
    min_insight_quality_score: float = 0.5
```

---

## Next Immediate Steps

1. **Test Artifact Enricher** with real API
   - Run with USE_MOCK_DATA=False
   - Verify batch processing works
   - Check profile quality

2. **Build Categorizer Agent**
   - Similar structure to enricher
   - Single API call for all artifacts
   - Validation logic

3. **Update main.py**
   - Add enrichment step after valuation
   - Add categorization step
   - Pass to report compiler

4. **Basic Integration Test**
   - Run full pipeline with 10 artifacts
   - Verify enriched data flows through
   - Check PDF displays enriched fields

---

## Timeline Estimate

**Week 1:** (Current)
- ✅ Phase 1.1: Artifact Enricher (Done)
- 🔄 Phase 1.2: Integration & Testing
- ⏳ Phase 2.1: Categorizer Agent
- ⏳ Phase 2.2: PDF Layout Updates

**Week 2:**
- Phase 3.1: Executive Summary Generator
- Phase 3.2: Insights Generator
- Phase 3.3: Narrative PDF Sections

**Week 3:**
- Phase 4: Optimization (batching, parallelization, validation)
- Phase 5: Testing & Documentation
- Final integration & deployment

---

## References

- **Full PRD:** See user message (comprehensive 13-section document)
- **Gemini Report Example:** Reference for quality target
- **Current Status Report:** `PROJECT_STATUS_REPORT.md`

---

*Last Updated: October 30, 2025*
*Current Phase: Phase 1 (Artifact Enrichment)*
*Status: Enricher agent created, ready for integration*
