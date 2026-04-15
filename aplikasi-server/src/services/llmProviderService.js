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
  }
}

// Export as singleton instance
export default new LLMProviderService();
