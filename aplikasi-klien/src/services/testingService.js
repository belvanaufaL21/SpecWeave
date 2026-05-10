import api from './api.js';
import cleanLogger from '../config/cleanLogging.js';

/**
 * Testing Service for METEOR and Sentence-BERT evaluations
 */
class TestingService {
  
  /**
   * Run METEOR test evaluation
   * @param {Object} testData - Test data containing scenarioId, generatedText, referenceText
   * @returns {Promise<Object>} Test result with score and details
   */
  static async runMeteorTest(testData) {
    try {
      // Log: Starting evaluation
      cleanLogger.evaluationStart();
      
      const response = await api.post('/testing/meteor', testData);
      
      // Log: Evaluation success
      cleanLogger.evaluationSuccess();
      
      // Extract the data property from the API response
      const result = response.data.data || response.data;
      
      // Debug logging
      console.log('🔍 API Response:', response.data);
      console.log('🔍 Extracted result:', result);
      console.log('🔍 METEOR metrics:', result.meteorMetrics);
      console.log('🔍 METEOR score:', result.meteorMetrics?.score);
      
      return result;
    } catch (error) {
      console.error('METEOR test failed:', error);
      
      // Log: Evaluation failed
      cleanLogger.evaluationFailed(error.message);
      
      throw new Error(error.message || 'Gagal menjalankan pengujian METEOR');
    }
  }

  /**
   * Run Sentence-BERT test evaluation
   * @param {Object} testData - Test data containing scenarioId, generatedText, referenceText
   * @returns {Promise<Object>} Test result with score and details
   */
  static async runSentenceBertTest(testData) {
    try {
      // Log: Starting evaluation
      cleanLogger.evaluationStart();
      
      const response = await api.post('/testing/sentence-bert', testData);
      
      // Log: Evaluation success
      cleanLogger.evaluationSuccess();
      
      // Extract the data property from the API response
      return response.data.data || response.data;
    } catch (error) {
      console.error('Sentence-BERT test failed:', error);
      
      // Log: Evaluation failed
      cleanLogger.evaluationFailed(error.message);
      
      throw new Error(error.message || 'Gagal menjalankan pengujian Sentence-BERT');
    }
  }

  /**
   * Get test results for a specific scenario
   * @param {string} scenarioId - The scenario ID
   * @returns {Promise<Object>} Test results history
   */
  static async getTestResults(scenarioId) {
    try {
      const response = await api.get(`/testing/results/${scenarioId}`);
      // Extract the data property from the API response
      return response.data.data || response.data;
    } catch (error) {
      console.error('Failed to get test results:', error);
      throw new Error(error.message || 'Gagal mengambil hasil pengujian');
    }
  }

  /**
   * Submit test based on test type
   * @param {Object} testRequest - Test request object
   * @param {string} testRequest.testType - 'meteor' or 'sentence_bert'
   * @param {string} testRequest.scenarioId - Scenario identifier
   * @param {string} testRequest.generatedText - Generated scenario text
   * @param {string} testRequest.referenceText - Reference scenario text
   * @returns {Promise<Object>} Test result
   */
  static async submitTest(testRequest) {
    const { testType, ...testData } = testRequest;
    
    switch (testType) {
      case 'meteor':
        return await this.runMeteorTest(testData);
      case 'sentence_bert':
        return await this.runSentenceBertTest(testData);
      default:
        throw new Error(`Tipe pengujian tidak valid: ${testType}`);
    }
  }

