import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function manualResetUser() {
  const userEmail = process.argv[2];

  if (!userEmail) {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║           Manual Reset User Usage Limits                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log('Usage: node manual-reset-user.js <user-email>\n');
    console.log('Example:');
    console.log('  node manual-reset-user.js user@example.com\n');
    console.log('To reset ALL users:');
    console.log('  node manual-reset-user.js --all\n');
    process.exit(1);
  }

  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║           Manual Reset User Usage Limits                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    if (userEmail === '--all') {
      console.log('⚠️  WARNING: You are about to reset ALL users!\n');
      console.log('This will:');
      console.log('  - Reset all usage counters to 0');
      console.log('  - Set last_reset_at to NOW()');
      console.log('  - Affect ALL users in the system\n');
      console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
      
      await new Promise(resolve => setTimeout(resolve, 5000));

      const { data, error } = await supabase
        .from('usage_counters')
        .update({ 
          request_count: 0, 
          last_reset_at: new Date().toISOString() 
        })
        .neq('user_id', '00000000-0000-0000-0000-000000000000'); // Update all

      if (error) {
        console.log('❌ Error resetting all users:', error.message);
        process.exit(1);
      }

      console.log('✅ Successfully reset ALL users!');
      console.log(`   Updated ${data?.length || 0} usage records\n`);
      
    } else {
      // Reset specific user
      console.log(`🔍 Looking for user: ${userEmail}\n`);

      // Get user ID
      const { data: user, error: userError } = await supabase
        .from('auth.users')
        .select('id, email')
        .eq('email', userEmail)
        .single();

      if (userError || !user) {
        console.log('❌ User not found:', userEmail);
        console.log('   Make sure the email is correct\n');
        process.exit(1);
      }

      console.log(`✅ Found user: ${user.email}`);
      console.log(`   User ID: ${user.id}\n`);

      // Get current usage
      console.log('📊 Current usage:\n');
      
      const { data: currentUsage, error: usageError } = await supabase
        .from('usage_counters')
        .select(`
          request_count,
          last_reset_at,
          models (
            display_name,
            daily_limit
          )
        `)
        .eq('user_id', user.id);

      if (usageError) {
        console.log('⚠️  Error fetching current usage:', usageError.message);
      } else if (!currentUsage || currentUsage.length === 0) {
        console.log('⚠️  No usage records found for this user');
        console.log('   (User has not made any requests yet)\n');
      } else {
        currentUsage.forEach(record => {
          const model = record.models;
          const remaining = model.daily_limit - record.request_count;
          console.log(`  ${model.display_name}:`);
          console.log(`    Used: ${record.request_count}/${model.daily_limit}`);
          console.log(`    Remaining: ${remaining}`);
          console.log(`    Last Reset: ${record.last_reset_at || 'Never'}\n`);
        });
      }

      // Reset usage
      console.log('🔄 Resetting usage counters...\n');

      const { data: resetData, error: resetError } = await supabase
        .from('usage_counters')
        .update({ 
          request_count: 0, 
          last_reset_at: new Date().toISOString() 
        })
        .eq('user_id', user.id)
        .select();

      if (resetError) {
        console.log('❌ Error resetting usage:', resetError.message);
        process.exit(1);
      }

      console.log(`✅ Successfully reset usage for ${user.email}!`);
      console.log(`   Reset ${resetData?.length || 0} model counters\n`);

      // Show new usage
      console.log('📊 New usage (after reset):\n');
      
      const { data: newUsage } = await supabase
        .from('usage_counters')
        .select(`
          request_count,
          last_reset_at,
          models (
            display_name,
            daily_limit
          )
        `)
        .eq('user_id', user.id);

      if (newUsage && newUsage.length > 0) {
        newUsage.forEach(record => {
          const model = record.models;
          console.log(`  ${model.display_name}:`);
          console.log(`    Used: ${record.request_count}/${model.daily_limit}`);
          console.log(`    Remaining: ${model.daily_limit}`);
          console.log(`    Last Reset: ${record.last_reset_at}\n`);
        });
      }
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Reset complete!');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('📝 Next steps:');
    console.log('  1. Ask user to refresh their browser (Ctrl+Shift+R)');
    console.log('  2. User should see full limits restored');
    console.log('  3. Limits will auto-reset daily at midnight UTC\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

manualResetUser();
