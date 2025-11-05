# TugasCMS - Professional Content Management System

## Overview
This is a professional CMS application built with Next.js, React, and TypeScript. It provides a modern interface for managing blog posts, categories, tags, and media. The application uses Supabase for database, Clerk for authentication, and Appwrite for image storage.

## Project Setup - October 1, 2025
- **Framework**: Next.js 15.5.4 with React 18.3.1 and TypeScript
- **UI Components**: Radix UI with Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Clerk with Next.js middleware
- **Image Storage**: Appwrite
- **Port**: 5000 (Single port for both frontend and backend)

## Architecture
- **Framework**: Next.js App Router (Server and Client Components)
- **API Routes**: Next.js API routes in app/api/
- **Database**: Supabase (PostgreSQL) 
- **Authentication**: Clerk middleware
- **Image Storage**: Appwrite cloud storage
- **Styling**: Tailwind CSS with custom components
- **State Management**: React Hooks
- **Caching**: Redis (optional) for API response caching

## Key Features
- Posts management (create, edit, delete, filter)
- Categories and tags organization
- Media library
- User profile and API tokens settings
- Responsive sidebar navigation
- Dark mode support
- Public API with token authentication

## Development
- Run `npm start` or `npm run dev` to start the development server on port 5000
- The dev server is configured to work with Replit's proxy (0.0.0.0 host)
- Hot Module Reload (HMR) is enabled for faster development

## Deployment
- Build command: `npm run build`
- Start command: `npm start`
- Single port architecture - both frontend and API on port 5000

## Environment Variables (Optional)
If using Appwrite backend, set these variables:
- `NEXT_PUBLIC_APPWRITE_ENDPOINT` - Appwrite API endpoint
- `NEXT_PUBLIC_APPWRITE_PROJECT_ID` - Appwrite project ID
- `NEXT_PUBLIC_BUCKET_ID` - Appwrite storage bucket ID

## Dependencies
- Core: React, React DOM, TypeScript
- UI: Radix UI components, Lucide icons
- Forms: React Hook Form
- Dates: date-fns, react-day-picker
- Charts: Recharts
- Backend: Appwrite SDK
- Styling: Tailwind utilities (clsx, tailwind-merge, class-variance-authority)

## Project Structure
```
app/
├── (auth)/            # Authentication routes
│   └── sign-in/       # Sign in page
├── (dashboard)/       # Protected dashboard routes
│   ├── posts/         # Posts pages
│   ├── settings/      # Settings pages
│   └── layout.tsx     # Dashboard layout
├── api/               # API routes
│   ├── posts/         # Posts API (internal)
│   ├── categories/    # Categories API (internal)
│   ├── tags/          # Tags API (internal)
│   ├── settings/      # Settings API (internal)
│   ├── public/        # Legacy public API
│   ├── v1/            # Public API v1
│   │   ├── posts/     # Posts endpoints
│   │   ├── categories/# Categories endpoints
│   │   ├── tags/      # Tags endpoints
│   │   └── sitemaps/  # Sitemap endpoints
│   └── health/        # Health check
├── layout.tsx         # Root layout
└── page.tsx           # Home page

components/       # React components
├── figma/        # Figma-specific components
├── layout/       # Layout components
├── posts/        # Post management components
├── settings/     # Settings components
└── ui/           # Reusable UI components

lib/              # Utilities (Supabase, cache, API client)
├── db/           # Database connection
├── supabase.ts   # Supabase client
├── cache.ts      # Redis cache
└── api-client.ts # API client

hooks/            # Custom React hooks
styles/           # Global styles
types/            # TypeScript type definitions
```

## Public API Endpoints

The application provides two versions of public API endpoints with token-based authentication and Redis caching for optimal performance.

### Authentication
All public API endpoints require an API token in the Authorization header:
```
Authorization: Bearer <your-api-token>
```

### API v1 (Recommended)

The v1 API includes pagination, filtering, and new endpoints for categories and tags. See `API_DOCUMENTATION.md` for full documentation.

