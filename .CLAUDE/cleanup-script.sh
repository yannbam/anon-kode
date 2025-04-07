#!/bin/bash
# Script to remove consolidated files from .CLAUDE directory

# Read the list of files to remove (ignoring comments and empty lines)
FILES_TO_REMOVE=$(grep -v "^#" .CLAUDE/files-to-remove.txt | grep -v "^$")

# Count total files
TOTAL_FILES=$(echo "$FILES_TO_REMOVE" | wc -l)
echo "Will move $TOTAL_FILES files from .CLAUDE directory to trash"
echo ""

# Confirm with user
echo "Files to be moved to trash:"
echo "$FILES_TO_REMOVE"
echo ""
read -p "Are you sure you want to trash these files? (y/n) " CONFIRM

if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo "Operation canceled"
  exit 0
fi

# Move files to trash
for FILE in $FILES_TO_REMOVE; do
  if [ -f "$FILE" ]; then
    echo "Moving $FILE to trash"
    trash-put "$FILE"
  else
    echo "Warning: $FILE not found"
  fi
done

echo ""
echo "File cleanup complete"
echo "You can now commit these changes with:"
echo "git add -A .CLAUDE/"
echo "git commit -m \"docs: remove redundant files from .CLAUDE directory\""
