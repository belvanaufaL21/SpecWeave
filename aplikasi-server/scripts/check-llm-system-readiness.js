#!/usr/bin/env node

/**
 * LLM Usage Limit System Readiness Check
 * 
 * This script verifies that the backend is ready for the LLM Usage Limit System
 * by checking:
 * 1. Required environment variables
 * 2. Required dependencies
 * 3. Required service files
 * 4. Required controller files
 * 5. Required middleware files
 * 6. Database connection
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const checkmark = '✅';
const crossmark = '❌';
const warning = '⚠️';

let totalChecks = 0;
let passedChecks = 0;

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function check(name, condition, errorMessage = '') {
  totalChecks++;
  if (condition) {
    passedChecks++;
    log(`${checkmark} ${name}`, 'green');
    return true;
  } else {
    log(`${crossmark} ${name}`, 'red');
    if (errorMessage) {
      log(`   ${errorMessage}`, 'yellow');
    }
    return false;
  }
}

function section(title) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(title, 'cyan');
  log('='.repeat(60), 'cyan');
}

// Check if file exists
function fileExists(filePath) {
  return fs.existsSync(path.join(__dirname, '..', filePath));
}

// Check if package is installed
function packageInstalled(packageName) {
  try {
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageName in (packageJson.dependencies || {}) || 
           packageName in (packageJson.devDependencies || {});
  } catch (error) {
    return false;
  }
}

async function main() {
  log('\n🚀 LLM Usage Limit System Readiness Check', 'blue');
  log('This script verifies that the backend is ready for deployment\n', 'blue');

  // ============================================================================
  // 1. Environment Variables Check
  // ============================================================================
  section('1. Environment Variables');
  
  check(
    'GROQ_API_KEY is set',
    !!process.env.GROQ_API_KEY,
    'Add GROQ_API_KEY to .env file'
  );
  
  check(
    'GEMINI_API_KEY is set',
    !!process.env.GEMINI_API_KEY,
    'Add GEMINI_API_KEY to .env file (get from https://aistudio.google.com/app/apikey)'
  );
  
  check(
    'SUPABASE_URL is set',
    !!process.env.SUPABASE_URL,
    'Add SUPABASE_URL to .env file'
  );
  
  check(
    'SUPABASE_ANON_KEY is set',
    !!process.env.SUPABASE_ANON_KEY,
    'Add SUPABASE_ANON_KEY to .env file'
  );

  // ============================================================================
  // 2. Dependencies Check
  // ============================================================================
  section('2. Required Dependencies');
  
  check(
    'groq-sdk is installed',
    packageInstalled('groq-sdk'),
    'Run: npm install groq-sdk'
  );
  
  check(
    '@google/generative-ai is installed',
    packageInstalled('@google/generative-ai'),
    'Run: npm install @google/generative-ai'
  );
  
  check(
    '@supabase/supabase-js is installed',
    packageInstalled('@supabase/supabase-js'),
    'Run: npm install @supabase/supabase-js'
  );

  // ============================================================================
  // 3. Service Files Check
  // ============================================================================
  section('3. Required Service Files');
  
  check(
    'llmProviderService.js exists',
    fileExists('src/services/llmProviderService.js'),
    'File not found: src/services/llmProviderService.js'
  );
  
  check(
    'usageLimitService.js exists',
    fileExists('src/services/usageLimitService.js'),
    'File not found: src/services/usageLimitService.js'
  );
  
  check(
    'aiService.js exists',
    fileExists('src/services/aiService.js'),
    'File not found: src/services/aiService.js'
  );

  // ============================================================================
  // 4. Controller Files Check
  // ============================================================================
  section('4. Required Controller Files');
  
  check(
    'usageController.js exists',
    fileExists('src/controllers/usageController.js'),
    'File not found: src/controllers/usageController.js'
  );
  
  check(
    'gherkinController.js exists',
    fileExists('src/controllers/gherkinController.js'),
    'File not found: src/controllers/gherkinController.js'
  );

  // ============================================================================
  // 5. Middleware Files Check
  // ============================================================================
  section('5. Required Middleware Files');
  
  check(
    'usageLimitMiddleware.js exists',
    fileExists('src/middleware/usageLimitMiddleware.js'),
    'File not found: src/middleware/usageLimitMiddleware.js'
  );

  // ============================================================================
  // 6. Migration Files Check
  // ============================================================================
  section('6. Migration Files');
  
  check(
    'add-llm-usage-limit-system.sql exists',
    fileExists('migrations/add-llm-usage-limit-system.sql'),
    'File not found: migrations/add-llm-usage-limit-system.sql'
  );

  // ============================================================================
  // 7. Test Files Check
  // ============================================================================
  section('7. Test Files');
  
  const testFiles = [
    'src/services/__tests__/llmProviderService.test.js',
    'src/services/__tests__/llmProviderService.providerRouting.property.test.js',
    'src/services/__tests__/usageLimitService.test.js',
    'src/services/__tests__/usageLimitService.counterIsolation.property.test.js',
    'src/middleware/__tests__/usageLimitMiddleware.test.js',
    'src/controllers/__tests__/usageController.test.js',
  ];
  
  let testFilesFound = 0;
  testFiles.forEach(testFile => {
    if (fileExists(testFile)) {
      testFilesFound++;
    }
  });
  
  check(
    `Test files exist (${testFilesFound}/${testFiles.length})`,
    testFilesFound === testFiles.length,
    `Missing ${testFiles.length - testFilesFound} test files`
  );

  // ============================================================================
  // 8. Database Connection Check
  // ============================================================================
  section('8. Database Connection');
  
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    // Try to query a simple table
    const { data, error } = await supabase
      .from('model_tiers')
      .select('count')
      .limit(1);
    
    if (error) {
      check(
        'Database connection',
        false,
        `Error: ${error.message}. Migration might not be run yet.`
      );
    } else {
      check(
        'Database connection',
        true
      );
      
      // Check if tables exist
      const { data: tiers, error: tiersError } = await supabase
        .from('model_tiers')
        .select('*');
      
      check(
        'model_tiers table exists and has data',
        !tiersError && tiers && tiers.length > 0,
        tiersError ? tiersError.message : 'Table exists but no data found. Run migration.'
      );
      
      const { data: models, error: modelsError } = await supabase
        .from('models')
        .select('*');
      
      check(
        'models table exists and has data',
        !modelsError && models && models.length > 0,
        modelsError ? modelsError.message : 'Table exists but no data found. Run migration.'
      );
    }
  } catch (error) {
    check(
      'Database connection',
      false,
      `Error: ${error.message}`
    );
  }

  // ============================================================================
  // Summary
  // ============================================================================
  section('Summary');
  
  const percentage = Math.round((passedChecks / totalChecks) * 100);
  log(`\nPassed: ${passedChecks}/${totalChecks} checks (${percentage}%)`, 
      percentage === 100 ? 'green' : 'yellow');
  
  if (percentage === 100) {
    log(`\n${checkmark} System is ready for deployment!`, 'green');
    log('\nNext steps:', 'cyan');
    log('1. Run migration in Supabase Dashboard (if not done yet)', 'cyan');
    log('2. Update Railway environment variables with GEMINI_API_KEY', 'cyan');
    log('3. Deploy to Railway', 'cyan');
    log('4. Test API endpoints', 'cyan');
    log('\nSee QUICK-DEPLOYMENT-CHECKLIST.md for details\n', 'cyan');
    process.exit(0);
  } else {
    log(`\n${crossmark} System is NOT ready for deployment`, 'red');
    log('Please fix the issues above before deploying\n', 'yellow');
    process.exit(1);
  }
}

main().catch(error => {
  log(`\n${crossmark} Error running readiness check:`, 'red');
  log(error.message, 'red');
  process.exit(1);
});