#### Posts Endpoints
- **GET /api/v1/posts** - Get all published posts with pagination and filtering
  - Query params: `page`, `limit`, `search`, `category`, `tag`, `status`
  - Returns: Posts array with pagination metadata and applied filters
- **GET /api/v1/posts/[id]** - Get single post by ID or slug
  - Supports UUID or slug lookup
  - Returns: Single post with categories and tags

#### Categories Endpoints
- **GET /api/v1/categories** - Get all categories with post counts
  - Query params: `page`, `limit`, `search`
  - Returns: Categories array with pagination metadata
- **GET /api/v1/categories/[id]** - Get category with its posts
  - Supports UUID or slug lookup
  - Query params: `page`, `limit` (for posts pagination)
  - Returns: Category details with paginated posts

#### Tags Endpoints
- **GET /api/v1/tags** - Get all tags with post counts
  - Query params: `page`, `limit`, `search`
  - Returns: Tags array with pagination metadata
- **GET /api/v1/tags/[id]** - Get tag with its posts
  - Supports UUID or slug lookup
  - Query params: `page`, `limit` (for posts pagination)
  - Returns: Tag details with paginated posts

### Legacy API (/api/public)

#### Get All Published Posts
- **Endpoint**: `GET /api/public/posts`
- **Cache**: 3600 seconds (1 hour)
- **Response**: Returns all published posts with categories and tags

#### Get Single Published Post
- **Endpoint**: `GET /api/public/posts/[id]`
- **Parameters**: 
  - `id` - Post ID (UUID) or slug
- **Cache**: 3600 seconds (1 hour)
- **Response**: Returns a single published post with categories and tags

### Redis Caching Strategy
- **v1 API**: Cache keys follow pattern: `api:v1:*` (1 hour TTL)
- **Legacy API**: Cache keys follow pattern: `api:public:posts:*` (1 hour TTL)
- All responses are cached for 3600 seconds
- Cache automatically invalidated when content is updated

## Security & Performance Features

### Authentication & Authorization
- **Clerk Integration**: All internal API endpoints require Clerk authentication
- **Ownership Validation**: Users can only edit/delete their own resources:
  - Posts verified via `author_id` matching
  - Profiles protected via `userId` matching
  - API tokens restricted to owner only
- **Rate Limiting**: Public API limited to 100 requests per 15 minutes per IP
- **CORS Configuration**: Proper CORS headers for public API endpoints

### Input Validation
All POST/PUT endpoints validate input using Zod schemas:
- `postSchema` / `updatePostSchema` - Post creation and updates
- `categorySchema` - Category management
- `tagSchema` - Tag management
- `userProfileSchema` / `updateUserProfileSchema` - Profile management
- `tokenSchema` - API token generation
- `publicPostSchema` - Public API post creation

### Caching Strategy
Redis-based caching with intelligent TTLs:
- **Public API**: 1 hour (3600s) for published posts
- **Internal Posts**: 5 minutes (300s) per user
- **Categories/Tags**: 10 minutes (600s)
- **Cache Invalidation**: Automatic clearing when data changes
  - Post changes invalidate post and public API caches
  - Category/tag updates invalidate related post caches

### API Response Format
Standardized response structure across all endpoints:
```json
{
  "success": true/false,
  "data": {...},
  "error": "error message",
  "cached": true/false
}
```

### Utility Files (lib/)
- `auth.ts` - Clerk authentication helpers
- `validation.ts` - Zod validation schemas
- `response.ts` - Standardized API response formatting
- `post-mapper.ts` - Database to API response mapping
- `rate-limit.ts` - Rate limiting implementation
- `cors.ts` - CORS configuration
- `cache.ts` - Redis caching utilities

