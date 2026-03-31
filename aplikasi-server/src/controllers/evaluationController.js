import MeteorService from '../services/meteorService.js';
import PerformanceService from '../services/performanceService.js';
import { v4 as uuidv4 } from 'uuid';

const meteorService = new MeteorService();
const performanceService = new PerformanceService();

/**
 * Evaluation Controller
 * Handles METEOR evaluation endpoints and quality assessment
 */

/**
 * Evaluate a single scenario using METEOR
 * POST /api/evaluation/meteor
 */
export const evaluateScenario = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    // Start performance timer
    performanceService.startTimer(requestId, 'meteor_evaluation');
    
    const { candidate, reference, scenarioId } = req.body;
    
    if (!candidate || !reference) {
      return res.status(400).json({
        success: false,
        error: 'Both candidate and reference text are required'
      });
    }
    
    // METEOR service not available - return placeholder response
    const meteorResult = {
      meteor_score: 0.5,
      precision: 0.5,
      recall: 0.5,
      f_measure: 0.5
    };
    
    // End performance timer
    const performanceMetrics = performanceService.endTimer(requestId);
    
    // Basic quality assessment without meteor service
    const qualityAssessment = {
      level: 'moderate',
      description: 'METEOR service unavailable - placeholder assessment'
    };
    
    res.json({
      success: true,
      data: {
        meteor_metrics: meteorResult,
        quality_assessment: qualityAssessment,
        performance_metrics: performanceMetrics,
        meets_threshold: false,
        note: 'METEOR service is currently unavailable'
      }
    });
    
  } catch (error) {
    console.error('METEOR evaluation error:', error);
    
    // Record error metrics
    const errorMetrics = performanceService.recordError(requestId, error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to evaluate scenario with METEOR',
      details: error.message,
      performance_metrics: errorMetrics
    });
  }
};

/**
 * Evaluate multiple scenarios in batch
 * POST /api/evaluation/meteor/batch
 */
export const evaluateMultipleScenarios = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    performanceService.startTimer(requestId, 'meteor_batch_evaluation');
    
    const { scenarios } = req.body;
    
    if (!scenarios || !Array.isArray(scenarios)) {
      return res.status(400).json({
        success: false,
        error: 'Scenarios array is required'
      });
    }
    
    // METEOR service not available - return placeholder results
    const batchResult = scenarios.map(() => ({
      meteor_score: 0.5,
      precision: 0.5,
      recall: 0.5,
      f_measure: 0.5
    }));
    
    const performanceMetrics = performanceService.endTimer(requestId);
    
    res.json({
      success: true,
      data: {
        batch_results: batchResult,
        performance_metrics: performanceMetrics,
        note: 'METEOR service is currently unavailable'
      }
    });
    
  } catch (error) {
    console.error('Batch METEOR evaluation error:', error);
    
    const errorMetrics = performanceService.recordError(requestId, error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to evaluate scenarios in batch',
      details: error.message,
      performance_metrics: errorMetrics
    });
  }
};

/**
 * Get quality assessment for a METEOR score
 * GET /api/evaluation/quality/:score
 */
export const getQualityAssessment = async (req, res) => {
  try {
    const score = parseFloat(req.params.score);
    
    if (isNaN(score) || score < 0 || score > 1) {
      return res.status(400).json({
        success: false,
        error: 'Score must be a number between 0 and 1'
      });
    }
    
    // Basic quality assessment without meteor service
    let assessment;
    if (score >= 0.8) {
      assessment = { level: 'excellent', description: 'High quality match' };
    } else if (score >= 0.6) {
      assessment = { level: 'good', description: 'Good quality match' };
    } else if (score >= 0.4) {
      assessment = { level: 'moderate', description: 'Moderate quality match' };
    } else {
      assessment = { level: 'poor', description: 'Poor quality match' };
    }
    
    res.json({
      success: true,
      data: {
        score,
        assessment,
        meets_threshold: score >= 0.6,
        note: 'METEOR service is currently unavailable - using basic assessment'
      }
    });
    
  } catch (error) {
    console.error('Quality assessment error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get quality assessment',
      details: error.message
    });
  }
};

/**
 * Get performance statistics
 * GET /api/evaluation/performance/stats
 */
export const getPerformanceStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: last 7 days
    const end = endDate ? new Date(endDate) : new Date();
    
    const stats = await performanceService.getPerformanceStats(start, end);
    
    res.json({
      success: true,
      data: {
        period: {
          startDate: start.toISOString(),
          endDate: end.toISOString()
        },
        statistics: stats
      }
    });
    
  } catch (error) {
    console.error('Performance stats error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get performance statistics',
      details: error.message
    });
  }
};

/**
 * Generate performance report
 * GET /api/evaluation/performance/report
 */
export const generatePerformanceReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const end = endDate ? new Date(endDate) : new Date();
    
    const report = await performanceService.generatePerformanceReport(start, end);
    
    res.json({
      success: true,
      data: report
    });
    
  } catch (error) {
    console.error('Performance report error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate performance report',
      details: error.message
    });
  }
};

/**
 * Get current system metrics
 * GET /api/evaluation/performance/current
 */
export const getCurrentMetrics = async (req, res) => {
  try {
    const metrics = performanceService.getCurrentMetrics();
    
    res.json({
      success: true,
      data: metrics
    });
    
  } catch (error) {
    console.error('Current metrics error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get current metrics',
      details: error.message
    });
  }
};

/**
 * Test METEOR evaluation with sample data
 * POST /api/evaluation/test
 */
export const testMeteorEvaluation = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    performanceService.startTimer(requestId, 'meteor_test');
    
    // Sample test data
    const candidate = "Given pengguna berada di halaman login When pengguna memasukkan email dan password yang valid Then pengguna berhasil masuk ke dashboard";
    const reference = "Given pengguna di halaman login When pengguna input kredensial valid Then pengguna masuk sistem";
    
    // METEOR service not available - return placeholder result
    const meteorResult = {
      meteor_score: 0.75,
      precision: 0.8,
      recall: 0.7,
      f_measure: 0.75
    };
    
    const performanceMetrics = performanceService.endTimer(requestId);
    
    const qualityAssessment = {
      level: 'good',
      description: 'Good quality match (placeholder assessment)'
    };
    
    res.json({
      success: true,
      message: 'METEOR evaluation test completed (service unavailable - using placeholder)',
      data: {
        test_input: { candidate, reference },
        meteor_metrics: meteorResult,
        quality_assessment: qualityAssessment,
        performance_metrics: performanceMetrics,
        note: 'METEOR service is currently unavailable'
      }
    });
    
  } catch (error) {
    console.error('METEOR test error:', error);
    
    const errorMetrics = performanceService.recordError(requestId, error);
    
    res.status(500).json({
      success: false,
      error: 'METEOR evaluation test failed',
      details: error.message,
      performance_metrics: errorMetrics
    });
  }
};