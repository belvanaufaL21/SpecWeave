import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkResetIssue() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         Debug: Usage Limit Reset Issue                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Check if functions exist by trying to call them
    console.log('📋 Step 1: Checking if database functions exist...\n');
    
    let functionsExist = false;
    try {
      // Try to call the function with dummy data to see if it exists
      const { error: funcError } = await supabase
        .rpc('get_remaining_requests', { 
          p_user_id: '00000000-0000-0000-0000-000000000000',
          p_model_id: '00000000-0000-0000-0000-000000000000'
        });
      
      // If no error about function not existing, it exists
      functionsExist = !funcError || !funcError.message.includes('function') && !funcError.message.includes('does not exist');
    } catch (err) {
      functionsExist = false;
    }

    if (!functionsExist) {
      console.log('❌ Function get_remaining_requests NOT FOUND');
      console.log('   → SQL migration has NOT been run in production!\n');
      console.log('🔧 SOLUTION:');
      console.log('   1. Open Supabase Dashboard → SQL Editor');
      console.log('   2. Copy SQL from: aplikasi-server/migrations/redesign-simple-limit-system.sql');
      console.log('   3. Run the SQL migration\n');
      return;
    } else {
      console.log('✅ Function get_remaining_requests exists\n');
    }

    // 2. Check if columns exist
    console.log('📋 Step 2: Checking if required columns exist...\n');
    
    const { data: models, error: modelsError } = await supabase
      .from('models')
      .select('id, name, display_name, daily_limit')
      .eq('is_active', true)
      .limit(1);

    if (modelsError || !models || models.length === 0) {
      console.log('❌ Cannot check models table:', modelsError?.message);
      return;
    }

    if (models[0].daily_limit === undefined) {
      console.log('❌ Column daily_limit NOT FOUND in models table');
      console.log('   → SQL migration has NOT been run!\n');
      return;
    } else {
      console.log('✅ Column daily_limit exists in models table\n');
    }

    // 3. Check usage_counters
    console.log('📋 Step 3: Checking usage_counters data...\n');
    
    const { data: counters, error: countersError } = await supabase
      .from('usage_counters')
      .select('user_id, model_id, request_count, last_reset_at')
      .limit(5);

    if (countersError) {
      console.log('❌ Error checking usage_counters:', countersError.message);
      return;
    }

    if (!counters || counters.length === 0) {
      console.log('⚠️  No usage data found (no users have made requests yet)\n');
    } else {
      console.log(`Found ${counters.length} usage records:\n`);
      
      for (const counter of counters) {
        const lastReset = counter.last_reset_at ? new Date(counter.last_reset_at) : null;
        const now = new Date();
        const daysDiff = lastReset ? Math.floor((now - lastReset) / (1000 * 60 * 60 * 24)) : null;
        
        console.log(`User: ${counter.user_id.substring(0, 8)}...`);
        console.log(`  Count: ${counter.request_count}`);
        console.log(`  Last Reset: ${lastReset ? lastReset.toISOString() : 'Never'}`);
        console.log(`  Days Since Reset: ${daysDiff !== null ? daysDiff : 'N/A'}`);
        console.log(`  Needs Reset: ${daysDiff !== null && daysDiff >= 1 ? '⚠️  YES' : '✅ No'}\n`);
      }
    }

    // 4. Check timezone - skip this check as it requires special permissions
    console.log('📋 Step 4: Checking database timezone...\n');
    console.log('⏭️  Skipping timezone check (requires admin permissions)\n');

    // 5. Test should_reset_daily_counter function
    console.log('📋 Step 5: Testing should_reset_daily_counter function...\n');
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { data: shouldResetYesterday, error: resetError1 } = await supabase
      .rpc('should_reset_daily_counter', { last_reset: yesterday.toISOString() });

    const { data: shouldResetNow, error: resetError2 } = await supabase
      .rpc('should_reset_daily_counter', { last_reset: new Date().toISOString() });

    if (resetError1 || resetError2) {
      console.log('❌ Error testing should_reset_daily_counter');
      console.log('   Error:', resetError1?.message || resetError2?.message);
      return;
    }

    console.log(`should_reset_daily_counter(yesterday): ${shouldResetYesterday ? '✅ true (correct)' : '❌ false (wrong!)'}`);
    console.log(`should_reset_daily_counter(now): ${!shouldResetNow ? '✅ false (correct)' : '❌ true (wrong!)'}\n`);

    // 6. Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 SUMMARY\n');
    
    const allGood = 
      functionsExist && 
      models[0].daily_limit !== undefined &&
      shouldResetYesterday === true &&
      shouldResetNow === false;

    if (allGood) {
      console.log('✅ All checks passed!');
      console.log('   The reset system should be working correctly.\n');
      console.log('🔍 If users still see old limits:');
      console.log('   1. Ask them to hard refresh (Ctrl+Shift+R)');
      console.log('   2. Check if they made requests today (triggers reset)');
      console.log('   3. Wait until midnight UTC for automatic reset\n');
      console.log('🛠️  Manual reset option:');
      console.log('   Run: node aplikasi-server/manual-reset-user.js <user-email>\n');
    } else {
      console.log('❌ Some checks failed!');
      console.log('   → SQL migration may not be complete');
      console.log('   → Run the migration in Supabase SQL Editor\n');
    }

    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

checkResetIssue();