  /**
   * Validate test request data
   * @param {Object} testRequest - Test request to validate
   * @returns {Object} Validation result with isValid and errors
   */
  static validateTestRequest(testRequest) {
    const errors = [];
    
    if (!testRequest.scenarioId) {
      errors.push('Scenario ID is required');
    }
    
    if (!testRequest.generatedText || !testRequest.generatedText.trim()) {
      errors.push('Generated text is required');
    }
    
    if (!testRequest.referenceText || !testRequest.referenceText.trim()) {
      errors.push('Reference text is required');
    }
    
    if (!testRequest.testType || !['meteor', 'sentence_bert'].includes(testRequest.testType)) {
      errors.push('Valid test type is required (meteor or sentence_bert)');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Format test result for display
   * @param {Object} result - Raw test result from API
   * @returns {Object} Formatted result for UI display
   */
  static formatTestResult(result) {
    // Version identifier for cache busting
    console.log('🔧 formatTestResult v4.0 - ROBUST PARSING WITH FALLBACKS');
    console.log('📊 Input result:', result);
    
    if (!result) {
      console.log('❌ Result is null/undefined');
      return null;
    }

    // Handle the actual API response structure
    // Server returns: { testResult: {...}, meteorMetrics: {...} } or { testResult: {...}, sentenceBertMetrics: {...} }
    const testResult = result.testResult;
    const meteorMetrics = result.meteorMetrics;
    const sentenceBertMetrics = result.sentenceBertMetrics;
    
    console.log('🔍 Components check:', {
      hasTestResult: !!testResult,
      hasMeteorMetrics: !!meteorMetrics,
      hasSentenceBertMetrics: !!sentenceBertMetrics,
      meteorScore: meteorMetrics?.score,
      sentenceBertScore: sentenceBertMetrics?.score,
      meteorSuccess: meteorMetrics?.success,
      sentenceBertSuccess: sentenceBertMetrics?.success
    });
    
    // If we have a saved test result (authenticated user), use it
    if (testResult) {
      console.log('✅ Using testResult (authenticated user)');
      
      // Robust parsing with multiple fallback paths for METEOR metrics
      const testType = testResult.test_type;
      const details = testResult.test_details || {};
      
      let formattedDetails = {};
      
      // Handle DUAL testing
      if (testType === 'dual') {
        console.log('✅ Parsing DUAL test result');
        
        // Extract METEOR and Sentence-BERT data from test_details
        const meteorData = details.meteor || {};
        const sbertData = details.sentence_bert || {};
        
        console.log('🔍 [DUAL-PARSE] Meteor data from DB:', {
          hasMeteorData: !!meteorData,
          meteorKeys: Object.keys(meteorData),
          hasSectionMetrics: !!meteorData.section_metrics,
          sectionMetricsKeys: meteorData.section_metrics ? Object.keys(meteorData.section_metrics) : [],
          sectionMetrics: meteorData.section_metrics
        });
        
        // Use METEOR score as primary score
        const score = testResult.score ?? meteorData.score ?? 0;
        
        const formatted = {
          id: testResult.id,
          scenarioId: testResult.scenario_id,
          testType: 'dual',
          score: score,
          // Include both METEOR and Sentence-BERT details
          meteor: {
            score: meteorData.score ?? 0,
            precision: meteorData.precision ?? 0,
            recall: meteorData.recall ?? 0,
            f_mean: meteorData.f_mean ?? 0,
            penalty: meteorData.penalty ?? 0,
            chunks: meteorData.chunks ?? 0,
            matches: meteorData.matches ?? 0,
            section_metrics: meteorData.section_metrics || {}, // ADD section_metrics!
            detailed_metrics: {
              section_metrics: meteorData.section_metrics || {},
              ...meteorData
            },
            formattedScore: this.formatScore(meteorData.score ?? 0, 'meteor'),
            qualityLevel: this.getQualityLevel(meteorData.score ?? 0)
          },
          sentence_bert: {
            score: sbertData.score ?? 0,
            details: sbertData.details || {},
            section_scores: sbertData.section_scores || sbertData.sentence_bert_scores || {},
            formattedScore: this.formatScore(sbertData.score ?? 0, 'sentence_bert'),
            qualityLevel: this.getQualityLevel(sbertData.score ?? 0)
          },
          details: details,
          generatedText: details.generatedText || testResult.generated_text || '',
          referenceText: details.referenceText || testResult.reference_text || '',
          scenarioTitle: testResult.scenario_title || null, // Add scenario title
          timestamp: details.timestamp || testResult.created_at,
          createdAt: testResult.created_at,
          formattedScore: this.formatScore(score, 'meteor'),
          qualityLevel: this.getQualityLevel(score)
        };
        
        console.log('📋 Formatted DUAL testResult:', formatted);
        return formatted;
      }
      
      if (testType === 'meteor') {
        console.log('✅ Parsing METEOR test result');
        console.log('📦 Raw test_details:', details);
        console.log('📦 test_details keys:', Object.keys(details));
        console.log('📦 Overall metrics from test_details:', {
          precision: details.precision,
          recall: details.recall,
          f_mean: details.f_mean,
          penalty: details.penalty,
          chunks: details.chunks,
          matches: details.matches,
          generated_tokens: details.generated_tokens,
          reference_tokens: details.reference_tokens,
        });
        console.log('📦 section_metrics check:', {
          hasSection: !!details.section_metrics,
          sectionKeys: details.section_metrics ? Object.keys(details.section_metrics) : []
        });
        
        // Try multiple paths for METEOR score
        const score = testResult.score ?? testResult.meteor_score ?? details.score ?? 0;
        
        // FIXED: Use overall metrics from test_details (from backend _transformMeteorRow)
        const precision = details.precision ?? testResult.precision ?? 0;
        const recall = details.recall ?? testResult.recall ?? 0;
        const f_mean = details.f_mean ?? testResult.f_mean ?? 0;
        const penalty = details.penalty ?? testResult.penalty ?? 0;
        const chunks = details.chunks ?? testResult.chunks ?? 0;
        const matches = details.matches ?? testResult.matches ?? 0;
        const generated_tokens = details.generated_tokens ?? testResult.generated_tokens ?? 0;
        const reference_tokens = details.reference_tokens ?? testResult.reference_tokens ?? 0;
        
        // IMPORTANT: Get section_metrics from test_details
        const section_metrics = details.section_metrics || {};
        
        // Build detailed_metrics object with all available data INCLUDING section_metrics
        const detailedMetrics = {
          precision,
          recall,
          f_mean,
          penalty,
          chunks,
          matches,
          generated_tokens,
          reference_tokens,
          section_metrics: section_metrics, // Add section_metrics here!
          ...(details.detailed_metrics || {}) // Merge any other detailed_metrics
        };
        
        console.log('✅ [METEOR] Overall metrics extracted:', {
          precision,
          recall,
          f_mean,
          matches,
          generated_tokens,
          reference_tokens,
          calculation_check: `${matches} / ${generated_tokens} = ${matches / generated_tokens}`,
          expected_precision: matches / generated_tokens,
        });
        
        console.log('🔍 Section metrics found:', {
          hasSection: !!section_metrics,
          hasGiven: !!section_metrics.given,
          hasWhen: !!section_metrics.when,
          hasThen: !!section_metrics.then,
          section_metrics
        });
        
        formattedDetails = {
          precision,
          recall,
          f_score: f_mean,
          f_mean,
          fragmentation_penalty: penalty,
          penalty,
          chunks,
          matches,
          generated_tokens,
          reference_tokens,
          section_metrics: section_metrics, // Add here too
          detailed_metrics: detailedMetrics
        };
        
        const formatted = {
          id: testResult.id,
          scenarioId: testResult.scenario_id,
          testType: testType,
          score: score,
          details: formattedDetails,
          detailed_metrics: detailedMetrics, // This now includes section_metrics
          generatedText: testResult.generated_text,
          referenceText: testResult.reference_text,
          scenarioTitle: testResult.scenario_title || null, // Add scenario title
          createdAt: testResult.created_at,
          formattedScore: this.formatScore(score, testType),
          qualityLevel: this.getQualityLevel(score),
          // Add individual metrics at top level for easy access
          meteor_score: score,
          precision: precision,
          recall: recall,
          f_score: f_mean,
          f_mean: f_mean,
          penalty: penalty,
          chunks: chunks,
          matches: matches,
          generated_tokens: generated_tokens,
          reference_tokens: reference_tokens,
        };
        console.log('📋 Formatted METEOR testResult:', formatted);
        return formatted;
      } else {
        // Sentence-BERT
        const score = testResult.score ?? testResult.similarity_score ?? details.score ?? 0;
        
        // IMPORTANT: Get section scores for Sentence-BERT
        const section_scores = details.section_scores || details.sentence_bert_scores || {};
        
        // IMPORTANT: Get embeddings and detailed metrics
        const section_embeddings = details.section_embeddings || {};
        const section_details = details.section_details || {};
        const overall_embeddings = details.overall_embeddings || {};
        
        console.log('🔍 Sentence-BERT section scores found:', {
          hasSection: !!section_scores,
          hasGiven: section_scores.given !== undefined,
          hasWhen: section_scores.when !== undefined,
          hasThen: section_scores.then !== undefined,
          hasEmbeddings: !!section_embeddings,
          section_scores
        });
        
        // Build detailed_metrics with section scores and embeddings
        const detailedMetrics = {
          cosine_similarity: details.cosine_similarity ?? details.cosineSimilarity ?? 0,
          semantic_distance: details.semantic_distance ?? details.semanticDistance ?? 0,
          sentence_bert_scores: section_scores, // Add section scores here
          section_scores: section_scores, // Also add as section_scores for consistency
          section_embeddings: section_embeddings, // Add embeddings
          section_details: section_details, // Add detailed metrics per section
          overall_embeddings: overall_embeddings, // Add overall embeddings
          dot_product: details.dot_product,
          magnitude_a: details.magnitude_a,
          magnitude_b: details.magnitude_b,
          ...(details.detailed_metrics || {}) // Merge any other detailed_metrics
        };
        
        formattedDetails = {
          cosine_similarity: details.cosine_similarity ?? details.cosineSimilarity ?? 0,
          semantic_distance: details.semantic_distance ?? details.semanticDistance ?? 0,
          sentence_bert_scores: section_scores, // Add here too
          section_scores: section_scores,
          section_embeddings: section_embeddings,
          section_details: section_details,
          overall_embeddings: overall_embeddings,
          dot_product: details.dot_product,
          magnitude_a: details.magnitude_a,
          magnitude_b: details.magnitude_b,
          detailed_metrics: detailedMetrics
        };
        
        const formatted = {
          id: testResult.id,
          scenarioId: testResult.scenario_id,
          testType: testType,
          score: score,
          details: formattedDetails,
          detailed_metrics: detailedMetrics, // This now includes sentence_bert_scores and embeddings
          generatedText: testResult.generated_text,
          referenceText: testResult.reference_text,
          scenarioTitle: testResult.scenario_title || null, // Add scenario title
          createdAt: testResult.created_at,
          formattedScore: this.formatScore(score, testType),
          qualityLevel: this.getQualityLevel(score)
        };
        console.log('📋 Formatted Sentence-BERT testResult:', formatted);
        return formatted;
      }
    }
    
    // If no saved result but we have metrics (unauthenticated user), use metrics
    if (meteorMetrics && meteorMetrics.success !== false && meteorMetrics.score !== undefined) {
      console.log('✅ Using meteorMetrics (unauthenticated user)');
      
      const details = meteorMetrics.details || meteorMetrics;
      
      // Try multiple paths for METEOR metrics
      const score = meteorMetrics.score ?? meteorMetrics.meteor_score ?? 0;
      const precision = details.precision ?? meteorMetrics.precision ?? details.meteor_precision ?? 0;
      const recall = details.recall ?? meteorMetrics.recall ?? details.meteor_recall ?? 0;
      const f_score = details.f_score ?? details.fScore ?? meteorMetrics.f_score ?? meteorMetrics.fScore ?? 0;
      const penalty = details.penalty ?? details.fragmentation_penalty ?? meteorMetrics.penalty ?? 0;
      const chunks = details.chunks ?? meteorMetrics.chunks ?? 0;
      const matches = details.matches ?? meteorMetrics.matches ?? 0;
      
      // Build detailed_metrics object with all available data
      const detailedMetrics = meteorMetrics.detailed_metrics || details.detailed_metrics || {
        precision,
        recall,
        f_mean: f_score,
        penalty,
        chunks,
        matches
      };
      
      const formatted = {
        id: null, // No saved ID for unauthenticated users
        scenarioId: null, // Not available in metrics
        testType: 'meteor',
        score: score,
        details: {
          precision,
          recall,
          f_score,
          fragmentation_penalty: penalty,
          penalty,
          chunks,
          matches,
          detailed_metrics: detailedMetrics
        },
        detailed_metrics: detailedMetrics,
        generatedText: null, // Not available in metrics
        referenceText: null, // Not available in metrics
        createdAt: new Date().toISOString(), // Use current time
        formattedScore: this.formatScore(score, 'meteor'),
        qualityLevel: this.getQualityLevel(score),
        // Add individual metrics at top level for easy access
        meteor_score: score,
        precision: precision,
        recall: recall,
        f_score: f_score,
        penalty: penalty,
        chunks: chunks,
        matches: matches
      };
      console.log('📋 Formatted meteorMetrics:', formatted);
      return formatted;
    }
    
    if (sentenceBertMetrics && sentenceBertMetrics.success !== false && sentenceBertMetrics.score !== undefined) {
      console.log('✅ Using sentenceBertMetrics (unauthenticated user)');
      
      const details = sentenceBertMetrics.details || sentenceBertMetrics;
      const score = sentenceBertMetrics.score ?? sentenceBertMetrics.similarity_score ?? 0;
      
      // IMPORTANT: Get section scores and embeddings for Sentence-BERT
      const section_scores = details.section_scores || details.sentence_bert_scores || sentenceBertMetrics.section_scores || {};
      const section_embeddings = details.section_embeddings || {};
      const section_details = details.section_details || {};
      const overall_embeddings = details.overall_embeddings || {};
      
      console.log('🔍 Sentence-BERT section scores (unauthenticated):', {
        hasSection: !!section_scores,
        hasGiven: section_scores.given !== undefined,
        hasWhen: section_scores.when !== undefined,
        hasThen: section_scores.then !== undefined,
        hasEmbeddings: !!section_embeddings,
        section_scores
      });
      
      // Build detailed_metrics with section scores and embeddings
      const detailedMetrics = {
        cosine_similarity: details.cosine_similarity ?? details.cosineSimilarity ?? 0,
        semantic_distance: details.semantic_distance ?? details.semanticDistance ?? 0,
        sentence_bert_scores: section_scores,
        section_scores: section_scores,
        section_embeddings: section_embeddings,
        section_details: section_details,
        overall_embeddings: overall_embeddings,
        dot_product: details.dot_product,
        magnitude_a: details.magnitude_a,
        magnitude_b: details.magnitude_b,
        ...(sentenceBertMetrics.detailed_metrics || details.detailed_metrics || {})
      };
      
      const formatted = {
        id: null, // No saved ID for unauthenticated users
        scenarioId: null, // Not available in metrics
        testType: 'sentence_bert',
        score: score,
        details: {
          cosine_similarity: details.cosine_similarity ?? details.cosineSimilarity ?? 0,
          semantic_distance: details.semantic_distance ?? details.semanticDistance ?? 0,
          sentence_bert_scores: section_scores,
          section_scores: section_scores,
          section_embeddings: section_embeddings,
          section_details: section_details,
          overall_embeddings: overall_embeddings,
          dot_product: details.dot_product,
          magnitude_a: details.magnitude_a,
          magnitude_b: details.magnitude_b,
          detailed_metrics: detailedMetrics
        },
        detailed_metrics: detailedMetrics,
        generatedText: null, // Not available in metrics
        referenceText: null, // Not available in metrics
        createdAt: new Date().toISOString(), // Use current time
        formattedScore: this.formatScore(score, 'sentence_bert'),
        qualityLevel: this.getQualityLevel(score)
      };
      console.log('📋 Formatted sentenceBertMetrics:', formatted);
      return formatted;
    }
    
    console.log('❌ No valid data found - returning null');
    console.log('🔍 Debug info:', {
      resultKeys: result ? Object.keys(result) : 'null',
      resultValues: result,
      meteorMetrics: meteorMetrics,
      sentenceBertMetrics: sentenceBertMetrics
    });
    return null;
  }

  /**
   * Format score for display
   * @param {number} score - Raw score (0-1)
   * @param {string} testType - Type of test
   * @returns {string} Formatted score string
   */
  static formatScore(score, testType) {
    if (typeof score !== 'number') return 'N/A';
    
    const percentage = Math.round(score * 100);
    const method = testType === 'meteor' ? 'METEOR' : 'Sentence-BERT';
    
    return `${percentage}% (${method})`;
  }

  /**
   * Get metric display value (never returns "NA")
   * @param {number|null|undefined} value - Metric value (0-1)
   * @returns {string} Formatted percentage string (default "0.0%")
   */
  static getMetricDisplay(value) {
    // Check for null, undefined, NaN
    if (value === null || value === undefined || isNaN(value) || typeof value !== 'number') {
      return '0.0%';
    }
    
    // Always return a valid percentage
    return `${(value * 100).toFixed(1)}%`;
  }

  /**
   * Get quality level based on score
   * @param {number} score - Test score (0-1)
   * @returns {Object} Quality level with label and color
   */
  static getQualityLevel(score) {
    if (typeof score !== 'number') {
      return { label: 'Unknown', color: 'gray' };
    }
    
    if (score >= 0.8) {
      return { label: 'Excellent', color: 'green' };
    } else if (score >= 0.6) {
      return { label: 'Good', color: 'blue' };
    } else if (score >= 0.4) {
      return { label: 'Fair', color: 'yellow' };
    } else {
      return { label: 'Poor', color: 'red' };
    }
  }

  /**
   * Get test type display name
   * @param {string} testType - Test type identifier
   * @returns {string} Display name
   */
  static getTestTypeDisplayName(testType) {
    const displayNames = {
      'meteor': 'METEOR',
      'sentence_bert': 'Sentence-BERT'
    };
    
    return displayNames[testType] || testType;
  }

  /**
   * Save scenario reference for reuse
   * @param {Object} referenceData - Reference scenario data
   * @param {string} referenceData.referenceText - Reference scenario text
   * @param {string} referenceData.description - Optional description
   * @param {Array} referenceData.tags - Optional tags array
   * @returns {Promise<Object>} Saved reference scenario
   */
  static async saveScenarioReference(referenceData) {
    try {
      const response = await api.post('/testing/references', referenceData);
      // Extract the data property from the API response
      return response.data.data || response.data;
    } catch (error) {
      console.error('Save scenario reference failed:', error);
      throw new Error(error.message || 'Gagal menyimpan skenario referensi');
    }
  }

  /**
   * Get scenario references for the user
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of results
   * @param {string} options.searchText - Search in reference text
   * @param {Array} options.tags - Filter by tags
   * @returns {Promise<Object>} Scenario references data
   */
  static async getScenarioReferences(options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit);
      if (options.searchText) params.append('searchText', options.searchText);
      if (options.tags && options.tags.length > 0) {
        params.append('tags', options.tags.join(','));
      }

      const response = await api.get(`/testing/references?${params.toString()}`);
      // Extract the data property from the API response
      return response.data.data || response.data;
    } catch (error) {
      console.error('Get scenario references failed:', error);
      throw new Error(error.message || 'Gagal mengambil skenario referensi');
    }
  }

