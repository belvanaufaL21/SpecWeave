import api from '../api.js';
import { METEOR_CONSTANTS } from '../../utils/constants/meteorConstants';
import { 
  analyzeStructuralDifferences, 
  getQualityInsight, 
  formatAnalysisReport 
} from '../../utils/helpers/meteorHelpers';

/**
 * Service untuk analisis METEOR (Metric for Evaluation of Translation with Explicit ORdering)
 * Menangani analisis kualitas skenario Gherkin yang dihasilkan AI
 */
class MeteorAnalysisService {
  /**
   * Request analisis detail dari AI
   */
  async requestDetailedAnalysis(groundTruthText, generatedText, meteorMetrics) {
    try {
      const response = await api.post('/meteor-analysis/detailed', {
        groundTruthText,
        generatedText,
        meteorMetrics
      });
      return response.data;
    } catch (error) {
      console.error('Error requesting detailed analysis:', error);
      throw error;
    }
  }

  /**
   * Dapatkan saran perbaikan berdasarkan analisis
   */
  async getSuggestions(groundTruthText, generatedText, meteorMetrics) {
    try {
      const response = await api.post('/meteor-analysis/suggestions', {
        groundTruthText,
        generatedText,
        meteorMetrics
      });
      return response.data;
    } catch (error) {
      console.error('Error getting suggestions:', error);
      throw error;
    }
  }

  /**
   * Generate skenario yang diperbaiki berdasarkan analisis
   */
  async generateImprovedScenario(groundTruthText, generatedText, meteorMetrics) {
    try {
      const response = await api.post('/meteor-analysis/improve', {
        groundTruthText,
        generatedText,
        meteorMetrics
      });
      return response.data;
    } catch (error) {
      console.error('Error generating improved scenario:', error);
      throw error;
    }
  }

  /**
   * Analisis perbedaan struktural antara ground truth dan generated text
   */
  analyzeStructuralDifferences(groundTruth, generated) {
    return analyzeStructuralDifferences(groundTruth, generated);
  }

  /**
   * Dapatkan insight kualitas berdasarkan skor METEOR
   */
  getQualityInsight(meteorScore) {
    return getQualityInsight(meteorScore);
  }

  /**
   * Format laporan analisis lengkap
   */
  formatAnalysisReport(groundTruth, generated, meteorMetrics) {
    return formatAnalysisReport(groundTruth, generated, meteorMetrics);
  }
}

export const meteorAnalysisService = new MeteorAnalysisService();
export default meteorAnalysisService;