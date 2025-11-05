-- Post Redirects Feature Migration
-- This migration creates the post_redirects table with support for:
-- 1. Post-to-post redirects (content consolidation)
-- 2. Post-to-URL redirects (external content migration)
-- 3. Tombstone pattern (redirects persist after post deletion)
-- 4. Circular redirect prevention
-- 5. HTTP status code support (301, 302, 307, 308)

-- Create post_redirects table
CREATE TABLE IF NOT EXISTS post_redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source post UUID (NO FK - allows tombstone redirects after post deletion)
  source_post_id UUID NOT NULL UNIQUE,
  
  -- Redirect type: 'post' or 'url'
  redirect_type VARCHAR(20) NOT NULL CHECK (redirect_type IN ('post', 'url')),
  
  -- Target for post-to-post redirects (FK prevents deleting target posts)
  target_post_id UUID REFERENCES posts(id) ON DELETE NO ACTION,
  
  -- Target for external URL redirects
  target_url TEXT,
  
  -- HTTP status code for redirect (301, 302, 307, 308)
  http_status_code INTEGER DEFAULT 301 CHECK (http_status_code IN (301, 302, 307, 308)),
  
  -- Metadata
  created_by VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  
  -- Constraints
  CONSTRAINT valid_redirect CHECK (
    (redirect_type = 'post' AND target_post_id IS NOT NULL AND target_url IS NULL) OR
    (redirect_type = 'url' AND target_url IS NOT NULL AND target_post_id IS NULL)
  ),
  CONSTRAINT no_self_redirect CHECK (source_post_id != target_post_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_redirects_source_post ON post_redirects(source_post_id);
CREATE INDEX IF NOT EXISTS idx_redirects_target_post ON post_redirects(target_post_id) WHERE target_post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_redirects_created_by ON post_redirects(created_by);
CREATE INDEX IF NOT EXISTS idx_redirects_type ON post_redirects(redirect_type);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_post_redirects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_post_redirects_updated_at
  BEFORE UPDATE ON post_redirects
  FOR EACH ROW
  EXECUTE FUNCTION update_post_redirects_updated_at();

-- Add comment to table
COMMENT ON TABLE post_redirects IS 'Manages post redirects for content consolidation and URL changes. Supports tombstone pattern for deleted posts.';
COMMENT ON COLUMN post_redirects.source_post_id IS 'Source post UUID. No FK constraint to support tombstone redirects after post deletion.';
COMMENT ON COLUMN post_redirects.target_post_id IS 'Target post UUID for post-to-post redirects. ON DELETE NO ACTION prevents deleting target posts.';
COMMENT ON COLUMN post_redirects.redirect_type IS 'Redirect type: "post" for post-to-post, "url" for external URL redirects.';
COMMENT ON COLUMN post_redirects.http_status_code IS 'HTTP status code: 301 (permanent), 302 (temporary), 307 (temporary, method preserved), 308 (permanent, method preserved).';
