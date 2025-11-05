export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SEO {
  title?: string;
  metaDescription?: string;
  focusKeyword?: string;
  slug?: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  slug: string;
  featuredImage?: string;
  publishDate: Date;
  status: 'draft' | 'published' | 'scheduled';
  categories: Category[];
  tags: Tag[];
  seo: SEO;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface APIToken {
  id: string;
  name: string;
  token: string;
  userId: string;
  lastUsed?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PostFilters {
  status?: 'draft' | 'published' | 'scheduled';
  category?: string;
  tag?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PostRedirect {
  id: string;
  sourcePostId: string;
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
  notes?: string;
}

export interface PostWithRedirect extends Post {
  redirect?: RedirectMetadata | null;
}