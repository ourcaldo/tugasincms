import { supabase } from './supabase';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface CircularCheckResult {
  hasCircle: boolean;
  chainDepth: number;
  chain: string[];
}

async function detectCircularRedirect(
  sourcePostId: string,
  targetPostId: string,
  maxDepth: number = 10
): Promise<CircularCheckResult> {
  const visited = new Set<string>();
  const chain: string[] = [];
  
  let currentPostId = targetPostId;
  let depth = 0;
  
  while (currentPostId && depth < maxDepth) {
    if (visited.has(currentPostId)) {
      return { hasCircle: true, chainDepth: depth, chain };
    }
    
    if (currentPostId === sourcePostId) {
      return { hasCircle: true, chainDepth: depth, chain };
    }
    
    visited.add(currentPostId);
    chain.push(currentPostId);
    
    const { data: redirect } = await supabase
      .from('post_redirects')
      .select('target_post_id')
      .eq('source_post_id', currentPostId)
      .eq('redirect_type', 'post')
      .single();
    
    if (!redirect || !redirect.target_post_id) {
      break;
    }
    
    currentPostId = redirect.target_post_id;
    depth++;
  }
  
  return { hasCircle: false, chainDepth: depth, chain };
}

export async function validateRedirect(
  sourcePostId: string,
  redirectType: 'post' | 'url',
  targetPostId?: string,
  targetUrl?: string,
  existingRedirectId?: string
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (redirectType === 'post') {
    if (!targetPostId) {
      errors.push('Target post ID is required for post-to-post redirects');
      return { valid: false, errors, warnings };
    }

    if (sourcePostId === targetPostId) {
      errors.push('Cannot redirect a post to itself');
      return { valid: false, errors, warnings };
    }

    const { data: targetPost } = await supabase
      .from('posts')
      .select('id, title, status')
      .eq('id', targetPostId)
      .single();

    if (!targetPost) {
      errors.push('Target post does not exist');
      return { valid: false, errors, warnings };
    }

    if (targetPost.status === 'draft') {
      warnings.push('Target post is currently a draft and may not be publicly accessible');
    }

    const circularCheck = await detectCircularRedirect(sourcePostId, targetPostId);
    
    if (circularCheck.hasCircle) {
      errors.push(`Circular redirect detected: ${circularCheck.chain.join(' → ')} → ${sourcePostId}`);
      return { valid: false, errors, warnings };
    }
    
    if (circularCheck.chainDepth > 0) {
      warnings.push(`Redirect chain detected (depth: ${circularCheck.chainDepth}): ${circularCheck.chain.join(' → ')}`);
    }
  }

  if (redirectType === 'url') {
    if (!targetUrl) {
      errors.push('Target URL is required for post-to-URL redirects');
      return { valid: false, errors, warnings };
    }

    try {
      const url = new URL(targetUrl);
      
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        errors.push('Only HTTP and HTTPS URLs are allowed');
        return { valid: false, errors, warnings };
      }

      if (url.protocol === 'http:') {
        warnings.push('Using HTTP instead of HTTPS may cause security warnings');
      }
    } catch {
      errors.push('Invalid URL format');
      return { valid: false, errors, warnings };
    }
  }

  const query = supabase
    .from('post_redirects')
    .select('id')
    .eq('source_post_id', sourcePostId);

  if (existingRedirectId) {
    query.neq('id', existingRedirectId);
  }

  const { data: existingRedirect } = await query.single();

  if (existingRedirect && !existingRedirectId) {
    errors.push('A redirect already exists for this source post');
    return { valid: false, errors, warnings };
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export async function validateTargetPostDeletion(postId: string): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const { data: inboundRedirects, error } = await supabase
    .from('post_redirects')
    .select(`
      id,
      source_post_id,
      posts!inner(title)
    `)
    .eq('target_post_id', postId)
    .eq('redirect_type', 'post');

  if (error) {
    warnings.push('Could not check for inbound redirects');
    return { valid: true, errors, warnings };
  }

  if (inboundRedirects && inboundRedirects.length > 0) {
    errors.push(
      `Cannot delete this post. ${inboundRedirects.length} redirect(s) point to it. ` +
      `Please remove or update these redirects first.`
    );
    
    return { valid: false, errors, warnings };
  }

  return { valid: true, errors, warnings };
}