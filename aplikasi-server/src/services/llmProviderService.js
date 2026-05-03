import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize SDK clients
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * LLM Provider Service
 * 
 * Abstracts provider-specific SDK calls into a unified interface.
 * Routes requests to Groq or Gemini based on the model's provider field.
 * 
 * Supports:
 * - Groq (for economy tier models like Llama 3.1 8B)
 * - Google Gemini (for standard/premium tier models like Gemini 2.5 Flash/Pro)
 */
class LLMProviderService {
  /**
   * Send a completion request to the appropriate LLM provider
   * 
   * @param {string} modelName - Model identifier (e.g., 'llama-3.1-8b-instant', 'gemini-2.5-flash')
   * @param {string} provider - Provider name ('groq' or 'gemini')
   * @param {Array} messages - Chat messages in OpenAI format [{role, content}]
   * @returns {Promise<{text: string, tokensInput: number, tokensOutput: number}>}
   * @throws {Error} If provider is unsupported or API call fails
   */
  async generateCompletion(modelName, provider, messages) {
    if (provider === 'groq') {
      return this._callGroq(modelName, messages);
    }
    if (provider === 'gemini') {
      return this._callGemini(modelName, messages);
    }
    throw new Error(`Unsupported provider: ${provider}`);
  }

  /**
   * Call Groq API using Groq SDK
   * 
   * @private
   * @param {string} modelName - Groq model name
   * @param {Array} messages - Chat messages in OpenAI format
   * @returns {Promise<{text: string, tokensInput: number, tokensOutput: number}>}
   */
  async _callGroq(modelName, messages) {
    const response = await groq.chat.completions.create({
      model: modelName,
      messages,
    });

    return {
      text: response.choices[0].message.content,
      tokensInput: response.usage?.prompt_tokens || 0,
      tokensOutput: response.usage?.completion_tokens || 0,
    };
  }

  /**
   * Call Google Gemini API using Google Generative AI SDK
   * 
   * Handles Gemini's different message format:
   * - System instructions are separate from messages
   * - User messages are concatenated into a single content string
   * 
   * @private
   * @param {string} modelName - Gemini model name
   * @param {Array} messages - Chat messages in OpenAI format
   * @returns {Promise<{text: string, tokensInput: number, tokensOutput: number}>}
   */
  async _callGemini(modelName, messages) {
    try {
      // Extract system and user messages
      const systemContent = messages
        .filter(m => m.role === 'system')
        .map(m => m.content)
        .join('\n');

      const userContent = messages
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join('\n');

      // Get the generative model
      const model = gemini.getGenerativeModel({ 
        model: modelName,
        systemInstruction: systemContent || undefined,
      });

      // Generate content
      const result = await model.generateContent(userContent);
      const response = result.response;

      return {
        text: response.text(),
        tokensInput: response.usageMetadata?.promptTokenCount || 0,
        tokensOutput: response.usageMetadata?.candidatesTokenCount || 0,
      };
    } catch (error) {
      // Enhanced error handling for Gemini API
      if (error.message && error.message.includes('API key was reported as leaked')) {
        throw new Error(
          'Gemini API key has been reported as leaked and blocked by Google. ' +
          'Please generate a new API key at https://aistudio.google.com/app/apikey ' +
          'and update the GEMINI_API_KEY in your .env file. ' +
          'See QUICK-FIX-GEMINI.md for detailed instructions.'
        );
      }
      
      if (error.message && error.message.includes('403')) {
        throw new Error(
          'Gemini API access forbidden (403). This may be due to: ' +
          '1) Leaked API key, 2) Invalid API key, or 3) API not enabled. ' +
          'Please check your API key at https://aistudio.google.com/app/apikey'
        );
      }
      
      if (error.message && error.message.includes('401')) {
        throw new Error(
          'Gemini API authentication failed (401). Please verify your API key is correct in the .env file.'
        );
      }
      
      if (error.message && error.message.includes('429')) {
        // Check if it's Gemini Pro (stricter rate limits)
        const isGeminiPro = modelName.includes('pro');
        const rateLimit = isGeminiPro ? '2 requests/min' : '15 requests/min';
        
        throw new Error(
          `Gemini API rate limit exceeded (429). ` +
          `${modelName} has a limit of ${rateLimit} on free tier. ` +
          `Please wait 1-2 minutes and try again, or use Gemini 2.5 Flash for higher quota.`
        );
      }
      
      // Re-throw original error if not a known case
      throw error;
    }
  }
}

// Export as singleton instance
export default new LLMProviderService();
