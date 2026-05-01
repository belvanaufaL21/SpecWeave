# Sequence Diagram - Aplikasi SpecWeave

Dokumentasi sequence diagram untuk fitur-fitur utama aplikasi SpecWeave.

## 1. Manajemen Template User Story

```mermaid
sequenceDiagram
    actor User
    participant UI as Frontend UI
    participant API as API Server
    participant DB as Supabase DB
    
    Note over User,DB: Melihat Template & References
    User->>UI: Buka halaman Reference Library
    UI->>API: GET /api/references
    API->>DB: Query scenario_references
    DB-->>API: Return templates + user references
    API->>DB: Query user_hidden_templates
    DB-->>API: Return hidden template IDs
    API-->>UI: Filter & return visible references
    UI-->>User: Tampilkan list references
    
    Note over User,DB: Membuat Reference Baru
    User->>UI: Klik "Add New Reference"
    User->>UI: Input title & Gherkin content
    UI->>API: POST /api/references
    API->>DB: INSERT into scenario_references
    DB-->>API: Return created reference
    API-->>UI: Success response
    UI-->>User: Tampilkan reference baru
    
    Note over User,DB: Edit Reference (User's Own)
    User->>UI: Klik edit pada reference
    User->>UI: Ubah title/content
    UI->>API: PUT /api/references/:id
    API->>DB: Check ownership (user_id)
    alt User owns reference
        DB-->>API: Ownership confirmed
        API->>DB: UPDATE scenario_references
        DB-->>API: Return updated reference
        API-->>UI: Success response
        UI-->>User: Tampilkan perubahan
    else Template (cannot edit)
        DB-->>API: user_id is null (template)
        API-->>UI: Error: Cannot edit template
        UI-->>User: Suggest to copy template
    end
    
    Note over User,DB: Hide/Delete Reference
    User->>UI: Klik delete pada reference
    UI->>API: DELETE /api/references/:id
    API->>DB: Check if template (user_id is null)
    alt Is Template
        DB-->>API: user_id is null
        API->>DB: INSERT into user_hidden_templates
        DB-->>API: Template hidden
        API-->>UI: Success: Template hidden
        UI-->>User: Remove from list
    else User's Reference
        DB-->>API: user_id matches
        API->>DB: DELETE from scenario_references
        DB-->>API: Reference deleted
        API-->>UI: Success: Reference deleted
        UI-->>User: Remove from list
    end
```

## 2. Koneksi JIRA Project

```mermaid
sequenceDiagram
    actor User
    participant UI as Frontend UI
    participant API as API Server
    participant JIRA as JIRA API
    participant DB as Supabase DB
    
    Note over User,DB: Test Connection (Before Save)
    User->>UI: Input JIRA credentials
    User->>UI: Klik "Test Connection"
    UI->>API: POST /api/jira/test-connection
    API->>JIRA: GET /rest/api/3/project/{projectKey}
    alt Connection Success
        JIRA-->>API: Project data
        API-->>UI: Success + project info
        UI-->>User: ✓ Connection successful
    else Connection Failed
        JIRA-->>API: Error (401/403/404)
        API-->>UI: Error message
        UI-->>User: ✗ Connection failed
    end
    
    Note over User,DB: Create Connection
    User->>UI: Klik "Save Connection"
    UI->>API: POST /api/jira/connections
    API->>DB: INSERT into jira_connections
    DB-->>API: Return connection ID
    API-->>UI: Success + connection data
    UI-->>User: Connection saved
    
    Note over User,DB: Get User Connections
    User->>UI: Buka JIRA settings
    UI->>API: GET /api/jira/connections
    API->>DB: Query jira_connections WHERE user_id
    DB-->>API: Return user's connections
    API-->>UI: List of connections
    UI-->>User: Tampilkan connections
    
    Note over User,DB: Health Check
    User->>UI: Klik "Check Health"
    UI->>API: GET /api/jira/connections/:id/health
    API->>DB: Get connection details
    DB-->>API: Connection credentials
    API->>JIRA: GET /rest/api/3/project/{projectKey}
    alt Healthy
        JIRA-->>API: Success response
        API-->>UI: healthy: true
        UI-->>User: ✓ Connection healthy
    else Unhealthy
        JIRA-->>API: Error response
        API-->>UI: healthy: false + error
        UI-->>User: ✗ Connection issues
    end
    
    Note over User,DB: Delete Connection
    User->>UI: Klik "Delete Connection"
    UI->>API: DELETE /api/jira/connections/:id
    API->>DB: DELETE WHERE id AND user_id
    DB-->>API: Connection deleted
    API-->>UI: Success
    UI-->>User: Connection removed
```

