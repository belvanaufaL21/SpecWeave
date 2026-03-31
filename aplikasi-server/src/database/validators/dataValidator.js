/**
 * Data Validator for Database Operations
 * Provides comprehensive null value and error handling for database operations
 * Requirements: 6.5, 6.6
 */

class DataValidator {
  constructor() {
    // Validation rules for different data types
    this.validationRules = {
      string: {
        required: (value) => value !== null && value !== undefined && value !== '',
        minLength: (value, min) => typeof value === 'string' && value.length >= min,
        maxLength: (value, max) => typeof value === 'string' && value.length <= max,
        pattern: (value, regex) => typeof value === 'string' && regex.test(value),
        email: (value) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      },
      number: {
        required: (value) => value !== null && value !== undefined && !isNaN(value),
        min: (value, min) => typeof value === 'number' && value >= min,
        max: (value, max) => typeof value === 'number' && value <= max,
        integer: (value) => typeof value === 'number' && Number.isInteger(value),
        positive: (value) => typeof value === 'number' && value > 0
      },
      boolean: {
        required: (value) => value !== null && value !== undefined && typeof value === 'boolean'
      },
      array: {
        required: (value) => Array.isArray(value) && value.length > 0,
        minLength: (value, min) => Array.isArray(value) && value.length >= min,
        maxLength: (value, max) => Array.isArray(value) && value.length <= max
      },
      object: {
        required: (value) => value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)
      },
      uuid: {
        required: (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
      },
      date: {
        required: (value) => value !== null && value !== undefined && !isNaN(Date.parse(value)),
        future: (value) => new Date(value) > new Date(),
        past: (value) => new Date(value) < new Date()
      }
    };

    // Schema definitions for different tables
    this.schemas = {
      test_results: {
        user_id: { type: 'uuid', required: true },
        scenario_id: { type: 'string', required: true, minLength: 1, maxLength: 255 },
        test_type: { type: 'string', required: true, pattern: /^(meteor|sentence_bert)$/ },
        score: { type: 'number', required: true, min: 0, max: 1 },
        generated_text: { type: 'string', required: true, minLength: 1 },
        reference_text: { type: 'string', required: true, minLength: 1 },
        test_details: { type: 'object', required: false },
        created_at: { type: 'date', required: false },
        updated_at: { type: 'date', required: false }
      },
      scenario_references: {
        user_id: { type: 'uuid', required: true },
        reference_text: { type: 'string', required: true, minLength: 1 },
        description: { type: 'string', required: false, maxLength: 1000 },
        tags: { type: 'array', required: false, maxLength: 10 },
        usage_count: { type: 'number', required: false, min: 0, integer: true }
      },
      test_scenario_references: {
        user_id: { type: 'uuid', required: true },
        reference_text: { type: 'string', required: true, minLength: 1 },
        description: { type: 'string', required: false, maxLength: 1000 },
        tags: { type: 'array', required: false, maxLength: 10 },
        usage_count: { type: 'number', required: false, min: 0, integer: true }
      },
      profiles: {
        id: { type: 'uuid', required: true },
        email: { type: 'string', required: true, email: true },
        full_name: { type: 'string', required: false, maxLength: 255 }
      }
    };
  }

