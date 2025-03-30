#!/bin/bash
# Branch Comparison Helper
# This script helps compare the behavior between main branch and ESM branch
# It provides commands to switch between branches, build each, and test them

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print section headers
print_header() {
  echo -e "\n${BLUE}======================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}======================================${NC}\n"
}

# Function to print commands with description
print_command() {
  echo -e "${YELLOW}$1${NC} - $2"
  echo -e "  ${GREEN}$3${NC}\n"
}

# Display menu
display_menu() {
  clear
  echo -e "${BLUE}ESM MIGRATION BRANCH COMPARISON HELPER${NC}\n"
  echo -e "This script helps you compare functionality between branches.\n"
  
  print_header "CURRENT STATUS"
  echo -e "Current branch: ${GREEN}$(git rev-parse --abbrev-ref HEAD)${NC}"
  echo -e "Last commit: ${YELLOW}$(git log -1 --oneline)${NC}\n"
  
  print_header "BRANCH MANAGEMENT"
  print_command "1" "Switch to main branch" "git checkout main"
  print_command "2" "Switch to ESM branch" "git checkout fix/typescript-errors"
  print_command "3" "Show differences between branches" "git diff main...fix/typescript-errors --stat"
  
  print_header "BUILD OPERATIONS"
  print_command "4" "Clean and build current branch" "rm -rf dist && npm run build"
  print_command "5" "Run with verbose logging" "NODE_ENV=development pnpm run dev --verbose --debug"
  
  print_header "TESTING HELPERS"
  print_command "6" "List all JavaScript files with import statements" "grep -r \"import \" dist --include=\"*.js\" | wc -l"
  print_command "7" "Count dynamic imports" "grep -r \"import(\" dist --include=\"*.js\" | wc -l"
  print_command "8" "Find potential problematic imports" "grep -r \"import \" dist --include=\"*.js\" | grep -v \".js\""
  
  echo -e "\n${RED}q${NC} - Exit script\n"
}

# Main script execution
display_menu

echo -e "This is a reference script. Copy and paste the commands you need.\n"
echo -e "${YELLOW}IMPORTANT:${NC} Always commit your changes before switching branches!"
echo -e "${YELLOW}NOTE:${NC} Running tests on both branches will help identify any behavioral differences."