  /**
   * Get the most recent reference scenario used for a specific scenario
   * @param {string} scenarioId - Scenario identifier
   * @returns {Promise<Object>} Last used reference data
   */
  static async getLastUsedReference(scenarioId) {
    try {
      const response = await api.get(`/testing/references/last/${scenarioId}`);
      // Extract the data property from the API response
      return response.data.data || response.data;
    } catch (error) {
      console.error('Get last used reference failed:', error);
      throw new Error(error.message || 'Gagal mengambil referensi terakhir');
    }
  }

  /**
   * Get cross-test data for a scenario (both METEOR and Sentence-BERT results)
   * @param {string} scenarioId - Scenario identifier
   * @returns {Promise<Object>} Cross-test data
   */
  static async getCrossTestData(scenarioId) {
    try {
      const response = await api.get(`/testing/cross-test/${scenarioId}`);
      // Extract the data property from the API response
      return response.data.data || response.data;
    } catch (error) {
      console.error('Get cross-test data failed:', error);
      throw new Error(error.message || 'Gagal mengambil data cross-test');
    }
  }

  /**
   * Run batch tests (both METEOR and Sentence-BERT) on a scenario
   * @param {Object} testRequest - Test request object
   * @param {string} testRequest.scenarioId - Scenario identifier
   * @param {string} testRequest.generatedText - Generated scenario text
   * @param {string} testRequest.referenceText - Reference scenario text
   * @param {Array} testRequest.testTypes - Array of test types to run
   * @returns {Promise<Object>} Batch test results
   */
  static async runBatchTest(testRequest) {
    try {
      const response = await api.post('/testing/batch', testRequest);
      // Extract the data property from the API response
      return response.data.data || response.data;
    } catch (error) {
      console.error('Batch test failed:', error);
      throw new Error(error.message || 'Gagal menjalankan batch test');
    }
  }

