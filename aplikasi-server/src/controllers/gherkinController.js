import { convertToGherkin } from '../services/aiService.js';
import MeteorService from '../services/meteorService.js';
import PerformanceService from '../services/performanceService.js';
import supabaseService from '../services/supabaseService.js';
import jiraService from '../services/jiraService.js';
import epicService from '../services/epicService.js';
import { AppError } from '../middlewares/errorHandler.js'; 
import { v4 as uuidv4 } from 'uuid';

const meteorService = new MeteorService();
const performanceService = new PerformanceService();

export const generateGherkin = async (req, res, next) => {
  const requestId = uuidv4();
  
  console.log("🚀🚀🚀 GHERKIN CONTROLLER CALLED 🚀🚀🚀");
  console.log("📥 Request method:", req.method);
  console.log("📥 Request URL:", req.url);
  console.log("📥 Request body:", req.body);
  
  try {
    const { userStory, evaluateQuality = false } = req.body;

    console.log("🔍 Gherkin Controller - Request body:", { userStory: userStory?.substring(0, 100) + "...", evaluateQuality });

    // 1. Validasi
    if (!userStory || typeof userStory !== 'string') {
      throw new AppError('User story is required and must be a string', 400);
    }
    if (userStory.trim().length < 10) {
      throw new AppError('User story must be at least 10 characters (too short)', 400);
    }

    // 2. Start performance monitoring
    performanceService.startTimer(requestId, 'gherkin_generation');

    // 3. Panggil AI Service
    const gherkinCode = await convertToGherkin(userStory.trim());
    console.log("✅ Controller: Received gherkin from AI service:", gherkinCode);

    // 4. METEOR Quality Evaluation (if requested)
    let meteorMetrics = null;
    let qualityAssessment = null;
    
    console.log("🎯 METEOR Evaluation requested:", evaluateQuality);
    
    if (evaluateQuality) {
      console.log("🚀 Starting METEOR evaluation...");
      try {
        // Parse the generated Gherkin to extract scenario text
        const parsedGherkin = JSON.parse(gherkinCode);
        const candidateText = meteorService.extractScenarioText(parsedGherkin);
        
        // Generate intelligent reference text based on AI output analysis
        const referenceText = meteorService.generateReferenceText(parsedGherkin);
        
        console.log(`🔍 Detected scenario type and generated reference for METEOR evaluation`);
        console.log(`📝 Candidate length: ${candidateText.length} chars`);
        console.log(`📋 Reference length: ${referenceText.length} chars`);
        
        // Perform METEOR evaluation
        meteorMetrics = await meteorService.evaluateScenario(candidateText, referenceText);
        qualityAssessment = meteorService.getQualityAssessment(meteorMetrics.meteor_score);
        
        console.log(`📊 METEOR Score: ${meteorMetrics.meteor_score} (${qualityAssessment.level})`);
        console.log(`🎯 Quality: ${qualityAssessment.description}`);
        
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

    // 5. End performance monitoring
    const performanceMetrics = performanceService.endTimer(requestId);
    
    // Log performance metrics if user is authenticated
    if (req.user?.id) {
      await performanceService.logPerformanceMetrics(performanceMetrics, req.user.id);
    }

    // 6. Save scenario to database and create JIRA user story if user is authenticated
    let savedScenario = null;
    let jiraUserStory = null;
    let jiraSubtasks = [];
    
    if (req.user?.id) {
      try {
        // Parse Gherkin to extract feature info
        const parsedGherkin = JSON.parse(gherkinCode);
        
        // Check if user has Epic context for JIRA integration
        const epicContext = await epicService.getEpicContext(req.user.id);
        let jiraEpicId = null;
        let jiraConnectionId = null;
        
        if (epicContext.success && epicContext.data) {
          jiraEpicId = epicContext.data.epicData.epic.id;
          jiraConnectionId = epicContext.data.epicData.connection.id;
          console.log(`🎯 Epic context found: ${epicContext.data.epicData.epic.name} (${epicContext.data.epicData.epic.key})`);
        }
        
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
          tags: ['ai-generated']
        };

        savedScenario = await supabaseService.createScenario(scenarioData);
        console.log('💾 Scenario saved to database:', savedScenario.id);

        // Create JIRA user story if Epic context exists
        if (jiraEpicId && jiraConnectionId) {
          try {
            console.log('🎫 Creating JIRA user story...');
            
            const storyData = {
              title: parsedGherkin.feature || 'Generated User Story',
              userStory: userStory.trim(),
              description: parsedGherkin.description,
              featureName: parsedGherkin.feature,
              scenarios: parsedGherkin.scenarios || []
            };

            // Create user story in JIRA
            jiraUserStory = await jiraService.createUserStory(
              jiraConnectionId,
              jiraEpicId,
              storyData,
              req.user.id
            );

            console.log(`✅ JIRA user story created: ${jiraUserStory.key}`);

            // Create subtasks from scenarios
            if (parsedGherkin.scenarios && parsedGherkin.scenarios.length > 0) {
              console.log('📋 Creating JIRA subtasks...');
              
              jiraSubtasks = await jiraService.createSubtasks(
                jiraConnectionId,
                jiraUserStory.id,
                parsedGherkin.scenarios,
                req.user.id
              );

              console.log(`✅ Created ${jiraSubtasks.length} JIRA subtasks`);
            }

            // Update scenario with JIRA information
            await supabaseService.updateScenario(savedScenario.id, req.user.id, {
              jira_user_story_id: jiraUserStory.id,
              jira_subtask_ids: jiraSubtasks.map(task => task.id)
            });

          } catch (jiraError) {
            console.warn('⚠️ JIRA integration failed:', jiraError.message);
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
        console.warn('⚠️ Failed to save scenario to database:', dbError.message);
        // Continue without failing the request
      }
    }

    // 7. Response with quality metrics and JIRA integration results
    const response = {
      success: true,
      data: {
        id: savedScenario?.id || Date.now(),
        gherkin: gherkinCode,
        scenario_id: savedScenario?.id || null,
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
          subtasks: jiraSubtasks.map(task => ({
            id: task.id,
            key: task.key,
            title: task.title,
            url: task.url
          })),
          total_subtasks: jiraSubtasks.length,
          message: `Created user story ${jiraUserStory.key} with ${jiraSubtasks.length} subtasks`
        } : null
      }
    };
    
    console.log("📤 Controller: Sending response with quality metrics");
    res.status(200).json(response);
  } catch (error) {
    // Record error in performance monitoring
    const errorMetrics = performanceService.recordError(requestId, error);
    
    if (req.user?.id) {
      await performanceService.logPerformanceMetrics(errorMetrics, req.user.id);
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

      console.log(`✅ JIRA user story created: ${jiraUserStory.key}`);

      // Create subtasks from scenarios
      let jiraSubtasks = [];
      if (storyData.scenarios && storyData.scenarios.length > 0) {
        jiraSubtasks = await jiraService.createSubtasks(
          connection.id,
          jiraUserStory.id,
          storyData.scenarios,
          userId
        );

        console.log(`✅ Created ${jiraSubtasks.length} JIRA subtasks`);
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
          subtasks: jiraSubtasks.map(task => ({
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
          total_subtasks: jiraSubtasks.length
        },
        message: `Created user story ${jiraUserStory.key} with ${jiraSubtasks.length} subtasks under Epic ${epic.key}`
      });

    } catch (jiraError) {
      console.error('JIRA integration error:', jiraError);
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
        subtask_ids: scenario.jira_subtask_ids || [],
        total_subtasks: scenario.jira_subtask_ids?.length || 0
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
          subtasks_count: jiraSubtasks.length
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
          total_subtasks: results.reduce((sum, r) => sum + r.subtasks_count, 0)
        }
      },
      message: `Created ${results.length} user stories with ${results.reduce((sum, r) => sum + r.subtasks_count, 0)} subtasks. ${errors.length} failed.`
    });

  } catch (error) {
    next(error);
  }
};