## 3. Pemilihan Epic JIRA

```mermaid
sequenceDiagram
    actor User
    participant UI as Frontend UI
    participant API as API Server
    participant JIRA as JIRA API
    participant Cache as Epic Context Cache
    participant DB as Supabase DB
    
    Note over User,DB: Get Available Epics
    User->>UI: Pilih JIRA connection
    UI->>API: GET /api/jira/connections/:id/projects/:key/epics
    API->>DB: Get connection credentials
    DB-->>API: Connection data
    
    API->>JIRA: POST /rest/api/3/search/jql
    Note right of API: JQL: project = KEY AND issuetype = Epic
    
    alt Epics Found
        JIRA-->>API: List of Epic issues
        API->>API: Filter & map Epic data
        API-->>UI: Array of Epics
        UI-->>User: Tampilkan Epic list
    else No Epics
        JIRA-->>API: Empty result
        API-->>UI: Empty array + metadata
        UI-->>User: "No Epics found"
    end
    
    Note over User,DB: Select Epic (Set Context)
    User->>UI: Pilih Epic dari list
    UI->>API: POST /api/epic/set-context
    API->>Cache: Store epic context in memory
    Note right of Cache: {<br/>  epicId,<br/>  connectionId,<br/>  epicData<br/>}
    Cache-->>API: Context saved
    API-->>UI: Success
    UI-->>User: Epic selected ✓
    
    Note over User,DB: Get Current Epic Context
    User->>UI: Load chat/generation page
    UI->>API: GET /api/epic/context
    API->>Cache: Retrieve epic context
    alt Context Exists
        Cache-->>API: Epic context data
        API-->>UI: Epic info
        UI-->>User: Show Epic banner
    else No Context
        Cache-->>API: null
        API-->>UI: No context
        UI-->>User: Show "Select Epic" prompt
    end
    
    Note over User,DB: Validate Epic Access
    User->>UI: Verify Epic permissions
    UI->>API: GET /api/jira/connections/:id/epics/:epicId/validate
    API->>DB: Get connection
    DB-->>API: Connection data
    API->>JIRA: GET /rest/api/3/issue/{epicId}
    alt Access Granted
        JIRA-->>API: Epic details
        API-->>UI: Valid + Epic data
        UI-->>User: ✓ Access confirmed
    else Access Denied
        JIRA-->>API: 403/404 Error
        API-->>UI: Invalid + error
        UI-->>User: ✗ No access
    end
    
    Note over User,DB: Clear Epic Context
    User->>UI: Klik "Change Epic"
    UI->>API: DELETE /api/epic/context
    API->>Cache: Clear epic context
    Cache-->>API: Cleared
    API-->>UI: Success
    UI-->>User: Context cleared
```

## 4. Manajemen Reference Library / Few-shot

```mermaid
sequenceDiagram
    actor User
    participant UI as Frontend UI
    participant API as API Server
    participant AI as AI Service
    participant DB as Supabase DB
    
    Note over User,DB: Auto-Select References (Few-shot)
    User->>UI: Input user story
    UI->>UI: Analyze user story keywords
    UI->>API: POST /api/gherkin/generate
    Note right of UI: Include: userStory, options.referenceData
    
    API->>DB: Query scenario_references
    DB-->>API: All available references
    API->>AI: Calculate cosine similarity
    Note right of AI: Compare user story with references
    AI-->>API: Top 3 similar references
    
    API->>AI: Generate Gherkin with few-shot
    Note right of AI: Prompt includes:<br/>- User story<br/>- Top 3 references as examples
    AI-->>API: Generated Gherkin
    
    API->>DB: Save scenario with reference IDs
    DB-->>API: Scenario saved
    
    API-->>UI: Gherkin + usedReferences[]
    UI-->>User: Show result + references used
    
    Note over User,DB: Manual Reference Selection
    User->>UI: Toggle "Manual Selection"
    UI->>API: GET /api/references
    API->>DB: Query scenario_references
    DB-->>API: All references
    API-->>UI: Reference list
    UI-->>User: Show reference picker
    
    User->>UI: Select specific references
    User->>UI: Klik "Generate"
    UI->>API: POST /api/gherkin/generate
    Note right of UI: Include: selectedReferenceIds[]
    
    API->>DB: Get selected references
    DB-->>API: Reference content
    API->>AI: Generate with selected references
    AI-->>API: Generated Gherkin
    API-->>UI: Result
    UI-->>User: Show generated Gherkin
    
    Note over User,DB: Track Reference Usage
    User->>UI: Generate with references
    UI->>API: POST /api/gherkin/generate
    API->>AI: Generate Gherkin
    AI-->>API: Result + METEOR score
    
    loop For each used reference
        API->>API: POST /api/references/:id/increment-usage
        API->>DB: UPDATE usage_count, average_score
        Note right of DB: Running average calculation
        DB-->>API: Updated stats
    end
    
    API-->>UI: Generation complete
    UI-->>User: Show result
```

