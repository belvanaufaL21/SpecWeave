import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize OpenRouter client (single provider for all models)
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.APP_URL || 'https://specweave.com',
    'X-Title': 'SpecWeave',
  }
});

/**
 * LLM Provider Service
 * 
 * Abstracts provider-specific SDK calls into a unified interface.
 * Routes requests to OpenRouter for all models.
 * 
 * Supports:
 * - OpenRouter (for all models: Llama, Gemini, GPT, Claude)
 */
class LLMProviderService {
  /**
   * Send a completion request to OpenRouter
   * 
   * @param {string} modelName - Model identifier (e.g., 'meta-llama/llama-3.3-70b-instruct', 'google/gemini-2.5-flash')
   * @param {string} provider - Provider name (should be 'openrouter')
   * @param {Array} messages - Chat messages in OpenAI format [{role, content}]
   * @returns {Promise<{text: string, tokensInput: number, tokensOutput: number}>}
   * @throws {Error} If provider is unsupported or API call fails
   */
  async generateCompletion(modelName, provider, messages) {
    if (provider === 'openrouter') {
      return this._callOpenRouter(modelName, messages);
    }
    throw new Error(`Unsupported provider: ${provider}. Only 'openrouter' is supported.`);
  }

  /**
   * Call OpenRouter API using OpenAI SDK
   * 
   * OpenRouter provides access to 300+ models through a single API.
   * Uses OpenAI-compatible API format for easy integration.
   * 
   * Benefits:
   * - No rate limits (unlike direct Gemini API)
   * - Access to multiple providers (Anthropic, OpenAI, Google, Meta, etc.)
   * - Competitive pricing
   * - Free models available
   * 
   * @private
   * @param {string} modelName - OpenRouter model name (e.g., 'anthropic/claude-sonnet-4.6')
   * @param {Array} messages - Chat messages in OpenAI format
   * @returns {Promise<{text: string, tokensInput: number, tokensOutput: number}>}
   */
  async _callOpenRouter(modelName, messages) {
    try {
      console.log('🔄 [LLM-PROVIDER] Calling OpenRouter API:', {
        model: modelName,
        messagesCount: messages.length,
        apiKeyPresent: !!process.env.OPENROUTER_API_KEY,
        apiKeyPrefix: process.env.OPENROUTER_API_KEY?.substring(0, 10) + '...'
      });

      const response = await openrouter.chat.completions.create({
        model: modelName,
        messages,
      });

      console.log('✅ [LLM-PROVIDER] OpenRouter API success:', {
        model: modelName,
        tokensInput: response.usage?.prompt_tokens || 0,
        tokensOutput: response.usage?.completion_tokens || 0,
        responseLength: response.choices[0].message.content.length
      });

      return {
        text: response.choices[0].message.content,
        tokensInput: response.usage?.prompt_tokens || 0,
        tokensOutput: response.usage?.completion_tokens || 0,
      };
    } catch (error) {
      console.error('❌ [LLM-PROVIDER] OpenRouter API error:', {
        model: modelName,
        errorMessage: error.message,
        errorStatus: error.status,
        errorCode: error.code,
        errorType: error.type,
        errorResponse: error.response?.data || error.response || 'No response data'
      });

      // Enhanced error handling for OpenRouter API
      if (error.message && error.message.includes('insufficient_quota')) {
        throw new Error(
          'OpenRouter API quota exceeded. Please add more credits to your OpenRouter account at https://openrouter.ai/'
        );
      }
      
      if (error.status === 401 || (error.message && error.message.includes('401'))) {
        throw new Error(
          'OpenRouter API authentication failed (401). Please verify your API key is correct in the .env file.'
        );
      }
      
      if (error.status === 404 || (error.message && error.message.includes('404'))) {
        throw new Error(
          `OpenRouter model not found (404): ${modelName}. Please check the model name at https://openrouter.ai/models`
        );
      }

      if (error.status === 400 || (error.message && error.message.includes('400'))) {
        throw new Error(
          `OpenRouter bad request (400) for model ${modelName}: ${error.message}. Check if model name is correct.`
        );
      }
      
      // Re-throw original error with more context
      throw new Error(`OpenRouter API error for model ${modelName}: ${error.message}`);
    }
  }
}

// Export as singleton instance
export default new LLMProviderService();
