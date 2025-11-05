# Public API Documentation (v1)

## Overview

The TugasCMS Public API v1 provides programmatic access to published content including posts, categories, and tags. All endpoints require authentication via API token and support pagination, filtering, and caching.

## Base URL

```
https://your-domain.com/api/v1
```

## Authentication

All API endpoints require authentication using a Bearer token in the Authorization header:

```
Authorization: Bearer <your-api-token>
```

You can generate API tokens from the Settings page in your CMS dashboard.

## Rate Limiting

- **Limit**: 100 requests per 15 minutes per API token
- **Headers**: Rate limit information is available in response headers
- **Response**: 429 status code when limit exceeded

## Response Format

All endpoints return JSON responses in the following format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "cached": false
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message"
}
```

## Caching

- All responses are cached for 1 hour (3600 seconds)
- Cached responses include `"cached": true` in the response
- Cache is automatically invalidated when content is updated

## Pagination

All list endpoints (posts, categories, tags) support pagination to efficiently handle large datasets.

### Pagination Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | The page number to retrieve (starts at 1) |
| `limit` | integer | varies | Number of items per page (see endpoint defaults) |

### Pagination Response Object

Every paginated response includes a `pagination` object with the following fields:

```json
{
  "pagination": {
    "page": 1,           // Current page number
    "limit": 20,         // Items per page
    "total": 100,        // Total number of items
    "totalPages": 5,     // Total number of pages
    "hasNextPage": true, // Whether there's a next page
    "hasPrevPage": false // Whether there's a previous page
  }
}
```

### Default Limits by Endpoint

- **Posts**: 20 items per page (max 100)
- **Categories**: 50 items per page
- **Tags**: 50 items per page
- **Posts in Category/Tag**: 20 items per page

### Pagination Navigation Examples

#### Navigate to Next Page
```bash
# If hasNextPage is true, increment page number
curl -X GET "https://your-domain.com/api/v1/posts?page=2&limit=20" \
  -H "Authorization: Bearer your-api-token"
```

#### Navigate to Previous Page
```bash
# If hasPrevPage is true, decrement page number
curl -X GET "https://your-domain.com/api/v1/posts?page=1&limit=20" \
  -H "Authorization: Bearer your-api-token"
