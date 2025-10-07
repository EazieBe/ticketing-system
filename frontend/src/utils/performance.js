/**
 * Performance monitoring utilities for the frontend application
 * Tracks various performance metrics and provides optimization insights
 */

import logger from './logger';

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
    this.isEnabled = process.env.NODE_ENV === 'development' || 
                    (typeof window !== 'undefined' && window.location.search.includes('perf=true'));
    
    if (this.isEnabled && typeof window !== 'undefined') {
      this.initializeWebVitals();
      this.initializeResourceTiming();
    }
  }

  // Web Vitals monitoring
  initializeWebVitals() {
    // Largest Contentful Paint (LCP)
    this.observeLCP();
    
    // First Input Delay (FID)
    this.observeFID();
    
    // Cumulative Layout Shift (CLS)
    this.observeCLS();
    
    // First Contentful Paint (FCP)
    this.observeFCP();
  }

  observeLCP() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric('lcp', lastEntry.startTime);
        logger.performance('Largest Contentful Paint', lastEntry.startTime, {
          element: lastEntry.element?.tagName,
          url: lastEntry.url
        });
      });
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.set('lcp', observer);
    }
  }

  observeFID() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.recordMetric('fid', entry.processingStart - entry.startTime);
          logger.performance('First Input Delay', entry.processingStart - entry.startTime, {
            eventType: entry.name,
            target: entry.target?.tagName
          });
        });
      });
      
      observer.observe({ entryTypes: ['first-input'] });
      this.observers.set('fid', observer);
    }
  }

  observeCLS() {
    if ('PerformanceObserver' in window) {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.recordMetric('cls', clsValue);
        logger.performance('Cumulative Layout Shift', clsValue);
      });
      
      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('cls', observer);
    }
  }

  observeFCP() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.recordMetric('fcp', entry.startTime);
          logger.performance('First Contentful Paint', entry.startTime);
        });
      });
      
      observer.observe({ entryTypes: ['paint'] });
      this.observers.set('fcp', observer);
    }
  }

  // Resource timing monitoring
  initializeResourceTiming() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.analyzeResourceTiming(entry);
        });
      });
      
      observer.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', observer);
    }
  }

  analyzeResourceTiming(entry) {
    const duration = entry.responseEnd - entry.requestStart;
    const transferSize = entry.transferSize || 0;
    const decodedSize = entry.decodedBodySize || 0;
    
    // Log slow resources
    if (duration > 1000) { // > 1 second
      logger.warn('Slow resource detected', {
        name: entry.name,
        duration: Math.round(duration),
        size: transferSize,
        type: entry.initiatorType
      });
    }
    
    // Log large resources
    if (transferSize > 1024 * 1024) { // > 1MB
      logger.warn('Large resource detected', {
        name: entry.name,
        size: Math.round(transferSize / 1024 / 1024) + 'MB',
        type: entry.initiatorType
      });
    }
  }

  // Custom performance tracking
  startTimer(name) {
    const startTime = performance.now();
    this.metrics.set(name, { startTime });
    return startTime;
  }

  endTimer(name, details = {}) {
    const metric = this.metrics.get(name);
    if (!metric) {
      logger.warn(`Timer '${name}' was not started`);
      return null;
    }
    
    const duration = performance.now() - metric.startTime;
    this.recordMetric(name, duration);
    
    logger.performance(name, duration, details);
    this.metrics.delete(name);
    
    return duration;
  }

  recordMetric(name, value) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name).push({
      value,
      timestamp: Date.now()
    });
  }

  // API performance tracking
  trackApiCall(url, method) {
    const timerName = `api_${method}_${url}`;
    this.startTimer(timerName);
    return timerName;
  }

  endApiCall(timerName, status, responseSize = null) {
    const duration = this.endTimer(timerName, { status, responseSize });
    
    if (duration > 5000) { // > 5 seconds
      logger.warn('Slow API call detected', {
        url: timerName.replace(/^api_\w+_/, ''),
        method: timerName.split('_')[1],
        duration: Math.round(duration),
        status
      });
    }
    
    return duration;
  }

  // Component performance tracking
  trackComponentRender(componentName) {
    const timerName = `render_${componentName}`;
    this.startTimer(timerName);
    return timerName;
  }

  endComponentRender(timerName, props = {}) {
    const duration = this.endTimer(timerName, props);
    
    if (duration > 100) { // > 100ms
      logger.warn('Slow component render detected', {
        component: timerName.replace(/^render_/, ''),
        duration: Math.round(duration),
        props: Object.keys(props)
      });
    }
    
    return duration;
  }

  // Memory usage monitoring
  trackMemoryUsage() {
    if ('memory' in performance) {
      const memory = performance.memory;
      const usage = {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) // MB
      };
      
      this.recordMetric('memory_usage', usage);
      
      if (usage.used > usage.limit * 0.8) { // > 80% of limit
        logger.warn('High memory usage detected', usage);
      }
      
      return usage;
    }
    return null;
  }

  // Get performance report
  getReport() {
    const report = {
      webVitals: {},
      customMetrics: {},
      memory: this.trackMemoryUsage(),
      timestamp: new Date().toISOString()
    };
    
    // Collect Web Vitals
    ['lcp', 'fid', 'cls', 'fcp'].forEach(metric => {
      const values = this.metrics.get(metric);
      if (values && values.length > 0) {
        report.webVitals[metric] = {
          latest: values[values.length - 1].value,
          average: values.reduce((sum, v) => sum + v.value, 0) / values.length,
          count: values.length
        };
      }
    });
    
    // Collect custom metrics
    this.metrics.forEach((values, name) => {
      if (!['lcp', 'fid', 'cls', 'fcp'].includes(name)) {
        report.customMetrics[name] = {
          latest: values[values.length - 1].value,
          average: values.reduce((sum, v) => sum + v.value, 0) / values.length,
          count: values.length
        };
      }
    });
    
    return report;
  }

  // Cleanup
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.metrics.clear();
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Export both the instance and the class
export { PerformanceMonitor };
export default performanceMonitor;

// Convenience functions
export const startTimer = (name) => performanceMonitor.startTimer(name);
export const endTimer = (name, details) => performanceMonitor.endTimer(name, details);
export const trackApiCall = (url, method) => performanceMonitor.trackApiCall(url, method);
export const endApiCall = (timerName, status, responseSize) => performanceMonitor.endApiCall(timerName, status, responseSize);
export const trackComponentRender = (componentName) => performanceMonitor.trackComponentRender(componentName);
export const endComponentRender = (timerName, props) => performanceMonitor.endComponentRender(timerName, props);
export const getPerformanceReport = () => performanceMonitor.getReport();
