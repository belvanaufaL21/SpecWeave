import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import supabaseService from './supabaseService.js';

// Handle __dirname for ES modules
let __dirname;
try {
  const __filename = fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename);
} catch (error) {
  // Fallback for CommonJS environments (like Jest)
  __dirname = path.dirname(__filename);
}

/**
 * Testing Service for METEOR and Sentence-BERT evaluations
 * Integrates with Python scripts for ML computations and handles database operations
 */
class TestingService {
  
  /**
   * Calculate METEOR score using Python script
   * @param {string} generatedText - The generated scenario text
   * @param {string} referenceText - The reference scenario text
   * @returns {Promise<Object>} METEOR calculation result
   */
  static async calculateMeteorScore(generatedText, referenceText) {
    return new Promise((resolve, reject) => {
      const pythonScriptPath = path.join(__dirname, '../python/meteor_calculator.py');
      
      console.log('Starting METEOR calculation:', {
        scriptPath: pythonScriptPath,
        generatedLength: generatedText?.length || 0,
        referenceLength: referenceText?.length || 0
      });
      
      const pythonCommand = process.env.PYTHON_PATH || 'python3';
      const pythonProcess = spawn(pythonCommand, [
        pythonScriptPath,
        generatedText,
        referenceText
      ]);
      
      let result = '';
      let errorOutput = '';
      
      pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error('Python stderr:', data.toString());
      });
      
      pythonProcess.on('close', (code) => {
        console.log('Python process closed with code:', code);
        if (code === 0) {
          try {
            const parsedResult = JSON.parse(result);
            if (parsedResult.error) {
              console.error('METEOR calculation error:', parsedResult.error);
              reject(new Error(`METEOR calculation error: ${parsedResult.error}`));
            } else {
              console.log('METEOR calculation successful, score:', parsedResult.score);
              resolve(parsedResult);
            }
          } catch (parseError) {
            console.error('Failed to parse METEOR result:', parseError.message);
            console.error('Raw result:', result);
            reject(new Error(`Failed to parse METEOR result: ${parseError.message}`));
          }
        } else {
          console.error('METEOR calculation failed:', errorOutput);
          reject(new Error(`METEOR calculation failed with code ${code}: ${errorOutput}`));
        }
      });
      
      pythonProcess.on('error', (error) => {
        console.error('Failed to start METEOR calculation:', error);
        reject(new Error(`Failed to start METEOR calculation: ${error.message}`));
      });
    });
  }
  
  /**
   * Calculate Sentence-BERT score using Python script
   * @param {string} generatedText - The generated scenario text
   * @param {string} referenceText - The reference scenario text
   * @returns {Promise<Object>} Sentence-BERT calculation result
   */
  static async calculateSentenceBertScore(generatedText, referenceText) {
    return new Promise((resolve, reject) => {
      const pythonScriptPath = path.join(__dirname, '../python/sentence_bert_calculator.py');
      
      // Use configured Python path from environment or fallback to 'python'
      const pythonCommand = process.env.PYTHON_PATH || 'python';
      
      const pythonProcess = spawn(pythonCommand, [
        pythonScriptPath,
        generatedText,
        referenceText
      ]);
      
      let result = '';
      let errorOutput = '';
      
      pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const parsedResult = JSON.parse(result);
            if (parsedResult.error) {
              reject(new Error(`Sentence-BERT calculation error: ${parsedResult.error}`));
            } else {
              resolve(parsedResult);
            }
          } catch (parseError) {
            reject(new Error(`Failed to parse Sentence-BERT result: ${parseError.message}`));
          }
        } else {
          reject(new Error(`Sentence-BERT calculation failed with code ${code}: ${errorOutput}`));
        }
      });
      
      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Sentence-BERT calculation: ${error.message}`));
      });
    });
  }
  
  /**
   * Save test result to database (upsert: insert or update if exists)
   * @param {Object} testData - Test result data
   * @param {string} testData.scenarioId - Scenario identifier
   * @param {string} testData.testType - Type of test ('meteor' or 'sentence_bert')
   * @param {number} testData.score - Test score
   * @param {string} testData.generatedText - Generated scenario text
   * @param {string} testData.referenceText - Reference scenario text
   * @param {string} testData.userId - User identifier
   * @param {Object} testData.testDetails - Additional test details
   * @returns {Promise<Object>} Saved test result
   */
  static async saveTestResult(testData) {
    try {
      console.log('💾 saveTestResult input:', {
        score: testData.score,
        testType: testData.testType,
        hasGeneratedText: !!testData.generatedText,
        testDetails: testData.testDetails
      });
      
      const dataToSave = {
        user_id: testData.userId,
        scenario_id: testData.scenarioId,
        test_type: testData.testType,
        score: testData.score,
        generated_text: testData.generatedText,
        reference_text: testData.referenceText,
        test_details: testData.testDetails || {},
        updated_at: new Date().toISOString()
      };
      
      console.log('📝 Data to save:', {
        scenario_id: dataToSave.scenario_id,
        test_type: dataToSave.test_type,
        score: dataToSave.score
      });
      
      console.log('💾 Data to save to DB:', {
        score: dataToSave.score,
        test_details_keys: Object.keys(dataToSave.test_details),
        test_details: dataToSave.test_details
      });
      
      // Use upsert to handle duplicate key constraint
      const { data, error } = await supabaseService.getClient()
        .from('test_results')
        .upsert([dataToSave], {
          onConflict: 'user_id,scenario_id,test_type',
          ignoreDuplicates: false
        })
        .select()
        .single();
      
      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }
      
      console.log('✅ Saved to DB:', {
        id: data.id,
        score: data.score,
        test_details_keys: Object.keys(data.test_details || {})
      });
      
      return data;
    } catch (error) {
      throw new Error(`Failed to save test result: ${error.message}`);
    }
  }
  
  /**
   * Get test results by scenario ID from both old and new tables
   * @param {string} scenarioId - Scenario identifier
   * @param {string} userId - User identifier
   * @returns {Promise<Object>} Test results grouped by type
   */
  static async getTestResultsByScenario(scenarioId, userId) {
    try {
      // Fetch from NEW tables in parallel
      const [meteorResults, sbertResults] = await Promise.all([
        supabaseService.getClient()
          .from('meteor_test_results')
          .select('*')
          .eq('scenario_id', scenarioId)
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabaseService.getClient()
          .from('sentence_bert_test_results')
          .select('*')
          .eq('scenario_id', scenarioId)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
      ]);
      
      // Also fetch from OLD table for backward compatibility
      const { data: oldResults, error: oldError } = await supabaseService.getClient()
        .from('test_results')
        .select('*')
        .eq('scenario_id', scenarioId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (meteorResults.error) {
        console.warn('⚠️ Failed to fetch from meteor_test_results:', meteorResults.error.message);
      }
      
      if (sbertResults.error) {
        console.warn('⚠️ Failed to fetch from sentence_bert_test_results:', sbertResults.error.message);
      }
      
      if (oldError) {
        console.warn('⚠️ Failed to fetch from test_results:', oldError.message);
      }
      
      console.log('📊 [GET-TEST-RESULTS] Fetched data:', {
        newMeteor: meteorResults.data?.length || 0,
        newSbert: sbertResults.data?.length || 0,
        oldResults: oldResults?.length || 0
      });
      
      // Transform NEW table results
      const transformedMeteor = (meteorResults.data || []).map(result => {
        // Build section_metrics from individual columns
        const section_metrics = {
          given: result.given_score ? {
            meteor_score: result.given_score,
            precision: result.given_precision,
            recall: result.given_recall,
            f_mean: result.given_f_mean,
            penalty: result.given_penalty,
            chunks: result.given_chunks,
            matches: result.given_matches,
            generated_tokens: result.given_generated_tokens,
            reference_tokens: result.given_reference_tokens
          } : null,
          when: result.when_score ? {
            meteor_score: result.when_score,
            precision: result.when_precision,
            recall: result.when_recall,
            f_mean: result.when_f_mean,
            penalty: result.when_penalty,
            chunks: result.when_chunks,
            matches: result.when_matches,
            generated_tokens: result.when_generated_tokens,
            reference_tokens: result.when_reference_tokens
          } : null,
          then: result.then_score ? {
            meteor_score: result.then_score,
            precision: result.then_precision,
            recall: result.then_recall,
            f_mean: result.then_f_mean,
            penalty: result.then_penalty,
            chunks: result.then_chunks,
            matches: result.then_matches,
            generated_tokens: result.then_generated_tokens,
            reference_tokens: result.then_reference_tokens
          } : null
        };
        
        // Calculate overall metrics from sections (for backward compatibility)
        const sections = [section_metrics.given, section_metrics.when, section_metrics.then].filter(Boolean);
        const overall_precision = sections.length > 0 
          ? sections.reduce((sum, s) => sum + (s.precision || 0), 0) / sections.length 
          : 0;
        const overall_recall = sections.length > 0 
          ? sections.reduce((sum, s) => sum + (s.recall || 0), 0) / sections.length 
          : 0;
        const overall_f_mean = sections.length > 0 
          ? sections.reduce((sum, s) => sum + (s.f_mean || 0), 0) / sections.length 
          : 0;
        const overall_penalty = sections.length > 0 
          ? sections.reduce((sum, s) => sum + (s.penalty || 0), 0) / sections.length 
          : 0;
        const overall_chunks = sections.reduce((sum, s) => sum + (s.chunks || 0), 0);
        const overall_matches = sections.reduce((sum, s) => sum + (s.matches || 0), 0);
        
        return {
          id: result.id,
          user_id: result.user_id,
          scenario_id: result.scenario_id,
          test_type: 'meteor',
          score: result.meteor_score,
          test_details: {
            // Overall metrics (calculated from sections)
            precision: overall_precision,
            recall: overall_recall,
            f_mean: overall_f_mean,
            penalty: overall_penalty,
            chunks: overall_chunks,
            matches: overall_matches,
            // Section metrics (from database columns)
            section_metrics: section_metrics,
            translation_info: result.translation_info
          },
          generated_text: result.generated_text,
          reference_text: result.reference_text,
          created_at: result.created_at
        };
      });

      const transformedSbert = (sbertResults.data || []).map(result => ({
        id: result.id,
        user_id: result.user_id,
        scenario_id: result.scenario_id,
        test_type: 'sentence_bert',
        score: result.similarity_score,
        test_details: {
          // Overall score is from full text, NOT average of sections
          cosine_similarity: result.similarity_score, // Same as similarity_score
          section_scores: {
            given: result.given_score,
            when: result.when_score,
            then: result.then_score
          },
          // Extract from JSONB details
          ...(result.details || {}),
          sentence_bert_scores: {
            given: result.given_score,
            when: result.when_score,
            then: result.then_score
          }
        },
        generated_text: result.generated_text,
        reference_text: result.reference_text,
        created_at: result.created_at
      }));
      
      // Transform OLD table results and merge with new
      const oldMeteor = (oldResults || [])
        .filter(r => r.test_type === 'meteor')
        .map(r => ({
          id: r.id,
          user_id: r.user_id,
          scenario_id: r.scenario_id,
          test_type: 'meteor',
          score: r.score,
          test_details: r.test_details || {},
          generated_text: r.generated_text,
          reference_text: r.reference_text,
          created_at: r.created_at
        }));
      
      const oldSbert = (oldResults || [])
        .filter(r => r.test_type === 'sentence_bert')
        .map(r => ({
          id: r.id,
          user_id: r.user_id,
          scenario_id: r.scenario_id,
          test_type: 'sentence_bert',
          score: r.score,
          test_details: r.test_details || {},
          generated_text: r.generated_text,
          reference_text: r.reference_text,
          created_at: r.created_at
        }));
      
      const oldDual = (oldResults || [])
        .filter(r => r.test_type === 'dual')
        .map(r => ({
          id: r.id,
          user_id: r.user_id,
          scenario_id: r.scenario_id,
          test_type: 'dual',
          score: r.score,
          test_details: r.test_details || {},
          generated_text: r.generated_text,
          reference_text: r.reference_text,
          created_at: r.created_at
        }));
      
      // Merge old and new results
      const allMeteor = [...transformedMeteor, ...oldMeteor].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      
      const allSbert = [...transformedSbert, ...oldSbert].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      
      // Combine results - if both exist with same timestamp, create dual result
      const dualResults = [...oldDual]; // Start with old dual results
      
      allMeteor.forEach(meteorResult => {
        const matchingSbert = allSbert.find(sbertResult => 
          Math.abs(new Date(sbertResult.created_at) - new Date(meteorResult.created_at)) < 5000 // Within 5 seconds
        );
        
        if (matchingSbert) {
          dualResults.push({
            id: meteorResult.id,
            user_id: meteorResult.user_id,
            scenario_id: meteorResult.scenario_id,
            test_type: 'dual',
            score: meteorResult.score,
            test_details: {
              meteor: {
                score: meteorResult.score,
                ...meteorResult.test_details
              },
              sentence_bert: {
                score: matchingSbert.score,
                ...matchingSbert.test_details
              }
            },
            generated_text: meteorResult.generated_text,
            reference_text: meteorResult.reference_text,
            created_at: meteorResult.created_at
          });
        }
      });
      
      // Sort dual results by created_at
      dualResults.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      console.log('✅ [GET-TEST-RESULTS] Merged results:', {
        meteor: allMeteor.length,
        sentence_bert: allSbert.length,
        dual: dualResults.length
      });
      
      return {
        meteor: allMeteor,
        sentence_bert: allSbert,
        dual: dualResults
      };
    } catch (error) {
      throw new Error(`Failed to get test results: ${error.message}`);
    }
  }
  
  /**
   * Get all test results for a user
   * @param {string} userId - User identifier
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of results
   * @param {number} options.offset - Number of results to skip
   * @param {string} options.testType - Filter by test type
   * @returns {Promise<Array>} Array of test results
   */
  static async getTestResultsByUser(userId, options = {}) {
    try {
      let query = supabaseService.getClient()
        .from('test_results')
        .select('*')
        .eq('user_id', userId);
      
      if (options.testType) {
        query = query.eq('test_type', options.testType);
      }
      
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }
      
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }
      
      return data || [];
    } catch (error) {
      throw new Error(`Failed to get user test results: ${error.message}`);
    }
  }
  
  /**
   * Delete test result
   * @param {string} testId - Test result ID
   * @param {string} userId - User identifier
   * @returns {Promise<boolean>} Success status
   */
  static async deleteTestResult(testId, userId) {
    try {
      const { error } = await supabaseService.getClient()
        .from('test_results')
        .delete()
        .eq('id', testId)
        .eq('user_id', userId);
      
      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }
      
      return true;
    } catch (error) {
      throw new Error(`Failed to delete test result: ${error.message}`);
    }
  }
  
  /**
   * Update test result
   * @param {string} testId - Test result ID
   * @param {string} userId - User identifier
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated test result
   */
  static async updateTestResult(testId, userId, updateData) {
    try {
      const { data, error } = await supabaseService.getClient()
        .from('test_results')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', testId)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      throw new Error(`Failed to update test result: ${error.message}`);
    }
  }
  
  /**
   * Get test statistics for a user
   * @param {string} userId - User identifier
   * @returns {Promise<Object>} Test statistics
   */
  static async getTestStatistics(userId) {
    try {
      const { data, error } = await supabaseService.getClient()
        .from('test_results')
        .select('test_type, score, created_at')
        .eq('user_id', userId);
      
      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }
      
      const results = data || [];
      
      const statistics = {
        total_tests: results.length,
        meteor_tests: results.filter(r => r.test_type === 'meteor').length,
        sentence_bert_tests: results.filter(r => r.test_type === 'sentence_bert').length,
        average_meteor_score: 0,
        average_sentence_bert_score: 0,
        highest_meteor_score: 0,
        highest_sentence_bert_score: 0,
        lowest_meteor_score: 1,
        lowest_sentence_bert_score: 1
      };
      
      const meteorResults = results.filter(r => r.test_type === 'meteor');
      const sentenceBertResults = results.filter(r => r.test_type === 'sentence_bert');
      
      if (meteorResults.length > 0) {
        const meteorScores = meteorResults.map(r => r.score);
        statistics.average_meteor_score = meteorScores.reduce((a, b) => a + b, 0) / meteorScores.length;
        statistics.highest_meteor_score = Math.max(...meteorScores);
        statistics.lowest_meteor_score = Math.min(...meteorScores);
      }
      
      if (sentenceBertResults.length > 0) {
        const sentenceBertScores = sentenceBertResults.map(r => r.score);
        statistics.average_sentence_bert_score = sentenceBertScores.reduce((a, b) => a + b, 0) / sentenceBertScores.length;
        statistics.highest_sentence_bert_score = Math.max(...sentenceBertScores);
        statistics.lowest_sentence_bert_score = Math.min(...sentenceBertScores);
      }
      
      return statistics;
    } catch (error) {
      throw new Error(`Failed to get test statistics: ${error.message}`);
    }
  }

  /**
   * Save scenario reference for reuse
   * @param {Object} referenceData - Reference scenario data
   * @param {string} referenceData.userId - User identifier
   * @param {string} referenceData.referenceText - Reference scenario text
   * @param {string} referenceData.description - Optional description
   * @param {Array} referenceData.tags - Optional tags array
   * @returns {Promise<Object>} Saved reference scenario
   */
  static async saveScenarioReference(referenceData) {
    try {
      // Check if similar reference already exists to avoid duplicates
      const { data: existingData } = await supabaseService.getClient()
        .from('test_scenario_references')
        .select('id, usage_count')
        .eq('user_id', referenceData.userId)
        .eq('reference_text', referenceData.referenceText)
        .single();

      if (existingData) {
        // Update usage count if reference already exists
        const { data, error } = await supabaseService.getClient()
          .from('test_scenario_references')
          .update({
            usage_count: existingData.usage_count + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingData.id)
          .select()
          .single();

        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }

        return data;
      } else {
        // Create new reference
        const { data, error } = await supabaseService.getClient()
          .from('test_scenario_references')
          .insert([{
            user_id: referenceData.userId,
            reference_text: referenceData.referenceText,
            description: referenceData.description || null,
            tags: referenceData.tags || [],
            usage_count: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }

        return data;
      }
    } catch (error) {
      throw new Error(`Failed to save scenario reference: ${error.message}`);
    }
  }

  /**
   * Get scenario references for a user
   * @param {string} userId - User identifier
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of results
   * @param {string} options.searchText - Search in reference text
   * @param {Array} options.tags - Filter by tags
   * @returns {Promise<Array>} Array of scenario references
   */
  static async getScenarioReferences(userId, options = {}) {
    try {
      let query = supabaseService.getClient()
        .from('test_scenario_references')
        .select('*')
        .eq('user_id', userId);

      if (options.searchText) {
        query = query.ilike('reference_text', `%${options.searchText}%`);
      }

      if (options.tags && options.tags.length > 0) {
        query = query.overlaps('tags', options.tags);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      // Order by usage count (most used first) and then by creation date
      query = query.order('usage_count', { ascending: false })
                   .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`Failed to get scenario references: ${error.message}`);
    }
  }

  /**
   * Get the most recent reference scenario used by a user for a specific scenario
   * @param {string} scenarioId - Scenario identifier
   * @param {string} userId - User identifier
   * @returns {Promise<string|null>} Most recent reference text or null
   */
  static async getLastUsedReference(scenarioId, userId) {
    try {
      const { data, error } = await supabaseService.getClient()
        .from('test_results')
        .select('reference_text')
        .eq('scenario_id', scenarioId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw new Error(`Database error: ${error.message}`);
      }

      return data ? data.reference_text : null;
    } catch (error) {
      throw new Error(`Failed to get last used reference: ${error.message}`);
    }
  }

  /**
   * Get cross-test data for a scenario (both METEOR and Sentence-BERT results)
   * @param {string} scenarioId - Scenario identifier
   * @param {string} userId - User identifier
   * @returns {Promise<Object>} Object with meteor and sentence_bert results
   */
  static async getCrossTestData(scenarioId, userId) {
    try {
      const { data, error } = await supabaseService.getClient()
        .from('test_results')
        .select('*')
        .eq('scenario_id', scenarioId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const results = data || [];
      
      // Get the most recent result for each test type
      const meteorResult = results.find(r => r.test_type === 'meteor');
      const sentenceBertResult = results.find(r => r.test_type === 'sentence_bert');

      return {
        meteor: meteorResult || null,
        sentence_bert: sentenceBertResult || null,
        hasResults: meteorResult || sentenceBertResult,
        hasBothResults: meteorResult && sentenceBertResult,
        sharedReferenceText: meteorResult?.reference_text || sentenceBertResult?.reference_text || null
      };
    } catch (error) {
      throw new Error(`Failed to get cross-test data: ${error.message}`);
    }
  }

  /**
   * Run both METEOR and Sentence-BERT tests simultaneously
   * @param {string} generatedText - The generated scenario text
   * @param {string} referenceText - The reference scenario text
   * @param {string} scenarioId - Scenario identifier
   * @param {string} userId - User identifier
   * @returns {Promise<Object>} Combined test results
   */
  static async runDualEvaluation(generatedText, referenceText, scenarioId, userId) {
    try {
      // Run both evaluations in parallel
      const [meteorResult, sentenceBertResult] = await Promise.all([
        this.calculateMeteorScore(generatedText, referenceText),
        this.calculateSentenceBertScore(generatedText, referenceText)
      ]);

      const timestamp = new Date().toISOString();
      
      // Save both results to their respective tables in parallel
      await Promise.all([
        this.saveMeteorResult(userId, scenarioId, generatedText, referenceText, meteorResult),
        this.saveSentenceBertResult(userId, scenarioId, generatedText, referenceText, sentenceBertResult)
      ]);

      console.log('✅ Saved DUAL test results to separate tables');

      return {
        success: true,
        timestamp,
        meteor: {
          success: meteorResult.success,
          score: meteorResult.score,
          details: meteorResult.detailed_metrics || meteorResult.details,
          translation_info: meteorResult.translation_info
        },
        sentence_bert: {
          success: sentenceBertResult.success,
          score: sentenceBertResult.score,
          details: sentenceBertResult.details
        },
        generatedText,
        referenceText
      };
    } catch (error) {
      throw new Error(`Dual evaluation failed: ${error.message}`);
    }
  }

  /**
   * Save METEOR test result to meteor_test_results table
   */
  static async saveMeteorResult(userId, scenarioId, generatedText, referenceText, meteorResult) {
    try {
      const detailedMetrics = meteorResult.detailed_metrics || {};
      const sectionMetrics = detailedMetrics.section_metrics || {};
      
      const meteorData = {
        user_id: userId,
        scenario_id: scenarioId,
        // Overall score is just average of 3 sections
        meteor_score: meteorResult.score || 0,
        
        // Given section - complete metrics
        given_score: sectionMetrics.given?.meteor_score || null,
        given_precision: sectionMetrics.given?.precision || null,
        given_recall: sectionMetrics.given?.recall || null,
        given_f_mean: sectionMetrics.given?.f_mean || null,
        given_penalty: sectionMetrics.given?.penalty || null,
        given_chunks: sectionMetrics.given?.chunks || null,
        given_matches: sectionMetrics.given?.matches || null,
        given_generated_tokens: sectionMetrics.given?.generated_tokens || null,
        given_reference_tokens: sectionMetrics.given?.reference_tokens || null,
        
        // When section - complete metrics
        when_score: sectionMetrics.when?.meteor_score || null,
        when_precision: sectionMetrics.when?.precision || null,
        when_recall: sectionMetrics.when?.recall || null,
        when_f_mean: sectionMetrics.when?.f_mean || null,
        when_penalty: sectionMetrics.when?.penalty || null,
        when_chunks: sectionMetrics.when?.chunks || null,
        when_matches: sectionMetrics.when?.matches || null,
        when_generated_tokens: sectionMetrics.when?.generated_tokens || null,
        when_reference_tokens: sectionMetrics.when?.reference_tokens || null,
        
        // Then section - complete metrics
        then_score: sectionMetrics.then?.meteor_score || null,
        then_precision: sectionMetrics.then?.precision || null,
        then_recall: sectionMetrics.then?.recall || null,
        then_f_mean: sectionMetrics.then?.f_mean || null,
        then_penalty: sectionMetrics.then?.penalty || null,
        then_chunks: sectionMetrics.then?.chunks || null,
        then_matches: sectionMetrics.then?.matches || null,
        then_generated_tokens: sectionMetrics.then?.generated_tokens || null,
        then_reference_tokens: sectionMetrics.then?.reference_tokens || null,
        
        generated_text: generatedText,
        reference_text: referenceText,
        translation_info: meteorResult.translation_info || null,
        created_at: new Date().toISOString()
      };
      
      const { data, error } = await supabaseService.getClient()
        .from('meteor_test_results')
        .insert(meteorData)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to save METEOR result: ${error.message}`);
      }
      
      console.log('💾 Saved METEOR result:', data.id);
      return data;
    } catch (error) {
      throw new Error(`Failed to save METEOR result: ${error.message}`);
    }
  }

  /**
   * Save Sentence-BERT test result to sentence_bert_test_results table
   */
  static async saveSentenceBertResult(userId, scenarioId, generatedText, referenceText, sentenceBertResult) {
    try {
      const details = sentenceBertResult.details || {};
      const sectionScores = details.section_scores || details.sentence_bert_scores || {};
      
      const sbertData = {
        user_id: userId,
        scenario_id: scenarioId,
        // Overall score from full text (NOT average of sections)
        similarity_score: sentenceBertResult.score || 0,
        
        // Section scores (calculated independently per section)
        given_score: sectionScores.given || null,
        when_score: sectionScores.when || null,
        then_score: sectionScores.then || null,
        
        generated_text: generatedText,
        reference_text: referenceText,
        
        // Store all other details in JSONB
        details: {
          embedding_dimension: details.embedding_dimension,
          model: details.model,
          method: details.method,
          section_embeddings: details.section_embeddings || null,
          section_details: details.section_details || null,
          overall_embeddings: details.overall_embeddings || null,
          dot_product: details.dot_product,
          magnitude_a: details.magnitude_a,
          magnitude_b: details.magnitude_b
        },
        
        created_at: new Date().toISOString()
      };
      
      const { data, error } = await supabaseService.getClient()
        .from('sentence_bert_test_results')
        .insert(sbertData)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to save Sentence-BERT result: ${error.message}`);
      }
      
      console.log('💾 Saved Sentence-BERT result:', data.id);
      return data;
    } catch (error) {
      throw new Error(`Failed to save Sentence-BERT result: ${error.message}`);
    }
  }

  /**
   * Calculate METEOR score with real-time progress updates
   * @param {string} generatedText - The generated scenario text
   * @param {string} referenceText - The reference scenario text
   * @param {Function} onProgress - Callback function (stage, progress, details)
   * @returns {Promise<Object>} METEOR calculation result
   */
  static async calculateMeteorScoreWithProgress(generatedText, referenceText, onProgress) {
    return new Promise((resolve, reject) => {
      const pythonScriptPath = path.join(__dirname, '../python/meteor_calculator.py');
      
      console.log('Starting METEOR calculation with progress:', {
        scriptPath: pythonScriptPath,
        generatedLength: generatedText?.length || 0,
        referenceLength: referenceText?.length || 0
      });
      
      const pythonCommand = process.env.PYTHON_PATH || 'python3';
      const pythonProcess = spawn(pythonCommand, [
        pythonScriptPath,
        generatedText,
        referenceText
      ]);
      
      let result = '';
      let errorOutput = '';
      
      pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        const output = data.toString();
        errorOutput += output;
        
        // Parse progress updates from Python
        const lines = output.split('\n');
        for (const line of lines) {
          if (line.startsWith('PROGRESS:')) {
            try {
              const progressData = JSON.parse(line.substring(9));
              if (progressData.type === 'progress') {
                onProgress(progressData.stage, progressData.progress, { 
                  message: progressData.message 
                });
              }
            } catch (e) {
              // Ignore parse errors for non-progress lines
            }
          } else if (line.trim()) {
            // Regular stderr logging
            console.error('Python stderr:', line);
          }
        }
      });
      
      pythonProcess.on('close', (code) => {
        console.log('Python process closed with code:', code);
        if (code === 0) {
          try {
            const parsedResult = JSON.parse(result);
            if (parsedResult.error) {
              console.error('METEOR calculation error:', parsedResult.error);
              reject(new Error(`METEOR calculation error: ${parsedResult.error}`));
            } else {
              console.log('METEOR calculation successful, score:', parsedResult.score);
              resolve(parsedResult);
            }
          } catch (parseError) {
            console.error('Failed to parse METEOR result:', parseError.message);
            console.error('Raw result:', result);
            reject(new Error(`Failed to parse METEOR result: ${parseError.message}`));
          }
        } else {
          console.error('METEOR calculation failed:', errorOutput);
          reject(new Error(`METEOR calculation failed with code ${code}: ${errorOutput}`));
        }
      });
      
      pythonProcess.on('error', (error) => {
        console.error('Failed to start METEOR calculation:', error);
        reject(new Error(`Failed to start METEOR calculation: ${error.message}`));
      });
    });
  }

  /**
   * Calculate Sentence-BERT score with real-time progress updates
   * @param {string} generatedText - The generated scenario text
   * @param {string} referenceText - The reference scenario text
   * @param {Function} onProgress - Callback function (stage, progress, details)
   * @returns {Promise<Object>} Sentence-BERT calculation result
   */
  static async calculateSentenceBertScoreWithProgress(generatedText, referenceText, onProgress) {
    return new Promise((resolve, reject) => {
      const pythonScriptPath = path.join(__dirname, '../python/sentence_bert_calculator.py');
      
      // Use configured Python path from environment or fallback to 'python'
      const pythonCommand = process.env.PYTHON_PATH || 'python';
      
      const pythonProcess = spawn(pythonCommand, [
        pythonScriptPath,
        generatedText,
        referenceText
      ]);
      
      let result = '';
      let errorOutput = '';
      
      pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        const output = data.toString();
        errorOutput += output;
        
        // Parse progress updates from Python
        const lines = output.split('\n');
        for (const line of lines) {
          if (line.startsWith('PROGRESS:')) {
            try {
              const progressData = JSON.parse(line.substring(9));
              if (progressData.type === 'progress') {
                onProgress(progressData.stage, progressData.progress, { 
                  message: progressData.message 
                });
              }
            } catch (e) {
              // Ignore parse errors for non-progress lines
            }
          }
        }
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const parsedResult = JSON.parse(result);
            if (parsedResult.error) {
              reject(new Error(`Sentence-BERT calculation error: ${parsedResult.error}`));
            } else {
              resolve(parsedResult);
            }
          } catch (parseError) {
            reject(new Error(`Failed to parse Sentence-BERT result: ${parseError.message}`));
          }
        } else {
          reject(new Error(`Sentence-BERT calculation failed with code ${code}: ${errorOutput}`));
        }
      });
      
      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Sentence-BERT calculation: ${error.message}`));
      });
    });
  }
}

export default TestingService;