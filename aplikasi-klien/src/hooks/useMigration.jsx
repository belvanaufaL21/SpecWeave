import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LocalStorageMigration from '../utils/migrations/localStorageMigration';

/**
 * Hook untuk menangani migration data dari localStorage ke database
 * Akan otomatis berjalan saat user login dan ada data yang perlu dimigrate
 */
export const useMigration = () => {
  const { user } = useAuth();
  const [migrationState, setMigrationState] = useState({
    isRunning: false,
    isCompleted: false,
    needsMigration: false,
    results: null,
    error: null
  });

  useEffect(() => {
    if (user) {
      checkAndRunMigration();
    }
  }, [user]);

  const checkAndRunMigration = async () => {
    try {
      // Check migration status
      const status = LocalStorageMigration.getMigrationStatus();
      
      setMigrationState(prev => ({
        ...prev,
        needsMigration: status.needsMigration,
        isCompleted: status.isCompleted
      }));

      // If migration is needed and not completed, run it
      if (status.canMigrate) {
        
        setMigrationState(prev => ({
          ...prev,
          isRunning: true,
          error: null
        }));

        const result = await LocalStorageMigration.runMigration();

        if (result.success) {
          setMigrationState(prev => ({
            ...prev,
            isRunning: false,
            isCompleted: true,
            results: result.results || result,
            error: null
          }));

          // Show success notification
          
          // Optional: Show user notification
          if (result.totalMigrated > 0) {
            showMigrationSuccessNotification(result.totalMigrated);
          }

        } else {
          setMigrationState(prev => ({
            ...prev,
            isRunning: false,
            error: result.error
          }));

          console.error('❌ [MIGRATION-HOOK] Migration failed:', result.error);
        }
      }

    } catch (error) {
      console.error('❌ [MIGRATION-HOOK] Migration check failed:', error);
      
      setMigrationState(prev => ({
        ...prev,
        isRunning: false,
        error: error.message
      }));
    }
  };

  const showMigrationSuccessNotification = (totalMigrated) => {
    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
    notification.innerHTML = `
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <div>
          <div class="font-medium">Data Migration Completed!</div>
          <div class="text-sm opacity-90">${totalMigrated} items migrated. Your data will now sync across browsers.</div>
        </div>
      </div>
    `;

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 5000);
  };

  const runMigrationManually = async () => {
    try {
      setMigrationState(prev => ({
        ...prev,
        isRunning: true,
        error: null
      }));

      const result = await LocalStorageMigration.runMigration();

      if (result.success) {
        setMigrationState(prev => ({
          ...prev,
          isRunning: false,
          isCompleted: true,
          results: result.results || result,
          error: null
        }));

        return { success: true, results: result };
      } else {
        setMigrationState(prev => ({
          ...prev,
          isRunning: false,
          error: result.error
        }));

        return { success: false, error: result.error };
      }

    } catch (error) {
      setMigrationState(prev => ({
        ...prev,
        isRunning: false,
        error: error.message
      }));

      return { success: false, error: error.message };
    }
  };

  const getMigrationStatus = () => {
    return LocalStorageMigration.getMigrationStatus();
  };

  const restoreFromBackup = () => {
    return LocalStorageMigration.restoreFromBackup();
  };

  const cleanupOldData = () => {
    LocalStorageMigration.cleanupOldLocalStorageData();
    
    setMigrationState(prev => ({
      ...prev,
      needsMigration: false
    }));
  };

  return {
    migrationState,
    runMigrationManually,
    getMigrationStatus,
    restoreFromBackup,
    cleanupOldData,
    
    // Computed properties for easier use
    isRunning: migrationState.isRunning,
    isCompleted: migrationState.isCompleted,
    needsMigration: migrationState.needsMigration,
    error: migrationState.error,
    results: migrationState.results
  };
};