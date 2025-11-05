-- Rollback script for post_redirects feature
-- Run this if you need to remove the post redirects feature

-- Drop trigger
DROP TRIGGER IF EXISTS trg_update_post_redirects_updated_at ON post_redirects;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_post_redirects_updated_at();

-- Drop indexes
DROP INDEX IF EXISTS idx_redirects_type;
DROP INDEX IF EXISTS idx_redirects_created_by;
DROP INDEX IF EXISTS idx_redirects_target_post;
DROP INDEX IF EXISTS idx_redirects_source_post;

-- Drop table
DROP TABLE IF EXISTS post_redirects;
