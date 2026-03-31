import { supabaseAdmin } from '../src/config/supabase.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function clearScenarioReferences() {
  try {
    console.log('🗑️  Starting to clear scenario_references table...\n');

    // Get count before deletion
    const { count: beforeCount, error: countError } = await supabaseAdmin
      .from('scenario_references')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw countError;
    }

    console.log(`📊 Current records in scenario_references: ${beforeCount}`);

    if (beforeCount === 0) {
      console.log('✅ Table is already empty. Nothing to delete.');
      return;
    }

    // Confirm deletion
    console.log(`\n⚠️  WARNING: This will delete ${beforeCount} records from scenario_references table.`);
    console.log('⚠️  This action cannot be undone!\n');

    // Delete all records
    const { error: deleteError } = await supabaseAdmin
      .from('scenario_references')
      .delete()
      .neq('id', 0); // Delete all records (neq with impossible condition)

    if (deleteError) {
      throw deleteError;
    }

    // Verify deletion
    const { count: afterCount, error: verifyError } = await supabaseAdmin
      .from('scenario_references')
      .select('*', { count: 'exact', head: true });

    if (verifyError) {
      throw verifyError;
    }

    console.log('✅ Deletion completed successfully!');
    console.log(`📊 Records deleted: ${beforeCount}`);
    console.log(`📊 Remaining records: ${afterCount}`);

    if (afterCount === 0) {
      console.log('\n🎉 All scenario references have been cleared!');
    } else {
      console.log(`\n⚠️  Warning: ${afterCount} records still remain in the table.`);
    }

  } catch (error) {
    console.error('❌ Error clearing scenario_references:', error);
    process.exit(1);
  }
}

// Run the script
clearScenarioReferences()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
