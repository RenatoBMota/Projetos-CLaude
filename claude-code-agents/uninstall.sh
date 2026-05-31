#!/bin/bash
# claude-code-agents uninstaller
# Usage: curl -s https://raw.githubusercontent.com/undeadlist/claude-code-agents/main/uninstall.sh | bash

set -e

echo "claude-code-agents uninstaller"
echo "================================"
echo ""

removed=0

# Remove agent definitions
if [ -d ".claude/agents" ]; then
    rm -rf .claude/agents/
    echo "Removed .claude/agents/"
    ((removed++))
fi

# Remove generated reports
if [ -d ".claude/audits" ]; then
    rm -rf .claude/audits/
    echo "Removed .claude/audits/"
    ((removed++))
fi

# Remove workflows
if [ -d "workflows" ]; then
    rm -rf workflows/
    echo "Removed workflows/"
    ((removed++))
fi

# Clean up empty .claude directory if nothing else is in it
if [ -d ".claude" ] && [ -z "$(ls -A .claude 2>/dev/null)" ]; then
    rmdir .claude
    echo "Removed empty .claude/"
fi

echo ""
if [ $removed -eq 0 ]; then
    echo "Nothing to remove. Are you in the right project directory?"
else
    echo "================================"
    echo "Uninstall complete."
    echo ""
    echo "Note: CLAUDE.md was left in place (remove manually if desired)."
fi
