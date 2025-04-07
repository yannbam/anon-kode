# Running Without Bun

These instructions explain how to run the application with Node.js instead of Bun.

## Prerequisites

1. Install Node.js LTS version (v20+), preferably v22.14.0
   ```bash
   # Using NVM (recommended)
   nvm install --lts
   nvm use --lts
   
   # Or download directly from https://nodejs.org/
   ```

2. Install dependencies with legacy peer deps flag
   ```bash
   npm install --legacy-peer-deps
   ```

3. Install TSX globally
   ```bash
   npm install -g tsx
   ```

## Running the Application

- Development mode:
  ```bash
  npm run dev
  ```

- Direct execution (after building):
  ```bash
  npm run build
  ./cli-launcher.mjs
  ```

## Troubleshooting

- If you see an error about TSX not being found, make sure you've installed it globally
- If you experience module resolution issues, check that you're using Node.js v20+
- For other dependency issues, try clearing your node_modules and reinstalling:
  ```bash
  rm -rf node_modules
  npm install --legacy-peer-deps
  ```