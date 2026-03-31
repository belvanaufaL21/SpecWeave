/**
 * Database Migration Manager
 * Provides safe database migration system with rollback capabilities and data validation
 * Requirements: 6.3, 6.6
 */

import { supabaseAdmin } from '../../config/supabase.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MigrationManager {
  constructor() {
    this.migrationsPath = path.join(__dirname, 'scripts');
    this.backupsPath = path.join(__dirname, 'backups');
    this.migrationTable = 'schema_migrations';
    
    // Migration execution options
    this.options = {
      timeout: 300000, // 5 minutes
      batchSize: 1000,
      validateData: true,
      createBackup: true,
      dryRun: false
    };
    
    // Migration status tracking
    this.status = {
      isRunning: false,
      currentMigration: null,
      progress: 0,
      errors: [],
      warnings: []
    };
  }

  /**
   * Initialize migration system
   * Creates migration tracking table if it doesn't exist
   */
  async initialize() {
    try {
      console.log('🔧 Initializing migration system...');
      
      // Create migrations tracking table
      const { error } = await supabaseAdmin.rpc('create_migrations_table');
      
      if (error && !error.message.includes('already exists')) {
        throw error;
      }
      
      // Ensure directories exist
      await this.ensureDirectories();
      
      console.log('✅ Migration system initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize migration system:', error);
      throw error;
    }
  }

  /**
   * Get list of available migrations
   * @returns {Promise<Array>} Array of migration files
   */
  async getAvailableMigrations() {
    try {
      const files = await fs.readdir(this.migrationsPath);
      
      return files
        .filter(file => file.endsWith('.sql') || file.endsWith('.js'))
        .sort()
        .map(file => ({
          filename: file,
          name: this.extractMigrationName(file),
          version: this.extractMigrationVersion(file),
          type: file.endsWith('.sql') ? 'sql' : 'javascript',
          path: path.join(this.migrationsPath, file)
        }));
        
    } catch (error) {
      console.error('❌ Failed to get available migrations:', error);
      return [];
    }
  }

  /**
   * Get list of executed migrations
   * @returns {Promise<Array>} Array of executed migrations
   */
  async getExecutedMigrations() {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.migrationTable)
        .select('*')
        .order('executed_at', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      return data || [];
      
    } catch (error) {
      console.error('❌ Failed to get executed migrations:', error);
      return [];
    }
  }

  /**
   * Get pending migrations
   * @returns {Promise<Array>} Array of pending migrations
   */
  async getPendingMigrations() {
    try {
      const available = await this.getAvailableMigrations();
      const executed = await this.getExecutedMigrations();
      
      const executedVersions = new Set(executed.map(m => m.version));
      
      return available.filter(migration => !executedVersions.has(migration.version));
      
    } catch (error) {
      console.error('❌ Failed to get pending migrations:', error);
      return [];
    }
  }

  /**
   * Execute a single migration
   * @param {Object} migration - Migration object
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async executeMigration(migration, options = {}) {
    const startTime = Date.now();
    const migrationOptions = { ...this.options, ...options };
    
    try {
      console.log(`🚀 Executing migration: ${migration.name}`);
      
      this.status.isRunning = true;
      this.status.currentMigration = migration.name;
      this.status.progress = 0;
      this.status.errors = [];
      this.status.warnings = [];
      
      // Create backup if enabled
      let backupId = null;
      if (migrationOptions.createBackup) {
        backupId = await this.createBackup(migration.name);
        console.log(`📦 Backup created: ${backupId}`);
      }
      
      // Validate pre-migration state
      if (migrationOptions.validateData) {
        await this.validatePreMigrationState(migration);
        this.status.progress = 10;
      }
      
      // Execute migration
      let result;
      if (migration.type === 'sql') {
        result = await this.executeSQLMigration(migration, migrationOptions);
      } else {
        result = await this.executeJSMigration(migration, migrationOptions);
      }
      
      this.status.progress = 80;
      
      // Validate post-migration state
      if (migrationOptions.validateData) {
        await this.validatePostMigrationState(migration);
        this.status.progress = 90;
      }
      
      // Record migration execution
      if (!migrationOptions.dryRun) {
        await this.recordMigrationExecution(migration, {
          success: true,
          duration: Date.now() - startTime,
          backupId,
          result
        });
      }
      
      this.status.progress = 100;
      this.status.isRunning = false;
      
      const duration = Date.now() - startTime;
      console.log(`✅ Migration completed: ${migration.name} (${duration}ms)`);
      
      return {
        success: true,
        migration: migration.name,
        duration,
        backupId,
        result,
        warnings: this.status.warnings
      };
      
    } catch (error) {
      this.status.isRunning = false;
      this.status.errors.push(error.message);
      
      const duration = Date.now() - startTime;
      console.error(`❌ Migration failed: ${migration.name} (${duration}ms)`, error);
      
      // Record failed migration
      if (!migrationOptions.dryRun) {
        await this.recordMigrationExecution(migration, {
          success: false,
          duration,
          error: error.message
        });
      }
      
      throw error;
    }
  }

  /**
   * Execute SQL migration
   * @param {Object} migration - Migration object
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async executeSQLMigration(migration, options) {
    try {
      const sqlContent = await fs.readFile(migration.path, 'utf8');
      
      // Split SQL into individual statements
      const statements = this.parseSQLStatements(sqlContent);
      
      console.log(`📝 Executing ${statements.length} SQL statements`);
      
      const results = [];
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i].trim();
        
        if (!statement || statement.startsWith('--')) {
          continue; // Skip empty lines and comments
        }
        
        try {
          if (options.dryRun) {
            console.log(`[DRY RUN] Would execute: ${statement.substring(0, 100)}...`);
            results.push({ statement: statement.substring(0, 100), dryRun: true });
          } else {
            const { data, error } = await supabaseAdmin.rpc('execute_sql', {
              sql_statement: statement
            });
            
            if (error) {
              throw error;
            }
            
            results.push({ statement: statement.substring(0, 100), success: true, data });
          }
          
          // Update progress
          this.status.progress = 20 + Math.floor((i / statements.length) * 50);
          
        } catch (statementError) {
          console.error(`❌ SQL statement failed: ${statement.substring(0, 100)}`, statementError);
          throw new Error(`SQL statement failed: ${statementError.message}`);
        }
      }
      
      return {
        type: 'sql',
        statementsExecuted: results.length,
        results
      };
      
    } catch (error) {
      console.error('❌ SQL migration execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute JavaScript migration
   * @param {Object} migration - Migration object
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async executeJSMigration(migration, options) {
    try {
      // Dynamic import of migration module
      const migrationModule = await import(migration.path);
      
      if (!migrationModule.up || typeof migrationModule.up !== 'function') {
        throw new Error('Migration must export an "up" function');
      }
      
      // Execute migration with context
      const context = {
        supabase: supabaseAdmin,
        options,
        progress: (percent) => {
          this.status.progress = 20 + Math.floor(percent * 0.5);
        },
        log: (message) => {
          console.log(`📝 ${migration.name}: ${message}`);
        },
        warn: (message) => {
          console.warn(`⚠️ ${migration.name}: ${message}`);
          this.status.warnings.push(message);
        }
      };
      
      const result = await migrationModule.up(context);
      
      return {
        type: 'javascript',
        result
      };
      
    } catch (error) {
      console.error('❌ JavaScript migration execution failed:', error);
      throw error;
    }
  }

  /**
   * Rollback a migration
   * @param {string} migrationVersion - Migration version to rollback
   * @param {Object} options - Rollback options
   * @returns {Promise<Object>} Rollback result
   */
  async rollbackMigration(migrationVersion, options = {}) {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Rolling back migration: ${migrationVersion}`);
      
      // Get migration record
      const { data: migrationRecord, error } = await supabaseAdmin
        .from(this.migrationTable)
        .select('*')
        .eq('version', migrationVersion)
        .single();
      
      if (error || !migrationRecord) {
        throw new Error(`Migration ${migrationVersion} not found in executed migrations`);
      }
      
      // Find migration file
      const available = await this.getAvailableMigrations();
      const migration = available.find(m => m.version === migrationVersion);
      
      if (!migration) {
        throw new Error(`Migration file for ${migrationVersion} not found`);
      }
      
      // Execute rollback
      let result;
      if (migration.type === 'sql') {
        result = await this.rollbackSQLMigration(migration, migrationRecord, options);
      } else {
        result = await this.rollbackJSMigration(migration, migrationRecord, options);
      }
      
      // Remove migration record
      if (!options.dryRun) {
        await supabaseAdmin
          .from(this.migrationTable)
          .delete()
          .eq('version', migrationVersion);
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ Migration rolled back: ${migrationVersion} (${duration}ms)`);
      
      return {
        success: true,
        migration: migrationVersion,
        duration,
        result
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Migration rollback failed: ${migrationVersion} (${duration}ms)`, error);
      throw error;
    }
  }

  /**
   * Rollback SQL migration
   * @param {Object} migration - Migration object
   * @param {Object} migrationRecord - Migration execution record
   * @param {Object} options - Rollback options
   * @returns {Promise<Object>} Rollback result
   */
  async rollbackSQLMigration(migration, migrationRecord, options) {
    try {
      // Look for rollback SQL file
      const rollbackPath = migration.path.replace('.sql', '.rollback.sql');
      
      try {
        const rollbackSQL = await fs.readFile(rollbackPath, 'utf8');
        const statements = this.parseSQLStatements(rollbackSQL);
        
        console.log(`📝 Executing ${statements.length} rollback SQL statements`);
        
        for (const statement of statements) {
          if (!statement.trim() || statement.startsWith('--')) {
            continue;
          }
          
          if (options.dryRun) {
            console.log(`[DRY RUN] Would rollback: ${statement.substring(0, 100)}...`);
          } else {
            const { error } = await supabaseAdmin.rpc('execute_sql', {
              sql_statement: statement
            });
            
            if (error) {
              throw error;
            }
          }
        }
        
        return { type: 'sql_rollback', statementsExecuted: statements.length };
        
      } catch (fileError) {
        // If no rollback file, try to restore from backup
        if (migrationRecord.backup_id) {
          return await this.restoreFromBackup(migrationRecord.backup_id, options);
        } else {
          throw new Error(`No rollback SQL file found and no backup available for ${migration.name}`);
        }
      }
      
    } catch (error) {
      console.error('❌ SQL migration rollback failed:', error);
      throw error;
    }
  }

  /**
   * Rollback JavaScript migration
   * @param {Object} migration - Migration object
   * @param {Object} migrationRecord - Migration execution record
   * @param {Object} options - Rollback options
   * @returns {Promise<Object>} Rollback result
   */
  async rollbackJSMigration(migration, migrationRecord, options) {
    try {
      const migrationModule = await import(migration.path);
      
      if (migrationModule.down && typeof migrationModule.down === 'function') {
        // Execute down migration
        const context = {
          supabase: supabaseAdmin,
          options,
          log: (message) => console.log(`📝 ${migration.name} rollback: ${message}`),
          warn: (message) => console.warn(`⚠️ ${migration.name} rollback: ${message}`)
        };
        
        const result = await migrationModule.down(context);
        
        return { type: 'javascript_rollback', result };
        
      } else if (migrationRecord.backup_id) {
        // Restore from backup
        return await this.restoreFromBackup(migrationRecord.backup_id, options);
        
      } else {
        throw new Error(`No down function found and no backup available for ${migration.name}`);
      }
      
    } catch (error) {
      console.error('❌ JavaScript migration rollback failed:', error);
      throw error;
    }
  }

  /**
   * Create database backup before migration
   * @param {string} migrationName - Migration name
   * @returns {Promise<string>} Backup ID
   */
  async createBackup(migrationName) {
    try {
      const backupId = `backup_${migrationName}_${Date.now()}`;
      const backupPath = path.join(this.backupsPath, `${backupId}.json`);
      
      console.log(`📦 Creating backup: ${backupId}`);
      
      // Get list of tables to backup
      const { data: tables, error: tablesError } = await supabaseAdmin.rpc('get_user_tables');
      
      if (tablesError) {
        throw tablesError;
      }
      
      const backup = {
        id: backupId,
        migration: migrationName,
        created_at: new Date().toISOString(),
        tables: {}
      };
      
      // Backup each table
      for (const table of tables) {
        try {
          const { data: tableData, error: dataError } = await supabaseAdmin
            .from(table.table_name)
            .select('*');
          
          if (dataError) {
            console.warn(`⚠️ Failed to backup table ${table.table_name}:`, dataError);
            continue;
          }
          
          backup.tables[table.table_name] = {
            data: tableData || [],
            row_count: tableData?.length || 0
          };
          
        } catch (tableError) {
          console.warn(`⚠️ Failed to backup table ${table.table_name}:`, tableError);
        }
      }
      
      // Save backup to file
      await fs.writeFile(backupPath, JSON.stringify(backup, null, 2));
      
      console.log(`✅ Backup created: ${backupId}`);
      
      return backupId;
      
    } catch (error) {
      console.error('❌ Failed to create backup:', error);
      throw error;
    }
  }

  /**
   * Restore database from backup
   * @param {string} backupId - Backup ID
   * @param {Object} options - Restore options
   * @returns {Promise<Object>} Restore result
   */
  async restoreFromBackup(backupId, options = {}) {
    try {
      const backupPath = path.join(this.backupsPath, `${backupId}.json`);
      
      console.log(`🔄 Restoring from backup: ${backupId}`);
      
      const backupContent = await fs.readFile(backupPath, 'utf8');
      const backup = JSON.parse(backupContent);
      
      const restoredTables = [];
      
      for (const [tableName, tableBackup] of Object.entries(backup.tables)) {
        try {
          if (options.dryRun) {
            console.log(`[DRY RUN] Would restore ${tableBackup.row_count} rows to ${tableName}`);
            continue;
          }
          
          // Clear existing data
          await supabaseAdmin.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
          
          // Restore data in batches
          const batchSize = 100;
          const data = tableBackup.data;
          
          for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            
            const { error } = await supabaseAdmin
              .from(tableName)
              .insert(batch);
            
            if (error) {
              throw error;
            }
          }
          
          restoredTables.push({
            table: tableName,
            rows: data.length
          });
          
          console.log(`✅ Restored ${data.length} rows to ${tableName}`);
          
        } catch (tableError) {
          console.error(`❌ Failed to restore table ${tableName}:`, tableError);
        }
      }
      
      console.log(`✅ Backup restored: ${backupId}`);
      
      return {
        type: 'backup_restore',
        backupId,
        restoredTables
      };
      
    } catch (error) {
      console.error('❌ Failed to restore from backup:', error);
      throw error;
    }
  }

  /**
   * Validate pre-migration database state
   * @param {Object} migration - Migration object
   */
  async validatePreMigrationState(migration) {
    try {
      console.log(`🔍 Validating pre-migration state for: ${migration.name}`);
      
      // Basic validation checks
      const validations = [
        this.validateDatabaseConnection(),
        this.validateTableIntegrity(),
        this.validateDataConsistency()
      ];
      
      const results = await Promise.allSettled(validations);
      
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          this.status.warnings.push(`Pre-migration validation ${index + 1} failed: ${result.reason}`);
        }
      });
      
      console.log(`✅ Pre-migration validation completed`);
      
    } catch (error) {
      console.error('❌ Pre-migration validation failed:', error);
      throw error;
    }
  }

  /**
   * Validate post-migration database state
   * @param {Object} migration - Migration object
   */
  async validatePostMigrationState(migration) {
    try {
      console.log(`🔍 Validating post-migration state for: ${migration.name}`);
      
      // Post-migration validation checks
      const validations = [
        this.validateDatabaseConnection(),
        this.validateTableIntegrity(),
        this.validateDataConsistency(),
        this.validateMigrationSpecificRules(migration)
      ];
      
      const results = await Promise.allSettled(validations);
      
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          this.status.warnings.push(`Post-migration validation ${index + 1} failed: ${result.reason}`);
        }
      });
      
      console.log(`✅ Post-migration validation completed`);
      
    } catch (error) {
      console.error('❌ Post-migration validation failed:', error);
      throw error;
    }
  }

  /**
   * Validate database connection
   */
  async validateDatabaseConnection() {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      throw new Error(`Database connection validation failed: ${error.message}`);
    }
  }

  /**
   * Validate table integrity
   */
  async validateTableIntegrity() {
    // Check for common table integrity issues
    const { data: tables, error } = await supabaseAdmin.rpc('get_user_tables');
    
    if (error) {
      throw new Error(`Table integrity validation failed: ${error.message}`);
    }
    
    // Additional integrity checks can be added here
  }

  /**
   * Validate data consistency
   */
  async validateDataConsistency() {
    // Check for data consistency issues
    // This is a placeholder for more specific consistency checks
    return true;
  }

  /**
   * Validate migration-specific rules
   * @param {Object} migration - Migration object
   */
  async validateMigrationSpecificRules(migration) {
    // Migration-specific validation rules
    // This can be extended based on migration requirements
    return true;
  }

  /**
   * Record migration execution
   * @param {Object} migration - Migration object
   * @param {Object} executionData - Execution data
   */
  async recordMigrationExecution(migration, executionData) {
    try {
      const { error } = await supabaseAdmin
        .from(this.migrationTable)
        .insert([{
          version: migration.version,
          name: migration.name,
          filename: migration.filename,
          success: executionData.success,
          duration_ms: executionData.duration,
          backup_id: executionData.backupId,
          error_message: executionData.error,
          executed_at: new Date().toISOString()
        }]);
      
      if (error) {
        throw error;
      }
      
    } catch (error) {
      console.error('❌ Failed to record migration execution:', error);
      // Don't throw here as the migration itself might have succeeded
    }
  }

  /**
   * Parse SQL statements from content
   * @param {string} sqlContent - SQL content
   * @returns {Array} Array of SQL statements
   */
  parseSQLStatements(sqlContent) {
    // Simple SQL statement parser
    // Split by semicolon but handle strings and comments
    const statements = [];
    let current = '';
    let inString = false;
    let stringChar = '';
    let inComment = false;
    
    for (let i = 0; i < sqlContent.length; i++) {
      const char = sqlContent[i];
      const nextChar = sqlContent[i + 1];
      
      if (inComment) {
        if (char === '\n') {
          inComment = false;
        }
        continue;
      }
      
      if (char === '-' && nextChar === '-') {
        inComment = true;
        i++; // Skip next char
        continue;
      }
      
      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar) {
        inString = false;
        stringChar = '';
      }
      
      if (!inString && char === ';') {
        if (current.trim()) {
          statements.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current.trim()) {
      statements.push(current.trim());
    }
    
    return statements;
  }

  /**
   * Extract migration name from filename
   * @param {string} filename - Migration filename
   * @returns {string} Migration name
   */
  extractMigrationName(filename) {
    return filename.replace(/^\d+_/, '').replace(/\.(sql|js)$/, '').replace(/_/g, ' ');
  }

  /**
   * Extract migration version from filename
   * @param {string} filename - Migration filename
   * @returns {string} Migration version
   */
  extractMigrationVersion(filename) {
    const match = filename.match(/^(\d+)/);
    return match ? match[1] : '0';
  }

  /**
   * Ensure required directories exist
   */
  async ensureDirectories() {
    try {
      await fs.mkdir(this.migrationsPath, { recursive: true });
      await fs.mkdir(this.backupsPath, { recursive: true });
    } catch (error) {
      console.error('❌ Failed to create directories:', error);
      throw error;
    }
  }

  /**
   * Get migration status
   * @returns {Object} Current migration status
   */
  getStatus() {
    return { ...this.status };
  }

  /**
   * Run all pending migrations
   * @param {Object} options - Execution options
   * @returns {Promise<Array>} Results of all migrations
   */
  async runPendingMigrations(options = {}) {
    try {
      const pending = await this.getPendingMigrations();
      
      if (pending.length === 0) {
        console.log('✅ No pending migrations');
        return [];
      }
      
      console.log(`🚀 Running ${pending.length} pending migrations`);
      
      const results = [];
      
      for (const migration of pending) {
        try {
          const result = await this.executeMigration(migration, options);
          results.push(result);
        } catch (error) {
          console.error(`❌ Migration failed: ${migration.name}`, error);
          
          if (options.stopOnError !== false) {
            throw error;
          }
          
          results.push({
            success: false,
            migration: migration.name,
            error: error.message
          });
        }
      }
      
      return results;
      
    } catch (error) {
      console.error('❌ Failed to run pending migrations:', error);
      throw error;
    }
  }
}

// Create singleton instance
const migrationManager = new MigrationManager();

export default migrationManager;