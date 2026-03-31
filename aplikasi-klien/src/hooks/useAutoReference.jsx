import { useState, useCallback, useRef } from 'react';
import { autoReferenceService } from '../services/reference/AutoReferenceService';

/**
 * Hook untuk menggunakan sistem auto reference
 * Menggantikan manual reference selection dengan analisis otomatis
 */
export const useAutoReference = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [patterns, setPatterns] = useState([]);
  const [error, setError] = useState(null);
  const [lastAnalysis, setLastAnalysis] = useState(null);
  
  // Cache untuk menghindari analisis berulang
  const analysisCache = useRef(new Map());

  /**
   * Analyze patterns dari reference library
   */
  const analyzePatterns = useCallback(async (forceRefresh = false) => {
    if (isAnalyzing) return patterns;

    // Check cache first
    const cacheKey = 'patterns_analysis';
    const cached = analysisCache.current.get(cacheKey);
    if (!forceRefresh && cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      
      setPatterns(cached.data);
      return cached.data;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      
      const analyzedPatterns = await autoReferenceService.analyzeReferencePatterns();
      
      setPatterns(analyzedPatterns);
      setLastAnalysis(new Date());
      
      // Cache results
      analysisCache.current.set(cacheKey, {
        data: analyzedPatterns,
        timestamp: Date.now()
      });

      return analyzedPatterns;

    } catch (err) {
      console.error('❌ [USE-AUTO-REFERENCE] Pattern analysis failed:', err);
      setError(err.message);
      return [];
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, patterns]);

  /**
   * Generate scenario berdasarkan user story
   */
  const generateFromUserStory = useCallback(async (userStory, options = {}) => {
    if (!userStory?.trim()) {
      throw new Error('User story is required');
    }

    setError(null);

    try {
      
      const result = await autoReferenceService.generateScenarioFromUserStory(userStory, options);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate scenario');
      }

      return result;

    } catch (err) {
      console.error('❌ [USE-AUTO-REFERENCE] Scenario generation failed:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Get pattern statistics
   */
  const getPatternStats = useCallback(() => {
    if (patterns.length === 0) {
      return {
        totalPatterns: 0,
        categoryPatterns: 0,
        structurePatterns: 0,
        averageWeight: 0,
        lastAnalysis: lastAnalysis
      };
    }

    const categoryPatterns = patterns.filter(p => p.type === 'category').length;
    const structurePatterns = patterns.filter(p => p.type === 'structure').length;
    const totalWeight = patterns.reduce((sum, p) => sum + (p.weight || 0), 0);
    const averageWeight = totalWeight / patterns.length;

    return {
      totalPatterns: patterns.length,
      categoryPatterns,
      structurePatterns,
      averageWeight: Math.round(averageWeight * 10) / 10,
      lastAnalysis: lastAnalysis
    };
  }, [patterns, lastAnalysis]);

  /**
   * Clear cache dan force refresh
   */
  const refreshPatterns = useCallback(async () => {
    analysisCache.current.clear();
    autoReferenceService.clearCache();
    return await analyzePatterns(true);
  }, [analyzePatterns]);

  /**
   * Get patterns by category
   */
  const getPatternsByCategory = useCallback((category) => {
    return patterns.filter(pattern => 
      pattern.type === 'category' && pattern.category === category
    );
  }, [patterns]);

  /**
   * Get most used patterns
   */
  const getMostUsedPatterns = useCallback((limit = 5) => {
    return patterns
      .filter(pattern => pattern.usage?.totalUsage > 0)
      .sort((a, b) => (b.usage?.totalUsage || 0) - (a.usage?.totalUsage || 0))
      .slice(0, limit);
  }, [patterns]);

  /**
   * Get highest quality patterns
   */
  const getHighestQualityPatterns = useCallback((limit = 5) => {
    return patterns
      .filter(pattern => pattern.usage?.averageScore != null)
      .sort((a, b) => (b.usage?.averageScore || 0) - (a.usage?.averageScore || 0))
      .slice(0, limit);
  }, [patterns]);

  return {
    // State
    isAnalyzing,
    patterns,
    error,
    lastAnalysis,

    // Actions
    analyzePatterns,
    generateFromUserStory,
    refreshPatterns,

    // Getters
    getPatternStats,
    getPatternsByCategory,
    getMostUsedPatterns,
    getHighestQualityPatterns,

    // Utils
    clearError: () => setError(null)
  };
};