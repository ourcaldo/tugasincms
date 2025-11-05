import { resolveRedirect } from './redirect-resolver'
import type { RedirectMetadata } from '../types'

export interface PostFromDB {
  id: string
  title: string
  content: string
  excerpt: string | null
  slug: string
  featured_image: string | null
  publish_date: string
  status: string
  author_id: string
  created_at: string
  updated_at: string
  seo_title: string | null
  meta_description: string | null
  focus_keyword: string | null
  categories?: any[]
  tags?: any[]
}

export interface MappedPost {
  id: string
  title: string
  content: string
  excerpt?: string
  slug: string
  featuredImage?: string
  publishDate: string
  status: string
  authorId: string
  createdAt: string
  updatedAt: string
  seo: {
    title?: string
    metaDescription?: string
    focusKeyword?: string
    slug: string
  }
  categories: any[]
  tags: any[]
  redirect?: RedirectMetadata | null
}

export async function mapPostFromDB(post: PostFromDB, includeRedirect: boolean = true): Promise<MappedPost> {
  const redirect = includeRedirect ? await resolveRedirect(post.id) : null
  
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    excerpt: post.excerpt || undefined,
    slug: post.slug,
    featuredImage: post.featured_image || undefined,
    publishDate: post.publish_date,
    status: post.status,
    authorId: post.author_id,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    seo: {
      title: post.seo_title || undefined,
      metaDescription: post.meta_description || undefined,
      focusKeyword: post.focus_keyword || undefined,
      slug: post.slug,
    },
    categories: (post.categories || []).map((pc: any) => pc.category).filter(Boolean),
    tags: (post.tags || []).map((pt: any) => pt.tag).filter(Boolean),
    redirect: redirect
  }
}

export async function mapPostsFromDB(posts: PostFromDB[], includeRedirect: boolean = false): Promise<MappedPost[]> {
  return Promise.all(posts.map(post => mapPostFromDB(post, includeRedirect)))
}
