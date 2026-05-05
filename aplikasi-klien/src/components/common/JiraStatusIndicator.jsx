import { useState, useEffect } from 'react';
import { useJira } from '../../contexts/JiraContext';
import JiraProjectManagementModal from '../modals/JiraProjectManagementModal';

/**
 * Helper konsisten dengan JiraProjectManagementModal.
 * Penting: kedua komponen HARUS menghasilkan chatId yang sama agar
 * `activeProjectsPerChat[chatId]` yang disimpan modal dapat dibaca indicator.
 */
const getCurrentChatId = () => {
  const currentPath = window.location.pathname;
  const pathSegments = currentPath.split('/').filter(Boolean);

  if (currentPath.includes('/chat')) {
    const chatId = pathSegments[pathSegments.length - 1];
    return chatId && chatId !== 'chat' ? chatId : 'default-chat';
  }
  if (currentPath.includes('/dashboard')) {
    return 'dashboard-default';
  }
  return 'default-chat';
};

const JiraStatusIndicator = ({ onSetupJira, compact = false }) => {
  const {
    hasConnection,
    isLoading,
    connections,
    openJiraSetupModal
  } = useJira();

  const [showManagementModal, setShowManagementModal] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [, setForceUpdate] = useState(0);

  // Monitor connection errors and handle them silently
  useEffect(() => {
    const handleConnectionError = () => {
      setConnectionError(true);
      // Reset error after 2 seconds (reduced from 5)
      setTimeout(() => setConnectionError(false), 2000);
    };

    // Listen for network errors
    window.addEventListener('unhandledrejection', handleConnectionError);

    return () => {
      window.removeEventListener('unhandledrejection', handleConnectionError);
    };
  }, []);

  // Listen for active project changes
  useEffect(() => {
    const handleActiveProjectChange = (event) => {
      console.log('🔔 [JIRA-INDICATOR] Active project change detected:', event.detail);
      setForceUpdate(prev => prev + 1);

      // Force refresh connections dari JiraContext
      if (window.jiraContext && window.jiraContext.refreshConnections) {
        window.jiraContext.refreshConnections(true);
      }
    };

    const handleStorageChange = (event) => {
      // Listen for activeProjectsPerChat changes
      if (event.key === 'activeProjectsPerChat' || event.key?.includes('specweave_active_project')) {
        console.log('🔔 [JIRA-INDICATOR] Storage change detected:', event.key);
        setForceUpdate(prev => prev + 1);
      }
    };

    // Listen for storage changes (active project updates)
    window.addEventListener('storage', handleStorageChange);

    // Listen for custom events from project management modal
    window.addEventListener('activeProjectChanged', handleActiveProjectChange);
    window.addEventListener('activeProjectUpdated', handleActiveProjectChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('activeProjectChanged', handleActiveProjectChange);
      window.removeEventListener('activeProjectUpdated', handleActiveProjectChange);
    };
  }, []);

  // Get active connection with per-chat support
  const activeConnection = (() => {
    try {
      if (!connections || !Array.isArray(connections) || connections.length === 0) {
        return null;
      }

      const chatId = getCurrentChatId();
      const activeProjects = JSON.parse(localStorage.getItem('activeProjectsPerChat') || '{}');
      const activeProjectId = activeProjects[chatId];

      // Find active project for this chat
      if (activeProjectId) {
        const activeForChat = connections.find(conn =>
          conn &&
          typeof conn === 'object' &&
          conn.id === activeProjectId
        );

        if (activeForChat) return activeForChat;
      }

      // Fallback to globally active connection
      const globalActive = connections.find(conn =>
        conn &&
        typeof conn === 'object' &&
        conn.is_active === true
      );

      if (globalActive) return globalActive;

      // Fallback to first valid connection
      const firstValid = connections.find(conn =>
        conn &&
        typeof conn === 'object' &&
        conn.project_key &&
        conn.jira_url
      );

      return firstValid || null;
    } catch (error) {
      // Silently handle errors
      return null;
    }
  })();

  const handleClick = () => {
    try {
      if (!hasConnection || connectionError) {
        if (onSetupJira) {
          onSetupJira();
        } else {
          openJiraSetupModal();
        }
      } else {
        // Open management modal
        setShowManagementModal(true);
      }
    } catch (error) {
      // Silently handle errors and fallback to setup
      if (onSetupJira) {
        onSetupJira();
      } else {
        openJiraSetupModal();
      }
    }
  };

  const handleAddNewProject = () => {
    try {
      setShowManagementModal(false);
      if (onSetupJira) {
        onSetupJira();
      } else {
        openJiraSetupModal();
      }
    } catch (error) {
      // Silently handle error
    }
  };

  // INSTANT UI FEEDBACK - Show content immediately, load in background
  if (isLoading && !hasConnection) {
    // Only show loading for initial setup, not for existing connections
    return (
      <div className={`flex items-center gap-2 bg-gray-500/10 border border-gray-500/20 rounded-lg ${compact ? 'px-2 py-1' : 'px-3 py-1.5'}`}>
        <div className="w-3 h-3 border border-gray-400/30 border-t-gray-400 rounded-full animate-spin"></div>
        <div className="flex-1 min-w-0">
          <div className="text-gray-400 text-xs">Connecting...</div>
        </div>
      </div>
    );
  }

  // Get status config with per-chat active project support
  const getStatusConfig = () => {
    try {
      if (!hasConnection || !activeConnection || connectionError) {
        return {
          color: 'red',
          text: 'Setup JIRA',
          subtitle: connectionError ? 'Koneksi Error' : 'Belum terhubung',
          icon: (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          )
        };
      }

      const projectName = (activeConnection?.project_name)
        ? activeConnection.project_name
        : (activeConnection.project_key && typeof activeConnection.project_key === 'string')
          ? activeConnection.project_key
          : 'Unknown';

      const jiraUrl = (activeConnection.jira_url && typeof activeConnection.jira_url === 'string')
        ? activeConnection.jira_url
        : '';

      const domain = jiraUrl
        ? jiraUrl.replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0]
        : 'Unknown';

      // Check if we have multiple connections to show count
      const totalConnections = connections?.length || 0;
      const subtitle = totalConnections > 1
        ? `Aktif (${totalConnections} total)`
        : (domain !== 'Unknown' ? domain : 'Terhubung');

      return {
        color: 'green',
        text: projectName,
        subtitle: subtitle,
        icon: (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        )
      };
    } catch (error) {
      // Return safe fallback
      return {
        color: 'red',
        text: 'Setup JIRA',
        subtitle: 'Setup Diperlukan',
        icon: (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          )
      };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className={`
          flex items-center gap-2 rounded-lg text-xs font-medium transition-all duration-200 border w-full
          ${compact ? 'px-2 py-1 justify-start' : 'px-3 py-1.5'}
          ${statusConfig.color === 'red'
            ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
            : 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
          }
        `}
        title={
          !hasConnection || connectionError
            ? 'Setup integrasi JIRA'
            : `Terhubung ke ${statusConfig.text} (${statusConfig.subtitle}). Klik untuk kelola koneksi.`
        }
      >
        {statusConfig.icon}
        <div className={`flex-1 min-w-0 ${compact ? 'max-w-[120px]' : 'max-w-[100px]'}`}>
          <div className="truncate font-medium">{statusConfig.text}</div>
          {statusConfig.subtitle && statusConfig.subtitle !== 'Unknown' && (
            <div className="truncate text-[10px] opacity-70">{statusConfig.subtitle}</div>
          )}
        </div>
      </button>

      {/* Project Management Modal */}
      {showManagementModal && (
        <JiraProjectManagementModal
          isOpen={showManagementModal}
          onClose={() => setShowManagementModal(false)}
          onAddNewProject={handleAddNewProject}
        />
      )}
    </div>
  );
};

export default JiraStatusIndicator;