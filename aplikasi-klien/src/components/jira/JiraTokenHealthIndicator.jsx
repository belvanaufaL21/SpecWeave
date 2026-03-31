import React, { useState, useEffect } from 'react';
import { jiraService } from '../../services/jiraService';

/**
 * JIRA Token Health Indicator Component
 * Shows the health status of JIRA API tokens with visual indicators
 */
const JiraTokenHealthIndicator = ({ connectionId, connection, onTokenExpired }) => {
  const [healthStatus, setHealthStatus] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  // Check token health on mount and when connectionId changes
  useEffect(() => {
    if (connectionId) {
      checkTokenHealth();
    }
  }, [connectionId]);

  // Listen for token expiration events
  useEffect(() => {
    const handleTokenExpired = (event) => {
      if (event.detail.connectionId === connectionId) {
        setHealthStatus({
          status: 'expired',
          message: 'API token has expired',
          needsRenewal: true
        });
        if (onTokenExpired) {
          onTokenExpired(connectionId, event.detail.health);
        }
      }
    };

    const handleTokenLimitedPermissions = (event) => {
      if (event.detail.connectionId === connectionId) {
        setHealthStatus({
          status: 'limited_permissions',
          message: 'API token has limited permissions',
          needsRenewal: false
        });
      }
    };

    window.addEventListener('jiraTokenExpired', handleTokenExpired);
    window.addEventListener('jiraTokenLimitedPermissions', handleTokenLimitedPermissions);

    return () => {
      window.removeEventListener('jiraTokenExpired', handleTokenExpired);
      window.removeEventListener('jiraTokenLimitedPermissions', handleTokenLimitedPermissions);
    };
  }, [connectionId, onTokenExpired]);

  const checkTokenHealth = async () => {
    if (!connectionId || isChecking) return;

    setIsChecking(true);
    try {
      const result = await jiraService.checkTokenHealth(connectionId);
      setHealthStatus(result.data || result);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Failed to check token health:', error);
      setHealthStatus({
        status: 'error',
        message: 'Failed to check token health',
        needsRenewal: false
      });
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'expired':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'limited_permissions':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'expired':
        return '⚠️';
      case 'limited_permissions':
        return '⚡';
      case 'error':
        return '❌';
      default:
        return '❓';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'healthy':
        return 'Token Active';
      case 'expired':
        return 'Token Expired';
      case 'limited_permissions':
        return 'Limited Access';
      case 'error':
        return 'Check Failed';
      default:
        return 'Unknown';
    }
  };

  const handleUpdateToken = () => {
    // Dispatch event to open connection update modal
    window.dispatchEvent(new CustomEvent('openJiraConnectionUpdate', {
      detail: {
        connectionId,
        reason: 'token_expired'
      }
    }));
  };

  if (!connectionId) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2">
      {/* Health Status Indicator */}
      <div className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${
        healthStatus ? getStatusColor(healthStatus.status) : 'text-gray-600 bg-gray-50 border-gray-200'
      }`}>
        <span className="mr-1">
          {isChecking ? '⏳' : getStatusIcon(healthStatus?.status)}
        </span>
        <span>
          {isChecking ? 'Checking...' : getStatusText(healthStatus?.status)}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-1">
        {/* Refresh Button */}
        <button
          onClick={checkTokenHealth}
          disabled={isChecking}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          title="Check token health"
        >
          <svg className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        {/* Update Token Button (shown when expired) */}
        {healthStatus?.needsRenewal && (
          <button
            onClick={handleUpdateToken}
            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            title="Update API token"
          >
            Update Token
          </button>
        )}
      </div>

      {/* Tooltip with detailed info */}
      {healthStatus && (
        <div className="relative group">
          <div className="w-4 h-4 text-gray-400 cursor-help">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          {/* Tooltip Content */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            <div className="font-medium">{healthStatus.message}</div>
            {lastChecked && (
              <div className="text-gray-300 mt-1">
                Last checked: {lastChecked.toLocaleTimeString()}
              </div>
            )}
            {healthStatus.userInfo && (
              <div className="text-gray-300 mt-1">
                User: {healthStatus.userInfo.displayName}
              </div>
            )}
            
            {/* Tooltip Arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JiraTokenHealthIndicator;