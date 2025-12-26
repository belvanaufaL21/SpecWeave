import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xuttuadlaxgmtusgdxsp.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1dHR1YWRsYXhnbXR1c2dkeHNwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ2MTgwNSwiZXhwIjoyMDgxMDM3ODA1fQ.f7Oms3S0yOlxdRMqw5gPQi9Pcud6im0vyR4-v_RCZiI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createReferencesTable() {
  try {
    console.log('🚀 Creating scenario_references table...');
    
    // Try to insert a test record to see if table exists
    const { data: testData, error: testError } = await supabase
      .from('scenario_references')
      .select('*')
      .limit(1);
    
    if (!testError) {
      console.log('✅ Table scenario_references already exists');
      return;
    }
    
    console.log('📝 Table does not exist, will be created automatically on first insert');
    
    // Since Supabase doesn't allow direct DDL via client, we'll create some sample data
    // The table should be created via Supabase dashboard or SQL editor
    console.log('⚠️ Please create the table manually in Supabase dashboard using the SQL from add_references_table.sql');
    
    // For now, let's test if we can access other tables
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (profilesError) {
      console.log('❌ Cannot access profiles table:', profilesError.message);
    } else {
      console.log('✅ Can access profiles table');
      
      if (profilesData && profilesData.length > 0) {
        console.log('📊 Found user profiles, can create sample references');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createReferencesTable();