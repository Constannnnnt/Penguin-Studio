---
inclusion: always
fileMatchPattern: '*.tsx,*.jsx,*react*'
---
<!-- 
Modified from: https://github.com/awsdataarchitect/kiro-best-practices?tab=readme-ov-file, MIT License Vivek V. @awsdataarchitect
-->

# React

## Component Structure
- Use functional components with hooks
- Keep components small and focused (single responsibility)
- Use TypeScript for all React components
- Prefer named exports over default exports

## Hooks
- Use `useState` for local component state
- Use `useEffect` for side effects
- Use `useMemo` and `useCallback` for performance optimization
- Create custom hooks for reusable logic
- Follow the rules of hooks (only call at top level)

## Props and State
- Define prop types with TypeScript interfaces
- Use destructuring for props
- Avoid deeply nested state objects
- Use `Zustand` to manage states first; otherwise, use state updater functions for complex state updates

## Performance
- Use React.memo for expensive components
- Implement proper key props for lists
- Avoid creating objects/functions in render
- Use lazy loading for large components

## Styling
- Use CSS modules or styled-components
- Avoid inline styles for complex styling
- Use consistent naming conventions
- Implement responsive design patterns

## Testing
- Test component behavior, not implementation
- Use React Testing Library
- Test user interactions and accessibility
- Mock external dependencies