import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../config/supabase.js';

/**
 * Performance monitoring middleware
 * Logs API performance metrics to database
 */
export const performanceMiddleware = (req, res, next) => {
  const requestId = uuidv4();
  const startTime = new Date();
  
  req.requestId = requestId;
  req.startTime = startTime;
  
  // Override res.json to capture response and log performance
  const originalJson = res.json;
  res.json = function(data) {
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    
    // Log performance asynchronously (don't block response)
    setImmediate(async () => {
      try {
        await logPerformanceMetrics({
          request_id: requestId,
          user_id: req.user?.id || null,
          operation_type: `${req.method} ${req.route?.path || req.path}`,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          duration_ms: duration,
          success: res.statusCode < 400,
          error_message: res.statusCode >= 400 ? data?.error || data?.message || 'Unknown error' : null,
          metadata: {
            status_code: res.statusCode,
            user_agent: req.get('User-Agent'),
            ip: req.ip,
            method: req.method,
            path: req.path,
            query: req.query,
            body_size: JSON.stringify(req.body || {}).length,
            response_size: JSON.stringify(data || {}).length
          }
        });
      } catch (error) {
        console.error('❌ [PERFORMANCE] Error logging performance metrics:', error);
      }
    });
    
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Log performance metrics to database
 */
async function logPerformanceMetrics(performanceData) {
  // Skip performance logging if disabled
  if (process.env.SKIP_PERFORMANCE_LOGS_TABLE === 'true') {
    return { success: true, skipped: true };
  }

  try {
    // Truncate operation_type to fit database constraint
    const truncatedData = {
      ...performanceData,
      operation_type: performanceData.operation_type?.substring(0, 50) || 'unknown',
      error_message: performanceData.error_message?.substring(0, 500) || null
    };

    const { data, error } = await supabaseAdmin
      .from('performance_logs')
      .insert(truncatedData)
      .select()
      .single();
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    // Silently fail performance logging to avoid spam
    return { success: false, error: error.message };
  }
}

/**
 * Get performance analytics
 */
export async function getPerformanceAnalytics(timeRange = '24h', userId = null) {
  try {
    let timeFilter;
    const now = new Date();
    
    switch (timeRange) {
      case '1h':
        timeFilter = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        timeFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        timeFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        timeFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        timeFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    
    let query = supabaseAdmin
      .from('performance_logs')
      .select('*')
      .gte('created_at', timeFilter.toISOString())
      .order('created_at', { ascending: false });
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Calculate analytics
    const analytics = {
      total_requests: data.length,
      success_rate: data.length > 0 ? (data.filter(d => d.success).length / data.length) * 100 : 0,
      average_duration: data.length > 0 ? data.reduce((sum, d) => sum + d.duration_ms, 0) / data.length : 0,
      median_duration: calculateMedian(data.map(d => d.duration_ms)),
      p95_duration: calculatePercentile(data.map(d => d.duration_ms), 95),
      slowest_operations: data
        .sort((a, b) => b.duration_ms - a.duration_ms)
        .slice(0, 10)
        .map(d => ({
          operation: d.operation_type,
          duration: d.duration_ms,
          timestamp: d.created_at,
          success: d.success,
          error: d.error_message
        })),
      error_rate_by_operation: calculateErrorRateByOperation(data),
      performance_trend: calculatePerformanceTrend(data),
      requests_by_hour: calculateRequestsByHour(data, timeRange),
      status_code_distribution: calculateStatusCodeDistribution(data)
    };
    
    return { success: true, data: analytics };
  } catch (error) {
    console.error('❌ [PERFORMANCE] Error getting analytics:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Calculate median value
 */
function calculateMedian(values) {
  if (values.length === 0) return 0;
  
  const sorted = values.sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  return sorted.length % 2 !== 0 
    ? sorted[mid] 
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate percentile
 */
function calculatePercentile(values, percentile) {
  if (values.length === 0) return 0;
  
  const sorted = values.sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  
  return sorted[Math.max(0, index)];
}

/**
 * Calculate error rate by operation
 */
function calculateErrorRateByOperation(data) {
  const operations = {};
  
  data.forEach(log => {
    if (!operations[log.operation_type]) {
      operations[log.operation_type] = { total: 0, errors: 0 };
    }
    operations[log.operation_type].total++;
    if (!log.success) {
      operations[log.operation_type].errors++;
    }
  });
  
  return Object.entries(operations)
    .map(([operation, stats]) => ({
      operation,
      error_rate: (stats.errors / stats.total) * 100,
      total_requests: stats.total,
      errors: stats.errors
    }))
    .sort((a, b) => b.error_rate - a.error_rate);
}

/**
 * Calculate performance trend
 */
function calculatePerformanceTrend(data) {
  if (data.length < 10) return 'insufficient_data';
  
  const sortedData = data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const midpoint = Math.floor(sortedData.length / 2);
  
  const firstHalf = sortedData.slice(0, midpoint);
  const secondHalf = sortedData.slice(midpoint);
  
  const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.duration_ms, 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d.duration_ms, 0) / secondHalf.length;
  
  const improvement = ((firstHalfAvg - secondHalfAvg) / firstHalfAvg) * 100;
  
  if (improvement > 10) return 'improving';
  if (improvement < -10) return 'degrading';
  return 'stable';
}

/**
 * Calculate requests by hour
 */
function calculateRequestsByHour(data, timeRange) {
  const hours = {};
  
  data.forEach(log => {
    const hour = new Date(log.created_at).getHours();
    hours[hour] = (hours[hour] || 0) + 1;
  });
  
  // Fill missing hours with 0
  const maxHours = timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : 24;
  for (let i = 0; i < maxHours; i++) {
    if (!hours[i]) hours[i] = 0;
  }
  
  return Object.entries(hours)
    .map(([hour, count]) => ({ hour: parseInt(hour), requests: count }))
    .sort((a, b) => a.hour - b.hour);
}

/**
 * Calculate status code distribution
 */
function calculateStatusCodeDistribution(data) {
  const statusCodes = {};
  
  data.forEach(log => {
    const statusCode = log.metadata?.status_code || 'unknown';
    statusCodes[statusCode] = (statusCodes[statusCode] || 0) + 1;
  });
  
  return Object.entries(statusCodes)
    .map(([code, count]) => ({ status_code: code, count }))
    .sort((a, b) => b.count - a.count);
}

export default performanceMiddleware;