## 5. Manajemen Profile

```mermaid
sequenceDiagram
    actor User
    participant UI as Profile Page
    participant API as API Server
    participant Auth as Auth Service
    participant DB as Supabase DB
    
    Note over User,DB: Load Profile
    User->>UI: Buka halaman Profile
    UI->>Auth: Get current user
    Auth-->>UI: User data (id, email, name, avatar)
    UI->>API: GET /api/user/stats
    API->>DB: Query user statistics
    Note right of DB: - Total chats<br/>- Total scenarios<br/>- Total exports
    DB-->>API: Stats data
    API-->>UI: User stats
    UI-->>User: Display profile + stats
    
    Note over User,DB: Edit Profile Name
    User->>UI: Klik "Edit Profile"
    UI->>UI: Enable edit mode
    User->>UI: Ubah nama
    User->>UI: Klik "Save Changes"
    UI->>API: PUT /api/user/profile
    API->>DB: UPDATE users SET name = ?
    DB-->>API: Updated user
    API->>Auth: Update auth session
    Auth-->>API: Session updated
    API-->>UI: Success
    UI-->>User: Profile updated ✓
    
    Note over User,DB: Change Avatar
    User->>UI: Klik avatar edit button
    UI->>UI: Open AvatarPicker modal
    UI-->>User: Show emoji categories
    
    User->>UI: Pilih category (Smileys, Animals, etc)
    UI-->>User: Show emojis in category
    
    User->>UI: Pilih emoji
    UI->>UI: Preview selected emoji
    User->>UI: Klik "Save"
    
    UI->>API: PUT /api/user/profile
    Note right of UI: { avatar: "🎨" }
    API->>DB: UPDATE users SET avatar = ?
    DB-->>API: Updated user
    API-->>UI: Success
    UI->>UI: Close modal
    UI-->>User: Avatar updated ✓
    
    Note over User,DB: View Usage Stats
    User->>UI: Scroll to stats section
    UI->>API: GET /api/user/stats/detailed
    API->>DB: Query multiple tables
    Note right of DB: - gherkin_scenarios<br/>- chat_history<br/>- jira_exports
    DB-->>API: Detailed stats
    API-->>UI: Stats breakdown
    UI-->>User: Display stats with gradients
```

## 6. Generasi Output (KRUSIAL)

