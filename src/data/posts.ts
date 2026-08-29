import { createClient } from '@/utils/supabase/client';
import { Post, Comment } from '@/lib/mockDb';

export async function fetchPosts(): Promise<Post[]> {
  const supabase = createClient();
  const { data: postsData, error: postsError } = await supabase
    .from('posts')
    .select(`
      *,
      author:profiles!posts_author_id_fkey(id, name, avatar_url, role),
      post_likes(user_id),
      post_bookmarks(user_id),
      comments(
        id,
        content,
        created_at,
        author:profiles!comments_author_id_fkey(name, avatar_url)
      )
    `)
    .order('created_at', { ascending: false });

  if (postsError || !postsData) {
    console.error('Error fetching posts:', postsError);
    return [];
  }

  return postsData.map((p) => {
    const likedBy = (p.post_likes || []).map((l: any) => l.user_id);
    const bookmarkedBy = (p.post_bookmarks || []).map((b: any) => b.user_id);
    const comments: Comment[] = (p.comments || []).map((c: any) => ({
      id: c.id,
      authorName: c.author?.name || 'Community Member',
      authorAvatar: c.author?.avatar_url || '/avatars/default.png',
      content: c.content,
      timestamp: new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));

    return {
      id: p.id,
      authorId: p.author_id,
      authorName: p.author?.name || 'Community Member',
      authorAvatar: p.author?.avatar_url || '/avatars/default.png',
      authorRole: p.author?.role || 'member',
      content: p.content,
      image: p.image_url || undefined,
      likes: p.likes_count || likedBy.length,
      likedBy,
      bookmarks: p.bookmarks_count || bookmarkedBy.length,
      bookmarkedBy,
      comments,
      shares: p.shares_count || 0,
      tags: p.tags || [],
      isPinned: p.is_pinned || false,
      timestamp: new Date(p.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      createdAt: p.created_at,
    };
  });
}

export async function createPost(content: string, tags: string[] = [], imageUrl?: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be logged in to create a post');

  const { data, error } = await supabase
    .from('posts')
    .insert({
      author_id: user.id,
      content,
      tags,
      image_url: imageUrl,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Award XP for creating post (+10 XP)
  await supabase.from('points_ledger').insert({
    user_id: user.id,
    delta: 10,
    reason: 'Created community feed post',
    ref_id: data.id,
  });

  return data;
}

export async function togglePostLike(postId: string, isLiked: boolean) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Must be logged in');

  if (isLiked) {
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('post_likes')
      .insert({ post_id: postId, user_id: user.id });
    if (error) throw new Error(error.message);
  }
}

export async function togglePostBookmark(postId: string, isBookmarked: boolean) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Must be logged in');

  if (isBookmarked) {
    const { error } = await supabase
      .from('post_bookmarks')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('post_bookmarks')
      .insert({ post_id: postId, user_id: user.id });
    if (error) throw new Error(error.message);
  }
}

export async function addCommentToPost(postId: string, content: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Must be logged in');

  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      author_id: user.id,
      content,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Award XP for contributing to discussion (+5 XP)
  await supabase.from('points_ledger').insert({
    user_id: user.id,
    delta: 5,
    reason: 'Commented on community post',
    ref_id: data.id,
  });

  return data;
}

export async function deletePost(postId: string) {
  const supabase = createClient();

  // Chain .select() so we can tell a real deletion apart from an RLS-filtered
  // no-op: supabase-js returns { data: [], error: null } when a DELETE matches
  // zero rows because RLS hid them — it does NOT throw. So treat "0 rows
  // returned" as a failure rather than a silent success.
  const { data, error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .select('id');

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error("Post couldn't be deleted — you may not have permission, or it no longer exists.");
  }

  return data[0];
}
