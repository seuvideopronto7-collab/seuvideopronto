

## Plan: Fix duplicate `video_jobs` in types.ts

### Problem
`src/integrations/supabase/types.ts` contains two `video_jobs` entries (lines 83 and 245) with different schemas, causing TS2300/TS2717 build errors. This file is auto-generated and should not be edited directly.

### Root Cause
A migration likely created a second `video_jobs` table definition that conflicted with an existing one in the auto-generated types. The actual database only has one `video_jobs` table (confirmed by the schema in context), but the types file got out of sync.

### Fix
**Remove the duplicate `video_jobs` block (lines 245-280)** from `src/integrations/supabase/types.ts`. Keep the first definition (lines 83-144) which includes all columns (`caption_text`, `error`, `updated_at`, `audio_url` etc.) and matches the actual database schema.

Note: While this file is normally auto-generated, removing the stale duplicate is the only way to fix the build. The first entry (line 83) reflects the current database state accurately.

### Single file change
- **`src/integrations/supabase/types.ts`**: Delete lines 245-280 (the second `video_jobs` block).

