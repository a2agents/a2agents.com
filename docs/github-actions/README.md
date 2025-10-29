# GitHub Actions for New New News

This directory contains GitHub Actions workflows for testing and demoing the New New News multi-agent system.

## Available Workflows

### 1. Test New New News (`test-new-new-news.yml`)

Runs test queries against the system.

**Triggers:**
- ✅ Manual (workflow_dispatch) - Run from GitHub Actions tab
- ✅ On push to main branch (when `new_new_news/` changes)
- ✅ On pull requests to main

**Manual Inputs:**
- `query` - Research query (default: "Find 2020 artifacts related to COVID vaccine development")
- `max_artifacts` - Maximum artifacts to find (default: 5)
- `use_mock` - Use mock data instead of real API (default: true)

**Outputs:**
- JSON research report uploaded as artifact
- Summary displayed in workflow run

### 2. Demo New New News (`demo-new-new-news.yml`)

Runs predefined demo scenarios.

**Triggers:**
- ✅ Manual only (workflow_dispatch)

**Scenarios:**
- **COVID Vaccine Research** - Find 2020 COVID vaccine development artifacts
- **AI Breakthroughs** - Find 2020 AI research breakthroughs
- **Open Source Software** - Find significant 2020 open source releases
- **Custom Query** - Run your own query

**Outputs:**
- JSON report uploaded as artifact
- Markdown report uploaded as artifact
- Executive summary in workflow run

## How to Use

### Running a Test Manually

1. Go to your repository on GitHub
2. Click the **Actions** tab
3. Select **Test New New News** from the left sidebar
4. Click **Run workflow** button
5. Fill in the inputs:
   - Query: Your research question
   - Max Artifacts: How many to find (e.g., 5)
   - Use Mock: `true` for demo, `false` for real API
6. Click **Run workflow**

### Running a Demo

1. Go to **Actions** tab
2. Select **Demo - New New News**
3. Click **Run workflow**
4. Choose a scenario or enter custom query
5. Click **Run workflow**

### Viewing Results

1. Click on the workflow run
2. Scroll down to **Artifacts** section
3. Download the JSON or Markdown reports
4. View the summary directly in the workflow run page

## Setting Up API Key for Real API Calls

If you want to use the real You.com API (not mock data):

1. Go to repository **Settings**
2. Navigate to **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `YOU_API_KEY`
5. Value: Your You.com API key
6. Click **Add secret**

Then run workflows with `use_mock: false`.

## Examples

### Example 1: Quick Test with Mock Data
```yaml
Inputs:
  query: "Find 2020 artifacts related to COVID vaccine development"
  max_artifacts: 5
  use_mock: true
```

### Example 2: Real API Research
```yaml
Inputs:
  query: "2020 breakthrough medical research"
  max_artifacts: 10
  use_mock: false  # Requires YOU_API_KEY secret
```

### Example 3: Custom Demo
```yaml
Scenario: Custom Query
Custom Query: "2020 climate change policy documents"
```

## Troubleshooting

### Workflow fails with "API key not found"
- Make sure `use_mock: true` OR
- Add `YOU_API_KEY` to repository secrets

### 403 errors with real API
- Your API key may need activation at https://api.you.com
- Use mock mode for testing

### Import errors
- Check that `requirements.txt` is up to date
- Verify Python version is 3.8+

## Automatic Runs

The **Test** workflow automatically runs when:
- You push changes to `new_new_news/` directory on main branch
- Someone opens a PR with changes to `new_new_news/`

This ensures the system stays working as you develop.
