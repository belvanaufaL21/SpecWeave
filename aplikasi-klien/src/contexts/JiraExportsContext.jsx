import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import UserDataService from '../services/UserDataService';

const JiraExportsContext = createContext();

export const useJiraExports = () => {
  const context = useContext(JiraExportsContext);
  if (!context) {
    throw new Error('useJiraExports must be used within a JiraExportsProvider');
  }
  return context;
};

export const JiraExportsProvider = ({ children }) => {
  const [exports, setExports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    successful: 0,
    failed: 0,
    timeout: 0,
    totalScenarios: 0,
    lastExport: null
  });

  // Load exports from database on mount
  useEffect(() => {
    loadExportsFromDatabase();
  }, []);

  const loadExportsFromDatabase = async (chatId = null) => {
    try {
      setLoading(true);
      
      const result = await UserDataService.getJiraExports(chatId);
      
      if (result.success) {
        setExports(result.data);
        
        // Load stats
        const statsResult = await UserDataService.getJiraExportStats(chatId);
        if (statsResult.success) {
          setStats(statsResult.data);
        }
      } else {
        console.error('❌ [JIRA-EXPORTS] Failed to load exports:', result.error);
      }
    } catch (error) {
      console.error('❌ [JIRA-EXPORTS] Error loading exports:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add new export (called after successful export)
  const addExport = useCallback(async (chatId, exportData, jiraResult, status = 'success', errorMessage = null) => {
    try {
      
      const result = await UserDataService.saveJiraExport(chatId, exportData, jiraResult, status, errorMessage);
      
      if (result.success) {
        
        // Refresh exports list
        await loadExportsFromDatabase();
        
        return result;
      } else {
        console.error('❌ [JIRA-EXPORTS] Failed to save export:', result.error);
        return result;
      }
    } catch (error) {
      console.error('❌ [JIRA-EXPORTS] Error adding export:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Update export status
  const updateExportStatus = useCallback(async (exportId, status, errorMessage = null) => {
    try {
      
      const result = await UserDataService.updateJiraExportStatus(exportId, status, errorMessage);
      
      if (result.success) {
        
        // Refresh exports list
        await loadExportsFromDatabase();
        
        return result;
      } else {
        console.error('❌ [JIRA-EXPORTS] Failed to update export status:', result.error);
        return result;
      }
    } catch (error) {
      console.error('❌ [JIRA-EXPORTS] Error updating export status:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Delete export
  const deleteExport = useCallback(async (exportId) => {
    try {
      console.log('🗑️ [JIRA-EXPORTS] Deleting export...');
      
      const result = await UserDataService.deleteJiraExport(exportId);
      
      if (result.success) {
        
        // Refresh exports list
        await loadExportsFromDatabase();
        
        return result;
      } else {
        console.error('❌ [JIRA-EXPORTS] Failed to delete export:', result.error);
        return result;
      }
    } catch (error) {
      console.error('❌ [JIRA-EXPORTS] Error deleting export:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Get exports for specific chat
  const getExportsForChat = useCallback((chatId) => {
    return exports.filter(exp => exp.chat_id === chatId);
  }, [exports]);

  // Get recent exports
  const getRecentExports = useCallback((limit = 10) => {
    return exports.slice(0, limit);
  }, [exports]);

  // Get successful exports
  const getSuccessfulExports = useCallback(() => {
    return exports.filter(exp => exp.export_status === 'success');
  }, [exports]);

  // Get failed exports
  const getFailedExports = useCallback(() => {
    return exports.filter(exp => exp.export_status === 'failed');
  }, [exports]);

  const value = {
    exports,
    loading,
    stats,
    addExport,
    updateExportStatus,
    deleteExport,
    loadExportsFromDatabase,
    getExportsForChat,
    getRecentExports,
    getSuccessfulExports,
    getFailedExports
  };

  return (
    <JiraExportsContext.Provider value={value}>
      {children}
    </JiraExportsContext.Provider>
  );
};

export default JiraExportsProvider;