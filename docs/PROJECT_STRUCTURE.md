# SpecWeave Project Structure

## Overview
This document describes the cleaned and organized structure of the SpecWeave project after comprehensive cleanup.

## Root Directory
```
/
├── README.md                    # Main project documentation
├── .env                        # Environment variables
├── .gitignore                  # Git ignore rules
├── aplikasi-klien/             # React frontend application
├── aplikasi-server/            # Node.js backend application
├── docs/                       # All documentation
│   ├── archived-database/      # Database schemas and migrations (archived)
│   ├── archived-fixes/         # Historical fix logs
│   ├── archived-scripts/       # One-time scripts and SQL files
│   └── examples/               # Code examples and formatting guides
├── konfigurasi/               # Configuration files
├── pengembangan/              # Development resources
└── skrip-utilitas/            # Utility scripts
```

## Documentation Structure (`docs/`)
```
docs/
├── README.md                                    # Documentation index
├── PROJECT_STRUCTURE.md                        # This file
├── AUTO_REFERENCE_SYSTEM_IMPLEMENTATION.md     # Feature documentation
├── COMPREHENSIVE_USER_STORY_TEMPLATES.md       # User story templates
├── FIX_KNOWLEDGE_INSTRUCTIONS.md              # User instructions
├── CODEBASE_CLEANUP_ANALYSIS.md               # Cleanup analysis report
├── archived-database/                         # Database files (archived - data in Supabase)
├── archived-fixes/                            # Historical fix logs (70+ files)
├── archived-scripts/                          # One-time scripts and SQL files
└── examples/                                  # Code examples and formatting guides
```

## Active Components

### Pages (aplikasi-klien/src/pages/)
- `ChatRefined.jsx` - Main chat interface (active)
- `Dashboard.jsx` - User dashboard (active)
- `Landing.jsx` - Landing page
- `JiraCallback.jsx` - JIRA OAuth callback
- `AuthCallback.jsx` - Auth callback
- `MeteorResults.jsx` - METEOR test results
- `PasswordReset.jsx` - Password reset

### Key Components
- `EpicSelectionModal.jsx` - Epic selection (production version)
- `GherkinEditor.jsx` - Gherkin scenario editor (production version)
- `AutoExpandingTextarea.jsx` - Auto-expanding textarea with forwardRef support

## Removed/Archived Items

### Removed Pages
- ❌ `Chat.jsx` (replaced by ChatRefined.jsx)
- ❌ `ChatNew.jsx` (replaced by ChatRefined.jsx)
- ❌ `Dashboard_backup.jsx` (backup file)
- ❌ `Dashboard_Enhanced.jsx` (unused enhanced version)

### Removed Components
- ❌ `EpicSelectionModalNew.jsx` (test version with hardcoded data)
- ❌ `GherkinEditorDemo.jsx` (demo version)
- ❌ `debug/` folder (3 debug components)

### Archived Documentation (70+ files)
All fix logs, implementation notes, and troubleshooting guides moved to `docs/archived-fixes/`

### Archived Scripts
- Migration scripts → `docs/archived-scripts/migration-scripts/`
- One-time setup scripts → `docs/archived-scripts/`
- SQL fix files → `docs/archived-scripts/`

## Benefits of Cleanup

✅ **Reduced Repository Noise**: 70+ markdown files organized
✅ **Eliminated Duplicates**: No duplicate pages or components
✅ **Clear Structure**: Logical organization of files
✅ **Easier Navigation**: Clean root directory
✅ **Better Maintainability**: Single source of truth for components
✅ **Faster Onboarding**: Clear documentation structure

## Maintenance Guidelines

1. **No backup files in source** - Use git for version control
2. **No duplicate components** - Code review should catch this
3. **Archive old documentation** - Don't delete, move to archived-fixes
4. **One-time scripts** - Keep in archived-scripts folder
5. **Regular cleanup** - Schedule quarterly reviews

## Current Status

- ✅ Documentation cleanup complete
- ✅ Page deduplication complete  
- ✅ Component deduplication complete
- ✅ Script archival complete
- ✅ All functionality preserved
- ✅ No breaking changes introduced

Last updated: December 31, 2025