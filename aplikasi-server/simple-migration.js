// Simple migration script to add JIRA tables one by one
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'basis-data', 'specweave.db');

async function runMigration() {
  try {
    console.log('🚀 Starting JIRA tables migration...\n');
    
    const db = new Database(dbPath);
    console.log('✅ Connected to SQLite database');

    // 1. Create jira_connections table
    console.log('\n📋 Creating jira_connections table...');
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS jira_connections (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          user_id TEXT NOT NULL,
          jira_url TEXT NOT NULL,
          email TEXT,
          api_token TEXT,
          access_token TEXT,
          refresh_token TEXT,
          auth_type TEXT DEFAULT 'api_token' CHECK (auth_type IN ('api_token', 'oauth')),
          project_key TEXT,
          issue_type TEXT,
          custom_fields TEXT DEFAULT '{}',
          server_info TEXT DEFAULT '{}',
          project_info TEXT DEFAULT '{}',
          is_active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ jira_connections table created');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('⚠️  jira_connections table already exists');
      } else {
        throw err;
      }
    }

    // 2. Create epic_contexts table
    console.log('\n📋 Creating epic_contexts table...');
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS epic_contexts (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          user_id TEXT,
          session_id TEXT,
          epic_id TEXT,
          epic_data TEXT NOT NULL,
          connection_id TEXT,
          project_key TEXT NOT NULL,
          is_active INTEGER DEFAULT 1,
          expires_at DATETIME DEFAULT (datetime('now', '+24 hours')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (connection_id) REFERENCES jira_connections(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ epic_contexts table created');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('⚠️  epic_contexts table already exists');
      } else {
        throw err;
      }
    }

    // 3. Create scenarios table
    console.log('\n📋 Creating scenarios table...');
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS scenarios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          user_story TEXT NOT NULL,
          feature_name TEXT,
          description TEXT,
          scenarios_json TEXT NOT NULL,
          template_id TEXT,
          tags TEXT,
          is_public INTEGER DEFAULT 0,
          meteor_score REAL,
          generation_time_ms INTEGER,
          quality_level TEXT CHECK (quality_level IN ('excellent', 'good', 'acceptable', 'poor', 'very_poor')),
          jira_epic_id TEXT,
          jira_user_story_id TEXT,
          jira_subtask_ids TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ scenarios table created');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('⚠️  scenarios table already exists');
      } else {
        throw err;
      }
    }

    // 4. Create templates table
    console.log('\n📋 Creating templates table...');
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS templates (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          description TEXT,
          template_content TEXT NOT NULL,
          variables TEXT DEFAULT '[]',
          is_system INTEGER DEFAULT 0,
          created_by TEXT,
          usage_count INTEGER DEFAULT 0,
          tags TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ templates table created');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('⚠️  templates table already exists');
      } else {
        throw err;
      }
    }

    // 5. Create users table
    console.log('\n📋 Creating users table...');
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          name TEXT,
          avatar_url TEXT,
          role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
          preferences TEXT DEFAULT '{}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ users table created');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('⚠️  users table already exists');
      } else {
        throw err;
      }
    }

    // 6. Create indexes
    console.log('\n🔗 Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_jira_user_id ON jira_connections(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_jira_active ON jira_connections(is_active) WHERE is_active = 1',
      'CREATE INDEX IF NOT EXISTS idx_epic_contexts_user_id ON epic_contexts(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_epic_contexts_active ON epic_contexts(is_active) WHERE is_active = 1',
      'CREATE INDEX IF NOT EXISTS idx_scenarios_user_id ON scenarios(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_scenarios_jira_epic ON scenarios(jira_epic_id) WHERE jira_epic_id IS NOT NULL',
      'CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category)',
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)'
    ];

    let indexCount = 0;
    indexes.forEach((indexSQL, i) => {
      try {
        db.exec(indexSQL);
        indexCount++;
      } catch (err) {
        if (!err.message.includes('already exists')) {
          console.log(`⚠️  Index ${i + 1} failed: ${err.message}`);
        }
      }
    });
    console.log(`✅ ${indexCount} indexes created`);

    // 7. Create triggers
    console.log('\n⚡ Creating triggers...');
    const triggers = [
      `CREATE TRIGGER IF NOT EXISTS update_jira_connections_updated_at 
       AFTER UPDATE ON jira_connections
       FOR EACH ROW
       BEGIN
         UPDATE jira_connections SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
       END`,
      `CREATE TRIGGER IF NOT EXISTS update_epic_contexts_updated_at 
       AFTER UPDATE ON epic_contexts
       FOR EACH ROW
       BEGIN
         UPDATE epic_contexts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
       END`,
      `CREATE TRIGGER IF NOT EXISTS update_scenarios_updated_at 
       AFTER UPDATE ON scenarios
       FOR EACH ROW
       BEGIN
         UPDATE scenarios SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
       END`
    ];

    let triggerCount = 0;
    triggers.forEach((triggerSQL, i) => {
      try {
        db.exec(triggerSQL);
        triggerCount++;
      } catch (err) {
        if (!err.message.includes('already exists')) {
          console.log(`⚠️  Trigger ${i + 1} failed: ${err.message}`);
        }
      }
    });
    console.log(`✅ ${triggerCount} triggers created`);

    // Verify tables
    console.log('\n🔍 Verifying tables...');
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name
    `).all();

    console.log('📋 All tables:');
    tables.forEach(table => {
      console.log(`   ✅ ${table.name}`);
    });

    // Check JIRA-specific tables
    const jiraTables = tables.filter(t => 
      ['jira_connections', 'epic_contexts', 'scenarios', 'templates', 'users'].includes(t.name)
    );

    console.log(`\n🎯 JIRA Integration tables: ${jiraTables.length}/5`);
    jiraTables.forEach(table => {
      const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
      console.log(`   ✅ ${table.name} (${columns.length} columns)`);
    });

    db.close();
    console.log('\n📝 Database connection closed');
    
    console.log('\n🎉 Migration completed successfully!');
    return true;

  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    throw error;
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('\n✨ JIRA Integration tables are ready!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration process failed:', error);
    process.exit(1);
  });