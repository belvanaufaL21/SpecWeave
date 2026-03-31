# Database Schema Migration for METEOR and Sentence-BERT Testing

This directory contains the database schema migration files for implementing METEOR and Sentence-BERT testing functionality.

## Requirements

- **8.4**: Support for both METEOR and Sentence-BERT test result storage
- **3.4**: Data persistence for scenario references and test results

## Migration Files

### 1. Core Migration Files

- **`meteor_sentence_bert_testing_schema.sql`** - Complete migration script to run in Supabase
- **`001_create_test_results_table.sql`** - Individual migration for test_results table
- **`002_create_scenario_references_table.sql`** - Individual migration for scenario_references table (optional)

### 2. Test Files

- **`test_database_operations.sql`** - SQL script to test database operations
- **`test_database_node.js`** - Node.js script to test database operations programmatically

## Database Schema

### test_results Table

Stores METEOR and Sentence-BERT test results for scenario evaluation.

```sql
CREATE TABLE test_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scenario_id TEXT NOT NULL,
  test_type TEXT NOT NULL CHECK (test_type IN ('meteor', 'sentence_bert')),
  score DECIMAL(5,3) NOT NULL,
  generated_text TEXT NOT NULL,
  reference_text TEXT NOT NULL,
  test_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, scenario_id, test_type)
);
```

**Key Features:**
- Supports both METEOR and Sentence-BERT test types
- Unique constraint per user, scenario, and test type
- JSONB field for flexible test metadata storage
- Automatic timestamps with update triggers
- Row Level Security (RLS) enabled

### scenario_references Table (Optional)

Stores reusable reference scenarios for future enhancement.

```sql
CREATE TABLE scenario_references (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reference_text TEXT NOT NULL,
  description TEXT,
  tags TEXT[],
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Key Features:**
- Reusable reference scenarios
- Tagging system for categorization
- Usage tracking
- Full-text search capabilities
- Row Level Security (RLS) enabled

## Installation Instructions

### Option 1: Complete Migration (Recommended)

Run the complete migration script in Supabase SQL Editor:

```sql
-- Copy and paste the contents of meteor_sentence_bert_testing_schema.sql
-- into Supabase SQL Editor and execute
```

### Option 2: Individual Migrations

Run migrations individually:

1. **test_results table:**
   ```sql
   -- Run 001_create_test_results_table.sql
   ```

2. **scenario_references table (optional):**
   ```sql
   -- Run 002_create_scenario_references_table.sql
   ```

## Testing the Migration

### SQL Testing

Run the SQL test script in Supabase:

```sql
-- Copy and paste the contents of test_database_operations.sql
-- into Supabase SQL Editor and execute
```

### Node.js Testing

1. **Install dependencies:**
   ```bash
   npm install @supabase/supabase-js
   ```

2. **Set environment variables:**
   ```bash
   export SUPABASE_URL="your-supabase-url"
   export SUPABASE_ANON_KEY="your-supabase-anon-key"
   ```

3. **Run the test:**
   ```bash
   node test_database_node.js
   ```

## Performance Optimizations

### Indexes Created

**test_results table:**
- `idx_test_results_user_scenario` - Composite index for user + scenario queries
- `idx_test_results_user_id` - User-based queries
- `idx_test_results_scenario_id` - Scenario-based queries
- `idx_test_results_test_type` - Test type filtering
- `idx_test_results_created_at` - Time-based ordering
- `idx_test_results_user_test_type` - User + test type queries

**scenario_references table:**
- `idx_scenario_references_user_id` - User-based queries
- `idx_scenario_references_created_at` - Time-based ordering
- `idx_scenario_references_usage_count` - Usage-based ordering
- `idx_scenario_references_text_search` - Full-text search
- `idx_scenario_references_tags` - Tag-based filtering

## Security Features

### Row Level Security (RLS)

Both tables have RLS enabled with policies that ensure:
- Users can only access their own data
- Full CRUD operations are allowed for own data
- No cross-user data access

### Data Validation

- **test_type constraint**: Only 'meteor' and 'sentence_bert' values allowed
- **score precision**: DECIMAL(5,3) for consistent score formatting
- **unique constraints**: Prevent duplicate test results per scenario per user per test type

## Usage Examples

### Insert Test Result

```javascript
const { data, error } = await supabase
  .from('test_results')
  .insert([{
    user_id: userId,
    scenario_id: 'scenario-123',
    test_type: 'meteor',
    score: 0.856,
    generated_text: 'Given I am a user...',
    reference_text: 'Given I am a registered user...',
    test_details: {
      method: 'METEOR',
      generated_tokens: 12,
      reference_tokens: 15
    }
  }]);
```

### Query Test Results

```javascript
const { data, error } = await supabase
  .from('test_results')
  .select('*')
  .eq('user_id', userId)
  .eq('scenario_id', scenarioId)
  .order('created_at', { ascending: false });
```

### Insert Scenario Reference

```javascript
const { data, error } = await supabase
  .from('scenario_references')
  .insert([{
    user_id: userId,
    reference_text: 'Given I am a registered user...',
    description: 'Standard login scenario',
    tags: ['login', 'authentication']
  }]);
```

## Rollback Instructions

If you need to rollback the migration:

```sql
-- Drop tables (this will delete all data!)
DROP TABLE IF EXISTS test_results CASCADE;
DROP TABLE IF EXISTS scenario_references CASCADE;

-- Drop trigger functions
DROP FUNCTION IF EXISTS update_test_results_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_scenario_references_updated_at() CASCADE;
```

## Next Steps

After running the migration:

1. **Verify the tables exist** using the verification queries in the migration script
2. **Run the test scripts** to ensure everything works correctly
3. **Update your application code** to use the new tables
4. **Implement the backend API endpoints** that will interact with these tables

## Support

If you encounter any issues with the migration:

1. Check the Supabase logs for detailed error messages
2. Verify your user has the necessary permissions
3. Ensure all dependencies (auth.users table) exist
4. Run the test scripts to isolate the issue