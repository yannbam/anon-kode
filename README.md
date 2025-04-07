# ANON KODE


https://github.com/user-attachments/assets/7a9253a7-8bb0-40d5-a3f3-5e6096d7c789


Terminal-based AI coding tool that can use any model that supports the OpenAI-style API.

- Fixes your spaghetti code
- Explains wtf that function does
- Runs tests, shell commands and stuff
- Whatever else claude-code can do, depending on the model you use

## HOW TO USE

```
npm install -g anon-kode
cd your-project
kode
```

You can use the onboarding to set up the model, or `/model`.
If you don't see the models you want on the list, you can manually set them in `/config`
As long as you have an openai-like endpoint, it should work.

## Development Guide

### Prerequisites

- Node.js v20.0.0 or higher
- pnpm (recommended) or npm

### Setup

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm run dev
```

### Development Commands

- `pnpm run dev` - Run the application in development mode
- `NODE_ENV=development pnpm run dev --verbose --debug` - Run with extra logging for debugging

### Build Process

The project uses TypeScript with ESM modules. The build process includes:

1. TypeScript compilation to JavaScript
2. Fixing module imports for ESM compatibility
3. Output generation in the `dist` directory

```bash
# Build the project
pnpm run build
```

Additional build-related commands:

- `pnpm run fix-imports` - Fix ESM imports in compiled files
- `pnpm run analyze-imports` - Analyze imports that may need fixing

### Architecture

- TypeScript with ESM modules (`"type": "module"` in package.json)
- React with Ink for terminal UI
- Bundler moduleResolution for clean import paths
- CLI entry point in `bin/kode.js`

For more details about the build scripts, see [scripts/README.md](scripts/README.md).

## BUGS

You can submit a bug from within the app with `/bug`, it will open a browser to github issue create with stuff filed out.

## Warning

Use at own risk.


## YOUR DATA

- There's no telemetry or backend servers other than the AI providers you choose
