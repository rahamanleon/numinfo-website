#!/bin/sh
# Self-Improving Memory Setup
# Run this to initialize the ~/self-improving directory structure

BASE_DIR="$HOME/self-improving"

echo "Creating self-improving memory structure at $BASE_DIR..."

# Create directories
mkdir -p "$BASE_DIR/projects"
mkdir -p "$BASE_DIR/domains"
mkdir -p "$BASE_DIR/archive"

# Create memory.md (HOT memory ≤100 lines)
cat > "$BASE_DIR/memory.md" << 'EOF'
# Hot Memory (≤100 lines)

## Initialization
# This file contains active learnings, corrections, and patterns.
# Entries decay after 30 days to archive/
# Format: ## YYYY-MM-DD [CATEGORY]: One-line summary

---
EOF

# Create index.md (navigation)
cat > "$BASE_DIR/index.md" << 'EOF'
# Memory Index
# Last updated: $(date +%Y-%m-%d)

## Projects
<!-- List projects here: - name: XX lines → projects/name.md -->

## Domains
<!-- List domains here: - domain/sub: XX lines → domains/sub.md -->

## Stats
- memory.md: 10 lines (HOT)
- corrections.md: 0 entries
- Total archived: 0 entries
EOF

# Create corrections.md (last 50 corrections)
cat > "$BASE_DIR/corrections.md" << 'EOF'
# Corrections Log (last 50)
# Format: YYYY-MM-DD HH:MM | CATEGORY | Brief correction | Source

EOF

# Create .gitignore (optional but recommended)
cat > "$BASE_DIR/.gitignore" << 'EOF'
# Archive grows indefinitely
archive/*.md
EOF

echo "✓ Self-improving memory initialized at $BASE_DIR"
echo ""
echo "Directory structure:"
tree -L 2 "$BASE_DIR" 2>/dev/null || find "$BASE_DIR" -maxdepth 1 -type d
