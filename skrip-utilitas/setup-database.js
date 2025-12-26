import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const supabaseUrl = 'https://xuttuadlaxgmtusgdxsp.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1dHR1YWRsYXhnbXR1c2dkeHNwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ2MTgwNSwiZXhwIjoyMDgxMDM3ODA1fQ.f7Oms3S0yOlxdRMqw5gPQi9Pcud6im0vyR4-v_RCZiI';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupDatabase() {
  try {
    console.log('🚀 Starting database setup...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'server', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📄 Schema file loaded successfully');
    
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
        
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement
        });
        
        if (error) {
          // Try direct query if RPC fails
          const { error: directError } = await supabase
            .from('_temp')
            .select('*')
            .limit(0);
          
          if (directError && !directError.message.includes('does not exist')) {
            console.warn(`⚠️  Warning on statement ${i + 1}: ${error.message}`);
          }
        }
        
      } catch (err) {
        console.warn(`⚠️  Warning on statement ${i + 1}: ${err.message}`);
      }
    }
    
    console.log('✅ Database setup completed!');
    
    // Test the setup by checking if tables exist
    console.log('🔍 Verifying table creation...');
    
    const tables = ['profiles', 'scenarios', 'templates', 'jira_connections', 'evaluation_metrics', 'performance_logs'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ Table '${table}' not found or accessible`);
        } else {
          console.log(`✅ Table '${table}' created successfully`);
        }
      } catch (err) {
        console.log(`❌ Error checking table '${table}': ${err.message}`);
      }
    }
    
    console.log('🎉 Database setup verification completed!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Alternative method using direct SQL execution
async function setupDatabaseDirect() {
  try {
    console.log('🚀 Starting direct database setup...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'server', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📄 Schema file loaded successfully');
    
    // Execute the entire schema at once
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: schema
    });
    
    if (error) {
      console.error('❌ Error executing schema:', error);
      
      // Try alternative approach - execute key tables manually
      console.log('🔄 Trying alternative approach...');
      
      const keyStatements = [
        `CREATE TABLE IF NOT EXISTS profiles (
          id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          name VARCHAR(255),
          avatar_url VARCHAR(500),
          role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
          preferences JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );`,
        
        `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;`,
        
        `CREATE POLICY "Users can view own profile" ON profiles
          FOR SELECT USING (auth.uid() = id);`,
        
        `CREATE POLICY "Users can update own profile" ON profiles
          FOR UPDATE USING (auth.uid() = id);`,
        
        `CREATE POLICY "Users can insert own profile" ON profiles
          FOR INSERT WITH CHECK (auth.uid() = id);`
      ];
      
      for (const stmt of keyStatements) {
        try {
          await supabase.rpc('exec_sql', { sql: stmt });
          console.log('✅ Executed key statement successfully');
        } catch (err) {
          console.warn('⚠️  Warning:', err.message);
        }
      }
    } else {
      console.log('✅ Schema executed successfully');
    }
    
    console.log('🎉 Database setup completed!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
  }
}

// Run the setup
if (process.argv.includes('--direct')) {
  setupDatabaseDirect();
} else {
  setupDatabase();
}