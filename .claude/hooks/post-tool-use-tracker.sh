#!/bin/bash
set -e

# Post-tool-use hook that tracks edited files and their apps/packages
# Adapted for LeaseLab monorepo structure (apps/worker, apps/ops, apps/site)

# Read tool information from stdin
tool_info=$(cat)

# Extract relevant data
tool_name=$(echo "$tool_info" | jq -r '.tool_name // empty')
file_path=$(echo "$tool_info" | jq -r '.tool_input.file_path // empty')
session_id=$(echo "$tool_info" | jq -r '.session_id // empty')

# Skip if not an edit tool or no file path
if [[ ! "$tool_name" =~ ^(Edit|MultiEdit|Write)$ ]] || [[ -z "$file_path" ]]; then
    exit 0
fi

# Skip markdown files
if [[ "$file_path" =~ \.(md|markdown)$ ]]; then
    exit 0
fi

# Create cache directory in project
cache_dir="$CLAUDE_PROJECT_DIR/.claude/tsc-cache/${session_id:-default}"
mkdir -p "$cache_dir"

# Function to detect app/package from file path
detect_app() {
    local file="$1"
    local project_root="$CLAUDE_PROJECT_DIR"

    # Remove project root from path
    local relative_path="${file#$project_root/}"

    # Extract first directory component
    local app=$(echo "$relative_path" | cut -d'/' -f1)

    # LeaseLab-specific structure
    case "$app" in
        apps)
            # For apps/, get the specific app name (worker, ops, site)
            local app_name=$(echo "$relative_path" | cut -d'/' -f2)
            if [[ -n "$app_name" ]]; then
                echo "apps/$app_name"
            else
                echo "$app"
            fi
            ;;
        shared)
            # For shared/, get the package name (types, utils, config, etc.)
            local package=$(echo "$relative_path" | cut -d'/' -f2)
            if [[ -n "$package" ]]; then
                echo "shared/$package"
            else
                echo "$app"
            fi
            ;;
        scripts)
            echo "scripts"
            ;;
        *)
            # Check if it's a file in root
            if [[ ! "$relative_path" =~ / ]]; then
                echo "root"
            else
                echo "unknown"
            fi
            ;;
    esac
}

# Function to get build command for app
get_build_command() {
    local app="$1"
    local project_root="$CLAUDE_PROJECT_DIR"
    local app_path="$project_root/$app"

    # Check if package.json exists and has a build script
    if [[ -f "$app_path/package.json" ]]; then
        if grep -q '"build"' "$app_path/package.json" 2>/dev/null; then
            # Use npm for LeaseLab
            echo "cd $app_path && npm run build"
            return
        fi
    fi

    # No build command found
    echo ""
}

# Function to get TSC command for app
get_tsc_command() {
    local app="$1"
    local project_root="$CLAUDE_PROJECT_DIR"
    local app_path="$project_root/$app"

    # Check if tsconfig.json exists
    if [[ -f "$app_path/tsconfig.json" ]]; then
        echo "cd $app_path && npx tsc --noEmit"
        return
    fi

    # No TypeScript config found
    echo ""
}

# Detect app
app=$(detect_app "$file_path")

# Skip if unknown app
if [[ "$app" == "unknown" ]] || [[ -z "$app" ]]; then
    exit 0
fi

# Log edited file
echo "$(date +%s):$file_path:$app" >> "$cache_dir/edited-files.log"

# Update affected apps list
if ! grep -q "^$app$" "$cache_dir/affected-apps.txt" 2>/dev/null; then
    echo "$app" >> "$cache_dir/affected-apps.txt"
fi

# Store build commands
build_cmd=$(get_build_command "$app")
tsc_cmd=$(get_tsc_command "$app")

if [[ -n "$build_cmd" ]]; then
    echo "$app:build:$build_cmd" >> "$cache_dir/commands.txt.tmp"
fi

if [[ -n "$tsc_cmd" ]]; then
    echo "$app:tsc:$tsc_cmd" >> "$cache_dir/commands.txt.tmp"
fi

# Remove duplicates from commands
if [[ -f "$cache_dir/commands.txt.tmp" ]]; then
    sort -u "$cache_dir/commands.txt.tmp" > "$cache_dir/commands.txt"
    rm -f "$cache_dir/commands.txt.tmp"
fi

# Exit cleanly
exit 0