## Recent Changes
- November 5, 2025: UX Enhancement - Searchable Post Selection in Redirects Form
  - **ADDED**: Searchable combobox for Source Post and Target Post fields in redirect creation/edit forms
  - **FEATURE**: Users can now search posts by both title AND post ID/UUID for easier selection
  - **IMPROVED**: Form field spacing - Added consistent top margin (mt-2) to all input fields
  - **ENHANCED**: Visual feedback with checkmarks showing selected posts
  - **IMPROVED**: Each post shows both title and UUID in dropdown for better identification
  - **RESULT**: Much easier to find and select posts in large post lists (handles 1000+ posts efficiently)
  - Better UX especially when dealing with similar post titles or needing to find specific posts by ID
  - Consistent spacing throughout all form fields improves visual hierarchy and readability

- November 5, 2025: Critical Bug Fix - Redirects API 500 Error (Invalid Foreign Key Reference)
  - **FIXED**: HTTP 500 error when accessing `/api/settings/redirects` endpoint
  - **ROOT CAUSE**: Query attempted to use non-existent foreign key `post_redirects_source_post_id_fkey` in Supabase join
  - **TECHNICAL DETAILS**: Per REDIRECTION_FEATURE_PLAN.md design, `source_post_id` has NO foreign key constraint (intentional, for tombstone pattern support)
  - **IMPACT**: Redirects settings page completely broken - users unable to view, create, or manage redirects
  - **FILES FIXED**:
    - `app/api/settings/redirects/route.ts` (line 28): Removed invalid `source_post:posts!post_redirects_source_post_id_fkey` join
    - Added manual post fetching logic to enrich redirects with source post details after initial query
    - `lib/redirect-validator.ts` (line 159): Removed problematic `posts!inner(title)` join in `validateTargetPostDeletion()`
    - Added separate query to fetch source post titles for better error messages
  - **SOLUTION**: Changed from FK-based joins to manual post fetching using `.in()` queries
  - **RESULT**: Redirects API now properly handles tombstone pattern where source posts may not exist
  - All redirect management functionality restored and working correctly

- November 5, 2025: Bug Fix - Redirects Page "posts.map is not a function" Error
  - **FIXED**: Error on settings/redirects page preventing redirect creation/editing
  - **ROOT CAUSE**: `components/settings/redirects-list.tsx` line 81 was accessing wrong data structure
  - **ISSUE**: `setPosts(response.data || [])` set posts to the entire data object instead of the posts array
  - **API RETURNS**: `{ success: true, data: { posts: [...], total: 100, page: 1, limit: 20 } }`
  - **SOLUTION**: Changed to `setPosts(response.data.posts || [])` to extract the posts array
  - **IMPROVED**: Added `?limit=1000` to fetch all posts for dropdown selector
  - Fixed TypeScript type definition to match actual API response structure
  - All post selection dropdowns now work correctly in redirect dialogs

- November 5, 2025: Documentation Update - API_DOCUMENTATION.md Updated for Redirect Feature
  - **UPDATED**: Added `redirect` field to all post object examples in API_DOCUMENTATION.md
  - **SECTIONS UPDATED**:
    - "Get All Posts" example response now shows `"redirect": null`
    - "Get Single Post" example response now shows `"redirect": null`
  - **NOTE**: Post Redirects section (comprehensive documentation of redirect feature) was already present in the file
  - Documentation now accurately reflects that every post response includes the `redirect` field (null when not configured)

- November 5, 2025: Critical Bug Fix - Missing redirect Field in API Responses
  - **FIXED**: `redirect` field not appearing in post API responses at all
  - **ROOT CAUSE**: In `lib/post-mapper.ts` line 69, using `redirect || undefined` converted `null` values to `undefined`
  - **IMPACT**: When a property is `undefined` in JavaScript, it gets excluded from JSON serialization completely
  - **SOLUTION**: Changed `redirect: redirect || undefined` to `redirect: redirect` to preserve `null` values
  - **RESULT**: All post responses now include `"redirect": null` when no redirect is configured (as per REDIRECTION_FEATURE_PLAN.md)
  - Complies with plan requirement: "Every post API response includes redirect field (null when not configured)"