  /**
   * Check if scenario has existing test results
   * @param {string} scenarioId - Scenario identifier
   * @returns {Promise<Object>} Test status information
   */
  static async getTestStatus(scenarioId) {
    try {
      const crossTestData = await this.getCrossTestData(scenarioId);
      
      return {
        hasResults: crossTestData.data.hasResults,
        hasBothResults: crossTestData.data.hasBothResults,
        meteorResult: crossTestData.data.meteor,
        sentenceBertResult: crossTestData.data.sentence_bert,
        sharedReferenceText: crossTestData.data.sharedReferenceText
      };
    } catch (error) {
      // If no results found, return empty status
      return {
        hasResults: false,
        hasBothResults: false,
        meteorResult: null,
        sentenceBertResult: null,
        sharedReferenceText: null
      };
    }
  }

  /**
   * Get suggested reference scenarios based on usage and similarity
   * @param {string} currentText - Current scenario text for similarity matching
   * @param {number} limit - Maximum number of suggestions
   * @returns {Promise<Array>} Array of suggested reference scenarios
   */
  static async getSuggestedReferences(currentText = '', limit = 5) {
    try {
      const options = { limit };
      
      // If we have current text, we could implement similarity search
      // For now, just get the most used references
      const referencesData = await this.getScenarioReferences(options);
      
      // Handle both old and new API response structures
      if (referencesData && referencesData.references) {
        return referencesData.references;
      } else if (Array.isArray(referencesData)) {
        return referencesData;
      } else {
        return [];
      }
    } catch (error) {
      console.error('Get suggested references failed:', error);
      return [];
    }
  }