  /**
   * Validate data against schema
   * @param {Object} data - Data to validate
   * @param {string} tableName - Table name for schema lookup
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  validateData(data, tableName, options = {}) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      sanitizedData: {},
      metadata: {
        tableName,
        validatedAt: new Date().toISOString(),
        options
      }
    };

    try {
      // Get schema for table
      const schema = this.schemas[tableName];
      if (!schema) {
        result.warnings.push(`No validation schema found for table: ${tableName}`);
        result.sanitizedData = this.sanitizeGenericData(data);
        return result;
      }

      // Validate each field
      for (const [fieldName, fieldSchema] of Object.entries(schema)) {
        const fieldValue = data[fieldName];
        const fieldResult = this.validateField(fieldValue, fieldName, fieldSchema, options);
        
        if (!fieldResult.isValid) {
          result.isValid = false;
          result.errors.push(...fieldResult.errors);
        }
        
        result.warnings.push(...fieldResult.warnings);
        
        // Add sanitized value
        if (fieldResult.sanitizedValue !== undefined) {
          result.sanitizedData[fieldName] = fieldResult.sanitizedValue;
        }
      }

      // Check for unexpected fields
      const unexpectedFields = Object.keys(data).filter(key => !schema[key]);
      if (unexpectedFields.length > 0) {
        result.warnings.push(`Unexpected fields found: ${unexpectedFields.join(', ')}`);
        
        // Include unexpected fields in sanitized data if allowed
        if (options.allowUnexpectedFields) {
          unexpectedFields.forEach(field => {
            result.sanitizedData[field] = this.sanitizeValue(data[field]);
          });
        }
      }

      return result;

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Validation error: ${error.message}`);
      return result;
    }
  }

  /**
   * Validate a single field
   * @param {*} value - Field value
   * @param {string} fieldName - Field name
   * @param {Object} fieldSchema - Field schema
   * @param {Object} options - Validation options
   * @returns {Object} Field validation result
   */
  validateField(value, fieldName, fieldSchema, options = {}) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      sanitizedValue: undefined
    };

    try {
      // Handle null/undefined values
      if (value === null || value === undefined) {
        if (fieldSchema.required) {
          result.isValid = false;
          result.errors.push(`Field '${fieldName}' is required but was null/undefined`);
          return result;
        } else {
          // Set default value or leave as null
          result.sanitizedValue = fieldSchema.default !== undefined ? fieldSchema.default : null;
          return result;
        }
      }

      // Handle empty string values
      if (value === '' && fieldSchema.type !== 'string') {
        if (fieldSchema.required) {
          result.isValid = false;
          result.errors.push(`Field '${fieldName}' is required but was empty`);
          return result;
        } else {
          result.sanitizedValue = null;
          return result;
        }
      }

      // Get validation rules for field type
      const typeRules = this.validationRules[fieldSchema.type];
      if (!typeRules) {
        result.warnings.push(`Unknown field type '${fieldSchema.type}' for field '${fieldName}'`);
        result.sanitizedValue = this.sanitizeValue(value);
        return result;
      }

      // Apply validation rules
      for (const [ruleName, ruleValue] of Object.entries(fieldSchema)) {
        if (ruleName === 'type' || ruleName === 'required' || ruleName === 'default') {
          continue; // Skip meta properties
        }

        const ruleFunction = typeRules[ruleName];
        if (!ruleFunction) {
          result.warnings.push(`Unknown validation rule '${ruleName}' for field '${fieldName}'`);
          continue;
        }

        let isRuleValid;
        if (ruleValue === true) {
          isRuleValid = ruleFunction(value);
        } else {
          isRuleValid = ruleFunction(value, ruleValue);
        }

        if (!isRuleValid) {
          result.isValid = false;
          result.errors.push(`Field '${fieldName}' failed validation rule '${ruleName}': expected ${ruleValue}, got ${value}`);
        }
      }

      // Sanitize the value
      result.sanitizedValue = this.sanitizeValue(value, fieldSchema);

      return result;

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Field validation error for '${fieldName}': ${error.message}`);
      return result;
    }
  }

  /**
   * Sanitize a value based on its type and schema
   * @param {*} value - Value to sanitize
   * @param {Object} schema - Field schema
   * @returns {*} Sanitized value
   */
  sanitizeValue(value, schema = {}) {
    if (value === null || value === undefined) {
      return null;
    }

    try {
      switch (schema.type) {
        case 'string':
          return this.sanitizeString(value, schema);
        case 'number':
          return this.sanitizeNumber(value, schema);
        case 'boolean':
          return this.sanitizeBoolean(value);
        case 'array':
          return this.sanitizeArray(value, schema);
        case 'object':
          return this.sanitizeObject(value);
        case 'uuid':
          return this.sanitizeUUID(value);
        case 'date':
          return this.sanitizeDate(value);
        default:
          return this.sanitizeGenericValue(value);
      }
    } catch (error) {
      console.warn(`Sanitization error for value ${value}:`, error);
      return null;
    }
  }

  /**
   * Sanitize string values
   * @param {*} value - Value to sanitize
   * @param {Object} schema - Field schema
   * @returns {string|null} Sanitized string
   */
  sanitizeString(value, schema = {}) {
    if (typeof value !== 'string') {
      value = String(value);
    }

    // Trim whitespace
    value = value.trim();

    // Apply length limits
    if (schema.maxLength && value.length > schema.maxLength) {
      value = value.substring(0, schema.maxLength);
    }

    // Basic XSS protection
    value = value
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    return value;
  }

  /**
   * Sanitize number values
   * @param {*} value - Value to sanitize
   * @param {Object} schema - Field schema
   * @returns {number|null} Sanitized number
   */
  sanitizeNumber(value, schema = {}) {
    const num = Number(value);
    
    if (isNaN(num)) {
      return null;
    }

    // Apply bounds
    if (schema.min !== undefined && num < schema.min) {
      return schema.min;
    }
    
    if (schema.max !== undefined && num > schema.max) {
      return schema.max;
    }

    // Round to integer if required
    if (schema.integer) {
      return Math.round(num);
    }

    // Round to reasonable precision for floats
    return Math.round(num * 1000) / 1000;
  }

  /**
   * Sanitize boolean values
   * @param {*} value - Value to sanitize
   * @returns {boolean|null} Sanitized boolean
   */
  sanitizeBoolean(value) {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes') {
        return true;
      }
      if (lower === 'false' || lower === '0' || lower === 'no') {
        return false;
      }
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    return null;
  }

  /**
   * Sanitize array values
   * @param {*} value - Value to sanitize
   * @param {Object} schema - Field schema
   * @returns {Array|null} Sanitized array
   */
  sanitizeArray(value, schema = {}) {
    if (!Array.isArray(value)) {
      return null;
    }

    let sanitized = value.map(item => this.sanitizeGenericValue(item));

    // Apply length limits
    if (schema.maxLength && sanitized.length > schema.maxLength) {
      sanitized = sanitized.slice(0, schema.maxLength);
    }

    // Remove null/undefined items
    sanitized = sanitized.filter(item => item !== null && item !== undefined);

    return sanitized;
  }

  /**
   * Sanitize object values
   * @param {*} value - Value to sanitize
   * @returns {Object|null} Sanitized object
   */
  sanitizeObject(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return null;
    }

    const sanitized = {};
    for (const [key, val] of Object.entries(value)) {
      const sanitizedKey = this.sanitizeString(key);
      const sanitizedValue = this.sanitizeGenericValue(val);
      
      if (sanitizedKey && sanitizedValue !== undefined) {
        sanitized[sanitizedKey] = sanitizedValue;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize UUID values
   * @param {*} value - Value to sanitize
   * @returns {string|null} Sanitized UUID
   */
  sanitizeUUID(value) {
    if (typeof value !== 'string') {
      return null;
    }

    const uuid = value.toLowerCase().trim();
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)) {
      return null;
    }

    return uuid;
  }

  /**
   * Sanitize date values
   * @param {*} value - Value to sanitize
   * @returns {string|null} Sanitized ISO date string
   */
  sanitizeDate(value) {
    const date = new Date(value);
    
    if (isNaN(date.getTime())) {
      return null;
    }

    return date.toISOString();
  }

  /**
   * Sanitize generic values
   * @param {*} value - Value to sanitize
   * @returns {*} Sanitized value
   */
  sanitizeGenericValue(value) {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    if (typeof value === 'number') {
      return isNaN(value) ? null : value;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map(item => this.sanitizeGenericValue(item));
    }

    if (typeof value === 'object') {
      return this.sanitizeObject(value);
    }

    return value;
  }

  /**
   * Sanitize generic data without schema
   * @param {Object} data - Data to sanitize
   * @returns {Object} Sanitized data
   */
  sanitizeGenericData(data) {
    if (!data || typeof data !== 'object') {
      return {};
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      const sanitizedKey = this.sanitizeString(key);
      const sanitizedValue = this.sanitizeGenericValue(value);
      
      if (sanitizedKey && sanitizedValue !== undefined) {
        sanitized[sanitizedKey] = sanitizedValue;
      }
    }

    return sanitized;
  }

  /**
   * Validate and sanitize bulk data
   * @param {Array} dataArray - Array of data objects
   * @param {string} tableName - Table name for schema lookup
   * @param {Object} options - Validation options
   * @returns {Object} Bulk validation result
   */
  validateBulkData(dataArray, tableName, options = {}) {
    const result = {
      isValid: true,
      totalRecords: dataArray.length,
      validRecords: 0,
      invalidRecords: 0,
      errors: [],
      warnings: [],
      sanitizedData: [],
      metadata: {
        tableName,
        validatedAt: new Date().toISOString(),
        options
      }
    };

    if (!Array.isArray(dataArray)) {
      result.isValid = false;
      result.errors.push('Data must be an array');
      return result;
    }

    for (let i = 0; i < dataArray.length; i++) {
      const item = dataArray[i];
      const itemResult = this.validateData(item, tableName, options);
      
      if (itemResult.isValid) {
        result.validRecords++;
        result.sanitizedData.push(itemResult.sanitizedData);
      } else {
        result.invalidRecords++;
        result.isValid = false;
        
        // Add record index to errors
        const indexedErrors = itemResult.errors.map(error => `Record ${i}: ${error}`);
        result.errors.push(...indexedErrors);
      }
      
      // Add warnings with record index
      const indexedWarnings = itemResult.warnings.map(warning => `Record ${i}: ${warning}`);
      result.warnings.push(...indexedWarnings);
    }

    return result;
  }

  /**
   * Create a custom validation schema
   * @param {string} tableName - Table name
   * @param {Object} schema - Schema definition
   */
  addSchema(tableName, schema) {
    this.schemas[tableName] = schema;
  }

  /**
   * Get validation schema for a table
   * @param {string} tableName - Table name
   * @returns {Object|null} Schema definition
   */
  getSchema(tableName) {
    return this.schemas[tableName] || null;
  }

  /**
   * Add custom validation rule
   * @param {string} type - Data type
   * @param {string} ruleName - Rule name
   * @param {Function} ruleFunction - Validation function
   */
  addValidationRule(type, ruleName, ruleFunction) {
    if (!this.validationRules[type]) {
      this.validationRules[type] = {};
    }
    this.validationRules[type][ruleName] = ruleFunction;
  }
}

// Create singleton instance
const dataValidator = new DataValidator();

export default dataValidator;