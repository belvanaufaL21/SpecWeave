import UserDataService from '../../services/UserDataService.js';

/**
 * Migration utility untuk memindahkan data dari localStorage ke database
 * Ini akan memastikan data sync antar browser
 */
class LocalStorageMigration {
  
  /**
   * Check if migration is needed
   */
  static needsMigration() {
    const chats = localStorage.getItem('specweave_chats');
    const activeProjects = localStorage.getItem('activeProjectsPerChat');
    const epicContext = localStorage.getItem('specweave_epic_context');
    const testResults = localStorage.getItem('specweave_test_results');
    const jiraExports = localStorage.getItem('specweave_jira_exports');
    
    return !!(chats || activeProjects || epicContext || testResults || jiraExports);
  }
  
  /**
   * Check if migration was already completed
   */
  static async isMigrationCompleted() {
    try {
      const migrationFlag = localStorage.getItem('specweave_migration_completed');
      return migrationFlag === 'true';
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Run full migration from localStorage to database
   */
  static async runMigration() {
    try {
      
      // Check if already completed
      if (await this.isMigrationCompleted()) {
        
        return { success: true, alreadyCompleted: true };
      }
      
      const results = {
        chats: { migrated: 0, errors: [] },
        activeProjects: { migrated: 0, errors: [] },
        epicContext: { migrated: 0, errors: [] },
        testResults: { migrated: 0, errors: [] },
        jiraExports: { migrated: 0, errors: [] }
      };
      
      // 1. Migrate chat data
      
      try {
        const chatResult = await UserDataService.migrateChatDataFromLocalStorage();
        if (chatResult.success) {
          results.chats.migrated = chatResult.migrated;
          
        } else {
          results.chats.errors.push(chatResult.error);
          console.error('❌ [MIGRATION] Chat migration failed:', chatResult.error);
        }
      } catch (error) {
        results.chats.errors.push(error.message);
        console.error('❌ [MIGRATION] Chat migration exception:', error);
      }
      
      // 2. Migrate active projects
      
      try {
        const projectResult = await UserDataService.migrateActiveProjectsFromLocalStorage();
        if (projectResult.success) {
          results.activeProjects.migrated = projectResult.migrated;
          
        } else {
          results.activeProjects.errors.push(projectResult.error);
          console.error('❌ [MIGRATION] Active projects migration failed:', projectResult.error);
        }
      } catch (error) {
        results.activeProjects.errors.push(error.message);
        console.error('❌ [MIGRATION] Active projects migration exception:', error);
      }
      
      // 3. Migrate epic context
      
      try {
        const epicResult = await this.migrateEpicContext();
        if (epicResult.success) {
          results.epicContext.migrated = epicResult.migrated;
          
        } else {
          results.epicContext.errors.push(epicResult.error);
          console.error('❌ [MIGRATION] Epic context migration failed:', epicResult.error);
        }
      } catch (error) {
        results.epicContext.errors.push(error.message);
        console.error('❌ [MIGRATION] Epic context migration exception:', error);
      }
      
      // 4. Migrate test results
      
      try {
        const testResult = await UserDataService.migrateTestResultsFromLocalStorage();
        if (testResult.success) {
          results.testResults = { migrated: testResult.migrated, errors: [] };
          
        } else {
          results.testResults = { migrated: 0, errors: [testResult.error] };
          console.error('❌ [MIGRATION] Test results migration failed:', testResult.error);
        }
      } catch (error) {
        results.testResults = { migrated: 0, errors: [error.message] };
        console.error('❌ [MIGRATION] Test results migration exception:', error);
      }
      
      // 5. Migrate JIRA exports (if any exist in localStorage)
      
      try {
        const jiraExportResult = await UserDataService.migrateJiraExportsFromLocalStorage();
        if (jiraExportResult.success) {
          results.jiraExports = { migrated: jiraExportResult.migrated, errors: [] };
          
        } else {
          results.jiraExports = { migrated: 0, errors: [jiraExportResult.error] };
          console.error('❌ [MIGRATION] JIRA exports migration failed:', jiraExportResult.error);
        }
      } catch (error) {
        results.jiraExports = { migrated: 0, errors: [error.message] };
        console.error('❌ [MIGRATION] JIRA exports migration exception:', error);
      }
      
      // 6. Mark migration as completed
      localStorage.setItem('specweave_migration_completed', 'true');
      localStorage.setItem('specweave_migration_date', new Date().toISOString());
      
      // 5. Create backup of original localStorage data
      this.createLocalStorageBackup();
      
      const totalMigrated = results.chats.migrated + results.activeProjects.migrated + results.epicContext.migrated + results.testResults.migrated + results.jiraExports.migrated;
      const totalErrors = results.chats.errors.length + results.activeProjects.errors.length + results.epicContext.errors.length + results.testResults.errors.length + results.jiraExports.errors.length;
      
      console.log(`🎉 [MIGRATION] Migration completed!`);
      console.log(`   - Total items migrated: ${totalMigrated}`);
      console.log(`   - Total errors: ${totalErrors}`);
      
      if (totalErrors === 0) {
        console.log('✨ [MIGRATION] All data migrated successfully! Your data will now sync across browsers.');
      } else {
        console.warn('⚠️ [MIGRATION] Migration completed with some errors. Check the results for details.');
      }
      
      return {
        success: true,
        results,
        totalMigrated,
        totalErrors
      };
      
    } catch (error) {
      console.error('❌ [MIGRATION] Migration failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Migrate epic context from localStorage (now global)
   */
  static async migrateEpicContext() {
    try {
      const epicContextStr = localStorage.getItem('specweave_epic_context');
      
      if (!epicContextStr) {
        return { success: true, migrated: 0 };
      }
      
      const epicContext = JSON.parse(epicContextStr);
      
      if (!epicContext || !epicContext.epicData) {
        return { success: true, migrated: 0 };
      }
      
      // Epic context is now global (no chatId needed)
      const result = await UserDataService.setEpicContext(epicContext.epicData);
      
      if (result.success) {
        return { success: true, migrated: 1 };
      } else {
        return { success: false, error: result.error };
      }
      
    } catch (error) {
      console.error('Error migrating epic context:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Create backup of localStorage data before migration
   */
  static createLocalStorageBackup() {
    try {
      const backup = {
        timestamp: new Date().toISOString(),
        data: {
          chats: localStorage.getItem('specweave_chats'),
          history: localStorage.getItem('specweave_chat_history'),
          activeProjects: localStorage.getItem('activeProjectsPerChat'),
          epicContext: localStorage.getItem('specweave_epic_context'),
          activeChatId: localStorage.getItem('specweave_active_chat_id'),
          testResults: localStorage.getItem('specweave_test_results'),
          jiraExports: localStorage.getItem('specweave_jira_exports')
        }
      };
      
      localStorage.setItem('specweave_localStorage_backup', JSON.stringify(backup));
      
    } catch (error) {
      console.warn('⚠️ [MIGRATION] Failed to create localStorage backup:', error);
    }
  }
  
  /**
   * Clean up old localStorage data after successful migration
   * (Optional - call this after confirming migration worked)
   */
  static cleanupOldLocalStorageData() {
    try {
      const keysToClean = [
        'specweave_chats',
        'specweave_chat_history',
        'activeProjectsPerChat',
        'specweave_epic_context',
        'specweave_active_chat_id',
        'specweave_test_results',
        'specweave_jira_exports'
      ];
      
      keysToClean.forEach(key => {
        localStorage.removeItem(key);
      });

    } catch (error) {
      console.warn('⚠️ [MIGRATION] Failed to cleanup old localStorage data:', error);
    }
  }
  
  /**
   * Restore from backup (in case something goes wrong)
   */
  static restoreFromBackup() {
    try {
      const backupStr = localStorage.getItem('specweave_localStorage_backup');
      
      if (!backupStr) {
        console.warn('⚠️ [MIGRATION] No backup found to restore from');
        return false;
      }
      
      const backup = JSON.parse(backupStr);
      
      Object.entries(backup.data).forEach(([key, value]) => {
        if (value) {
          localStorage.setItem(key, value);
        }
      });
      
      // Remove migration flag to allow re-migration
      localStorage.removeItem('specweave_migration_completed');
      localStorage.removeItem('specweave_migration_date');

      return true;
      
    } catch (error) {
      console.error('❌ [MIGRATION] Failed to restore from backup:', error);
      return false;
    }
  }
  
  /**
   * Get migration status and statistics
   */
  static getMigrationStatus() {
    const isCompleted = localStorage.getItem('specweave_migration_completed') === 'true';
    const migrationDate = localStorage.getItem('specweave_migration_date');
    const hasBackup = !!localStorage.getItem('specweave_localStorage_backup');
    const needsMigration = this.needsMigration();
    
    return {
      isCompleted,
      migrationDate,
      hasBackup,
      needsMigration,
      canMigrate: !isCompleted && needsMigration
    };
  }
}

export default LocalStorageMigration;