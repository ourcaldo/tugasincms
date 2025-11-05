### Overview
TugasCMS is a professional Content Management System built with Next.js, React, and TypeScript. It offers a modern interface for managing blog posts, categories, tags, and media. The system integrates Supabase for the database, Clerk for authentication, and Appwrite for image storage. It supports robust content management, including public API access with token authentication, sitemap generation, and advanced redirection features, aiming to provide a comprehensive solution for content creators.

### User Preferences
No specific user preferences were provided.

### System Architecture
TugasCMS is built on the Next.js App Router, leveraging both Server and Client Components. API routes are managed within `app/api/`.
- **UI/UX Decisions**: Utilizes Radix UI and Tailwind CSS for a modern, responsive design. Supports dark mode.
- **Technical Implementations**:
    - **Database**: Supabase (PostgreSQL).
    - **Authentication**: Clerk, integrated via Next.js middleware.
    - **Image Storage**: Appwrite cloud storage.
    - **Styling**: Tailwind CSS with custom components.
    - **State Management**: React Hooks.
    - **Caching**: Redis for API response caching, sitemaps, and internal/public API data. Implements intelligent TTLs and automatic invalidation.
    - **API Versioning**: Public API includes `/v1` endpoints with pagination, filtering, and token authentication.
    - **Security**: Zod for input validation, Clerk for internal API authentication, ownership validation, rate limiting (100 req/15min for public API), and proper CORS configuration.
    - **Sitemap System**: Automatic sitemap generation and regeneration via background cron jobs, with support for root, pages, and chunked blog sitemaps.
    - **Post Redirection**: Comprehensive system supporting post-to-post and post-to-URL redirects with various HTTP status codes (301, 302, 307, 308). Includes circular redirect detection, tombstone pattern support for deleted posts, and dedicated management UI.
    - **Project Structure**: Organized with clear separation for authentication routes (`(auth)`), protected dashboard routes (`(dashboard)`), API routes (`api/`), components, libraries (`lib/`), hooks, styles, and types.

### External Dependencies
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Clerk
- **Image/File Storage**: Appwrite
- **UI Components**: Radix UI
- **Icons**: Lucide icons
- **Forms**: React Hook Form
- **Date Manipulation**: `date-fns`, `react-day-picker`
- **Charting**: Recharts
- **Styling Utilities**: `clsx`, `tailwind-merge`, `class-variance-authority`
- **Validation**: Zod
- **Caching**: Redis