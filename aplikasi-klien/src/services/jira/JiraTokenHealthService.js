import api from '../api.js';
import { 
  JIRA_TIMEOUTS, 
  JIRA_ENDPOINTS,
  JIRA_ERRORS 
} from '../../utils/constants/jiraServiceConstants';
import {
  withJiraTimeout,
  handleJiraError,
  handleJiraSuccess
} from '../../utils/helpers/jiraServiceHelpers';

import cleanLogger from '../../config/cleanLogging.js';

/**
 * JIRA Token Health Service - monitors API token health and expiration
 */
class JiraTokenHealthService {
  constructor() {
    this.healthCheckInterval = null;
    this.lastHealthCheck = new Map(); // connectionId -> timestamp
    this.tokenStatus = new Map(); // connectionId -> status
  }

  /**
   * Check token health for a specific connection
   * @param {string} connectionId - JIRA connection ID
   * @returns {Promise<Object>} Token health status
   */
  static async checkTokenHealth(connectionId) {
    try {
      const response = await withJiraTimeout(
        api.get(JIRA_ENDPOINTS.HEALTH_CHECK(connectionId), {
          headers: {
            'Cache-Control': 'no-cache',
            'X-Health-Check': 'true'
          }
        }),
        JIRA_TIMEOUTS.TEST_CONNECTION,
        'Check token health'
      );
      
      return handleJiraSuccess(response);
    } catch (error) {
      // Categorize token health errors
      if (error.status === 401) {
        return {
          success: false,
          error: 'API Token JIRA telah kedaluwarsa atau tidak valid',
          tokenStatus: 'expired',
          needsRenewal: true,
          suggestions: [
            'Buat API token baru dari pengaturan akun JIRA Anda',
            'Perbarui koneksi dengan token yang baru',
            'Pastikan akun JIRA Anda masih aktif'
          ]
        };
      } else if (error.status === 403) {
        return {
          success: false,
          error: 'API token memiliki izin yang terbatas',
          tokenStatus: 'limited_permissions',
          needsRenewal: false,
          suggestions: [
            'Hubungi administrator JIRA untuk izin tambahan',
            'Pastikan akun Anda memiliki akses ke project yang diperlukan',
            'Periksa apakah scope API token sudah mencukupi'
          ]
        };
      }
      
      return handleJiraError(error, 'Check token health');
    }
  }

  /**
   * Check health for all user connections
   * @returns {Promise<Object>} Health status for all connections
   */
  static async checkAllTokensHealth() {
    try {
      const response = await withJiraTimeout(
        api.get(JIRA_ENDPOINTS.HEALTH_CHECK_ALL, {
          headers: {
            'Cache-Control': 'no-cache',
            'X-Bulk-Health-Check': 'true'
          }
        }),
        JIRA_TIMEOUTS.CONNECTIONS,
        'Check all tokens health'
      );
      
      return handleJiraSuccess(response, {});
    } catch (error) {
      return handleJiraError(error, 'Check all tokens health');
    }
  }

  /**
   * Start periodic health monitoring
   * @param {number} intervalMinutes - Check interval in minutes (default: 30)
   */
  static startHealthMonitoring(intervalMinutes = 30) {
    // Clear existing interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Start new monitoring
    this.healthCheckInterval = setInterval(async () => {
      try {
        const healthResult = await this.checkAllTokensHealth();
        
        if (healthResult.success && healthResult.data) {
          // Check for expired or problematic tokens
          Object.entries(healthResult.data).forEach(([connectionId, health]) => {
            if (health.tokenStatus === 'expired' || health.needsRenewal) {
              this.notifyTokenExpiration(connectionId, health);
            } else if (health.tokenStatus === 'limited_permissions') {
              this.notifyLimitedPermissions(connectionId, health);
            }
          });
        }
      } catch (error) {
        cleanLogger.warn('JIRA_HEALTH', 'Health monitoring check failed', error);
      }
    }, intervalMinutes * 60 * 1000);

    // Silent success - no logging
  }

  /**
   * Stop health monitoring
   */
  static stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      cleanLogger.debug('JIRA_HEALTH', 'Token health monitoring stopped');
    }
  }

  /**
   * Notify user about token expiration
   * @param {string} connectionId - Connection ID
   * @param {Object} health - Health status
   */
  static notifyTokenExpiration(connectionId, health) {
    // Show toast notification
    if (window.toast) {
      window.toast.error('Token JIRA Kedaluwarsa', {
        description: `API Token koneksi JIRA Anda telah kedaluwarsa. Silakan perbarui pengaturan koneksi Anda.`,
        duration: 10000,
        action: {
          label: 'Perbarui Token',
          onClick: () => this.openTokenUpdateModal(connectionId)
        }
      });
    }

    // Dispatch custom event for components to handle
    window.dispatchEvent(new CustomEvent('jiraTokenExpired', {
      detail: {
        connectionId,
        health,
        timestamp: Date.now()
      }
    }));

    // Store expiration status
    localStorage.setItem(`jira_token_expired_${connectionId}`, JSON.stringify({
      expired: true,
      timestamp: Date.now(),
      health
    }));
  }

  /**
   * Notify user about limited permissions
   * @param {string} connectionId - Connection ID
   * @param {Object} health - Health status
   */
  static notifyLimitedPermissions(connectionId, health) {
    // Show warning notification
    if (window.toast) {
      window.toast.warning('Izin Token JIRA Terbatas', {
        description: `Token JIRA Anda memiliki izin terbatas. Beberapa fitur mungkin tidak berfungsi dengan baik.`,
        duration: 8000
      });
    }

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('jiraTokenLimitedPermissions', {
      detail: {
        connectionId,
        health,
        timestamp: Date.now()
      }
    }));
  }

  /**
   * Open token update modal
   * @param {string} connectionId - Connection ID
   */
  static openTokenUpdateModal(connectionId) {
    // Dispatch event to open connection update modal
    window.dispatchEvent(new CustomEvent('openJiraConnectionUpdate', {
      detail: {
        connectionId,
        reason: 'token_expired'
      }
    }));
  }

  /**
   * Check if token is expired for a connection
   * @param {string} connectionId - Connection ID
   * @returns {boolean} Whether token is expired
   */
  static isTokenExpired(connectionId) {
    try {
      const stored = localStorage.getItem(`jira_token_expired_${connectionId}`);
      if (stored) {
        const data = JSON.parse(stored);
        // Consider expired if marked within last 24 hours
        return data.expired && (Date.now() - data.timestamp) < 24 * 60 * 60 * 1000;
      }
    } catch (error) {
      console.warn('Error checking token expiration status:', error);
    }
    return false;
  }

  /**
   * Clear token expiration status
   * @param {string} connectionId - Connection ID
   */
  static clearTokenExpiration(connectionId) {
    localStorage.removeItem(`jira_token_expired_${connectionId}`);
  }

  /**
   * Get token health summary for UI display
   * @param {string} connectionId - Connection ID
   * @returns {Object} Health summary
   */
  static getTokenHealthSummary(connectionId) {
    const isExpired = this.isTokenExpired(connectionId);
    
    if (isExpired) {
      return {
        status: 'expired',
        message: 'API token telah kedaluwarsa',
        color: 'red',
        icon: '⚠️',
        action: 'Perbarui token'
      };
    }

    return {
      status: 'unknown',
      message: 'Status token tidak diketahui',
      color: 'gray',
      icon: '❓',
      action: 'Periksa kesehatan'
    };
  }
}

export default JiraTokenHealthService;