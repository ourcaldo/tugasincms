import { supabase } from './supabase';
import type { RedirectMetadata } from '../types';

export async function resolveRedirect(postId: string): Promise<RedirectMetadata | null> {
  try {
    const { data: redirect, error } = await supabase
      .from('post_redirects')
      .select('*')
      .eq('source_post_id', postId)
      .single();

    if (error || !redirect) {
      return null;
    }

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

    if (redirect.redirect_type === 'post' && redirect.target_post_id) {
      const { data: targetPost, error: targetError } = await supabase
        .from('posts')
        .select('id, slug, title, status')
        .eq('id', redirect.target_post_id)
        .single();

      if (targetError || !targetPost) {
        return {
          type: 'post',
          httpStatus: 410,
          target: {
            postId: redirect.target_post_id,
            error: 'Target post has been deleted'
          },
          notes: redirect.notes
        };
      }

      const secondHopRedirect = await supabase
        .from('post_redirects')
        .select('source_post_id')
        .eq('source_post_id', targetPost.id)
        .single();

      if (secondHopRedirect.data) {
      }

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

    return null;
  } catch (error) {
    return null;
  }
}

export async function checkRedirectExists(postId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('post_redirects')
      .select('id')
      .eq('source_post_id', postId)
      .single();

    return !error && !!data;
  } catch {
    return false;
  }
}

export async function getInboundRedirects(targetPostId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('post_redirects')
      .select('source_post_id')
      .eq('target_post_id', targetPostId)
      .eq('redirect_type', 'post');

    if (error || !data) {
      return [];
    }

    return data.map(r => r.source_post_id);
  } catch {
    return [];
  }
}