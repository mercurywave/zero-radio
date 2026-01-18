# AGENTS.md

This document provides guidelines and commands for agentic coding agents operating in this repository.

## Build/Lint/Test Commands

### Build Commands
- `npm run build` - Build the project
- `npm run dev` - Start development server
- `npm run start` - Start the application

### Lint Commands
- `npm run lint` - Run linter
- `npm run lint:fix` - Run linter with auto-fix
- `npm run typecheck` - Run TypeScript type checking

### Test Commands
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test -- --testNamePattern="name"` - Run specific test by name
- `npm run test -- path/to/test-file.test.ts` - Run single test file

## Code Style Guidelines

### Imports
- Use TypeScript import syntax
- Group imports: external libraries, internal modules, relative paths
- Sort imports alphabetically within each group
- Use named imports for specific functions/components
- Use default imports for entire modules when appropriate

### Formatting
- Use Prettier for code formatting (configured via .prettierrc)
- 2-space indentation
- Unix line endings
- No trailing whitespace
- Single quotes for strings unless template literals are needed
- Always use semicolons

### Types
- Use TypeScript for all code
- Prefer interfaces over types when possible
- Use strict typing with no implicit any
- Define explicit return types for functions
- Use generics for reusable components
- Use union types for optional values

### Naming Conventions
- PascalCase for component names
- camelCase for variables and functions
- UPPER_CASE for constants
- kebab-case for file names
- Prefix private members with underscore (_)

### Error Handling
- Use try/catch blocks for asynchronous operations
- Implement proper error boundaries in React components
- Log errors appropriately using console.error or structured logging
- Handle promises with .catch() or async/await patterns
- Validate inputs and throw descriptive errors

### Git Hooks
- Pre-commit hooks run linting and formatting checks
- Commit messages should follow conventional commits format
- All changes must pass tests before committing

## Cursor/Copilot Rules

### Cursor Rules
- Follow the project's existing code style and conventions
- Maintain consistency with the codebase's architecture
- Use descriptive variable and function names
- Write clear, concise comments for complex logic

### Copilot Instructions
- Generate code that follows existing patterns in the codebase
- Prioritize readability and maintainability over cleverness
- Ensure all generated code is properly typed
- Follow project-specific naming conventions
- Include appropriate documentation for new functions/components

## Project Structure
- Source files in `src/` directory
- Tests in `tests/` or `__tests__/` directories
- Configuration files at root level (package.json, tsconfig.json, etc.)
- Documentation in `docs/` directory
