import { convertToGherkin } from '../services/aiService.js';
import MeteorService from '../services/meteorService.js';
import PerformanceService from '../services/performanceService.js';
import supabaseService from '../services/supabaseService.js';
import jiraService from '../services/jiraService.js';
import epicService from '../services/epicService.js';
import { AppError } from '../middlewares/errorHandler.js'; 
import { v4 as uuidv4 } from 'uuid';
import cleanLogger from '../config/cleanLogging.js';
import llmProviderService from '../services/llmProviderService.js';
import usageLimitService from '../services/usageLimitService.js';

const meteorService = new MeteorService();
const performanceService = new PerformanceService();

export const generateGherkin = async (req, res, next) => {
  const requestId = uuidv4();
  
  try {
    const { userStory, originalUserStory, evaluateQuality = false, options = {} } = req.body;

    // Use originalUserStory for format detection if available, otherwise use userStory
    const inputForDetection = originalUserStory || userStory;

    // ============================================================
    // TAHAP 1: VALIDASI DASAR USER STORY
    // ============================================================
    // Hanya mengecek keberadaan dan tipe data user story
    // TIDAK ada validasi panjang atau format di sini
    // Karena input pendek/non-Connextra akan diproses sebagai general response
    if (!userStory || typeof userStory !== 'string') {
      throw new AppError('User story is required and must be a string', 400);
    }

    // ============================================================
    // TAHAP 2: MULAI PERFORMANCE MONITORING
    // ============================================================
    performanceService.startTimer(requestId, 'gherkin_generation');

    // ============================================================
    // TAHAP 3: EKSTRAKSI REFERENCE PATTERNS (Few-shot Learning)
    // ============================================================
    // PENGECEKAN REFERENCE LIBRARY: Ambil reference patterns dari options
    // Jika ada patterns, akan menggunakan few-shot prompting
    // Jika tidak ada patterns, akan menggunakan zero-shot prompting
    const patterns = options.referenceData?.patterns || [];
    
    console.log('📊 [GHERKIN-CONTROLLER] Reference data received:', {
      hasReferenceData: !!options.referenceData,
      patternsCount: patterns.length,
      patternTypes: patterns.map(p => p.type)
    });
    
    // PENGECEKAN REFERENCE LIBRARY: Ekstrak references dari patterns untuk display
    let usedReferences = [];
    if (patterns.length > 0) {
      patterns.forEach(pattern => {
        if (pattern.examples && Array.isArray(pattern.examples)) {
          usedReferences = usedReferences.concat(pattern.examples);
        }
      });
      
      // Remove duplicates based on title AND content
      const uniqueReferences = [];
      const seenKeys = new Set();
      
      usedReferences.forEach(ref => {
        const uniqueKey = `${ref.title}_${ref.gherkinContent?.substring(0, 100) || ''}`;
        if (!seenKeys.has(uniqueKey)) {
          seenKeys.add(uniqueKey);
          uniqueReferences.push(ref);
        }
      });
      
      usedReferences = uniqueReferences;
      
      console.log('📚 [GHERKIN-CONTROLLER] Reference extraction:', {
        patternsReceived: patterns.length,
        totalReferencesExtracted: usedReferences.length,
        patternDetails: patterns.map(p => ({
          type: p.type,
          category: p.category,
          examplesCount: p.examples?.length || 0,
          exampleTitles: p.examples?.map(e => e.title) || [],
          exampleIds: p.examples?.map(e => e.id) || []  // Log IDs for debugging
        })),
        uniqueReferenceTitles: usedReferences.map(r => r.title),
        uniqueReferenceIds: usedReferences.map(r => r.id)  // Log IDs for debugging
      });
    }
    
    console.log('📚 [GHERKIN-CONTROLLER] Final references for response:', {
      usedReferencesCount: usedReferences.length,
      titles: usedReferences.map(r => r.title),
      ids: usedReferences.map(r => r.id),  // Log IDs for debugging
      hasIds: usedReferences.every(r => r.id)  // Check if all have IDs
    });
    
    // ============================================================
    // TAHAP 4: PANGGIL AI SERVICE UNTUK GENERATE GHERKIN
    // ============================================================
    // PENTING: Di tahap ini AI Service akan melakukan:
    // 1. Format Detection (Connextra vs Non-Connextra)
    // 2. Jika Non-Connextra -> Return general response
    // 3. Jika Connextra -> Generate Gherkin dengan/tanpa references
    //
    // URUTAN PENGECEKAN DI AI SERVICE:
    // ❌ TIDAK ada pengecekan koneksi Jira di sini
    // ❌ TIDAK ada pengecekan epic Jira di sini  
    // ❌ TIDAK ada pengecekan limit model di sini
    // ❌ TIDAK ada pengecekan format user story di sini
    // ✅ Semua pengecekan dilakukan DI DALAM convertToGherkin()
    //
    // 🔵 ORCHESTRATION: GENERATE GHERKIN VIA AI SERVICE
    // Lokasi: gherkinController.js - Tahap 4
    // Fungsi: convertToGherkin() dari aiService.js
    // Input:
    // - userStory: User story (bisa original atau enhanced)
    // - references: Few-shot examples dari reference library
    // - originalInput: Input asli untuk format detection
    // - provider: 'openrouter' (jika authenticated)
    // - modelName: Model yang dipilih user (jika authenticated)
    // Flow:
    // 1. Format detection di aiService.js
    // 2. Construct prompt (Gherkin atau General)
    // 3. Send ke LLM via llmProviderService.js
    // 4. Parse dan return response
    //
    // IMPORTANT: Use originalUserStory for format detection, not the enhanced prompt
    // Use provider abstraction if usage limit is set (authenticated user with model selection)
    let aiResponse;
    if (req.usageLimit) {
      // Authenticated user with usage limit - use provider service
      aiResponse = await convertToGherkin(userStory.trim(), {
        references: patterns,
        originalInput: inputForDetection.trim(),
        provider: req.usageLimit.provider,
        modelName: req.usageLimit.modelName
      });
    } else {
      // Anonymous user or no usage limit - use default behavior
      aiResponse = await convertToGherkin(userStory.trim(), {
        references: patterns,
        originalInput: inputForDetection.trim()
      });
    }

    // ============================================================
    // TAHAP 5: HANDLE RESPONSE BERDASARKAN TIPE
    // ============================================================
    // Handle different response types
    if (aiResponse.type === 'general') {
      // Non-Connextra input - return general LLM response
      return res.status(200).json({
        success: true,
        data: {
          type: 'general',
          content: aiResponse.content,
          formatDetection: aiResponse.formatDetection,
          isConnextra: false,
          message: null // Remove template message, let AI response be natural
        }
      });
    }

    // Connextra format - continue with Gherkin processing
    const gherkinCode = aiResponse.content;

    // ============================================================
    // TAHAP 6: METEOR QUALITY EVALUATION (Optional)
    // ============================================================
    let meteorMetrics = null;
    let qualityAssessment = null;
    
    if (evaluateQuality) {
      try {
        // Parse the generated Gherkin to extract scenario text
        const parsedGherkin = JSON.parse(gherkinCode);
        const candidateText = meteorService.extractScenarioText(parsedGherkin);
        
        // Generate intelligent reference text based on AI output analysis
        const referenceText = meteorService.generateReferenceText(parsedGherkin);
        
        // Perform METEOR evaluation
        meteorMetrics = await meteorService.evaluateScenario(candidateText, referenceText);
        qualityAssessment = meteorService.getQualityAssessment(meteorMetrics.meteor_score);
        
        // Log METEOR metrics if user is authenticated
        if (req.user?.id) {
          await performanceService.logMeteorMetrics(requestId, meteorMetrics, req.user.id);
        }
        
      } catch (meteorError) {
        console.warn('⚠️ METEOR evaluation failed:', meteorError.message);
        console.warn('📄 Gherkin content preview:', gherkinCode.substring(0, 200) + '...');
        // Continue without METEOR evaluation if it fails
      }
    }

    // ============================================================
    // TAHAP 7: AKHIRI PERFORMANCE MONITORING
    // ============================================================
    const performanceMetrics = performanceService.endTimer(requestId);
    
    // Log performance metrics if user is authenticated
    if (req.user?.id) {
      await performanceService.logPerformanceMetrics(performanceMetrics, req.user.id);
    }

    // ============================================================
    // TAHAP 8: INCREMENT USAGE & RECORD REQUEST (Untuk user terautentikasi)
    // ============================================================
    let usageInfo = null;
    if (req.user?.id && req.usageLimit) {
      try {
        // Increment usage counter after successful LLM response
        const incrementResult = await usageLimitService.incrementUsage(
          req.user.id,
          req.usageLimit.modelName,
          requestId
        );

        // Record request in history for analytics
        await usageLimitService.recordRequest(
          req.user.id,
          req.usageLimit.modelName,
          requestId,
          true, // success
          null  // no error
        );

        // Prepare usage info for response
        usageInfo = {
          model: req.usageLimit.modelName,
          displayName: req.usageLimit.displayName,
          provider: req.usageLimit.provider,
          tier: req.usageLimit.tier,
          remaining: incrementResult.remaining,
          limit: req.usageLimit.limit
        };

        cleanLogger.debug('USAGE-LIMIT', 'Usage incremented', {
          model: req.usageLimit.modelName,
          newCount: incrementResult.newCount,
          remaining: incrementResult.remaining
        });
      } catch (usageError) {
        cleanLogger.warn('USAGE-LIMIT', 'Failed to update usage', {
          error: usageError.message
        });
        // Continue without failing the request - user got their result
      }
    }

    // ============================================================
    // TAHAP 9: SAVE KE DATABASE & JIRA INTEGRATION (Optional)
    // ============================================================
    // CATATAN PENTING:
    // - Pengecekan koneksi Jira dan Epic DILAKUKAN DI SINI (SETELAH generate Gherkin)
    // - Jira integration adalah OPTIONAL (tidak wajib)
    // - Jika tidak ada koneksi Jira, proses tetap berlanjut
    // - Auto-export ke Jira sudah DISABLED, user harus manual export
    let savedScenario = null;
    let jiraUserStory = null;
    let jiraSubtasks = [];
    
    if (req.user?.id) {
      try {
        // Parse Gherkin to extract feature info
        const parsedGherkin = JSON.parse(gherkinCode);
        
        // PENGECEKAN KONEKSI JIRA & EPIC: Ambil Epic context dari database
        // Pengecekan ini dilakukan SETELAH generate Gherkin selesai
        const epicContext = await epicService.getEpicContext(req.user.id);
        let jiraEpicId = null;
        let jiraConnectionId = null;
        
        // PENGECEKAN KONEKSI JIRA & EPIC: Jika ada Epic context, ambil ID-nya
        if (epicContext.success && epicContext.data) {
          jiraEpicId = epicContext.data.epicData.epic.id;
          jiraConnectionId = epicContext.data.epicData.connection.id;
          cleanLogger.debug('GHERKIN-CONTROLLER', 'Epic context found', { 
            name: epicContext.data.epicData.epic.name, 
            key: epicContext.data.epicData.epic.key 
          });
        }
        
        // ============================================================
        // SIMPAN SCENARIO KE DATABASE
        // ============================================================
        const scenarioData = {
          user_id: req.user.id,
          title: parsedGherkin.feature || 'Generated Scenario',
          user_story: userStory.trim(),
          feature_name: parsedGherkin.feature,
          description: parsedGherkin.description,
          scenarios_json: parsedGherkin,
          meteor_score: meteorMetrics?.meteor_score || null,
          generation_time_ms: performanceMetrics?.durationMs || null,
          quality_level: qualityAssessment?.level || null,
          jira_epic_id: jiraEpicId,
          tags: ['ai-generated'],
          // Reference library tracking
          reference_library_ids: usedReferences.map(r => r.id).filter(Boolean) || [],
          // Token usage tracking (if available from AI response)
          prompt_tokens: aiResponse.usage?.prompt_tokens || null,
          completion_tokens: aiResponse.usage?.completion_tokens || null,
          total_tokens: aiResponse.usage?.total_tokens || null,
          // Model information (if available from AI response)
          model_used: aiResponse.model || null
        };

        savedScenario = await supabaseService.createScenario(scenarioData);
        cleanLogger.debug('GHERKIN-CONTROLLER', 'Scenario saved to database', { id: savedScenario.id });

        // PENGECEKAN KONEKSI JIRA & EPIC: Jika ada koneksi Jira dan Epic, bisa create JIRA items (DISABLED)
        // Auto-export sudah di-DISABLE, user harus manual export via button
        if (jiraEpicId && jiraConnectionId) {
          try {
            const storyData = {
              title: parsedGherkin.feature || 'Generated User Story',
              userStory: userStory.trim(),
              description: parsedGherkin.description,
              featureName: parsedGherkin.feature,
              scenarios: parsedGherkin.scenarios || []
            };

            // Log generation summary
            cleanLogger.info('GHERKIN-GENERATION', 'Generating Gherkin scenarios', {
              feature: parsedGherkin.feature,
              userStory: userStory.trim().substring(0, 100) + '...',
              scenariosCount: parsedGherkin.scenarios?.length || 0
            });

            // DISABLED: Auto-export to JIRA removed - users should use manual export button
            // This was causing duplicate stories (one auto, one manual)
            
            // JIRA integration disabled - users should use manual export button
            // The following code is commented out to prevent auto-export
            
            /*
            // Create user story in JIRA
            jiraUserStory = await jiraService.createUserStory(
              jiraConnectionId,
              jiraEpicId,
              storyData,
              req.user.id
            );

            cleanLogger.info('JIRA-INTEGRATION', 'User story created', {
              key: jiraUserStory.key,
              url: jiraUserStory.url
            });

            // Create subtasks from scenarios
            if (parsedGherkin.scenarios && parsedGherkin.scenarios.length > 0) {
              jiraSubtasks = await jiraService.createSubtasks(
                jiraConnectionId,
                jiraUserStory.id,
                parsedGherkin.scenarios,
                req.user.id
              );

              // Log each scenario creation
              jiraSubtasks.forEach((subtask, index) => {
                cleanLogger.info('GHERKIN-SCENARIO', `Scenario ${index + 1} created`, {
                  key: subtask.key,
                  title: subtask.title
                });
              });
            }

            // Update scenario with JIRA information
            await supabaseService.updateScenario(savedScenario.id, req.user.id, {
              jira_user_story_id: jiraUserStory.id,
              jira_subtask_ids: jiraSubtasks.map(task => task.id)
            });
            */

          } catch (jiraError) {
            cleanLogger.warn('JIRA-INTEGRATION', 'Failed to create JIRA items', {
              error: jiraError.message
            });
            // Continue without failing the request - JIRA integration is optional
          }
        }

        // Log evaluation metrics if METEOR was used
        if (meteorMetrics && savedScenario) {
          await supabaseService.logEvaluationMetrics({
            scenario_id: savedScenario.id,
            user_id: req.user.id,
            request_id: requestId,
            meteor_score: meteorMetrics.meteor_score,
            precision_score: meteorMetrics.precision,
            recall_score: meteorMetrics.recall,
            fmean_score: meteorMetrics.fmean,
            fragmentation_penalty: meteorMetrics.fragmentation_penalty,
            generation_time_ms: performanceMetrics?.durationMs || 0,
            quality_level: qualityAssessment.level,
            reference_type: 'ai_generated'
          });
        }

      } catch (dbError) {
        cleanLogger.warn('DATABASE', 'Failed to save scenario', {
          error: dbError.message
        });
        // Continue without failing the request
      }
    }

    // ============================================================
    // TAHAP 10: KIRIM RESPONSE
    // ============================================================
    const response = {
      success: true,
      data: {
        type: 'gherkin',
        id: savedScenario?.id || Date.now(),
        gherkin: gherkinCode,
        scenario_id: savedScenario?.id || null,
        formatDetection: aiResponse.formatDetection,
        isConnextra: true,
        usedReferences: usedReferences, // Add actual references used
        metadata: {
          promptingMethod: usedReferences.length > 0 ? 'few-shot' : 'zero-shot',
          referenceCount: usedReferences.length
        },
        usage: usageInfo, // Include usage information (model, displayName, provider, tier, remaining, limit)
        quality_metrics: meteorMetrics ? {
          meteor_score: meteorMetrics.meteor_score,
          quality_level: qualityAssessment.level,
          quality_description: qualityAssessment.description,
          recommendation: qualityAssessment.recommendation,
          meets_threshold: meteorService.meetsQualityThreshold(meteorMetrics.meteor_score)
        } : null,
        performance_metrics: {
          generation_time_ms: performanceMetrics?.durationMs,
          request_id: requestId
        },
        jira_integration: jiraUserStory ? {
          user_story: {
            id: jiraUserStory.id,
            key: jiraUserStory.key,
            url: jiraUserStory.url
          },
          scenarios: jiraSubtasks.map(task => ({
            id: task.id,
            key: task.key,
            title: task.title,
            url: task.url
          })),
          total_scenarios: jiraSubtasks.length,
          message: `Created user story ${jiraUserStory.key} with ${jiraSubtasks.length} Gherkin scenarios`
        } : null
      }
    };
    
    cleanLogger.debug('GHERKIN-CONTROLLER', 'Sending response with quality metrics');
    res.status(200).json(response);
  } catch (error) {
    // Record error in performance monitoring
    const errorMetrics = performanceService.recordError(requestId, error);
    
    if (req.user?.id) {
      await performanceService.logPerformanceMetrics(errorMetrics, req.user.id);
    }

    // Record failed request in usage history if user is authenticated with usage limit
    if (req.user?.id && req.usageLimit) {
      try {
        await usageLimitService.recordRequest(
          req.user.id,
          req.usageLimit.modelName,
          requestId,
          false, // failed
          error.message
        );
      } catch (recordError) {
        cleanLogger.warn('USAGE-LIMIT', 'Failed to record error in history', {
          error: recordError.message
        });
      }
    }
    
    next(error);
  }
};