  /**
   * Cache test result per test type
   * @param {string} scenarioId - Scenario identifier
   * @param {string} testType - Test type ('meteor' or 'sentence_bert')
   * @param {Object} result - Test result to cache
   */
  static cacheTestResult(scenarioId, testType, result) {
    if (!scenarioId || !testType || !result) {
      console.warn('Cannot cache test result: missing required parameters');
      return;
    }

    const cacheKey = `test_result_${scenarioId}_${testType}`;
    
    try {
      const cacheData = {
        result,
        timestamp: Date.now()
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log(`✅ Cached ${testType} result for scenario ${scenarioId}`);
    } catch (error) {
      console.warn('Failed to cache test result:', error);
      // If localStorage is full, try to clear old cache entries
      this.clearOldCacheEntries();
    }
  }

  /**
   * Retrieve cached test result for specific test type
   * @param {string} scenarioId - Scenario identifier
   * @param {string} testType - Test type ('meteor' or 'sentence_bert')
   * @returns {Object|null} Cached test result or null if not found/expired
   */
  static getCachedTestResult(scenarioId, testType) {
    if (!scenarioId || !testType) {
      return null;
    }

    const cacheKey = `test_result_${scenarioId}_${testType}`;
    
    try {
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) {
        return null;
      }

      const parsed = JSON.parse(cached);
      
      // Cache valid for 1 hour (3600000 ms)
      const cacheAge = Date.now() - parsed.timestamp;
      if (cacheAge > 3600000) {
        console.log(`⏰ Cache expired for ${testType} result (age: ${Math.round(cacheAge / 60000)} minutes)`);
        localStorage.removeItem(cacheKey);
        return null;
      }

      console.log(`✅ Retrieved cached ${testType} result for scenario ${scenarioId}`);
      return parsed.result;
    } catch (error) {
      console.warn('Failed to retrieve cached result:', error);
      // If cache is corrupted, remove it
      try {
        localStorage.removeItem(cacheKey);
      } catch (e) {
        // Ignore cleanup errors
      }
      return null;
    }
  }

