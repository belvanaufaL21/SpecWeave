/**
 * Clean Logging Configuration
 * Provides clean, minimal console output for better UX
 */

import logger from './logging.js';

class CleanLogger {
  constructor() {
    this.isProduction = import.meta.env.MODE === 'production';
    this.enableStartupMessage = import.meta.env.VITE_ENABLE_STARTUP_MESSAGE !== 'false';
    this.throttleTimers = new Map();
  }

  /**
   * Display clean startup message
   */
  startup() {
    if (!this.enableStartupMessage || this.isProduction) return;
    
    console.log('%c🚀 SpecWeave', 'color: #4F46E5; font-size: 16px; font-weight: bold;');
    console.log('%cApplication starting...', 'color: #6B7280; font-size: 12px;');
  }

  /**
   * Log info message
   */
  info(component, message, data = null) {
    logger.info(component, message, data);
  }

  /**
   * Log warning message
   */
  warn(component, message, data = null) {
    logger.warn(component, message, data);
  }

  /**
   * Log error message
   */
  error(component, message, data = null) {
    logger.error(component, message, data);
  }

  /**
   * Log debug message
   */
  debug(component, message, data = null) {
    logger.debug(component, message, data);
  }

  /**
   * Log critical error (always shown)
   */
  critical(component, message, data = null) {
    logger.critical(component, message, data);
  }

  /**
   * Log chat operation
   */
  chatOperation(message, data = null) {
    logger.debug('CHAT', message, data);
  }

  /**
   * Throttled debug logging to prevent spam
   */
  debugThrottled(component, message, data = null, throttleKey = null, throttleMs = 1000) {
    const key = throttleKey || `${component}-${message}`;
    const now = Date.now();
    const lastLog = this.throttleTimers.get(key);

    if (!lastLog || (now - lastLog) >= throttleMs) {
      this.throttleTimers.set(key, now);
      logger.debug(component, message, data);
    }
  }

  /**
   * JIRA-specific logging methods
   */
  jiraTestConnection() {
    logger.debug('JIRA', 'Testing JIRA connection...');
  }

  jiraConnectionSuccess() {
    logger.info('JIRA', 'JIRA connection test successful');
  }

  jiraConnectionFailed(error) {
    logger.error('JIRA', 'JIRA connection test failed', { error });
  }

  jiraEpicSelected(epicName) {
    logger.info('JIRA', `Epic selected: ${epicName}`);
  }

  /**
   * Generation logging methods
   */
  generationStart() {
    logger.debug('GENERATION', 'Starting scenario generation...');
  }

  generationSuccess() {
    logger.info('GENERATION', 'Scenario generation successful');
  }

  generationFailed(error) {
    logger.error('GENERATION', 'Scenario generation failed', { error });
  }

  /**
   * Export logging methods
   */
  exportStart(destination = 'JIRA') {
    logger.debug('EXPORT', `Starting export to ${destination}...`);
  }

  exportSuccess(destination = 'JIRA', data = null) {
    logger.info('EXPORT', `Export to ${destination} successful`, data);
  }

  exportFailed(destination = 'JIRA', error) {
    logger.error('EXPORT', `Export to ${destination} failed`, { error });
  }

  /**
   * Evaluation logging methods
   */
  evaluationStart() {
    logger.debug('EVALUATION', 'Starting evaluation...');
  }

  evaluationSuccess() {
    logger.info('EVALUATION', 'Evaluation successful');
  }

  evaluationFailed(error) {
    logger.error('EVALUATION', 'Evaluation failed', { error });
  }

  /**
   * JIRA operation logging
   */
  jiraOperation(message, data = null) {
    logger.debug('JIRA', message, data);
  }
}

const cleanLogger = new CleanLogger();

export default cleanLogger;
