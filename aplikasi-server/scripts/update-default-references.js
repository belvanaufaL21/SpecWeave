/**
 * Script to update default reference templates with user stories
 * Run with: node scripts/update-default-references.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

import { supabaseAdmin as supabase } from '../src/config/supabase.js';

const USER_STORIES = {
  'Absensi Harian': 'Sebagai user, saya ingin melihat absensi harian agen agar saya tahu siapa yang aktif bekerja dan siapa yang absen setiap hari',
  'Agent Route Summary': 'Sebagai user, saya ingin melihat ringkasan rute harian agar dapat mengevaluasi efisiensi perjalanan dan distribusi tugas di lapangan'
};

async function updateDefaultReferences() {
  console.log('🚀 Starting update of default reference templates...\n');

  try {
    // Get all templates (references without user_id)
    const { data: templates, error: fetchError } = await supabase
      .from('scenario_references')
      .select('id, title, user_story')
      .is('user_id', null);

    if (fetchError) {
      throw new Error(`Failed to fetch templates: ${fetchError.message}`);
    }

    console.log(`📋 Found ${templates.length} template(s) in database\n`);

    // Update each template
    let updatedCount = 0;
    let skippedCount = 0;

    for (const template of templates) {
      const userStory = USER_STORIES[template.title];

      if (!userStory) {
        console.log(`⏭️  Skipping "${template.title}" - No user story defined`);
        skippedCount++;
        continue;
      }

      if (template.user_story) {
        console.log(`⏭️  Skipping "${template.title}" - Already has user story`);
        skippedCount++;
        continue;
      }

      // Update the template
      const { error: updateError } = await supabase
        .from('scenario_references')
        .update({ user_story: userStory })
        .eq('id', template.id);

      if (updateError) {
        console.error(`❌ Failed to update "${template.title}": ${updateError.message}`);
        continue;
      }

      console.log(`✅ Updated "${template.title}"`);
      console.log(`   User Story: ${userStory.substring(0, 60)}...\n`);
      updatedCount++;
    }

    // Show summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total templates: ${templates.length}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log('='.repeat(60));

    // Verify the updates
    console.log('\n🔍 Verifying updates...\n');

    const { data: verifyData, error: verifyError } = await supabase
      .from('scenario_references')
      .select('id, title, user_story')
      .is('user_id', null)
      .order('title');

    if (verifyError) {
      throw new Error(`Failed to verify: ${verifyError.message}`);
    }

    console.log('Current state of templates:');
    verifyData.forEach(template => {
      const status = template.user_story ? '✓' : '✗';
      const preview = template.user_story 
        ? template.user_story.substring(0, 50) + '...'
        : 'No user story';
      console.log(`${status} ${template.title}: ${preview}`);
    });

    console.log('\n✨ Update completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Error during update:', error.message);
    process.exit(1);
  }
}

// Run the script
updateDefaultReferences();
