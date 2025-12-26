// Debug migration script to see what statements are parsed
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sqlPath = join(__dirname, '..', 'basis-data', 'add_jira_tables_complete.sql');

try {
  console.log('🔍 Debugging SQL parsing...\n');
  
  // Read SQL file
  const sql = readFileSync(sqlPath, 'utf8');
  console.log('📄 SQL file length:', sql.length, 'characters');

  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('PRAGMA'))
    .filter(stmt => !stmt.match(/^(BEGIN|COMMIT|END)$/i));

  console.log(`🔄 Found ${statements.length} statements:\n`);

  statements.forEach((statement, index) => {
    const type = statement.match(/^(CREATE TABLE|CREATE INDEX|CREATE TRIGGER|ALTER TABLE)/i)?.[1] || 'OTHER';
    const name = statement.match(/(?:CREATE TABLE|CREATE INDEX|CREATE TRIGGER|ALTER TABLE)[^(]*?(\w+)/i)?.[1] || 'unknown';
    
    console.log(`${index + 1}. ${type}: ${name}`);
    console.log(`   First 100 chars: ${statement.substring(0, 100)}...`);
    console.log('');
  });

} catch (error) {
  console.error('💥 Error:', error);
}