# Post Redirection Feature - Comprehensive Plan & Documentation

## 📋 Table of Contents
1. [Overview](#overview)
2. [Use Cases & Requirements](#use-cases--requirements)
3. [Database Schema Design](#database-schema-design)
4. [Redirection Logic & Flow](#redirection-logic--flow)
5. [API Structure & Responses](#api-structure--responses)
6. [Edge Cases & Solutions](#edge-cases--solutions)
7. [Implementation Plan](#implementation-plan)
8. [Security & Performance](#security--performance)
9. [SQL Queries Reference](#sql-queries-reference)

---

## 📖 Overview

This feature adds production-ready post redirection capabilities to the CMS, allowing:
- **Post-to-Post redirects**: Redirect one post to another post (by Post ID) - ideal for content consolidation/cannibalization
- **Post-to-URL redirects**: Redirect to any external URL - ideal for moved content or external resources
- **Flexible Configuration**: For any post, you can freely choose to redirect to either another post OR an external URL using the `redirect_type` field
- **Always Included**: Every post API response includes a `redirect` field (null when no redirect configured)
- **UUID-Based**: Frontend always calls API with Post UUID, backend always returns redirect metadata

### Architecture Decision
**Backend includes redirect metadata in every post response, Frontend decides whether to redirect**

This approach:
- ✅ Frontend always receives redirect data (null if not configured)
- ✅ Frontend controls redirect behavior (immediate, delayed, banner, etc.)
- ✅ Simple and consistent - no conditional logic needed
- ✅ Backend resolves target post details for post-to-post redirects

---

## 🎯 Use Cases & Requirements

### Primary Use Cases

1. **Content Consolidation (Cannibalization) - Post-to-Post**
   ```
   Scenario: Two posts cover similar topics
   Action: Configure redirect for Post A → Post B (by UUID)
   Redirect Type: 'post'
   Result: When frontend loads Post A, it receives redirect to Post B
   ```

2. **External Content Migration - Post-to-URL**
   ```
   Scenario: Content moved to external platform (Medium, Substack, etc.)
   Action: Configure redirect for Post A → https://medium.com/@user/article
   Redirect Type: 'url'
   Result: When frontend loads Post A, it receives redirect to external URL
   ```

3. **Partner/Affiliate Redirect - Post-to-URL**
   ```
   Scenario: Post is now a referral to partner content
   Action: Configure redirect to affiliate/partner URL
   Redirect Type: 'url'
   Result: Users are redirected to partner site
   ```

4. **Post Merge - Post-to-Post**
   ```
   Scenario: Multiple posts merged into comprehensive guide
   Action: Configure redirects for Post A, B, C → Post D (comprehensive)
   Redirect Type: 'post'
   Result: All old posts redirect to the new comprehensive guide
   ```

5. **Temporary Redirects - Either Type**
   ```
   Scenario: Post temporarily unavailable or under review
   Action: Configure temporary redirect (HTTP 302)
   Redirect Type: 'post' or 'url' (your choice)
   Result: Can be easily updated or removed later
   ```

**Key Point**: For ANY post, you have complete freedom to choose:
- ✅ Redirect to another post (set `redirect_type = 'post'` + `target_post_id`)
- ✅ Redirect to external URL (set `redirect_type = 'url'` + `target_url`)
- ✅ No redirect at all (`redirect = null` in API response)

---

## 🗄️ Database Schema Design

### New Table: `post_redirects`

```sql
CREATE TABLE post_redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source post (the post being redirected FROM)
  source_post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE UNIQUE,
  
  -- Redirect type
  redirect_type VARCHAR(20) NOT NULL CHECK (redirect_type IN ('post', 'url')),
  
  -- Target for post-to-post redirects
  target_post_id UUID REFERENCES posts(id) ON DELETE NO ACTION,
  
  -- Target for external URL redirects
  target_url TEXT,
  
  -- HTTP status code for redirect (301, 302, 307, 308)
  http_status_code INTEGER DEFAULT 301 CHECK (http_status_code IN (301, 302, 307, 308)),
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,  -- Optional notes about why redirect was created
  
  -- Constraints
  CONSTRAINT valid_redirect CHECK (
    (redirect_type = 'post' AND target_post_id IS NOT NULL AND target_url IS NULL) OR
    (redirect_type = 'url' AND target_url IS NOT NULL AND target_post_id IS NULL)
  ),
  CONSTRAINT no_self_redirect CHECK (source_post_id != target_post_id)
);

-- Indexes for performance
CREATE INDEX idx_redirects_target_post ON post_redirects(target_post_id) WHERE target_post_id IS NOT NULL;
CREATE INDEX idx_redirects_created_by ON post_redirects(created_by);
CREATE INDEX idx_redirects_type ON post_redirects(redirect_type);
```

### Schema Rationale

1. **`source_post_id` is NOT NULL with UNIQUE constraint**: One redirect per post, directly tied to post ID
2. **`source_post_id` NO FOREIGN KEY CONSTRAINT**: Redirects persist even after source post is deleted (tombstone pattern)
3. **`target_post_id` uses ON DELETE NO ACTION**: Prevents accidental deletion of target posts with active redirects pointing to them
4. **No `source_slug` field needed**: Frontend uses UUID for lookups, not slugs
5. **Check constraints**: Ensures data integrity (valid redirect types, no self-redirects)
6. **HTTP status codes**: Supports different redirect semantics (301 permanent, 302 temporary, etc.)

### Tombstone Pattern

**Critical Design Decision**: Redirects survive source post deletion
- When you delete a post, its redirect configuration **remains active**
- Future requests to deleted post UUID still return redirect metadata
- This allows content consolidation without losing redirect history
- Redirect record acts as a "tombstone" marking where content was moved

### Redirect Configuration Flexibility

**For any post, you can configure ONE of these options:**

| Configuration | redirect_type | target_post_id | target_url | Use Case |
|---------------|---------------|----------------|------------|----------|
| **No Redirect** | - | - | - | Normal post, no redirection |
| **Redirect to Post** | `'post'` | UUID of target post | `null` | Content consolidation, merge |
| **Redirect to URL** | `'url'` | `null` | External URL string | Moved to external platform |

**Example Configurations:**

```json
// Configuration 1: Redirect to another post
{
  "source_post_id": "abc-123",
  "redirect_type": "post",
  "target_post_id": "def-456",
  "target_url": null,
  "http_status_code": 301
}

// Configuration 2: Redirect to external URL
{
  "source_post_id": "abc-123",
  "redirect_type": "url",
  "target_post_id": null,
  "target_url": "https://medium.com/@user/article",
  "http_status_code": 301
}
```

**The `redirect_type` field determines which target to use** - giving you complete flexibility!

---

## 🔄 Redirection Logic & Flow

### Flow Scenarios

#### Scenario 1: Post WITHOUT Redirect
```
Frontend requests: GET /api/v1/posts/69be701a-5fe3-4834-9503-89cb34477b9f
Backend finds: Post exists, no redirect configured
Backend response:
{
  "success": true,
  "data": {
    "id": "69be701a-5fe3-4834-9503-89cb34477b9f",
    "title": "My Post",
    "slug": "my-post-slug",
    "content": "...",
    "redirect": null  // Always included, null when no redirect
  }
}

Frontend action: Display post normally
```

#### Scenario 2: Post WITH Redirect (Post-to-Post)
```
Frontend requests: GET /api/v1/posts/uuid-old-post
Backend finds: Post exists + redirect configured to another post
Backend response:
{
  "success": true,
  "data": {
    "id": "uuid-old-post",
    "slug": "old-post-slug",
    "title": "Old Post",
    "content": "...",
    "redirect": {
      "type": "post",
      "httpStatus": 301,
      "target": {
        "postId": "uuid-new-post",
        "slug": "new-post-slug",
        "title": "New Post"
      },
      "notes": "Content consolidated"
    }
  }
}

Frontend action: 
- Option A: Automatically redirect to uuid-new-post
- Option B: Show banner "This post redirects to [New Post]"
- Option C: Redirect after 3 seconds
```

#### Scenario 3: Post WITH Redirect (Post-to-URL)
```
Frontend requests: GET /api/v1/posts/uuid-moved-post
Backend response:
{
  "success": true,
  "data": {
    "id": "uuid-moved-post",
    "slug": "moved-post-slug",
    "title": "Moved Post",
    "content": "...",
    "redirect": {
      "type": "url",
      "httpStatus": 301,
      "target": {
        "url": "https://newsite.com/article"
      },
      "notes": "Moved to external platform"
    }
  }
}

Frontend action: Redirect to https://newsite.com/article
```

#### Scenario 4: Circular Redirect Detection (Backend Validation)
```
Setup: Trying to create redirect Post A → Post B when Post B → Post A exists
Backend validation: REJECT on creation/update
Error response:
{
  "success": false,
  "error": "Circular redirect detected: Post A already redirects to Post B"
}
```

#### Scenario 5: Target Post Deleted (Broken Redirect)
```
Setup: Post A → Post B, then Post B is deleted
Frontend requests: GET /api/v1/posts/uuid-post-a
Backend response:
{
  "success": true,
  "data": {
    "id": "uuid-post-a",
    "title": "Post A",
    "content": "...",
    "redirect": {
      "type": "post",
      "httpStatus": 410,
      "target": {
        "postId": "uuid-post-b",
        "error": "Target post has been deleted"
      },
      "notes": "Content consolidated"
    }
  }
}

Frontend action: Show error message or fallback to displaying Post A
```

#### Scenario 6: Deleting Post with Active Redirects
```
User tries to delete Post B (which has redirects pointing TO it)
Backend checks: Are there redirects where target_post_id = Post B?
Response:
{
  "success": false,
  "error": "Cannot delete post. The following posts redirect to it:",
  "redirects": [
    { "postId": "uuid-a", "title": "Post A" },
    { "postId": "uuid-c", "title": "Post C" }
  ]
}

User must:
1. Remove/update those redirects first, OR
2. Confirm "Delete Anyway" (sets ON DELETE NO ACTION → redirect remains but broken)
```

### Redirect Resolution Logic (Backend)

```typescript
// Backend redirect resolver - works for Post ID lookups
async function resolveRedirect(postId: string) {
  // 1. Check if redirect exists for this post ID
  const redirect = await getRedirectBySourcePostId(postId);
  
  if (!redirect) {
    return null;  // No redirect configured for this post
  }
  
  // 2. Handle based on redirect_type (user's choice!)
  
  // Option A: User chose to redirect to external URL
  if (redirect.redirect_type === 'url') {
    return {
      type: 'url',
      httpStatus: redirect.http_status_code,
      target: { 
        url: redirect.target_url 
      },
      notes: redirect.notes
    };
  }
  
  // Option B: User chose to redirect to another post
  if (redirect.redirect_type === 'post') {
    // Fetch target post details
    const targetPost = await getPostById(redirect.target_post_id);
    
    // Check if target post still exists
    if (!targetPost) {
      return {
        type: 'post',
        httpStatus: 410,  // Gone - broken redirect
        target: {
          postId: redirect.target_post_id,
          error: 'Target post has been deleted'
        },
        notes: redirect.notes
      };
    }
    
    // Check for circular redirects (prevent infinite loops)
    const secondHopRedirect = await getRedirectBySourcePostId(targetPost.id);
    if (secondHopRedirect) {
      // Log warning: chained redirect detected
      // Still return first hop, frontend can follow if needed
    }
    
    // Return target post details
    return {
      type: 'post',
      httpStatus: redirect.http_status_code,
      target: {
        postId: targetPost.id,
        slug: targetPost.slug,
        title: targetPost.title
      },
      notes: redirect.notes
    };
  }
}

// Integration with GET /api/v1/posts/[id]
async function getPost(postId: string) {
  const post = await fetchPostFromDB(postId);
  const redirect = await resolveRedirect(postId);
  
  return {
    ...post,
    redirect: redirect  // Always included: null or redirect metadata
  };
}
```

---

## 🔌 API Structure & Responses

### Updated GET /api/v1/posts/[id] Response

**Case 1: Post exists WITHOUT redirect**
```json
{
  "success": true,
  "data": {
    "id": "uuid-123",
    "title": "My Post",
    "slug": "my-post",
    "content": "...",
    "redirect": null
  },
  "cached": false
}
```

**Case 2: Post exists WITH redirect**
```json
{
  "success": true,
  "data": {
    "id": "uuid-123",
    "title": "Old Post",
    "slug": "old-post",
    "content": "...",
    "redirect": {
      "type": "post",
      "httpStatus": 301,
      "target": {
        "postId": "uuid-456",
        "slug": "new-post",
        "title": "New Post",
        "categories": [...]
      },
      "note": "Content consolidated into new post"
    }
  },
  "cached": false
}
```

**Case 3: Post deleted WITH redirect (tombstone)**
```json
{
  "success": false,
  "error": "Post not found",
  "redirect": {
    "type": "post",
    "httpStatus": 301,
    "sourceSlug": "deleted-post",
    "target": {
      "postId": "uuid-789",
      "slug": "replacement-post",
      "title": "Replacement Post"
    }
  }
}
```

**Case 4: Redirect to external URL**
```json
{
  "success": true,
  "data": {
    "id": "uuid-abc",
    "title": "Moved Post",
    "slug": "moved-post",
    "redirect": {
      "type": "url",
      "httpStatus": 301,
      "target": {
        "url": "https://newsite.com/article"
      }
    }
  }
}
```

### New API Endpoints for Redirect Management

#### 1. GET /api/settings/redirects
Get all redirects (paginated)

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `type` (string: 'post' | 'url' | 'all', default: 'all')
- `search` (string: search by source or target slug)

**Response:**
```json
{
  "success": true,
  "data": {
    "redirects": [
      {
        "id": "uuid-1",
        "sourceSlug": "old-article",
        "redirectType": "post",
        "httpStatusCode": 301,
        "targetPost": {
          "id": "uuid-2",
          "slug": "new-article",
          "title": "New Article"
        },
        "sourcePostExists": false,
        "createdAt": "2025-11-05T10:00:00Z",
        "notes": "Content consolidation"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

#### 2. POST /api/settings/redirects
Create new redirect

**Request Body Examples:**

**Example 1: Redirect to another post**
```json
{
  "sourcePostId": "uuid-123",
  "redirectType": "post",
  "targetPostId": "uuid-456",
  "httpStatusCode": 301,
  "notes": "Merging duplicate content"
}
```

**Example 2: Redirect to external URL**
```json
{
  "sourcePostId": "uuid-123",
  "redirectType": "url",
  "targetUrl": "https://medium.com/@user/article",
  "httpStatusCode": 301,
  "notes": "Content moved to Medium"
}
```

**Validation:**
- Prevent self-redirects (sourcePostId === targetPostId)
- Detect circular redirects (A→B when B→A exists)
- Ensure target post exists (when redirectType='post')
- Validate URL format (when redirectType='url')
- Check source post doesn't already have a redirect (unique constraint)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-new",
    "sourceSlug": "old-post",
    "redirectType": "post",
    "targetPost": { ... },
    "createdAt": "2025-11-05T10:00:00Z"
  }
}
```

#### 3. PUT /api/settings/redirects/[id]
Update existing redirect

**Request Body:**
```json
{
  "redirectType": "url",
  "targetUrl": "https://newsite.com/article",
  "httpStatusCode": 302,
  "notes": "Updated to external URL"
}
```

#### 4. DELETE /api/settings/redirects/[id]
Delete redirect

**Response:**
```json
{
  "success": true,
  "message": "Redirect deleted successfully"
}
```

#### 5. GET /api/settings/redirects/validate
Validate redirect before creation

**Query Parameters:**
- `sourceSlug` (string)
- `targetSlug` (string)

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": false,
    "errors": ["Circular redirect detected"],
    "warnings": ["Target post also has a redirect configured"]
  }
}
```

---

## ⚠️ Edge Cases & Solutions

### Edge Case Matrix

| Edge Case | Solution |
|-----------|----------|
| **Circular redirect (A→B→A)** | Validate on creation, reject with error |
| **Chain redirect (A→B→C)** | Backend resolves only 1 hop, log warning |
| **Target post deleted** | Return 410 Gone status, preserve redirect for history |
| **Duplicate source slug** | Unique constraint prevents, return validation error |
| **Self-redirect (A→A)** | Validation prevents on creation |
| **Redirect to draft post** | Allow creation, API checks publish status on resolve |
| **Source post deleted** | Tombstone pattern: source_post_id=NULL, source_slug preserved |
| **Orphaned redirects** | Periodic cleanup job (optional), or manual review UI |
| **External URL validation** | URL format validation, optional domain whitelist |
| **Concurrent redirect updates** | Database unique constraint prevents race conditions |

### Circular Redirect Detection Algorithm

```typescript
async function detectCircularRedirect(sourceSlug: string, targetSlug: string): Promise<boolean> {
  const visited = new Set<string>();
  let currentSlug = targetSlug;
  
  // Maximum depth to prevent infinite loops (e.g., 10 hops)
  const maxDepth = 10;
  let depth = 0;
  
  while (depth < maxDepth) {
    // Check if we've seen this slug before
    if (visited.has(currentSlug)) {
      return true;  // Circular redirect detected
    }
    
    // Check if we've reached back to source
    if (currentSlug === sourceSlug) {
      return true;  // Circular redirect detected
    }
    
    visited.add(currentSlug);
    
    // Check if current slug has a redirect
    const redirect = await getRedirectBySourceSlug(currentSlug);
    
    if (!redirect || redirect.type !== 'post') {
      return false;  // No more redirects, no circle
    }
    
    // Get target post slug
    const targetPost = await getPostById(redirect.target_post_id);
    if (!targetPost) {
      return false;  // Target deleted, no circle
    }
    
    currentSlug = targetPost.slug;
    depth++;
  }
  
  // Reached max depth without finding circle (but suspicious)
  return false;
}
```

---

## 📝 Implementation Plan

### Phase 1: Database Setup (Day 1)

**1.1 Create Migration SQL**
```sql
-- See "Database Schema Design" section above
-- Run in Supabase SQL editor
```

**1.2 Test Migration**
- Run migration in development
- Verify constraints work
- Test trigger for slug capture

**1.3 Rollback Script**
```sql
-- Rollback if needed
DROP TRIGGER IF EXISTS trg_capture_slug_before_insert ON post_redirects;
DROP FUNCTION IF EXISTS capture_post_slug_on_redirect();
DROP TABLE IF EXISTS post_redirects;
```

### Phase 2: Backend API (Days 2-3)

**2.1 Create Types**
File: `types/index.ts`
```typescript
export interface PostRedirect {
  id: string;
  sourcePostId: string | null;
  sourceSlug: string;
  redirectType: 'post' | 'url';
  targetPostId?: string;
  targetUrl?: string;
  httpStatusCode: 301 | 302 | 307 | 308;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
}

export interface RedirectMetadata {
  type: 'post' | 'url';
  httpStatus: number;
  target: {
    postId?: string;
    slug?: string;
    title?: string;
    url?: string;
    error?: string;
  };
  note?: string;
}
```

**2.2 Create Redirect Resolver**
File: `lib/redirect-resolver.ts`
```typescript
import { supabase } from './supabase';

export async function resolveRedirect(slugOrId: string): Promise<RedirectMetadata | null> {
  // Implementation as shown in "Redirect Resolution Logic" section
}
```

**2.3 Update Post Mapper**
File: `lib/post-mapper.ts`
```typescript
import { resolveRedirect } from './redirect-resolver';

export async function mapPostFromDB(post: PostFromDB): Promise<MappedPost> {
  const redirect = await resolveRedirect(post.slug);
  
  return {
    // ... existing fields
    redirect: redirect || undefined
  };
}
```

**2.4 Create Redirect Validation**
File: `lib/redirect-validator.ts`
```typescript
export async function validateRedirect(
  sourceSlug: string,
  targetSlug: string
): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
  // Implementation of circular detection and validation
}
```

**2.5 Create API Endpoints**

Files to create:
- `app/api/settings/redirects/route.ts` (GET, POST)
- `app/api/settings/redirects/[id]/route.ts` (PUT, DELETE)
- `app/api/settings/redirects/validate/route.ts` (GET)

**2.6 Update Existing Post Endpoints**
File: `app/api/v1/posts/[id]/route.ts`
- Add redirect resolution logic
- Return redirect metadata in responses

### Phase 3: Frontend UI (Days 4-5)

**3.1 Create Redirect Settings Page**
File: `app/(dashboard)/settings/redirects/page.tsx`
```typescript
'use client'

import { RedirectsList } from '@/components/settings/redirects-list'

export default function RedirectsPage() {
  return <RedirectsList />
}
```

**3.2 Create Redirects List Component**
File: `components/settings/redirects-list.tsx`

Features:
- Table showing all redirects
- Filter by type (post/url)
- Search by source or target
- Create new redirect dialog
- Edit existing redirect
- Delete redirect with confirmation
- Show source post status (exists/deleted)
- Show target post status (exists/deleted/draft)

**3.3 Create Redirect Form Component**
File: `components/settings/redirect-form.tsx`

Features:
- Source post selector (autocomplete)
- Redirect type selector (post/url)
- Target post selector OR URL input
- HTTP status code selector
- Notes textarea
- Validation before submit
- Circular redirect detection UI

**3.4 Update Navigation**
File: `components/layout/sidebar.tsx`
- Add "Redirects" menu item under Settings

### Phase 4: Cache & Performance (Day 6)

**4.1 Update Cache Strategy**
File: `lib/cache.ts`

```typescript
// Cache redirect lookups (5 minute TTL)
export async function getCachedRedirect(slug: string): Promise<RedirectMetadata | null> {
  const cacheKey = `redirect:${slug}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const redirect = await resolveRedirect(slug);
  
  if (redirect) {
    await redis.setex(cacheKey, 300, JSON.stringify(redirect));
  }
  
  return redirect;
}

// Invalidate redirect cache
export async function invalidateRedirectCache(slug: string) {
  await redis.del(`redirect:${slug}`);
}
```

**4.2 Cache Invalidation Triggers**
- Invalidate when redirect created/updated/deleted
- Invalidate when target post updated/deleted

### Phase 5: Testing & Validation (Day 7)

**5.1 Manual Testing Checklist**
- [ ] Create post-to-post redirect
- [ ] Create post-to-url redirect
- [ ] Delete source post, verify tombstone works
- [ ] Delete target post, verify 410 response
- [ ] Attempt circular redirect, verify rejection
- [ ] Test API responses for all scenarios
- [ ] Test frontend redirect handling

**5.2 Database Testing**
- [ ] Verify constraints work
- [ ] Test trigger captures slug correctly
- [ ] Test cascade behaviors

### Phase 6: Documentation & Rollout (Day 8)

**6.1 Update API Documentation**
File: `API_DOCUMENTATION.md`
- Add redirect response examples
- Document new redirect endpoints

**6.2 Update replit.md**
- Add redirect feature to Recent Changes

**6.3 Update Frontend Documentation**
- Document how frontend should handle redirects

---

## 🔒 Security & Performance

### Security Considerations

1. **Authentication**
   - All redirect management endpoints require Clerk authentication
   - Only authenticated users can create/edit redirects

2. **Authorization**
   - Users can only create redirects for their own posts
   - `created_by` field tracks ownership

3. **URL Validation**
   - Sanitize external URLs
   - Optional: Whitelist allowed domains
   - Prevent javascript: and data: URLs

4. **Rate Limiting**
   - Apply rate limiting to redirect management endpoints
   - Prevent redirect lookup abuse

5. **Input Validation**
   - Validate all inputs with Zod schemas
   - Prevent SQL injection (using parameterized queries)

### Performance Optimization

1. **Database Indexes**
   - Index on `source_slug` for fast lookups
   - Index on `target_post_id` for cascade checks
   - Composite indexes for filtering

2. **Caching Strategy**
   - Cache redirect lookups (5 min TTL)
   - Cache aligned with post cache TTL
   - Invalidate on updates

3. **Query Optimization**
   - Use JOINs efficiently
   - Limit redirect chain depth to 1 hop
   - Batch queries where possible

4. **Monitoring**
   ```typescript
   // Optional: Track redirect usage
   CREATE TABLE redirect_analytics (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     redirect_id UUID REFERENCES post_redirects(id) ON DELETE CASCADE,
     accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     user_agent TEXT,
     referer TEXT
   );
   ```

---

## 📚 SQL Queries Reference

### Common Operations

**1. Create Redirect (Post-to-Post)**
```sql
INSERT INTO post_redirects (
  source_post_id,
  source_slug,
  redirect_type,
  target_post_id,
  http_status_code,
  created_by,
  notes
)
VALUES (
  'source-post-uuid',
  'old-post-slug',
  'post',
  'target-post-uuid',
  301,
  'user-uuid',
  'Content consolidation'
);
```

**2. Create Redirect (Post-to-URL)**
```sql
INSERT INTO post_redirects (
  source_post_id,
  source_slug,
  redirect_type,
  target_url,
  http_status_code,
  created_by,
  notes
)
VALUES (
  'source-post-uuid',
  'moved-post-slug',
  'url',
  'https://newsite.com/article',
  301,
  'user-uuid',
  'Moved to external platform'
);
```

**3. Find Redirect by Source Post ID**
```sql
SELECT 
  pr.*,
  p.title as target_title,
  p.slug as target_slug,
  p.status as target_status
FROM post_redirects pr
LEFT JOIN posts p ON pr.target_post_id = p.id
WHERE pr.source_post_id = $1;
```

**4. Get All Redirects with Target Info**
```sql
SELECT 
  pr.id,
  pr.source_slug,
  pr.redirect_type,
  pr.http_status_code,
  pr.created_at,
  pr.notes,
  CASE 
    WHEN pr.source_post_id IS NOT NULL THEN true 
    ELSE false 
  END as source_exists,
  p.id as target_post_id,
  p.title as target_title,
  p.slug as target_slug,
  p.status as target_status
FROM post_redirects pr
LEFT JOIN posts p ON pr.target_post_id = p.id
WHERE pr.created_by = $1
ORDER BY pr.created_at DESC
LIMIT $2 OFFSET $3;
```

**5. Delete Redirect**
```sql
DELETE FROM post_redirects
WHERE id = $1 AND created_by = $2;
```

**6. Update Redirect**
```sql
UPDATE post_redirects
SET 
  redirect_type = $1,
  target_post_id = $2,
  target_url = $3,
  http_status_code = $4,
  notes = $5,
  updated_at = NOW()
WHERE id = $6 AND created_by = $7
RETURNING *;
```

**7. Check Circular Redirect**
```sql
-- Find if target post already has a redirect
SELECT pr2.source_slug, pr2.target_post_id
FROM post_redirects pr1
JOIN posts p ON pr1.target_post_id = p.id
JOIN post_redirects pr2 ON p.slug = pr2.source_slug
WHERE pr1.source_slug = $1;
```

**8. Find Orphaned Redirects (Deleted Targets)**
```sql
SELECT pr.*
FROM post_redirects pr
WHERE pr.redirect_type = 'post'
  AND pr.target_post_id NOT IN (SELECT id FROM posts);
```

**9. Cleanup Old Tombstone Redirects (Optional)**
```sql
-- Delete tombstone redirects older than 1 year
DELETE FROM post_redirects
WHERE source_post_id IS NULL
  AND created_at < NOW() - INTERVAL '1 year';
```

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Backup Supabase database
- [ ] Review migration SQL
- [ ] Test migration in staging environment
- [ ] Document rollback procedure

### Deployment Steps
1. [ ] Run database migration in production
2. [ ] Deploy backend API changes
3. [ ] Deploy frontend UI changes
4. [ ] Test all redirect scenarios in production
5. [ ] Monitor logs for errors
6. [ ] Update API documentation

### Post-Deployment
- [ ] Monitor redirect performance
- [ ] Check cache hit rates
- [ ] Review user feedback
- [ ] Document common redirect patterns

---

## 📊 Future Enhancements (Optional)

1. **Bulk Import/Export**
   - CSV import for bulk redirects
   - Export redirect list for backup

2. **Redirect Analytics**
   - Track how often redirects are used
   - Report on most accessed redirects

3. **Automatic Redirect Suggestions**
   - AI suggests similar posts for redirect
   - Detect duplicate content automatically

4. **Redirect History**
   - Track changes to redirects over time
   - Audit log for redirect modifications

5. **Wildcard Redirects**
   - Pattern-based redirects
   - Category-level redirects

6. **A/B Testing**
   - Test different redirect targets
   - Measure engagement metrics

---

## ✅ Summary

This comprehensive plan provides a production-ready post redirection system with:

- ✅ **Flexible Redirect Types**: For any post, freely choose to redirect to another post OR external URL
- ✅ **Always Included**: Every post API response includes `redirect` field (null when not configured)
- ✅ **UUID-Based**: Frontend calls API with Post ID, backend resolves and returns redirect metadata
- ✅ **Robust Database Schema**: Simple, efficient schema with proper constraints and indexes
- ✅ **Complete API Structure**: All edge cases handled (circular redirects, deleted targets, etc.)
- ✅ **Backend Resolution**: Backend resolves target post details for post-to-post redirects
- ✅ **Frontend Control**: Frontend decides how to handle redirects (immediate, delayed, banner)
- ✅ **Security & Performance**: Authentication, caching, validation, rate limiting
- ✅ **Step-by-Step Implementation**: 8-day plan with complete SQL migrations
- ✅ **SQL Reference**: Ready-to-use queries for all operations

### Key Features

**Redirect Configuration:**
- ✅ Source: Always a Post ID (UUID)
- ✅ Target Type 1: Another Post (by UUID) - use `redirect_type = 'post'`
- ✅ Target Type 2: External URL - use `redirect_type = 'url'`
- ✅ HTTP Status Codes: 301, 302, 307, 308 (permanent or temporary)

**API Response Format:**
```json
{
  "id": "post-uuid",
  "title": "Post Title",
  "redirect": null | {
    "type": "post" | "url",
    "httpStatus": 301,
    "target": { ... }
  }
}
```

The system is designed to be:
- **Production-ready**: Handles all edge cases
- **Flexible**: Choose redirect type per post
- **Simple**: Easy to configure and understand
- **Performant**: Indexed, cached, optimized queries
- **Maintainable**: Clear separation of concerns
- **Extensible**: Easy to add features later
- **Secure**: Authentication, authorization, input validation

**Estimated Implementation Time**: 7-8 days for full rollout
