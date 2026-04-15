#!/bin/bash
# Self-Improving Memory Decay Script
# Moves entries older than 30 days from memory.md to archive/

BASE_DIR="$HOME/self-improving"
MEMORY_FILE="$BASE_DIR/memory.md"
ARCHIVE_DIR="$BASE_DIR/archive"
CUTOFF_DATE=$(date -d '30 days ago' +%Y-%m-%d 2>/dev/null || date -v-30d +%Y-%m-%d)

if [ ! -f "$MEMORY_FILE" ]; then
    echo "memory.md not found"
    exit 1
fi

# Create monthly archive file
ARCHIVE_FILE="$ARCHIVE_DIR/$(date +%Y-%m).md"

# Parse memory.md and separate old/new entries
temp_new=$(mktemp)
temp_old=$(mktemp)

in_entry=false
entry_date=""
entry_buffer=""

# Read line by line
while IFS= read -r line; do
    # Check for entry header: ## YYYY-MM-DD
    if [[ "$line" =~ ^##\ ([0-9]{4}-[0-9]{2}-[0-9]{2}) ]]; then
        # Process previous entry if exists
        if $in_entry && [ -n "$entry_buffer" ]; then
            if [[ "$entry_date" < "$CUTOFF_DATE" ]]; then
                echo "$entry_buffer" >> "$temp_old"
            else
                echo "$entry_buffer" >> "$temp_new"
            fi
        fi
        
        # Start new entry
        entry_date="${BASH_REMATCH[1]}"
        entry_buffer="$line"
        in_entry=true
    elif $in_entry; then
        if [[ "$line" =~ ^---$ ]]; then
            entry_buffer+=$'\n'"$line"
            # End of entry
            if [[ "$entry_date" < "$CUTOFF_DATE" ]]; then
                echo "$entry_buffer" >> "$temp_old"
            else
                echo "$entry_buffer" >> "$temp_new"
            fi
            in_entry=false
            entry_buffer=""
        else
            entry_buffer+=$'\n'"$line"
        fi
    else
        # Leading lines (header etc)
        echo "$line" >> "$temp_new"
    fi
done < "$MEMORY_FILE"

# Process final entry
if $in_entry && [ -n "$entry_buffer" ]; then
    if [[ "$entry_date" < "$CUTOFF_DATE" ]]; then
        echo "$entry_buffer" >> "$temp_old"
    else
        echo "$entry_buffer" >> "$temp_new"
    fi
fi

# Write back memory.md
mv "$temp_new" "$MEMORY_FILE"

# Append to archive if old entries exist
if [ -s "$temp_old" ]; then
    echo "# Archived $(date +%B %Y)" >> "$ARCHIVE_FILE"
    echo "" >> "$ARCHIVE_FILE"
    cat "$temp_old" >> "$ARCHIVE_FILE"
    echo ""
    echo "✓ Archived $(wc -l < "$temp_old") lines to $ARCHIVE_FILE"
fi

rm -f "$temp_old"

new_lines=$(wc -l < "$MEMORY_FILE")
echo "✓ memory.md: $new_lines lines remaining"
