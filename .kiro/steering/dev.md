---
inclusion: always
---

<!-- Modified from: https://github.com/awsdataarchitect/kiro-best-practices?tab=readme-ov-file -->

# Development

## Dependency Management
- Use latest stable versions of all libraries and dependencies
- Leverage Context7 MCP server to verify compatibility before adding dependencies
- Justify each new dependency with clear business or technical value
- Prefer well-maintained libraries with active communities
- Document version constraints in project files
- Remove unused dependencies regularly
- Use lock files to ensure consistent installations across environments

## Code Quality Standards
- Never create duplicate files with suffixes like `_fixed`, `_clean`, `_backup`, etc.
- Never create duplicate files with prefixes like `Enhanced`, `Updated`, etc. 
- Work iteratively on existing files (hooks handle commits automatically)
- Include relevant documentation links in code comments
- Follow language-specific conventions (TypeScript for CDK, Python for Lambda)
- Use meaningful variable and function names
- Keep functions small and focused on single responsibilities
- Implement proper error handling and logging

## File Management
- Maintain clean directory structures
- Use consistent naming conventions across the project
- Avoid temporary or backup files in version control
- Organize code logically by feature or domain
- Keep configuration files at appropriate levels (project vs user)
- Group files by by first functions (main components, tests, examples) and then by features (panels, etc)
- Use camelCase for file names for Typescript
- Use snakeCase (my_function) for file names for Python
- Use lowercase for folder names
- Put all README.md in `docs` folder in the root except a main README.md in the root.

## Documentation Approach
- Maintain single comprehensive README covering all aspects including deployment
- Reference official sources through MCP servers when available
- Update documentation when upgrading dependencies
- Keep documentation close to relevant code
- Use inline comments for complex business logic
- Never mention requirements in the comments 
- Document API endpoints and data structures
- Include setup and deployment instructions
- Never use any emojis in any of the comments or print messages. Stay clean, concise, short.

## Version Control Integration
- Commit frequently with meaningful messages
- Use feature branches for development
- Keep main branch deployable at all times
- Tag releases appropriately
- Use .gitignore to exclude generated files and secrets

## Quality Assurance
- Write tests for new functionality
- Run tests before committing changes
- Use linting and formatting tools consistently
- Perform code reviews for all changes
- Monitor code coverage and maintain high standards