export const getHistory = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const { search, tags } = req.query;

    if (req.user?.id) {
      // Get scenarios from database for authenticated users
      const scenarios = await supabaseService.getUserScenarios(req.user.id, {
        limit,
        search,
        tags: tags ? tags.split(',') : undefined
      });

      res.json({
        success: true,
        data: scenarios,
        total: scenarios.length
      });
    } else {
      // Return empty for unauthenticated users
      res.json({
        success: true,
        data: [],
        total: 0,
        message: 'Login required to view history'
      });
    }
  } catch (error) {
    next(error);
  }
};

// =====================================================
// JIRA Integration Endpoints
// =====================================================

/**
 * Create JIRA user story from existing scenario
 * POST /api/gherkin/:scenarioId/create-jira-story
 */
export const createJiraUserStory = async (req, res, next) => {
  try {
    const { scenarioId } = req.params;
    const userId = req.user.id;

    // Get scenario from database
    const scenario = await supabaseService.getScenarioById(scenarioId, userId);
    if (!scenario) {
      throw new AppError('Scenario not found', 404);
    }

    // Check if user has Epic context
    const epicContext = await epicService.getEpicContext(userId);
    if (!epicContext.success || !epicContext.data) {
      throw new AppError('Epic context required. Please select an Epic first.', 400);
    }

    const { epic, connection } = epicContext.data.epicData;

    // Check if scenario already has JIRA user story
    if (scenario.jira_user_story_id) {
      return res.status(400).json({
        success: false,
        error: 'Scenario already has associated JIRA user story',
        data: {
          existing_user_story_id: scenario.jira_user_story_id
        }
      });
    }

    try {
      // Prepare story data
      const storyData = {
        title: scenario.title,
        userStory: scenario.user_story,
        description: scenario.description,
        featureName: scenario.feature_name,
        scenarios: scenario.scenarios_json?.scenarios || []
      };

      // Create user story in JIRA
      const jiraUserStory = await jiraService.createUserStory(
        connection.id,
        epic.id,
        storyData,
        userId
      );

      cleanLogger.info('JIRA-INTEGRATION', 'User story created', {
        key: jiraUserStory.key,
        url: jiraUserStory.url
      });

      // Create subtasks from scenarios
      let jiraSubtasks = [];
      if (storyData.scenarios && storyData.scenarios.length > 0) {
        jiraSubtasks = await jiraService.createSubtasks(
          connection.id,
          jiraUserStory.id,
          storyData.scenarios,
          userId
        );

        jiraSubtasks.forEach((subtask, index) => {
          cleanLogger.info('GHERKIN-SCENARIO', `Scenario ${index + 1} created`, {
            key: subtask.key,
            title: subtask.title
          });
        });
      }

      // Update scenario with JIRA information
      await supabaseService.updateScenario(scenarioId, userId, {
        jira_epic_id: epic.id,
        jira_user_story_id: jiraUserStory.id,
        jira_subtask_ids: jiraSubtasks.map(task => task.id)
      });

      res.json({
        success: true,
        data: {
          user_story: {
            id: jiraUserStory.id,
            key: jiraUserStory.key,
            url: jiraUserStory.url
          },
          scenarios: jiraSubtasks.map(task => ({
            id: task.id,
            key: task.key,
            title: task.title,
            url: task.url
          })),
          epic: {
            id: epic.id,
            key: epic.key,
            name: epic.name
          },
          total_scenarios: jiraSubtasks.length
        },
        message: `Created user story ${jiraUserStory.key} with ${jiraSubtasks.length} Gherkin scenarios under Epic ${epic.key}`
      });

    } catch (jiraError) {
      cleanLogger.error('JIRA-INTEGRATION', 'Failed to create JIRA items', {
        error: jiraError.message
      });
      throw new AppError(`JIRA integration failed: ${jiraError.message}`, 500);
    }

  } catch (error) {
    next(error);
  }
};

