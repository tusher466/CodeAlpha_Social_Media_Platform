const express = require('express');
const db = require('../db/database');
const { authRequired, authOptional } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Helper to format post from row
function formatPost(row, currentUserId) {
  return {
    id: row.id,
    content: row.content,
    image_url: row.image_url,
    created_at: row.created_at,
    author: {
      id: row.user_id,
      username: row.username,
      display_name: row.display_name,
      avatar_url: row.avatar_url
    },
    likes_count: Number(row.likes_count || 0),
    comments_count: Number(row.comments_count || 0),
    is_liked: Boolean(row.is_liked),
    is_author: currentUserId ? row.user_id === currentUserId : false
  };
}

// GET /api/posts - Get posts feed
router.get('/', authOptional, (req, res) => {
  try {
    const currentUserId = req.user ? req.user.id : 0;
    const feedType = req.query.feed || 'for-you';
    const targetUserId = req.query.userId ? parseInt(req.query.userId, 10) : null;
    const targetUsername = req.query.username ? req.query.username.trim() : null;
    const tag = req.query.tag ? req.query.tag.trim() : null;
    const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params = [currentUserId, currentUserId];

    if (feedType === 'following') {
      if (!currentUserId) {
        return res.status(401).json({ success: false, error: 'Login required to view Following feed' });
      }
      whereClause += ` AND p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?)`;
      params.push(currentUserId);
    } else if (feedType === 'user') {
      if (targetUserId) {
        whereClause += ` AND p.user_id = ?`;
        params.push(targetUserId);
      } else if (targetUsername) {
        whereClause += ` AND u.username = ? COLLATE NOCASE`;
        params.push(targetUsername);
      }
    } else if (feedType === 'liked') {
      const likedUserId = targetUserId || currentUserId;
      if (!likedUserId) {
        return res.status(400).json({ success: false, error: 'User ID required for liked posts feed' });
      }
      whereClause += ` AND p.id IN (SELECT post_id FROM likes WHERE user_id = ?)`;
      params.push(likedUserId);
    }

    if (tag) {
      whereClause += ` AND p.content LIKE ?`;
      params.push(`%#${tag.replace('#', '')}%`);
    }

    const sql = `
      SELECT 
        p.id, p.user_id, p.content, p.image_url, p.created_at,
        u.username, u.display_name, u.avatar_url,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count,
        CASE WHEN ? > 0 AND EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) THEN 1 ELSE 0 END AS is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    const rows = db.prepare(sql).all(...params);
    const posts = rows.map(r => formatPost(r, currentUserId));

    return res.json({
      success: true,
      feed: feedType,
      page,
      posts
    });
  } catch (err) {
    console.error('Fetch feed error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load posts' });
  }
});

// POST /api/posts - Create new post
router.post('/', authRequired, upload.single('image'), (req, res) => {
  try {
    const currentUserId = req.user.id;
    const content = (req.body.content || '').trim();

    let image_url = req.body.image_url ? req.body.image_url.trim() : null;
    if (req.file) {
      image_url = `/uploads/${req.file.filename}`;
    }

    if (!content && !image_url) {
      return res.status(400).json({ success: false, error: 'Post must include text content or an image' });
    }

    if (content.length > 2000) {
      return res.status(400).json({ success: false, error: 'Post cannot exceed 2000 characters' });
    }

    const insertStmt = db.prepare(`
      INSERT INTO posts (user_id, content, image_url)
      VALUES (?, ?, ?)
    `);

    const result = insertStmt.run(currentUserId, content, image_url);
    const postId = Number(result.lastInsertRowid);

    // Fetch newly created post
    const row = db.prepare(`
      SELECT 
        p.id, p.user_id, p.content, p.image_url, p.created_at,
        u.username, u.display_name, u.avatar_url,
        0 AS likes_count,
        0 AS comments_count,
        0 AS is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(postId);

    return res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post: formatPost(row, currentUserId)
    });
  } catch (err) {
    console.error('Create post error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create post' });
  }
});

