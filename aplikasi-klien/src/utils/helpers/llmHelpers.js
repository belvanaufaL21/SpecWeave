/**
 * LLM Helper Functions
 * Utilities for displaying LLM model information
 */

/**
 * Get current LLM model information
 * @returns {Object} Model information including name, provider, and description
 */
export const getCurrentLLMInfo = () => {
  // This could be made configurable via environment variables or settings
  // For now, we return the current model being used based on aiService.js
  
  return {
    name: "Groq Llama 3.1 70B",
    shortName: "Llama 3.1 70B",
    provider: "Groq",
    description: "AI Language Model via Groq",
    model: "openai/gpt-oss-120b",
    capabilities: [
      "Indonesian language support",
      "Gherkin scenario generation", 
      "User story analysis",
      "General conversation"
    ],
    status: "active",
    icon: "🦙" // Llama emoji
  };
};

/**
 * Get LLM status indicator
 * @returns {Object} Status information with color and text
 */
export const getLLMStatus = () => {
  const info = getCurrentLLMInfo();
  
  switch (info.status) {
    case 'active':
      return {
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-500/30',
        text: 'Online',
        indicator: '●'
      };
    case 'loading':
      return {
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20', 
        borderColor: 'border-yellow-500/30',
        text: 'Connecting',
        indicator: '◐'
      };
    case 'error':
      return {
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500/30', 
        text: 'Offline',
        indicator: '●'
      };
    default:
      return {
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/20',
        borderColor: 'border-gray-500/30',
        text: 'Unknown',
        indicator: '?'
      };
  }
};

/**
 * Format LLM display name for different contexts
 * @param {string} context - 'header', 'sidebar', 'full'
 * @returns {string} Formatted display name
 */
export const formatLLMDisplayName = (context = 'header') => {
  const info = getCurrentLLMInfo();
  
  switch (context) {
    case 'header':
      return info.name;
    case 'sidebar':
      return info.shortName;
    case 'full':
      return `${info.name} (${info.provider})`;
    case 'compact':
      return info.shortName;
    default:
      return info.name;
  }
};

/**
 * Get LLM configuration for different environments
 * This could be extended to support multiple models or dynamic switching
 */
export const getLLMConfig = () => {
  // In the future, this could read from:
  // - Environment variables
  // - User settings
  // - Server configuration
  // - Dynamic model selection
  
  return {
    currentModel: getCurrentLLMInfo(),
    availableModels: [
      {
        id: 'groq-llama-70b',
        name: 'Groq Llama 3.1 70B',
        provider: 'Groq',
        description: 'High-performance model with excellent Indonesian support',
        isDefault: true,
        isAvailable: true
      }
      // Future models could be added here:
      // {
      //   id: 'openai-gpt4',
      //   name: 'GPT-4',
      //   provider: 'OpenAI', 
      //   description: 'Advanced reasoning and multilingual support',
      //   isDefault: false,
      //   isAvailable: false
      // }
    ]
  };
};