- November 5, 2025: Critical Bug Fix - Missing await in Post Mapper Functions
  - **FIXED**: All API endpoints returning `"posts": {}` (empty object) instead of posts array
  - **ROOT CAUSE**: `mapPostsFromDB()` and `mapPostFromDB()` are async functions but were called without `await` in 10 different files
  - **IMPACT**: All posts endpoints (`/api/v1/posts`, `/api/public/posts`, internal APIs) were broken
  - **FIXED FILES**: 
    - `app/api/v1/posts/route.ts` - GET endpoint
    - `app/api/posts/route.ts` - GET and POST endpoints
    - `app/api/posts/[id]/route.ts` - GET and PUT endpoints
    - `app/api/public/posts/route.ts` - GET endpoint
    - `app/api/public/posts/[id]/route.ts` - GET endpoint
    - `app/api/v1/tags/[id]/route.ts` - GET endpoint
    - `app/api/v1/categories/[id]/route.ts` - GET endpoint
  - **EXPLANATION**: When async functions are called without `await`, they return a Promise object instead of the resolved value. When serialized to JSON, Promise objects become `{}` (empty object)
  - All endpoints now properly return post arrays with full data

- November 5, 2025: Database Migration Fix - Post Redirects created_by Column Type
  - **FIXED**: Database migration error - Changed `created_by` column type from UUID to VARCHAR(255)
  - **REASON**: CMS uses Clerk authentication with string-based user IDs (e.g., 'user_33QTHobngBl4hGcnuEjuKnOhlqr'), not UUIDs
  - **UPDATED**: Both `migrations/001_post_redirects.sql` and `REDIRECTION_FEATURE_PLAN.md` to reflect correct data type
  - **RESOLVED**: Foreign key constraint error: "Key columns 'created_by' and 'id' are of incompatible types"
  - Migration SQL now ready for execution in Supabase

- November 5, 2025: Post Redirection Feature - Critical Bug Fixes (Architect-Verified)
  - **FIXED**: Tombstone support in public API - `/api/v1/posts/[id]` now returns 404 with redirect metadata for deleted posts
  - **FIXED**: Circular redirect detection - Implemented iterative chain traversal (depth limit: 10) to detect loops of any length
  - **IMPROVED**: Redirect validator now detects complex circular chains (A→B→C→A) not just simple loops (A→B→A)
  - **IMPROVED**: Public API now resolves redirects even when source post doesn't exist in database (true tombstone pattern)
  - **DOCS**: Created `MIGRATION_GUIDE.md` with step-by-step instructions for running Supabase migration
  - All fixes architect-reviewed and verified - production-ready redirect system complete

- November 5, 2025: Post Redirection Feature - Implementation Complete
  - **IMPLEMENTED**: Production-ready post redirection system for content consolidation and URL management
  - **DATABASE**: Created `post_redirects` table with tombstone pattern support (migration SQL ready in `migrations/`)
  - **BACKEND**: Implemented redirect types: post-to-post and post-to-URL with HTTP status codes (301, 302, 307, 308)
  - **BACKEND**: Created redirect resolver (`lib/redirect-resolver.ts`) and validator (`lib/redirect-validator.ts`)
  - **BACKEND**: Added redirect validation with circular detection and broken redirect handling
  - **API**: New `/api/settings/redirects` endpoints (GET, POST, PUT, DELETE) with Clerk authentication
  - **API**: Updated `/api/v1/posts/[id]` to include redirect metadata in all responses
  - **FRONTEND**: Created redirect management UI at `/settings/redirects` with full CRUD operations
  - **FRONTEND**: Redirect list component with filters, search, and type-based filtering (post/URL)
  - **FRONTEND**: Form dialog with validation, post selection, and circular redirect warnings
  - **CACHING**: Added redirect caching with automatic invalidation on updates
  - **DOCS**: Updated `API_DOCUMENTATION.md` with redirect response formats and implementation examples
  - **NAVIGATION**: Added "Redirects" menu item to Settings section in sidebar
  - **MIGRATION REQUIRED**: User must run SQL migration in Supabase (see `migrations/001_post_redirects.sql`)
  - Feature enables content cannibalization workflows and maintains SEO through proper redirect handling
  - Supports tombstone redirects (persist after source post deletion) for seamless URL transitions

