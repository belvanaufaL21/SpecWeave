/**
 * React Component Performance Profiler
 * Higher-order component and hooks for measuring React component performance
 */

import { Profiler, useState, useEffect, useRef } from 'react';
import performanceMonitor from './performanceMonitor.js';

/**
 * Higher-order component for profiling React components
 */
export function withProfiler(WrappedComponent, componentName) {
  const ProfiledComponent = (props) => {
    const onRenderCallback = (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
      performanceMonitor.recordMetric('react-profiler', {
        componentName: componentName || id,
        phase,
        actualDuration,
        baseDuration,
        startTime,
        commitTime,
        renderEfficiency: baseDuration > 0 ? (actualDuration / baseDuration) * 100 : 100,
        timestamp: Date.now()
      });

      // Warn about slow renders in development
      if (process.env.NODE_ENV === 'development' && actualDuration > 16) {
        console.warn(`🐌 Slow render detected in ${componentName || id}: ${actualDuration.toFixed(2)}ms (${phase})`);
      }
    };

    return (
      <Profiler id={componentName || WrappedComponent.name} onRender={onRenderCallback}>
        <WrappedComponent {...props} />
      </Profiler>
    );
  };

  ProfiledComponent.displayName = `withProfiler(${componentName || WrappedComponent.displayName || WrappedComponent.name})`;
  return ProfiledComponent;
}

/**
 * Hook for measuring component lifecycle performance
 */
export function useComponentPerformance(componentName) {
  const mountTimeRef = useRef(null);
  const renderCountRef = useRef(0);
  const [performanceData, setPerformanceData] = useState(null);

  useEffect(() => {
    // Record mount time
    mountTimeRef.current = performance.now();
    
    performanceMonitor.recordMetric('component-mount', {
      componentName,
      mountTime: mountTimeRef.current,
      timestamp: Date.now()
    });

    return () => {
      // Record unmount and total lifecycle time
      const unmountTime = performance.now();
      const totalLifecycleTime = unmountTime - mountTimeRef.current;

      performanceMonitor.recordMetric('component-unmount', {
        componentName,
        unmountTime,
        totalLifecycleTime,
        totalRenders: renderCountRef.current,
        averageRenderTime: totalLifecycleTime / Math.max(1, renderCountRef.current),
        timestamp: Date.now()
      });
    };
  }, [componentName]);

  useEffect(() => {
    // Track each render
    renderCountRef.current += 1;
    
    const renderTime = performance.now();
    performanceMonitor.recordMetric('component-render', {
      componentName,
      renderNumber: renderCountRef.current,
      renderTime,
      timestamp: Date.now()
    });
  });

  const measureOperation = (operationName, operation) => {
    const timer = performanceMonitor.startTiming(`${componentName}-${operationName}`);
    
    if (typeof operation === 'function') {
      const result = operation();
      timer({ component: componentName, operation: operationName });
      return result;
    } else if (operation && typeof operation.then === 'function') {
      return operation.then(result => {
        timer({ component: componentName, operation: operationName });
        return result;
      });
    }
    
    return operation;
  };

  const getPerformanceData = () => {
    const summary = performanceMonitor.getSummary();
    return {
      componentName,
      mountTime: mountTimeRef.current,
      renderCount: renderCountRef.current,
      globalSummary: summary
    };
  };

  return {
    measureOperation,
    getPerformanceData,
    performanceData
  };
}

/**
 * Hook for measuring expensive operations
 */
export function usePerformanceTimer() {
  const timersRef = useRef(new Map());

  const startTimer = (name) => {
    const timer = performanceMonitor.startTiming(name);
    timersRef.current.set(name, timer);
    return timer;
  };

  const endTimer = (name, metadata = {}) => {
    const timer = timersRef.current.get(name);
    if (timer) {
      const duration = timer(metadata);
      timersRef.current.delete(name);
      return duration;
    }
    return 0;
  };

  const measureAsync = async (name, asyncOperation) => {
    const timer = startTimer(name);
    try {
      const result = await asyncOperation();
      endTimer(name, { success: true });
      return result;
    } catch (error) {
      endTimer(name, { success: false, error: error.message });
      throw error;
    }
  };

  const measureSync = (name, syncOperation) => {
    const timer = startTimer(name);
    try {
      const result = syncOperation();
      endTimer(name, { success: true });
      return result;
    } catch (error) {
      endTimer(name, { success: false, error: error.message });
      throw error;
    }
  };

  return {
    startTimer,
    endTimer,
    measureAsync,
    measureSync
  };
}

/**
 * Performance monitoring component for development
 */
export function PerformanceMonitorDisplay() {
  const [summary, setSummary] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const updateSummary = () => {
      setSummary(performanceMonitor.getSummary());
    };

    const interval = setInterval(updateSummary, 2000);
    updateSummary();

    return () => clearInterval(interval);
  }, []);

  if (process.env.NODE_ENV !== 'development' || !summary) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg hover:bg-blue-700 transition-colors"
      >
        📊 Performance
      </button>
      
      {isVisible && (
        <div className="absolute bottom-12 right-0 bg-gray-900 text-white p-4 rounded-lg shadow-xl w-80 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold">Performance Monitor</h3>
            <button
              onClick={() => performanceMonitor.clear()}
              className="text-xs bg-red-600 px-2 py-1 rounded hover:bg-red-700"
            >
              Clear
            </button>
          </div>
          
          <div className="space-y-2 text-xs">
            <div>
              <strong>Memory:</strong> {(summary.memoryUsage / 1024 / 1024).toFixed(1)} MB
            </div>
            
            <div>
              <strong>Timing Metrics:</strong> {summary.timingMetrics.count}
              <br />
              <span className="text-gray-300">
                Avg: {summary.timingMetrics.averageDuration.toFixed(1)}ms
              </span>
            </div>
            
            <div>
              <strong>Long Tasks:</strong> {summary.longTasks.count}
              <br />
              <span className="text-gray-300">
                Blocking: {summary.longTasks.totalBlockingTime.toFixed(1)}ms
              </span>
            </div>
            
            {Object.keys(summary.webVitals).length > 0 && (
              <div>
                <strong>Web Vitals:</strong>
                {Object.entries(summary.webVitals).map(([name, data]) => (
                  <div key={name} className="text-gray-300">
                    {name}: {data.value.toFixed(1)} ({data.rating})
                  </div>
                ))}
              </div>
            )}
            
            {summary.timingMetrics.slowestOperations.length > 0 && (
              <div>
                <strong>Slowest Operations:</strong>
                {summary.timingMetrics.slowestOperations.map((op, i) => (
                  <div key={i} className="text-gray-300">
                    {op.name}: {op.duration.toFixed(1)}ms
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}