```

#### Calculate Offset and Range
```javascript
// Calculate which items are on the current page
const currentPage = 2;
const limit = 20;
const offset = (currentPage - 1) * limit; // offset = 20
const rangeStart = offset + 1;            // 21
const rangeEnd = offset + limit;           // 40
// This page shows items 21-40
```

#### Implementing Pagination in Your App
```javascript
async function fetchPaginatedPosts(page = 1, limit = 20) {
  const response = await fetch(
    `https://your-domain.com/api/v1/posts?page=${page}&limit=${limit}`,
    {
      headers: { 'Authorization': 'Bearer your-api-token' }
    }
  );
  
  const { success, data } = await response.json();
  
  if (success) {
    const { posts, pagination } = data;
    
    console.log(`Showing page ${pagination.page} of ${pagination.totalPages}`);
    console.log(`Total posts: ${pagination.total}`);
    
    // Render posts
    posts.forEach(post => console.log(post.title));
    
    // Navigation helpers
    if (pagination.hasNextPage) {
      console.log('Next page available');
    }
    if (pagination.hasPrevPage) {
      console.log('Previous page available');
    }
    
    return { posts, pagination };
  }
}
```

### Pagination Best Practices

1. **Always check `hasNextPage`** before fetching the next page
2. **Use appropriate `limit` values** - smaller for mobile, larger for desktop
3. **Cache pagination state** in your application to avoid redundant requests
4. **Display total pages** to users for better UX: "Page 2 of 5"
5. **Implement infinite scroll** by checking `hasNextPage` and incrementing `page`
6. **Handle edge cases**: empty results, single page, last page

---

## Posts Endpoints

### Get All Posts

Retrieve a paginated list of published posts with optional filtering.

**Endpoint**: `GET /api/v1/posts`

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number for pagination |
| `limit` | integer | 20 | Number of posts per page (max 100) |
| `search` | string | - | Search posts by title, content, or excerpt |
| `category` | string | - | Filter by category ID or slug |
| `tag` | string | - | Filter by tag ID or slug |
| `status` | string | published | Filter by status (published, draft, scheduled) |

**Example Request**:
```bash
curl -X GET "https://your-domain.com/api/v1/posts?page=1&limit=10&category=technology" \
  -H "Authorization: Bearer your-api-token"
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "uuid",
        "title": "Post Title",
        "content": "Post content...",
        "excerpt": "Brief excerpt...",
        "slug": "post-slug",
        "featuredImage": "https://...",
        "publishDate": "2025-10-03T10:00:00Z",
        "status": "published",
        "authorId": "uuid",
        "createdAt": "2025-10-01T10:00:00Z",
        "updatedAt": "2025-10-03T10:00:00Z",
        "seo": {
          "title": "SEO Title",
          "metaDescription": "SEO description...",
          "focusKeyword": "keyword",
          "slug": "post-slug"
        },
        "categories": [
          {
            "id": "uuid",
            "name": "Technology",
            "slug": "technology",
            "description": "Tech posts"
          }
        ],
        "tags": [
          {
            "id": "uuid",
            "name": "JavaScript",
            "slug": "javascript"
          }
        ],
        "redirect": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "filters": {
      "search": null,
      "category": "technology",
      "tag": null,
      "status": "published"
    }
  },
  "cached": false
}
```

---

### Get Single Post

Retrieve a single published post by ID or slug.

**Endpoint**: `GET /api/v1/posts/{id}`

**Path Parameters**:
- `id` (string): Post UUID or slug

**Example Request**:
```bash
curl -X GET "https://your-domain.com/api/v1/posts/my-post-slug" \
  -H "Authorization: Bearer your-api-token"
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Post Title",
    "content": "Full post content...",
    "excerpt": "Brief excerpt...",
    "slug": "post-slug",
    "featuredImage": "https://...",
    "publishDate": "2025-10-03T10:00:00Z",
    "status": "published",
    "authorId": "uuid",
    "createdAt": "2025-10-01T10:00:00Z",
    "updatedAt": "2025-10-03T10:00:00Z",
    "seo": {
      "title": "SEO Title",
      "metaDescription": "SEO description...",
      "focusKeyword": "keyword",
      "slug": "post-slug"
    },
    "categories": [...],
    "tags": [...],
    "redirect": null
  },
  "cached": false
}
```

---

## Categories Endpoints

### Get All Categories

Retrieve a paginated list of all categories with post counts.

**Endpoint**: `GET /api/v1/categories`

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number for pagination |
| `limit` | integer | 50 | Number of categories per page |
| `search` | string | - | Search categories by name or description |

**Example Request**:
```bash
curl -X GET "https://your-domain.com/api/v1/categories?page=1&limit=20" \
  -H "Authorization: Bearer your-api-token"
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "uuid",
        "name": "Technology",
        "slug": "technology",
        "description": "Technology related posts",
        "postCount": 25,
        "createdAt": "2025-01-01T10:00:00Z",
        "updatedAt": "2025-10-01T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  },
  "cached": false
}
```

---

### Get Single Category with Posts

Retrieve a category and its associated published posts.

**Endpoint**: `GET /api/v1/categories/{id}`

**Path Parameters**:
- `id` (string): Category UUID or slug

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number for posts pagination |
| `limit` | integer | 20 | Number of posts per page |

**Example Request**:
```bash
curl -X GET "https://your-domain.com/api/v1/categories/technology?page=1&limit=10" \
  -H "Authorization: Bearer your-api-token"
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "category": {
      "id": "uuid",
      "name": "Technology",
      "slug": "technology",
      "description": "Technology related posts",
      "postCount": 25,
      "createdAt": "2025-01-01T10:00:00Z",
      "updatedAt": "2025-10-01T10:00:00Z"
    },
    "posts": [
      {
        "id": "uuid",
        "title": "Post Title",
        "content": "Post content...",
        ...
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  },
  "cached": false
}
```

---

## Tags Endpoints

### Get All Tags

Retrieve a paginated list of all tags with post counts.

**Endpoint**: `GET /api/v1/tags`

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number for pagination |
| `limit` | integer | 50 | Number of tags per page |
| `search` | string | - | Search tags by name |

**Example Request**:
```bash
curl -X GET "https://your-domain.com/api/v1/tags?page=1&limit=20" \
  -H "Authorization: Bearer your-api-token"
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "tags": [
      {
        "id": "uuid",
        "name": "JavaScript",
        "slug": "javascript",
        "postCount": 15,
        "createdAt": "2025-01-01T10:00:00Z",
        "updatedAt": "2025-10-01T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 30,
      "totalPages": 2,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  },
  "cached": false
}
```

---

### Get Single Tag with Posts

Retrieve a tag and its associated published posts.

**Endpoint**: `GET /api/v1/tags/{id}`

**Path Parameters**:
- `id` (string): Tag UUID or slug

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number for posts pagination |
| `limit` | integer | 20 | Number of posts per page |

**Example Request**:
```bash
curl -X GET "https://your-domain.com/api/v1/tags/javascript?page=1&limit=10" \
  -H "Authorization: Bearer your-api-token"
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "tag": {
      "id": "uuid",
      "name": "JavaScript",
      "slug": "javascript",
      "postCount": 15,
      "createdAt": "2025-01-01T10:00:00Z",
      "updatedAt": "2025-10-01T10:00:00Z"
    },
    "posts": [
      {
        "id": "uuid",
        "title": "Post Title",
        "content": "Post content...",
        ...
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 15,
      "totalPages": 2,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  },
  "cached": false
}
```

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or missing API token |
| 404 | Not Found - Resource not found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

---

## Common Use Cases

### 1. Get Latest Posts (Paginated)
```bash
curl -X GET "https://your-domain.com/api/v1/posts?page=1&limit=10" \
  -H "Authorization: Bearer your-api-token"
