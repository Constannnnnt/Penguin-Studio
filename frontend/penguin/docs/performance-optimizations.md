# Performance Optimizations

This document describes the performance optimizations implemented for the interactive object manipulation feature.

## Overview

The interactive object manipulation system includes several performance optimizations to ensure smooth user experience even with large numbers of detected objects and frequent interactions.

## Implemented Optimizations

### 1. Component Memoization

**ObjectListItem Component**
- Wrapped with `React.memo()` to prevent unnecessary re-renders
- Custom comparison function checks only relevant props:
  - `mask_id`, `isSelected`, `isHovered`
  - `confidence`, `bounding_box` coordinates
  - `objectMetadata` reference
- Reduces re-renders when unrelated state changes

**DraggableMaskOverlay Component**
- Wrapped with `React.memo()` to prevent unnecessary re-renders
- Custom comparison function checks:
  - `mask_id`, `isSelected`, `isHovered`
  - `imageSize` dimensions
  - `bounding_box` coordinates
- Prevents re-rendering of all masks when only one is being manipulated

### 2. Debounced Metadata Updates

**Implementation**
- Created `debounce.ts` utility with configurable delay
- Metadata updates during drag/resize are debounced by 300ms
- Prevents excessive calculations during continuous mouse movements
- Updates are batched and applied after user stops moving

**Benefits**
- Reduces CPU usage during drag operations
- Prevents UI stuttering from frequent state updates
- Maintains smooth 60fps animation during interactions

### 3. Expensive Calculation Optimization

**Direction Calculation Caching**
- `MetadataUpdater.getDirection()` uses a cache for trigonometric calculations
- Cache key based on rounded dx/dy values
- Cache size limited to 1000 entries to prevent memory issues
- Reduces repeated `Math.atan2()` calls

**Memoized Sorting**
- `ObjectsTab` uses `useMemo()` for mask sorting
- Prevents re-sorting on every render
- Only re-sorts when `results` changes

### 4. Virtualization Support

**Large List Handling**
- Threshold set at 20 objects for virtualization consideration
- Console warning when threshold exceeded
- Foundation for future virtual scrolling implementation
- Current implementation optimized for typical use cases (< 20 objects)

**Future Enhancement**
- Can integrate `react-window` or `react-virtualized` for large lists
- Would render only visible items in viewport
- Significant performance improvement for 100+ objects

### 5. Memoized Calculations

**ObjectListItem**
- `getMaskColor()` result memoized with `useMemo()`
- Prevents color recalculation on every render
- Depends only on `mask_id` which rarely changes

**DraggableMaskOverlay**
- Filter calculations memoized where possible
- Style objects created only when dependencies change

## Performance Monitoring

### Built-in Utilities

The `performance.ts` module provides utilities for tracking performance:

```typescript
import { measureOperation, getOperationMetrics } from '@/lib/performance';

// Measure synchronous operation
const result = measureOperation('sortMasks', () => {
  return masks.sort((a, b) => b.confidence - a.confidence);
});

// Measure async operation
const data = await measureOperationAsync('fetchMetadata', async () => {
  return await fetch('/api/metadata');
});

// Get metrics for analysis
const metrics = getOperationMetrics();
console.log('Average sort time:', getAverageOperationDuration('sortMasks'));
```

### Performance Targets

- Component render time: < 16ms (60fps)
- Drag operation response: < 16ms per frame
- Metadata update: < 100ms after drag/resize ends
- List scroll: Smooth 60fps scrolling
- Memory usage: Stable with no leaks

## Best Practices

### When Adding New Features

1. **Use React.memo() for list items**
   - Always memoize components rendered in lists
   - Provide custom comparison function for precise control

2. **Debounce expensive operations**
   - Use debounce for operations triggered by mouse/keyboard events
   - Typical delay: 300ms for metadata updates, 150ms for UI updates

3. **Memoize expensive calculations**
   - Use `useMemo()` for sorting, filtering, transformations
   - Use `useCallback()` for event handlers passed to child components

4. **Profile before optimizing**
   - Use React DevTools Profiler to identify bottlenecks
   - Measure actual performance impact before adding complexity

### Code Review Checklist

- [ ] List components are memoized
- [ ] Expensive calculations use `useMemo()`
- [ ] Event handlers use `useCallback()` when passed to children
- [ ] Frequent operations are debounced
- [ ] No unnecessary re-renders in React DevTools Profiler
- [ ] Performance warnings addressed in console

## Measuring Performance

### React DevTools Profiler

1. Open React DevTools
2. Go to Profiler tab
3. Click record button
4. Perform interactions (drag, resize, scroll)
5. Stop recording
6. Analyze flame graph for slow components

### Browser Performance Tools

1. Open Chrome DevTools
2. Go to Performance tab
3. Click record button
4. Perform interactions
5. Stop recording
6. Look for:
   - Long tasks (> 50ms)
   - Layout thrashing
   - Excessive repaints

### Custom Metrics

```typescript
import { measureOperation } from '@/lib/performance';

// In your component
useEffect(() => {
  measureOperation('componentMount', () => {
    // Expensive initialization
  });
}, []);
```

## Known Limitations

1. **Virtualization not implemented**
   - Current implementation handles up to ~50 objects well
   - Performance degrades with 100+ objects
   - Future: Implement virtual scrolling for large lists

2. **Metadata updates not batched**
   - Each drag/resize triggers separate metadata calculation
   - Future: Batch multiple updates in single frame

3. **Image loading not optimized**
   - Mask images loaded immediately
   - Future: Lazy load images for off-screen masks

## Future Optimizations

### Short Term
- Implement virtual scrolling for large lists
- Add request animation frame batching for updates
- Optimize image loading with lazy loading

### Long Term
- Web Worker for expensive calculations
- Canvas rendering for mask overlays (instead of DOM)
- IndexedDB caching for frequently accessed data
- Service Worker for offline support

## Performance Regression Prevention

### Automated Testing
- Add performance tests to CI/CD pipeline
- Set thresholds for component render times
- Monitor bundle size changes

### Monitoring
- Track performance metrics in production
- Set up alerts for performance degradation
- Regular performance audits

## Resources

- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Web Vitals](https://web.dev/vitals/)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)
- [React DevTools Profiler](https://react.dev/learn/react-developer-tools)
