/**
 * Performance monitoring utilities
 * 
 * Provides functions to measure and track application performance metrics
 */

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  pageLoadTime: number;
  domContentLoaded: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;
  timeToInteractive?: number;
}

/**
 * Measures page load performance metrics
 * 
 * Target Metrics
 * - First Contentful Paint (FCP): < 1.5s
 * - Largest Contentful Paint (LCP): < 2.5s
 * - Time to Interactive (TTI): < 3.0s
 * - Cumulative Layout Shift (CLS): < 0.1
 * - First Input Delay (FID): < 100ms
 * 
 * @returns Performance metrics object
 */
export const measurePerformance = (): PerformanceMetrics | null => {
  if (typeof window === 'undefined' || !('performance' in window)) {
    return null;
  }

  const perfData = window.performance.timing;
  const navigationStart = perfData.navigationStart;

  const metrics: PerformanceMetrics = {
    pageLoadTime: perfData.loadEventEnd - navigationStart,
    domContentLoaded: perfData.domContentLoadedEventEnd - navigationStart,
  };

  // Get Paint Timing API metrics if available
  if ('getEntriesByType' in window.performance) {
    const paintEntries = window.performance.getEntriesByType('paint');
    
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    if (fcp) {
      metrics.firstContentfulPaint = fcp.startTime;
    }
  }

  // Get Largest Contentful Paint if available
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          metrics.largestContentfulPaint = lastEntry.startTime;
        }
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      // PerformanceObserver not supported or error occurred
      console.debug('LCP measurement not available:', e);
    }
  }

  return metrics;
};

/**
 * Logs performance metrics to console in development mode
 * Sends to analytics in production mode
 * 
 * @param metrics - Performance metrics to log
 */
export const logPerformanceMetrics = (metrics: PerformanceMetrics): void => {
  if (!metrics) return;

  const isDevelopment = import.meta.env.DEV;

  if (isDevelopment) {
    console.group('📊 Performance Metrics');
    console.log('Page Load Time:', `${metrics.pageLoadTime}ms`);
    console.log('DOM Content Loaded:', `${metrics.domContentLoaded}ms`);
    
    if (metrics.firstContentfulPaint) {
      console.log('First Contentful Paint:', `${metrics.firstContentfulPaint.toFixed(2)}ms`);
      
      // Check against target (< 1500ms)
      if (metrics.firstContentfulPaint > 1500) {
        console.warn('FCP exceeds target of 1500ms');
      } else {
        console.log('FCP within target');
      }
    }
    
    if (metrics.largestContentfulPaint) {
      console.log('Largest Contentful Paint:', `${metrics.largestContentfulPaint.toFixed(2)}ms`);
      
      // Check against target (< 2500ms)
      if (metrics.largestContentfulPaint > 2500) {
        console.warn('LCP exceeds target of 2500ms');
      } else {
        console.log('LCP within target');
      }
    }
    
    if (metrics.timeToInteractive) {
      console.log('Time to Interactive:', `${metrics.timeToInteractive.toFixed(2)}ms`);
      
      // Check against target (< 3000ms)
      if (metrics.timeToInteractive > 3000) {
        console.warn('TTI exceeds target of 3000ms');
      } else {
        console.log('TTI within target');
      }
    }
    
    if (metrics.cumulativeLayoutShift !== undefined) {
      console.log('Cumulative Layout Shift:', metrics.cumulativeLayoutShift.toFixed(3));
      
      // Check against target (< 0.1)
      if (metrics.cumulativeLayoutShift > 0.1) {
        console.warn('CLS exceeds target of 0.1');
      } else {
        console.log('CLS within target');
      }
    }
    
    if (metrics.firstInputDelay) {
      console.log('First Input Delay:', `${metrics.firstInputDelay.toFixed(2)}ms`);
      
      // Check against target (< 100ms)
      if (metrics.firstInputDelay > 100) {
        console.warn('FID exceeds target of 100ms');
      } else {
        console.log('FID within target');
      }
    }
    
    console.groupEnd();
  } else {
    // In production, send to analytics service
    // Example: analytics.track('page_performance', metrics);
    // For now, we'll just log a summary
    console.log('Performance metrics collected:', {
      pageLoadTime: metrics.pageLoadTime,
      fcp: metrics.firstContentfulPaint,
      lcp: metrics.largestContentfulPaint,
    });
  }
};

/**
 * Initializes performance monitoring
 * Should be called once when the app loads
 */
