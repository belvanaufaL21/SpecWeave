/**
 * Frontend Performance Monitoring Utilities
 * Provides comprehensive performance tracking for React components and user interactions
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
    this.isEnabled = process.env.NODE_ENV === 'development' || process.env.ENABLE_PERFORMANCE_MONITORING === 'true';
    
    if (this.isEnabled) {
      this.initializeObservers();
    }
  }

  /**
   * Initialize performance observers
   */
  initializeObservers() {
    // Long Task Observer
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              this.recordMetric('long-task', {
                duration: entry.duration,
                startTime: entry.startTime,
                name: entry.name,
                timestamp: Date.now()
              });
            }
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', longTaskObserver);
      } catch (error) {
        console.warn('Long task observer not supported:', error);
      }

      // Navigation Observer
      try {
        const navigationObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric('navigation', {
              domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
              loadComplete: entry.loadEventEnd - entry.loadEventStart,
              domInteractive: entry.domInteractive - entry.navigationStart,
              firstPaint: entry.responseEnd - entry.requestStart,
              timestamp: Date.now()
            });
          }
        });
        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.set('navigation', navigationObserver);
      } catch (error) {
        console.warn('Navigation observer not supported:', error);
      }
    }
  }

  /**
   * Start timing a performance metric
   */
  startTiming(name) {
    if (!this.isEnabled) return () => {};

    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    return (metadata = {}) => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      const endMemory = this.getMemoryUsage();

      this.recordMetric('timing', {
        name,
        duration,
        startTime,
        endTime,
        memoryDelta: endMemory - startMemory,
        metadata,
        timestamp: Date.now()
      });

      return duration;
    };
  }

  /**
   * Record a performance metric
   */
  recordMetric(type, data) {
    if (!this.isEnabled) return;

    const key = `${type}-${Date.now()}`;
    this.metrics.set(key, {
      type,
      data,
      timestamp: Date.now()
    });

    // Emit custom event for real-time monitoring
    window.dispatchEvent(new CustomEvent('performance-metric', {
      detail: { type, data }
    }));

    // Clean up old metrics (keep last 1000)
    if (this.metrics.size > 1000) {
      const oldestKey = this.metrics.keys().next().value;
      this.metrics.delete(oldestKey);
    }
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage() {
    if ('memory' in performance) {
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Measure component render performance
   */
  measureRender(componentName, renderFn) {
    if (!this.isEnabled) return renderFn();

    const timer = this.startTiming(`render-${componentName}`);
    const result = renderFn();
    timer({ component: componentName });
    
    return result;
  }

  /**
   * Track Web Vitals
   */
  trackWebVitals() {
    if (!this.isEnabled || typeof window === 'undefined') return;

    // Import web-vitals dynamically to avoid SSR issues
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      const sendToAnalytics = (metric) => {
        this.recordMetric('web-vital', {
          name: metric.name,
          value: metric.value,
          id: metric.id,
          delta: metric.delta,
          rating: metric.rating
        });
      };

      getCLS(sendToAnalytics);
      getFID(sendToAnalytics);
      getFCP(sendToAnalytics);
      getLCP(sendToAnalytics);
      getTTFB(sendToAnalytics);
    }).catch(() => {
      console.warn('Web Vitals not available');
    });
  }

  /**
   * Get performance summary
   */
  getSummary() {
    if (!this.isEnabled) return null;

    const metrics = Array.from(this.metrics.values());
    const timingMetrics = metrics.filter(m => m.type === 'timing');
    const longTasks = metrics.filter(m => m.type === 'long-task');
    const webVitals = metrics.filter(m => m.type === 'web-vital');

    return {
      totalMetrics: metrics.length,
      timingMetrics: {
        count: timingMetrics.length,
        averageDuration: timingMetrics.length > 0 
          ? timingMetrics.reduce((sum, m) => sum + m.data.duration, 0) / timingMetrics.length 
          : 0,
        slowestOperations: timingMetrics
          .sort((a, b) => b.data.duration - a.data.duration)
          .slice(0, 5)
          .map(m => ({
            name: m.data.name,
            duration: m.data.duration,
            timestamp: m.timestamp
          }))
      },
      longTasks: {
        count: longTasks.length,
        totalBlockingTime: longTasks.reduce((sum, m) => sum + Math.max(0, m.data.duration - 50), 0)
      },
      webVitals: webVitals.reduce((acc, m) => {
        acc[m.data.name] = {
          value: m.data.value,
          rating: m.data.rating
        };
        return acc;
      }, {}),
      memoryUsage: this.getMemoryUsage()
    };
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics.clear();
  }

  /**
   * Cleanup observers
   */
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.metrics.clear();
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Auto-track web vitals on load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    performanceMonitor.trackWebVitals();
  });
}

export default performanceMonitor;