// GET /api/posts/:id - Single post with comments
router.get('/:id', authOptional, (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const currentUserId = req.user ? req.user.id : 0;

    const postRow = db.prepare(`
      SELECT 
        p.id, p.user_id, p.content, p.image_url, p.created_at,
        u.username, u.display_name, u.avatar_url,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count,
        CASE WHEN ? > 0 AND EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) THEN 1 ELSE 0 END AS is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(currentUserId, currentUserId, postId);

    if (!postRow) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const commentsRows = db.prepare(`
      SELECT 
        c.id, c.post_id, c.user_id, c.content, c.created_at,
        u.username, u.display_name, u.avatar_url
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `).all(postId);

    const comments = commentsRows.map(c => ({
      id: c.id,
      post_id: c.post_id,
      content: c.content,
      created_at: c.created_at,
      author: {
        id: c.user_id,
        username: c.username,
        display_name: c.display_name,
        avatar_url: c.avatar_url
      },
      is_author: currentUserId ? c.user_id === currentUserId : false,
      can_delete: currentUserId ? (c.user_id === currentUserId || postRow.user_id === currentUserId) : false
    }));

    return res.json({
      success: true,
      post: formatPost(postRow, currentUserId),
      comments
    });
  } catch (err) {
    console.error('Fetch post error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve post' });
  }
});

// DELETE /api/posts/:id - Delete post
router.delete('/:id', authRequired, (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const currentUserId = req.user.id;

    const post = db.prepare('SELECT id, user_id FROM posts WHERE id = ?').get(postId);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    if (post.user_id !== currentUserId) {
      return res.status(403).json({ success: false, error: 'You are not authorized to delete this post' });
    }

    db.prepare('DELETE FROM posts WHERE id = ?').run(postId);

    return res.json({ success: true, message: 'Post deleted successfully' });
  } catch (err) {
    console.error('Delete post error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete post' });
  }
});

// POST /api/posts/:id/like - Toggle like
router.post('/:id/like', authRequired, (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const currentUserId = req.user.id;

    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const existingLike = db.prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?').get(postId, currentUserId);

    let isLiked = false;
    if (existingLike) {
      db.prepare('DELETE FROM likes WHERE post_id = ? AND user_id = ?').run(postId, currentUserId);
      isLiked = false;
    } else {
      db.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)').run(postId, currentUserId);
      isLiked = true;
    }

    const likesCount = db.prepare('SELECT COUNT(*) as c FROM likes WHERE post_id = ?').get(postId).c;

    return res.json({
      success: true,
      is_liked: isLiked,
      likes_count: likesCount
    });
  } catch (err) {
    console.error('Like toggle error:', err);
    return res.status(500).json({ success: false, error: 'Failed to toggle like' });
  }
});

// GET /api/posts/:id/likes - Users who liked this post
router.get('/:id/likes', authOptional, (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const currentUserId = req.user ? req.user.id : 0;

    const likers = db.prepare(`
      SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio,
        CASE WHEN ? > 0 AND EXISTS(
          SELECT 1 FROM follows WHERE follower_id = ? AND following_id = u.id
        ) THEN 1 ELSE 0 END AS is_following
      FROM likes l
      JOIN users u ON l.user_id = u.id
      WHERE l.post_id = ?
      ORDER BY l.created_at DESC
    `).all(currentUserId, currentUserId, postId);

    return res.json({ success: true, likers });
  } catch (err) {
    console.error('Fetch post likers error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch likes' });
  }
});

// POST /api/posts/:id/comments - Add comment
router.post('/:id/comments', authRequired, (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const currentUserId = req.user.id;
    const content = (req.body.content || '').trim();

    if (!content) {
      return res.status(400).json({ success: false, error: 'Comment content cannot be empty' });
    }

    if (content.length > 500) {
      return res.status(400).json({ success: false, error: 'Comment cannot exceed 500 characters' });
    }

    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const result = db.prepare(`
      INSERT INTO comments (post_id, user_id, content)
      VALUES (?, ?, ?)
    `).run(postId, currentUserId, content);

    const commentId = Number(result.lastInsertRowid);
    const comment = db.prepare(`
      SELECT 
        c.id, c.post_id, c.user_id, c.content, c.created_at,
        u.username, u.display_name, u.avatar_url
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(commentId);

    const commentCount = db.prepare('SELECT COUNT(*) as c FROM comments WHERE post_id = ?').get(postId).c;

    return res.status(201).json({
      success: true,
      message: 'Comment added',
      comment: {
        id: comment.id,
        post_id: comment.post_id,
        content: comment.content,
        created_at: comment.created_at,
        author: {
          id: comment.user_id,
          username: comment.username,
          display_name: comment.display_name,
          avatar_url: comment.avatar_url
        },
        is_author: true,
        can_delete: true
      },
      comments_count: commentCount
    });
  } catch (err) {
    console.error('Add comment error:', err);
    return res.status(500).json({ success: false, error: 'Failed to add comment' });
  }
});

// DELETE /api/posts/:postId/comments/:commentId - Delete comment
router.delete('/:postId/comments/:commentId', authRequired, (req, res) => {
  try {
    const postId = parseInt(req.params.postId, 10);
    const commentId = parseInt(req.params.commentId, 10);
    const currentUserId = req.user.id;

    const comment = db.prepare('SELECT id, user_id, post_id FROM comments WHERE id = ? AND post_id = ?').get(commentId, postId);
    if (!comment) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(postId);

    // Can delete if author of comment OR author of post
    if (comment.user_id !== currentUserId && (!post || post.user_id !== currentUserId)) {
      return res.status(403).json({ success: false, error: 'You are not authorized to delete this comment' });
    }

    db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);
    const commentCount = db.prepare('SELECT COUNT(*) as c FROM comments WHERE post_id = ?').get(postId).c;

    return res.json({
      success: true,
      message: 'Comment deleted',
      comments_count: commentCount
    });
  } catch (err) {
    console.error('Delete comment error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete comment' });
  }
});

module.exports = router;
