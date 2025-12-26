import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = 'https://xuttuadlaxgmtusgdxsp.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1dHR1YWRsYXhnbXR1c2dkeHNwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ2MTgwNSwiZXhwIjoyMDgxMDM3ODA1fQ.f7Oms3S0yOlxdRMqw5gPQi9Pcud6im0vyR4-v_RCZiI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Running references table migration...');
    
    const sqlPath = path.join(__dirname, 'database', 'add_references_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split into statements and execute each one
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        try {
          console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
          const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
          if (error) {
            console.warn(`⚠️ Warning on statement ${i + 1}:`, error.message);
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.warn(`⚠️ Warning on statement ${i + 1}:`, err.message);
        }
      }
    }
    
    // Test if table was created
    console.log('🔍 Verifying table creation...');
    const { data, error } = await supabase
      .from('scenario_references')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Table verification failed:', error.message);
    } else {
      console.log('✅ Table scenario_references created successfully');
    }
    
    console.log('🎉 Migration completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

runMigration();