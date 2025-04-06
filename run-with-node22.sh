#!/bin/bash
# Script to run the application with Node.js v22

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

# Check if nvm is available
if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  # Load nvm
  export NVM_DIR="$HOME/.nvm"
  # shellcheck disable=SC1090
  source "$NVM_DIR/nvm.sh"
  
  # Use Node.js v22 for this script
  nvm use 22 || { echo "Failed to switch to Node.js v22. Please make sure it's installed."; exit 1; }
else
  echo "NVM not found. Please make sure NVM is installed and configured."
  exit 1
fi

# Run kode.js with the correct Node.js version
echo "Running with Node.js $(node --version)"
node bin/kode.js "$@"
