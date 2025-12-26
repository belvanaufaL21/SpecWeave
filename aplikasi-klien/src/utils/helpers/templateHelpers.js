import { supabase } from '../../config/supabase.js';
import { TEMPLATE_CONSTANTS } from '../constants/templateConstants';

/**
 * Helper functions untuk Template Service
 */

/**
 * Dapatkan authentication headers
 */
export async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    ...TEMPLATE_CONSTANTS.DEFAULT_HEADERS,
    'Authorization': session?.access_token ? `Bearer ${session.access_token}` : ''
  };
}

/**
 * Handle API response dengan error handling
 */
export async function handleApiResponse(response) {
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || data.message || 'Request failed');
  }
  
  return data;
}

/**
 * Validasi konten template
 */
export function validateTemplateContent(content) {
  const { VALIDATION, ERROR_MESSAGES } = TEMPLATE_CONSTANTS;
  const errors = [];

  if (!content || typeof content !== 'string') {
    errors.push(ERROR_MESSAGES.CONTENT_REQUIRED);
    return { valid: false, errors };
  }

  if (content.trim().length === 0) {
    errors.push(ERROR_MESSAGES.CONTENT_EMPTY);
  }

  if (content.length > VALIDATION.MAX_CONTENT_LENGTH) {
    errors.push(ERROR_MESSAGES.CONTENT_TOO_LONG);
  }

  // Check for valid variable placeholders
  const variables = [];
  let match;

  while ((match = VALIDATION.VARIABLE_PLACEHOLDER_PATTERN.exec(content)) !== null) {
    const variableName = match[1].trim();
    
    if (!variableName) {
      errors.push(ERROR_MESSAGES.EMPTY_VARIABLE_PLACEHOLDER);
      continue;
    }

    if (!VALIDATION.VARIABLE_NAME_PATTERN.test(variableName)) {
      errors.push(`${ERROR_MESSAGES.INVALID_VARIABLE_NAME}: ${variableName}`);
      continue;
    }

    if (!variables.includes(variableName)) {
      variables.push(variableName);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    variables
  };
}

/**
 * Validasi konfigurasi variables template
 */
export function validateTemplateVariables(variables) {
  const { VARIABLE_TYPES, VARIABLE_VALIDATION, ERROR_MESSAGES } = TEMPLATE_CONSTANTS;
  const errors = [];

  if (!Array.isArray(variables)) {
    errors.push(ERROR_MESSAGES.VARIABLES_MUST_BE_ARRAY);
    return { valid: false, errors };
  }

  const variableNames = new Set();

  variables.forEach((variable, index) => {
    if (!variable || typeof variable !== 'object') {
      errors.push(`${ERROR_MESSAGES.VARIABLE_MUST_BE_OBJECT} at index ${index}`);
      return;
    }

    // Validasi nama variable
    if (!variable.name || typeof variable.name !== 'string') {
      errors.push(`${ERROR_MESSAGES.VARIABLE_NAME_REQUIRED} at index ${index}`);
    } else {
      if (variableNames.has(variable.name)) {
        errors.push(`${ERROR_MESSAGES.DUPLICATE_VARIABLE_NAME}: ${variable.name}`);
      } else {
        variableNames.add(variable.name);
      }

      if (!TEMPLATE_CONSTANTS.VALIDATION.VARIABLE_NAME_PATTERN.test(variable.name)) {
        errors.push(`${ERROR_MESSAGES.INVALID_VARIABLE_NAME}: ${variable.name}`);
      }
    }

    // Validasi type variable
    if (!variable.type || typeof variable.type !== 'string') {
      errors.push(`${ERROR_MESSAGES.VARIABLE_TYPE_REQUIRED}: ${variable.name || `at index ${index}`}`);
    } else {
      const validTypes = Object.values(VARIABLE_TYPES);
      if (!validTypes.includes(variable.type)) {
        errors.push(`${ERROR_MESSAGES.INVALID_VARIABLE_TYPE}: ${variable.type}. Valid types: ${validTypes.join(', ')}`);
      }

      // Validasi khusus untuk type select
      if (variable.type === VARIABLE_TYPES.SELECT) {
        if (!Array.isArray(variable.options) || variable.options.length === 0) {
          errors.push(`${ERROR_MESSAGES.SELECT_OPTIONS_REQUIRED}: ${variable.name}`);
        }
      }
    }

    // Validasi field opsional
    if (variable.label && typeof variable.label !== 'string') {
      errors.push(`${ERROR_MESSAGES.VARIABLE_LABEL_INVALID}: ${variable.name}`);
    }

    if (variable.description && typeof variable.description !== 'string') {
      errors.push(`${ERROR_MESSAGES.VARIABLE_DESCRIPTION_INVALID}: ${variable.name}`);
    }

    if (variable.required !== undefined && typeof variable.required !== 'boolean') {
      errors.push(`${ERROR_MESSAGES.VARIABLE_REQUIRED_INVALID}: ${variable.name}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Preview template dengan sample variables
 */
export function previewTemplate(content, variables = {}) {
  let preview = content;

  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = new RegExp(`\\{${key}\\}`, 'g');
    preview = preview.replace(placeholder, value || `{${key}}`);
  });

  return preview;
}

/**
 * Extract variables dari template content
 */
export function extractVariablesFromContent(content) {
  const { VALIDATION } = TEMPLATE_CONSTANTS;
  const variables = [];
  let match;

  // Reset regex lastIndex
  VALIDATION.VARIABLE_PLACEHOLDER_PATTERN.lastIndex = 0;

  while ((match = VALIDATION.VARIABLE_PLACEHOLDER_PATTERN.exec(content)) !== null) {
    const variableName = match[1].trim();
    
    if (variableName && VALIDATION.VARIABLE_NAME_PATTERN.test(variableName)) {
      if (!variables.includes(variableName)) {
        variables.push(variableName);
      }
    }
  }

  return variables;
}

/**
 * Generate default variable configuration
 */
export function generateDefaultVariableConfig(variableNames) {
  return variableNames.map(name => ({
    name,
    type: TEMPLATE_CONSTANTS.VARIABLE_TYPES.TEXT,
    label: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '),
    description: `Enter value for ${name}`,
    required: true,
    defaultValue: ''
  }));
}

/**
 * Validasi template sebelum save
 */
export function validateTemplateBeforeSave(templateData) {
  const errors = [];

  // Validasi basic fields
  if (!templateData.name || templateData.name.trim().length === 0) {
    errors.push('Template name is required');
  }

  if (!templateData.content || templateData.content.trim().length === 0) {
    errors.push('Template content is required');
  }

  // Validasi content
  if (templateData.content) {
    const contentValidation = validateTemplateContent(templateData.content);
    if (!contentValidation.valid) {
      errors.push(...contentValidation.errors);
    }
  }

  // Validasi variables jika ada
  if (templateData.variables && templateData.variables.length > 0) {
    const variablesValidation = validateTemplateVariables(templateData.variables);
    if (!variablesValidation.valid) {
      errors.push(...variablesValidation.errors);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Format template untuk display
 */
export function formatTemplateForDisplay(template) {
  return {
    ...template,
    formattedCreatedAt: new Date(template.created_at).toLocaleDateString(),
    formattedUpdatedAt: new Date(template.updated_at).toLocaleDateString(),
    variableCount: template.variables ? template.variables.length : 0,
    shortDescription: template.description 
      ? template.description.length > 100 
        ? `${template.description.substring(0, 100)}...`
        : template.description
      : 'No description available'
  };
}