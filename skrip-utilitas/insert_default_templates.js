import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from the server directory FIRST
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '../.env');
console.log('Loading .env from:', envPath);
console.log('File exists:', fs.existsSync(envPath));
dotenv.config({ path: envPath });
console.log('SUPABASE_URL loaded:', !!process.env.SUPABASE_URL);

// Import supabase directly to avoid config issues
import { createClient } from '@supabase/supabase-js';

// Create supabase admin client directly
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Insert default system templates into the database
 */
async function insertDefaultTemplates() {
  try {
    console.log('🚀 Starting default template insertion...');

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '../database/insert_templates.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Split by semicolon to get individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.toLowerCase().includes('insert into templates')) {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}`);
        
        const { error } = await supabaseAdmin.rpc('exec_sql', {
          sql_query: statement + ';'
        });

        if (error) {
          // If the function doesn't exist, try direct execution
          console.log('📋 Trying direct execution...');
          
          // Parse the INSERT statement to extract values
          const insertMatch = statement.match(/INSERT INTO templates \([^)]+\) VALUES\s*(.+)/i);
          if (insertMatch) {
            const valuesSection = insertMatch[1];
            
            // This is a simplified approach - for production, you'd want more robust parsing
            console.log('⚠️  Manual template insertion required. Please run the SQL file directly in Supabase.');
            console.log('📄 SQL file location:', sqlFilePath);
            break;
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      }
    }

    // Verify insertion by counting templates
    const { data: templates, error: countError } = await supabaseAdmin
      .from('templates')
      .select('id, name, category, is_system')
      .eq('is_system', true);

    if (countError) {
      console.error('❌ Error verifying templates:', countError);
      return;
    }

    console.log(`✅ Template insertion completed!`);
    console.log(`📊 Total system templates: ${templates.length}`);
    
    // Group by category
    const byCategory = templates.reduce((acc, template) => {
      acc[template.category] = (acc[template.category] || 0) + 1;
      return acc;
    }, {});

    console.log('📋 Templates by category:');
    Object.entries(byCategory).forEach(([category, count]) => {
      console.log(`   ${category}: ${count} templates`);
    });

  } catch (error) {
    console.error('❌ Error inserting default templates:', error);
    process.exit(1);
  }
}

/**
 * Alternative method: Insert templates using Supabase client
 */
async function insertTemplatesDirectly() {
  console.log('🔄 Using direct insertion method...');

  const defaultTemplates = [
    {
      name: 'User Authentication Login',
      category: 'Authentication',
      description: 'Standard login flow with email and password',
      template_content: 'Sebagai {role}, saya ingin login menggunakan {login_method} agar dapat mengakses {target_system}.',
      variables: [
        { name: 'role', type: 'text', default_value: 'pengguna' },
        { name: 'login_method', type: 'select', options: ['email dan password', 'Google OAuth', 'SSO'], default_value: 'email dan password' },
        { name: 'target_system', type: 'text', default_value: 'dashboard aplikasi' }
      ],
      is_system: true,
      tags: ['authentication', 'login', 'security']
    },
    {
      name: 'User Registration',
      category: 'Authentication',
      description: 'User registration and account creation',
      template_content: 'Sebagai {role}, saya ingin mendaftar akun baru dengan {registration_method} agar dapat {benefit}.',
      variables: [
        { name: 'role', type: 'text', default_value: 'calon pengguna' },
        { name: 'registration_method', type: 'select', options: ['email dan password', 'Google OAuth', 'nomor telepon'], default_value: 'email dan password' },
        { name: 'benefit', type: 'text', default_value: 'menggunakan layanan aplikasi' }
      ],
      is_system: true,
      tags: ['authentication', 'registration', 'onboarding']
    },
    {
      name: 'CRUD Operations - Create',
      category: 'CRUD Operations',
      description: 'Create new entity in the system',
      template_content: 'Sebagai {role}, saya ingin membuat {entity} baru agar dapat {benefit}.',
      variables: [
        { name: 'role', type: 'text', default_value: 'pengguna' },
        { name: 'entity', type: 'text', default_value: 'data' },
        { name: 'benefit', type: 'text', default_value: 'mengelola informasi dengan lebih baik' }
      ],
      is_system: true,
      tags: ['crud', 'create', 'data-management']
    },
    {
      name: 'CRUD Operations - Read',
      category: 'CRUD Operations',
      description: 'View and search existing entities',
      template_content: 'Sebagai {role}, saya ingin melihat daftar {entity} agar dapat {benefit}.',
      variables: [
        { name: 'role', type: 'text', default_value: 'pengguna' },
        { name: 'entity', type: 'text', default_value: 'data' },
        { name: 'benefit', type: 'text', default_value: 'memantau dan mengelola informasi' }
      ],
      is_system: true,
      tags: ['crud', 'read', 'view', 'list']
    },
    {
      name: 'API Integration',
      category: 'API Integration',
      description: 'Integrate with external API services',
      template_content: 'Sebagai {role}, saya ingin mengintegrasikan sistem dengan {api_service} agar dapat {benefit}.',
      variables: [
        { name: 'role', type: 'text', default_value: 'developer' },
        { name: 'api_service', type: 'text', default_value: 'layanan eksternal' },
        { name: 'benefit', type: 'text', default_value: 'meningkatkan fungsionalitas aplikasi' }
      ],
      is_system: true,
      tags: ['api', 'integration', 'external-service']
    }
  ];

  try {
    // Check if templates already exist
    const { data: existingTemplates } = await supabaseAdmin
      .from('templates')
      .select('name')
      .eq('is_system', true);

    const existingNames = new Set(existingTemplates?.map(t => t.name) || []);

    // Filter out templates that already exist
    const templatesToInsert = defaultTemplates.filter(template => 
      !existingNames.has(template.name)
    );

    if (templatesToInsert.length === 0) {
      console.log('✅ All default templates already exist');
      return;
    }

    console.log(`📝 Inserting ${templatesToInsert.length} new templates...`);

    const { data, error } = await supabaseAdmin
      .from('templates')
      .insert(templatesToInsert)
      .select();

    if (error) {
      console.error('❌ Error inserting templates:', error);
      return;
    }

    console.log(`✅ Successfully inserted ${data.length} templates`);
    data.forEach(template => {
      console.log(`   - ${template.name} (${template.category})`);
    });

  } catch (error) {
    console.error('❌ Error in direct insertion:', error);
  }
}

// Main execution
async function main() {
  console.log('🎯 Default Template Insertion Script');
  console.log('=====================================');

  // Try direct insertion first (more reliable)
  await insertTemplatesDirectly();

  console.log('\n🏁 Script completed');
  process.exit(0);
}

// Run if called directly
const currentFile = fileURLToPath(import.meta.url);
const scriptFile = process.argv[1];

if (path.resolve(currentFile) === path.resolve(scriptFile)) {
  main().catch(console.error);
}

export { insertDefaultTemplates, insertTemplatesDirectly };