- November 5, 2025: Post Redirection Feature - Planning & Documentation
  - **PLANNED**: Comprehensive post redirection system for managing content consolidation and URL changes
  - **DOCUMENTED**: Complete feature specification in `REDIRECTION_FEATURE_PLAN.md`
  - **DESIGNED**: Database schema for `post_redirects` table with tombstone pattern support
  - **DESIGNED**: Redirect types: post-to-post and post-to-URL with HTTP status code support (301, 302, 307, 308)
  - **DESIGNED**: Edge case handling: circular redirect detection, deleted post handling, chain redirect resolution
  - **DESIGNED**: API structure: redirect metadata included in post responses, new `/api/settings/redirects` endpoints
  - **DESIGNED**: Settings UI for redirect management with validation and search capabilities
  - **PLANNED**: 8-day implementation timeline with complete SQL migrations and rollback scripts
  - Feature supports production-ready redirect management with caching, performance optimization, and security
  - Enables content cannibalization workflows and maintains SEO through proper redirect handling

- October 17, 2025: Sitemap Auto-Regeneration System
  - **CHANGED**: Sitemap cache TTL from permanent to 60 minutes (3600s)
  - **ADDED**: Automatic sitemap regeneration every 60 minutes via background cron job
  - **ADDED**: New workflow `Sitemap Cron` that runs continuously in the background
  - **ADDED**: Script `scripts/sitemap-cron.ts` for scheduled sitemap regeneration
  - Sitemaps now refresh automatically every hour ensuring always up-to-date content
  - Manual regeneration still available via `/api/v1/sitemaps/generate` endpoint

- October 16, 2025: TypeScript Build Fixes & API Client Enhancement
  - **FIXED**: TypeScript compilation error in tags-list.tsx bulk delete function
  - **ENHANCED**: API client delete method now supports optional data parameter for bulk operations
  - **FIXED**: Tags bulk delete now uses Promise.all with individual delete requests (consistent with categories pattern)
  - All TypeScript errors resolved - production build successful

- October 16, 2025: Sitemap URL Trailing Slash Fix
  - **FIXED**: Blog post URLs in sitemap now include trailing slashes for SEO consistency
  - Updated sitemap generation to append trailing slash to all blog post URLs (e.g., `/blog/parenting/manfaat-musik-untuk-anak/`)
  - Ensures uniform URL structure across the sitemap matching SEO best practices

- October 15, 2025: UI Enhancements & Bug Fixes (Part 2)
  - **FIXED**: Sign-in redirect URL - removed forceRedirectUrl prop so URL is clean /sign-in without query parameters
  - **ADDED**: Client-side pagination to categories and tags pages with proper page clamping
  - Pagination automatically navigates to last valid page when deleting items from the final page
  - All CRUD operations maintain proper pagination state and total counts

- October 15, 2025: UI Enhancements & Bug Fixes
  - **FIXED**: API token page error - resolved "e.map is not a function" error by properly extracting data from API response wrapper
  - **ADDED**: Categories management page at `/categories` with full CRUD operations (create, read, update, delete)
  - **ADDED**: Tags management page at `/tags` with full CRUD operations
  - **ENHANCED**: Posts list UX - post titles are now clickable to open the editor directly, eliminating need to use action menu
  - All new components follow existing patterns with proper API response handling and optimistic UI updates

- October 13, 2025: Post Editor Content Loading Fix
  - **FIXED**: Post content not loading in edit mode - TiptapEditor now properly synchronizes HTML content when switching from empty to filled state
  - **FIXED**: Editor visibility during async operations - introduced dedicated `isInitialLoad` state to prevent editor from disappearing during save/upload operations
  - **IMPROVED**: Content synchronization in TiptapEditor - refined useEffect logic to handle content updates reliably, including proper rendering of headings and HTML formatting
  - **IMPROVED**: Loading UX - added loading indicator specifically for initial post fetch without affecting save/publish workflows

