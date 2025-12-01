#!/bin/bash
set -e

# Support multiple environment variable names for compatibility
PROJECT_DIR="${CURSOR_PROJECT_DIR:-${CURSOR_WORKSPACE_DIR:-${PWD}}}"

cd "$PROJECT_DIR/.cursor/hooks"
cat | npx tsx skill-activation-prompt.ts

