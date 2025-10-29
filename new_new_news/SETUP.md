# Setup Guide for New New News

## Prerequisites

- Python 3.8+
- You.com API key (get from https://api.you.com)

## Installation

1. **Clone the repository**
```bash
cd /home/user/a2agents.com/new_new_news
```

2. **Install dependencies**
```bash
pip install -r requirements.txt
```

3. **Configure your API key**

You have two options:

### Option A: Environment Variable (Recommended)
```bash
export YOU_API_KEY="ydc-sk-your-key-here"
```

Add to your `~/.bashrc` or `~/.zshrc` to make it permanent:
```bash
echo 'export YOU_API_KEY="ydc-sk-your-key-here"' >> ~/.bashrc
source ~/.bashrc
```

### Option B: .env file
```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your API key
nano .env
```

Your `.env` file should contain:
```
YOU_API_KEY=ydc-sk-your-key-here
```

**IMPORTANT:** The `.env` file is gitignored and will NOT be committed.

4. **Verify setup**
```bash
# Test with mock data (no API key needed)
python main.py "test query" --max-artifacts 3

# Test with real API (requires activated key)
python main.py "test query" --max-artifacts 3 --no-mock
```

## Quick Start

### Run Demo (Mock Data)
```bash
python demo.py
```

### Run Custom Query (Mock Data)
```bash
python main.py "Find 2020 artifacts related to COVID vaccine development"
```

### Run with Real API
```bash
# Make sure YOU_API_KEY is set
python main.py "your query" --no-mock
```

## Troubleshooting

### "API key not found"
- Verify environment variable: `echo $YOU_API_KEY`
- Or check your `.env` file exists and has the correct format

### "403 Access denied"
- Your API key may need activation at https://api.you.com
- Verify the key is correct
- Use mock mode for testing: remove `--no-mock` flag

### Import errors
- Make sure you're in the `new_new_news` directory
- Reinstall dependencies: `pip install -r requirements.txt`

## Security Notes

⚠️ **NEVER commit your API key to git!**

- API keys are loaded from environment variables or `.env` files
- `.env` is gitignored
- Never hardcode API keys in source files
- If you accidentally commit a key, rotate it immediately at https://api.you.com
