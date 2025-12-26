// Check existing database structure
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'basis-data', 'specweave.db');

try {
  console.log('🔍 Checking database structure...\n');
  
  const db = new Database(dbPath);
  
  // Get all tables
  const tables = db.prepare(`
    SELECT name, type FROM sqlite_master 
    WHERE type='table' 
    ORDER BY name
  `).all();

  console.log('📋 Existing tables:');
  if (tables.length === 0) {
    console.log('   ⚠️  No tables found');
  } else {
    tables.forEach(table => {
      console.log(`   ✅ ${table.name}`);
      
      // Show table structure
      const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
      console.log(`      Columns: ${columns.map(col => `${col.name}(${col.type})`).join(', ')}`);
    });
  }

  // Get all indexes
  console.log('\n📋 Existing indexes:');
  const indexes = db.prepare(`
    SELECT name, tbl_name FROM sqlite_master 
    WHERE type='index' AND name NOT LIKE 'sqlite_%'
    ORDER BY tbl_name, name
  `).all();

  if (indexes.length === 0) {
    console.log('   ⚠️  No custom indexes found');
  } else {
    indexes.forEach(index => {
      console.log(`   ✅ ${index.name} (on ${index.tbl_name})`);
    });
  }

  db.close();
  console.log('\n✨ Database check completed!');

} catch (error) {
  console.error('💥 Error checking database:', error);
}