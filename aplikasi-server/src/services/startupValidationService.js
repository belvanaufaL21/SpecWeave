import oauthConfig from '../config/oauthConfig.js';
import oauthErrorHandlingService from './oauthErrorHandlingService.js';

/**
 * Startup Validation Service
 * Validates configuration and environment setup during application startup
 */
class StartupValidationService {
  constructor() {
    this.validationResults = {
      oauth: null,
      overall: null
    };
  }

  /**
   * Perform comprehensive startup validation
   * @returns {Object} Validation results
   */
  async validateStartup() {
    console.log('🔍 [STARTUP] Starting configuration validation...');
    
    const results = {
      success: true,
      errors: [],
      warnings: [],
      oauth: null,
      timestamp: new Date().toISOString()
    };

    // Validate OAuth configuration
    try {
      results.oauth = await this.validateOAuthConfiguration();
      if (!results.oauth.isValid) {
        results.success = false;
        results.errors.push(...results.oauth.errors);
      }
    } catch (error) {
      console.error('🔍 [STARTUP] OAuth validation failed:', error);
      results.success = false;
      results.errors.push({
        category: 'oauth',
        message: `OAuth validation failed: ${error.message}`,
        suggestion: 'Check OAuth configuration and environment variables'
      });
    }

    // Validate other critical configurations
    await this.validateCriticalEnvironment(results);

    // Store results for later reference
    this.validationResults.overall = results;
    this.validationResults.oauth = results.oauth;

    // Log results
    this.logValidationResults(results);

    return results;
  }

  /**
   * Validate OAuth configuration
   * @returns {Object} OAuth validation results
   */
  async validateOAuthConfiguration() {
    console.log('🔍 [STARTUP] Validating OAuth configuration...');
    
    const validation = oauthConfig.validateConfiguration();
    const availability = oauthConfig.isOAuthAvailable();
    
    const result = {
      isValid: validation.isValid,
      isAvailable: availability.available,
      errors: validation.errors,
      config: oauthConfig.getSanitizedConfig(),
      setupInstructions: validation.isValid ? null : oauthConfig.getSetupInstructions()
    };

    if (validation.isValid) {
      console.log('✅ [STARTUP] OAuth configuration is valid and ready');
      console.log('🔧 [STARTUP] OAuth config:', oauthConfig.getSanitizedConfig());
    } else {
      console.warn('⚠️ [STARTUP] OAuth configuration has issues:');
      validation.errors.forEach(error => {
        console.warn(`   - ${error.message}`);
        if (error.suggestion) {
          console.warn(`     Suggestion: ${error.suggestion}`);
        }
      });
    }

    return result;
  }

  /**
   * Validate other critical environment configurations
   * @param {Object} results - Results object to update
   */
  async validateCriticalEnvironment(results) {
    // Validate encryption key
    const encryptionKey = process.env.JIRA_ENCRYPTION_KEY;
    if (!encryptionKey || encryptionKey === 'default-key-change-in-production') {
      if (process.env.NODE_ENV === 'production') {
        results.errors.push({
          category: 'security',
          field: 'JIRA_ENCRYPTION_KEY',
          message: 'Default encryption key detected in production',
          suggestion: 'Set a strong JIRA_ENCRYPTION_KEY for production use'
        });
        results.success = false;
      } else {
        results.warnings.push({
          category: 'security',
          field: 'JIRA_ENCRYPTION_KEY',
          message: 'Using default encryption key in development',
          suggestion: 'Consider setting a custom JIRA_ENCRYPTION_KEY'
        });
      }
    }

    // Validate Supabase configuration
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      results.errors.push({
        category: 'database',
        message: 'Supabase configuration is incomplete',
        suggestion: 'Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables'
      });
      results.success = false;
    }

