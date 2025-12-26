// Migration script to add Epic Context table to SQLite database using better-sqlite3
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'basis-data', 'specweave.db');
const sqlPath = join(__dirname, '..', 'basis-data', 'add_jira_tables_complete.sql');

async function runMigration() {
  try {
    console.log('🚀 Starting Epic Context migration...\n');
    
    // Open database
    const db = new Database(dbPath);
    console.log('✅ Connected to SQLite database');

    // Read SQL file
    const sql = readFileSync(sqlPath, 'utf8');
    console.log('📄 Reading SQL migration file...');

    // Split SQL into individual statements, but handle CREATE TABLE properly
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('PRAGMA'))
      .filter(stmt => !stmt.match(/^(BEGIN|COMMIT|END)$/i)); // Remove transaction statements

    console.log(`🔄 Executing ${statements.length} SQL statements...`);

    const errors = [];
    let successCount = 0;

    // Execute each statement
    statements.forEach((statement, index) => {
      try {
        // Execute statement
        if (statement.toUpperCase().startsWith('CREATE TABLE')) {
          console.log(`📋 Creating table: ${statement.match(/CREATE TABLE[^(]*(\w+)/i)?.[1] || 'unknown'}`);
        } else if (statement.toUpperCase().startsWith('CREATE INDEX')) {
          console.log(`🔗 Creating index: ${statement.match(/CREATE INDEX[^(]*(\w+)/i)?.[1] || 'unknown'}`);
        } else if (statement.toUpperCase().startsWith('CREATE TRIGGER')) {
          console.log(`⚡ Creating trigger: ${statement.match(/CREATE TRIGGER[^(]*(\w+)/i)?.[1] || 'unknown'}`);
        }
        
        db.exec(statement);
        console.log(`✅ Statement ${index + 1} executed successfully`);
        successCount++;
      } catch (err) {
        // Handle specific errors
        if (err.message.includes('table') && err.message.includes('already exists')) {
          console.log(`⚠️  Statement ${index + 1} skipped (table already exists)`);
          successCount++;
        } else if (err.message.includes('duplicate column name')) {
          console.log(`⚠️  Statement ${index + 1} skipped (column already exists)`);
          successCount++;
        } else if (err.message.includes('index') && err.message.includes('already exists')) {
          console.log(`⚠️  Statement ${index + 1} skipped (index already exists)`);
          successCount++;
        } else {
          console.error(`❌ Error in statement ${index + 1}:`, err.message);
          console.error(`   SQL: ${statement.substring(0, 200)}...`);
          errors.push({ index: index + 1, error: err.message, statement: statement.substring(0, 100) + '...' });
        }
      }
    });

    // Report results
    console.log(`\n📊 Migration Results:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log(`\n⚠️  Errors encountered:`);
      errors.forEach(({ index, error, statement }) => {
        console.log(`   Statement ${index}: ${error}`);
        console.log(`   SQL: ${statement}`);
      });
    }

    // Verify tables
    console.log('\n🔍 Verifying tables...');
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name IN ('epic_contexts', 'jira_connections')
      ORDER BY name
    `).all();

    console.log('📋 Tables found:');
    if (tables.length === 0) {
      console.log('   ⚠️  No JIRA-related tables found');
    } else {
      tables.forEach(table => {
        console.log(`   ✅ ${table.name}`);
        
        // Show table structure
        const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
        console.log(`      Columns: ${columns.map(col => col.name).join(', ')}`);
      });
    }

    // Check scenarios table for JIRA columns
    console.log('\n🔍 Checking scenarios table for JIRA columns...');
    try {
      const scenarioColumns = db.prepare(`PRAGMA table_info(scenarios)`).all();
      const jiraColumns = scenarioColumns.filter(col => 
        col.name.includes('jira_') || col.name.includes('epic_')
      );
      
      if (jiraColumns.length > 0) {
        console.log('   ✅ JIRA columns in scenarios table:');
        jiraColumns.forEach(col => {
          console.log(`      - ${col.name} (${col.type})`);
        });
      } else {
        console.log('   ⚠️  No JIRA columns found in scenarios table');
      }
    } catch (err) {
      console.log('   ❌ Error checking scenarios table:', err.message);
    }

    db.close();
    console.log('\n📝 Database connection closed');
    
    if (errors.length === 0) {
      console.log('\n🎉 Migration completed successfully!');
      return true;
    } else {
      console.log('\n⚠️  Migration completed with some errors');
      return false;
    }

  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    throw error;
  }
}

// Run migration
runMigration()
  .then((success) => {
    if (success) {
      console.log('\n✨ Epic Context tables are ready for JIRA integration!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Migration completed with warnings');
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error('\n💥 Migration process failed:', error);
    process.exit(1);
  });