```mermaid
sequenceDiagram
    actor User
    participant UI as Chat Interface
    participant API as Gherkin Controller
    participant Limit as Usage Limit Service
    participant LLM as LLM Provider Service
    participant AI as AI Service (OpenAI/Groq)
    participant Ref as Reference Service
    participant Meteor as METEOR Service
    participant DB as Supabase DB
    
    Note over User,DB: Preparation Phase
    User->>UI: Input user story (Connextra format)
    User->>UI: Select model (GPT-4/Groq)
    User->>UI: Toggle auto-reference ON
    User->>UI: Klik "Generate"
    
    UI->>API: POST /api/gherkin/generate
    Note right of UI: {<br/>  userStory,<br/>  evaluateQuality: true,<br/>  options: { referenceData }<br/>}
    
    Note over User,DB: Validation & Limit Check
    API->>API: Validate user story format
    alt Invalid format
        API-->>UI: Error: Invalid format
        UI-->>User: Show error message
    end
    
    API->>Limit: Check usage limit
    Limit->>DB: Query llm_usage_limits
    DB-->>Limit: Current usage count
    alt Limit exceeded
        Limit-->>API: Error: Limit exceeded
        API-->>UI: Error message
        UI-->>User: "Limit reached, upgrade plan"
    end
    
    Note over User,DB: Reference Selection (Few-shot)
    API->>Ref: Get similar references
    Ref->>DB: Query scenario_references
    DB-->>Ref: All references
    Ref->>Ref: Calculate cosine similarity
    Ref-->>API: Top 3 references
    
    Note over User,DB: LLM Generation
    API->>LLM: Route to provider
    Note right of LLM: Based on user's model selection
    
    alt GPT-4 Selected
        LLM->>AI: Call OpenAI API
        Note right of AI: Model: gpt-4-turbo
    else Groq Selected
        LLM->>AI: Call Groq API
        Note right of AI: Model: llama-3.1-70b
    end
    
    AI->>AI: Generate Gherkin scenarios
    Note right of AI: Prompt includes:<br/>- User story<br/>- Few-shot examples<br/>- Format instructions
    
    AI-->>LLM: Generated Gherkin JSON
    LLM-->>API: Gherkin content
    
    Note over User,DB: Quality Evaluation (METEOR)
    API->>Meteor: Evaluate quality
    Meteor->>Meteor: Extract scenario text
    Meteor->>Meteor: Generate reference text
    Meteor->>Meteor: Calculate METEOR score
    Note right of Meteor: Metrics:<br/>- Precision<br/>- Recall<br/>- F-mean<br/>- Fragmentation
    Meteor-->>API: METEOR metrics
    
    API->>API: Assess quality level
    Note right of API: Excellent: >0.7<br/>Good: 0.5-0.7<br/>Fair: 0.3-0.5<br/>Poor: <0.3
    
    Note over User,DB: Save & Update Usage
    API->>DB: INSERT into gherkin_scenarios
    Note right of DB: Save:<br/>- Gherkin content<br/>- METEOR score<br/>- Reference IDs<br/>- Generation time
    DB-->>API: Scenario ID
    
    API->>Limit: Increment usage count
    Limit->>DB: UPDATE llm_usage_limits
    DB-->>Limit: New count
    Limit-->>API: Remaining quota
    
    API->>DB: Log evaluation metrics
    DB-->>API: Logged
    
    loop For each reference used
        API->>Ref: Increment usage
        Ref->>DB: UPDATE reference usage_count
        DB-->>Ref: Updated
    end
    
    Note over User,DB: Response to User
    API-->>UI: Complete response
    Note right of API: {<br/>  gherkin,<br/>  quality_metrics,<br/>  usedReferences,<br/>  usage: { remaining, limit }<br/>}
    
    UI->>UI: Parse & format Gherkin
    UI->>UI: Display quality badge
    UI->>UI: Show used references
    UI->>UI: Update usage indicator
    UI-->>User: Show generated scenarios
    
    alt Quality Poor (<0.3)
        UI-->>User: Warning: Low quality, regenerate?
    else Quality Good
        UI-->>User: ✓ Quality acceptable
    end
```

## 7. Export JIRA (KRUSIAL)

