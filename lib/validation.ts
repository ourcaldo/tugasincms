import { z } from 'zod'

export const postSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title is too long'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().max(1000, 'Excerpt is too long').optional(),
  slug: z.string().min(1, 'Slug is required').max(200, 'Slug is too long').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase and use hyphens'),
  featuredImage: z.string().url('Invalid image URL').optional(),
  publishDate: z.string().datetime('Invalid date format').optional(),
  status: z.enum(['draft', 'published', 'scheduled']).optional(),
  authorId: z.string().uuid('Invalid author ID').optional(),
  seo: z.object({
    title: z.string().max(200, 'SEO title is too long').optional(),
    metaDescription: z.string().max(500, 'Meta description is too long').optional(),
    focusKeyword: z.string().max(100, 'Focus keyword is too long').optional(),
  }).optional(),
  categories: z.array(z.string().uuid('Invalid category ID')).optional(),
  tags: z.array(z.string().uuid('Invalid tag ID')).optional(),
})

export const updatePostSchema = postSchema.partial()

export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  slug: z.string().max(200, 'Slug is too long').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase and use hyphens').optional(),
  description: z.string().max(500, 'Description is too long').optional(),
})

export const tagSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  slug: z.string().max(200, 'Slug is too long').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase and use hyphens').optional(),
})

export const tokenSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  name: z.string().min(1, 'Token name is required').max(100, 'Token name is too long'),
  expiresAt: z.string().datetime('Invalid expiration date').optional(),
})

export const userProfileSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
  email: z.string().email('Invalid email').optional(),
  name: z.string().max(200, 'Name is too long').optional(),
  avatar: z.string().url('Invalid avatar URL').optional(),
})

export const updateUserProfileSchema = z.object({
  name: z.string().max(200, 'Name is too long').optional(),
  bio: z.string().max(1000, 'Bio is too long').optional(),
  avatar: z.string().url('Invalid avatar URL').optional(),
})

export const publicPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title is too long'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().max(1000, 'Excerpt is too long').optional(),
  slug: z.string().min(1, 'Slug is required').max(200, 'Slug is too long'),
  featuredImage: z.string().optional(),
  publishDate: z.string().optional(),
  status: z.enum(['draft', 'published', 'scheduled']).optional(),
  seo: z.object({
    title: z.string().max(200, 'SEO title is too long').optional(),
    metaDescription: z.string().max(500, 'Meta description is too long').optional(),
    focusKeyword: z.string().max(100, 'Focus keyword is too long').optional(),
  }).optional(),
  categories: z.string().optional(),
  tags: z.string().optional(),
})

export const redirectSchema = z.object({
  sourcePostId: z.string().uuid('Invalid source post ID'),
  redirectType: z.enum(['post', 'url']),
  targetPostId: z.string().uuid('Invalid target post ID').optional(),
  targetUrl: z.string().url('Invalid target URL').optional(),
  httpStatusCode: z.number().int().refine((val) => [301, 302, 307, 308].includes(val), {
    message: 'HTTP status code must be 301, 302, 307, or 308'
  }).default(301),
  notes: z.string().max(1000, 'Notes are too long').optional(),
}).refine(
  (data) => {
    if (data.redirectType === 'post') {
      return !!data.targetPostId && !data.targetUrl;
    }
    if (data.redirectType === 'url') {
      return !!data.targetUrl && !data.targetPostId;
    }
    return false;
  },
  {
    message: 'For post redirects, provide targetPostId only. For URL redirects, provide targetUrl only.',
  }
)

export const updateRedirectSchema = z.object({
  redirectType: z.enum(['post', 'url']).optional(),
  targetPostId: z.string().uuid('Invalid target post ID').optional(),
  targetUrl: z.string().url('Invalid target URL').optional(),
  httpStatusCode: z.number().int().refine((val) => [301, 302, 307, 308].includes(val), {
    message: 'HTTP status code must be 301, 302, 307, or 308'
  }).optional(),
  notes: z.string().max(1000, 'Notes are too long').optional(),
})
