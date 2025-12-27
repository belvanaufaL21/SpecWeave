# Setup JIRA Tables

## Problem
JIRA connection failing with 401 "Invalid or expired token" because the required database tables don't exist yet.

## Root Cause
The backend API tries to access `jira_connections` table and other JIRA-related tables that haven't been created in the database yet.

## Solution
Run the `add_jira_tables_complete.sql` file to create all necessary JIRA tables.

## Tables to be Created

### 1. **jira_connections**
- Stores JIRA connection configurations
- Handles both API token and OAuth authentication
- Encrypted credentials storage

### 2. **epic_contexts** 
- Stores Epic context for user sessions
- Links scenarios to JIRA Epics
- Session-based context management

### 3. **scenarios**
- Main table for generated Gherkin scenarios
- Links to JIRA Epic and User Story IDs
- Quality metrics and generation data

### 4. **templates**
- User story templates
- System and custom templates
- Usage tracking

### 5. **users**
- Basic user information
- User preferences
- Role management

## Setup Instructions

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the content from `basis-data/add_jira_tables_complete.sql`
4. Click "Run" to execute the SQL

### Option 2: Command Line (if you have direct DB access)
```bash
# If using SQLite locally
sqlite3 your_database.db < basis-data/add_jira_tables_complete.sql

# If using PostgreSQL
psql -d your_database -f basis-data/add_jira_tables_complete.sql
```

### Option 3: Migration Script
```javascript
// If you have a migration system
npm run migrate:up
# or
yarn migrate:up
```

## Verification

After running the SQL, verify the tables were created:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'jira_connections',
  'epic_contexts', 
  'scenarios',
  'templates',
  'users'
);

-- Check jira_connections table structure
\d jira_connections;

-- Test insert (optional)
INSERT INTO jira_connections (
  user_id, 
  jira_url, 
  email, 
  project_key
) VALUES (
  'test-user-id',
  'https://test.atlassian.net',
  'test@example.com',
  'TEST'
);
```

## Expected Results

After creating the tables:
- ✅ JIRA connection setup should work without 401 errors
- ✅ Backend can store JIRA configurations
- ✅ Epic context can be saved and retrieved
- ✅ Scenarios can be linked to JIRA items
- ✅ User templates can be managed

## Security Notes

The SQL file includes:
- Proper foreign key constraints
- Indexes for performance
- Triggers for automatic timestamp updates
- Check constraints for data validation
- Encrypted field placeholders (encryption handled at app level)

## Next Steps

1. **Run the SQL file** to create tables
2. **Test JIRA connection** setup again
3. **Verify** that 401 errors are resolved
4. **Configure** JIRA integration in the app

## Files Involved
- `basis-data/add_jira_tables_complete.sql` - Main SQL file to run
- Backend API endpoints that depend on these tables
- Frontend JIRA setup components

## Status: 🔄 PENDING EXECUTION

Run the SQL file to resolve the JIRA connection issues.