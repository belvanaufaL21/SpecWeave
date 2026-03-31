/**
 * Error types for classification system
 */
export const ErrorType = {
  NETWORK: 'network',
  SERVER: 'server',
  VALIDATION: 'validation',
  AUTHENTICATION: 'auth',
  JIRA_INTEGRATION: 'jira',
  EXPORT: 'export',
  PERMISSION: 'permission',
  UNKNOWN: 'unknown'
}

/**
 * Error severity levels
 */
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
}

/**
 * Base error class for SpecWeave application
 */
export class SpecWeaveError extends Error {
  constructor(type, code, message, details = null, severity = ErrorSeverity.MEDIUM) {
    super(message)
    this.name = 'SpecWeaveError'
    this.type = type
    this.code = code
    this.details = details
    this.severity = severity
    this.timestamp = new Date()
    this.userId = null // Will be set by error handler
    this.context = null // Will be set by error handler
  }

  toJSON() {
    return {
      name: this.name,
      type: this.type,
      code: this.code,
      message: this.message,
      details: this.details,
      severity: this.severity,
      timestamp: this.timestamp,
      userId: this.userId,
      context: this.context,
      stack: this.stack
    }
  }
}

/**
 * Network-related errors
 */
export class NetworkError extends SpecWeaveError {
  constructor(code, message, details = null) {
    super(ErrorType.NETWORK, code, message, details, ErrorSeverity.HIGH)
    this.name = 'NetworkError'
  }
}

/**
 * Server-related errors
 */
export class ServerError extends SpecWeaveError {
  constructor(code, message, details = null) {
    super(ErrorType.SERVER, code, message, details, ErrorSeverity.HIGH)
    this.name = 'ServerError'
  }
}

/**
 * Validation-related errors
 */
export class ValidationError extends SpecWeaveError {
  constructor(code, message, details = null) {
    super(ErrorType.VALIDATION, code, message, details, ErrorSeverity.MEDIUM)
    this.name = 'ValidationError'
  }
}

/**
 * Authentication-related errors
 */
export class AuthenticationError extends SpecWeaveError {
  constructor(code, message, details = null) {
    super(ErrorType.AUTHENTICATION, code, message, details, ErrorSeverity.HIGH)
    this.name = 'AuthenticationError'
  }
}

/**
 * JIRA integration-related errors
 */
export class JiraIntegrationError extends SpecWeaveError {
  constructor(code, message, details = null) {
    super(ErrorType.JIRA_INTEGRATION, code, message, details, ErrorSeverity.MEDIUM)
    this.name = 'JiraIntegrationError'
  }
}

/**
 * Export-related errors
 */
export class ExportError extends SpecWeaveError {
  constructor(code, message, details = null) {
    super(ErrorType.EXPORT, code, message, details, ErrorSeverity.MEDIUM)
    this.name = 'ExportError'
  }
}

/**
 * Permission-related errors
 */
export class PermissionError extends SpecWeaveError {
  constructor(code, message, details = null) {
    super(ErrorType.PERMISSION, code, message, details, ErrorSeverity.HIGH)
    this.name = 'PermissionError'
  }
}