    // Validate port configuration
    const port = process.env.PORT || 5000;
    if (isNaN(port) || port < 1 || port > 65535) {
      results.errors.push({
        category: 'server',
        field: 'PORT',
        message: 'Invalid port configuration',
        suggestion: 'Set PORT to a valid number between 1 and 65535'
      });
      results.success = false;
    }
  }

  /**
   * Log validation results in a formatted way
   * @param {Object} results - Validation results
   */
  logValidationResults(results) {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 STARTUP VALIDATION RESULTS');
    console.log('='.repeat(60));
    
    if (results.success) {
      console.log('✅ Overall Status: PASSED');
    } else {
      console.log('❌ Overall Status: FAILED');
    }
    
    console.log(`📅 Timestamp: ${results.timestamp}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // OAuth status
    if (results.oauth) {
      console.log('\n📋 OAuth Configuration:');
      if (results.oauth.isValid) {
        console.log('   ✅ Valid and ready for use');
        console.log(`   🔧 Client ID: ${results.oauth.config.clientId}`);
        console.log(`   🔗 Callback URL: ${results.oauth.config.callbackUrl}`);
        console.log(`   🎯 Scopes: ${results.oauth.config.scopes.join(', ')}`);
      } else {
        console.log('   ❌ Configuration issues detected');
        console.log('   💡 OAuth will fall back to manual API token setup');
        
        // Show user-friendly setup guidance
        const configError = oauthErrorHandlingService.handleConfigurationError();
        if (configError && configError.adminAction) {
          console.log(`   🔧 Admin Action: ${configError.adminAction}`);
        }
        if (configError && configError.setupInstructions) {
          console.log('   📖 Setup instructions available for administrators');
        }
      }
    }
    
    // Errors
    if (results.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      results.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. [${error.category?.toUpperCase() || 'GENERAL'}] ${error.message}`);
        if (error.suggestion) {
          console.log(`      💡 ${error.suggestion}`);
        }
      });
    }
    
    // Warnings
    if (results.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      results.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. [${warning.category?.toUpperCase() || 'GENERAL'}] ${warning.message}`);
        if (warning.suggestion) {
          console.log(`      💡 ${warning.suggestion}`);
        }
      });
    }
    
    // User-friendly summary
    console.log('\n📝 SUMMARY:');
    if (results.success) {
      console.log('   🎉 All systems ready! OAuth and manual setup both available.');
    } else {
      console.log('   ⚠️  Some issues detected, but the application will still work.');
      console.log('   🔄 OAuth will fall back to manual API token setup.');
      console.log('   👨‍💼 Administrators can resolve OAuth issues using setup instructions.');
    }
    
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Get current validation results
   * @returns {Object} Current validation results
   */
  getValidationResults() {
    return this.validationResults;
  }

  /**
   * Check if OAuth is ready for use
   * @returns {boolean} True if OAuth is properly configured
   */
  isOAuthReady() {
    return this.validationResults.oauth?.isValid || false;
  }

  /**
   * Get OAuth setup instructions if configuration is invalid
   * @returns {Object|null} Setup instructions or null if OAuth is valid
   */
  getOAuthSetupInstructions() {
    if (this.isOAuthReady()) {
      return null;
    }
    
    return this.validationResults.oauth?.setupInstructions || oauthConfig.getSetupInstructions();
  }

  /**
   * Validate configuration on demand (for runtime checks)
   * @returns {Object} Current configuration status
   */
  async validateOnDemand() {
    const oauthValidation = oauthConfig.validateConfiguration();
    const oauthAvailability = oauthConfig.isOAuthAvailable();
    
    return {
      timestamp: new Date().toISOString(),
      oauth: {
        isValid: oauthValidation.isValid,
        isAvailable: oauthAvailability.available,
        errors: oauthValidation.errors,
        reason: oauthAvailability.reason
      },
      environment: process.env.NODE_ENV || 'development'
    };
  }
}

// Create singleton instance
const startupValidationService = new StartupValidationService();

export default startupValidationService;