```

### 2. Search Posts with Pagination
```bash
curl -X GET "https://your-domain.com/api/v1/posts?search=javascript&page=1&limit=20" \
  -H "Authorization: Bearer your-api-token"
```

### 3. Get Posts by Category (Paginated)
```bash
curl -X GET "https://your-domain.com/api/v1/posts?category=technology&page=1&limit=15" \
  -H "Authorization: Bearer your-api-token"
```

### 4. Get Posts by Tag (Paginated)
```bash
curl -X GET "https://your-domain.com/api/v1/posts?tag=react&page=1&limit=10" \
  -H "Authorization: Bearer your-api-token"
```

### 5. Combine Filters with Pagination
```bash
curl -X GET "https://your-domain.com/api/v1/posts?category=technology&tag=javascript&search=tutorial&page=2&limit=10" \
  -H "Authorization: Bearer your-api-token"
```

### 6. Get Category with Paginated Posts
```bash
curl -X GET "https://your-domain.com/api/v1/categories/technology?page=1&limit=10" \
  -H "Authorization: Bearer your-api-token"
```

### 7. Get All Categories (Paginated)
```bash
curl -X GET "https://your-domain.com/api/v1/categories?page=1&limit=20" \
  -H "Authorization: Bearer your-api-token"
```

### 8. Get All Tags (Paginated)
```bash
curl -X GET "https://your-domain.com/api/v1/tags?page=1&limit=30" \
  -H "Authorization: Bearer your-api-token"
```

### 9. Implementing Infinite Scroll
```javascript
let currentPage = 1;
const limit = 20;
let hasMore = true;