  /**
   * Clear old cache entries to free up space
   * Removes cache entries older than 1 hour
   */
  static clearOldCacheEntries() {
    try {
      const now = Date.now();
      const keysToRemove = [];

      // Find all test result cache keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        if (key && key.startsWith('test_result_')) {
          try {
            const cached = localStorage.getItem(key);
            const parsed = JSON.parse(cached);
            
            // Remove if older than 1 hour
            if (now - parsed.timestamp > 3600000) {
              keysToRemove.push(key);
            }
          } catch (e) {
            // If parsing fails, mark for removal
            keysToRemove.push(key);
          }
        }
      }

      // Remove old entries
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          // Ignore removal errors
        }
      });

      console.log(`🧹 Cleared ${keysToRemove.length} old cache entries`);
    } catch (error) {
      console.warn('Failed to clear old cache entries:', error);
    }
  }

  /**
   * Clear all cached test results for a specific scenario
   * @param {string} scenarioId - Scenario identifier
   */
  static clearScenarioCache(scenarioId) {
    if (!scenarioId) {
      return;
    }

    try {
      const meteorKey = `test_result_${scenarioId}_meteor`;
      const sentenceBertKey = `test_result_${scenarioId}_sentence_bert`;
      
      localStorage.removeItem(meteorKey);
      localStorage.removeItem(sentenceBertKey);
      
      console.log(`🧹 Cleared all cached results for scenario ${scenarioId}`);
    } catch (error) {
      console.warn('Failed to clear scenario cache:', error);
    }
  }

  /**
   * Run dual evaluation (both METEOR and Sentence-BERT simultaneously)
   * @param {Object} testData - Test data containing scenarioId, generatedText, referenceText
   * @returns {Promise<Object>} Combined test results
   */
  static async runDualEvaluation(testData) {
    try {
      // Log: Starting dual evaluation
      cleanLogger.evaluationStart();
      
      const response = await api.post('/testing/dual-evaluation', testData);
      
      // Log: Evaluation success
      cleanLogger.evaluationSuccess();
      
      // Extract the data property from the API response
      const result = response.data.data || response.data;
      
      // Cache both results separately
      if (testData.scenarioId && result.meteor) {
        this.cacheTestResult(testData.scenarioId, 'meteor', result.meteor);
      }
      if (testData.scenarioId && result.sentence_bert) {
        this.cacheTestResult(testData.scenarioId, 'sentence_bert', result.sentence_bert);
      }
      
      return result;
    } catch (error) {
      console.error('Dual evaluation failed:', error);
      
      // Log: Evaluation failed
      cleanLogger.evaluationFailed(error.message);
      
      throw new Error(error.message || 'Gagal menjalankan pengujian ganda');
    }
  }

  /**
   * Format dual evaluation result for display
   * @param {Object} dualResult - Dual evaluation result from API
   * @returns {Object} Formatted results for both test types
   */
  static formatDualResult(dualResult) {
    if (!dualResult) return null;

    const formatted = {
      timestamp: dualResult.timestamp || new Date().toISOString(),
      generatedText: dualResult.generatedText || '',
      referenceText: dualResult.referenceText || '',
      meteor: null,
      sentence_bert: null
    };

    // Format METEOR result
    if (dualResult.meteor && dualResult.meteor.success) {
      const meteorDetails = dualResult.meteor.details || {};
      formatted.meteor = {
        success: true,
        score: dualResult.meteor.score || 0,
        precision: meteorDetails.precision || 0,
        recall: meteorDetails.recall || 0,
        f_mean: meteorDetails.f_mean || 0,
        penalty: meteorDetails.penalty || 0,
        matches: meteorDetails.matches || 0,
        chunks: meteorDetails.chunks || 0,
        translationInfo: dualResult.meteor.translation_info || null,
        formattedScore: this.formatScore(dualResult.meteor.score, 'meteor'),
        qualityLevel: this.getQualityLevel(dualResult.meteor.score)
      };
    }

    // Format Sentence-BERT result
    if (dualResult.sentence_bert && dualResult.sentence_bert.success) {
      const sbertDetails = dualResult.sentence_bert.details || {};
      formatted.sentence_bert = {
        success: true,
        score: dualResult.sentence_bert.score || 0,
        details: sbertDetails,
        formattedScore: this.formatScore(dualResult.sentence_bert.score, 'sentence_bert'),
        qualityLevel: this.getQualityLevel(dualResult.sentence_bert.score)
      };
    }

    return formatted;
  }

  /**
   * Run METEOR test with real-time progress via SSE
   * @param {Object} testData - Test data
   * @param {Function} onProgress - Progress callback (stage, progress, details)
   * @returns {Promise<Object>} Final test result
   */
  static async runMeteorTestSSE(testData, onProgress) {
    return new Promise((resolve, reject) => {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5003/api';
      const url = `${API_URL}/testing/meteor/stream`;
      
      // DEBUG: Check token
      const token = localStorage.getItem('token');
      console.log('🔐 [FRONTEND-SSE] Token check:', {
        hasToken: !!token,
        tokenLength: token?.length || 0,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'NONE'
      });
      
      // Use fetch for SSE
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify(testData)
      }).then(response => {
        console.log('📡 [FRONTEND-SSE] Response status:', response.status);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        const readStream = () => {
          reader.read().then(({ done, value }) => {
            if (done) {
              return;
            }
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep incomplete line in buffer
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  
                  if (data.stage === 'complete') {
                    resolve(data);
                  } else if (data.stage === 'error') {
                    reject(new Error(data.error));
                  } else {
                    onProgress(data.stage, data.progress, data);
                  }
                } catch (e) {
                  console.error('Failed to parse SSE data:', e);
                }
              }
            }
            
            readStream();
          }).catch(reject);
        };
        
        readStream();
      }).catch(reject);
    });
  }

  /**
   * Run Sentence-BERT test with real-time progress via SSE
   * @param {Object} testData - Test data
   * @param {Function} onProgress - Progress callback (stage, progress, details)
   * @returns {Promise<Object>} Final test result
   */
  static async runSentenceBertTestSSE(testData, onProgress) {
    return new Promise((resolve, reject) => {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5003/api';
      const url = `${API_URL}/testing/sentence-bert/stream`;
      
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(testData)
      }).then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        const readStream = () => {
          reader.read().then(({ done, value }) => {
            if (done) {
              return;
            }
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  
                  if (data.stage === 'complete') {
                    resolve(data);
                  } else if (data.stage === 'error') {
                    reject(new Error(data.error));
                  } else {
                    onProgress(data.stage, data.progress, data);
                  }
                } catch (e) {
                  console.error('Failed to parse SSE data:', e);
                }
              }
            }
            
            readStream();
          }).catch(reject);
        };
        
        readStream();
      }).catch(reject);
    });
  }
}

export default TestingService;