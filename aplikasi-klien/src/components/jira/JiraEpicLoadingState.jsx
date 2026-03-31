import React, { useState, useEffect } from 'react';
import { jiraService } from '../../services/jiraService';

/**
 * JIRA Epic Loading State Component
 * Shows loading state and helpful error messages when epics fail to load
 */
const JiraEpicLoadingState = ({ 
  connectionId, 
  projectKey, 
  isLoading, 
  error, 
  epics = [], 
  onRetry,
  connection 
}) => {
  const [tokenHealth, setTokenHealth] = useState(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  // Check token health when there's an error
  useEffect(() => {
    if (error && connectionId && !isCheckingHealth) {
      checkTokenHealth();
    }
  }, [error, connectionId]);

  const checkTokenHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const result = await jiraService.checkTokenHealth(connectionId);
      setTokenHealth(result.data || result);
    } catch (healthError) {
      console.error('Failed to check token health:', healthError);
      setTokenHealth({
        status: 'error',
        message: 'Could not check token health'
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleUpdateToken = () => {
    window.dispatchEvent(new CustomEvent('openJiraConnectionUpdate', {
      detail: {
        connectionId,
        reason: 'token_expired'
      }
    }));
  };

  const handleTestConnection = async () => {
    try {
      // Test the connection
      const testResult = await jiraService.testConnection({ connectionId });
      if (testResult.success) {
        if (window.toast) {
          window.toast.success('Connection test successful');
        }
        if (onRetry) onRetry();
      } else {
        if (window.toast) {
          window.toast.error(`Connection test failed: ${testResult.error}`);
        }
      }
    } catch (testError) {
      if (window.toast) {
        window.toast.error(`Connection test failed: ${testError.message}`);
      }
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Loading epics from JIRA...</span>
        </div>
      </div>
    );
  }

  // Success state with no epics
  if (!error && epics.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4">
          <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Epics Found</h3>
        <p className="text-gray-600 mb-4">
          Project "{projectKey}" doesn't have any Epic issues, or they may not be visible with your current permissions.
        </p>
        <div className="space-y-2 text-sm text-gray-500">
          <p>• Check if Epic issues exist in your JIRA project</p>
          <p>• Verify your account has permission to view Epics</p>
          <p>• Ensure the project key "{projectKey}" is correct</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry Loading Epics
          </button>
        )}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800 mb-2">
              Failed to Load Epics
            </h3>
            
            <p className="text-sm text-red-700 mb-3">
              {error}
            </p>

            {/* Token Health Status */}
            {tokenHealth && (
              <div className="bg-red-100 rounded-md p-3 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-red-800">
                    Token Status: {tokenHealth.status}
                  </span>
                  {isCheckingHealth && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                  )}
                </div>
                
                <p className="text-sm text-red-700 mb-2">
                  {tokenHealth.message}
                </p>

                {tokenHealth.needsRenewal && (
                  <button
                    onClick={handleUpdateToken}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                  >
                    Update API Token
                  </button>
                )}
              </div>
            )}

            {/* Troubleshooting Steps */}
            <div className="bg-red-100 rounded-md p-3 mb-4">
              <h4 className="text-sm font-medium text-red-800 mb-2">Troubleshooting Steps:</h4>
              <ol className="list-decimal list-inside text-sm text-red-700 space-y-1">
                <li>Check if your JIRA API token is still valid</li>
                <li>Verify you have access to project "{projectKey}"</li>
                <li>Ensure Epic issues exist in the project</li>
                <li>Check your JIRA permissions for viewing Epics</li>
                <li>Try refreshing your JIRA connection</li>
              </ol>
            </div>

            {/* Connection Info */}
            {connection && (
              <div className="bg-red-100 rounded-md p-3 mb-4">
                <h4 className="text-sm font-medium text-red-800 mb-2">Connection Details:</h4>
                <div className="text-sm text-red-700 space-y-1">
                  <p><strong>JIRA URL:</strong> {connection.jira_url}</p>
                  <p><strong>Project:</strong> {connection.project_key}</p>
                  <p><strong>Email:</strong> {connection.email}</p>
                  {connection.custom_fields?.project_info && (
                    <p><strong>Project Name:</strong> {connection.custom_fields.project_info.name}</p>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  Retry Loading
                </button>
              )}
              
              <button
                onClick={handleTestConnection}
                className="bg-white text-red-600 border border-red-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-50 transition-colors"
              >
                Test Connection
              </button>

              {!tokenHealth && (
                <button
                  onClick={checkTokenHealth}
                  disabled={isCheckingHealth}
                  className="bg-white text-red-600 border border-red-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {isCheckingHealth ? 'Checking...' : 'Check Token'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state with epics - don't render anything
  return null;
};

export default JiraEpicLoadingState;