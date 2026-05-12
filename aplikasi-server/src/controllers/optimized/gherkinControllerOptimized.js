import { convertToGherkin } from '../../services/aiService.js';
import MeteorService from '../../services/meteorService.js';
import PerformanceService from '../../services/performanceService.js';
import databaseService from '../../services/databaseService.js';
import cacheService from '../../services/cacheService.js';
import jiraService from '../../services/jiraService.js';
import epicService from '../../services/epicService.js';
import { AppError } from '../../middlewares/errorHandler.js'; 
import { v4 as uuidv4 } from 'uuid';

const meteorService = new MeteorService();
const performanceService = new PerformanceService();

/**
 * Optimized Gherkin Controller
 * Features: Caching, parallel processing, optimized database queries, response compression
 */

export const generateGherkin = async (req, res, next) => {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  console.log("🚀 Optimized Gherkin Controller - Request received");
  
  try {
    const { userStory, evaluateQuality = false } = req.body;

    // 1. Validation
    if (!userStory || typeof userStory !== 'string') {
      throw new AppError('User story is required and must be a string', 400);
    }
    if (userStory.trim().length < 10) {
      throw new AppError('User story must be at least 10 characters (too short)', 400);
    }

    // 2. Check cache for similar user stories
    const userStoryCacheKey = cacheService.createKey('gherkin', 
      Buffer.from(userStory.trim()).toString('base64').slice(0, 32)
    );
    
    let cachedResult = await cacheService.get(userStoryCacheKey);
    let fromCache = false;
    
    if (cachedResult && !evaluateQuality) {
      // Return cached result for non-evaluation requests
      fromCache = true;
      console.log('📦 Gherkin result retrieved from cache');
      
      const responseTime = Date.now() - startTime;
      return res.json({
        ...cachedResult,
        performance: {
          responseTime,
          fromCache: true
        }
      });
    }

    // 3. Start performance monitoring
    performanceService.startTimer(requestId, 'gherkin_generation');

    // 4. Call AI Service with timeout
    const aiResponse = await Promise.race([
      convertToGherkin(userStory.trim()),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AI service timeout')), 30000)
      )
    ]);
    
    console.log("✅ Controller: Received response from AI service");

    // Handle different response types
    if (aiResponse.type === 'general') {
      // Non-Connextra input - return general LLM response
      const response = {
        success: true,
        data: {
          type: 'general',
          content: aiResponse.content,
          formatDetection: aiResponse.formatDetection,
          isConnextra: false,
          message: null
        }
      };
      
      // Cache general responses for 1 hour
      await cacheService.set(userStoryCacheKey, response, 3600);
      
      const responseTime = Date.now() - startTime;
      response.performance = { responseTime, fromCache: false };
      
      return res.json(response);
    }

    // Connextra format - continue with Gherkin processing
    const gherkinCode = aiResponse.content;
    console.log("📋 Processing Connextra format - generating Gherkin scenarios");

    // 5. Parallel processing for METEOR evaluation and database operations
    const promises = [];
    let meteorMetrics = null;
    let qualityAssessment = null;
    
    // METEOR evaluation promise
    if (evaluateQuality) {
      promises.push(
        (async () => {
          try {
            console.log("🚀 Starting METEOR evaluation...");
            
            // Parse the generated Gherkin to extract scenario text
            const parsedGherkin = JSON.parse(gherkinCode);
            const candidateText = meteorService.extractScenarioText(parsedGherkin);
            const referenceText = meteorService.generateReferenceText(parsedGherkin);
            
            // Create cache key for METEOR evaluation
            const meteorCacheKey = cacheService.createKey('meteor_eval', 
              `${Buffer.from(candidateText).toString('base64').slice(0, 20)}_${Buffer.from(referenceText).toString('base64').slice(0, 20)}`
            );
            
            // Check cache first
            let cachedMeteor = await cacheService.get(meteorCacheKey);
            if (cachedMeteor) {
              meteorMetrics = cachedMeteor.metrics;
              qualityAssessment = cachedMeteor.assessment;
              console.log('📦 METEOR evaluation retrieved from cache');
            } else {
              // Perform METEOR evaluation
              meteorMetrics = await meteorService.evaluateScenario(candidateText, referenceText);
              qualityAssessment = meteorService.getQualityAssessment(meteorMetrics.meteor_score);
              
              // Cache METEOR results for 2 hours
              await cacheService.set(meteorCacheKey, {
                metrics: meteorMetrics,
                assessment: qualityAssessment
              }, 7200);
            }
            
            console.log(`📊 METEOR Score: ${meteorMetrics.meteor_score} (${qualityAssessment.level})`);
            
          } catch (meteorError) {
            console.warn('⚠️ METEOR evaluation failed:', meteorError.message);
            // Continue without METEOR evaluation if it fails
          }
        })()
      );
    }

    // User context and Epic context promise
    let epicContextPromise = null;
    if (req.user?.id) {
      epicContextPromise = epicService.getEpicContext(req.user.id);
    }

    // Wait for METEOR evaluation to complete
    await Promise.all(promises);

    // 6. End performance monitoring
    const performanceMetrics = performanceService.endTimer(requestId);

    // 7. Database operations and JIRA integration (if user is authenticated)
    let savedScenario = null;
    let jiraUserStory = null;
    let jiraSubtasks = [];
    
    if (req.user?.id) {
      try {
        // Parse Gherkin to extract feature info
        const parsedGherkin = JSON.parse(gherkinCode);
        
        // Get Epic context
        const epicContext = epicContextPromise ? await epicContextPromise : { success: false };
        let jiraEpicId = null;
        let jiraConnectionId = null;
        
        if (epicContext.success && epicContext.data) {
          jiraEpicId = epicContext.data.epicData.epic.id;
          jiraConnectionId = epicContext.data.epicData.connection.id;
          console.log(`🎯 Epic context found: ${epicContext.data.epicData.epic.name}`);
        }
        
        // Prepare scenario data
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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Reference library tracking (empty for optimized path - no few-shot)
          reference_library_ids: [],
          // Token usage tracking (if available from AI response)
          prompt_tokens: aiResponse.usage?.prompt_tokens || null,
          completion_tokens: aiResponse.usage?.completion_tokens || null,
          total_tokens: aiResponse.usage?.total_tokens || null,
          // Model information (if available from AI response)
          model_used: aiResponse.model || null
        };

        // Save scenario using optimized database service
        const scenarioResult = await databaseService.insert('scenarios', scenarioData, {
          select: '*',
          single: true,
          invalidateCache: [`scenarios_user_${req.user.id}`]
        });
        
        savedScenario = scenarioResult.data;
        console.log('💾 Scenario saved to database:', savedScenario.id);

        // JIRA integration (parallel with evaluation metrics logging)
        const jiraPromises = [];
        
        // Create JIRA user story if Epic context exists
        if (jiraEpicId && jiraConnectionId) {
          jiraPromises.push(
            (async () => {
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
                  jiraSubtasks = await jiraService.createSubtasks(
                    jiraConnectionId,
                    jiraUserStory.id,
                    parsedGherkin.scenarios,
                    req.user.id
                  );

                  console.log(`✅ Created ${jiraSubtasks.length} JIRA subtasks`);
                }

                // Update scenario with JIRA information
                await databaseService.update('scenarios', {
                  jira_user_story_id: jiraUserStory.id,
                  jira_subtask_ids: jiraSubtasks.map(task => task.id),
                  updated_at: new Date().toISOString()
                }, {
                  filters: [
                    { column: 'id', value: savedScenario.id },
                    { column: 'user_id', value: req.user.id }
                  ],
                  invalidateCache: [`scenarios_user_${req.user.id}`, `scenario_${savedScenario.id}`]
                });

              } catch (jiraError) {
                console.warn('⚠️ JIRA integration failed:', jiraError.message);
                // Continue without failing the request - JIRA integration is optional
              }
            })()
          );
        }

        // Log evaluation metrics if METEOR was used
        if (meteorMetrics && savedScenario) {
          jiraPromises.push(
            databaseService.insert('evaluation_metrics', {
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
              reference_type: 'ai_generated',
              created_at: new Date().toISOString()
            }, {
              invalidateCache: [`evaluation_metrics_user_${req.user.id}`]
            })
          );
        }

        // Log performance metrics
        jiraPromises.push(
          performanceService.logPerformanceMetrics(performanceMetrics, req.user.id)
        );

        // Wait for all parallel operations to complete
        await Promise.all(jiraPromises);

      } catch (dbError) {
        console.warn('⚠️ Failed to save scenario to database:', dbError.message);
        // Continue without failing the request
      }
    }

    // 8. Prepare response
    const response = {
      success: true,
      data: {
        type: 'gherkin',
        id: savedScenario?.id || Date.now(),
        gherkin: gherkinCode,
        scenario_id: savedScenario?.id || null,
        formatDetection: aiResponse.formatDetection,
        isConnextra: true,
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

    // Cache successful Gherkin responses for 30 minutes
    if (!evaluateQuality) {
      await cacheService.set(userStoryCacheKey, response, 1800);
    }

    const responseTime = Date.now() - startTime;
    response.performance = { responseTime, fromCache: false };
    
    console.log("📤 Controller: Sending optimized response");
    res.json(response);
    
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
  const startTime = Date.now();
  
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50); // Max 50
    const offset = parseInt(req.query.offset) || 0;
    const { search, tags } = req.query;

    if (req.user?.id) {
      // Create cache key for user scenarios
      const cacheKey = cacheService.createKey('user_scenarios', 
        `user_${req.user.id}_${limit}_${offset}_${search || ''}_${tags || ''}`
      );
      
      // Try to get cached results first
      let scenarios = await cacheService.get(cacheKey);
      let fromCache = false;
      
      if (!scenarios) {
        // Build query options
        const queryOptions = {
          select: 'id, title, user_story, feature_name, description, meteor_score, quality_level, created_at, updated_at, tags',
          filters: [{ column: 'user_id', operator: 'eq', value: req.user.id }],
          orderBy: [{ column: 'created_at', ascending: false }],
          limit,
          offset,
          cache: true,
          cacheKey,
          cacheTTL: 300 // 5 minutes
        };
        
        // Add search filter if provided
        if (search) {
          queryOptions.filters.push({
            column: 'title',
            operator: 'or',
            value: `title.ilike.%${search}%,user_story.ilike.%${search}%,description.ilike.%${search}%`
          });
        }
        
        // Add tags filter if provided
        if (tags) {
          const tagArray = tags.split(',').map(tag => tag.trim());
          queryOptions.filters.push({
            column: 'tags',
            operator: 'contains',
            value: tagArray
          });
        }
        
        const queryResult = await databaseService.executeQuery('scenarios', queryOptions);
        scenarios = queryResult.data || [];
        fromCache = queryResult.fromCache;
      } else {
        fromCache = true;
        console.log('📦 User scenarios retrieved from cache');
      }

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: scenarios,
        total: scenarios.length,
        pagination: {
          limit,
          offset,
          hasMore: scenarios.length === limit
        },
        performance: {
          responseTime,
          fromCache
        }
      });
    } else {
      // Return empty for unauthenticated users
      res.json({
        success: true,
        data: [],
        total: 0,
        message: 'Login required to view history',
        performance: {
          responseTime: Date.now() - startTime,
          fromCache: false
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

export default {
  generateGherkin,
  getHistory
};