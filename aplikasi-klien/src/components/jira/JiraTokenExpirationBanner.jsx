import React, { useState, useEffect } from 'react';
import { jiraService } from '../../services/jiraService';

/**
 * JIRA Token Expiration Banner Component
 * Shows a prominent banner when JIRA tokens are expired or about to expire
 */
const JiraTokenExpirationBanner = ({ connections = [] }) => {
  const [expiredTokens, setExpiredTokens] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check for expired tokens on mount
    checkExpiredTokens();

    // Listen for token expiration events
    const handleTokenExpired = (event) => {
      const { connectionId } = event.detail;
      const connection = connections.find(conn => conn.id === connectionId);
      
      if (connection && !expiredTokens.find(token => token.connectionId === connectionId)) {
        setExpiredTokens(prev => [...prev, {
          connectionId,
          connectionName: connection.custom_fields?.project_info?.name || connection.project_key,
          expiredAt: new Date()
        }]);
        setIsVisible(true);
        setIsDismissed(false);
      }
    };

    const handleTokenLimitedPermissions = (event) => {
      // Could also handle limited permissions here if needed
      console.log('Token has limited permissions:', event.detail);
    };

    window.addEventListener('jiraTokenExpired', handleTokenExpired);
    window.addEventListener('jiraTokenLimitedPermissions', handleTokenLimitedPermissions);

    return () => {
      window.removeEventListener('jiraTokenExpired', handleTokenExpired);
      window.removeEventListener('jiraTokenLimitedPermissions', handleTokenLimitedPermissions);
    };
  }, [connections, expiredTokens]);

  const checkExpiredTokens = () => {
    const expired = connections.filter(connection => 
      jiraService.isTokenExpired(connection.id)
    ).map(connection => ({
      connectionId: connection.id,
      connectionName: connection.custom_fields?.project_info?.name || connection.project_key,
      expiredAt: new Date() // Approximate
    }));

    if (expired.length > 0) {
      setExpiredTokens(expired);
      setIsVisible(true);
    }
  };

  const handleUpdateToken = (connectionId) => {
    // Dispatch event to open connection update modal
    window.dispatchEvent(new CustomEvent('openJiraConnectionUpdate', {
      detail: {
        connectionId,
        reason: 'token_expired'
      }
    }));
  };

  const handleUpdateAllTokens = () => {
    // Open a modal to update all expired tokens
    window.dispatchEvent(new CustomEvent('openJiraConnectionsManager', {
      detail: {
        filter: 'expired',
        reason: 'bulk_token_update'
      }
    }));
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
    
    // Store dismissal in localStorage with timestamp
    localStorage.setItem('jira_token_banner_dismissed', JSON.stringify({
      dismissed: true,
      timestamp: Date.now(),
      expiredTokens: expiredTokens.map(token => token.connectionId)
    }));
  };

  const handleRemoveToken = (connectionId) => {
    setExpiredTokens(prev => prev.filter(token => token.connectionId !== connectionId));
    jiraService.clearTokenExpiration(connectionId);
    
    // Hide banner if no more expired tokens
    if (expiredTokens.length <= 1) {
      setIsVisible(false);
    }
  };

  // Don't show if dismissed or no expired tokens
  if (!isVisible || isDismissed || expiredTokens.length === 0) {
    return null;
  }

  return (
    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">
            JIRA API Token{expiredTokens.length > 1 ? 's' : ''} Expired
          </h3>
          
          <div className="mt-2 text-sm text-red-700">
            <p className="mb-2">
              {expiredTokens.length === 1 
                ? `Your JIRA API token for "${expiredTokens[0].connectionName}" has expired.`
                : `${expiredTokens.length} JIRA API tokens have expired.`
              } You'll need to update {expiredTokens.length === 1 ? 'it' : 'them'} to continue using JIRA integration.
            </p>
            
            {/* List of expired connections */}
            {expiredTokens.length > 1 && (
              <ul className="list-disc list-inside mb-3 space-y-1">
                {expiredTokens.map((token) => (
                  <li key={token.connectionId} className="flex items-center justify-between">
                    <span>{token.connectionName}</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleUpdateToken(token.connectionId)}
                        className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition-colors"
                      >
                        Update
                      </button>
                      <button
                        onClick={() => handleRemoveToken(token.connectionId)}
                        className="text-xs text-red-600 hover:text-red-800 transition-colors"
                        title="Mark as resolved"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            
            {/* Instructions */}
            <div className="bg-red-100 rounded-md p-3 mt-3">
              <h4 className="text-sm font-medium text-red-800 mb-2">How to update your API token:</h4>
              <ol className="list-decimal list-inside text-sm text-red-700 space-y-1">
                <li>Go to your JIRA account settings</li>
                <li>Navigate to Security → API tokens</li>
                <li>Create a new API token</li>
                <li>Update your connection with the new token</li>
              </ol>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="mt-4 flex items-center space-x-3">
            {expiredTokens.length === 1 ? (
              <button
                onClick={() => handleUpdateToken(expiredTokens[0].connectionId)}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Update Token
              </button>
            ) : (
              <button
                onClick={handleUpdateAllTokens}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Update All Tokens
              </button>
            )}
            
            <button
              onClick={handleDismiss}
              className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
        
        {/* Close Button */}
        <div className="flex-shrink-0 ml-4">
          <button
            onClick={handleDismiss}
            className="text-red-400 hover:text-red-600 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default JiraTokenExpirationBanner;