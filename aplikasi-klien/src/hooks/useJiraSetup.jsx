import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { jiraService } from '../services/jiraService';

export const useJiraSetup = () => {
  const { user, profile, isNewUser } = useAuth();
  const [jiraConnections, setJiraConnections] = useState([]);
  const [hasJiraConnection, setHasJiraConnection] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastFetchAttempt, setLastFetchAttempt] = useState(0);
  const [fetchError, setFetchError] = useState(null);

  // Check if this is user's first login
  useEffect(() => {
    if (user && profile) {
      // Check if user has dismissed JIRA setup before
      const hasSkippedSetup = localStorage.getItem(`jira_setup_skipped_${user.id}`);
      
      setIsFirstLogin(isNewUser && !hasSkippedSetup);
    }
  }, [user, profile, isNewUser]);

  // Load JIRA connections with circuit breaker
  useEffect(() => {
    let isMounted = true;
    
    const loadJiraConnections = async () => {
      if (!user) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      // Circuit breaker: don't retry if we just failed recently
      const now = Date.now();
      const timeSinceLastAttempt = now - lastFetchAttempt;
      const minRetryDelay = 30000; // 30 seconds

      if (fetchError && timeSinceLastAttempt < minRetryDelay) {
        console.log('JIRA connections: Skipping fetch due to recent error, will retry in', Math.ceil((minRetryDelay - timeSinceLastAttempt) / 1000), 'seconds');
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        if (isMounted) {
          setLoading(true);
          setLastFetchAttempt(now);
        }
        
        const result = await jiraService.getConnections();
        
        if (isMounted) {
          if (result.success) {
            const connections = result.data || [];
            setJiraConnections(connections);
            setHasJiraConnection(connections.length > 0);
            setFetchError(null); // Clear error on success
            console.log('JIRA connections loaded successfully:', connections.length);
          } else {
            // Handle API error gracefully - don't spam retries
            console.warn('Failed to load JIRA connections:', result.error);
            setJiraConnections([]);
            setHasJiraConnection(false);
            setFetchError(result.error);
          }
        }
      } catch (error) {
        // Handle network errors gracefully - don't retry automatically
        if (isMounted) {
          console.warn('Network error loading JIRA connections:', error.message);
          setJiraConnections([]);
          setHasJiraConnection(false);
          
          // Only set error if it's not a repeated error
          const errorKey = `jira_connection_error_${user?.id}`;
          const lastErrorTime = localStorage.getItem(errorKey);
          const now = Date.now();
          
          if (!lastErrorTime || (now - parseInt(lastErrorTime)) > 60000) { // 1 minute
            setFetchError(error.message);
            localStorage.setItem(errorKey, now.toString());
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadJiraConnections();
    
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Show setup modal for first-time users without JIRA connection
  useEffect(() => {
    if (!loading && isFirstLogin && !hasJiraConnection) {
      // Check if onboarding tips have been seen
      const hasSeenTips = user ? localStorage.getItem(`onboarding_tips_seen_${user.id}`) : true;
      
      if (hasSeenTips) {
        // Show modal immediately if tips already seen
        const timer = setTimeout(() => {
          setShowSetupModal(true);
        }, 1500);

        return () => clearTimeout(timer);
      } else {
        // Wait for onboarding tips to complete, then show modal
        const checkTipsComplete = setInterval(() => {
          const tipsCompleted = localStorage.getItem(`onboarding_tips_seen_${user.id}`);
          if (tipsCompleted) {
            clearInterval(checkTipsComplete);
            setTimeout(() => {
              setShowSetupModal(true);
            }, 1000);
          }
        }, 1000);

        return () => clearInterval(checkTipsComplete);
      }
    }
  }, [loading, isFirstLogin, hasJiraConnection, user]);

  const handleSetupComplete = (connectionData) => {
    setJiraConnections(prev => [...prev, connectionData]);
    setHasJiraConnection(true);
    setShowSetupModal(false);
    
    // Remove the first login flag
    setIsFirstLogin(false);
  };

  // Check for connection success on component mount
  useEffect(() => {
    const checkConnectionSuccess = () => {
      const successData = localStorage.getItem('jira_connection_success');
      if (successData) {
        try {
          const { connection, timestamp } = JSON.parse(successData);
          
          // Check if success is recent (within last 5 minutes)
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            handleSetupComplete(connection);
            
            // Show success notification
            console.log('JIRA connection successful:', connection);
          }
          
          // Clean up localStorage
          localStorage.removeItem('jira_connection_success');
        } catch (error) {
          console.error('Error processing connection success:', error);
          localStorage.removeItem('jira_connection_success');
        }
      }
    };

    checkConnectionSuccess();
  }, []);

  const handleSetupSkip = () => {
    setShowSetupModal(false);
    setIsFirstLogin(false);
    
    // Remember that user skipped setup
    if (user) {
      localStorage.setItem(`jira_setup_skipped_${user.id}`, 'true');
    }
  };

  const openSetupModal = () => {
    setShowSetupModal(true);
  };

  const closeSetupModal = () => {
    setShowSetupModal(false);
  };

  const retryLoadConnections = () => {
    setFetchError(null);
    setLastFetchAttempt(0);
    // This will trigger the useEffect to run again
  };

  return {
    jiraConnections,
    hasJiraConnection,
    isFirstLogin,
    showSetupModal,
    loading,
    fetchError,
    handleSetupComplete,
    handleSetupSkip,
    openSetupModal,
    closeSetupModal,
    retryLoadConnections
  };
};