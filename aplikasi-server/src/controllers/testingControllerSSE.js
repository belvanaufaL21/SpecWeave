import TestingService from '../services/testingService.js';
import { AppError } from '../middlewares/errorHandler.js';

/**
 * SSE endpoint for METEOR test with real-time progress
 * POST /api/testing/meteor/stream
 */
export const runMeteorTestSSE = async (req, res, next) => {
  try {
    const { scenarioId, generatedText, referenceText } = req.body;
    const userId = req.user?.id;
    
    // DEBUG: Log received data AND headers
    console.log('🔍 [METEOR-SSE] Received request:', {
      scenarioId,
      hasGeneratedText: !!generatedText,
      hasReferenceText: !!referenceText,
      userId,
      hasAuthHeader: !!req.headers.authorization,
      authHeaderPreview: req.headers.authorization ? `${req.headers.authorization.substring(0, 20)}...` : 'NONE'
    });
    
    // Validate required fields
    if (!scenarioId || !generatedText || !referenceText) {
      throw new AppError('scenarioId, generatedText, and referenceText are required', 400);
    }
    
    if (!generatedText.trim() || !referenceText.trim()) {
      throw new AppError('generatedText and referenceText cannot be empty', 400);
    }
    
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    
    // Helper function to send progress updates
    const sendProgress = (stage, progress, data = {}) => {
      const message = {
        stage,
        progress,
        ...data
      };
      res.write(`data: ${JSON.stringify(message)}\n\n`);
    };
    
    try {
      // Stage 1: Mempersiapkan Data (0-10%)
      sendProgress('preparing', 10, { message: 'Mempersiapkan data untuk analisis' });
      
      // Stage 2-6: Calculate METEOR with progress updates
      // We'll modify the service to accept a progress callback
      const meteorResult = await TestingService.calculateMeteorScoreWithProgress(
        generatedText,
        referenceText,
        (stage, progress, details) => {
          sendProgress(stage, progress, details);
        }
      );
      
      // Stage 7: Finalizing (95-100%)
      sendProgress('finalizing', 100, { 
        message: 'Analisis selesai',
        result: meteorResult
      });
      
      // Save to database if authenticated
      let testResult = null;
      console.log('🔍 [METEOR-SSE] Checking authentication:', { userId, hasUser: !!req.user });
      
      if (userId) {
        console.log('💾 [METEOR-SSE] Preparing to save to new meteor_test_results table');
        
        // Save to new meteor_test_results table
        testResult = await TestingService.saveMeteorResult(
          userId,
          scenarioId,
          generatedText,
          referenceText,
          meteorResult
        );
        
        console.log('✅ [METEOR-SSE] Saved to meteor_test_results:', testResult.id);
      } else {
        console.log('⚠️ [METEOR-SSE] Skipping save - user not authenticated');
      }
      
      // Send final result
      const finalMessage = {
        stage: 'complete',
        progress: 100,
        testResult,
        meteorMetrics: meteorResult
      };
      res.write(`data: ${JSON.stringify(finalMessage)}\n\n`);
      res.end();
      
    } catch (error) {
      // Send error through SSE
      const errorMessage = {
        stage: 'error',
        progress: 0,
        error: error.message
      };
      res.write(`data: ${JSON.stringify(errorMessage)}\n\n`);
      res.end();
    }
    
  } catch (error) {
    next(error);
  }
};

/**
 * SSE endpoint for Sentence-BERT test with real-time progress
 * POST /api/testing/sentence-bert/stream
 */
export const runSentenceBertTestSSE = async (req, res, next) => {
  try {
    const { scenarioId, generatedText, referenceText } = req.body;
    const userId = req.user?.id;
    
    // Validate required fields
    if (!scenarioId || !generatedText || !referenceText) {
      throw new AppError('scenarioId, generatedText, and referenceText are required', 400);
    }
    
    if (!generatedText.trim() || !referenceText.trim()) {
      throw new AppError('generatedText and referenceText cannot be empty', 400);
    }
    
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    
    const sendProgress = (stage, progress, data = {}) => {
      const message = {
        stage,
        progress,
        ...data
      };
      res.write(`data: ${JSON.stringify(message)}\n\n`);
    };
    
    try {
      // Stage 1: Mempersiapkan Data (0-8%)
      sendProgress('preparing', 8, { message: 'Mempersiapkan data untuk analisis' });
      
      // Calculate Sentence-BERT with progress updates
      const sbertResult = await TestingService.calculateSentenceBertScoreWithProgress(
        generatedText,
        referenceText,
        (stage, progress, details) => {
          sendProgress(stage, progress, details);
        }
      );
      
      // Stage 7: Finalizing (95-100%)
      sendProgress('finalizing', 100, { 
        message: 'Analisis selesai',
        result: sbertResult
      });
      
      // Save to database if authenticated
      let testResult = null;
      console.log('🔍 [SBERT-SSE] Checking authentication:', { userId, hasUser: !!req.user });
      
      if (userId) {
        console.log('💾 [SBERT-SSE] Preparing to save to new sentence_bert_test_results table');
        
        // Save to new sentence_bert_test_results table
        testResult = await TestingService.saveSentenceBertResult(
          userId,
          scenarioId,
          generatedText,
          referenceText,
          sbertResult
        );
        
        console.log('✅ [SBERT-SSE] Saved to sentence_bert_test_results:', testResult.id);
      } else {
        console.log('⚠️ [SBERT-SSE] Skipping save - user not authenticated');
      }
      
      // Send final result
      const finalMessage = {
        stage: 'complete',
        progress: 100,
        testResult,
        sentenceBertMetrics: sbertResult
      };
      res.write(`data: ${JSON.stringify(finalMessage)}\n\n`);
      res.end();
      
    } catch (error) {
      const errorMessage = {
        stage: 'error',
        progress: 0,
        error: error.message
      };
      res.write(`data: ${JSON.stringify(errorMessage)}\n\n`);
      res.end();
    }
    
  } catch (error) {
    next(error);
  }
};

export default {
  runMeteorTestSSE,
  runSentenceBertTestSSE
};
