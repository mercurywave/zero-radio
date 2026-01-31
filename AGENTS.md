# AGENTS.md

This document provides guidelines and commands for agentic coding agents operating in this repository.

## Build/Lint/Test Commands

### Build Commands
- `npm run build` - Build the project (runs TypeScript compilation + Vite build)
- `npm run dev` - Start development server on http://localhost:3000
- `npm run preview` - Preview production build locally

### Lint Commands
- `npm run typecheck` - Run TypeScript type checking with strict mode enabled

### Test Commands
- `npm test` - Run all tests using Vitest
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm test -- --testNamePattern="name"` - Run specific test by name
- `npm test -- path/to/test-file.test.ts` - Run single test file

## Code Style Guidelines

### Imports
- Use TypeScript import syntax
- Group imports: external libraries, internal modules, relative paths
- Sort imports alphabetically within each group
- Use named imports for specific functions/components
- Use default imports for entire modules when appropriate

### Formatting
- 2-space indentation
- Unix line endings
- No trailing whitespace
- Single quotes for strings unless template literals are needed
- Always use semicolons
- Keep lines under 80 characters where possible

### Types
- Use TypeScript for all code with strict mode enabled
- Prefer interfaces over types when possible
- Use strict typing with no implicit any (use explicit types)
- Define explicit return types for functions
- Use generics for reusable components
- Use union types for optional values

### Naming Conventions
- PascalCase for component names and classes
- camelCase for variables, functions, and methods
- UPPER_CASE for constants
- kebab-case for file names
- Prefix private members with underscore (_)
- Use descriptive names (e.g., `playbackService` instead of `ps`)

### Error Handling
- Use try/catch blocks for asynchronous operations
- Implement proper error boundaries in React components
- Log errors appropriately using console.error or structured logging
- Handle promises with .catch() or async/await patterns
- Validate inputs and throw descriptive errors
- Include error handling for audio playback failures

### Project Structure
- Source files in `src/` directory
- Components in `src/components/`
- Services in `src/services/`
- Utilities in `src/utils/`
- Types in `src/types/`
- Configuration files at root level (package.json, tsconfig.json, etc.)

### React-Specific Guidelines
- Use functional components with TypeScript
- Prefer hooks over class components
- Extract complex logic into custom hooks when appropriate
- Keep components focused and reusable
- Use proper typing for props using interfaces

### Service Layer Patterns
- Services should be stateless where possible
- Use singleton pattern for shared services (e.g., `MusicCacheService`, `PlaybackService`)
- Implement proper cleanup methods (e.g., `destroy()` for audio resources)
- Handle media session integration for browser controls

### State Management
- Prefer local component state for UI-related state
- Use service classes for domain-specific state (e.g., playback, music cache)
- Implement callback patterns for state changes rather than direct subscriptions
- Keep state updates synchronous when possible

