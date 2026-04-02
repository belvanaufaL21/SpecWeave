# Railway Frontend Build Fix

## Problem
Railway was trying to build using `npm run build --workspace=specweave-client` but the project doesn't use npm workspaces.

## Solution
Created `nixpacks.toml` at the root to tell Railway how to build the frontend correctly.

## What Changed
1. Added `nixpacks.toml` at root with proper build commands
2. All commands now run from `aplikasi-klien` directory
3. Removed workspace references

## Deploy Steps
1. Commit these changes:
   ```bash
   git add nixpacks.toml railway.toml
   git commit -m "fix: configure Railway to build from aplikasi-klien directory"
   git push
   ```

2. Railway will automatically detect the new configuration and rebuild

## Alternative: Root Directory Setting
In Railway dashboard, you can also set the "Root Directory" to `aplikasi-klien` in the service settings, which would use the nixpacks.toml already in that folder.

## Verify
After deployment, check:
- Build logs should show commands running from `aplikasi-klien`
- No more "No workspaces found" errors
- Build should complete successfully
