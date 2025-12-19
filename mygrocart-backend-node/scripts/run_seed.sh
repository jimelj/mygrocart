#!/bin/bash
###############################################################################
# Database Seed Runner Script
#
# This script runs the database seeding process with proper environment
# configuration and safety checks.
#
# USAGE:
#   ./scripts/run_seed.sh               # Run full seed
#   ./scripts/run_seed.sh --resume      # Resume from interruption
#   ./scripts/run_seed.sh --test        # Test with 3 categories only
#
# REQUIREMENTS:
#   - PostgreSQL database running and accessible via DATABASE_URL
#   - TARGET_API_KEY environment variable set
#   - Playwright browser installed (pnpm playwright install)
#   - At least 8-10 hours of uninterrupted runtime (full seed)
#
# RATE LIMITING:
#   - Target: 10 seconds between requests (~6 requests/minute)
#   - ShopRite: 15 seconds between requests (~4 requests/minute)
#   - Total estimated time: 8-10 hours for full seed
#
# OUTPUT FILES:
#   - seed_progress.json  - Progress tracking (deleted on completion)
#   - seed_summary.json   - Final statistics
#   - seed_log.txt        - Detailed activity log
###############################################################################

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo ""
echo "=========================================="
echo "  MyGroCart Database Seeding"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "$PROJECT_ROOT/package.json" ]; then
    echo -e "${RED}Error: Not in project root directory${NC}"
    echo "Please run from: $PROJECT_ROOT"
    exit 1
fi

# Check for .env file
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please create .env file with required variables:"
    echo "  - DATABASE_URL"
    echo "  - TARGET_API_KEY"
    exit 1
fi

# Load environment variables
source "$PROJECT_ROOT/.env"

# Verify required environment variables
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not set in .env${NC}"
    exit 1
fi

if [ -z "$TARGET_API_KEY" ]; then
    echo -e "${YELLOW}Warning: TARGET_API_KEY not set${NC}"
    echo "Target scraping will be skipped. Set TARGET_API_KEY to enable."
fi

# Check if Playwright is installed
if [ ! -d "$PROJECT_ROOT/node_modules/playwright" ]; then
    echo -e "${RED}Error: Playwright not installed${NC}"
    echo "Run: pnpm install"
    exit 1
fi

# Check if Playwright browsers are installed
if ! command -v playwright &> /dev/null; then
    echo -e "${YELLOW}Warning: Playwright CLI not found${NC}"
    echo "Browsers may not be installed. Run: pnpm playwright install"
fi

# Parse command line arguments
MODE="full"
if [[ "$1" == "--test" ]]; then
    MODE="test"
    echo -e "${BLUE}Running in TEST mode (3 categories only)${NC}"
elif [[ "$1" == "--resume" ]]; then
    MODE="resume"
    echo -e "${BLUE}Running in RESUME mode${NC}"
    if [ ! -f "$SCRIPT_DIR/seed_progress.json" ]; then
        echo -e "${YELLOW}Warning: No progress file found. Starting fresh seed.${NC}"
    fi
else
    echo -e "${BLUE}Running in FULL mode${NC}"
fi

echo ""
echo "Configuration:"
echo "  Mode: $MODE"
echo "  Database: ${DATABASE_URL%%\?*}" # Hide query params
echo "  Target API: ${TARGET_API_KEY:0:8}..." # Show first 8 chars only
echo ""

# Confirm before running (skip for test mode)
if [[ "$MODE" != "test" ]]; then
    echo -e "${YELLOW}WARNING: This will take 8-10 hours to complete.${NC}"
    echo "Press Ctrl+C within 10 seconds to cancel..."
    echo ""
    sleep 10
fi

echo ""
echo "=========================================="
echo "  Starting Database Seed"
echo "=========================================="
echo ""
echo "Rate Limiting:"
echo "  - Target: 10 seconds between requests"
echo "  - ShopRite: 15 seconds between requests"
echo ""
echo "Progress Tracking:"
echo "  - Progress: $SCRIPT_DIR/seed_progress.json"
echo "  - Summary:  $SCRIPT_DIR/seed_summary.json"
echo "  - Log:      $SCRIPT_DIR/seed_log.txt"
echo ""
echo "To resume if interrupted: ./scripts/run_seed.sh --resume"
echo "Press Ctrl+C to stop (progress will be saved)"
echo ""
echo "=========================================="
echo ""

# Set rate limiting environment variables (override scraper defaults)
export SCRAPER_DELAY_TARGET=10000
export SCRAPER_DELAY_SHOPRITE=15000

# Change to project directory
cd "$PROJECT_ROOT"

# Run the seed script
if [[ "$MODE" == "test" ]]; then
    node scripts/seed_database.js --test
elif [[ "$MODE" == "resume" ]]; then
    node scripts/seed_database.js --resume
else
    node scripts/seed_database.js
fi

# Capture exit code
EXIT_CODE=$?

echo ""
echo "=========================================="
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}  Seed completed successfully!${NC}"
    echo "=========================================="
    echo ""
    echo "Summary saved to: $SCRIPT_DIR/seed_summary.json"
    echo "Log saved to: $SCRIPT_DIR/seed_log.txt"
    echo ""

    # Show summary if file exists
    if [ -f "$SCRIPT_DIR/seed_summary.json" ]; then
        echo "Quick Stats:"
        if command -v jq &> /dev/null; then
            jq -r '"  Duration: \(.duration)\n  Products: \(.totalProductsAdded)\n  Success: \(.successRate)"' "$SCRIPT_DIR/seed_summary.json"
        else
            echo "  (Install 'jq' to see formatted summary)"
            cat "$SCRIPT_DIR/seed_summary.json"
        fi
    fi
else
    echo -e "${RED}  Seed failed with exit code $EXIT_CODE${NC}"
    echo "=========================================="
    echo ""
    echo "Check logs at: $SCRIPT_DIR/seed_log.txt"
    echo ""
    if [ -f "$SCRIPT_DIR/seed_progress.json" ]; then
        echo "Progress saved. Resume with: ./scripts/run_seed.sh --resume"
    fi
fi

echo ""
exit $EXIT_CODE