- October 13, 2025: CMS Enhancement & Bug Fixes
  - **FIXED**: Delete post functionality - now properly handles 204 No Content responses and shows success notifications
  - **FIXED**: Post list cache invalidation - refetches posts after deletion to ensure UI reflects database changes
  - **FIXED**: Edit post content loading - TiptapEditor now properly renders HTML content including headings
  - **ENHANCED**: Post URL generation - API responses now include full post URL with category slug (e.g., https://domain.com/{category}/{slug})
  - **ENHANCED**: CMS filters - Replaced mock categories with real API data from backend
  - Added defensive error handling for category fetching with empty array fallback

- October 8, 2025: Sitemap API Migration to v1
  - **FIXED**: Moved sitemap endpoints from `/api/sitemaps` to `/api/v1/sitemaps` for consistency with other API endpoints
  - **FIXED**: Resolved Redis cache TTL error when storing sitemaps with permanent caching (TTL=0)
  - Sitemap endpoints now use Bearer token authentication like other v1 API endpoints
  - All sitemap XML URLs updated to point to v1 endpoints
  - Sitemaps generate with real blog post data from Supabase

- October 8, 2025: Enhanced CMS Features & Sitemap System
  - Fixed sign-in/sign-up redirect URL issues using forceRedirectUrl prop with environment variables
  - Enhanced search functionality to search posts by title with real-time filtering
  - Added checkbox, check all, and bulk delete features to posts list
  - Implemented comprehensive sitemap generation system:
    - Root sitemap index at `/api/v1/sitemaps/root.xml`
    - Pages sitemap at `/api/v1/sitemaps/pages.xml`
    - Blog sitemap with chunking (200 posts per file) at `/api/v1/sitemaps/blog.xml` and `/api/v1/sitemaps/blog-N.xml`
    - Sitemaps stored in Redis with persistent storage (no TTL)
    - Auto-generation on cache miss ensures sitemaps are always available
    - Automatic regeneration when posts are created, updated, or deleted
    - Authorized API endpoint `/api/v1/sitemaps` to access sitemap information
    - Manual regeneration endpoint `/api/v1/sitemaps/generate`

- October 3, 2025: Public API v1 Enhancements
  - Added API versioning with `/api/v1` endpoints
  - Implemented pagination for all v1 endpoints (page, limit parameters)
  - Added filtering capabilities (search, category, tag, status filters)
  - Created `/api/v1/categories` and `/api/v1/categories/[id]` endpoints
  - Created `/api/v1/tags` and `/api/v1/tags/[id]` endpoints
  - Enhanced posts endpoint with comprehensive filtering options
  - All endpoints support lookup by UUID or slug
  - Maintained backward compatibility with legacy `/api/public` endpoints
  - Created comprehensive API documentation in `API_DOCUMENTATION.md`

- October 3, 2025: Security & Performance Enhancements
  - Added Clerk authentication to all internal API endpoints
  - Implemented Zod validation for all POST/PUT requests
  - Added ownership checks - users can only modify their own data
  - Implemented Redis caching for internal API endpoints (5min posts, 10min categories/tags)
  - Added rate limiting (100 req/15min) and CORS to public API
  - Improved cache invalidation - category/tag updates clear related caches
  - Standardized response format across all endpoints
  - Created shared utility files for auth, validation, and response formatting

- October 3, 2025: Enhanced public API
  - Added `/api/public/posts/[id]` endpoint for fetching single posts
  - Supports lookup by both UUID and slug
  - Implemented Redis caching with intelligent key strategy (1 hour TTL)
  - Maintains same authentication and response format as list endpoint

- October 1, 2025: Project cleanup and restructuring
  - Removed Drizzle ORM (using Supabase directly)
  - Migrated from Vite src/ structure to proper Next.js structure
  - Moved components/, lib/, hooks/, types/, styles/ to root level
  - Updated all imports from @/src/ to @/ throughout codebase
  - Follows Next.js App Router conventions