```mermaid
sequenceDiagram
    actor User
    participant UI as Chat Interface
    participant Export as JiraStoryService
    participant API as JIRA Controller
    participant JIRA as JIRA API
    participant Epic as Epic Service
    participant DB as Supabase DB
    
    Note over User,DB: Pre-Export Validation
    User->>UI: Klik "Export to JIRA"
    UI->>UI: Validate story data
    
    alt No Epic Selected
        UI-->>User: Error: "Select Epic first"
    end
    
    UI->>Export: validateStoryData()
    Export->>Export: Check required fields
    alt Validation Failed
        Export-->>UI: Validation errors[]
        UI-->>User: Show error messages
    end
    
    Note over User,DB: Get Epic Context
    UI->>API: GET /api/epic/context
    API->>Epic: getEpicContext(userId)
    Epic->>Epic: Retrieve from cache
    Epic-->>API: Epic data + connection
    API-->>UI: Epic context
    
    Note over User,DB: Create User Story
    UI->>Export: createCompleteStory()
    Export->>API: POST /api/jira/connections/:id/epics/:epicId/complete-story
    Note right of Export: {<br/>  storyData,<br/>  scenarios,<br/>  developmentTasks<br/>}
    
    API->>DB: Get JIRA connection
    DB-->>API: Connection credentials
    
    API->>API: Format story for JIRA
    Note right of API: Convert to ADF format
    
    API->>JIRA: POST /rest/api/3/issue
    Note right of JIRA: Create Story issue
    
    alt Story Creation Failed
        JIRA-->>API: Error (400/403/500)
        API-->>Export: Error details
        Export-->>UI: Creation failed
        UI-->>User: ✗ Export failed
    end
    
    JIRA-->>API: Story created (ID, Key)
    
    Note over User,DB: Link Story to Epic
    API->>JIRA: GET /rest/api/3/issue/{epicId}
    JIRA-->>API: Epic key
    
    API->>JIRA: GET /rest/api/3/field
    JIRA-->>API: Field definitions
    API->>API: Find Epic Link field ID
    
    API->>JIRA: PUT /rest/api/3/issue/{storyId}
    Note right of JIRA: Set Epic Link or parent field
    
    alt Link Failed
        JIRA-->>API: Error
        API->>API: Log warning (continue)
    else Link Success
        JIRA-->>API: Story linked
    end
    
    Note over User,DB: Create Subtasks (Scenarios)
    loop For each scenario
        API->>API: Format scenario as subtask
        Note right of API: {<br/>  summary: scenario.title,<br/>  description: steps (ADF),<br/>  parent: storyId<br/>}
        
        API->>JIRA: POST /rest/api/3/issue
        Note right of JIRA: Create Subtask
        
        alt Subtask Created
            JIRA-->>API: Subtask ID, Key
            API->>API: Add to subtasks[]
        else Subtask Failed
            JIRA-->>API: Error
            API->>API: Log error, continue
        end
    end
    
    Note over User,DB: Create Development Tasks (Optional)
    alt Has Development Tasks
        loop For each dev task
            API->>API: Format as subtask
            API->>JIRA: POST /rest/api/3/issue
            JIRA-->>API: Task created
        end
    end
    
    Note over User,DB: Update Database
    API->>DB: UPDATE gherkin_scenarios
    Note right of DB: Set:<br/>- jira_user_story_id<br/>- jira_epic_id<br/>- jira_subtask_ids[]
    DB-->>API: Updated
    
    API->>DB: INSERT into jira_export_history
    Note right of DB: Log export:<br/>- User ID<br/>- Story key<br/>- Epic key<br/>- Timestamp
    DB-->>API: Export logged
    
    Note over User,DB: Response to User
    API-->>Export: Export result
    Note right of API: {<br/>  user_story: { id, key, url },<br/>  scenarios: [{ id, key, url }],<br/>  total_scenarios<br/>}
    
    Export-->>UI: Success response
    UI->>UI: Show success notification
    UI->>UI: Display JIRA links
    UI-->>User: ✓ Exported successfully
    
    UI-->>User: Show clickable links:
    Note right of UI: - User Story: PROJ-123<br/>- Scenarios: PROJ-124, PROJ-125<br/>- Epic: PROJ-100
    
    Note over User,DB: Error Handling & Retry
    alt Export Failed
        Export-->>UI: Error details
        UI-->>User: Show error + retry option
        
        User->>UI: Klik "Retry"
        UI->>Export: Retry with exponential backoff
        Export->>API: Retry request
        Note right of Export: Progressive timeout:<br/>Attempt 1: 15s<br/>Attempt 2: 30s<br/>Attempt 3: 45s
    end
```

## Catatan Implementasi

### Teknologi yang Digunakan:
- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4 / Groq Llama
- **JIRA**: REST API v3
- **Quality**: METEOR metrics

### Fitur Keamanan:
- Authentication middleware pada semua endpoint sensitif
- Ownership validation untuk user resources
- JIRA credential encryption
- Rate limiting pada AI generation

### Performance Optimization:
- Epic context caching (in-memory)
- Reference similarity pre-calculation
- Progressive timeout untuk JIRA operations
- Batch operations untuk multiple exports

---

**Dibuat untuk**: Aplikasi SpecWeave
**Tanggal**: 2026-04-26
**Versi**: 1.0
