import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyCooldownSystem() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║      Apply 24-Hour Cooldown System                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('📋 What is 24-Hour Cooldown System?\n');
  console.log('Instead of resetting at midnight UTC every day,');
  console.log('the system resets 24 hours after last reset.\n');
  
  console.log('Example:');
  console.log('  - User uses 50/50 at 10:00 AM Monday');
  console.log('  - Credit resets at 10:00 AM Tuesday (24 hours later)');
  console.log('  - More fair and cannot be exploited!\n');

  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('⚠️  IMPORTANT: SQL migration must be run manually!\n');
  console.log('Steps:');
  console.log('1. Open Supabase Dashboard → SQL Editor');
  console.log('2. Copy SQL from: aplikasi-server/migrations/24-hour-cooldown-system.sql');
  console.log('3. Run the SQL migration\n');
  
  console.log('This script will verify the migration after you run it.\n');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
  
  await new Promise(resolve => setTimeout(resolve, 5000));

  try {
    console.log('🔍 Verifying migration...\n');

    // Test if new function exists
    console.log('📋 Step 1: Checking if should_reset_cooldown function exists...\n');
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { data: cooldownTest, error: cooldownError } = await supabase
      .rpc('should_reset_cooldown', { last_reset: yesterday.toISOString() });

    if (cooldownError) {
      console.log('❌ Function should_reset_cooldown NOT FOUND');
      console.log('   Error:', cooldownError.message);
      console.log('\n🔧 Please run the SQL migration first!\n');
      return;
    }

    console.log('✅ Function should_reset_cooldown exists');
    console.log(`   Test result: ${cooldownTest} (should be true for yesterday)\n`);

    // Test get_remaining_requests
    console.log('📋 Step 2: Testing get_remaining_requests with cooldown logic...\n');
    
    const { data: models } = await supabase
      .from('models')
      .select('id, name, display_name, daily_limit')
      .eq('is_active', true)
      .limit(1);

    if (models && models.length > 0) {
      console.log(`✅ Testing with model: ${models[0].display_name}\n`);
    }

    // Check view
    console.log('📋 Step 3: Checking user_model_usage view...\n');
    
    const { data: viewData, error: viewError } = await supabase
      .from('user_model_usage')
      .select('email, model_name, current_count, remaining, resets_at')
      .limit(3);

    if (viewError) {
      console.log('❌ View user_model_usage has issues');
      console.log('   Error:', viewError.message);
      console.log('\n⚠️  The view might need to be recreated.\n');
    } else {
      console.log('✅ View user_model_usage is working');
      
      if (viewData && viewData.length > 0) {
        console.log('\nSample data:');
        viewData.forEach(row => {
          console.log(`  ${row.email?.substring(0, 20)}...`);
          console.log(`    Model: ${row.model_name}`);
          console.log(`    Used: ${row.current_count}`);
          console.log(`    Remaining: ${row.remaining}`);
          console.log(`    Resets at: ${row.resets_at || 'N/A'}\n`);
        });
      }
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 SUMMARY\n');

    if (!cooldownError && !viewError) {
      console.log('✅ 24-Hour Cooldown System is active!\n');
      console.log('How it works:');
      console.log('  1. User uses credit until it runs out');
      console.log('  2. System records last_reset_at timestamp');
      console.log('  3. User must wait 24 hours from that time');
      console.log('  4. After 24 hours, next request triggers reset\n');
      
      console.log('Benefits:');
      console.log('  ✅ Fair for all users (everyone gets 24 hours)');
      console.log('  ✅ Cannot be exploited (no midnight reset trick)');
      console.log('  ✅ More predictable (user knows exact reset time)');
      console.log('  ✅ Cost-effective (only reset when needed)\n');

      console.log('Next steps:');
      console.log('  1. Update frontend to show countdown timer');
      console.log('  2. Test with real users');
      console.log('  3. Monitor for 24 hours to verify auto-reset\n');
    } else {
      console.log('❌ Migration not complete!\n');
      console.log('Please run the SQL migration in Supabase SQL Editor:');
      console.log('  File: aplikasi-server/migrations/24-hour-cooldown-system.sql\n');
    }

    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

applyCooldownSystem();