async function loadMorePosts() {
  if (!hasMore) return;
  
  const response = await fetch(
    `https://your-domain.com/api/v1/posts?page=${currentPage}&limit=${limit}`,
    { headers: { 'Authorization': 'Bearer your-api-token' } }
  );
  
  const { data } = await response.json();
  
  // Append posts to UI
  displayPosts(data.posts);
  
  // Update pagination state
  hasMore = data.pagination.hasNextPage;
  if (hasMore) currentPage++;
}
```

### 10. Building a Paginated Table
```javascript
async function buildPaginationControls(currentPage, totalPages) {
  const controls = [];
  
  // Previous button
  if (currentPage > 1) {
    controls.push(`<button onclick="goToPage(${currentPage - 1})">Previous</button>`);
  }
  
  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    const active = i === currentPage ? 'active' : '';
    controls.push(`<button class="${active}" onclick="goToPage(${i})">${i}</button>`);
  }
  
  // Next button
  if (currentPage < totalPages) {
    controls.push(`<button onclick="goToPage(${currentPage + 1})">Next</button>`);
  }
  
  return controls.join('');
}
```

---

## Best Practices

### Pagination Best Practices
1. **Always use pagination** for large datasets to improve performance and reduce bandwidth
2. **Choose appropriate page sizes**: 
   - Mobile: 10-20 items per page
   - Desktop: 20-50 items per page
   - Tables: 25-100 items per page
3. **Check `hasNextPage` and `hasPrevPage`** before rendering navigation buttons
4. **Display pagination info** to users: "Showing 21-40 of 157 posts"
5. **Implement URL-based pagination** for bookmarkable pages: `?page=3`
6. **Cache current page** to avoid redundant API calls on back navigation

### API Usage Best Practices
1. **Cache Responses**: Leverage built-in caching and store responses client-side
2. **Handle Rate Limits**: Implement exponential backoff when rate limited (429 status)
3. **Use Slugs**: Prefer slugs over UUIDs for SEO-friendly and readable URLs
4. **Search Efficiently**: Use specific search terms to reduce response size
5. **Filter Wisely**: Combine filters (category + tag + search) for precise results
6. **Handle Errors Gracefully**: Always check `success` field and handle errors appropriately

### Performance Optimization
1. **Request only needed data**: Use `limit` parameter to fetch appropriate amounts
2. **Combine filters**: Use category, tag, and search together instead of multiple requests
3. **Monitor `cached` flag**: Cached responses are instant and don't count toward rate limits
4. **Prefetch next page**: Load next page data in background for faster navigation
5. **Debounce search input**: Wait for user to stop typing before making search requests

---

## Migration from Legacy API

If you're migrating from the `/api/public` endpoints to `/api/v1`:

### Changes:
- **Base URL**: Change from `/api/public` to `/api/v1`
- **New Features**: Pagination, filtering, and search parameters
- **Response Format**: Posts now return in a structured format with pagination metadata
- **Categories & Tags**: New dedicated endpoints available

### Legacy to V1 Mapping:
- `GET /api/public/posts` → `GET /api/v1/posts?page=1&limit=20`
- `GET /api/public/posts/{id}` → `GET /api/v1/posts/{id}` (unchanged)

### Example Migration:
```javascript
// Legacy
const response = await fetch('/api/public/posts', {
  headers: { 'Authorization': 'Bearer token' }
});
const posts = await response.json();

// V1
const response = await fetch('/api/v1/posts?page=1&limit=20', {
  headers: { 'Authorization': 'Bearer token' }
});
const { data } = await response.json();
const posts = data.posts;
const pagination = data.pagination;
```

---

## Post Redirects

### Overview

The redirect feature enables content consolidation and URL management through two redirect types:
- **Post-to-Post**: Redirect one post to another (content cannibalization)
- **Post-to-URL**: Redirect to external URLs (content migration)

All post responses include a `redirect` field (null when no redirect is configured).

### Redirect Response Format

When fetching a post with a redirect configured, the response includes:

**Post with Post-to-Post Redirect:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Old Post",
    "content": "...",
    "redirect": {
      "type": "post",
      "httpStatus": 301,
      "target": {
        "postId": "target-uuid",
        "slug": "new-post-slug",
        "title": "New Post"
      },
      "notes": "Content consolidated"
    }
  }
}
```

**Post with Post-to-URL Redirect:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Moved Post",
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
```

**Post without Redirect:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Normal Post",
    "content": "...",
    "redirect": null
  }
}
```

### Tombstone Pattern

Redirects persist even after the source post is deleted, enabling seamless URL transitions:

```json
{
  "success": false,
  "error": "Post not found",
  "redirect": {
    "type": "post",
    "httpStatus": 301,
    "target": {
      "postId": "target-uuid",
      "slug": "replacement-post",
      "title": "Replacement Post"
    }
  }
}
```

### HTTP Status Codes

- **301**: Permanent redirect (recommended for content consolidation)
- **302**: Temporary redirect
- **307**: Temporary redirect (method preserved)
- **308**: Permanent redirect (method preserved)
- **410**: Gone (returned when target post is deleted)

### Frontend Implementation

The frontend should check the `redirect` field in post responses:

```javascript
const response = await fetch(`/api/v1/posts/${postId}`, {
  headers: { 'Authorization': 'Bearer token' }
});

const { success, data, redirect } = await response.json();

if (data?.redirect) {
  // Handle redirect based on type
  if (data.redirect.type === 'post') {
    // Redirect to target post
    window.location.href = `/blog/${data.redirect.target.slug}`;
  } else if (data.redirect.type === 'url') {
    // Redirect to external URL
    window.location.href = data.redirect.target.url;
  }
} else if (!success && redirect) {
  // Tombstone redirect (post deleted but redirect active)
  if (redirect.type === 'post') {
    window.location.href = `/blog/${redirect.target.slug}`;
  } else {
    window.location.href = redirect.target.url;
  }
}
```

---

## Support

For API support or questions:
- Check the CMS dashboard settings for API token management
- Review rate limit headers in responses
- Monitor the `cached` flag to verify cache behavior
