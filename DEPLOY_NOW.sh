#!/bin/bash
# Command Production Deployment Script
# Run this after setting VERCEL_TOKEN environment variable

set -e

echo "🚀 Command Production Deployment"
echo "===================================="
echo ""

# Check if Vercel token is set
if [ -z "$VERCEL_TOKEN" ]; then
    echo "❌ ERROR: VERCEL_TOKEN environment variable not set"
    echo ""
    echo "To deploy, first set your Vercel token:"
    echo "  export VERCEL_TOKEN=\"your_vercel_token_here\""
    echo ""
    echo "Get your token from: https://vercel.com/account/tokens"
    exit 1
fi

echo "✓ Vercel token found"
echo ""

# Change to project directory
cd "$(dirname "$0")" || exit 1
echo "✓ In project directory: $(pwd)"
echo ""

# Verify environment variables are set locally
echo "Checking environment variables..."
if [ -z "$AIRTABLE_PAT" ]; then
    echo "⚠️  Warning: AIRTABLE_PAT not set in current shell"
    echo "   (It will be read from .env.local for local build)"
fi

if [ -z "$AIRTABLE_BASE_ID" ]; then
    echo "⚠️  Warning: AIRTABLE_BASE_ID not set in current shell"
    echo "   (It will be read from .env.local for local build)"
fi

if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "⚠️  Warning: ANTHROPIC_API_KEY not set in current shell"
    echo "   (It will be read from .env.local for local build)"
fi

echo ""
echo "Environment variables needed in Vercel (see .env.local):"
echo "  - AIRTABLE_PAT (from .env.local)"
echo "  - AIRTABLE_BASE_ID (from .env.local)"
echo "  - ANTHROPIC_API_KEY (from .env.local)"
echo ""

# Check if already have required env vars set
if [ -z "$AIRTABLE_PAT" ] || [ -z "$AIRTABLE_BASE_ID" ] || [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "Loading from .env.local..."
    set -a
    source .env.local
    set +a
    echo "✓ Loaded from .env.local"
fi

echo ""
echo "Step 1: Set environment variables on Vercel..."
echo ""

# Try to set env vars via Vercel CLI
if command -v vercel &> /dev/null; then
    echo "Using Vercel CLI to set environment variables..."
    
    # These commands will prompt for confirmation
    # In CI/CD, pipe 'yes' to auto-confirm
    echo "Setting AIRTABLE_PAT..."
    echo "$AIRTABLE_PAT" | vercel env add AIRTABLE_PAT production || echo "  (May already exist)"
    
    echo "Setting AIRTABLE_BASE_ID..."
    echo "$AIRTABLE_BASE_ID" | vercel env add AIRTABLE_BASE_ID production || echo "  (May already exist)"
    
    echo "Setting ANTHROPIC_API_KEY..."
    echo "$ANTHROPIC_API_KEY" | vercel env add ANTHROPIC_API_KEY production || echo "  (May already exist)"
    
    echo "✓ Environment variables set"
else
    echo "❌ Vercel CLI not found. Please install it:"
    echo "  npm install -g vercel@latest"
    exit 1
fi

echo ""
echo "Step 2: Deploy to production..."
echo ""

vercel deploy --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Check the live URL provided above"
echo "2. Test the application: https://command.vercel.app"
echo "3. Verify API endpoints respond"
echo "4. Test voice button, keyboard shortcuts, and Kanban drag-drop"
echo ""
echo "Monitor deployment: https://vercel.com/dashboard/command"