/**
 * Get JIRA integration status for scenario
 * GET /api/gherkin/:scenarioId/jira-status
 */
export const getJiraIntegrationStatus = async (req, res, next) => {
  try {
    const { scenarioId } = req.params;
    const userId = req.user.id;

    // Get scenario from database
    const scenario = await supabaseService.getScenarioById(scenarioId, userId);
    if (!scenario) {
      throw new AppError('Scenario not found', 404);
    }

    // Check Epic context
    const epicContext = await epicService.getEpicContext(userId);
    const hasEpicContext = epicContext.success && epicContext.data;

    const status = {
      scenario_id: scenarioId,
      has_epic_context: hasEpicContext,
      epic_info: hasEpicContext ? {
        id: epicContext.data.epicData.epic.id,
        key: epicContext.data.epicData.epic.key,
        name: epicContext.data.epicData.epic.name,
        project_key: epicContext.data.epicData.connection.project_key
      } : null,
      jira_integration: {
        has_user_story: !!scenario.jira_user_story_id,
        user_story_id: scenario.jira_user_story_id,
        epic_id: scenario.jira_epic_id,
        scenario_ids: scenario.jira_subtask_ids || [],
        total_scenarios: scenario.jira_subtask_ids?.length || 0
      },
      can_create_user_story: hasEpicContext && !scenario.jira_user_story_id,
      requirements: {
        epic_selection: hasEpicContext ? 'satisfied' : 'required',
        jira_connection: hasEpicContext ? 'available' : 'unknown'
      }
    };

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Bulk create JIRA user stories for multiple scenarios
 * POST /api/gherkin/bulk-create-jira-stories
 */
export const bulkCreateJiraUserStories = async (req, res, next) => {
  try {
    const { scenarioIds } = req.body;
    const userId = req.user.id;

    if (!scenarioIds || !Array.isArray(scenarioIds) || scenarioIds.length === 0) {
      throw new AppError('Scenario IDs array is required', 400);
    }

    // Check Epic context
    const epicContext = await epicService.getEpicContext(userId);
    if (!epicContext.success || !epicContext.data) {
      throw new AppError('Epic context required. Please select an Epic first.', 400);
    }

    const { epic, connection } = epicContext.data.epicData;
    const results = [];
    const errors = [];

    for (const scenarioId of scenarioIds) {
      try {
        // Get scenario
        const scenario = await supabaseService.getScenarioById(scenarioId, userId);
        if (!scenario) {
          errors.push({
            scenario_id: scenarioId,
            error: 'Scenario not found'
          });
          continue;
        }

        // Skip if already has JIRA user story
        if (scenario.jira_user_story_id) {
          errors.push({
            scenario_id: scenarioId,
            error: 'Scenario already has JIRA user story',
            existing_user_story_id: scenario.jira_user_story_id
          });
          continue;
        }

        // Create JIRA user story
        const storyData = {
          title: scenario.title,
          userStory: scenario.user_story,
          description: scenario.description,
          featureName: scenario.feature_name,
          scenarios: scenario.scenarios_json?.scenarios || []
        };

        const jiraUserStory = await jiraService.createUserStory(
          connection.id,
          epic.id,
          storyData,
          userId
        );

        // Create subtasks
        let jiraSubtasks = [];
        if (storyData.scenarios && storyData.scenarios.length > 0) {
          jiraSubtasks = await jiraService.createSubtasks(
            connection.id,
            jiraUserStory.id,
            storyData.scenarios,
            userId
          );
        }

        // Update scenario
        await supabaseService.updateScenario(scenarioId, userId, {
          jira_epic_id: epic.id,
          jira_user_story_id: jiraUserStory.id,
          jira_subtask_ids: jiraSubtasks.map(task => task.id)
        });

        results.push({
          scenario_id: scenarioId,
          user_story: {
            id: jiraUserStory.id,
            key: jiraUserStory.key,
            url: jiraUserStory.url
          },
          scenarios_count: jiraSubtasks.length
        });

      } catch (error) {
        errors.push({
          scenario_id: scenarioId,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      data: {
        epic: {
          id: epic.id,
          key: epic.key,
          name: epic.name
        },
        results,
        errors,
        summary: {
          total_requested: scenarioIds.length,
          successful: results.length,
          failed: errors.length,
          total_scenarios: results.reduce((sum, r) => sum + r.scenarios_count, 0)
        }
      },
      message: `Created ${results.length} user stories with ${results.reduce((sum, r) => sum + r.scenarios_count, 0)} Gherkin scenarios. ${errors.length} failed.`
    });

  } catch (error) {
    next(error);
  }
};
