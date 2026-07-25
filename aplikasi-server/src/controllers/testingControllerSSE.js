import TestingService from '../services/testingService.js';
import { AppError } from '../middlewares/errorHandler.js';

/**
 * SSE endpoint for Sentence-BERT test with real-time progress
 * POST /api/testing/sentence-bert/stream
 * 
 * NOTE: SSE headers already set by sseMiddlewareWrapper in routes
 * (METEOR SSE endpoint has been removed)
 */
export const runSentenceBertTestSSE = async (req, res, next) => {
  try {
    const { scenarioId, generatedText, referenceText } = req.body;
    const userId = req.user?.id;
    
    // Validate required fields - send error via SSE instead of throwing
    if (!scenarioId || !generatedText || !referenceText) {
      const errorMessage = {
        stage: 'error',
        progress: 0,
        error: 'scenarioId, generatedText, and referenceText are required'
      };
      res.write(`data: ${JSON.stringify(errorMessage)}\n\n`);
      res.end();
      return;
    }
    
    if (!generatedText.trim() || !referenceText.trim()) {
      const errorMessage = {
        stage: 'error',
        progress: 0,
        error: 'generatedText and referenceText cannot be empty'
      };
      res.write(`data: ${JSON.stringify(errorMessage)}\n\n`);
      res.end();
      return;
    }
    
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
      console.error('❌ [SBERT-SSE] Inner error:', error);
      const errorMessage = {
        stage: 'error',
        progress: 0,
        error: error.message || 'An unexpected error occurred during calculation'
      };
      res.write(`data: ${JSON.stringify(errorMessage)}\n\n`);
      res.end();
    }
    
  } catch (error) {
    console.error('❌ [SBERT-SSE] Outer error:', error);
    const errorMessage = {
      stage: 'error',
      progress: 0,
      error: error.message || 'An unexpected error occurred'
    };
    res.write(`data: ${JSON.stringify(errorMessage)}\n\n`);
    res.end();
  }
};

export default {
  runSentenceBertTestSSE
};