export const initPerformanceMonitoring = (): void => {
  if (typeof window === 'undefined') return;

  // Wait for page load to complete
  window.addEventListener('load', () => {
    // Delay measurement slightly to ensure all metrics are available
    setTimeout(() => {
      const metrics = measurePerformance();
      if (metrics) {
        logPerformanceMetrics(metrics);
      }
    }, 0);
  });

  // Monitor Cumulative Layout Shift
  if ('PerformanceObserver' in window) {
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      // Log CLS after 5 seconds
      setTimeout(() => {
        if (import.meta.env.DEV) {
          console.log('📊 Cumulative Layout Shift:', clsValue.toFixed(3));
          if (clsValue > 0.1) {
            console.warn('⚠️ CLS exceeds target of 0.1');
          } else {
            console.log('✅ CLS within target');
          }
        }
      }, 5000);
    } catch (e) {
      console.debug('CLS measurement not available:', e);
    }
  }

  // Monitor First Input Delay
  if ('PerformanceObserver' in window) {
    try {
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fid = (entry as any).processingStart - entry.startTime;
          if (import.meta.env.DEV) {
            console.log('📊 First Input Delay:', `${fid.toFixed(2)}ms`);
            if (fid > 100) {
              console.warn('⚠️ FID exceeds target of 100ms');
            } else {
              console.log('✅ FID within target');
            }
          }
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      console.debug('FID measurement not available:', e);
    }
  }
};

/**
 * Measures component render time
 * Useful for identifying performance bottlenecks
 * 
 * @param componentName - Name of the component being measured
 * @returns Function to call when render is complete
 */
export const measureComponentRender = (componentName: string): (() => void) => {
  const startTime = performance.now();
  
  return () => {
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    if (import.meta.env.DEV && renderTime > 16) {
      // Warn if render takes longer than 16ms (60fps threshold)
      console.warn(
        `⚠️ ${componentName} render took ${renderTime.toFixed(2)}ms (target: <16ms for 60fps)`
      );
    }
  };
};

/**
 * Track expensive operations for optimization
 */
interface OperationMetrics {
  name: string;
  duration: number;
  timestamp: number;
}

const operationMetrics: OperationMetrics[] = [];
const MAX_OPERATION_METRICS = 100;

/**
 * Measure the execution time of a synchronous operation
 */
export const measureOperation = <T>(
  name: string,
  fn: () => T
): T => {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;

  operationMetrics.push({
    name,
    duration,
    timestamp: Date.now(),
  });

  if (operationMetrics.length > MAX_OPERATION_METRICS) {
    operationMetrics.shift();
  }

  if (import.meta.env.DEV && duration > 16) {
    console.warn(`[Performance] ${name} took ${duration.toFixed(2)}ms (>16ms frame budget)`);
  }

  return result;
};

/**
 * Measure the execution time of an async operation
 */
export const measureOperationAsync = async <T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> => {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;

  operationMetrics.push({
    name,
    duration,
    timestamp: Date.now(),
  });

  if (operationMetrics.length > MAX_OPERATION_METRICS) {
    operationMetrics.shift();
  }

  if (import.meta.env.DEV && duration > 100) {
    console.warn(`[Performance] ${name} took ${duration.toFixed(2)}ms`);
  }

  return result;
};

/**
 * Get operation metrics for analysis
 */
export const getOperationMetrics = (): OperationMetrics[] => {
  return [...operationMetrics];
};

/**
 * Clear all operation metrics
 */
export const clearOperationMetrics = (): void => {
  operationMetrics.length = 0;
};

/**
 * Get average duration for a specific operation name
 */
export const getAverageOperationDuration = (name: string): number => {
  const filtered = operationMetrics.filter(m => m.name === name);
  if (filtered.length === 0) return 0;
  
  const total = filtered.reduce((sum, m) => sum + m.duration, 0);
  return total / filtered.length;
};

/**
 * Profile a React component render with detailed timing
 */
export const profileComponentRenderDetailed = (componentName: string): void => {
  if (import.meta.env.DEV) {
    const timestamp = new Date().toISOString();
    console.log(`[Performance] ${componentName} rendered at ${timestamp}`);
  }
};

/**
 * Create a performance mark for React Profiler
 */
export const createPerformanceMark = (markName: string): void => {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(markName);
  }
};

/**
 * Measure between two performance marks
 */
export const measureBetweenMarks = (measureName: string, startMark: string, endMark: string): number => {
  if (typeof performance !== 'undefined' && performance.measure) {
    try {
      performance.measure(measureName, startMark, endMark);
      const measure = performance.getEntriesByName(measureName)[0];
      return measure?.duration || 0;
    } catch (e) {
      console.warn(`[Performance] Failed to measure between marks: ${e}`);
      return 0;
    }
  }
  return 0;
};
