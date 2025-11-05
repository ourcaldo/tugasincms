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
