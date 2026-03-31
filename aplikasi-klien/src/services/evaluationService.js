import { supabase } from '../config/supabase.js';
import ErrorRecovery from '../utils/errors/ErrorRecovery.js';
import cleanLogger from '../config/cleanLogging.js';

/**
 * Service untuk mengelola evaluation metrics
 * Menyimpan dan menganalisis hasil evaluasi METEOR
 */
class EvaluationService {
  
  /**
   * Save evaluation metrics to database
   */
  static async saveEvaluationMetrics(evaluationData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const metrics = {
        user_id: user.id,
        scenario_id: evaluationData.scenario_id || null, // Allow null for temp scenarios
        request_id: evaluationData.request_id,
        meteor_score: evaluationData.meteor_score,
        precision_score: evaluationData.precision_score,
        recall_score: evaluationData.recall_score,
        fmean_score: evaluationData.fmean_score,
        fragmentation_penalty: evaluationData.fragmentation_penalty,
        generation_time_ms: evaluationData.generation_time_ms,
        quality_level: evaluationData.quality_level,
        reference_type: evaluationData.reference_type,
        reference_id: evaluationData.reference_id
      };

      const { data, error } = await supabase
        .from('evaluation_metrics')
        .insert(metrics)
        .select()
        .single();
      
      if (error) {
        console.error('❌ [EVALUATION] Database error:', error);
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      const recovery = ErrorRecovery.handleUnexpectedError(error, 'EVALUATION');
      cleanLogger.error('EVALUATION', recovery.userMessage);
      return { success: false, error: recovery.userMessage };
    }
  }
  
  /**
   * Get evaluation history for user
   */
  static async getEvaluationHistory(limit = 50) {
    try {
      const { data, error } = await supabase
        .from('evaluation_metrics')
        .select(`
          *,
          scenarios(title, feature_name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      return { success: true, data: data || [] };
    } catch (error) {
      const recovery = ErrorRecovery.handleUnexpectedError(error, 'EVALUATION');
      cleanLogger.error('EVALUATION', recovery.userMessage);
      return { success: false, error: recovery.userMessage };
    }
  }
  
  /**
   * Get evaluation stats for scenario
   */
  static async getScenarioEvaluationStats(scenarioId) {
    try {
      const { data, error } = await supabase
        .from('evaluation_metrics')
        .select('meteor_score, quality_level, created_at')
        .eq('scenario_id', scenarioId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Calculate stats
      const scores = data.map(d => d.meteor_score).filter(s => s !== null);
      const stats = {
        total_evaluations: data.length,
        average_score: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
        best_score: scores.length > 0 ? Math.max(...scores) : 0,
        latest_quality: data.length > 0 ? data[0].quality_level : null,
        improvement_trend: this.calculateTrend(scores)
      };
      
      return { success: true, data: stats };
    } catch (error) {
      const recovery = ErrorRecovery.handleUnexpectedError(error, 'EVALUATION');
      cleanLogger.error('EVALUATION', recovery.userMessage);
      return { success: false, error: recovery.userMessage };
    }
  }
  
  /**
   * Get user evaluation summary
   */
  static async getUserEvaluationSummary() {
    try {
      const { data, error } = await supabase
        .from('evaluation_metrics')
        .select('meteor_score, quality_level, created_at, generation_time_ms')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      const scores = data.map(d => d.meteor_score).filter(s => s !== null);
      const times = data.map(d => d.generation_time_ms).filter(t => t !== null);
      
      // Quality distribution
      const qualityDistribution = data.reduce((acc, item) => {
        acc[item.quality_level] = (acc[item.quality_level] || 0) + 1;
        return acc;
      }, {});
      
      const summary = {
        total_evaluations: data.length,
        average_score: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
        best_score: scores.length > 0 ? Math.max(...scores) : 0,
        worst_score: scores.length > 0 ? Math.min(...scores) : 0,
        average_generation_time: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
        quality_distribution: qualityDistribution,
        recent_trend: this.calculateTrend(scores.slice(0, 10)),
        score_history: scores.slice(0, 20) // Last 20 scores for chart
      };
      
      return { success: true, data: summary };
    } catch (error) {
      const recovery = ErrorRecovery.handleUnexpectedError(error, 'EVALUATION');
      cleanLogger.error('EVALUATION', recovery.userMessage);
      return { success: false, error: recovery.userMessage };
    }
  }
  
  /**
   * Calculate improvement trend from scores
   */
  static calculateTrend(scores) {
    if (scores.length < 2) return 'insufficient_data';
    
    const recent = scores.slice(0, Math.min(5, scores.length));
    const older = scores.slice(Math.min(5, scores.length));
    
    if (older.length === 0) return 'insufficient_data';
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    const diff = recentAvg - olderAvg;
    
    if (diff > 0.05) return 'improving';
    if (diff < -0.05) return 'declining';
    return 'stable';
  }
  
  /**
   * Get quality level from METEOR score
   */
  static getQualityLevel(meteorScore) {
    if (meteorScore >= 0.8) return 'excellent';
    if (meteorScore >= 0.6) return 'good';
    if (meteorScore >= 0.4) return 'acceptable';
    if (meteorScore >= 0.2) return 'poor';
    return 'very_poor';
  }
  
  /**
   * Get quality level color for UI
   */
  static getQualityColor(qualityLevel) {
    const colors = {
      'excellent': '#10B981', // green-500
      'good': '#3B82F6',      // blue-500
      'acceptable': '#F59E0B', // amber-500
      'poor': '#EF4444',      // red-500
      'very_poor': '#7C2D12'  // red-900
    };
    return colors[qualityLevel] || '#6B7280'; // gray-500
  }
}

export default EvaluationService;