# Database Migration Guide - Post Redirects Feature

## Overview
This guide will help you set up the post redirects feature by running a database migration in your Supabase dashboard.

## ⚠️ Important
You must complete this migration before using the redirect management features in your CMS. The application will not work correctly without these database changes.

## What This Migration Does
- Creates a new `post_redirects` table to store all redirect configurations
- Adds proper constraints to prevent invalid redirects
- Creates indexes for optimal query performance
- Enables the tombstone pattern (redirects survive when posts are deleted)

## Step-by-Step Instructions

### 1. Access Your Supabase Dashboard
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your CMS project
3. Navigate to **SQL Editor** in the left sidebar

### 2. Run the Migration
1. Click **"New Query"** button
2. Copy the entire contents of `migrations/001_post_redirects.sql`
3. Paste it into the SQL editor
4. Click **"Run"** button (or press `Ctrl+Enter` / `Cmd+Enter`)
5. Wait for the success message: "Success. No rows returned"

### 3. Verify the Migration
After running the migration, verify it was successful:

```sql
-- Check if the table was created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'post_redirects';

-- Should return: post_redirects
```

### 4. Test the Feature
Once migration is complete, you can:
1. Navigate to **Settings → Redirects** in your CMS
2. Create a test redirect
3. Verify it appears in the list
4. Test the public API redirect responses

## Migration File Location
The migration SQL file is located at:
```
migrations/001_post_redirects.sql
```

## Rollback (If Needed)
If you need to undo this migration, run:

```sql
DROP TABLE IF EXISTS post_redirects CASCADE;
```

**⚠️ Warning**: This will delete all redirect configurations. Only use this if you need to start over.

## Need Help?
If you encounter any errors during migration:
1. Check that you're running the migration on the correct Supabase project
2. Ensure you have proper database permissions
3. Verify you're connected to the production database (not local)
4. Contact support if the issue persists

## What's Next?
After successful migration, the redirect feature is ready to use:
- ✅ Manage redirects via Settings → Redirects
- ✅ Create post-to-post redirects for content consolidation
- ✅ Create post-to-URL redirects for external content
- ✅ Circular redirect detection prevents redirect loops
- ✅ Public API returns redirect metadata for deleted posts (tombstone pattern)

---

**Last Updated**: November 05, 2025
