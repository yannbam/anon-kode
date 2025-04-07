# Contributing to Anon Kode

Thank you for considering contributing to Anon Kode! This document outlines the coding standards and best practices we follow in this project.

## Code Style

- **Language**: TypeScript with React and Ink for terminal UI
- **Naming Conventions**:
  - PascalCase for component files (e.g., `MessageComponent.tsx`)
  - camelCase for utility files (e.g., `fileUtils.ts`)
  - Component props typed with explicit interfaces or types
- **Syntax Preferences**:
  - Named function declarations for components
  - Arrow functions for utilities
  - Single quotes for strings
  - 2-space indentation
  - Destructure props in function parameters
- **Import Organization**:
  - React imports first
  - Third-party library imports next
  - Local imports last
  - Group imports by type with a blank line between groups
- **Error Handling**:
  - Use custom error classes extending Error with descriptive names
  - Provide meaningful error messages
  - Include contextual information in errors when possible
- **React Patterns**:
  - Prefix hooks with 'use' (e.g., `useTerminalSize`)
  - Group related hooks together
  - Use functional components with hooks rather than class components
  - Keep components focused and single-purpose
  - Components organized by features in dedicated directories

## Project Organization

- **Components**: Keep components in dedicated directories with related files
- **Utils**: Utility functions should be organized by functionality
- **Services**: External service integrations should be encapsulated
- **Constants**: Keep configuration values and constants in dedicated files
- **Types**: Shared TypeScript types and interfaces in dedicated type files

## Pull Request Process

1. Ensure your code follows the style guidelines above
2. Update documentation as necessary
3. Include tests for new functionality when applicable
4. Make sure your code builds and runs successfully
5. Reference any related issues in your pull request description

## Development Setup

See the [README.md](./README.md) file for detailed setup instructions.

## Architecture Overview

- **Terminal UI**: Built with Ink and React for interactive terminal experiences
- **Commands**: Implemented as separate modules in the commands directory
- **Tools**: Encapsulated with consistent interface pattern for AI tool usage
- **State Management**: Via React hooks and context where appropriate
- **Message-Based Interaction**: The core interaction model is message-based between user and AI