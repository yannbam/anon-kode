# Claude Development Guidelines

## Build Commands
- `npm install --legacy-peer-deps` - Install dependencies
- `npm run dev` - Run development server
- `npm run build` - Build production package
- `npm install -g tsx` - Install global tsx (required for running the application)

## Code Style
- TypeScript with React and Ink for terminal UI
- PascalCase for component files, camelCase for utility files
- Component props typed with explicit interfaces or types
- Named function declarations for components, arrow functions for utilities
- Single quotes for strings, 2-space indentation
- Destructure props in function parameters
- Group imports: React first, third-party next, then local imports
- Custom error classes extending Error with descriptive names
- React hooks prefixed with 'use'
- Components organized by features in dedicated directories

## Architecture
- Terminal UI built with Ink and React
- Commands implemented as separate modules
- Tools encapsulated with consistent interface pattern
- State management via React hooks
- Message-based interaction model