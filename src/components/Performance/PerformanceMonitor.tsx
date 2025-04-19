'use client';

import { useEffect, useState } from 'react';
import { FiCpu, FiDatabase, FiClock, FiAlertCircle } from 'react-icons/fi';

interface PerformanceMetrics {
  pageLoadTime: number;
  memoryUsage: number | null;
  renderTime: number;
  networkRequests: number;
}

interface PerformanceMonitorProps {
  enabled?: boolean;
  showDetails?: boolean;
}

/**
 * Component to monitor and display performance metrics
 * Only visible in development mode or when explicitly enabled
 */
export default function PerformanceMonitor({ 
  enabled = process.env.NODE_ENV === 'development',
  showDetails = false
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    pageLoadTime: 0,
    memoryUsage: null,
    renderTime: 0,
    networkRequests: 0
  });
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(showDetails);

  useEffect(() => {
    if (!enabled) return;

    // Start timing for component render
    const renderStart = performance.now();
    
    // Function to collect metrics
    const collectMetrics = () => {
      // Get page load time
      const pageLoadTime = window.performance.timing.loadEventEnd - 
                          window.performance.timing.navigationStart;
      
      // Get memory usage if available
      const memoryUsage = (performance as any).memory?.usedJSHeapSize / (1024 * 1024) || null;
      
      // Calculate render time
      const renderTime = performance.now() - renderStart;
      
      // Count network requests
      const resources = performance.getEntriesByType('resource');
      const networkRequests = resources.length;
      
      setMetrics({
        pageLoadTime,
        memoryUsage,
        renderTime,
        networkRequests
      });
      
      setVisible(true);
    };
    
    // Collect metrics after page load
    if (document.readyState === 'complete') {
      collectMetrics();
    } else {
      window.addEventListener('load', collectMetrics);
      return () => window.removeEventListener('load', collectMetrics);
    }
  }, [enabled]);
  
  // Don't render anything if disabled or metrics not collected yet
  if (!enabled || !visible) return null;
  
  // Format memory usage
  const formattedMemory = metrics.memoryUsage !== null 
    ? `${metrics.memoryUsage.toFixed(1)} MB` 
    : 'N/A';
  
  // Determine if any metrics are concerning
  const isMemoryHigh = metrics.memoryUsage !== null && metrics.memoryUsage > 100;
  const isLoadTimeSlow = metrics.pageLoadTime > 3000;
  const isRenderTimeSlow = metrics.renderTime > 500;
  const hasWarnings = isMemoryHigh || isLoadTimeSlow || isRenderTimeSlow;
  
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-lg p-3 text-xs border border-gray-200 max-w-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <FiCpu className="mr-2 text-blue-500" />
          <span className="font-medium">Performance Monitor</span>
        </div>
        {hasWarnings && (
          <FiAlertCircle className="text-yellow-500 ml-2" title="Performance issues detected" />
        )}
        <button 
          onClick={() => setExpanded(!expanded)}
          className="ml-4 text-gray-500 hover:text-gray-700"
        >
          {expanded ? '−' : '+'}
        </button>
      </div>
      
      {expanded && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FiClock className="mr-2 text-gray-500" />
              <span>Page Load:</span>
            </div>
            <span className={isLoadTimeSlow ? 'text-red-500 font-medium' : ''}>
              {(metrics.pageLoadTime / 1000).toFixed(2)}s
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FiCpu className="mr-2 text-gray-500" />
              <span>Render Time:</span>
            </div>
            <span className={isRenderTimeSlow ? 'text-red-500 font-medium' : ''}>
              {metrics.renderTime.toFixed(0)}ms
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FiDatabase className="mr-2 text-gray-500" />
              <span>Memory Usage:</span>
            </div>
            <span className={isMemoryHigh ? 'text-red-500 font-medium' : ''}>
              {formattedMemory}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FiClock className="mr-2 text-gray-500" />
              <span>Network Requests:</span>
            </div>
            <span>{metrics.networkRequests}</span>
          </div>
          
          <div className="mt-2 pt-2 border-t border-gray-200 text-gray-500 text-[10px]">
            This monitor is only visible in development mode.
          </div>
        </div>
      )}
    </div>
  );
}
