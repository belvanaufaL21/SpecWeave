// Migration script to add Epic Context table to SQLite database
import sqlite3 from 'sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'specweave.db');
const sqlPath = join(__dirname, 'add_epic_context_sqlite.sql');

async function runMigration() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log('✅ Connected to SQLite database');
    });

    try {
      const sql = readFileSync(sqlPath, 'utf8');
      console.log('📄 Reading SQL migration file...');

      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      console.log(`🔄 Executing ${statements.length} SQL statements...`);

      let completed = 0;
      const errors = [];

      statements.forEach((statement, index) => {
        db.run(statement, function(err) {
          if (err) {
            console.error(`❌ Error in statement ${index + 1}:`, err.message);
            errors.push({ index: index + 1, error: err.message, statement });
          } else {
            console.log(`✅ Statement ${index + 1} executed successfully`);
          }

          completed++;
          
          if (completed === statements.length) {
            if (errors.length > 0) {
              console.log(`\n⚠️  Migration completed with ${errors.length} errors:`);
              errors.forEach(({ index, error, statement }) => {
                console.log(`   Statement ${index}: ${error}`);
                console.log(`   SQL: ${statement.substring(0, 100)}...`);
              });
            } else {
              console.log('\n🎉 Migration completed successfully!');
            }

            db.close((err) => {
              if (err) {
                console.error('Error closing database:', err);
                reject(err);
              } else {
                console.log('📝 Database connection closed');
                resolve();
              }
            });
          }
        });
      });

    } catch (error) {
      console.error('❌ Error reading SQL file:', error);
      db.close();
      reject(error);
    }
  });
}

// Verify tables after migration
async function verifyTables() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    const query = `
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name IN ('epic_contexts', 'jira_connections')
      ORDER BY name;
    `;

    db.all(query, [], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      console.log('\n📋 Verification - Tables found:');
      rows.forEach(row => {
        console.log(`   ✅ ${row.name}`);
      });

      if (rows.length === 0) {
        console.log('   ⚠️  No JIRA-related tables found');
      }

      db.close();
      resolve(rows);
    });
  });
}

// Run migration
console.log('🚀 Starting Epic Context migration...\n');

runMigration()
  .then(() => verifyTables())
  .then(() => {
    console.log('\n✨ Migration process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });